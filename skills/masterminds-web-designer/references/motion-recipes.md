---
kg:
  id: web-designer-agent-kit:skills-masterminds-web-designer-references-motion-recipes
  type: document
  status: active
  audience: team
  relations: {}
---
# Motion Recipes: Editorial Lookbook Effects

Read this when a brief asks for premium, editorial, product-launch, lookbook, or "wow" motion, or when a participant points at an award-style site and asks for its feel. These recipes are distilled from a teardown of the Quechua SS25 lookbook (quechua-lookbook.com/ss25, studio build on WordPress, GSAP + ScrollTrigger + Lenis + Taxi.js). They describe techniques and measured timing values. They are not the studio's code: write original markup, copy and assets for every participant.

Core rules carry over unchanged: motion is optional, every recipe needs a `prefers-reduced-motion: reduce` path that shows the final state, content must be readable with JavaScript off, and no recipe may hide a CTA or body text behind a scroll position. Pick 2 to 4 recipes per site. Stacking all of them reads as a demo, not a brand.

## Shared motion language

The site feels coherent because a small set of eases and durations repeat everywhere. Reuse a set like this instead of ad hoc values.

| Token | Value | Use |
|---|---|---|
| `--ease-out` | `cubic-bezier(0.19, 1, 0.22, 1)` (expo-out) | Reveals, pop-ins, hover settles. 0.8 to 1.1s |
| `--ease-snappy` | `cubic-bezier(0.2, 0, 0, 1)` | Text line reveals, menu items, card pops. 0.6 to 0.8s |
| `--ease-in-out` | `cubic-bezier(0.86, 0, 0.07, 1)` | Big page or chapter transitions. 1.2 to 1.6s |
| `--ease-fade` | `cubic-bezier(0.25, 0.46, 0.45, 0.9)` | Opacity-only fades. 0.3 to 0.45s |
| `--ease-back` | `cubic-bezier(0.175, 0.885, 0.32, 1.275)` | Small icon bounces only |

Patterns used across every block:

- **Mask reveal**: text lines sit inside `overflow: hidden` wrappers and move from `translateY(100%)` to `0`, staggered 0.06 to 0.15s per line. Exit goes to `-100%`, so text reads as passing through a slot.
- **Pop with counter-scale**: an image wrapper goes `scale(0) rotate(±8 to 10deg)` to `scale(1) rotate(0)` while the inner `<img>` goes `scale(1.3)` to `1`. The frame grows while the photo settles, which looks expensive and costs one extra element.
- **Rounded inset frame**: sections and media use `clip-path: inset(Xrem round 1.6rem)` animating to `inset(0 round 0)` (or the reverse) instead of animating width and height. It is cheap to composite and gives the signature "card becomes full bleed" feel.
- **Random tilt**: stacked photos get a random 2 to 7 degree tilt, alternating sign by index, so piles look hand placed.

## Recipe 1: Percent loader that becomes the hero

A centered stack of 3 to 4 photos pops in one by one (0.4s stagger, random alternating tilt) while a `00%` to `100%` counter runs. The hero video then loads, and the hero wrapper's clip-path expands from the size of the photo stack to full screen, rotating from about 8 degrees back to 0 over 1.6s with `--ease-in-out`. The loader node is then removed and smooth scroll starts.

- Drive the counter from the same timeline as the photos, not from fake network progress. Do not claim a real loading percentage.
- Gate the expansion on the video's `loadeddata` event, with a fallback poster image if autoplay is refused (low-power mode check: try `video.play()` on a tiny muted clip and fall back to a still if it rejects).
- Use CSS custom properties for the clip box, for example `clip-path: inset(var(--clip-y) var(--clip-x) round 1.6rem)`, and animate the properties.
- Keep it under about 2.5s in total. Skip it on repeat visits in the same session (`sessionStorage`) and entirely under reduced motion.

## Recipe 2: Hero that recedes into a card on scroll

As the user scrolls out of the hero, a scrubbed timeline takes the hero frame from `inset(0 round 0)` to `inset(1.6rem round 1.6rem)` (1rem on mobile), moves the media `yPercent: 10`, and scales the title to 0.95 with `yPercent: 25`. Small floating elements such as a subtitle or a "watch the film" pill drift diagonally a couple of rem. The page appears to lift away from the hero.

```css
@supports (animation-timeline: view()) {
  .hero-frame { animation: hero-recede linear both; animation-timeline: scroll(root); animation-range: 0 100vh; }
  @keyframes hero-recede { to { clip-path: inset(1.6rem round 1.6rem); } }
}
```

