import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const temp = () => realpathSync(mkdtempSync(join(tmpdir(), 'web-designer-ske-')))
const gitEnv = { ...process.env, GIT_AUTHOR_NAME: 'Kit Test', GIT_AUTHOR_EMAIL: 'kit@example.com', GIT_COMMITTER_NAME: 'Kit Test', GIT_COMMITTER_EMAIL: 'kit@example.com', GIT_CONFIG_NOSYSTEM: '1' }
const git = (cwd, ...args) => {
  const result = spawnSync('git', ['-c', 'init.defaultBranch=main', '-c', 'commit.gpgsign=false', ...args], { cwd, encoding: 'utf8', env: gitEnv })
  assert.equal(result.status, 0, result.stderr)
}

const SKILLS = ['secure-key-entry', 'save-points', 'undo', 'safe-delete']

// A local stand-in for the public repository with the same layout and installer contract.
function fixtureRepo(base, marker) {
  const repo = join(base, 'secure-key-entry-src')
  mkdirSync(join(repo, 'scripts'), { recursive: true })
  for (const skill of SKILLS) {
    mkdirSync(join(repo, 'skills', skill), { recursive: true })
    writeFileSync(join(repo, 'skills', skill, 'SKILL.md'), `---\nname: ${skill}\n---\n${marker}\n`)
  }
  for (const script of ['secure-key-entry.sh', 'safe-delete.sh']) writeFileSync(join(repo, 'scripts', script), '#!/usr/bin/env bash\n')
  for (const script of ['secure-key-entry.ps1', 'safe-delete.ps1', 'install.ps1']) writeFileSync(join(repo, 'scripts', script), '# stub\n')
  writeFileSync(join(repo, 'scripts', 'install.sh'), [
    '#!/usr/bin/env bash', 'set -euo pipefail', 'SRC="$(cd "$(dirname "$0")/.." && pwd)"',
    'for base in "$HOME/.claude/skills" "$HOME/.agents/skills"; do',
    '  for skill in "$SRC"/skills/*/; do name="$(basename "$skill")"; dest="$base/$name"',
    '    mkdir -p "$dest/scripts"; cp "$skill/SKILL.md" "$dest/SKILL.md"; cp "$SRC"/scripts/secure-key-entry.* "$SRC"/scripts/safe-delete.* "$dest/scripts/"',
    '  done', 'done', '',
  ].join('\n'))
  git(base, 'init', '--quiet', repo)
  git(repo, 'add', '-A')
  git(repo, 'commit', '--quiet', '-m', 'v1')
  return repo
}

const install = (home, repo, args = []) => spawnSync(process.execPath, [join(root, 'scripts', 'install-safety-skills.mjs'), '--json', ...args], { encoding: 'utf8', timeout: 60000, env: { ...process.env, HOME: home, USERPROFILE: home, SECURE_KEY_ENTRY_REPO: repo } })

test('clones the latest safety skills, runs its installer, then pulls updates on rerun', { skip: process.platform === 'win32' }, () => {
  const base = temp()
  const home = join(base, 'home')
  mkdirSync(home)
  const repo = fixtureRepo(base, 'first release')
  let result = install(home, repo)
  assert.equal(result.status, 0, result.stdout + result.stderr)
  assert.equal(JSON.parse(result.stdout).state, 'installed')
  for (const skill of SKILLS) {
    assert.match(readFileSync(join(home, '.claude', 'skills', skill, 'SKILL.md'), 'utf8'), /first release/)
    assert.ok(existsSync(join(home, '.agents', 'skills', skill, 'SKILL.md')))
  }

  writeFileSync(join(repo, 'skills', 'undo', 'SKILL.md'), '---\nname: undo\n---\nsecond release\n')
  git(repo, 'commit', '--quiet', '-am', 'v2')
  result = install(home, repo)
  assert.equal(result.status, 0, result.stdout + result.stderr)
  assert.equal(JSON.parse(result.stdout).state, 'updated')
  assert.match(readFileSync(join(home, '.claude', 'skills', 'undo', 'SKILL.md'), 'utf8'), /second release/)
})

test('also places the skills in a custom Claude directory so the health check can confirm it', { skip: process.platform === 'win32' }, () => {
  const base = temp()
  const home = join(base, 'home')
  mkdirSync(home)
  const claude = join(base, 'custom-claude')
  const result = install(home, fixtureRepo(base, 'custom'), [`--claude-dir=${claude}`])
  assert.equal(result.status, 0, result.stdout + result.stderr)
  for (const skill of SKILLS) assert.match(readFileSync(join(claude, 'skills', skill, 'SKILL.md'), 'utf8'), /custom/)
  assert.ok(existsSync(join(claude, 'skills', 'safe-delete', 'scripts', 'safe-delete.sh')))
})

test('an existing non-git ~/.secure-key-entry folder blocks without changes', () => {
  const base = temp()
  const home = join(base, 'home')
  mkdirSync(join(home, '.secure-key-entry'), { recursive: true })
  writeFileSync(join(home, '.secure-key-entry', 'notes.txt'), 'mine')
  const result = install(home, join(base, 'missing'))
  assert.equal(result.status, 1)
  assert.equal(JSON.parse(result.stdout).state, 'blocked')
  assert.equal(readFileSync(join(home, '.secure-key-entry', 'notes.txt'), 'utf8'), 'mine')
})

test('an unreachable source reports a clone failure with a manual fallback', () => {
  const base = temp()
  const home = join(base, 'home')
  mkdirSync(home)
  const result = install(home, join(base, 'missing'))
  assert.equal(result.status, 1)
  const status = JSON.parse(result.stdout)
  assert.equal(status.state, 'clone-failed')
  assert.match(status.message, /ZIP/)
})

test('a customized skill is backed up outside the skills folders before it is replaced', { skip: process.platform === 'win32' }, () => {
  const base = temp()
  const home = join(base, 'home')
  mkdirSync(join(home, '.claude', 'skills', 'undo'), { recursive: true })
  writeFileSync(join(home, '.claude', 'skills', 'undo', 'SKILL.md'), '---\nname: undo\n---\nmy own undo\n')
  const result = install(home, fixtureRepo(base, 'release'))
  assert.equal(result.status, 0, result.stdout + result.stderr)
  const status = JSON.parse(result.stdout)
  assert.equal(status.backups.length, 1)
  assert.match(readFileSync(join(status.backups[0], 'SKILL.md'), 'utf8'), /my own undo/)
  assert.ok(status.backups[0].startsWith(join(home, '.secure-key-entry-backups')))
  assert.match(readFileSync(join(home, '.claude', 'skills', 'undo', 'SKILL.md'), 'utf8'), /release/)
})
