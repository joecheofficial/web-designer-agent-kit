import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync, symlinkSync, cpSync, unlinkSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const root = fileURLToPath(new URL('../', import.meta.url))
const temp = () => mkdtempSync(join(tmpdir(), 'web-designer-install-'))
function run(script, args, env = {}) {
  return spawnSync(process.execPath, [resolve(root, 'scripts', script), ...args], { encoding: 'utf8', timeout: 20000, env: { ...process.env, ...env } })
}

test('core installs without invoking Git and preserves edits on rerun', () => {
  const base = temp()
  const target = join(base, 'My Claude')
  const bin = join(base, 'bin')
  mkdirSync(bin)
  const calls = join(base, 'git-called')
  writeFileSync(join(bin, 'git'), `#!/bin/sh\ntouch '${calls}'\nexit 1\n`, { mode: 0o755 })
  const env = { PATH: `${bin}:${process.env.PATH}` }
  const result = run('install-web-designer-kit.mjs', [`--claude-dir=${target}`], env)
  assert.equal(result.status, 0, result.stderr)
  assert.equal(existsSync(calls), false, 'Core must not clone remote repositories')
  const agent = join(target, 'agents', 'web-designer.md')
  assert.equal(readFileSync(agent, 'utf8'), readFileSync(join(root, 'agents', 'web-designer.md'), 'utf8'))
  assert.ok(existsSync(join(target, 'skills', 'masterminds-web-designer', 'references', 'design-directions.md')))
  writeFileSync(agent, 'My custom designer\n')
  const second = run('install-web-designer-kit.mjs', [`--claude-dir=${target}`], env)
  assert.equal(second.status, 0, second.stderr)
  assert.equal(readFileSync(agent, 'utf8'), 'My custom designer\n')
})

test('health evaluates actual installed core, then detects a missing file', () => {
  const base = temp()
  const target = join(base, 'claude')
  const project = join(base, 'project')
  mkdirSync(project)
  const installed = run('install-web-designer-kit.mjs', [`--claude-dir=${target}`])
  assert.equal(installed.status, 0, installed.stderr)
  const context = run('install-context.mjs', [`--target=${project}`])
  assert.equal(context.status, 0, context.stderr)
  const healthy = run('health-check.mjs', [`--claude-dir=${target}`, `--project=${project}`])
  assert.equal(healthy.status, 0, healthy.stdout + healthy.stderr)
  writeFileSync(join(target, 'agents', 'web-designer.md'), '')
  const broken = run('health-check.mjs', [`--claude-dir=${target}`, `--project=${project}`])
  assert.notEqual(broken.status, 0, 'Empty core agent must fail health')
})

test('context install never overwrites previous originals or proposals', () => {
  const project = temp()
  const proposal = join(project, '.masterminds-context')
  mkdirSync(proposal)
  for (const name of ['CLAUDE.md', 'USER.md', 'SOUL.md']) {
    writeFileSync(join(project, name), `original ${name}`)
    writeFileSync(join(proposal, name), `proposal ${name}`)
  }
  for (let i = 0; i < 2; i++) {
    const result = run('install-context.mjs', [`--target=${project}`])
    assert.equal(result.status, 0, result.stderr)
  }
  for (const name of ['CLAUDE.md', 'USER.md', 'SOUL.md']) {
    assert.equal(readFileSync(join(project, name), 'utf8'), `original ${name}`)
    assert.equal(readFileSync(join(proposal, name), 'utf8'), `proposal ${name}`)
  }
})

test('rerun then upgrade never adopts and overwrites customized files', () => {
  const target = join(temp(), 'claude')
  assert.equal(run('install-web-designer-kit.mjs', [`--claude-dir=${target}`]).status, 0)
  const agent = join(target, 'agents', 'web-designer.md')
  writeFileSync(agent, 'My protected design instructions')
  assert.equal(run('install-web-designer-kit.mjs', [`--claude-dir=${target}`]).status, 0)
  assert.equal(run('install-web-designer-kit.mjs', [`--claude-dir=${target}`, '--upgrade']).status, 0)
  assert.equal(readFileSync(agent, 'utf8'), 'My protected design instructions')
})

