# Whitelabels V1 — OriginKit opportunity mapping

Initial mapping: 2026-10-04. That review was mapping only: no new OriginKit integration, dependency, asset ID,
catalog availability claim or destination module. Preserve approved shell/Login/
Dashboard effects; avoid adding decorative motion to every control.

## Classification

| Area | Class | Why |
| --- | --- | --- |
| Page identity/header | KEEP NATIVE FRONTEND | Clear existing shell identity; no second carousel/wordmark needed |
| Primary Novo Whitelabel | ORIGINKIT CANDIDATE (low) | Optional restrained press/hover refinement, no new form capability |
| Selected row → detail | ORIGINKIT CANDIDATE (medium) | A short crossfade/shared-layout treatment can clarify the identity change |
| Status pills | KEEP NATIVE FRONTEND | Stable text + color, no animated meaning or invented real state |
| Empty/no-results | KEEP NATIVE FRONTEND | Clear explanation + reset is more valuable than decorative animation |
| Tenant avatar | ORIGINKIT CANDIDATE (low) | Subtle monogram treatment can reinforce selection, not invent tenant logos |
| Detail quick actions | KEEP NATIVE FRONTEND | Existing compact icon tiles are consistent and readable |
| Whole panel entrance | ORIGINKIT NOT RECOMMENDED | Repeated large transitions move focus/reading context and add distraction |
| Tables/forms/search/select/tabs | ORIGINKIT NOT RECOMMENDED | Native semantics, density, focus and keyboard behavior take priority |
| Animated statuses/metric counters/3D hero | ORIGINKIT NOT RECOMMENDED | No live data; implies authority or distracts from management tasks |

## Meaningful candidate matrix

| AREA | CURRENT IMPLEMENTATION | PRIORITY | ASSET TYPE | SEARCH TERMS | FORMAT / SIZE GUIDANCE | REUSE POTENTIAL | REPLACEMENT COMPLEXITY | RATIONALE |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Selected-detail identity/content change | Keyed React detail section, immediate replacement, static highlight | MEDIUM | React/CSS lightweight crossfade or shared-layout transition | shared layout, selected detail, restrained panel crossfade | Fit existing ~531px desktop detail and 273–343px phone region; 120–180ms, no height animation, reduced-motion instant | Later tenant/entity list-detail screens | SMALL CODE CHANGE | Highest flow value: makes changed tenant explicit without redesigning layout or selection semantics |
| Novo Whitelabel press/hover | Native violet PrimaryButton, 43px high | LOW | Accessible React/CSS button microinteraction | subtle glass button, restrained press, light glass button | Existing 43px height; full width on phone; retain focus ring/label/hit area; no perpetual shimmer | Future primary panel actions | VISUAL ONLY | Optional polish; existing emphasis is already effective and further glow may compete with selected row |
| Selected tenant avatar | Native 35/51px monogram/building avatar | LOW | CSS/React monogram border/selection treatment | monogram avatar, subtle gradient border, tenant identity | Preserve 35px row and 51px detail square slots, readable initial, no canvas/WebGL required | Future tenant context/detail headers | SMALL CODE CHANGE | Reinforces identity gently; must not invent logos, loaded data or interactive controls |

## Top 3 searches

1. `shared layout selected detail crossfade`
2. `subtle glass button restrained press`
3. `monogram avatar subtle gradient border`

These are search phrases, not verified catalog assets or asset IDs.

**Single highest-value opportunity:** the selected-row/detail identity transition,
provided it remains fast, non-layout-shifting, focus-safe and disabled for reduced
motion. It is optional polish, not a defect or blocker for the current prototype.
User selection/approval is required before any new integration phase.

## Approved integration phase — 2026-10-04

The subsequent user brief explicitly selected the supplied **Dot Matrix**, **Live
Chat animation language** and **Radial Reveal** source. This supersedes the
mapping-only boundary for these three ideas; no additional catalog asset was
selected. The Live Chat UI was NOT integrated. The primary action, status pills,
tabs, quick actions and no-data semantics remain native.

- `visuals/DotMatrixBackground.tsx`: OGL two-pass simplex-noise field → circular
  cell/radius/palette renderer. All four supplied shader strings are verbatim.
  Uses the original default circular mode, not the optional glyph-atlas mode.
  The large intrinsic stage and duplicate RAF loops were replaced by a bounded,
  content-sized lifecycle. The orange palette is not used.
- `visuals/DetailTransition.tsx`: scoped Framer Motion animation, original spring
  values (450 stiffness / 28 damping / mass 1) and stagger idiom. Exit 120 ms,
  displacement −4 px; entry +6 px → 0 with 55 ms stages. Header → information →
  summary → actions. No bubbles, timestamps, typing indicators or chat module.
  One persistent accessible region; no overlapping old/new DOM trees.
- `visuals/WhitelabelIdentity.tsx`: the supplied pointer-relative circle anchor,
  far-corner radius and 450 ms ease-in-out clip tween. A full-name rectangle is a
  non-interactive visual child of the existing row selection button. Row hover
  drives it; keyboard focus uses the centre; selection remains a stable accent.
  No standalone Radial Reveal button, icon arrow or additional tab stop.

### Local accent interface, not a theme/persistence contract

`WhitelabelsPage({ accentColor })` accepts a local six-digit hex accent, default
`#8b81ff`. It feeds the matrix palette, identity reveal and selected-row treatment.
No mock/real Product field or API was invented. No color is derived from a slug.

Future Product options:

1. **Preferred:** explicitly configured Whitelabel color, supplied to this visual
   input after Product defines ownership and a real persistence contract.
2. Another deterministic strategy only if Product later chooses its semantics.

### Performance / fallbacks / tradeoffs

- Navy base `#0f1321`; indigo `#5557ca`, violet `#8b81ff`, muted periwinkle
  `#aeb4ed`. Layer opacity 0.72; opaque panels preserve reading contrast.
- Desktop animation capped at 30 fps, phone at 18 fps. DPR capped at 1.25/1;
  raster budget 1.8 million pixels, largest dimension 4096. Uniform downscaling
  and CSS-sized cells preserve circular geometry. No worker or new framework.
- ResizeObserver handles actual content size. IntersectionObserver and document
  visibility stop the RAF; elapsed motion pauses rather than jumping on resume.
- Reduced motion renders a fixed recognizable shader state, removes detail
  staggering/displacement, and makes radial changes instant/static.
- No WebGL2 or initialization failure uses a lightweight static CSS circular-dot
  field. Context loss switches to that fallback until route remount/reload.
- Cleanup cancels render/resize RAFs, disconnects observers, removes listeners,
  frees geometry/programs/textures/framebuffer and releases the GL context.
- Added only `ogl@1.0.11` and `framer-motion@14.0.0` (+ their normal transitive
  dependencies). Existing React versions were not changed in the lockfile.
- Production build succeeds; the single JS chunk now exceeds Vite's 500 kB
  advisory threshold. This is a bundle-size tradeoff, not a failed build. Future
  route splitting can be considered separately; no warning threshold was raised.

Current validation/evidence: `design-qa.md`, final Whitelabels integration section.
Local feature commit only. No push, dev/main merge, deployment or Backend.
