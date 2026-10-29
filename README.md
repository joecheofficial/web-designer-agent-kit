---
kg:
  id: web-designer-agent-kit:readme
  type: document
  status: active
  audience: team
  relations: {}
---
# Web Designer Agent Kit

Install Joe Che's starter context files, Web Designer agent, and original local design toolkit for Mastermind and All Sorted participants.

Version 5.2 adds a PageSpeed check on every changed public page, a self-updating kit (`scripts/update-kit.mjs`), and two new prompts: Brand Brief First (Prompt 10) and Final Consistency Pass (Prompt 11). The current version is always the one in `package.json`; installs track the latest release, so no install step pins a version.

Version 5.1 added a bounded research-first workflow for new sites and substantial redesigns. It inspects a small set of relevant live references before direction selection, records provenance and observed-versus-inferred findings outside the public site, and verifies selected adaptations in the finished output. Explicit offline, skip-research, use-only-my-materials, and tiny-fix requests remain direct paths.

## Quick start: one pasteable AI request

Install Node.js 24 or newer, then download this kit once by cloning it (recommended, so it can update itself) or by downloading the latest release archive from https://github.com/joecheofficial/web-designer-agent-kit/releases/latest and extracting it into a local kit directory. Confirm that the extracted directory contains `scripts/`, `skills/`, and `agents/`. Internet access is required for the initial download and live-reference research. After download, the bundled scripts and UI tools work locally. An explicit offline request skips live-reference research, although a cloud-hosted AI model may still use a network.

Open a terminal in the website project you want to build. Keep that project separate from the kit checkout. Then paste this request into your AI assistant:

```text
Use the Web Designer Agent Kit from my local .masterminds-web-designer-agent-kit folder to build a working website in this current website project. First verify Node.js 24 or newer, discover and record the absolute kit root and website project root, install the context files and core agent without overwriting existing files, and read the applicable skill references. Turn my conversation and supplied facts into any required schema yourself. Validate it and generate complete editable pages. Never ask me to handwrite JSON. Offer 3 coherent directions and recommend one, clean the visible copy in my actual business voice, verify the whole site plus desktop and mobile in a local preview, and report anything not observed. Do not publish.

Business Name: Apex Advisory
Style Archetype: Service (or Portfolio, or Event)
Headline: Make the next decision clearer
Primary CTA: Email contact@example.com
```

Available starter styles are `service`, `portfolio`, and `event`.

## Download and local setup

If the intended kit folder already exists, reuse it. Do not clone over an existing file or unrelated directory. If you downloaded an archive, extract it and assign the kit-root variable to that directory instead of running `git clone`.

### macOS or Linux Bash

Run these commands from the participant's website project:

```bash
node --version
PROJECT_ROOT="$PWD"
KIT_ROOT="$PROJECT_ROOT/.masterminds-web-designer-agent-kit"

if [ -d "$KIT_ROOT/.git" ]; then
  echo "Using existing kit checkout: $KIT_ROOT"
elif [ -e "$KIT_ROOT" ]; then
  echo "KIT_ROOT exists but is not the expected git checkout. Set KIT_ROOT to the extracted kit or choose another directory."
  exit 1
else
  git clone https://github.com/joecheofficial/web-designer-agent-kit.git "$KIT_ROOT"
fi

node "$KIT_ROOT/scripts/install-context.mjs" "--target=$PROJECT_ROOT"
node "$KIT_ROOT/scripts/install-web-designer-kit.mjs"
node "$KIT_ROOT/scripts/health-check.mjs" "--project=$PROJECT_ROOT"
node "$KIT_ROOT/scripts/create-site.mjs" "--target=$PROJECT_ROOT/my-service-site" "--style=service" "--name=Apex Advisory" "--headline=Make the next decision clearer" "--email=contact@example.com"
node "$KIT_ROOT/scripts/preview.mjs" "--dir=$PROJECT_ROOT/my-service-site" "--port=3000"
```

