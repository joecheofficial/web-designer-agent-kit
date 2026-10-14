import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { cpSync, mkdtempSync, readFileSync, realpathSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import { compareVersions, latestReleaseTag } from '../scripts/update-kit.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const temp = () => realpathSync(mkdtempSync(join(tmpdir(), 'web-designer-update-')))
const gitEnv = { ...process.env, GIT_AUTHOR_NAME: 'Kit Test', GIT_AUTHOR_EMAIL: 'kit@example.com', GIT_COMMITTER_NAME: 'Kit Test', GIT_COMMITTER_EMAIL: 'kit@example.com', GIT_CONFIG_NOSYSTEM: '1' }
const git = (cwd, ...args) => {
  const result = spawnSync('git', ['-c', 'init.defaultBranch=main', '-c', 'commit.gpgsign=false', '-c', 'tag.gpgsign=false', ...args], { cwd, encoding: 'utf8', env: gitEnv })
  assert.equal(result.status, 0, result.stderr)
  return result.stdout.trim()
}
// Keep the companion safety skills step offline and away from the real home directory.
const offlineEnv = () => { const home = temp(); return { ...process.env, HOME: home, USERPROFILE: home, SECURE_KEY_ENTRY_REPO: join(tmpdir(), 'web-designer-no-such-secure-key-repo') } }
const update = (kit, args) => spawnSync(process.execPath, [join(kit, 'scripts', 'update-kit.mjs'), ...args], { encoding: 'utf8', timeout: 60000, env: offlineEnv() })
const setVersion = (dir, version) => {
  const file = join(dir, 'package.json')
  const value = JSON.parse(readFileSync(file, 'utf8'))
  value.version = version
  writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`)
}

function releasedKit() {
  const base = temp()
  const author = join(base, 'author')
  for (const dir of ['scripts', 'agents', 'skills', 'package.json']) cpSync(join(root, dir), join(author, dir), { recursive: true })
  setVersion(author, '9.0.0')
  git(base, 'init', '--quiet', author)
  git(author, 'add', '-A')
  git(author, 'commit', '--quiet', '-m', 'release 9.0.0')
  git(author, 'tag', 'v9.0.0')
  const origin = join(base, 'origin.git')
  git(base, 'clone', '--quiet', '--bare', author, origin)
  git(author, 'remote', 'add', 'origin', origin)
  const kit = join(base, 'kit')
  git(base, 'clone', '--quiet', origin, kit)
  return { base, author, kit }
}

test('compares release versions numerically and picks the latest v tag', () => {
  assert.equal(compareVersions('5.10.0', '5.9.9'), 1)
  assert.equal(compareVersions('v5.2.0', '5.2.0'), 0)
  assert.equal(latestReleaseTag(['v5.1.0', 'v5.10.0', 'v5.2.0', 'not-a-release', '6.0.0']), 'v5.10.0')
  assert.equal(latestReleaseTag([]), null)
})

test('a non-git kit copy reports how to get the latest release without failing', () => {
  const kit = join(temp(), 'kit')
  for (const dir of ['scripts', 'agents', 'skills', 'package.json']) cpSync(join(root, dir), join(kit, dir), { recursive: true })
  const result = update(kit, ['--check', '--json'])
  assert.equal(result.status, 0, result.stderr)
  const status = JSON.parse(result.stdout)
  assert.equal(status.state, 'not-git')
  assert.match(status.message, /releases\/latest/)
})

test('check reports a newer release and update fast-forwards then refreshes the install', () => {
  const { base, author, kit } = releasedKit()
  const claude = join(base, 'claude')
  let result = update(kit, ['--check', '--json'])
  assert.equal(result.status, 0, result.stderr)
  assert.equal(JSON.parse(result.stdout).state, 'current')

  setVersion(author, '9.1.0')
  writeFileSync(join(author, 'agents', 'web-designer.md'), `${readFileSync(join(author, 'agents', 'web-designer.md'), 'utf8')}\nRelease 9.1.0 marker.\n`)
  git(author, 'commit', '--quiet', '-am', 'release 9.1.0')
  git(author, 'tag', 'v9.1.0')
  git(author, 'push', '--quiet', 'origin', 'main', '--tags')

  result = update(kit, ['--check', '--json'])
  const check = JSON.parse(result.stdout)
  assert.equal(check.state, 'update-available')
  assert.equal(check.localVersion, '9.0.0')
  assert.equal(check.latestVersion, '9.1.0')

  result = update(kit, [`--claude-dir=${claude}`, '--json'])
  assert.equal(result.status, 0, result.stderr)
  const done = JSON.parse(result.stdout)
  assert.equal(done.updated, true)
  assert.equal(done.installed, true)
  assert.equal(done.safetySkills.ok, false, 'an unreachable companion repo is reported, never fatal')
  assert.equal(done.localVersion, '9.1.0')
  assert.match(readFileSync(join(claude, 'agents', 'web-designer.md'), 'utf8'), /Release 9\.1\.0 marker/)
  const manifest = JSON.parse(readFileSync(join(claude, 'masterminds-web-designer-kit.json'), 'utf8'))
  assert.equal(manifest.currentKitVersion, '9.1.0')
  assert.equal(manifest.kitRoot, kit)
})

test('update never overwrites local changes to tracked kit files', () => {
  const { author, kit } = releasedKit()
  setVersion(author, '9.2.0')
  git(author, 'commit', '--quiet', '-am', 'release 9.2.0')
  git(author, 'tag', 'v9.2.0')
  git(author, 'push', '--quiet', 'origin', 'main', '--tags')
  writeFileSync(join(kit, 'agents', 'web-designer.md'), 'local edit')
  const result = update(kit, ['--json'])
  assert.equal(result.status, 1)
  assert.equal(JSON.parse(result.stdout).state, 'blocked')
  assert.equal(readFileSync(join(kit, 'agents', 'web-designer.md'), 'utf8'), 'local edit')
})

test('update installs the release tag, not newer unreleased commits on the branch', () => {
  const { author, kit, base } = releasedKit()
  setVersion(author, '9.3.0')
  git(author, 'commit', '--quiet', '-am', 'release 9.3.0')
  git(author, 'tag', 'v9.3.0')
  setVersion(author, '9.4.0')
  git(author, 'commit', '--quiet', '-am', 'unreleased work')
  git(author, 'push', '--quiet', 'origin', 'main', '--tags')
  git(kit, 'tag', 'v99.0.0')
  const check = JSON.parse(update(kit, ['--check', '--json']).stdout)
  assert.equal(check.latestVersion, '9.3.0')
  const result = update(kit, [`--claude-dir=${join(base, 'claude')}`, '--json'])
  assert.equal(result.status, 0, result.stderr)
  assert.equal(JSON.parse(result.stdout).localVersion, '9.3.0')
})

test('a release tag that is not on the default branch blocks without changes', () => {
  const { author, kit } = releasedKit()
  git(author, 'checkout', '--quiet', '-b', 'side')
  setVersion(author, '9.5.0')
  git(author, 'commit', '--quiet', '-am', 'side release')
  git(author, 'tag', 'v9.5.0')
  git(author, 'push', '--quiet', 'origin', 'side', '--tags')
  const result = update(kit, ['--json'])
  assert.equal(result.status, 1)
  assert.equal(JSON.parse(result.stdout).state, 'blocked')
  assert.equal(JSON.parse(readFileSync(join(kit, 'package.json'), 'utf8')).version, '9.0.0')
})

test('a non-release local version reports cleanly instead of crashing', () => {
  const { kit } = releasedKit()
  setVersion(kit, '9.0.0-beta.1')
  const result = update(kit, ['--check', '--json'])
  assert.equal(result.status, 0, result.stderr)
  assert.equal(JSON.parse(result.stdout).state, 'unknown-version')
})
