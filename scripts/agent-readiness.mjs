#!/usr/bin/env node
// Agent readiness check for a PUBLISHED site: a direct HTTP probe of the things agents
// need, plus an optional Is Agentic (is-agentic.com, Ora checks) scan scored with the
// same formula the Is Agentic report uses. Read-only: it never changes the site.
//
//   node scripts/agent-readiness.mjs --url=https://example.com            probe only
//   node scripts/agent-readiness.mjs --url=https://example.com --scan     probe + fresh scan
//   add --json for machine output, --cached to reuse the last Is Agentic scan
import { pathToFileURL } from 'node:url'
import { setDefaultAutoSelectFamilyAttemptTimeout } from 'node:net'

// Node gives each address 250 ms before moving on; slow links then fail sites curl reaches.
setDefaultAutoSelectFamilyAttemptTimeout(2500)

const IS_AGENTIC = 'https://is-agentic.com'
const UA = 'web-designer-agent-readiness/1.0'

// ---- Is Agentic scoring (mirrors the public report's grouping of Ora checks) ----
const ESSENTIAL = new Set('agent-crawler-reachability agent-friendly-404 ax-accessible-names ax-document-structure ax-form-labeling ax-native-controls bot-detection content-no-js docs-auth-gate json-error-responses markdown-negotiation-vary mcp-auth-mechanism mcp-error-handling mcp-oauth-metadata mcp-pkce-s256 mcp-resource-listing mcp-server-identity mcp-transport-modern mcp-view-csp mcp-view-domain oauth-protected-resource oauth-support openapi-spec redirect-hygiene scoped-permissions'.split(' '))
const EMERGING = new Set('a2ui-support acp-delegate-payment acp-support agent-auth-discovery-metadata agent-auth-endpoints-reachable agent-discovery-file agent-mode-view agent-plugins-repo agent-rules-repo agent-skills-index-v2 agent-ua-markdown agentic-search-usecase ap2-support ard-catalog ard-entries-valid ard-trust-manifest auth-md-exists auth-md-structure auth-md-walkthrough-simulation llms-txt-exists llms-txt-formatting llms-txt-links-resolve markdown-frontmatter markdown-link-alternate markdown-negotiation markdown-url-fallback mcp-app-registry mcp-apps-ui-quality mcp-multi-surface-coverage mcp-server-card mcp-well-known-discovery modular-llms-txt mpp-support nlweb-ask nlweb-schema-feeds nlweb-streaming pricing-md registry-branding skills-sh-listed skills-sh-quality speakable-content ucp-support web-bot-auth-directory webmcp x402-support'.split(' '))
const IGNORED = new Set(['robots-agent-user-policy', 'robots-ai-policy-quality'])
const NEVER_BONUS = new Set(['markdown-negotiation-vary'])
const ALIASES = new Map([['bot-detection', 'agent-crawler-reachability']])
const BONUS = new Set('a2a-agent-card acp-delegate-payment acp-support agent-plugins-repo agent-rules-repo agent-skills-index-v2 ap2-support ax-tree-injection-safe batch-endpoints chatgpt-app-listed async-job-pattern idempotency-key-support json-ld-entity-linking link-headers-discovery mcp-registry-listed mcp-tool-annotations mpp-support npm-sdk-package pagination-shape registry-branding rest-sdk-packages sandbox-environment schema-type-breadth sitemap-lastmod skills-sh-listed skills-sh-quality ucp-support wikipedia-presence x402-support'.split(' '))
const API = new Set('agent-auth-www-authenticate api-catalog-rfc9727 api-error-model api-schema-analysis api-versioning-policy async-job-pattern batch-endpoints cli-tool developer-portal function-calling-compat idempotency-key-support json-error-responses npm-sdk-package openapi-spec pagination-shape public-api public-api-docs rate-limit-headers response-schema-coverage rest-sdk-packages sandbox-environment schema-type-breadth'.split(' '))
const AUTH = new Set('agent-auth-discovery-metadata agent-auth-endpoints-reachable agent-auth-www-authenticate auth-md-exists auth-md-structure auth-md-walkthrough-simulation oauth-protected-resource oauth-support onboarding-friction scoped-permissions'.split(' '))
const COMMERCE = new Set('acp-delegate-payment acp-support ap2-support mpp-support pricing-info pricing-md ucp-support x402-support'.split(' '))
const SURFACE_TRIGGERS = {
  api: ['public-api', 'public-api-docs', 'openapi-spec', 'api-catalog-rfc9727', 'api-schema-analysis'],
  auth: ['oauth-support', 'oauth-protected-resource', 'agent-auth-www-authenticate'],
  mcp: ['mcp-server', 'mcp-tool-listing', 'mcp-server-identity', 'mcp-transport-modern'],
  graphql: ['graphql-schema-completeness'],
  commerce: ['acp-support', 'ap2-support', 'mpp-support', 'ucp-support', 'x402-support'],
}

