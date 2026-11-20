# Third-party notices

## Modern Web Guidance

- Project: Modern Web Guidance, https://github.com/GoogleChrome/modern-web-guidance-src (published as the npm package `modern-web-guidance`)
- Stewards: the Google Chrome, Microsoft Edge, Mozilla Firefox and MDN teams, with the web development community
- Version used by this kit: `modern-web-guidance@1.0.1` (source commit `47e23a1428073d9194c5f50232e86a551807e117`), pinned in `scripts/modern-web.mjs`
- Licences: software code under the Apache License 2.0 (https://www.apache.org/licenses/LICENSE-2.0); guide content under Creative Commons Attribution 4.0 International (https://creativecommons.org/licenses/by/4.0/). Portions of its guides derive from MDN Web Docs by Mozilla Contributors and from W3C, WHATWG and IETF specifications.
- How it is used: this kit does not include or modify any of its code or guides. `scripts/modern-web.mjs` runs the published package through npx at the pinned version, with its telemetry switched off (`DISABLE_TELEMETRY=1`). The plain-language explanations in `scripts/modern-web.mjs` are original to this kit.
