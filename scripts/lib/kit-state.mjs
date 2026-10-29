import { createHash } from 'node:crypto'
import { readFileSync, readdirSync } from 'node:fs'
import { posix, join } from 'node:path'
import { lstat, regular } from './safe-paths.mjs'

export const KIT_NAME = 'web-designer-agent-kit'
export const MANIFEST_SCHEMA_VERSION = 2
export const REQUIRED_ASSETS = [
  'agents/web-designer.md',
  'skills/agent-readiness/SKILL.md',
  'skills/agent-readiness/references/fix-recipes.md',
  'skills/frontend-design/SKILL.md',
  'skills/masterminds-web-designer/SKILL.md',
  'skills/masterminds-web-designer/tools/component-lab.html',
  'skills/masterminds-web-designer/tools/palette-studio.html',
  'skills/masterminds-web-designer/tools/reference-compare.html',
  'skills/masterminds-web-designer/references/copy-cleanup.md',
  'skills/masterminds-web-designer/references/design-directions.md',
  'skills/masterminds-web-designer/references/layout-atlas.md',
  'skills/masterminds-web-designer/references/reference-layout.md',
]

export const hashFile = file => createHash('sha256').update(readFileSync(file)).digest('hex')

export function readKitVersion(root) {
  const value = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
  if (!value || typeof value !== 'object' || Array.isArray(value) || typeof value.version !== 'string' || !value.version.trim()) {
    throw new Error('package.json has no valid kit version')
  }
  return value.version
}

function walkDirectory(root, directory, prefix, output) {
  const stat = lstat(directory)
  if (!stat?.isDirectory() || stat.isSymbolicLink()) throw new Error(`Invalid bundled source directory: ${directory}`)
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const source = join(directory, entry.name)
    const relative = posix.join(prefix, entry.name)
    if (entry.isSymbolicLink()) throw new Error(`Bundled source cannot contain symbolic links: ${source}`)
    if (entry.isDirectory()) walkDirectory(root, source, relative, output)
    else if (entry.isFile() && regular(source, true)) output.push({ source, rel: relative })
    else throw new Error(`Invalid or empty bundled source asset: ${source}`)
  }
}

export function collectKitAssets(root) {
  const assets = []
  walkDirectory(root, join(root, 'agents'), 'agents', assets)
  walkDirectory(root, join(root, 'skills'), 'skills', assets)
  const names = new Set(assets.map(asset => asset.rel))
  for (const required of REQUIRED_ASSETS) {
    if (!names.has(required)) throw new Error(`Required bundled asset missing or empty: ${required}`)
  }
  return assets.sort((left, right) => left.rel.localeCompare(right.rel))
}

const isHash = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value)
const isStringArray = value => Array.isArray(value) && value.every(item => typeof item === 'string')
const isCanonicalRelative = value => typeof value === 'string'
  && value.length > 0
  && !value.includes('\\')
  && !value.startsWith('/')
  && posix.normalize(value) === value
  && !value.startsWith('../')

function validFiles(value) {
  return value && typeof value === 'object' && !Array.isArray(value)
    && Object.entries(value).every(([name, digest]) => isCanonicalRelative(name) && isHash(digest))
}

function validPathArray(value) {
  return isStringArray(value)
    && value.every(isCanonicalRelative)
    && new Set(value).size === value.length
}

export function classifyManifest(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || value.kit !== KIT_NAME) return null
  if (value.schemaVersion === MANIFEST_SCHEMA_VERSION) {
    const valid = typeof value.version === 'string'
      && value.version === value.currentKitVersion
      && (value.lastCompletedVersion === null || typeof value.lastCompletedVersion === 'string')
      && validFiles(value.files)
      && validPathArray(value.pendingUpgrades)
      && isStringArray(value.errors)
      && typeof value.extrasIncluded === 'boolean'
    return valid ? { kind: 'current', value } : null
  }
  if (Object.hasOwn(value, 'schemaVersion')) return null
  if (typeof value.version === 'string' && validFiles(value.files)) {
    const pendingUpgrades = value.pendingUpgrades ?? []
    const errors = value.errors ?? []
    if (!validPathArray(pendingUpgrades) || !isStringArray(errors)) return null
    return {
      kind: 'legacy',
      value: {
        files: {},
        currentKitVersion: value.version,
        lastCompletedVersion: null,
        pendingUpgrades,
        errors,
      },
    }
  }
  if (isStringArray(value.installed) && isStringArray(value.skipped) && isStringArray(value.failed)) {
    return {
      kind: 'legacy',
      value: {
        files: {},
        pendingUpgrades: [],
        errors: value.failed,
        currentKitVersion: null,
        lastCompletedVersion: null,
      },
    }
  }
  return null
}

export function parseManifest(text) {
  let value
  try { value = JSON.parse(text) } catch { throw new Error('manifest is not valid JSON') }
  const classified = classifyManifest(value)
  if (!classified) throw new Error('manifest schema is invalid')
  return classified
}
