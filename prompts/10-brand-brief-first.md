---
kg:
  id: web-designer-agent-kit:prompts-10-brand-brief-first
  type: document
  status: active
  audience: team
  relations: {}
---
# Prompt 10: Brand Brief First

Paste this into your AI assistant once at the start of a project, before asking for any section. It saves a short brand brief that every later section request must follow, so the page reads as one site. It pairs with Prompt 7 (recreate a reference layout) and Prompt 11 (final consistency pass).

```text
Before we build anything, save this as my brand brief and use it for every section I ask for.

Business name: [name]
What we sell, in one sentence: [sentence]
Who it is for: [audience]
Brand colors: [hex codes, or "pick a palette that fits and show me first"]
Fonts: [names, or "pick a pairing and show me first"]
Vibe, in three words: [word, word, word]
Main button text: [text]

Rules for this whole project:
1. When I attach a screenshot, copy the layout pattern, the spacing and the structure. Never copy their logo, their words or their images.
2. Every section has to look right on a phone.
3. Every section uses the same colors, fonts and button style so the page feels like one site.

Write the brief to a file in the project, show it to me, and wait for my yes. If I asked you to pick the palette or fonts, show your choice first and do not build until I approve it. Do not invent facts about the business. Leave a field blank if I did not give it.
```

Notes for the web-designer agent:

- Save the approved brief to `.masterminds-context/design-decisions.json` or a sibling `brand-brief.md`, and read it before each section.
- If a palette is requested, use Palette Studio (Prompt 9) so contrast is checked.
- Screenshots from inspiration galleries are layout references only. Follow `skills/masterminds-web-designer/references/reference-layout.md` and copy structure, never branding, words or images.
- No em dashes in any copy written for the site.
