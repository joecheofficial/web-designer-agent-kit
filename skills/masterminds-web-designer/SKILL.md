---
name: masterminds-web-designer
description: Build and refine editable websites for Mastermind and All Sorted participants using original layouts, honest content, local design tools, responsive verification, and safe installation behavior.
kg:
  id: web-designer-agent-kit:skills-masterminds-web-designer-skill
  type: document
  status: active
  audience: team
  relations: {}
---

# Masterminds Web Designer

Use this skill for new websites and existing-site updates. Deliver a working editable build, not only a design description, reference image, or capture folder.

## Workflow

1. Read `CLAUDE.md`, `USER.md`, and `SOUL.md` when present.
2. Discover this skill's installed path, then load references relative to it. Read `references/design-research.md` for a new site or substantial redesign, `references/composition-design.md` when choosing a layout, `references/structured-sites.md` for structured generation and editing, `references/search-readiness.md` when finishing, and `references/motion-recipes.md` when the brief calls for premium, editorial, lookbook or launch-style motion.
3. Discover and record one absolute kit root and a separate absolute website project root.
4. Create or load `.masterminds-context/brief.json`. Translate conversation and supplied facts into any tool schema yourself, validate it, and generate complete pages. Never ask a participant to handwrite JSON. Ask at most 3 essential questions only when missing facts block a sound build.
5. For a new site or substantial redesign, complete the bounded evidence pass in `references/design-research.md` after resolving vital facts and before selecting a direction. Save it separately as `.masterminds-context/reference-research.md`. Skip network research and directions for explicit offline, skip-research, use-only-my-materials, and tiny copy or button fixes. Reuse fresh prior research for revisions unless the facts or direction materially change.
6. Offer 3 coherent directions grounded in the participant's facts and research evidence, then recommend one. Continue under existing authorization with the recommended reversible default when no choice is made; do not add an approval gate. Keep the 36-section library behind this guided choice rather than presenting 36 decisions.
7. Use Palette Studio for color and Component Lab or Layout Atlas for composition as the primary fitting tools when they suit the project. Keep a bespoke existing or reference-led design when fidelity requires it. Save decisions in `.masterminds-context/design-decisions.json`.
8. Build or update original, editable HTML/CSS/JS. Keep the 3 quick starters for simple sites; use the structured brief workflow for content-adaptive multi-page sites.
9. Run the Speak Human process in `references/copy-cleanup.md` before visual QA. For generated structured sites, change authoritative `site.json` editable fields through the editor when supported and rerender consistently; never edit generated HTML directly. Broader changes create new validated output while preserving the originals. Before/after HTML is comparison evidence only. Show representative comparisons and confirm facts, qualifications, and evidence remain honest.
10. Run the read-only local SEO audit with `node "$KIT_ROOT/scripts/seo-check.mjs" "--file=$PROJECT_ROOT/<site>/index.html" --json`. Fix confirmed local failures and rerun it. Add `"--url=<verified-public-URL>"` only when that URL has been verified.
11. Run the whole-site launch check, then use the bounded browser acceptance loop in `references/composition-design.md` at 320/390/768/1440. Verify selected research adaptations in the real output and log implementations or deviations in `reference-research.md`. Verify image geometry and clipping, settled and reduced-motion states, real CTA hit testing plus keyboard activation, and equal-state reference geometry. Repeat after long-copy tests and revisions. Hard failures are must-fix issues, not scores; if browser access is unavailable, report the browser checks as blocked.
12. Start a working local preview and report what was observed, what remains uncertain, and that preview is not publication. Offer the structured visual editor only as an opt-in for generated `site.json` sites.

Run every kit script from the discovered absolute kit root with explicit absolute project targets. Do not use naked `scripts/...` paths from a participant project. Pass each path option as one quoted `--key=value` argument.

## Bundled contract