test('manifest contains only kit-owned installed files', () => {
  const target = join(temp(), 'claude')
  mkdirSync(join(target, 'agents'), { recursive: true })
  writeFileSync(join(target, 'agents', 'unrelated.md'), 'unrelated agent')
  assert.equal(run('install-web-designer-kit.mjs', [`--claude-dir=${target}`]).status, 0)
  const state = JSON.parse(readFileSync(join(target, 'masterminds-web-designer-kit.json'), 'utf8'))
  assert.equal(Object.hasOwn(state.files, 'agents/unrelated.md'), false)
})

test('malformed state makes health fail with usable files still present', () => {
  const base = temp()
  const target = join(base, 'claude')
  const project = join(base, 'project')
  assert.equal(run('install-web-designer-kit.mjs', [`--claude-dir=${target}`]).status, 0)
  assert.equal(run('install-context.mjs', [`--target=${project}`]).status, 0)
  writeFileSync(join(target, 'masterminds-web-designer-kit.json'), '{broken')
  assert.notEqual(run('health-check.mjs', [`--claude-dir=${target}`, `--project=${project}`]).status, 0)
})

test('nested destination symlink cannot write outside the install', () => {
  const base = temp()
  const target = join(base, 'claude')
  const skill = join(target, 'skills', 'masterminds-web-designer')
  const outside = join(base, 'outside')
  mkdirSync(skill, { recursive: true })
  mkdirSync(outside)
  symlinkSync(outside, join(skill, 'references'), 'dir')
  const result = run('install-web-designer-kit.mjs', [`--claude-dir=${target}`])
  assert.notEqual(result.status, 0)
  assert.deepEqual(readdirSync(outside), [])
})

test('repeated upgrades preserve edited candidates', () => {
  const target = join(temp(), 'claude')
  assert.equal(run('install-web-designer-kit.mjs', [`--claude-dir=${target}`]).status, 0)
  const agent = join(target, 'agents', 'web-designer.md')
  writeFileSync(agent, 'custom')
  writeFileSync(`${agent}.candidate`, 'my candidate edits')
  assert.equal(run('install-web-designer-kit.mjs', [`--claude-dir=${target}`, '--upgrade']).status, 0)
  assert.equal(readFileSync(`${agent}.candidate`, 'utf8'), 'my candidate edits')
})


test('dangling context symlinks cannot create external files',()=>{
 const base=temp();const project=join(base,'project');mkdirSync(project);const external=join(base,'outside.md');symlinkSync(external,join(project,'CLAUDE.md'));const r=run('install-context.mjs',[`--target=${project}`]);assert.notEqual(r.status,0);assert.equal(existsSync(external),false);
});
test('install rejects user symlink ancestors',()=>{
 const base=temp();const real=join(base,'real');mkdirSync(real);symlinkSync(real,join(base,'alias'),'dir');const r=run('install-web-designer-kit.mjs',[`--claude-dir=${join(base,'alias','config')}`]);assert.notEqual(r.status,0);assert.deepEqual(readdirSync(real),[]);
});
test('array state is rejected before mutation and fails health',()=>{
 const base=temp();const target=join(base,'claude');const project=join(base,'site');assert.equal(run('install-web-designer-kit.mjs',[`--claude-dir=${target}`]).status,0);assert.equal(run('install-context.mjs',[`--target=${project}`]).status,0);const manifest=join(target,'masterminds-web-designer-kit.json');writeFileSync(manifest,'[]');assert.notEqual(run('install-web-designer-kit.mjs',[`--claude-dir=${target}`]).status,0);assert.equal(readFileSync(manifest,'utf8'),'[]');assert.notEqual(run('health-check.mjs',[`--claude-dir=${target}`,`--project=${project}`]).status,0);
});


test('incomplete bundled source is refused even when other skill assets exist',()=>{
 const base=temp();const source=join(base,'kit');for(const dir of ['scripts','agents','skills','package.json'])cpSync(join(root,dir),join(source,dir),{recursive:true});unlinkSync(join(source,'agents','web-designer.md'));
 const target=join(base,'claude');const result=spawnSync(process.execPath,[join(source,'scripts','install-web-designer-kit.mjs'),`--claude-dir=${target}`],{encoding:'utf8',timeout:20000});assert.notEqual(result.status,0);assert.equal(existsSync(target),false);
});
test('dangling upgrade candidate cannot create an outside file',()=>{
 const base=temp();const target=join(base,'claude');assert.equal(run('install-web-designer-kit.mjs',[`--claude-dir=${target}`]).status,0);const agent=join(target,'agents','web-designer.md');writeFileSync(agent,'custom');const outside=join(base,'outside.md');symlinkSync(outside,`${agent}.candidate`);run('install-web-designer-kit.mjs',[`--claude-dir=${target}`,'--upgrade']);assert.equal(existsSync(outside),false);assert.equal(readFileSync(agent,'utf8'),'custom');
});


