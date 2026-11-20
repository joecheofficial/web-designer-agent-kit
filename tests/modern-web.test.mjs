import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import {
  MIN_NODE_MAJOR,
  MWG_PACKAGE,
  MWG_VERSION,
  PLAIN_WORDS,
  findNpxCli,
  nodeSupported,
  npxInvocation,
  packageArgs,
  plainReport,
  skipMessage,
} from '../scripts/modern-web.mjs'

const root = new URL('../', import.meta.url)
const script = fileURLToPath(new URL('../scripts/modern-web.mjs', import.meta.url))
const run = args => spawnSync(process.execPath, [script, ...args], { encoding: 'utf8', timeout: 10000 })

const sample = {
  targetDir: '/site',
  totalFindings: 6,
  activeGuideCount: 38,
  guides: [
    {
      guideId: 'customize-scrollbar-color-and-thickness',
      count: 5,
      rules: [{ ruleId: 'r1', summary: 'Use scrollbar-color and scrollbar-width.', count: 5, findings: [1, 2, 3, 4, 5].map(line => ({ file: 'style.css', line, message: 'm', lineContent: 'x' })) }],
    },
    {
      guideId: 'some-future-guide',
      count: 1,
      rules: [{ ruleId: 'r2', summary: 'A newer fix.', count: 1, findings: [{ file: 'index.html', line: 9, message: 'm', lineContent: 'y' }] }],
    },
  ],
}

test('pins one exact upstream version and needs Node 22', () => {
  assert.equal(MWG_PACKAGE, 'modern-web-guidance')
  assert.match(MWG_VERSION, /^\d+\.\d+\.\d+$/)
  assert.equal(MIN_NODE_MAJOR, 22)
  assert.deepEqual(packageArgs('legacy-scan', ['/s', '--json']), ['--yes', `modern-web-guidance@${MWG_VERSION}`, 'legacy-scan', '/s', '--json'])
  assert.equal(nodeSupported('20.18.0'), false)
  assert.equal(nodeSupported('v21.7.3'), false)
  assert.equal(nodeSupported('22.0.0'), true)
  assert.equal(nodeSupported('24.1.0'), true)
  assert.match(skipMessage('v20.18.0'), /needs Node\.js 22 or newer.*v20\.18\.0.*Nothing was changed/)
})

test('runs npm npx-cli.js with node directly when present, on any platform', () => {
  const winNode = 'C:\\Program Files\\nodejs\\node.exe'
  const exists = path => path.includes('node_modules') && path.endsWith('npx-cli.js') && !path.includes('lib')
  const cli = findNpxCli(winNode, exists)
  assert.ok(cli && cli.endsWith('npx-cli.js'))
  const call = npxInvocation('legacy-scan', ['C:\\My Site'], { platform: 'win32', execPath: winNode, exists })
  assert.equal(call.file, winNode)
  assert.equal(call.shell, false)
  assert.deepEqual(call.args.slice(1), packageArgs('legacy-scan', ['C:\\My Site']))
})

test('Windows fallback quotes every argument and refuses shell metacharacters', () => {
  const options = { platform: 'win32', execPath: 'C:\\n\\node.exe', exists: () => false }
  assert.throws(() => npxInvocation('search', ['dialog & del x'], options), /cannot pass/)
  const call = npxInvocation('legacy-scan', ['C:\\My Site', '--json'], options)
  assert.equal(call.shell, true)
  assert.deepEqual(call.args, [])
  assert.equal(call.file, `npx.cmd "--yes" "modern-web-guidance@${MWG_VERSION}" "legacy-scan" "C:\\My Site" "--json"`)
  const posix = npxInvocation('search', ['dialog'], { platform: 'darwin', execPath: '/x/bin/node', exists: () => false })
  assert.deepEqual(posix, { file: 'npx', args: packageArgs('search', ['dialog']), shell: false })
})

