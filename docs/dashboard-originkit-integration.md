# Dashboard V1 — approved OriginKit integration

Date: 2026-10-04. Starting SHA: `9aec6978249b0b1e510c6d022c35f77530c09f23`.
Branch: `feature/super-admin-dashboard-v1`; clean at start. Origin:
`https://github.com/devLoor1/super-admin-Loor`.

The initial record below describes `842dd43`. User visual review subsequently
**rejected its Predictive Arc visibility**, despite passing technical checks.
The correction and current values are recorded at the end of this document;
the initial visual verdict is superseded, not accepted evidence of fidelity.

One local commit only. No push, merge, deployment, Backend, API, authentication,
destination screen, business data or financial action. Local/remote `dev` and the
Login feature remain `b54329c`; local/remote `main` remains `c2235ac`.

## Source provenance and integration boundary

The three actual user-supplied sources, not catalog approximations:

- Predictive Arc: attachment `a1198099-c7fb-4716-9a28-acae1884fb7f/Texto colado.txt`.
- Text Carousel: attachment `2fb30763-aa4b-4e9a-bfa6-aa22e28bdcd6/Texto colado.txt`.
- Light Glass Button: attachment `d3cc964a-7d60-469a-ad98-afbf53aef8f4/Texto colado.txt`.

They live in `src/components/originkit/`, with scoped CSS Modules and two small
shared reduced-motion/visibility hooks. No general animation framework was made.
Login's approved VectorWordmark, TypeOnceHeading and AmbientTerms were not changed.
Shared tokens, layout styles, panels, illustration and honest empty states were
not changed. GSAP 3.15.0 is the only added dependency; it was absent and is needed
to retain the supplied carousel's GSAP behavior.

### Predictive Arc

- Supplied vertex and fragment shader retained verbatim after newline normalization;
  same full-screen triangle, cell/dot coverage, wave modulation and palette blend.
- Uses the supplied preset's peak 100, height 0, thickness 206, falloff 600,
  density 78 and dot size 102. Speed is restrained to 35.
- Replaces red with navy `#0f131d`, base `#34385c`, violet `#6f65b3`, highlight
  `#9187d3`. Canvas opacity 0.3 and a bottom fade keep panels dominant.
- Owned by AppShell's content region, never the sidebar; absolute positioning,
  bounded height up to 900px, no original 1200px minimum or touch-action restriction.
- Passive decorative canvas, `aria-hidden`, `pointer-events: none`. The original
  pointer shader path remains, but strength is zero and listeners are omitted for
  this background role. It is not a representation of activity or service health.
- Static subtle gradient on reduced motion, mobile/coarse pointers, detected
  two-or-fewer-core devices, unavailable WebGL or initialization failure.

### Text Carousel / RotatingDashboardTitle

- Retains original GSAP character exit (-120%), entry (100% to zero), opacity,
  grapheme splitting, stagger and badge-width tween; no CSS recreation.
- Fixed `Dashboard`; terms `Global`, `Whitelabels`, `Operações`, `Plataformas`.
  Interval 3500ms; each character tween 0.3s, stagger 0.012s, `power2.out`.
- Reserves the widest term once; the inner badge still animates within that slot.
  Compact typography/padding fit the existing title instead of the source's hero.
- Accessible H1 remains `Dashboard Global`, as does the document title. Animated
  descendants are `aria-hidden`, not a live region. Reduced motion keeps `Global`
  static. All four terms were observed in repeated full cycles.
- The reserved slot moves the breadcrumb to its own line at some widths (notably
  1280 and 390px). This adds stable space, not repeated carousel-driven reflow.
  Sampled desktop H1 widths varied by about 0.30px, with unchanged 36px height.

### Light Glass Button / GlassNavItem

- Retains source light falloff (11 stops, two radial layers), smoothing formula,
  nearest-edge aiming, distance-based intensity, conic edge highlight, exclusion
  ring masks and backdrop filtering. Fixed restrained violet replaces red.
- Adapts source wrapper/link/image presets into exactly one existing anchor or
  button per row. Icon/copy, callbacks, current-page semantics, labels, tooltips,
  active stripe, target sizes, layout and drawer mechanics are preserved.
