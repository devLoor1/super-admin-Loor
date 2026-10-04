# Super Admin Login V1 — approved visual refinement QA

## Visual target and capture

- Layout source truth: `docs/reference/super-admin-login-approved.png` (1672 × 941 px), normalized for comparison to `C:/Users/User/Desktop/Loor/output/super-admin-motion-20260930/reference-normalized-1440.png` (1440 × 810 px). Motion source truth: the supplied OriginKit Vector Wordmark source in `C:/Users/User/.codex/attachments/ed6f4d65-0f6d-44f8-8805-3aa32f502d6d/Texto colado.txt`; no separately rendered original animation was supplied.
- Latest rendered implementation: `C:/Users/User/Desktop/Loor/output/super-admin-origin-source-20260930/desktop-1440.png` (1440 × 810 px, CSS viewport 1440 × 810, device scale 1).
- Compared the same initial, settled login state. The source was resampled to the implementation's CSS size; no browser chrome or device frame is included.
- Full-view comparison: source and implementation were inspected together at 1440 × 810.
- The heading/card were also checked at full resolution. Focused header captures, idle A/B frames, pointer-left/right frames, `tablet-900.png`, `mobile-390.png`, `mobile-320.png`, `reduced-motion-320.png`, and `no-webgl-320.png` are in the source-based output directory.

## Findings

- No actionable P0/P1/P2 mismatch in the requested scope. The 47/53 panel split, card position and size, illustration, header/footer placement, form spacing, control layout, and copy remain aligned with the approved reference.
- [P3, approved deviation] Ambient terms add low-contrast texture not present in the static layout source. At tablet width a few terms sit near the compact header; they remain subordinate. The current speed and treatment were approved in visual review.
- [P3, approved source-size tradeoff] The source shader renders directly, including its sharp green dotted mask and dashed triangle/node boxes. At 22–28 px, the sharp mask sparsifies affected letters; a faint static glyph underlay preserves readability without rewriting the shader. The current balance was approved in visual review.
- No separately rendered OriginalKit reference was supplied, so exact frame-to-frame fidelity to the original asset cannot be claimed. Source behavior was checked against the supplied code and verified in idle/pointer browser states.

## Fidelity surfaces

- Typography: Inter family, wordmark scale/tracking, heading weight/size/wrap, and small copy hierarchy remain consistent. The 320 px heading wraps as expected while the card does not shift during typing.
- Spacing/layout: Panel and card proportions match the normalized source; no added spacing was needed for the animation containers.
- Colors/tokens: The existing dark/violet palette was preserved. The current approved source does not show an orange accent; the prototype did not introduce one.
- Image quality/assets: The approved central SVG illustration, grid, and spheres are preserved unchanged. The new wordmark canvas affects text treatment only.
- Copy/content: All functional copy and labels remain unchanged; ambient vocabulary is decorative and `aria-hidden`.

## Validation and interaction state

- Checked viewport widths 1440, 1280, 900, 390, and 320 px. No horizontal overflow was observed.
- Keyboard order remains email → password → visibility toggle → Entrar → recovery.
- Empty-field and malformed-email validation messages and first-invalid-field focus remain intact. Password visibility toggle still switches the input type and accessible label.
- With `prefers-reduced-motion: reduce`, the full heading is immediate, the wordmark is static, and ambient animation is disabled (rechecked after the revision).
- The ambient cycle changed from 22s to 8s, with horizontal travel from ±8px to ±16px. Computed transform moved about 14px in a two-second observation while pointer events remained disabled.
- The development-only `?no-webgl=1` route exercised the static wordmark fallback during prototype QA. It was removed during consolidation; the final fallback was tested by temporarily denying WebGL context creation in the local browser, then restoring the browser state. This is not a separate physical no-WebGL device test.
- In the source-based revision, CSS viewports 1440 × 810, 900 × 800, 390 × 844, and 320 × 700 were checked; `scrollWidth <= innerWidth` in all four. Vertical scrolling at 900 and 320 px is expected. The wordmark canvas initialized at all four widths.
- The reduced-motion check at 320 px found no wordmark canvas and no ambient animation; static `SUPER ADMIN` remained visible. The forced no-WebGL path at 320 px likewise displayed static text with no canvas or overflow.
- Two idle captures 1.6 seconds apart changed 966 pixels in the 345 × 48 px wordmark stage at a >20 RGB-channel threshold. Pointer positions at both ends were also captured. This confirms automatic and pointer-driven motion rather than a hover-only glow.
- No Backend/authentication/API connection was added.

