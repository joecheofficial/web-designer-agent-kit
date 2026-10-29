import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { parseScanStream, probe, runScan, scoreScan } from '../scripts/agent-readiness.mjs'

const check = (id, status, extra = {}) => ({ id, name: id, status, details: `${id} ${status}`, ...extra })
const scan = (checks, extra = {}) => ({ domain: 'example.com', layers: [{ id: 'l', checks }], ...extra })

test('scoreScan pools essential (80) and recommended (20) and caps at 100', () => {
  const s = scoreScan(scan([
    check('agent-friendly-404', 'pass'),
    check('markdown-negotiation-vary', 'fail'),
    check('agent-instruction', 'pass'),
    check('trust-anchors', 'warning'),
  ]))
  assert.deepEqual(s.essential, { earned: 40, available: 80, passing: 1, total: 2 })
  assert.deepEqual(s.recommended, { earned: 15, available: 20, passing: 1, total: 2 })
  assert.equal(s.score, 55)
  assert.equal(s.gaps[0].id, 'markdown-negotiation-vary')
})

test('API checks only count once the site exposes an API surface', () => {
  const base = [check('agent-friendly-404', 'pass'), check('openapi-spec', 'fail'), check('cli-tool', 'fail')]
  const noApi = scoreScan(scan(base))
  assert.equal(noApi.essential.total, 1)
  assert.equal(noApi.gaps.length, 0)
  const withApi = scoreScan(scan([...base, check('public-api', 'pass')]))
  assert.equal(withApi.essential.total, 2)
  assert.ok(withApi.gaps.some((g) => g.id === 'openapi-spec'))
})

test('bonus checks add at most 5 points and never count as gaps', () => {
  const many = Array.from({ length: 30 }, (_, i) => check(`pricing-md`, 'pass', { id: `x${i}`, bonus: true }))
  const s = scoreScan(scan([check('agent-friendly-404', 'warning'), ...many]))
  assert.equal(s.bonus, 5)
  assert.equal(s.score, 45)
  assert.ok(s.gaps.every((g) => !g.bonus))
})

test('not-applicable checks are excluded', () => {
  const s = scoreScan(scan([check('agent-friendly-404', 'pass'), check('json-error-responses', 'na')]))
  assert.equal(s.essential.total, 1)
})

test('parseScanStream returns the final scan result', () => {
  const result = scan([check('agent-friendly-404', 'pass')])
  const text = `data: {"type":"check_start"}\n\ndata: ${JSON.stringify({ type: 'scan_complete', result })}\n\n`
  assert.deepEqual(parseScanStream(text), result)
  assert.equal(parseScanStream('data: {"type":"scan_init"}\n'), null)
})

function site(routes) {
  return async (url, init = {}) => {
    const u = new URL(url)
    const accept = init.headers?.Accept ?? ''
    const key = `${u.pathname}${accept.includes('markdown') ? ' md' : ''}`
    const hit = routes[key] ?? routes[u.pathname]
    if (hit) return new Response(hit.body, { status: hit.status ?? 200, headers: hit.headers ?? { 'content-type': 'text/html' } })
    const md = accept.includes('markdown') && routes.md404
    return md
      ? new Response('# Page not found\n\nSee /llms.txt and the sitemap.', { status: 404, headers: { 'content-type': 'text/markdown', vary: 'Accept' } })
      : new Response('<h1>Not found</h1>', { status: 404, headers: { 'content-type': 'text/html' } })
  }
}

const words = '<p>' + 'Real content about the business. '.repeat(25) + '</p>'

test('probe passes a fully agent-ready site', async () => {
  const fetchImpl = site({
    md404: true,
    '/ md': { body: '# Home', headers: { 'content-type': 'text/markdown; charset=utf-8', vary: 'Accept' } },
    '/': { body: `<script type="application/ld+json">{"@type":"Organization","address":{"@type":"PostalAddress"},"contactPoint":[]}</script>${words}`, headers: { 'content-type': 'text/html', link: '</index.md>; rel="alternate"' } },
    '/llms.txt': { body: '# X\n\n## When to use X\n' },
    '/about': { body: words }, '/contact': { body: words }, '/privacy': { body: words },
    '/.well-known/agent-skills/index.json': { body: '{"skills":[]}' },
  })
  const r = await probe('https://example.com', { fetchImpl })
  assert.deepEqual(r.checks.filter((c) => !c.pass).map((c) => c.id), [])
  assert.equal(r.hasApi, false)
})

test('probe flags a plain HTML site and checks JSON errors when an API exists', async () => {
  const fetchImpl = site({
    '/': { body: '<h1>Hi</h1>' },
    '/openapi.json': { body: '{"openapi":"3.1.0"}', headers: { 'content-type': 'application/json' } },
  })
  const r = await probe('https://example.com', { fetchImpl })
  const failed = r.checks.filter((c) => !c.pass).map((c) => c.id)
  for (const id of ['markdown-negotiation-vary', 'agent-friendly-404', 'agent-instruction', 'trust-anchors', 'org-schema-completeness', 'json-error-responses']) {
    assert.ok(failed.includes(id), id)
  }
})

test('the web designer only offers agent readiness after launch', () => {
  const agent = readFileSync(new URL('../agents/web-designer.md', import.meta.url), 'utf8')
  const skill = readFileSync(new URL('../skills/agent-readiness/SKILL.md', import.meta.url), 'utf8')
  assert.match(agent, /14\. Agent readiness \(post-launch only\)/)
  assert.match(agent, /Never raise this during the first build/)
  assert.match(skill, /^---\nname: agent-readiness\n/)
  assert.match(skill, /Not on the first build/)
})

test('runScan retries network failures and busy responses, then succeeds', async () => {
  const result = scan([check('agent-friendly-404', 'pass')])
  let calls = 0
  const fetchImpl = async () => {
    calls++
    if (calls === 1) throw Object.assign(new TypeError('fetch failed'), { cause: { code: 'UND_ERR_CONNECT_TIMEOUT' } })
    if (calls === 2) return new Response('busy', { status: 429 })
    return new Response(`data: ${JSON.stringify({ type: 'scan_complete', result })}\n\n`, { status: 200 })
  }
  assert.deepEqual(await runScan('https://example.com', { fetchImpl, waitMs: 1 }), result)
  assert.equal(calls, 3)
})

test('runScan gives a clear error after the last retry', async () => {
  const fetchImpl = async () => { throw Object.assign(new TypeError('fetch failed'), { cause: { code: 'ECONNRESET' } }) }
  await assert.rejects(runScan('https://example.com', { fetchImpl, waitMs: 1, attempts: 2 }), /after 2 tries \(ECONNRESET\)/)
})

test('CLI output is never cut off when piped', () => {
  const script = new URL('../scripts/agent-readiness.mjs', import.meta.url).pathname
  const run = spawnSync(process.execPath, [script, '--help'], { encoding: 'utf8' })
  assert.equal(run.status, 0)
  assert.match(run.stdout, /Usage: node scripts\/agent-readiness\.mjs/)
  assert.doesNotMatch(readFileSync(script, 'utf8'), /process\.exit\(/)
})