### Windows PowerShell

Run these commands from the participant's website project:

```powershell
node --version
$PROJECT_ROOT = (Get-Location).Path
$KIT_ROOT = Join-Path $PROJECT_ROOT '.masterminds-web-designer-agent-kit'

if (Test-Path (Join-Path $KIT_ROOT '.git')) {
  Write-Host "Using existing kit checkout: $KIT_ROOT"
} elseif (Test-Path $KIT_ROOT) {
  throw 'KIT_ROOT exists but is not the expected git checkout. Set KIT_ROOT to the extracted kit or choose another directory.'
} else {
  git clone https://github.com/joecheofficial/web-designer-agent-kit.git $KIT_ROOT
}

node (Join-Path $KIT_ROOT 'scripts/install-context.mjs') "--target=$PROJECT_ROOT"
node (Join-Path $KIT_ROOT 'scripts/install-web-designer-kit.mjs')
node (Join-Path $KIT_ROOT 'scripts/health-check.mjs') "--project=$PROJECT_ROOT"
node (Join-Path $KIT_ROOT 'scripts/create-site.mjs') "--target=$PROJECT_ROOT\my-service-site" "--style=service" "--name=Apex Advisory" "--headline=Make the next decision clearer" "--email=contact@example.com"
node (Join-Path $KIT_ROOT 'scripts/preview.mjs') "--dir=$PROJECT_ROOT\my-service-site" "--port=3000"
```

Every path flag is passed as one quoted `--key=value` argument so paths containing spaces remain intact. These commands do not assume the website project contains `scripts/`.

## Staying on the latest release

The documented install clones the default branch, which always holds the latest release, so there is no version to pin or bump. To pick up a newer release later, run one command from anywhere:

```bash
node "$KIT_ROOT/scripts/update-kit.mjs" --check   # report only
node "$KIT_ROOT/scripts/update-kit.mjs"           # fast-forward the kit and refresh the installed agent and skills
```

PowerShell: `node (Join-Path $KIT_ROOT 'scripts/update-kit.mjs')`. The Web Designer agent runs the `--check` form at the start of each session and offers the update when a newer release exists. The update only fast-forwards a clean checkout on its default branch and reruns the installer with `--upgrade`, so customized files are kept and receive reviewable `.candidate` versions. An archive download cannot update itself; download the latest release again or switch to a clone. The installer records the kit location in `~/.claude/masterminds-web-designer-kit.json` as `kitRoot`.

## Bundled core tools and skills

Once downloaded, the local tools and generation, installation, preview, and copy-review scripts need no additional network access. Live-reference research and URL capture require internet access unless an explicit offline request skips live research. Playwright is optional and installed separately only when that capture route is chosen.

- **Masterminds Web Designer:** `skills/masterminds-web-designer`
- **Frontend Design:** `skills/frontend-design`
- **Palette Studio:** `skills/masterminds-web-designer/tools/palette-studio.html`, with 12 distinct palettes, paired light/dark themes, and a 10-token export contract including `border` and `onAccent`
- **Component Lab:** `skills/masterminds-web-designer/tools/component-lab.html`, with 12 distinct layouts, 4 button treatments, 16 geometric line icons, and 3 optional effects
- **Reference Compare:** `skills/masterminds-web-designer/tools/reference-compare.html`, with side-by-side, overlay, and difference views aligned to a common coordinate origin and scale
- **Layout Atlas:** `skills/masterminds-web-designer/references/layout-atlas.md`
- **Composition Design:** `skills/masterminds-web-designer/references/composition-design.md`, for content-led layout and section ordering
- **Design Research:** `skills/masterminds-web-designer/references/design-research.md`, for bounded live-reference discovery, evidence, synthesis, and adaptation verification
- **Section Gallery:** `scripts/section-gallery.mjs`, which creates an offline chooser with 36 section layouts and 3 complete example compositions
- **Structured Sites:** `skills/masterminds-web-designer/references/structured-sites.md`, with the generated-site, editor, whole-site audit, copy-review, capture, asset, and palette handoff contracts
- **Search Readiness:** `skills/masterminds-web-designer/references/search-readiness.md`, with built-in SEO and GEO guidance plus honest local-versus-live reporting
- **Agent Readiness:** `skills/agent-readiness`, a post-launch agentic check-and-rebuild loop scored on Is Agentic with `scripts/agent-readiness.mjs --url=<public URL> --scan`

