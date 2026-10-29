---
name: agent-readiness
description: Make a published website readable and usable by AI agents, then prove it with an Is Agentic score (is-agentic.com). Use AFTER a site is built, launched on a public URL, and has passed its SEO and launch checks; never during the first build. Triggers - "agent ready", "is agentic", "agentic check", "score for agents", "make my site work with ChatGPT/Claude agents", "llms.txt", "markdown for agents", or the web designer's post-launch step.
---

# Agent readiness: agentic check and rebuild

A site can look perfect to people and still be unreadable to AI agents: they ask for Markdown and get a JavaScript bundle, hit a missing page and get an HTML error, or cannot tell what the business sells, who runs it, or when to recommend it. This skill closes those gaps on a site that is already live, then measures the result.

## When to run it

- Only after the site is built, the SEO audit and launch check pass, and it is deployed to a public URL you have verified. A local preview cannot be scored.
- Not on the first build. Do not bring it up while the participant is still choosing a direction or writing copy.
- Offer it once when finishing a launched site ("Want me to make it agent ready and score it?"), and run it whenever someone asks for an agent or Is Agentic check.

## The loop

1. **Baseline.** Run `node "$KIT_ROOT/scripts/agent-readiness.mjs" "--url=<public URL>" --scan`. It probes the live site directly, then asks Is Agentic for a fresh scan and scores it with the same formula as the public report at `https://is-agentic.com/scan/<host>`. Save the output.
2. **Read the gaps in order:** essential first (80 points), then recommended (20 points). Bonus items add up to 5 points and are never required.
3. **Fix** each gap with the matching recipe in `references/fix-recipes.md`. Match the site's stack (Next.js, static HTML on Vercel, Cloudflare). Inspect the codebase first and reuse its components and styles. Preserve every existing page, its visual design and its behaviour.
4. **Test** every behaviour you change. Add or update tests in the project's own test runner, and run them.
5. **Deploy** through the project's normal path, then verify every public endpoint with `curl`. Read both the headers and the body (commands are in the recipes).
6. **Rescan** with the same command. Repeat steps 2 to 6 until the score is 100, or until every remaining gap needs something only the owner can give (a login, a credential, a business decision).
7. **Report**: before and after score, the report link, what changed, what was verified, and each remaining item with the exact thing the owner must do.

## Ground rules

- **Never invent facts.** An address, phone number, price or contact in structured data must already be published by the business (terms page, footer, invoices). If it is not, ask.
- **Public data only.** A public API or Markdown view must never expose member records, private prices, payment IDs, internal paths or keys. Build an explicit allowlist instead of filtering a private table.
- **Do not fake capability.** Do not claim a sandbox, a rate limit, an SDK or a CLI that does not exist. A read-only API is fine; say it is read-only.
- **Keep HTML for browsers.** Markdown is served only when the client prefers `text/markdown`. Normal visitors must see the identical page.
- **Use the owner's identity for anything published outside the site** (npm, GitHub, Homebrew). Never enter passwords or tokens yourself; if a registry login has expired, give the owner the exact command (for example `npm login`) and continue with everything else.
- Scans are rate limited. Run one site at a time and do not loop scans faster than every few minutes.

## What 100 usually takes

For a content or business site: Markdown content negotiation on the homepage, a Markdown 404, a "When to use" section in `llms.txt`, real About, Contact and Privacy pages (500+ characters each), and Organization JSON-LD with `address` and `contactPoint`.

A site with an API, an MCP server or a developer audience also needs: an OpenAPI 3.1 spec at `/openapi.json`, JSON problem-details errors, a reachable public API, a `/developers` portal, typed operations with pagination and rate-limit headers, and ideally an official CLI on npm, PyPI or Homebrew.

The Is Agentic score caps at 100, so bonus points can cover one or two partial recommended items. Name-search checks depend on search engines indexing new pages; submit new URLs through IndexNow or Search Console and rescan later.