function fraction(check) {
  if (check.status === 'na' || check.status === 'pending') return null
  if (typeof check.score === 'number' && typeof check.maxScore === 'number' && check.maxScore > 0) {
    return Math.max(0, Math.min(1, check.score / check.maxScore))
  }
  return check.status === 'pass' ? 1 : check.status === 'warning' ? 0.5 : 0
}

function surface(id) {
  if (id.startsWith('graphql-')) return 'graphql'
  if (id.startsWith('mcp-')) return 'mcp'
  if (AUTH.has(id)) return 'auth'
  if (API.has(id)) return 'api'
  if (COMMERCE.has(id)) return 'commerce'
  return 'web'
}

const round1 = (n) => Math.round(n * 10) / 10

/** Score an Ora scan result the way the Is Agentic report does. */
export function scoreScan(result) {
  const groups = new Map()
  for (const layer of result.layers ?? []) {
    for (const check of layer.checks ?? []) {
      if (IGNORED.has(check.id)) continue
      const f = fraction(check)
      if (f === null) continue
      const id = ALIASES.get(check.id) ?? check.id
      const g = groups.get(id) ?? { checks: [], fractions: [] }
      g.checks.push(check)
      g.fractions.push(f)
      groups.set(id, g)
    }
  }
  const items = [...groups].map(([id, g]) => {
    const tier = ESSENTIAL.has(id) ? 'essential' : EMERGING.has(id) ? 'emerging' : 'recommended'
    const worst = [...g.checks].sort((a, b) => (fraction(a) ?? 1) - (fraction(b) ?? 1))[0]
    return {
      id,
      name: worst.name,
      tier,
      bonus: !NEVER_BONUS.has(id) && (tier === 'emerging' || BONUS.has(id) || g.checks.some((c) => c.bonus === true)),
      fraction: g.fractions.reduce((a, b) => a + b, 0) / g.fractions.length,
      details: worst.details ?? '',
      recommendation: worst.recommendation ?? '',
    }
  })
  const byId = new Map(items.map((i) => [i.id, i]))
  const surfaces = new Set(['web'])
  for (const [name, ids] of Object.entries(SURFACE_TRIGGERS)) {
    if (ids.some((id) => (byId.get(id)?.fraction ?? 0) > 0)) surfaces.add(name)
  }
  const all = (result.layers ?? []).flatMap((l) => l.checks ?? [])
  if (result.urlKind === 'mcp' || result.urlKind === 'mcp-app' || all.some((c) => c.mcpUrl)) surfaces.add('mcp')
  if (result.mcpAuthRequired) surfaces.add('auth')

  const eligible = items.filter((i) => surface(i.id) === 'web' || surfaces.has(surface(i.id)) || i.bonus)
  const pool = (list, points) => ({
    earned: round1((list.length ? list.reduce((a, i) => a + i.fraction, 0) / list.length : 0) * points),
    available: points,
    passing: list.filter((i) => i.fraction >= 0.999).length,
    total: list.length,
  })
  const essential = eligible.filter((i) => i.tier === 'essential' && !i.bonus)
  const recommended = eligible.filter((i) => i.tier === 'recommended' && !i.bonus)
  const bonusItems = eligible.filter((i) => i.bonus)
  const e = pool(essential, 80)
  const r = pool(recommended, 20)
  const bonus = round1(Math.min(5, bonusItems.reduce((a, i) => a + 0.25 * i.fraction, 0)))
  const gaps = [...essential, ...recommended]
    .filter((i) => i.fraction < 0.999)
    .sort((a, b) => (a.tier === b.tier ? a.fraction - b.fraction : a.tier === 'essential' ? -1 : 1))
  return {
    score: e.total + r.total > 0 ? Math.round(Math.min(100, e.earned + r.earned + bonus)) : null,
    essential: e,
    recommended: r,
    bonus,
    surfaces: [...surfaces].sort(),
    gaps,
    bonusGaps: bonusItems.filter((i) => i.fraction < 0.999),
  }
}

/** Parse the Is Agentic scan event stream and return the final Ora result. */
export function parseScanStream(text) {
  let result = null
  for (const line of text.split('\n')) {
    if (!line.startsWith('data: ')) continue
    try {
      const event = JSON.parse(line.slice(6))
      if ((event.type === 'scan_complete' || event.type === 'scan_archived') && event.result?.layers) result = event.result
    } catch { /* partial frame */ }
  }
  return result
}

