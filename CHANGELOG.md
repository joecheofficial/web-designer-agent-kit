---
kg:
  id: web-designer-agent-kit:changelog
  type: document
  status: active
  audience: team
  relations: {}
---
# Changelog

## 5.6.0 (2026-11-21)

- Your Web Designer now follows Google Chrome's Modern Web Guidance, the up-to-date rulebook for website code kept by the Chrome, Edge, Firefox and MDN teams. Before it writes a pop-up, menu, form, animation or similar, it looks up today's recommended way to build it, so your site uses what browsers do natively instead of old workarounds.
- New "check my site" step: `node "$KIT_ROOT/scripts/modern-web.mjs" check "--dir=<your site>"` scans any site for outdated code and explains each finding in plain words, with the file and line. It never changes files; the designer fixes only what you approve. Prompt 12 (Check My Site) is ready to paste.
- Needs Node.js 22 or newer and downloads the pinned rulebook (`modern-web-guidance@1.0.1`) from npm once. On older Node it skips with a plain note, and offline it says it could not run; either way nothing else changes. Its usage telemetry is always switched off. Licence details are in `THIRD-PARTY-NOTICES.md`.

## 5.5.2 (2026-10-29)

- `scripts/agent-readiness.mjs` sets `process.exitCode` instead of calling `process.exit()`, so piped output (score and gap list) is no longer cut off.

## 5.5.1 (2026-10-29)

- `scripts/agent-readiness.mjs` retries Is Agentic scans on network resets, connect timeouts and 429/5xx (honouring Retry-After) and explains the rate limit when it gives up.

## 5.5.0 (2026-10-29)

- New bundled `agent-readiness` skill: a post-launch "agentic check and rebuild" loop that makes a live site readable and usable by AI agents and scores it on Is Agentic (is-agentic.com). It covers Markdown content negotiation, Markdown 404s, `llms.txt` when-to-use guidance, trust pages, Organization schema, Link headers and an agent-skills index, plus OpenAPI, JSON errors, pagination and rate-limit headers for sites with an API. Recipes for Next.js, static HTML on Vercel and Cloudflare are in `skills/agent-readiness/references/fix-recipes.md`.
- New `scripts/agent-readiness.mjs`: probes a public URL directly and, with `--scan`, runs a fresh Is Agentic scan scored with the report's own formula, listing every gap in priority order.
- The web designer offers agent readiness only after launch (agent step 14, skill step 13), never during the first build. Proven on mastermindshq.business (65 to 100) and getallsorted.ai (77 to 100).

## 5.4.1 (2026-10-27)

- Mobile video rule: hero and background video ships a separate small phone encode (about 480px, under 1.5 MB) chosen by viewport, so phones never download the desktop file; poster is the first paint, Save-Data and reduced motion load no video. Added to the agent and the motion-recipes performance notes. From the Joechella Friday page, where a 10.5 MB hero video held mobile LCP at about 6.5 s.

## 5.4.0 (2026-10-14)

- New `references/motion-recipes.md`: 11 editorial motion recipes plus a shared ease and duration vocabulary, distilled from a teardown of the Quechua SS25 lookbook. Each recipe has measured timings, mobile values and a reduced-motion path. The skill and agent load it when a brief asks for premium, lookbook or launch-style motion.

## 5.3.1 (2026-10-14)

- The kit installs only the Web Designer again. The safety skills (secure-key-entry, save-points, undo, safe-delete) are their own package and are no longer installed, health-checked or referenced by this kit. This reverts the 5.3.0 additions.

## 5.3.0 (2026-10-14)

- Safety skills: `scripts/install-safety-skills.mjs` installs the latest four safety skills, `secure-key-entry`, `save-points`, `undo`, and `safe-delete` (clone or pull `~/.secure-key-entry`, then its own installer). The health check confirms all four, and `update-kit.mjs` refreshes them.
- Agent: never asks for API keys in chat (uses `secure-key-entry`), makes a save point before and after each real change (`save-points`), and deletes only through `safe-delete`.

## 5.2.0 (2026-10-14)

- PageSpeed check: the Web Designer agent now measures every changed public page before calling the work done. It uses the `pagespeed` skill when installed and falls back to Google PageSpeed Insights or Lighthouse. Local-only previews are reported as not checked.
- Always latest: new `scripts/update-kit.mjs` (`npm run update`) checks for and applies the latest release. The agent runs the check at the start of each session. The installer records the kit location as `kitRoot`.
- New prompts: Prompt 10 (Brand Brief First) and Prompt 11 (Final Consistency Pass).
- Agent: follows a project's own design rules when present and lists optional specialist skills (visual polish, motion, SEO, page speed) without requiring them.

## 5.1.1

- Release authority and packaging correction.
