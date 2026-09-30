# Super Admin Login V1 — OriginKit selection map

This is a selection guide, not an asset selection or integration. The approved
reference remains [`reference/super-admin-login-approved.png`](reference/super-admin-login-approved.png).
The current login is one frontend-only screen; the form must remain ordinary,
accessible React controls. No OriginKit asset ID has been selected.

OriginKit currently describes itself as a source-copyable component, section and
template catalog, including animated visual components. A catalog search is a
**candidate search**, not proof that a particular illustration exists. Any
selected visual must be checked against the approved image before integration.
See [OriginKit's catalog](https://www.originkit.dev/) and
[component approach](https://www.originkit.dev/docs/why-originkit).

## Recommendation matrix

| Area | Current implementation | Keep / OriginKit | Priority | Asset type | Suggested searches | Format / size / background / motion | Reuse potential | Rationale and replacement complexity |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Central layered platform | Isometric-looking layered slab in the isolated `PlatformIllustration` SVG | **OriginKit candidate** | **High** | Decorative visual component or exportable illustration | `layered platform`, `isometric glass`, `glass icon`, `control hub` | Fit the existing 710 × 540 SVG scene; central subject roughly 250 × 180 scene units; transparent; static first, restrained motion only with reduced-motion fallback | High: login, future empty states and Super Admin overview | Greatest remaining visual difference: current slab is flatter and less nuanced than the approved artwork. The illustration container is already decoupled; a static swap is a **small code change**, while a shader/interactive component could become a **structural change**. |
| Orbit and node network | SVG ellipses, curved links and glow nodes inside `PlatformIllustration` | **OriginKit candidate**, only if it matches the reference | **Medium** | Subtle network/particle component or transparent overlay | `network nodes`, `light cables`, `matrix junction`, `particle orbit` | Around 710 × 540 scene units; transparent overlay; static preferred, optional slow motion with reduced-motion fallback | Medium–high: a restrained institutional motif across future Super Admin surfaces | Could add depth and continuity, but should not obscure the form or increase load cost. **Small code change** for an overlay; **structural change** if canvas/shader-based. |
| Orbiting administration cards | Five translucent SVG cards with Lucide company, users, product, report and settings glyphs | **OriginKit candidate for card treatment; keep semantic glyphs native** | **Medium** | Glass-card or decorative icon-shell treatment | `glass icon`, `floating card`, `glass panel` | Each about 105–130 × 110–125 scene units; transparent; static or very subtle motion | High if the same visual grammar appears on future overview screens | A coordinated set may better match the approved material/shadow treatment. Preserve the recognizable Lucide symbols and card count. **Small code change** if the shells are swappable. |
| SUPER ADMIN identity/wordmark | Accessible HTML text with tracking and uppercase CSS | **Keep native** | Low | None | Not needed | Responsive text, no image background or animation | High as typography, not as an asset | Current lettering closely matches the approved image and remains sharp, selectable and accessible. Replacing it with an image would be a regression. **Visual-only** tuning if a future brand system requires it. |
| Security notice and help link | Lucide shield, HTML copy and an ordinary button | **OriginKit not recommended** | Low | None | Not needed | Native 37 px icon badge and text; no animation | High as a native component | This is trust and action copy, not hero artwork. A decorative asset adds complexity without improving clarity or accessibility. |
| Dark-panel spheres, diagonal lines and dot grid | Lightweight backdrop SVG plus CSS dot grid | **Keep native for Login V1** | Low | Optional future background motif | `subtle grid`, `wire terrain`, `particle drift` | Panel-sized, dark and low contrast; opaque background or transparent overlay; static first | Medium for future branded surfaces | The current backdrop already matches the approved tone and is inexpensive. An animated replacement risks distraction; consider only after a broader Super Admin visual system exists. **Visual-only** if static, potentially **structural** if animated. |
| E-mail/password controls, labels, eye toggle, validation, focus, primary button | Semantic React inputs/buttons with CSS Modules and Lucide icons | **Keep native** | High to preserve | None | Not needed | Responsive HTML/CSS; no visual asset | High as reusable form primitives | These controls need keyboard access, labels, error association and reliable focus. OriginKit would add little value and could complicate the core task. |

## Top three searches

1. `layered platform` / `isometric glass` / `control hub` — first look for the central visual, the highest-value opportunity.
2. `network nodes` / `light cables` / `matrix junction` — only if a restrained, transparent network can match the approved scene.
3. `glass icon` / `floating card` — look for a coordinated administrative-card treatment, not replacement of their Lucide meanings.

## Swap boundary

The form, wordmark, background and illustration placement remain independent.
Replace only `PlatformIllustration` or its decorative subparts after the user
chooses an asset. Keep the desktop 47/53 composition, current 710 × 540 scene
slot, accessible decorative hiding and the mobile text-only fallback. Do not
add a general asset framework or install OriginKit during Login V1.
