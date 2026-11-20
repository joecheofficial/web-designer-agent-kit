---
kg:
  id: web-designer-agent-kit:skills-masterminds-web-designer-references-modern-web-guidance
  type: document
  status: active
  audience: team
  relations: {}
---
# Modern Web Guidance

Google Chrome's Modern Web Guidance is an up-to-date rulebook for website code, kept by the Chrome, Edge, Firefox and MDN teams. It steers AI-written code away from old habits (home-made pop-ups, scroll listeners, heavy polyfills) towards what browsers now do natively, with sensible fallbacks. The kit runs it through `scripts/modern-web.mjs` at one pinned version (`modern-web-guidance@1.0.1`). The first run downloads that exact version from npm once; later runs reuse it. Telemetry is always switched off.

It needs Node.js 22 or newer. On older Node every command prints a plain skip note and changes nothing. Then follow the kit's built-in standards and tell the participant the rulebook was skipped and why.

## Before writing or editing site code

Before you write or change HTML, CSS or JavaScript for a component or behaviour (pop-ups and dialogs, menus and drawers, tooltips, forms and validation, sliders, switches, checkboxes, scroll or entry animations, dark mode, images and loading speed, icons, typography), look up the current guidance first:

```bash
node "$KIT_ROOT/scripts/modern-web.mjs" search "<what you are building, in plain English>"
node "$KIT_ROOT/scripts/modern-web.mjs" retrieve <guide-id>
```

- Search in English and retrieve the one or two guides that match. When the output says it was saved to a file, read that whole file.
- Follow the guide's pattern, fallback and gotchas in the build. The kit's own rules still win where they are stricter: accessibility, honest content, reduced motion, original editable code and the participant's project rules.
- Guides for Origin Trial or very new single-browser features are locked by default. Do not unlock them unless the participant asks for experimental features.
- Skip lookups for tiny copy or link fixes and for features you already looked up in this session.
- If the tool cannot run (offline, old Node), say so once and continue with the built-in standards.

## Check my site

When the participant asks to check, modernise or clean up a site, and as part of finishing any site:

```bash
node "$KIT_ROOT/scripts/modern-web.mjs" check "--dir=$PROJECT_ROOT/<site>"
```

PowerShell: `node (Join-Path $KIT_ROOT 'scripts/modern-web.mjs') check "--dir=$PROJECT_ROOT\<site>"`. Add `--json` for machine-readable output; its `status` field is `checked`, `skipped` (Node older than 22) or `unavailable` (could not download or run). The check always exits 0 so it never blocks a build.

The check is read-only. It lists old patterns it found, grouped by area, each with a plain-words meaning, the technical fix, file and line, and the command for the full guide. Then:

1. Explain each area to the participant in one or two plain sentences: what it means for their visitors and what you would change. No jargon without a short explanation.
2. Treat every finding as a lead, not proof. Open the file, confirm it applies, and read the full guide before fixing.
3. Fix only with existing authorization for site changes, make a save point first when the project uses them, and keep behaviour and content the same.
4. Rerun the check, the SEO audit and the launch check, then report before and after counts.

The scan covers about a fifth of the guidance (the patterns it can detect automatically). Zero findings does not mean the code follows every rule, so keep using the lookups when writing new code.

## Source and licence

Modern Web Guidance by the Google Chrome, Microsoft Edge, Mozilla Firefox and MDN teams, https://github.com/GoogleChrome/modern-web-guidance-src. Code is Apache-2.0; guide content is CC-BY 4.0. The kit does not copy its code or guides; it calls the published npm package at the pinned version. See `THIRD-PARTY-NOTICES.md` in the kit.
