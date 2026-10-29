# Agent readiness fix recipes

Each recipe names the check IDs it fixes (as shown by `scripts/agent-readiness.mjs` and the Is Agentic report), what to build, and how to verify it on the live site. Adapt the code to the project; these patterns were proven on a Next.js 16 site on Vercel and a static HTML site on Vercel.

## markdown-negotiation (essential: `markdown-negotiation-vary`)

Requirement: `Accept: text/markdown` on the homepage returns a non-empty Markdown body with `Content-Type: text/markdown` and `Vary: Accept`. `Accept: text/html` still returns the normal page.

Negotiate on the Accept header's quality values, not on a substring:

```js
export function prefersMarkdown(accept) {
  if (!accept) return false
  let md = -1, html = -1
  for (const part of accept.split(',')) {
    const [type, ...params] = part.trim().split(';')
    const q = Number((params.find((p) => p.trim().startsWith('q=')) ?? 'q=1').trim().slice(2))
    if (/^text\/(x-)?markdown$/i.test(type.trim())) md = Math.max(md, q)
    if (/^(text\/html|application\/xhtml\+xml)$/i.test(type.trim())) html = Math.max(html, q)
  }
  return md > 0 && md >= html
}
```

- **Next.js (App Router):** in `middleware.ts`/`proxy.ts`, when `prefersMarkdown()` is true for a GET page path (not `/api/`, `/_next/`, or a file with an extension), rewrite to a route handler such as `/api/markdown`. Pass the original path in a request header (`x-markdown-path`), because route handlers see the pre-rewrite URL. The handler returns curated Markdown for `/`, and for other paths fetches its own HTML with `Accept: text/html` and converts it. A 404 or 410 becomes the Markdown 404 below.
- **Static HTML on Vercel:** add root `middleware.js` (Vercel Routing Middleware works without a framework). Pre-generate a Markdown twin of every page at build time, bundle them into a module the middleware imports, and return `new Response(md, { headers })`. Return nothing to let other requests through. Do not have middleware `fetch()` your own `/md/*.md` files: preview deployments are behind Vercel authentication and the subrequest gets a login page.
- **Cloudflare Workers/Pages:** the same check in the Worker `fetch` handler before serving assets.
- Also serve `/index.md` and `/<page>.md` (the `.md` URL fallback) from the same twins. Start every Markdown body with YAML frontmatter (`title`, `description`, `canonical`, `last_updated`). Add `<link rel="alternate" type="text/markdown" href="/index.md">` to the HTML head.

Verify:

```bash
curl -sS -L -i -H 'Accept: text/markdown' https://example.com/ | sed -n '1,20p'
curl -sS -L -i -H 'Accept: text/html' https://example.com/ | sed -n '1,12p'
```

Note that Next.js overwrites `Vary` on prerendered HTML responses; that is acceptable because the check reads the Markdown response.

## markdown-404 (essential: `agent-friendly-404`)

Keep the real HTTP 404. When the client prefers Markdown, the body is Markdown (20+ characters) that explains the error and links the homepage, `llms.txt`, `sitemap.xml`, docs and contact.

```bash
curl -sS -L -i -H 'Accept: text/markdown' https://example.com/some-path-that-does-not-exist
```

Check the status line (404), `Content-Type: text/markdown` and the body.

## llms-when-to-use (recommended: `agent-instruction`)

Add a `## When to use <Name>` section near the top of `/llms.txt`. Name the specific jobs the business is right for, who it is not for, and numbered steps telling an agent how to act: which page or endpoint to read, what price to quote (only published ones), and where to send the person to buy or book. Never tell agents to collect card details. Generic marketing copy does not count.

## trust-pages (recommended: `trust-anchors`)

Real `/about`, `/contact` and `/privacy` pages with at least 500 characters of genuine content each, linked from the footer and listed in the sitemap. Reuse the site's own page shell. Write privacy from what the site actually does: inspect the code for analytics, pixels, forms, cookies, local storage and payment providers. If the About page lives elsewhere (for example a founder page), add `/about` as a redirect to it.

## organization-schema (recommended: `org-schema-completeness`)

