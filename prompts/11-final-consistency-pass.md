---
kg:
  id: web-designer-agent-kit:prompts-11-final-consistency-pass
  type: document
  status: active
  audience: team
  relations: {}
---
# Prompt 11: Final Consistency Pass

Paste this into your AI assistant after all sections are built and before final visual QA (Prompt 6) and copy cleaning (Prompt 8). It checks that the sections built one at a time still look like one site.

```text
Review the whole page top to bottom as a senior designer. Check that every section uses the same colors, fonts, button style, corner rounding and spacing. Check every section at phone width. List what is inconsistent or broken, then fix it. Do not change my words or the layouts I approved.
```

Notes for the web-designer agent:

- Compare against the approved brand brief from Prompt 10. Report each mismatch with the section name and what it should be, then fix only style and spacing.
- Check phone width by actually rendering it (use the launch-check script when available) and report anything you did not observe rather than assuming it is fine.
- Do not edit copy, destinations, SEO fields or approved layouts. If a copy problem shows up, list it and leave it for Prompt 8.
