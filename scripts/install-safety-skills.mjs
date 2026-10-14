#!/usr/bin/env node
// Installs or updates the safety skills (secure-key-entry, save-points, undo, safe-delete),
// always from the latest published copy. Clones the public secure-key-entry repository into
// ~/.secure-key-entry (or fast-forwards an existing clone), then runs its own installer, which
// places the skills in ~/.claude/skills and ~/.agents/skills. When --claude-dir points somewhere
// other than ~/.claude, the skills are also copied there so the health check can confirm them.
import { spawnSync } from 'node:child_process'
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, realpathSync } from 'node:fs'
import { homedir } from 'node:os'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export const SAFETY_SKILLS = ['secure-key-entry', 'save-points', 'undo', 'safe-delete']
export const DEFAULT_REPO_URL = 'https://github.com/josephtandle/secure-key-entry.git'

export function missingSafetySkills(claudeDir) {
  return SAFETY_SKILLS.filter((name) => {
    const file = join(claudeDir, 'skills', name, 'SKILL.md')
    try { return !readFileSync(file, 'utf8').includes(`name: ${name}`) } catch { return true }
  })
}

function git(args, cwd) {
  const env = { ...process.env, GIT_TERMINAL_PROMPT: '0', GCM_INTERACTIVE: 'never' }
  const result = spawnSync('git', args, { cwd, encoding: 'utf8', timeout: 120000, env })
  return { ok: result.status === 0, out: (result.stdout ?? '').trim(), err: (result.stderr ?? result.error?.message ?? '').trim() }
}

// Before the upstream installer overwrites a skill folder, keep a copy of any version that differs
// from the one about to be installed (for example a participant's own `undo` skill). Backups live
// outside the skills folders so they are never loaded as duplicate skills.
function backupChangedSkills(repoDir, skillRoots, backupRoot) {
  const saved = []
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  for (const name of readdirSync(join(repoDir, 'skills'))) {
    const incoming = join(repoDir, 'skills', name, 'SKILL.md')
    if (!existsSync(incoming)) continue
    const next = readFileSync(incoming)
    for (const [label, root] of skillRoots) {
      const current = join(root, name)
      const file = join(current, 'SKILL.md')
      if (!existsSync(file) || readFileSync(file).equals(next)) continue
      const destination = join(backupRoot, stamp, label, name)
      mkdirSync(destination, { recursive: true })
      cpSync(current, destination, { recursive: true })
      saved.push(destination)
    }
  }
  return saved
}

function sameDir(left, right) {
  try { return realpathSync(left) === realpathSync(right) } catch { return resolve(left) === resolve(right) }
}