## Comparison history

- First browser capture exposed an opaque white wordmark canvas (P1). The shader output was corrected to premultiply RGB by alpha, matching the browser compositor. The post-fix 1440 px capture shows transparent surroundings and a readable wordmark.
- After that correction, no P0/P1/P2 issue remained in the visual comparison.
- The follow-up visual revision increased the wordmark's affected/resting contrast, dotted-glyph strength, subtle sub-pixel displacement, reveal reach, and idle sweep speed. Two 1440 px captures about two seconds apart show the reveal traversing different letters; the normalized source comparison confirms no layout drift.
- The current Origin-fidelity revision replaces the distressed filter and sub-pixel displacement with the supplied component's red/green atlas, six-sample soft/sharp shader blend, aspect-corrected pointer reach, eased linear idle sweep, and grid-snapped drifting dashed geometry. Editing handles, coordinates, and vertex boxes remain intentionally absent. The shader uses high precision and limits sharp-mask contribution at 28 px to avoid broken letterforms; a lower-precision pass visibly speckled the glyphs and was rejected.
- The latest revision replaced that simplified adaptation with the supplied FRAG/VERT source and its original red/green atlas, green sharp mask, vertical blend, dashed lines and node boxes, grid snap, drift, damping, and linear sweep. The atlas was supersampled and CSS tracking measured explicitly because canvas tracking compressed the wordmark in this browser. The stage was normalized to the existing header; coordinate labels remain hidden. These integration changes corrected the earlier footprint drift without weakening the source shader.

## Resumed final validation

- Git remained on `feature/super-admin-login-v1` with only the expected uncommitted prototype files. No implementation code was changed during this validation pass.
- TypeScript (`npm run typecheck`), oxlint (`npm run lint`), production Vite build (`npm run build`), and `git diff --check` all passed.
- Live CSS viewports 1440 × 810, 900 × 800, 390 × 844, and 320 × 700 matched the saved captures. Their document scroll widths were respectively 1440, 885, 390, and 305 px, with no horizontal overflow; the WebGL canvas reported ready at all four widths. The wordmark retained its approved header footprint.
- Two fresh idle header observations showed the source-style vector reveal moving across different letters without hover. The pointer target was confirmed to lie over the wordmark stage, and left/right pointer states were exercised; the saved pointer captures remain valid. The faint static glyph underlay kept the affected text readable.
- At 320 px, reduced motion removed the wordmark canvas and disabled ambient animation while retaining readable static `SUPER ADMIN`. The forced `?no-webgl=1` path likewise rendered static text with no canvas or overflow.
- Empty submission showed both required-field errors and focused E-mail; malformed E-mail showed its validation error and focused E-mail. Keyboard order remained E-mail → Senha → Mostrar senha → Entrar → Esqueci minha senha. The password toggle changed its accessible label to `Ocultar senha` and input type to `text`; the form was then reloaded cleanly. No authentication request was submitted.
- Seven AmbientTerms remained decorative with `pointer-events: none` and the established 8 s cycle. TypeOnceHeading finished its one-time text and kept the accessible `Acesso administrativo` label. Neither component was edited in this revision.
- The browser log still contains one historical Vite hot-reload error from the interrupted editing session at 22:31:31; no new error was observed during these validation actions, and the current production build succeeds.

### Source fidelity boundary