test('first install cannot adopt a pre-existing custom agent for future overwrite',()=>{
 const target=join(temp(),'claude');mkdirSync(join(target,'agents'),{recursive:true});const f=join(target,'agents','web-designer.md');writeFileSync(f,'PREEXISTING CUSTOM AGENT');assert.equal(run('install-web-designer-kit.mjs',[`--claude-dir=${target}`]).status,0);assert.equal(run('install-web-designer-kit.mjs',[`--claude-dir=${target}`,'--upgrade']).status,0);assert.equal(readFileSync(f,'utf8'),'PREEXISTING CUSTOM AGENT');
});


test('upgrade advances changed upstream content while preserving a customized agent',()=>{
 const base=temp();const source=join(base,'older-kit');for(const dir of ['scripts','agents','skills','package.json'])cpSync(join(root,dir),join(source,dir),{recursive:true});const ref='skills/masterminds-web-designer/references/design-directions.md';writeFileSync(join(source,ref),'Older design instructions');const target=join(base,'claude');const old=spawnSync(process.execPath,[join(source,'scripts/install-web-designer-kit.mjs'),`--claude-dir=${target}`],{encoding:'utf8',timeout:20000});assert.equal(old.status,0,old.stderr);const agent=join(target,'agents','web-designer.md');writeFileSync(agent,'Keep my custom workflow');assert.equal(run('install-web-designer-kit.mjs',[`--claude-dir=${target}`,'--upgrade']).status,0);assert.equal(readFileSync(agent,'utf8'),'Keep my custom workflow');assert.equal(readFileSync(join(target,ref),'utf8'),readFileSync(join(root,ref),'utf8'));assert.equal(readFileSync(agent+'.candidate','utf8'),readFileSync(join(root,'agents/web-designer.md'),'utf8'));assert.equal(run('install-web-designer-kit.mjs',[`--claude-dir=${target}`,'--upgrade']).status,0);assert.equal(readFileSync(agent,'utf8'),'Keep my custom workflow');
});


test('legacy cohort manifest upgrades conservatively without replacing old custom instructions',()=>{
 const target=join(temp(),'claude');mkdirSync(join(target,'agents'),{recursive:true});const f=join(target,'agents','web-designer.md');writeFileSync(f,'Legacy custom instructions');writeFileSync(join(target,'masterminds-web-designer-kit.json'),JSON.stringify({kit:'web-designer-agent-kit',installedAt:'2026-01-01T00:00:00Z',installed:['agent:web-designer'],skipped:[],failed:[],selectedSkillCount:22}));const result=run('install-web-designer-kit.mjs',[`--claude-dir=${target}`,'--upgrade']);assert.equal(result.status,0,result.stderr);assert.equal(readFileSync(f,'utf8'),'Legacy custom instructions');assert.ok(existsSync(f+'.candidate'));
});


test('unknown manifest schema is rejected before writes',()=>{
 const target=join(temp(),'claude');assert.equal(run('install-web-designer-kit.mjs',[`--claude-dir=${target}`]).status,0);const file=join(target,'masterminds-web-designer-kit.json');const state=JSON.parse(readFileSync(file,'utf8'));state.schemaVersion=999;writeFileSync(file,JSON.stringify(state));const before=readFileSync(file,'utf8');assert.notEqual(run('install-web-designer-kit.mjs',[`--claude-dir=${target}`,'--upgrade']).status,0);assert.equal(readFileSync(file,'utf8'),before);
});
test('legacy adopted hashes cannot authorize overwriting customized content',async()=>{
 const {createHash}=await import('node:crypto');const target=join(temp(),'claude');mkdirSync(join(target,'agents'),{recursive:true});const file=join(target,'agents/web-designer.md');const content='Preserve legacy adopted custom instructions';writeFileSync(file,content);writeFileSync(join(target,'masterminds-web-designer-kit.json'),JSON.stringify({kit:'web-designer-agent-kit',version:'4.0.0',files:{'agents/web-designer.md':createHash('sha256').update(content).digest('hex')}}));const result=run('install-web-designer-kit.mjs',[`--claude-dir=${target}`,'--upgrade']);assert.equal(result.status,0,result.stderr);assert.equal(readFileSync(file,'utf8'),content);
});