export function installSafetySkills({ home = homedir(), claudeDir = join(home, '.claude'), repoDir = join(home, '.secure-key-entry'), repoUrl = process.env.SECURE_KEY_ENTRY_REPO || DEFAULT_REPO_URL } = {}) {
  let action
  if (existsSync(join(repoDir, '.git'))) {
    const pulled = git(['-C', repoDir, 'pull', '--ff-only', '--quiet'])
    if (!pulled.ok) return { ok: false, state: 'update-failed', missing: missingSafetySkills(claudeDir), message: `Could not update ${repoDir}: ${pulled.err}. The existing copy was left unchanged. If it keeps failing, move ${repoDir} aside and rerun to download a fresh copy.` }
    action = 'updated'
  } else if (existsSync(repoDir)) {
    return { ok: false, state: 'blocked', missing: missingSafetySkills(claudeDir), message: `${repoDir} exists but is not a git clone; nothing was changed. Move it aside, then rerun.` }
  } else {
    const cloned = git(['clone', '--quiet', repoUrl, repoDir])
    if (!cloned.ok) return { ok: false, state: 'clone-failed', missing: missingSafetySkills(claudeDir), message: `Could not download the safety skills: ${cloned.err}. Without git or internet, download https://github.com/josephtandle/secure-key-entry as a ZIP, extract it, and run scripts/install.sh (Mac) or scripts/install.ps1 (Windows).` }
    action = 'installed'
  }

  const windows = process.platform === 'win32'
  const installer = join(repoDir, 'scripts', windows ? 'install.ps1' : 'install.sh')
  if (!existsSync(installer)) return { ok: false, state: 'install-failed', missing: missingSafetySkills(claudeDir), message: `Safety skills installer is missing: ${installer}` }
  const command = windows ? 'powershell' : 'bash'
  const args = windows ? ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', installer] : [installer]
  const roots = [['claude', join(home, '.claude', 'skills')], ['agents', join(home, '.agents', 'skills')]]
  if (!sameDir(claudeDir, join(home, '.claude'))) roots.push(['custom-claude', join(claudeDir, 'skills')])
  const backups = backupChangedSkills(repoDir, roots, join(home, '.secure-key-entry-backups'))
  const env = { ...process.env, HOME: home }
  if (windows) env.USERPROFILE = home
  const ran = spawnSync(command, args, { encoding: 'utf8', timeout: 120000, env })
  if (ran.status !== 0) return { ok: false, state: 'install-failed', missing: missingSafetySkills(claudeDir), message: `Safety skills installer failed: ${(ran.stderr || ran.error?.message || '').trim()}` }

  if (!sameDir(claudeDir, join(home, '.claude'))) {
    // Mirror the upstream installer's layout into the custom Claude directory.
    const scripts = readdirSync(join(repoDir, 'scripts')).filter((file) => /^(secure-key-entry|safe-delete)\.(sh|ps1)$/.test(file))
    for (const name of readdirSync(join(repoDir, 'skills'))) {
      if (!existsSync(join(repoDir, 'skills', name, 'SKILL.md'))) continue
      const destination = join(claudeDir, 'skills', name)
      mkdirSync(join(destination, 'scripts'), { recursive: true })
      cpSync(join(repoDir, 'skills', name, 'SKILL.md'), join(destination, 'SKILL.md'))
      for (const script of scripts) cpSync(join(repoDir, 'scripts', script), join(destination, 'scripts', script))
    }
  }
  const missing = missingSafetySkills(claudeDir)
  const commit = git(['-C', repoDir, 'rev-parse', '--short', 'HEAD']).out
  return missing.length === 0
    ? { ok: true, state: action, commit, missing, backups, message: `Safety skills ${action} (${commit}): ${SAFETY_SKILLS.join(', ')} ready in ${join(claudeDir, 'skills')}.${backups.length ? ` Previous versions saved in ${join(home, '.secure-key-entry-backups')}.` : ''}` }
    : { ok: false, state: 'install-failed', commit, missing, message: `Safety skills installer ran but these are missing from ${join(claudeDir, 'skills')}: ${missing.join(', ')}.` }
}

function parseArgs(args) {
  const options = { claudeDir: null, json: false, help: false }
  for (const arg of args) {
    if (arg === '-h' || arg === '--help') options.help = true
    else if (arg === '--json') options.json = true
    else if (arg.startsWith('--claude-dir=') && arg.length > '--claude-dir='.length) options.claudeDir = arg.slice('--claude-dir='.length)
    else throw new Error(`unknown option: ${arg}`)
  }
  return options
}

function invokedDirectly() {
  try { return Boolean(process.argv[1]) && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url)) }
  catch { return false }
}

if (invokedDirectly()) {
  let options
  try { options = parseArgs(process.argv.slice(2)) } catch (error) {
    console.error(`Error: ${error.message}`)
    process.exit(1)
  }
  if (options.help) {
    console.log(`Usage: node install-safety-skills.mjs [--claude-dir=DIR] [--json]\nClones or updates ~/.secure-key-entry from GitHub, runs its installer, and confirms the safety skills are present: ${SAFETY_SKILLS.join(', ')}.`)
    process.exit(0)
  }
  const result = installSafetySkills(options.claudeDir ? { claudeDir: resolve(options.claudeDir) } : {})
  if (options.json) console.log(JSON.stringify(result, null, 2))
  else console.log(result.message)
  process.exit(result.ok ? 0 : 1)
}