- Preserved directly or nearly unchanged: original vertex/fragment shader structure; RG atlas fill/stroke channels; six-sample soft/sharp mask; aspect-corrected pointer reach; shade/text blend; dashed triangle and node boxes; grid snap, three drifting vertices, easing, idle sweep, and visibility-gated animation.
- Integration-only changes: `SUPER ADMIN`, CSS-fitted stage and font sizing, explicit tracked-glyph drawing to match CSS letter spacing, small-atlas supersampling, dark/violet colors, responsive node spread/reach, hidden coordinate labels, static readability underlay, and reduced-motion/no-WebGL fallback.
- Remaining differences: this integration does not expose the original configurable props or coordinate labels and uses a WebGL1-only context rather than probing WebGL2 first. The compact login wordmark cannot reproduce the original 1200 × 800 stage's spatial scale; no separate rendered original animation was available for frame-exact comparison. These are not regressions in the requested login context.

## Approved consolidation and final checks

- The user approved the current visual result. Consolidation removed only the development query-string no-WebGL switch. The WebGL shader, atlas, pointer/sweep behavior, geometry, tracking, AmbientTerms speed, TypeOnceHeading animation, illustration, and form layout were not changed.
- A forced WebGL-denial check exposed one fallback handoff issue after reduced motion was toggled off: stale canvas readiness dimmed the static glyph. Clearing readiness when reduced motion turns on fixed that state transition without changing normal rendering. In the final check, WebGL context creation was denied once; the canvas and wordmark stayed not-ready, static `SUPER ADMIN` remained fully readable, and no horizontal overflow occurred. The browser override was then removed by reload.
- Final live CSS widths were 1440 × 810, 900 × 800, 390 × 844, and 320 × 700. Document scroll widths were respectively 1440, 885, 390, and 305 px; there was no horizontal overflow. The WebGL canvas reported ready in the normal mode at all four widths, with the prior approved wordmark footprint.
- At 320 px, reduced motion showed static text, no canvas, and no AmbientTerms animation. The earlier empty/malformed-email, keyboard-order, password-toggle, idle-sweep, and pointer checks remain applicable because those implementations were unchanged during consolidation.
- TypeScript validation, oxlint, production Vite build, and `git diff --check` passed after consolidation.

**final result: passed**

## App Shell + Dashboard V1 review — 2026-10-04

This is a separate frontend-only review of Claude's recovered Dashboard work on
`feature/super-admin-dashboard-v1`, based on approved Login `b54329c`. Existing
Login approval above remains intact. No new OriginKit integration or Backend work.

### Current visual evidence

- Dashboard source: `docs/reference/super-admin-dashboard-approved.png`, 1672 × 941.
- Current captures and comparison pairs:
  `C:/Users/User/Desktop/Loor/output/super-admin-dashboard-review-20261004`.
- `dashboard-before-1672.jpg` records the recovered implementation before edits.
  `dashboard-1672.jpg` is the refined full view at the reference CSS size and DPR 1.
  `dashboard-comparison-1672.jpg` places source left and implementation right.
- `dashboard-1440.jpg`, `dashboard-1280.jpg`, `dashboard-900.jpg`,
  `dashboard-390.jpg`, `dashboard-320.jpg` cover the requested reflows;
  `drawer-390.jpg` records the modal navigation. No browser chrome/device frame.
- Login: `login-1440.jpg` compared with the reference resampled to 1440 × 810,
  together in `login-comparison-1440.jpg` (source left/current right). Also captured
  1672, 1280, 900, 390 and 320px. `login-reduced-motion-320.jpg` and
  `login-no-webgl-320.jpg` record static fallbacks in this run.

### Findings and resolutions

- [P2, resolved] Drawer had no explicit Tab/Shift+Tab wrap and search shortcut was
  active behind inert content. Added modal semantics, focus wrapping/return,
  shortcut isolation and outside-toast interaction blocking; Escape, scrim,
  background inertness and scroll lock remain.
- [P2, resolved] At 320px the mobile menu target shrank to 22px. Preserved a 40px
  target, slightly tightened brand tracking/spacing at ≤359px and hid the redundant
  user chevron. No horizontal overflow or wider-layout change.
- [P2, resolved] Equal colored donut segments could imply invented shares. The
  empty ring is now muted/unsegmented. No values, counts or tenant names were added.
