# Whitelabels V1 — OriginKit opportunity mapping

Date: 2026-10-04. Review only: no new OriginKit integration, dependency, asset ID,
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