export async function runScan(origin, { force = true, fetchImpl = fetch, attempts = 3, waitMs = 20000 } = {}) {
  const url = new URL('/api/scan/stream', IS_AGENTIC)
  url.searchParams.set('target', origin)
  if (force) url.searchParams.set('force', '1')
  let lastError
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const res = await fetchImpl(url, { headers: { Accept: 'text/event-stream', 'Cache-Control': 'no-store', 'User-Agent': UA } })
      if (res.status === 429 || res.status >= 500) {
        lastError = new Error(`Is Agentic is busy: HTTP ${res.status}`)
        const retryAfter = Number(res.headers.get('retry-after'))
        if (attempt < attempts) await new Promise((r) => setTimeout(r, retryAfter > 0 ? retryAfter * 1000 : waitMs * attempt))
        continue
      }
      if (!res.ok) throw new Error(`Is Agentic scan failed to start: HTTP ${res.status}`)
      const result = parseScanStream(await res.text())
      if (!result) throw new Error('Is Agentic scan finished without a result')
      return result
    } catch (error) {
      // Network blips and throttling (resets, connect timeouts) are common; HTTP errors above are final.
      if (/scan failed to start|without a result/.test(error.message)) throw error
      lastError = error
      if (attempt < attempts) await new Promise((r) => setTimeout(r, waitMs * attempt))
    }
  }
  throw new Error(`Could not reach Is Agentic after ${attempts} tries (${lastError?.cause?.code ?? lastError?.message}). Wait a few minutes and retry; scans are rate limited.`)
}

// ---- Direct probe: what the site serves right now ----
async function get(fetchImpl, url, headers = {}) {
  try {
    const res = await fetchImpl(url, { headers: { 'User-Agent': UA, ...headers }, redirect: 'follow' })
    return { status: res.status, headers: res.headers, body: await res.text() }
  } catch (error) {
    return { status: 0, headers: new Headers(), body: '', error: String(error) }
  }
}