- [P3, deliberate] Shared isometric art is slightly brighter than the Dashboard
  concept; its coherent Login vocabulary is retained. Candidate asset polish is
  deferred, not integrated. Borders/depth differ slightly from the raster reference
  but preserve hierarchy and proportions.
- [P3, deliberate] Laptop layout scrolls vertically rather than shrinking secondary
  text to force one viewport. Measured 157px vertical scroll at 1440 × 810.
- No remaining blocking visual/interaction regression found in the tested scope.

### Validation boundary

- Dashboard scroll widths at 1672/1440/1280/900/390/320 were
  1672/1425/1265/885/375/305: no horizontal overflow. Mobile lower panels, tablet
  rail and stacked layouts were inspected in full-page captures.
- Login scroll widths at those sizes were 1672/1440/1280/885/390/305. Desktop and
  tablet retain the illustration; mobile hides it intentionally. Shared SVG
  definition contents and visible tree match the approved Git version exactly
  after normalizing attribute order/definition placement. Other Login components
  and their CSS were not modified.
- Login required/malformed input validation, first-invalid focus, tab order,
  password visibility and neutral local submission/recovery messages passed.
- Reduced-motion initial load has no Wordmark canvas and no AmbientTerms animation.
  Forced WebGL-denial remount leaves static text white and readable, with not-ready
  canvas. Temporary browser-only override was removed by reload; normal readiness
  returned. No permanent QA switch or fallback implementation change.
- All 22 Dashboard buttons show local prototype notices. Skip link reaches main
  without route changes; search shortcut/Enter, drawer keyboard, scrim and breakpoint
  focus return passed. No network/API/business action was triggered.
- Current console has no warnings/errors. Runtime requests were localhost assets,
  modules/fonts and development HMR only. Source has no Backend/API calls.
- Manual DOM/AX/keyboard review, not a full WCAG or screen-reader certification.
  No existing axe runner/bundle available; earlier automated claims were not reused.
- TypeScript, oxlint, production build and `git diff --check` passed.
- The Product Design audit guidance led to before/after captures, paired reference
  comparison, priority-labelled findings and explicit evidence limits.

**Dashboard V1 review result: passed for local visual review.** Real authentication,
tenant/data integration and future permission handling remain out of this prototype.

## Dashboard V1 — selected OriginKit integration QA — 2026-10-04

The initial technical pass below was followed by a user **visual acceptance
rejection of Predictive Arc visibility**. The correction below supersedes that
initial Arc verdict; Carousel/Glass/Login implementations remain unchanged.

This follows the user-approved integration brief, starting at clean `9aec697` on
`feature/super-admin-dashboard-v1`. It does not revise the approved Login result.
Actual supplied Predictive Arc, Text Carousel and Light Glass Button source was
integrated; provenance/adaptations/performance and separate architecture findings
are in [docs/dashboard-originkit-integration.md](docs/dashboard-originkit-integration.md).

### Before/after evidence and findings

- Local captures: `C:/Users/User/Desktop/Loor/output/dashboard-originkit-20261004`.
  Before/after pairs at 1672 × 941, 1440 × 810, 1280 × 810, 900 × 800,
  390 × 844 and 320 × 700 were inspected together. Panels, typography, illustration,
  status/empty copy, primary hierarchy and responsive grid remain intact.
- No blocking visual or interaction finding in the requested scope. Selected
  glass treatment strengthens navigation; inactive rows remain calm. Hover light
  is visible without all rows glowing. No effect is drawn behind the sidebar.
- [P3, integration tradeoff] Widest-word reservation moves the breadcrumb below
  the title at some widths. It does not keep moving when the carousel rotates.
  Sampled H1 geometry varied by ~0.30px horizontally and retained 36px height on
  desktop. Mobile title remains readable and all sizes have no horizontal overflow.
- [P3, performance tradeoff] GSAP plus integration adds ~32.16 KB gzip JS. Required
  to retain the selected source behavior; no second animation library was added.
- Arc is subtle (opacity 0.3), clipped to a bounded content region and fades out;
  no readability loss was found. Static mobile/low-capability fallback is deliberate,
  not a missing animation bug. Do not increase its intensity without another review.