- Selected item has persistent glass/ring and subtle violet glow. Other items
  are restrained at rest; hover and keyboard focus reveal the light treatment.
- Radius fits each row; stroke is 1px inside rather than the source's 6px outside.
  Touch selection is obvious without hover; pointer motion is mouse-only.

## Performance and lifecycle

- Arc: at most 30 draws/second, DPR at most 1.25, backing area about 1.2 MP maximum,
  low-power context without antialias/depth. Only time updates per frame; uniforms
  are prepared once and resize work belongs to ResizeObserver.
- Arc/carousel stop when their own region is offscreen or the document is hidden.
  Glass schedules short pointer/focus interpolation and stops once settled, unlike
  the source's perpetual settled-hover loop. No React render on every pointer frame.
- Cleanup cancels frames/intervals/tweens, disconnects observers, removes listeners
  and deletes WebGL buffers/programs/shaders. Context loss reveals the fallback;
  restoration rebuilds the effect. No source QA toggles or debug instrumentation.
- Browser-only counters observed approximately 22 Arc draws/second over a 266s
  sample. At 900 × 600, scrolling the whole Arc out of view stopped both its draws
  and the carousel's changes; one program/buffer were deleted. Scrolling back
  resumed the effect. Context loss/readiness false and restoration/readiness true
  were exercised. These are smoke tests, not hardware GPU/thermal benchmarks.
- Production JS increased from 285.05 KB / 89.32 KB gzip at the approved base to
  366.77 KB / 121.48 KB gzip (+81.72 KB / +32.16 KB gzip), including GSAP.

## Runtime and visual evidence

Local artifacts: `C:/Users/User/Desktop/Loor/output/dashboard-originkit-20261004`.
Before/after full-page captures and paired `comparison-{width}.jpg` exist for all
six sizes. Source left, integration right; no browser chrome. Individual captures
were inspected as well as pairs, including mobile below-fold panels.

| CSS viewport | Live scroll width | Live document height | Arc mode | Result |
| --- | --- | --- | --- | --- |
| 1672 × 941 | 1672 | 941 | WebGL | Sidebar right = Arc left = 262px |
| 1440 × 810 | 1440 | 967 | WebGL | Sidebar right = Arc left = 232px |
| 1280 × 810 | 1280 | 1453 | WebGL | Stable breadcrumb wrap; 232px sidebar |
| 900 × 800 | 900 | 1683 | WebGL | 76px rail; existing tablet stacking |
| 390 × 844 | 390 | 2582 | Static | Mobile drawer; stable breadcrumb wrap |
| 320 × 700 | 320 | 2881 | Static | Readable title; 40px menu target retained |

All live scroll widths were <= viewport widths. Captures can include a 15px
scrollbar gutter; full-page capture dimensions are not substituted for live metrics.
Vertical scrolling is intentional. Title animation can be caught mid-transition;
full-page capture can also restart its visibility-gated entry. The separately
captured `dashboard-390-viewport.jpg` shows the settled, readable title without
that capture artifact. No panel redesign or fake data.

- Sidebar mouse hover produced the source's moving radial/edge light; inactive
  rows stayed quiet. Keyboard Tab reached Operação with the existing 2px violet
  focus outline. No nested anchor/button controls.
- At 320px: labelled modal drawer, initial close-button focus, two inert background
  regions, body scroll lock, first/last Shift+Tab/Tab wrap, Escape return to menu.
  The selected row stayed styled independently of hover.
- Actual accessibility tree exposed only stable `Dashboard Global`; no repeated
  word announcements. Arc and all glass decoration are hidden from AT.
- Reduced-motion desktop reload: `Global`, no character movement, static Arc.
  Forced WebGL denial at eligible desktop size: fallback and all seven panels
  remain usable. Simulated two-core remount: static Arc. All temporary browser
  instrumentation/emulation was removed or reset afterward.
- Login re-captured at all six sizes: no overflow, normal Wordmark canvas ready,
  approved illustration/layout preserved. Empty/malformed validation and first-
  invalid focus, email/password/toggle/submit/recovery tab sequence and password
  input type/label passed. Reduced-motion Login at 1440 and 320 has no canvas or
  running CSS animation; heading fully readable. Forced WebGL denial leaves its
  static wordmark readable. No authentication request.