Add to the existing Organization JSON-LD node, using facts the business already publishes:

```json
"address": { "@type": "PostalAddress", "streetAddress": "...", "addressLocality": "...", "addressRegion": "...", "postalCode": "...", "addressCountry": "US" },
"contactPoint": [{ "@type": "ContactPoint", "contactType": "customer support", "email": "...", "url": "https://example.com/contact", "availableLanguage": ["en"] }]
```

## link-headers (bonus: `link-headers-discovery`)

Send an RFC 8288 `Link` header on pages: `</index.md>; rel="alternate"; type="text/markdown"`, `</sitemap.xml>; rel="sitemap"`, `</llms.txt>; rel="describedby"`, plus `service-desc` (OpenAPI) and `api-catalog` when there is an API. In Next.js set it in middleware; on static Vercel use `headers` in `vercel.json`.

## agent-skills-index (bonus: `agent-discovery-file`)

Publish `/.well-known/agent-skills/index.json` (schema `https://schemas.agentskills.io/discovery/0.2.0/schema.json`) listing one `SKILL.md` with `name`, `type: "skill-md"`, `description`, `url` and `digest: "sha256:<hex of the exact served file>"`. Generate the digest from the same bytes you serve, and test that they match.

## pricing-md (bonus: `pricing-md`)

`/pricing.md`: a Markdown table of every public offer and its price, generated from the same source as the checkout, never typed by hand.

## API recipes (only when the site has, or should have, a public API)

Add a public API only for public data the business already shows. A read-only API built from a governed catalog is enough.

- **`openapi-spec`, `api-schema-analysis`, `function-calling-compat`:** OpenAPI 3.1 at `/openapi.json` (also `/api/openapi.json`), served as `application/vnd.oai.openapi+json`. Every operation has a unique `operationId`, `summary`, `description`, typed `parameters` and `$ref` response schemas. Operations without any parameters count against function-calling compatibility, so keep index and health routes out of the spec.
- **`json-error-responses`:** an `/api/[...path]` catch-all and every error path return RFC 9457 `application/problem+json` with `type`, `title`, `status`, `detail`, `instance`, a stable `code` and a `resolution` hint. Writes to a read-only API return 405 with `Allow`.
- **`public-api`, `public-api-docs`, `developer-portal`:** reachable `/api/v1/...` endpoints, a `/developers` page (quickstart with curl, authentication, endpoints, errors, rate limits, versioning, a live "try it" sandbox), and `/docs` generated from the same OpenAPI object. Link Developers and API docs in the footer. Allow `/api/v1/` in robots.txt if `/api` is disallowed.
- **`api-catalog-rfc9727`:** `/.well-known/api-catalog` as `application/linkset+json; profile="https://www.rfc-editor.org/info/rfc9727"`. The first linkset entry anchors at the catalog URL with `item` links to each API; the next anchors at the API with `service-desc`, `service-doc` and `status`.
- **`pagination-shape`:** `limit` and opaque `cursor` query parameters, and `next_cursor` (null on the last page) plus `total` in list responses and schemas. Reject malformed cursors with 400.
- **`rate-limit-headers`:** `RateLimit-Policy: "public";q=60;w=60` and `RateLimit: "public";r=<remaining>;t=<reset>` on every response, 429 with `Retry-After` when exceeded, all documented in the spec.
- **`api-versioning-policy`:** version in the path, a documented deprecation timeline, and a `Link: <.../developers#versioning>; rel="deprecation"` header.
- **`cli-tool`, `npm-sdk-package`:** an official CLI wrapping the API, published to npm (`package.json` `homepage` = the product domain, `repository` = its public repo) and linked from `llms.txt` and `/developers`. A GitHub repo with a Homebrew tap only gets partial credit; a registry listing is what counts. Publishing needs the owner's registry login.

## search (recommended: `agentic-search-specific`)

Depends on search engines having indexed the new developer and trust pages. Use predictable URLs, put the product name in titles and H1s, link them from `llms.txt` and the sitemap, and submit them through IndexNow (`POST https://api.indexnow.org/indexnow` with the site's key file) or Search Console. Rescan after indexing; this one cannot be forced the same day.