### Behavior and validation

- Live scroll widths at all six viewports were <= viewport width. Four desktop/
  tablet sizes initialized the Arc; 390/320 used static fallback. Its left edge
  matched the sidebar right at 262/232/232/76px, and 0px on mobile.
- All four title terms rotated at 3500ms; actual H1/document title stayed
  `Dashboard Global`. Animated text and visual backgrounds were excluded from
  the actual accessibility tree. Reduced motion held `Global` static.
- Mouse light tracking, keyboard focus-visible, `aria-current`, one-control row
  semantics, modal drawer focus wrap/return, background inertness and touch
  selected state passed. No nested buttons/links.
- Offscreen Arc/carousel suspension, WebGL resource disposal/resume, forced WebGL
  denial, simulated low-capability fallback and context loss/restoration passed.
  Temporary local browser overrides/counters were removed by reload; no source
  debug switches were introduced.
- Login normal captures at all six sizes and reduced-motion/static fallbacks
  passed. Existing required/malformed validation, first-invalid focus, keyboard
  sequence, password toggle and central illustration remain intact. No Login
  component, shared token or form implementation was changed.
- Fresh network capture: 76 localhost requests, no failures, no Backend/API calls.
  Current console: no warnings/errors. Manual DOM/AX/keyboard accessibility review
  only; no full WCAG or hardware performance certification.
- TypeScript, oxlint, production Vite build and staged `git diff --check` passed.

**Integration result: passed for user visual review.** One local feature commit;
no push, merge, deploy, Backend or additional screen.

## Predictive Arc — visual acceptance correction — 2026-10-04

Historical record for `aa05fc9`: user review **rejected both visual fidelity and
perceptible motion**. Its visual-success statements below are superseded by the
rendered-pixel audit and placement correction that follow.

- [P1, resolved in code; awaiting user review] `842dd43` mounted a valid shader but
  failed the requested visual identity. Live inspection ruled out reduced motion,
  fallback, capability detection and broken stacking. The 0.3 opacity, low-contrast
  colors, bottom peak erased by the fade, flat exported preset and panel coverage
  made the field effectively imperceptible; disabled pointer response removed
  another defining behavior.
- Actual supplied source was rendered in isolation first. Its exact exported
  red/flat preset and its own curved base with violet palette were captured and
  inspected. Browser-only attenuation removal confirmed compositing worked.
- Same unchanged shader now uses the source's curved 35/70 base, preserved 206
  thickness, 600 falloff, 78 density and 102 dot size; original speed 100 and
  radius 236 / 34% pointer response. A 640px content-only field, opacity 0.9 and
  bright violet highlights are clearly visible at idle and during interaction.
  Fade is below the curved concentration; sidebar remains wholly excluded.
- Static fallback draws the source's curve/dot/palette/time-zero math on resize
  in Canvas 2D, with no frame loop. Mobile opacity 0.6; reduced motion/no-WebGL
  retain the actual visual identity instead of a generic gradient. Only fallback
  edge antialiasing differs from the GLSL path.
- Current-run artifacts: `C:/Users/User/Desktop/Loor/output/predictive-arc-correction-20261004`.
  Exact source, source curve/pointer, rejection, attenuation ablation, corrected
  1672 × 941 / 1440 × 810 / 1280 × 810 / 900 × 800 / 390 × 844 / 320 × 700,
  paired comparison, reduced/no-WebGL and Login captures were inspected.
- No horizontal overflow; visible desktop/tablet dot field and static mobile.
  Text/panels stay readable and unchanged. Arc visibility no longer requires
  searching for a small bottom-gap texture. Cards intentionally obscure some
  of the full arc; this is environmental placement, not a full hero replacement.
- Normal desktop uses WebGL; reduced/mobile/no-WebGL use the visible static
  canvas. Pointer shader readback reached 0.340 with normalized CSS coordinates.
  Offscreen GPU buffer shrank to 1 × 1; context loss/fallback/restoration passed.