- Current console has no warning/error. Fresh complete network sample: 76
  requests, localhost only, zero failures, no truncation. Modules/assets/self-hosted
  fonts/HMR only; no Backend/API/auth/external-provider request. Source contains
  no new fetch, Axios, XMLHttpRequest or external client code.
- Manual DOM/AX/keyboard accessibility checks, not a full WCAG certification or
  physical screen-reader/device test. No existing axe runner available.

TypeScript, oxlint, Vite production build and staged `git diff --check` passed.
Local Login and Dashboard remain available on port 5173; no Backend required.

## Architecture reconciliation — separate from visual integration

Read `Arquitetura_Super_Admin_LOOR_V1.docx` as guidance, not an immutable Product
specification. Baseline domain review in `dashboard-v1-review.md` still applies:
global Control Plane; Plataformas for tenant management; Operação for consultation
and specifically permitted actions; Financeiro distinct from arbitrary wallet
mutation; Compliance and Auditoria/Governança evidence-based, not inferred health.

Current navigation is aligned at that domain level. `Visão global` remains the
actual context; title rotation does not select a tenant, change scope or navigate.
The terms are approved visual vocabulary, but future Product review should ensure
they are not read as a live scope change. No context model was invented here.

Future discussions, not implemented:

1. Auditoria as a top-level domain versus Sistema subdomain; global Configurações
   versus tenant settings.
2. Global/tenant KPI semantics, freshness, time-zone/date windows and partial/error
   states; document's fuller metric list versus this five-card prototype.
3. Configured integration versus service health. `Status operacional` currently
   says `Aguardando integração`; it does not prove operational health.
4. Control Plane ownership/deployment and authoritative Core aggregate contracts.
5. RBAC, actor/tenant boundaries and audit requirements before any real write.

No current terminology falsely claims integrated data. The main future risk is
confusing decorative rotating terms with an actual tenant/module selection.

## Initial outcome and handoff — visual verdict superseded

The three enhancements improve polish without overwhelming panels: glass navigation
adds the clearest functional value; the carousel adds identity; the Arc is deliberately
subordinate. No removal recommended at present. Keep the current Arc opacity/budget
and avoid extending full glass illumination to inactive rows.

Ready for user visual review, and for a separate promotion to dev **if approved**.
Not a real authenticated/control-plane implementation or a Production release.

- Login: `http://127.0.0.1:5173/`
- Dashboard: `http://127.0.0.1:5173/#/dashboard`
- Development server kept running. No push, merge into dev or deploy.

## Predictive Arc visual correction — 2026-10-04

Starting SHA `842dd431b1db0add87b9e9940dd490c9f0be636f`, same feature branch,
clean at start. Only PredictiveArc source/styles and these QA records were changed.
Text Carousel, Light Glass navigation, Login, panels, shell structure and shared
tokens were not modified. One additional local correction commit; no push/merge/deploy.

### Verified cause, not fallback speculation

1. Normal 1672px preview had WebGL ready, reduced motion false, compact mode false,
   four reported cores, and a valid 1371 × 875 buffer for the 1410 × 900 stage.
   Fallback/capability detection were not responsible.
2. Canvas opacity was 0.3. The mask faded from 75% to zero at the bottom, exactly
   where `peak: 100` placed the brightest line. Dark desaturated violet compounded
   that attenuation; opaque panels covered most of the remaining band.
3. The exported supplied preset really has `archHeight: 0` and a red palette.
   Rendering it unchanged in isolation showed a flat, bright bottom dot field.
   Rendering the source with its own base `peak: 35 / archHeight: 70` and violet
   colors showed the requested curved silhouette. The shader itself was working.
4. A browser-only opacity=1/no-mask test exposed dots around/between panels without
   changing z-index or wrapper backgrounds. Therefore stacking was not broken;
   peak placement, fade, attenuation and panel coverage were the primary causes.
   Pointer strength had also been zeroed, removing the source's defining interaction.

### Current implementation