/** /about, /about-us, or the first homepage link labelled About (e.g. a founder page). */
async function findAbout(fetchImpl, base) {
  for (const path of ['/about', '/about-us']) {
    const r = await get(fetchImpl, `${base}${path}`)
    if (r.status === 200) return r
  }
  const home = await get(fetchImpl, `${base}/`, { Accept: 'text/html' })
  const m = home.body.match(/<a\b[^>]*href="([^"#]+)"[^>]*>\s*(?:<[^>]+>\s*)*About\b/i)
    ?? home.body.match(/<a\b[^>]*href="(\/[^"#]*about[^"#]*)"/i)
  return m ? get(fetchImpl, new URL(m[1], `${base}/`).href) : { status: 404, headers: new Headers(), body: '' }
}

const isMarkdown = (r) => /^text\/markdown/i.test(r.headers.get('content-type') ?? '')
const varyAccept = (r) => /(^|,)\s*accept\s*(,|$)/i.test((r.headers.get('vary') ?? '').split(/\s*,\s*/).join(','))

export async function probe(origin, { fetchImpl = fetch } = {}) {
  const base = origin.replace(/\/$/, '')
  const nonce = Math.random().toString(36).slice(2, 10)
  const [mdHome, htmlHome, md404, llms, about, contact, privacy, skills, openapi, api404] = await Promise.all([
    get(fetchImpl, `${base}/`, { Accept: 'text/markdown' }),
    get(fetchImpl, `${base}/`, { Accept: 'text/html' }),
    get(fetchImpl, `${base}/__agent-probe-${nonce}`, { Accept: 'text/markdown' }),
    get(fetchImpl, `${base}/llms.txt`),
    findAbout(fetchImpl, base),
    get(fetchImpl, `${base}/contact`),
    get(fetchImpl, `${base}/privacy`),
    get(fetchImpl, `${base}/.well-known/agent-skills/index.json`),
    get(fetchImpl, `${base}/openapi.json`),
    get(fetchImpl, `${base}/api/__agent-probe-${nonce}`, { Accept: 'application/json' }),
  ])
  const text = (r) => r.body.replace(/<(script|style)[\s\S]*?<\/\1>/gi, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
  const ld = [...htmlHome.body.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi)].map((m) => m[1]).join(' ')
  const checks = [
    { id: 'site-reachable', tier: 'essential', pass: htmlHome.status > 0, fix: 'network', detail: htmlHome.error },
    { id: 'markdown-negotiation-vary', tier: 'essential', pass: mdHome.status === 200 && isMarkdown(mdHome) && varyAccept(mdHome) && mdHome.body.trim().length > 0, fix: 'markdown-negotiation' },
    { id: 'html-still-served', tier: 'essential', pass: htmlHome.status === 200 && /text\/html/i.test(htmlHome.headers.get('content-type') ?? ''), fix: 'markdown-negotiation' },
    { id: 'agent-friendly-404', tier: 'essential', pass: md404.status === 404 && isMarkdown(md404) && md404.body.length >= 20 && /(llms\.txt|sitemap|docs)/i.test(md404.body), fix: 'markdown-404' },
    { id: 'agent-instruction', tier: 'recommended', pass: llms.status === 200 && /when to use/i.test(llms.body), fix: 'llms-when-to-use' },
    { id: 'trust-anchors', tier: 'recommended', pass: [about, contact, privacy].every((r) => r.status === 200 && text(r).length >= 500), fix: 'trust-pages', detail: `about ${about.status}/${text(about).length}, contact ${contact.status}/${text(contact).length}, privacy ${privacy.status}/${text(privacy).length}` },
    { id: 'org-schema-completeness', tier: 'recommended', pass: /"Organization"/.test(ld) && /"contactPoint"/.test(ld) && /"PostalAddress"/.test(ld), fix: 'organization-schema' },
    { id: 'link-headers-discovery', tier: 'bonus', pass: /rel="?(alternate|sitemap|service-desc|api-catalog)/i.test(htmlHome.headers.get('link') ?? ''), fix: 'link-headers' },
    { id: 'agent-discovery-file', tier: 'bonus', pass: skills.status === 200 && /"skills"/.test(skills.body), fix: 'agent-skills-index' },
  ]
  const hasApi = openapi.status === 200 && /"openapi"/.test(openapi.body)
  if (hasApi) {
    checks.push({ id: 'json-error-responses', tier: 'essential', pass: api404.status >= 400 && /json/i.test(api404.headers.get('content-type') ?? ''), fix: 'json-errors' })
  }
  return { origin: base, hasApi, checks }
}

function parseArgs(argv) {
  const opts = { url: null, scan: false, cached: false, json: false }
  for (const arg of argv) {
    if (arg.startsWith('--url=')) opts.url = arg.slice(6)
    else if (arg === '--scan') opts.scan = true
    else if (arg === '--cached') { opts.scan = true; opts.cached = true }
    else if (arg === '--json') opts.json = true
    else if (arg === '-h' || arg === '--help') opts.help = true
    else throw new Error(`unknown option ${arg}`)
  }
  return opts
}

async function main() {
  const opts = parseArgs(process.argv.slice(2))
  if (opts.help || !opts.url) {
    console.log('Usage: node scripts/agent-readiness.mjs --url=https://example.com [--scan|--cached] [--json]')
    return opts.help ? 0 : 2
  }
  const origin = new URL(opts.url).origin
  const report = { probe: await probe(origin) }
  if (opts.scan) report.isAgentic = scoreScan(await runScan(origin, { force: !opts.cached }))
  if (opts.json) {
    console.log(JSON.stringify(report, null, 2))
  } else {
    console.log(`Agent readiness probe: ${origin}${report.probe.hasApi ? ' (API detected)' : ''}`)
    for (const c of report.probe.checks) console.log(`  ${c.pass ? 'pass' : 'FAIL'}  ${c.tier.padEnd(11)} ${c.id}${c.pass ? '' : `  -> recipe: ${c.fix}`}${c.detail ? `  (${c.detail})` : ''}`)
    if (report.isAgentic) {
      const s = report.isAgentic
      console.log(`\nIs Agentic score: ${s.score}/100  essential ${s.essential.earned}/80 (${s.essential.passing}/${s.essential.total})  recommended ${s.recommended.earned}/20 (${s.recommended.passing}/${s.recommended.total})  bonus +${s.bonus}`)
      console.log(`Report: ${IS_AGENTIC}/scan/${new URL(origin).host}`)
      for (const g of s.gaps) console.log(`  ${g.tier.padEnd(11)} ${Math.round(g.fraction * 100).toString().padStart(3)}%  ${g.id}: ${g.details.slice(0, 160)}`)
    }
  }
  const failed = report.probe.checks.some((c) => !c.pass && c.tier !== 'bonus') || (report.isAgentic && report.isAgentic.score < 100)
  return failed ? 1 : 0
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  // exitCode, not exit(): exit() can cut off output that is still flushing to a pipe.
  main().then((code) => { process.exitCode = code }, (error) => { console.error(`Error: ${error.message}`); process.exitCode = 1 })
}