Native scroll-driven animations are the default. Use GSAP ScrollTrigger only when the participant asks for it or the effect needs scrub smoothing.

## Recipe 3: Full-width image reveal with parallax

Each chapter opener is a full-bleed photo. Two independent scrubbed triggers:

1. **Reveal** from `top bottom` to `top 10%`: frame `inset(3rem round 1.6rem)` (1.5rem mobile) to `inset(0 round 0)`, image `scale(1.1)` to `1`.
2. **Parallax** across the whole section: inner image `yPercent -10` to `10`, overlaid title `yPercent 30` to `-30` (desktop only).

The image element must be about 20% taller than its frame so parallax never exposes an edge. Check this at 320px and 1440px.

## Recipe 4: Scroll-scrubbed 3D card fly-through

The standout "gallery" moment. A sticky full-screen stage with `perspective` holds 8 to 10 photo or video cards absolutely positioned. One scrubbed timeline moves each card from `translateZ(-4000px)` (about -3000px on mobile) toward the viewer, with an opacity keyframe of `[0, 1, 1, 0]`, so each card fades in, flies past and fades out. Start times are offset by about 0.05 of the timeline per card. Later cards stop further back (-500px to -1500px) and some drift sideways or vertically by 10 to 30rem, so the cloud has depth instead of a single lane.

- The section needs a tall scroll runway (about 300 to 400vh) with a `position: sticky; top: 0; height: 100vh` stage.
- Load card videos only when the section enters, and pause them when it leaves.
- A title such as "Two lines / split apart" sits behind the cards. It scales in from 0.7, and on exit its left half moves `-20rem` while the right half moves `+20rem`.
- Reduced motion: render the cards as a normal responsive grid.

## Recipe 5: Cursor image trail

In a storytelling block, moving the pointer more than a threshold distance (8% of viewport width on desktop, 20% under 1024px) stamps the next image from a set at the pointer. Each stamp pops `scale 0` to `1` with `--ease-snappy` over 0.8s and a random rotation between -15 and 15 degrees, then shrinks back to 0 over 0.3s. Z-index increments so new images sit on top. On touch devices and before first pointer movement, an automatic keyframed path (power2.inOut, 1.5s) moves a virtual cursor across the block so it still animates once when scrolled into view.

The block's large statement text goes from `opacity 0.2` to `1` character by character, scrubbed between `top 90%` and `center center`. That reads as "lighting up" while scrolling.

Keep the trail decorative (`aria-hidden="true"`, `pointer-events: none`) and cap the image pool at about 8 elements, reused round robin.

## Recipe 6: SVG route line drawn by scroll

A dotted or solid trail path, such as a hiking route, sits behind an overview section. `stroke-dasharray` and `stroke-dashoffset` start at the path length and scrub to 0 from `top 40%` to `bottom center`. On desktop only, small overview galleries swap their stacked photos as the section passes thresholds: the next photo pops in with the counter-scale pattern, and a 50% dark overlay fades onto the previous one.

```js
const len = path.getTotalLength();
path.style.strokeDasharray = len;
path.style.strokeDashoffset = len; // scrub to 0 with scroll progress
```

## Recipe 7: Product hotspots with pop cards

A product or model photo carries small circular hotspots that pop in one after another (`scale 0` to `1`, `--ease-snappy`, 0.1s stagger) when the block reaches `top 40%`. Hovering a hotspot opens a small card that scales from 0.8 with a fade, a thumbnail that pops in with the tilt and counter-scale pattern, and a mask-revealed title and link. The card closes 200ms after the pointer leaves, so moving between the hotspot and the card does not flicker.

On mobile, tapping a hotspot slides a bottom card up from `yPercent: 120`. A previous card shrinks back (`yPercent -17`, `scale -0.075`, `opacity 0.8`) to form a short stack, and each card auto-hides after about 1.1s.

A "drawing loop" on the model image flips 4 sketch frames every 0.19s, like a stop-motion line drawing. Use a CSS `steps()` animation over a sprite or stacked images.

Colorway switching crossfades the packshot and model (out 0.3s, in 0.4 to 0.55s, overlapped by 0.3s) while the color name and count slide out up and in from below.

Hotspots must be real `<button>` elements with accessible names and visible focus, at least 44x44px hit area even if the dot is smaller, and openable by keyboard.

## Recipe 8: Pinned product spec story