- **Palette Studio:** 12 distinct palettes, paired light/dark themes, sRGB checks, and 10 exported semantic tokens including `border` and `onAccent`.
- **Component Lab:** 12 distinct layouts, 4 button treatments, 16 icons, and 3 optional effects.
- **Reference Compare:** side-by-side, overlay, and difference views using a common coordinate origin and scale.
- **Layout Atlas:** responsive layout guidance.
- **Composition Design Guide:** content-led section choice, ordering, fit, and whole-page composition.
- **Design Research Guide:** bounded live-reference discovery, rendered-page inspection, synthesis, provenance, and adaptation verification.
- **Section Gallery:** one offline chooser for 36 section layouts and 3 complete example compositions, created with `--target=NEW_DIR` and previewed locally by the agent.
- **Structured Sites Guide:** exact brief, editor, launch-check, capture, asset, and Palette Studio handoff contracts.
- **Reference Layout Guide:** observed-versus-inferred mapping, editable candidate builds, equal-state captures, local comparison, discrepancy repair, and repeated desktop/mobile passes.
- **Copy Cleanup Guide:** safe visible-prose editing with before/after examples and a protected-facts check.
- **Search Readiness Guide:** built-in SEO and GEO guidance, local audit interpretation, and explicit boundaries between local evidence and live checks.

The core workflow uses local tools and original CSS. No external library, remote skill, or external GitHub fetch is required. The source catalog is research-only by default. URL capture and a cloud-hosted model may use a network.

## Built-in SEO, GEO, and interaction fallback

<!-- Source pin: the bundled scripts/seo-check.mjs contract and references/search-readiness.md govern this local workflow. -->
- Give each page a unique title and description, one meaningful H1, semantic navigation, crawlable visible text, and a logical heading hierarchy.
- Use an Open Graph image only when a real asset is provided or approved.
- Add a canonical URL only for a verified public domain. Without one, omit deployment-dependent URL metadata and leave a launch TODO.
- Keep structured data consistent with visible facts. Never invent Event dates, metrics, ratings, addresses, prices, or availability.
- Make entity identity clear, answer useful audience questions directly, and use verifiable facts. Do not promise rankings, indexing, AI-answer inclusion, or citations.
- Do not require `llms.txt` or special AI schema. Use accurate visible content and structured data that matches it.
- Treat the local SEO audit as evidence only for the file and optional verified URL actually checked. Unless separately observed, report `live_http: not_checked`, `robots: not_checked`, `indexing: not_checked`, and `ai_citations: not_checked`.
- Treat a form as connected only when it has a real endpoint and the user has confirmed send intent. Never fake a form with `action="#"`, `contenteditable`, or a navigation link styled as submission.
- Mark local demo forms as unconnected and prevent accidental submission. Keep navigation and verified contact links separate.

External SEO skills are strictly optional and may be used only to research a specific identified gap. The built-in workflow never requires installing one.

## Non-negotiable standards

- **Original and editable:** Create original HTML/CSS/JS. A screenshot may inform a build but may never become the page itself.
- **Responsive:** Design from 320px through 1440px and test more than one viewport.
- **Accessible:** Use semantic HTML, a skip link, visible focus, at least 4.5:1 body-text contrast, and 44x44px touch targets.
- **Honest:** Preserve real names, dates, prices, claims, evidence, and qualifications. Do not fabricate proof or destinations.
- **Human copy:** Write warmly and specifically in the participant's actual business voice, not Joe's voice by default. Avoid generic AI patterns. Rephrasing is allowed when meaning, facts, evidence, and qualifications remain intact. Preserve supplied pronouns, grammatical person, qualifiers, exact quotations, technical names, legal text, links, button facts and destinations, and SEO fields unless the user explicitly authorizes changes. Never infer identity facts.
- **Motion:** Use optional original CSS transitions or keyframes by default, with an explicit `prefers-reduced-motion` fallback. Do not require external libraries.
- **Verification:** Report only what was observed. Return a working local preview and remaining uncertainty. Do not describe preview as published.
