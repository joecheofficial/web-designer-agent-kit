---
kg:
  id: web-designer-agent-kit:prompts-03-install-web-designer-agent
  type: document
  status: active
  audience: team
  relations: {}
---
# Prompt 3: Install the Web Designer Agent Kit

Paste this into your AI assistant from the participant's website project folder.

```text
Install the Web Designer agent and the two bundled local web-design skills from my existing Web Designer Agent Kit checkout.

Requirements:
- Confirm Node.js 24 or newer.
- Discover and record the absolute KIT_ROOT and separate absolute PROJECT_ROOT once.
- Reuse the intended existing kit checkout. Do not clone or fetch other external GitHub sources, and do not use --extras. The one exception is the four safety skills (secure-key-entry, save-points, undo, safe-delete), which install-safety-skills.mjs downloads from their official repository.
- Preserve existing files by default. Use --upgrade only for previously managed files; keep customized files and write reviewable .candidate versions.
- Do not replace CLAUDE.md, USER.md, or SOUL.md.
- Pass every path flag as one quoted --key=value argument.

macOS or Linux Bash:
PROJECT_ROOT="$PWD"
# Preserve the previously discovered absolute KIT_ROOT. If this shell does not
# have it, assign that exact checkout or extracted-archive path before continuing.
: "${KIT_ROOT:?Set KIT_ROOT to the previously discovered absolute kit path}"
node "$KIT_ROOT/scripts/install-web-designer-kit.mjs"
node "$KIT_ROOT/scripts/install-safety-skills.mjs"
node "$KIT_ROOT/scripts/health-check.mjs" "--project=$PROJECT_ROOT"

Windows PowerShell:
$PROJECT_ROOT = (Get-Location).Path
# Preserve the previously discovered absolute KIT_ROOT, including a custom or
# extracted-archive location. If it is unset, assign that exact path first.
if (-not $KIT_ROOT) { throw 'Set KIT_ROOT to the previously discovered absolute kit path.' }
node (Join-Path $KIT_ROOT 'scripts/install-web-designer-kit.mjs')
node (Join-Path $KIT_ROOT 'scripts/install-safety-skills.mjs')
node (Join-Path $KIT_ROOT 'scripts/health-check.mjs') "--project=$PROJECT_ROOT"

To pick up a newer kit release later, run node "$KIT_ROOT/scripts/update-kit.mjs" (or the PowerShell equivalent). It fast-forwards the kit checkout to the latest release and refreshes the installed agent and skills with --upgrade.

Report installed and skipped files, whether the agent is ready, whether the three context files are present, and the next prompt.
```