A product section opens with its frame growing from a tiny centered rounded rectangle (`inset(50% 50% round 0.4rem)`) to an inset card, then to full frame, while the packshot scales from 0.2 to 1 and drops about 20rem. This runs over the first 75% of a viewport of scrolling. The section then pins while scroll progress steps through feature details: clicking a feature icon scrolls to that feature's slice of the pinned range, and each feature swaps in with a popped image and mask-revealed title and description.

A "standard vs lighter version" toggle swaps the whole product: the old title exits upward with a short stagger, the new one rises in 30% into the exit, and the spec card scales in from 0.8. On mobile, the same toggle is a horizontal swipe (`xPercent: -100`) between two panels with pager dots.

The info popup uses `backdrop-filter: blur(40px)` with a 32% dark overlay, and its side panel slides in from `xPercent: 100`. Escape closes it.

## Recipe 9: Morphing pill navigation

The header is a single floating rounded pill. Hovering on desktop, or tapping on mobile, expands it into a panel: width and height animate, border radius changes, and a 4-dot icon splits apart (each dot flies to its corner, `xPercent/yPercent ±100`) while its wrapper rotates 90 or -45 degrees. Menu rows reveal with the mask pattern, each with a thumbnail that pops in with tilt and counter-scale, staggered 0.08s. A small label in the closed pill shows the current chapter. It flips vertically (mask reveal) as scroll passes each chapter, and the header switches to a light variant over `.dark-section` blocks.

Clicking a chapter does not hard-jump. The page shrinks into an inset rounded card (`clip-path: inset(1.6rem round 1.6rem)`, `y: -20vh`, a dimming overlay), a copy of the destination chapter's opener image rises from `yPercent: 100` over the top while its own frame expands from `inset(3rem round 2rem)` to full, and only then does scroll jump to the real section underneath. The cut is hidden inside the transition. Under reduced motion, use a 0.35s fade to the section.

The menu must also work as a plain anchored `<nav>` with links, and the open state must trap focus and close on Escape.

## Recipe 10: Video takeover modal

A "Discover the full video" pill opens a player that slides up from `yPercent: 105, scale 0.97` while the page behind it recedes into an inset rounded card and moves up 20vh, with a 70% overlay. The close button grows from a 3.6rem circle into a 7.7rem labelled pill as its 4-dot icon splits outward, and "Close" types in letter by letter in reverse stagger. Player controls fade after 1.25s of no pointer movement. Space toggles play and Escape closes. Load the video source only on first open.

## Recipe 11: Small texture details

- **Film grain**: a fixed, `pointer-events: none` layer with a tiled grain image or an SVG `feTurbulence` filter at low opacity over the hero. It adds an analog, editorial feel.
- **Wiggle text**: a hand-drawn-feel label duplicates its text in `::after { content: attr(data-text) }` and runs a 0.75s infinite keyframe of tiny `skewX(0.5deg)` and 1px translations, like boiling line animation. Use it on one or two labels only, and disable it under reduced motion.
- **Coordinate captions**: small monospace geo coordinates (for example a place name plus `42.697° N`) beside photos reinforce the outdoor story. Use real locations only.
- **Palette**: one warm neutral family (sand 100 to 600) plus black and white. The only saturated color comes from the product photography.

## Implementation notes

- **Default stack**: native CSS scroll-driven animations (`animation-timeline: view()/scroll()`), `IntersectionObserver` for one-shot reveals, Web Animations API for interactive pops, and CSS custom properties for clip boxes. Add GSAP + ScrollTrigger (free since 2025, including SplitText) and Lenis smooth scroll only when the participant wants this tier of polish and accepts the extra bundle size. Load them from a pinned CDN version or local vendor files.
- **Text splitting**: split by lines after fonts load (`document.fonts.ready`) and re-split on resize, or use GSAP SplitText with `autoSplit`. Keep the original text in the DOM for screen readers (`aria-label` on the parent, `aria-hidden` on the split spans).
- **Performance**: animate only `transform`, `opacity` and `clip-path`. Lazy-load every below-the-fold image and video (`loading="lazy"`, `preload="none"` with a poster). Disable cursor trails, 3D fly-throughs and parallax under 1024px where the source does, or replace them with simpler mobile versions. Re-run PageSpeed after adding any recipe; a lookbook that scores under 50 on mobile has failed.
- **Responsive**: every recipe has explicit mobile values (smaller insets, shorter Z distances, swipe instead of hover). Recompute measurements on resize.
- **Evidence**: when the browser acceptance loop runs, settle loaders and entry motion before capture, and capture a reduced-motion pass to prove all content is reachable.
