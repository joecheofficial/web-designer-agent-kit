#!/usr/bin/env node
// Keeps a kit checkout on the latest release and refreshes the installed agent and skills.
// --check only reports. Without --check it fast-forwards a clean git checkout of the
// default branch, then reruns the installer with --upgrade (customized files stay safe).
import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { readKitVersion } from './lib/kit-state.mjs'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
export const RELEASES_URL = 'https://github.com/josephtandle/web-designer-agent-kit/releases/latest'

export function parseVersion(value) {
  const match = /^v?(\d+)\.(\d+)\.(\d+)$/.exec(String(value ?? '').trim())
  return match ? match.slice(1).map(Number) : null
}

export function compareVersions(left, right) {
  const a = parseVersion(left)
  const b = parseVersion(right)
  if (!a || !b) throw new Error(`cannot compare versions ${left} and ${right}`)
  for (let index = 0; index < 3; index++) if (a[index] !== b[index]) return a[index] < b[index] ? -1 : 1
  return 0
}

export function latestReleaseTag(tags) {
  const releases = tags.map(tag => tag.trim()).filter(tag => parseVersion(tag) && tag.startsWith('v'))
  releases.sort(compareVersions)
  return releases.at(-1) ?? null
}

function git(root, args, timeout = 60000) {
  const result = spawnSync('git', ['-C', root, ...args], { encoding: 'utf8', timeout })
  return { ok: result.status === 0, out: (result.stdout ?? '').trim(), err: (result.stderr ?? '').trim() }
}

function parseArgs(args) {
  const options = { check: false, json: false, claudeDir: null, help: false }
  for (const arg of args) {
    if (arg === '-h' || arg === '--help') options.help = true
    else if (arg === '--check') options.check = true
    else if (arg === '--json') options.json = true
    else if (arg.startsWith('--claude-dir=') && arg.length > '--claude-dir='.length) options.claudeDir = arg.slice('--claude-dir='.length)
    else throw new Error(`unknown option: ${arg}`)
  }
  return options
}

export function inspectKit(root = ROOT) {
  const local = readKitVersion(root)
  const status = { kitRoot: root, localVersion: local, latestVersion: null, updateAvailable: false, state: 'unknown', message: '' }
  if (!existsSync(join(root, '.git'))) {
    return { ...status, state: 'not-git', message: `This kit is not a git checkout. Download the latest release from ${RELEASES_URL} or clone https://github.com/josephtandle/web-designer-agent-kit.git to stay current automatically.` }
  }
  const fetched = git(root, ['fetch', '--tags', '--quiet', 'origin'])
  if (!fetched.ok) return { ...status, state: 'offline', message: `Could not reach the kit origin (${fetched.err || 'git fetch failed'}). Continuing with ${local}.` }
  const tags = git(root, ['tag', '--list', 'v*'])
  const latest = latestReleaseTag(tags.ok ? tags.out.split('\n') : [])
  if (!latest) return { ...status, state: 'no-releases', message: `No release tags found on origin. Continuing with ${local}.` }
  const latestVersion = latest.slice(1)
  const updateAvailable = compareVersions(local, latestVersion) < 0
  return {
    ...status,
    latestVersion,
    updateAvailable,
    state: updateAvailable ? 'update-available' : 'current',
    message: updateAvailable ? `Kit ${local} is older than the latest release ${latestVersion}.` : `Kit ${local} is the latest release.`,
  }
}

function defaultBranch(root) {
  const head = git(root, ['symbolic-ref', '--quiet', '--short', 'refs/remotes/origin/HEAD'])
  if (head.ok && head.out.startsWith('origin/')) return head.out.slice('origin/'.length)
  const current = git(root, ['symbolic-ref', '--quiet', '--short', 'HEAD'])
  return current.ok ? current.out : null
}

export function updateKit(root = ROOT, { claudeDir = null } = {}) {
  const before = inspectKit(root)
  if (before.state !== 'update-available' && before.state !== 'current') return { ...before, updated: false, installed: false }
  if (before.updateAvailable) {
    const branch = defaultBranch(root)
    const current = git(root, ['symbolic-ref', '--quiet', '--short', 'HEAD'])
    if (!branch || !current.ok || current.out !== branch) {
      return { ...before, updated: false, installed: false, state: 'blocked', message: `Kit checkout is not on its default branch${branch ? ` (${branch})` : ''}; switch to it, then rerun update-kit.` }
    }
    const dirty = git(root, ['status', '--porcelain', '--untracked-files=no'])
    if (!dirty.ok || dirty.out) {
      return { ...before, updated: false, installed: false, state: 'blocked', message: 'Kit checkout has local changes to tracked files; nothing was overwritten. Commit or move them aside, then rerun update-kit.' }
    }
    const pulled = git(root, ['merge', '--ff-only', `origin/${branch}`])
    if (!pulled.ok) return { ...before, updated: false, installed: false, state: 'blocked', message: `Fast-forward failed: ${pulled.err}` }
  }
  const installerArgs = [join(root, 'scripts', 'install-web-designer-kit.mjs'), '--upgrade']
  if (claudeDir) installerArgs.push(`--claude-dir=${claudeDir}`)
  const install = spawnSync(process.execPath, installerArgs, { encoding: 'utf8', timeout: 120000 })
  const localVersion = readKitVersion(root)
  return {
    ...before,
    localVersion,
    updated: before.updateAvailable,
    installed: install.status === 0,
    state: install.status === 0 ? 'current' : 'install-failed',
    message: install.status === 0
      ? `Kit ${localVersion} is active. ${(install.stdout ?? '').trim()}`
      : `Installer failed: ${(install.stderr ?? '').trim()}`,
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  let options
  try { options = parseArgs(process.argv.slice(2)) } catch (error) {
    console.error(`Error: ${error.message}`)
    process.exit(1)
  }
  if (options.help) {
    console.log('Usage: node update-kit.mjs [--check] [--json] [--claude-dir=DIR]\n--check reports whether a newer release exists. Without it, a clean checkout on its default branch is fast-forwarded and the installer reruns with --upgrade.')
    process.exit(0)
  }
  const result = options.check ? inspectKit() : updateKit(ROOT, { claudeDir: options.claudeDir })
  if (options.json) console.log(JSON.stringify(result, null, 2))
  else console.log(result.message)
  process.exit(['install-failed', 'blocked'].includes(result.state) ? 1 : 0)
}