test('plain report explains findings in plain words and caps locations', () => {
  const text = plainReport(sample, { kitScript: '/kit/scripts/modern-web.mjs' })
  assert.match(text, /Found 6 spots to modernise in 2 areas\. Nothing was changed\./)
  assert.match(text, /1\. Scrollbars \(5 spots\)/)
  assert.match(text, /What it means: Scrollbar colours use a Chrome-only trick/)
  assert.match(text, /Where: style\.css line 1, style\.css line 2, style\.css line 3 and 2 more/)
  assert.match(text, /node "\/kit\/scripts\/modern-web\.mjs" retrieve customize-scrollbar-color-and-thickness/)
  assert.match(text, /2\. some-future-guide \(1 spot\)\n {3}The fix: A newer fix\./)
  assert.doesNotMatch(text, /\u2014/)
  const clean = plainReport({ targetDir: '/site', totalFindings: 0, activeGuideCount: 38, guides: [] })
  assert.match(clean, /No old patterns found by the 38 automatic checks/)
})

test('plain words are short, plain and free of em dashes', () => {
  for (const [id, [title, meaning]] of Object.entries(PLAIN_WORDS)) {
    assert.ok(title && meaning, id)
    assert.ok(meaning.length < 160, id)
    assert.doesNotMatch(`${title} ${meaning}`, /\u2014/, id)
  }
})

test('cli validates input without touching the network', () => {
  assert.equal(run(['--help']).status, 0)
  assert.match(run(['--version']).stdout, new RegExp(`modern-web-guidance@${MWG_VERSION.replaceAll('.', '\\.')}`))
  assert.notEqual(run(['check']).status, 0)
  assert.notEqual(run(['check', `--dir=${join(mkdtempSync(join(tmpdir(), 'mwg-')), 'missing')}`]).status, 0)
  assert.notEqual(run(['bogus']).status, 0)
  assert.notEqual(run(['search']).status, 0)
})

test('skill, agent, prompt and notices wire the guidance in', () => {
  const read = rel => readFileSync(new URL(rel, root), 'utf8')
  const reference = read('skills/masterminds-web-designer/references/modern-web-guidance.md')
  assert.match(reference, /scripts\/modern-web\.mjs" search/)
  assert.match(reference, /scripts\/modern-web\.mjs" check/)
  assert.match(reference, /Node\.js 22 or newer/)
  for (const rel of ['agents/web-designer.md', 'skills/masterminds-web-designer/SKILL.md']) {
    const text = read(rel)
    assert.match(text, /references\/modern-web-guidance\.md/, rel)
    assert.match(text, /modern-web\.mjs" check/, rel)
    assert.match(text, /modern-web\.mjs" search/, rel)
  }
  assert.match(read('prompts/12-check-my-site.md'), /modern-web\.mjs" check/)
  const notices = read('THIRD-PARTY-NOTICES.md')
  assert.match(notices, /Apache License 2\.0/)
  assert.ok(notices.includes(`modern-web-guidance@${MWG_VERSION}`))
  for (const rel of ['skills/masterminds-web-designer/references/modern-web-guidance.md', 'THIRD-PARTY-NOTICES.md', 'prompts/12-check-my-site.md']) {
    assert.doesNotMatch(read(rel), /\u2014/, rel)
  }
})

test('live scan explains a legacy pattern (opt in with MWG_LIVE=1)', { skip: process.env.MWG_LIVE !== '1' || !nodeSupported() }, () => {
  const site = mkdtempSync(join(tmpdir(), 'mwg-site-'))
  spawnSync(process.execPath, ['-e', `require('fs').writeFileSync(${JSON.stringify(join(site, 'style.css'))}, '.c::-webkit-scrollbar{width:6px}\\n.c::-webkit-scrollbar-thumb{background:#ccc}\\n')`])
  const result = spawnSync(process.execPath, [script, 'check', `--dir=${site}`, '--json'], { encoding: 'utf8', timeout: 300000 })
  assert.equal(result.status, 0, result.stderr)
  const report = JSON.parse(result.stdout)
  assert.equal(report.status, 'checked')
  assert.ok(report.guides.some(guide => guide.guideId === 'customize-scrollbar-color-and-thickness'))
})