- Login layout, required errors/first-invalid focus, password toggle, normal
  Wordmark and reduced-motion heading/static behavior passed. Carousel, Glass,
  Login, tokens and shell/panel layout files have no changes in this correction.
- TypeScript, oxlint, production build and staged diff-check passed. Console
  clean; fresh 76-request sample stayed localhost-only with zero failures.
  Temporary source isolation and browser-only test overrides were removed.

**Correction result: ready for another visual review, not yet user-approved.**
One local correction commit only; no push/merge/deploy/Backend. Source comparison,
parameter changes and evidence limits are detailed in the existing integration report.

## Predictive Arc — rendered motion / placement correction — 2026-10-04

Starting clean `aa05fc9` on `feature/super-admin-dashboard-v1`. Scope: Arc only;
moving its mount from AppShell to the overview illustration is explicitly authorized.

1. **Rejected state — failure confirmed.** A live post-draw GPU sample changed
   about 50% of pixels by >8/255 at ~1s intervals, so the shader was not frozen.
   The actual page hid its luminous center under opaque panels. Unscaled 206%
   pixel thickness across a short field also made it resemble a dot grid.
   Reduced motion was false; document visible; WebGL active; four reported cores.
2. **Source comparison — passed.** Temporary same-runtime side-by-side showed
   the supplied curved base, unoccluded integration and actual overview panel.
   Both shader strings remain identical to the supplied source. Original wave,
   dot coverage, color blending and pointer interpolation are not recreated.
3. **Corrected desktop — passed for another user review.** Continuous violet
   curved band surrounds the Control Plane illustration, inside the overview
   panel rather than behind other cards. Source 800px coordinates normalize
   thickness, wave spacing and pointer radius into the smaller surface.
   The native RAF cadence replaces the old 30-draw throttle; actual current
   browser draw sample: 22 draws / 1001ms, uTime 248.811 → 250.521. This is not
   a guarantee of a particular frame rate on other hardware.
4. **Actual image changes — passed.** Full PNG screenshots, cropped offline to
   the same 443 × 200 Arc/illustration area, at 0 / 1.084 / 2.079s. uTime
   244.462 / 246.382 / 248.211, pointer strength zero. Pixels changing >8/255:
   **14.22% / 14.75%**; >24/255: **7.83% / 8.03%**; maxima **130 / 146**.
   Luminous areas visibly travel along the band; not merely numerical changes.
5. **Pointer — passed.** At fixed uTime=2, actual left/center/right mouse events
   produced visible band bending. Pixels >8/255 versus away:
   **9.65% / 11.42% / 9.29%**. All temporary overrides removed afterward.
6. **Responsive / fallbacks — passed.** 1672, 1440, 1280 and 900px show WebGL;
   390/320px retain dim static source-shaped background in the copy-only panel.
   No horizontal overflow. Reduced and forced no-WebGL retain a visible Arc.
   At 1280px, scrolling to 643px makes it genuinely offscreen: static, GL not
   ready, buffer 1px; returning resumes. Sidebar remains excluded.
7. **Regression / engineering — passed.** Carousel, Glass navigation, illustration,
   shared tokens and Login source unchanged. Login required validation,
   first-invalid focus, email → password → toggle order, password visibility,
   responsive layout and reduced motion verified. TypeScript, oxlint, production
   build and diff-check pass; console has no warnings/errors.

Artifacts: `C:/Users/User/Desktop/Loor/output/predictive-arc-motion-20261004`.
Accepted: `05-final-source-comparison.jpg`, `time-comparison.png`,
`pointer-comparison.png`, `10-final-dashboard-1672.jpg`, responsive desktop/tablet/
mobile captures, `06-reduced-motion.jpg`, `07-no-webgl.png`, Login captures and
JSON measurements. Invalid post-presentation black buffers, origin-wrong crops
and the transient blank `07-no-webgl.jpg` were rejected, never acceptance evidence.

**Developer visual checks: curved identity YES; visible motion within 2–3s YES;
visible pointer response YES. Ready for user review, not claimed user-approved.**
One local commit only. No push, merge, deploy, Backend or Product expansion.

