---
kg:
  id: web-designer-agent-kit:changelog
  type: document
  status: active
  audience: team
  relations: {}
---
# Changelog

## 5.2.0 (2026-10-14)

- PageSpeed check: the Web Designer agent now measures every changed public page before calling the work done. It uses the `pagespeed` skill when installed and falls back to Google PageSpeed Insights or Lighthouse. Local-only previews are reported as not checked.
- Always latest: new `scripts/update-kit.mjs` (`npm run update`) checks for and applies the latest release. The agent runs the check at the start of each session. The installer records the kit location as `kitRoot`.
- New prompts: Prompt 10 (Brand Brief First) and Prompt 11 (Final Consistency Pass).
- Agent: follows a project's own design rules when present and lists optional specialist skills (visual polish, motion, SEO, page speed) without requiring them.

## 5.1.1

- Release authority and packaging correction.