The GitHub design research catalog at `docs/github-design-research.md` is research-only in the default workflow. It does not fetch, install, clone, or vendor external repositories.

The built-in tools require no external repository installation. When a participant benefits from visual selection, the agent creates the gallery in a new directory, starts a local preview, and guides the participant through 3 coherent directions instead of presenting all 36 sections as decisions:

```bash
node "$KIT_ROOT/scripts/section-gallery.mjs" "--target=$PROJECT_ROOT/my-section-gallery"
node "$KIT_ROOT/scripts/preview.mjs" "--dir=$PROJECT_ROOT/my-section-gallery" "--port=3000"
```

For a content-adaptive multi-page site, the agent converts supplied facts into a validated brief file and runs:

```bash
node "$KIT_ROOT/scripts/create-site.mjs" "--brief=$PROJECT_ROOT/.masterminds-context/site-brief.json" "--target=$PROJECT_ROOT/my-three-page-site"
```

Structured `--brief=FILE` mode is mutually exclusive with the `--style`, `--name`, `--headline`, and `--email` quick-starter flags. A 3-page brief can generate `index.html`, `about/index.html`, and `contact/index.html` with shared navigation and styling. The original `service`, `portfolio`, and `event` starter commands remain available.

## Safe installation behavior

The context installer creates `CLAUDE.md`, `USER.md`, and `SOUL.md`. Existing files are left untouched and proposed versions are written below `.masterminds-context/`.

The core installer preserves existing files by default. Use `--upgrade` only to update previously managed files: unchanged managed files are updated, while customized files receive reviewable `.candidate` versions. Do not use replacement options unless the participant explicitly requests them.

The platform commands above establish `KIT_ROOT` once as the absolute kit checkout and `PROJECT_ROOT` once as the absolute website project. Every later script call must use the script below `KIT_ROOT` and an explicit absolute project path.

## Reference build workflow

Example Bash commands follow. PowerShell users should call each script with `node (Join-Path $KIT_ROOT 'scripts/<name>.mjs')` and use the same quoted `--key=value` arguments.

```bash
node "$KIT_ROOT/scripts/reference-project.mjs" "--target=$PROJECT_ROOT/my-reference" "--url=https://example.com" "--mode=match"
node "$KIT_ROOT/scripts/capture-reference.mjs" "https://example.com" "--target=$PROJECT_ROOT/my-reference/captures-01"
```

For a declared interactive capture state, the agent may add a raw JSON string with `--spec=JSON`. It constructs up to 6 cases, each with required `name`, `width`, `height`, `dpr`, `colorScheme`, and `reducedMotion`, plus exactly one of `fullPage` or `clip`. Supported actions are timed waits and selector-based hover, focus, open-details, or scroll. Capture metadata preserves actions, DPR, state, crop, and hashes for reliable comparison.

Before review or preview, have the AI create `$PROJECT_ROOT/my-reference/candidate/index.html` with editable CSS and JavaScript. Keep the candidate separate from the captured reference evidence. Then run:

```bash
node "$KIT_ROOT/scripts/copy-check.mjs" "--file=$PROJECT_ROOT/my-reference/candidate/index.html"
node "$KIT_ROOT/scripts/seo-check.mjs" "--file=$PROJECT_ROOT/my-reference/candidate/index.html" --json
node "$KIT_ROOT/scripts/preview.mjs" "--dir=$PROJECT_ROOT/my-reference/candidate" "--port=3000"
```

