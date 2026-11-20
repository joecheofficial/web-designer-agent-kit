---
kg:
  id: web-designer-agent-kit:prompts-12-check-my-site
  type: document
  status: active
  audience: team
  relations: {}
---
# Prompt 12: Check My Site (Modern Web Guidance)

Paste this into your AI assistant in your website project to check an existing site against Google Chrome's Modern Web Guidance, the up-to-date rulebook for website code kept by the Chrome, Edge, Firefox and MDN teams. Needs Node.js 22 or newer; on older Node the check skips and nothing changes.

```text
Use the Web Designer agent to check my site with Modern Web Guidance. First run the kit update check. Then run the read-only check with node "$KIT_ROOT/scripts/modern-web.mjs" check "--dir=<my site folder>" and explain every area it finds in plain words: what it means for my visitors and what you would change. Treat each finding as a lead and confirm it in the file before suggesting a fix. Do not change anything until I say go. When I do, make a save point, fix only what I approved using the full guide for each area, keep my content and design the same, rerun the check, SEO audit and launch check, and show me before and after counts. Do not publish.
```