## Dashboard V1 — final combined composition review — 2026-10-04

Starting clean `8c73f5b619ff52e4203eb794901ba9988a538a90`, on
`feature/super-admin-dashboard-v1`. Architecture DOCX inspected as context only;
no new functionality or asset was introduced.

1. **Combined desktop — balanced.** Observed for 22.63 seconds with five timed
   captures, then exercised the Arc, sidebar, search and notifications. The Arc
   remains recognizable, visibly animated and confined to the overview artwork.
   The 3500ms Carousel is readable; its reserved slot keeps adjacent controls
   stable. Glass selection is clear, with restrained inactive rows. No effect
   needs removal or attenuation. The Carousel adds the least functional value.
2. **Interaction / semantics — passed.** Stable accessible H1 `Dashboard Global`;
   rotating title and Arc are aria-hidden. Dashboard has aria-current=page.
   Keyboard focus is visible. Search/navigation/header controls give honest
   local prototype feedback, without API/authentication integration. Pointer
   influence reached 0.599 inside the artwork and decayed to 0.0015 at the sidebar.
3. **Responsive — passed.** Dashboard checked at 1672x941, 1440x810, 1280x810,
   900x900, 390x844 and 320x800; scroll width equals client width throughout.
   Tablet icon labels remain accessible. Mobile Arc is static/dim; drawer
   primary targets are 48px high, utilities 44px, close control 40px. Dialog
   focus wraps both ways, background is inert, Escape restores menu-button focus.
4. **Combined fallbacks — passed.** Reduced motion holds `Global`, stops WebGL
   and shows the static Arc while retaining usable Glass keyboard focus.
   Forced unavailable WebGL also shows the source-shaped static Arc. All
   temporary browser overrides were restored; normal preview resumed.
5. **Login regression — passed.** Desktop, tablet and 390/320px reflow; no
   horizontal overflow. Required-field errors, first-invalid focus,
   email -> password -> toggle keyboard order and password visibility passed.
   Reduced motion stops AmbientTerms/Wordmark; heading remains complete.
   Forced no-WebGL leaves readable static SUPER ADMIN. No successful login or
   external authentication was attempted; synthetic input was cleared.
6. **Performance smoke check — passed with limits.** Current runtime sampled
   60 draws in 1009ms on a 443x200 WebGL surface. At 1280px/scrollY=643 it
   stopped drawing, disposed its buffer to 1x1, and resumed on return.
   Glass stops its RAF when settled; Carousel cleanup/visibility gating reviewed.
   No observed interaction lag or console warnings/errors. This is not a
   long-duration leak audit or a guarantee for all hardware.
7. **One accessibility refinement.** Sidebar footer copy changed only from
   #6f7c92 to the existing --text-on-dark-muted token (#8f9cb4). The former has
   at most 4.23:1 contrast even against the darkest #121726 background;
   the replacement provides additional headroom for the decorative backdrop.
   Arc, Carousel, Glass behavior, shared tokens and Login remain unchanged.
8. **Architecture / language.** Global Control Plane and multi-whitelabel
   supervision are clear. Plataformas/Whitelabels overlap as concepts;
   rotating Operacoes is decorative, not a changed filter, while navigation
   uses Operacao. Future discussion: platform vs tenant naming, Sistema vs
   Auditoria grouping, scope-selector behavior and Core-authoritative metrics.
   These are Product questions, not functionality added during this review.

Current-run captures: `C:/Users/User/Desktop/Loor/output/dashboard-final-composition-20261004`.
Final review uses the inspected full-page captures for sharp visual evidence;
timed/pointer PNGs additionally document motion states. Focused accessibility
checks do not constitute full WCAG or screen-reader certification.

**Developer recommendation: B — approve with the single minor contrast
refinement above. Ready for final user visual approval; promotion to dev is
conditional on that approval.** TypeScript, oxlint, production Vite build and
diff-check pass. One local refinement commit; no push, main/dev unchanged,
no deploy, no Backend and no additional screen. Local preview stays on port 5173.
