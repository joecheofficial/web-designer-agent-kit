---
kg:
  id: web-designer-agent-kit:prompts-06-finish-website
  type: document
  status: active
  audience: team
  relations: {}
---
# Prompt 6: Finish and Prepare for Launch

Paste this into your AI assistant when the website design is ready for a final local review.

```text
Use the Web Designer agent to finish my website and prepare a launch checklist. Do not publish.

Run Speak Human copy cleanup first in my actual business voice. For a generated structured site, keep site.json authoritative: use the editor for supported editable-field prose changes and rerender consistently, never edit generated HTML directly. Broader changes must create new validated output while preserving the originals. Use before/after HTML only as comparison evidence. Show before/after examples and make a protected-facts comparison that includes button wording and destinations. Supplement it with copy-review.mjs --before=FILE --after=FILE --json. Treat removed tokens as review leads, never proof of semantic or factual preservation. Then inspect a working local preview at desktop and mobile sizes.

Verify unique titles and descriptions, one meaningful H1 per page, semantic navigation, crawlable text, accurate headings, approved Open Graph assets, alt text, 4.5:1 body-text contrast, 44x44px touch targets, reduced-motion behavior, and working CTA destinations. Add a canonical only when the public domain is verified. Ensure schema matches visible facts and contains no invented Event dates, metrics, ratings, prices, or addresses.

Treat a form as connected only when its real endpoint is configured and I have confirmed send intent. Label unconnected demos and prevent accidental submission. Do not use action="#", contenteditable, or navigation as fake submission.

Before audit, ensure every local image in the site is a participant-approved file copied into the output; remote images must remain external and must not be auto-fetched. Run launch-check.mjs --dir=SITE --json across the whole site and fix every hard failure. Also inspect keyboard order and focus, responsive layouts, forms, and performance as a human. Save the local launch checklist to .masterminds-context/launch-checklist.json. State that the local preview is not published, list observed checks, and list remaining uncertainty. Do not present the audit as a score, ranking, or SEO guarantee. Give deployment instructions as future steps, not as claims that deployment occurred.

After the site is live on a public URL, run a PageSpeed check on every changed public page: use the pagespeed skill when it is installed, otherwise Google PageSpeed Insights or Lighthouse. Report mobile and desktop scores and the top three fixes in plain language, fix failed accessibility and SEO audits, and re-run to show before and after. Never judge speed from a single lab run.
```