| Setting | Rejected version | Corrected version |
| --- | --- | --- |
| Peak / arch height | 100 / 0, exported flat preset | 35 / 70, supplied source's curved base |
| Thickness / falloff | 206 / 600 | 206 / 600, preserved |
| Density / dot size | 78 / 102 | 78 / 102, preserved |
| Speed | 35 | 100, original source default |
| Pointer | disabled | radius 236, strength 34%, source lerp rates 12/6 |
| Stage height | up to 900px | up to 640px, within header/KPI/overview region |
| Canvas opacity | 0.3 | 0.9; static mobile 0.6 |
| Fade | 75–100%, erasing bottom peak | 82–100%, below the curved concentration |
| Background | #0f131d | #080b13 |
| Base / accent / highlight | #34385c / #6f65b3 / #9187d3 | #34156b / #a050ff / #e8d9ff |

Original vertex and fragment shader strings remain equal to the supplied source
after newline normalization. Original dot coverage, wave modulation, color blend,
thickness, falloff, pointer radius/strength and interpolation remain. Coordinate
input is normalized to the shader's top-origin CSS space rather than the source
handler's mirrored Y. Parent-content passive pointer listeners observe movement
without intercepting controls and are removed on cleanup. Sidebar events do not
affect the field. The stage remains behind content at z-index -1; no panel/background
or shell stacking change was required.

Static fallback uses a separate 2D canvas and the source shader's curve, cell/dot,
time-zero wave, intensity and palette math. It draws only initially/on resize,
not in a frame loop. Canvas 2D edge antialiasing differs from the GLSL coverage
smoothstep; this is a fallback-only difference, not a replacement of the main shader.
Mobile, reduced motion, unavailable WebGL and low-capability contexts now retain
a visible dot/arc identity instead of the previous generic gradient.

The 30-draw/sec, DPR <=1.25 and ~1.2MP WebGL budget remain. Cleanup now unbinds
resources and shrinks the unused WebGL buffer to 1 × 1; offscreen and context-loss
fallback/resume were verified. No additional library or debug/query switch.

### Current-run evidence and validation

Artifacts: `C:/Users/User/Desktop/Loor/output/predictive-arc-correction-20261004`.

- `03-original-exact-preset.jpg`: actual supplied component, unchanged exported preset.
- `04-original-curved-violet.jpg` / `05-original-pointer-response.jpg`: same source
  using its base curve and violet palette; source pointer strength reached 0.314.
- `01-rejected-dashboard-1672.jpg`, `02-rejected-content-region.jpg` and
  `06-opacity-fade-ablation.jpg`: measured rejection and cause-isolation evidence.
- `08-corrected-dashboard-1672.jpg` and `comparison-dashboard-1672.jpg`: visible
  violet dot field at rest; source/rejected comparison also saved and inspected.
- `09-corrected-pointer.jpg`: integrated strength reached 0.340 at local [705,120].
- `corrected-1440/1280/900/390/320.jpg`: desktop/tablet WebGL and static mobile.
  Live widths 1425/1265/885/375/305 respectively: no horizontal overflow.
  Arc left 262px at 1672, 232px at 1440/1280, 76px tablet, 0px mobile; sidebar excluded.
- `10-reduced-motion-1672.jpg` / `11-no-webgl-1672.jpg`: visible static source-shaped
  fallback. Context loss exposes it at opacity 0.9; restoration returns WebGL.
- `12-login-1440.jpg` / `13-login-390.jpg`: approved Login layout/Wordmark unchanged;
  required-field errors, first-invalid focus and password visibility passed.
  Reduced-motion Login has no canvas and a fully readable heading. No auth request.
- Fresh network sample: 76 localhost-only requests, no failures/truncation. Current
  console has no warning/error. Temporary isolation files/browser overrides removed.
- TypeScript, oxlint, production build and staged diff-check passed after cleanup.

The Product Design audit required isolation, live mode/parameter inspection,
ablation and paired current-run screenshots before accepting the correction.
Desktop/tablet visibility is now clearly stronger without moving or changing UI;
opaque cards still conceal parts of the environmental arc by design. This is not
a full WCAG/hardware performance certification or frame-exact copy of the red,
flat exported preset. The correction is ready for **another user visual review**,
not yet claimed as user-approved. Local server remains running on port 5173.
