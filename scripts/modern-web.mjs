#!/usr/bin/env node
// Modern Web Guidance for the Web Designer kit.
// Runs Google Chrome's Modern Web Guidance CLI (Apache-2.0, kept by the Chrome, Edge,
// Firefox and MDN teams) at one pinned version, with its telemetry switched off.
//   search "<task>"       find the up-to-date guide for a piece of site code
//   retrieve <id>[,<id>]  print the guide before writing or editing that code
//   check --dir=SITE      read-only legacy scan of a site, explained in plain words
// It needs Node.js 22 or newer. On older Node it skips with a plain note and exits 0.
import { spawnSync } from 'node:child_process'
import { existsSync, realpathSync, statSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export const MWG_PACKAGE = 'modern-web-guidance'
export const MWG_VERSION = '1.0.1'
export const MWG_SOURCE = 'https://github.com/GoogleChrome/modern-web-guidance-src'
export const MWG_SOURCE_COMMIT = '47e23a1428073d9194c5f50232e86a551807e117'
export const MIN_NODE_MAJOR = 22
const SCRIPT = fileURLToPath(import.meta.url)

// Plain-word meaning of each guide the legacy scan can flag (scan coverage of 1.0.1).
export const PLAIN_WORDS = {
  'animate-to-intrinsic-sizes': ['Opening and closing panels', 'Accordions and menus can open smoothly with plain CSS instead of extra JavaScript.'],
  'autofill-address-form': ['Address form', 'Browsers cannot fill in your visitors\' address for them yet. Small labels on each field fix that.'],
  'autofill-payment-form': ['Payment form', 'Browsers cannot fill in card details for your visitors yet. Small labels on each field fix that.'],
  'autofill-sign-in-form': ['Sign-in form', 'Password managers cannot fill in the login for your visitors yet. One small label on each field fixes that.'],
  'autofill-sign-up-form': ['Sign-up form', 'Browsers cannot suggest a strong password or fill in details on sign-up yet.'],
  'calculate-event-differentials': ['Dates and countdowns', 'Date maths is done by hand. The browser now has a built-in, more reliable way.'],
  checkbox: ['Checkboxes', 'Custom checkboxes can keep the real checkbox underneath so keyboards and screen readers still work.'],
  'child-state-based-styling': ['Styling from what is inside', 'JavaScript is used to restyle a block based on its contents. CSS can now do this on its own.'],
  'complex-shapes': ['Shaped images and blocks', 'Shapes are made with old tricks. CSS clip paths and masks are lighter and sharper.'],
  'custom-text-decorations': ['Underlines', 'Fancy underlines are faked with extra elements. CSS can now style underlines directly.'],
  'customize-scrollbar-color-and-thickness': ['Scrollbars', 'Scrollbar colours use a Chrome-only trick, so Firefox ignores them. One standard CSS line works everywhere.'],
  'dark-mode': ['Dark mode', 'The site can follow each visitor\'s light or dark setting, including scrollbars and form fields.'],
  'dark-mode-toggle': ['Dark mode switch', 'The light/dark switch can be simpler and remember the visitor\'s choice without a flash of the wrong colours.'],
  'declarative-dialog-popover-control': ['Buttons that open things', 'Pop-ups are opened with JavaScript where a plain HTML button attribute now does the job.'],
  'deliver-optimized-decorative-images': ['Background images', 'Background images can come in smaller modern formats (AVIF or WebP) so pages load faster.'],
  dialog: ['Pop-up windows', 'A home-made pop-up can be swapped for the built-in dialog, which handles the keyboard, focus and the Escape key for you.'],
  'dynamic-sibling-animations': ['Staggered animations', 'Each item\'s animation delay is set by hand. CSS can now count the items for you.'],
  'dynamic-sibling-styling': ['Layouts that adapt to item count', 'Styles are calculated in JavaScript where CSS can now react to how many items there are.'],
  'equal-width-text-lines': ['Poster-style headlines', 'Stacked headline lines are sized by hand. Newer CSS can size them automatically.'],
  'flicker-free-client-side-ab-testing': ['A/B tests', 'The test script can make the page flicker before it changes. There is a cleaner way to load it.'],
  'form-fields-automatically-fit-contents': ['Growing text boxes', 'Text boxes resize with JavaScript. One CSS line now lets them grow as people type.'],
  icons: ['Icons', 'Icons can load faster, stay crisp at any size and be hidden properly from screen readers.'],
  'ime-safe-enter-submit': ['Enter to send', 'Pressing Enter can send a half-typed message for people typing in Chinese, Japanese or Korean.'],
  'improve-next-page-load-performance': ['Faster next page', 'The site preloads links with an old script. The browser\'s built-in speculation rules are lighter and faster.'],
  'improve-text-layout-and-legibility': ['Headline line breaks', 'Headings can break into balanced lines with one CSS line, so no single word sits alone.'],
  'interest-triggered-tooltips': ['Tooltips', 'Tooltips are built by hand. Newer HTML and CSS can show them on hover, focus and long-press with less code.'],
  js: ['JavaScript habits', 'Some JavaScript uses older patterns that the language now does more simply and safely.'],
  progress: ['Progress bars', 'A home-made progress bar can be the built-in one, which screen readers understand.'],
  'sanitize-untrusted-html': ['Showing user-written HTML', 'User-written content is cleaned by hand, which can let harmful code through. The browser has a safer built-in cleaner.'],
  'scroll-entry-exit-effects': ['Scroll animations', 'Reveal-on-scroll effects use JavaScript scroll listeners. CSS can now run them more smoothly.'],
  scrollspy: ['Menu that follows the page', 'The menu highlight that tracks the section on screen uses heavy scroll code. There is a lighter way.'],
  'secure-external-subresources': ['Scripts from other websites', 'Files loaded from other websites have no safety check, so a changed file could run on your site.'],
  'select-menu-interaction': ['Drop-down menus', 'Drop-downs show an error before the visitor has even touched them.'],
  slider: ['Sliders', 'A custom slider can keep the real one underneath so it works with keyboards and screen readers.'],
  'styling-web-components': ['Reusable components', 'Component styles reach inside in an older way. Newer CSS hooks are cleaner.'],
  switch: ['On/off switches', 'A home-made switch can use the built-in HTML switch, with a checkbox fallback.'],
  'validate-input-after-interaction': ['Form error messages', 'Error messages appear before visitors finish typing. They can wait until the visitor leaves the field.'],
}

export function nodeMajor(version = process.versions.node) {
  const major = Number.parseInt(String(version).replace(/^v/, '').split('.')[0], 10)
  return Number.isNaN(major) ? 0 : major
}

export const nodeSupported = (version = process.versions.node) => nodeMajor(version) >= MIN_NODE_MAJOR

export function skipMessage(version = process.version) {
  return `Modern Web Guidance skipped: it needs Node.js ${MIN_NODE_MAJOR} or newer and this computer has ${version}. Nothing was changed. Install Node.js 24 from https://nodejs.org to turn this check on.`
}

// npm ships npx-cli.js next to node: <bin>/node_modules/npm on Windows, <prefix>/lib/node_modules/npm elsewhere.
export function findNpxCli(execPath = process.execPath, exists = existsSync) {
  const bin = dirname(execPath)
  const candidates = [
    join(bin, 'node_modules', 'npm', 'bin', 'npx-cli.js'),
    join(bin, '..', 'lib', 'node_modules', 'npm', 'bin', 'npx-cli.js'),
  ]
  return candidates.find(candidate => exists(candidate)) ?? null
}

export function packageArgs(command, args) {
  return ['--yes', `${MWG_PACKAGE}@${MWG_VERSION}`, command, ...args]
}

// Prefer running npm's own npx-cli.js with this node (no shell, safe on Windows paths with spaces).
// Fall back to the npx on PATH. On Windows that needs a shell, so the command is one string with every
// argument double-quoted, and arguments holding shell characters are refused rather than altered.
export function npxInvocation(command, args, { platform = process.platform, execPath = process.execPath, exists = existsSync } = {}) {
  const pkgArgs = packageArgs(command, args)
  const cli = findNpxCli(execPath, exists)
  if (cli) return { file: execPath, args: [cli, ...pkgArgs], shell: false }
  if (platform === 'win32') {
    const unsafe = pkgArgs.find(arg => /["%^&|<>!\r\n]/.test(String(arg)))
    if (unsafe) throw new Error(`cannot pass ${JSON.stringify(unsafe)} to npx on this computer; rename the folder or rephrase without " % ^ & | < > !`)
    return { file: ['npx.cmd', ...pkgArgs.map(arg => `"${arg}"`)].join(' '), args: [], shell: true }
  }
  return { file: 'npx', args: pkgArgs, shell: false }
}

function runUpstream(command, args, stdio) {
  const call = npxInvocation(command, args)
  return spawnSync(call.file, call.args, {
    encoding: 'utf8',
    stdio,
    shell: call.shell,
    timeout: 300000,
    maxBuffer: 64 * 1024 * 1024,
    env: { ...process.env, DISABLE_TELEMETRY: '1', NO_COLOR: '1', npm_config_update_notifier: 'false' },
  })
}

const plural = (count, word) => `${count} ${word}${count === 1 ? '' : 's'}`

export function plainReport(scan, { kitScript = SCRIPT } = {}) {
  const lines = [`Modern Web Guidance check (rules ${MWG_VERSION}) for ${scan.targetDir}`]
  if (!scan.totalFindings) {
    lines.push(`No old patterns found by the ${scan.activeGuideCount ?? 'available'} automatic checks. Nothing was changed.`)
    lines.push('The automatic scan covers about a fifth of the guidance, so the designer still follows the full rulebook when writing new code.')
    return `${lines.join('\n')}\n`
  }
  lines.push(`Found ${plural(scan.totalFindings, 'spot')} to modernise in ${plural(scan.guides.length, 'area')}. Nothing was changed.`)
  lines.push('These come from a pattern scan, so each one is checked before anything is fixed.')
  scan.guides.forEach((guide, index) => {
    const [title, meaning] = PLAIN_WORDS[guide.guideId] ?? [guide.guideId, null]
    lines.push('', `${index + 1}. ${title} (${plural(guide.count, 'spot')})`)
    if (meaning) lines.push(`   What it means: ${meaning}`)
    for (const rule of guide.rules) {
      lines.push(`   The fix: ${rule.summary}`)
      const where = rule.findings.slice(0, 3).map(finding => `${finding.file} line ${finding.line}`)
      const more = rule.findings.length - where.length
      lines.push(`   Where: ${where.join(', ')}${more > 0 ? ` and ${more} more` : ''}`)
    }
    lines.push(`   Full guide: node "${kitScript}" retrieve ${guide.guideId}`)
  })
  return `${lines.join('\n')}\n`
}

function parseCheckArgs(args) {
  const options = { dir: null, json: false }
  for (const arg of args) {
    if (arg === '--json') options.json = true
    else if (arg.startsWith('--dir=') && arg.length > 6) options.dir = arg.slice(6)
    else throw new Error(`unknown option: ${arg}`)
  }
  if (!options.dir) throw new Error('check needs --dir=<site folder>')
  return options
}

function check(args) {
  const options = parseCheckArgs(args)
  const dir = resolve(options.dir)
  if (!existsSync(dir) || !statSync(dir).isDirectory()) throw new Error(`site folder not found: ${dir}`)
  if (!nodeSupported()) {
    if (options.json) console.log(JSON.stringify({ status: 'skipped', reason: 'node-too-old', node: process.version, message: skipMessage() }, null, 2))
    else console.log(skipMessage())
    return 0
  }
  const result = runUpstream('legacy-scan', [dir, '--json'], ['ignore', 'pipe', 'pipe'])
  let scan = null
  try { scan = JSON.parse(result.stdout) } catch { scan = null }
  if (result.status !== 0 || !scan || !Array.isArray(scan.guides) || scan.error) {
    const reason = scan?.error || result.error?.message || (result.stderr || '').trim().split('\n').slice(-3).join(' ') || 'no result'
    const message = `Modern Web Guidance could not run (${reason}). Nothing was changed. It downloads once from npm, so check the internet connection and try again.`
    if (options.json) console.log(JSON.stringify({ status: 'unavailable', message }, null, 2))
    else console.log(message)
    return 0
  }
  if (options.json) console.log(JSON.stringify({ status: 'checked', version: MWG_VERSION, plain: Object.fromEntries(scan.guides.map(g => [g.guideId, PLAIN_WORDS[g.guideId] ?? null])), ...scan }, null, 2))
  else process.stdout.write(plainReport(scan))
  return 0
}

function passthrough(command, args) {
  if (args.length === 0 && command !== 'list') throw new Error(`${command} needs ${command === 'search' ? 'an English description of the task' : 'one or more guide ids'}`)
  if (!nodeSupported()) {
    console.log(skipMessage())
    return 0
  }
  const result = runUpstream(command, command === 'search' ? [args.join(' ')] : args, 'inherit')
  const status = result.error ? 1 : (result.status ?? 1)
  if (status !== 0) {
    console.error(`Modern Web Guidance could not run${result.error ? ` (${result.error.message})` : ''}. It downloads once from npm, so check the internet connection or the guide id. Continue with the kit's built-in standards and say so.`)
  }
  return status
}

const USAGE = `Usage:
  node modern-web.mjs search "<what you are building, in English>"
  node modern-web.mjs retrieve <guide-id>[,<guide-id>]
  node modern-web.mjs check --dir=<site folder> [--json]
  node modern-web.mjs --version
Runs ${MWG_PACKAGE}@${MWG_VERSION} through npx with telemetry off. Needs Node.js ${MIN_NODE_MAJOR}+. check never changes files.`

export function main(argv = process.argv.slice(2)) {
  const [command, ...rest] = argv
  if (!command || command === '-h' || command === '--help') { console.log(USAGE); return command ? 0 : 1 }
  if (command === '--version' || command === '-v') { console.log(`${MWG_PACKAGE}@${MWG_VERSION} (source ${MWG_SOURCE} at ${MWG_SOURCE_COMMIT})`); return 0 }
  if (command === 'check') return check(rest)
  if (command === 'search' || command === 'retrieve' || command === 'list') return passthrough(command, rest)
  throw new Error(`unknown command: ${command}`)
}

function invokedDirectly() {
  try { return Boolean(process.argv[1]) && realpathSync(process.argv[1]) === realpathSync(SCRIPT) }
  catch { return false }
}

if (invokedDirectly()) {
  try { process.exitCode = main() } catch (error) {
    console.error(`Error: ${error.message}`)
    process.exitCode = 1
  }
}
