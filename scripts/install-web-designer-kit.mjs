#!/usr/bin/env node
import { mkdirSync, readFileSync, renameSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  assertNoSymlinkPath,
  exists,
  regular,
  writeExclusive,
} from './lib/safe-paths.mjs'
import {
  collectKitAssets,
  hashFile,
  KIT_NAME,
  MANIFEST_SCHEMA_VERSION,
  parseManifest,
  readKitVersion,
} from './lib/kit-state.mjs'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const SOURCE_VERSION = readKitVersion(ROOT)

function parseArgs(args) {
  const options = { requested: null, replace: false, upgrade: false, extras: false, help: false }
  const seen = new Set()
  for (const arg of args) {
    let key
    if (arg === '-h' || arg === '--help') key = 'help'
    else if (arg.startsWith('--claude-dir=')) key = 'claude-dir'
    else if (arg === '--replace') key = 'replace'
    else if (arg === '--upgrade') key = 'upgrade'
    else if (arg === '--extras') key = 'extras'
    else throw new Error('unknown option')
    if (seen.has(key)) throw new Error(`duplicate --${key} option`)
    seen.add(key)
    if (key === 'claude-dir') options.requested = arg.slice('--claude-dir='.length).trim()
    else options[key] = true
  }
  if (options.replace && options.upgrade) throw new Error('--replace and --upgrade cannot be combined')
  if (seen.has('claude-dir') && !options.requested) throw new Error('--claude-dir cannot be empty')
  return options
}

let options
try { options = parseArgs(process.argv.slice(2)) } catch (error) {
  console.error(`Error: ${error.message}`)
  process.exit(1)
}
if (options.help) {
  console.log('Usage: node install-web-designer-kit.mjs [--claude-dir=DIR] [--replace|--upgrade] [--extras]\n--extras lists bundled catalog only; it never downloads or clones.')
  process.exit(0)
}

const claude = assertNoSymlinkPath(options.requested || join(homedir(), '.claude'), 'Claude directory')
const manifestPath = join(claude, 'masterminds-web-designer-kit.json')

function nextExclusivePath(base) {
  let candidate = base
  for (let counter = 1; exists(candidate); counter++) candidate = `${base}.${counter}`
  assertNoSymlinkPath(candidate, 'Destination')
  return candidate
}

function replaceFromSource(source, output, currentHash, sourceHash) {
  if (currentHash !== null && currentHash !== sourceHash) {
    const backup = nextExclusivePath(`${output}.backup`)
    writeExclusive(backup, readFileSync(output))
  }
  if (currentHash === sourceHash) return
  const staged = nextExclusivePath(`${output}.new`)
  writeExclusive(staged, readFileSync(source))
  renameSync(staged, output)
}

function writeCandidate(source, output) {
  const candidate = nextExclusivePath(`${output}.candidate`)
  writeExclusive(candidate, readFileSync(source))
}

let assets
let prior = null
try {
  assets = collectKitAssets(ROOT)
  assertNoSymlinkPath(manifestPath, 'Manifest')
  if (exists(manifestPath)) {
    if (!regular(manifestPath, true)) throw new Error('manifest is not a nonempty regular file')
    prior = parseManifest(readFileSync(manifestPath, 'utf8'))
  }
  for (const { rel } of assets) {
    const output = join(claude, ...rel.split('/'))
    assertNoSymlinkPath(output, 'Destination')
    if (exists(output) && !regular(output)) throw new Error(`Destination is not a regular file: ${output}`)
  }
} catch (error) {
  console.error(`Preflight error: ${error.message}`)
  process.exit(1)
}

try {
  mkdirSync(claude, { recursive: true })
  assertNoSymlinkPath(claude, 'Claude directory')

  const priorFiles = prior?.value.files ?? {}
  const managedFiles = {}
  const pending = new Set()
  let installedCount = 0

  for (const { source, rel } of assets) {
    const output = join(claude, ...rel.split('/'))
    const sourceHash = hashFile(source)
    const currentHash = regular(output) ? hashFile(output) : null
    const managedHash = priorFiles[rel] ?? null

    if (currentHash === null) {
      mkdirSync(dirname(output), { recursive: true })
      assertNoSymlinkPath(output, 'Destination')
      writeExclusive(output, readFileSync(source))
      managedFiles[rel] = sourceHash
      installedCount++
      continue
    }

    if (options.replace) {
      replaceFromSource(source, output, currentHash, sourceHash)
      managedFiles[rel] = sourceHash
      installedCount++
      continue
    }

    if (options.upgrade && managedHash && currentHash === managedHash) {
      replaceFromSource(source, output, currentHash, sourceHash)
      managedFiles[rel] = sourceHash
      installedCount++
      continue
    }

    if (managedHash) managedFiles[rel] = managedHash
    if (!managedHash || currentHash !== managedHash || sourceHash !== managedHash) pending.add(rel)
    if (options.upgrade && currentHash !== sourceHash) writeCandidate(source, output)
  }

  const pendingUpgrades = [...pending].sort()
  const lastCompletedVersion = pendingUpgrades.length === 0
    ? SOURCE_VERSION
    : prior?.value.lastCompletedVersion ?? null
  const state = {
    schemaVersion: MANIFEST_SCHEMA_VERSION,
    kit: KIT_NAME,
    version: SOURCE_VERSION,
    currentKitVersion: SOURCE_VERSION,
    lastCompletedVersion,
    files: managedFiles,
    pendingUpgrades,
    errors: [],
    extrasIncluded: false,
    kitRoot: ROOT,
  }
  const stagedManifest = nextExclusivePath(`${manifestPath}.new`)
  writeExclusive(stagedManifest, `${JSON.stringify(state, null, 2)}\n`)
  renameSync(stagedManifest, manifestPath)

  console.log(`Installed ${installedCount} kit files; pending upgrades: ${pendingUpgrades.length}.`)
  console.log(`Kit versions: current=${SOURCE_VERSION}; last completed=${lastCompletedVersion ?? 'none'}.`)
  console.log(`Stay current: node "${join(ROOT, 'scripts', 'update-kit.mjs')}"`)
  if (prior?.kind === 'legacy') console.log('Migrated legacy manifest conservatively; existing files remain unmanaged.')
  if (options.extras) console.log('Extras catalog: bundled references only; no remote repositories were cloned.')
} catch (error) {
  console.error(`Install failed: ${error.message}`)
  process.exit(1)
}