The SEO audit is read-only and runs from the established `KIT_ROOT` against an explicit file below `PROJECT_ROOT`; it does not assume the website project contains `scripts/`. In PowerShell, run the equivalent command:

```powershell
node (Join-Path $KIT_ROOT 'scripts/seo-check.mjs') "--file=$PROJECT_ROOT\my-reference\candidate\index.html" --json
```

Add `"--url=<verified-public-URL>"` only when that public URL has been verified. For a local-only audit, report `live_http: not_checked`, `robots: not_checked`, `indexing: not_checked`, and `ai_citations: not_checked`.

URL fetch text is not visual evidence. Follow `skills/masterminds-web-designer/references/reference-layout.md`: create an observed-versus-inferred reference map, build actual editable HTML/CSS in a separate candidate directory, capture the candidate at the same known viewport, DPR, and screenshot state as the reference, compare it locally, list discrepancies, fix the build, and repeat desktop and mobile passes until no blocking mismatches remain. A user-provided image's pixel dimensions are not automatically a CSS viewport. Record unknowns and test responsive behavior instead of claiming false pixel accuracy.

## Build, review, repair, and verify

1. Read the participant context and confirm facts, offer, audience, and intended CTA.
2. Build editable, functioning, original HTML/CSS/JS. An image may be evidence or an asset, never the page implementation.
3. Run Speak Human cleanup before visual QA. Use the participant's actual voice, not Joe's voice by default, and avoid generic AI phrasing. Show before/after examples and verify that names, dates, prices, claims, qualifiers, quotations, legal meaning, citations, links, button facts, and SEO meaning remain intact. `copy-review.mjs --before=FILE --after=FILE --json` supplements this review; removed tokens alone do not prove semantic preservation.
4. Verify semantic navigation, one H1, crawlable text, unique title and description, responsive layouts, 4.5:1 body-text contrast, 44x44px touch targets, skip navigation, focus states, and reduced-motion behavior.
5. Treat a form as connected only after verifying a real endpoint and receiving user-confirmed send intent. Otherwise label it clearly as an unconnected local demo. Links navigate; they do not pretend to submit.
6. For generated structured sites, offer the editor only as an opt-in. Run `edit-site.mjs --dir=SITE --port=INTEGER`, open only its exact printed private one-session URL, and verify text/image edits, save, undo, and reload. The editor owns validated `site.json` fields, never arbitrary HTML; external manual source changes are conflicts to preserve for review.
7. Before audit, copy only participant-approved local images into the generated output. Remote images remain links and are not fetched automatically.
8. Run `launch-check.mjs --dir=SITE --json` across the whole site. Fix hard failures, then manually inspect keyboard use, responsive behavior, form state, and performance. The check does not provide a ranking or guarantee SEO results.
9. Once a changed page is on a public URL, run a PageSpeed check on every changed public page: the `pagespeed` skill when installed, otherwise Google PageSpeed Insights or Lighthouse. Report mobile and desktop scores and the top three fixes, fix failed accessibility and SEO audits, and re-run to show before and after. A single lab run is never proof of a regression or a win.
10. Report local preview separately from publication or deployment. Never claim a browser check that was not observed.
11. Record final assembled machine-readable acceptance evidence in `docs/verification.json`. Until that file exists and is current, do not infer every check passes.

See `docs/acceptance.md` for the concise acceptance rubric and `docs/three-upgrade-loops.md` for the feature-intention record.

## Release authority

The public GitHub repository https://github.com/joecheofficial/web-designer-agent-kit is the single source for this kit. Every change lands here first and ships as a tagged GitHub release; participants clone it or download the latest release. Downstream copies, such as the MyOS toolkit at `agents/web-designer/toolkit` and the All Sorted web-designer module, are refreshed from a tagged release and are never edited directly. `sync-toolkit.mjs` is a legacy import tool, not a release path.
