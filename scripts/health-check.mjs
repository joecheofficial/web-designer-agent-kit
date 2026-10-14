#!/usr/bin/env node
import { readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { assertNoSymlinkPath, regular } from './lib/safe-paths.mjs'
import {
  collectKitAssets,
  hashFile,
  parseManifest,
  readKitVersion,
} from './lib/kit-state.mjs'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')

function parseArgs(args) {
  const options = { claude: null, project: null, help: false }
  const seen = new Set()
  for (const arg of args) {
    let key
    if (arg === '-h' || arg === '--help') key = 'help'
    else if (arg.startsWith('--claude-dir=')) key = 'claude'
    else if (arg.startsWith('--project=')) key = 'project'
    else throw new Error('unknown option')
    if (seen.has(key)) throw new Error(`duplicate --${key === 'claude' ? 'claude-dir' : key} option`)
    seen.add(key)
    if (key === 'claude') options.claude = arg.slice('--claude-dir='.length).trim()
    else if (key === 'project') options.project = arg.slice('--project='.length).trim()
    else options.help = true
  }
  if ((seen.has('claude') && !options.claude) || (seen.has('project') && !options.project)) {
    throw new Error('path options cannot be empty')
  }
  return options
}

let options
try { options = parseArgs(process.argv.slice(2)) } catch (error) {
  console.error(`Error: ${error.message}`)
  process.exit(1)
}
if (options.help) {
  console.log('Usage: node health-check.mjs [--claude-dir=DIR] [--project=DIR]')
  process.exit(0)
}

let healthy = true
const fail = message => {
  healthy = false
  console.error(`ERROR: ${message}`)
}

let sourceVersion = 'unknown'
let manifest = null
try {
  sourceVersion = readKitVersion(ROOT)
  const claude = assertNoSymlinkPath(options.claude || join(homedir(), '.claude'), 'Claude directory')
  const project = assertNoSymlinkPath(options.project || process.cwd(), 'Project directory')
  const assets = collectKitAssets(ROOT)
  const assetNames = new Set(assets.map(asset => asset.rel))
  const manifestFile = join(claude, 'masterminds-web-designer-kit.json')

  try {
    assertNoSymlinkPath(manifestFile, 'Manifest')
    if (!regular(manifestFile, true)) throw new Error('manifest is missing or not a nonempty regular file')
    const parsed = parseManifest(readFileSync(manifestFile, 'utf8'))
    if (parsed.kind !== 'current') throw new Error('manifest requires conservative migration by the installer')
    manifest = parsed.value
    if (manifest.currentKitVersion !== sourceVersion) fail(`manifest current kit version is ${manifest.currentKitVersion}, source is ${sourceVersion}`)
    if (manifest.pendingUpgrades.length > 0) fail(`pending upgrades remain: ${manifest.pendingUpgrades.length}`)
    if (manifest.errors.length > 0) fail(`manifest records prior errors: ${manifest.errors.length}`)
    if (manifest.pendingUpgrades.length === 0 && manifest.lastCompletedVersion !== sourceVersion) {
      fail(`last completed version is ${manifest.lastCompletedVersion ?? 'none'}, expected ${sourceVersion}`)
    }
    for (const name of Object.keys(manifest.files)) {
      if (!assetNames.has(name)) fail(`manifest tracks an asset absent from the current source: ${name}`)
    }
  } catch (error) {
    fail(error.message)
  }

  for (const { source, rel } of assets) {
    const installed = join(claude, ...rel.split('/'))
    try {
      assertNoSymlinkPath(installed, 'Installed asset')
      if (!regular(installed, true)) {
        fail(`kit asset missing or invalid: ${rel}`)
        continue
      }
      const recordedHash = manifest?.files?.[rel]
      if (!recordedHash) {
        fail(`manifest hash missing for unmanaged asset: ${rel}`)
        continue
      }
      const installedHash = hashFile(installed)
      const sourceHash = hashFile(source)
      if (installedHash !== recordedHash) fail(`installed hash mismatch: ${rel}`)
      if (sourceHash !== recordedHash) fail(`installed asset is stale against current source: ${rel}`)
    } catch (error) {
      fail(error.message)
    }
  }

  for (const name of ['CLAUDE.md', 'USER.md', 'SOUL.md']) {
    const contextFile = join(project, name)
    try {
      assertNoSymlinkPath(contextFile, 'Project context')
      if (!regular(contextFile, true)) fail(`project context missing or invalid: ${name}`)
    } catch (error) {
      fail(error.message)
    }
  }
} catch (error) {
  fail(error.message)
}

console.log(`Kit versions: current=${sourceVersion}; last completed=${manifest?.lastCompletedVersion ?? 'none'}.`)
console.log(healthy ? 'Health check PASSED.' : 'Health check FAILED.')
process.exit(healthy ? 0 : 1)
