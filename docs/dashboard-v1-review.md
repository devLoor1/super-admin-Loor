# Super Admin App Shell + Global Dashboard V1 — review

Date: 2026-10-04. Scope: frontend-only visual prototype; one local feature commit,
no push, merge, deployment, Backend, API, authentication or new destination screens.

This is the baseline review at `9aec697`, before the separately authorized
OriginKit integrations. Current integration evidence and the architecture
reconciliation are in [dashboard-originkit-integration.md](dashboard-originkit-integration.md).
Statements below about no new dependency/OriginKit asset describe that baseline.

## Recovery and ownership

- Starting branch: `feature/super-admin-login-v1`.
- Approved base: `b54329cccebb3e7a6018bfdb5aadd41609fa97bf`.
- Local `dev`, `origin/dev`, Login feature and its remote all matched that base.
- Local/remote `main`: `c2235ac5d0d65408e9d39bf836a1a717da3d95ae`.
- Origin: `https://github.com/devLoor1/super-admin-Loor`.
- Claude's uncommitted App Shell/Dashboard source, README, styles, shared Login SVG
  extraction and approved Dashboard PNG were recovered intact.
- Created `feature/super-admin-dashboard-v1` at the approved base without discarding
  the working tree. No Login-feature history was rewritten.

## Assessment

Claude's implementation is a good foundation: visual proportions closely follow the
approved Dashboard at 1672 × 941, modules are isolated, repeated surfaces/icons/empty
states are shared, and responsiveness uses native grids/container queries without
new dependencies. The shell owns navigation mechanics; Dashboard components own
their presentation. A small notice context avoids meaningless fake destination pages.

The hierarchy, panel positions, sidebar width, icon vocabulary, typography, spacing,
navy/violet palette and restrained depth follow the reference. Deliberate differences:
the shared illustration has a slightly stronger glow and different icon geometry;
dates show the actual last-30-day window; the empty distribution ring is now muted
and unsegmented so it does not imply fabricated shares. These are not a redesign.

Initial weaknesses were incomplete drawer focus containment, focus-return side
effects inside a React state updater, an active search shortcut behind an inert
drawer, no skip-navigation link, a 22px-wide menu target at 320px, and equal colored
ring segments that could still look like measured percentages. Those were refined.

Remaining prototype limits: all business panels are empty, tenant switching/search/
notifications are notices only, there is no permissions/session model, and a full
screen-reader/automated accessibility audit has not been performed. Ready for visual
review does not mean operationally integrated or Production-ready.

## Architecture input and boundaries

Read `C:/Users/User/Downloads/Arquitetura_Super_Admin_LOOR_V1.docx` as guidance, not
an immutable Product specification. No Backend repository or service was used.

| Domain | Prototype alignment | Future boundary, not implemented here |
| --- | --- | --- |
| Dashboard / Control Plane | Global supervision, not a tenant Admin or duplicate wallet | Aggregates should come through the Control Plane, calculated authoritatively in the Core; no financial arithmetic invented in frontend. |
| Platforms | Dedicated navigation and Whitelabel shortcut | Tenant management, administrators, settings/SMTP require explicit tenant context and permissions. |
| Operation | Opportunities/Investors surfaced; domain entry retained | Investor/Entrepreneur consultation versus narrowly authorized Opportunity actions must remain distinct. |
| Financial | Payment KPI, Wallet status and consultative shortcut | Keep Wallet a separate read domain; do not introduce generic balance/payment edits. Gateways are configuration management, not transaction controls. |
| Compliance | KYC KPI and neutral integration state | Readback states, not decorative health guesses or inferred approvals. |
| Audit / governance | Event-table structure and Auditoria entry | Real audit evidence, actor/tenant/correlation metadata and permission boundaries are future contracts. |

Global context is appropriate today. The selector intentionally stays `Visão global`
without invented tenants. Future context selection must distinguish aggregate scope
from a requested tenant filter; a frontend filter is never authorization. Any future
frontend client talks to the Control Plane only, never Core internal routes or
service credentials. This is a design boundary, not an implemented integration.

### Points to revisit before later screens

1. Resolve navigation taxonomy: the document nests Auditoria under Sistema, while
   the approved image has both entries. Clarify global Sistema/Configurações versus
   tenant platform settings. Preserve the approved top-level visual for now.
2. Define aggregate semantics, freshness, date range/time zone, error/partial states
   and global-versus-tenant KPI meaning. The document's full KPI list also includes
   Entrepreneurs, investments/volume and Wallet; today's five-card prototype is
   not a promise that those requirements have been implemented or rejected.
3. Separate configured integration state from actual service health. The document
   defers advanced monitoring; `Status operacional` must not silently become a
   health-check promise. Every current state says `Aguardando integração`.
4. The independent Control Plane deployment/database technology is an architectural
   proposal with operational costs, not a frontend requirement. Confirm ownership,
   operations and permissions before selecting authentication/client infrastructure.
5. Keep audit and actor/tenant permission checks with every future critical action,
   rather than interpreting the document's late "Governança" phase as permission to
   postpone them. No write actions were introduced in this prototype.

These decisions do not block this shell review and are not resolved by fake pages,
fake metrics or Backend work.

## Codex refinements and decisions

- Modal mobile drawer: labelled dialog, Tab/Shift+Tab wrap inside, Escape and scrim
  close, inert background, body-scroll lock, disabled outside-toast interaction,
  return focus after inert is cleared. Breakpoint exit returns focus to the persistent
  active link, not a hidden mobile button. State updater is now pure.
- First-in-document skip link focuses `<main>` without corrupting the route hash.
- Ctrl/Meta+K stays local and is inactive while the background search is inert.
- At widths ≤359px, tighten only mobile brand tracking/spacing and hide the redundant
  user chevron; preserve the 40px menu tap target. Wider approved layout is untouched.
- Distribution ring: unsegmented muted skeleton, no invented share. Legend slots are
  explicitly decorative, not tenant records. No names, money, counts or percentages.
- Readable 1:1 desktop treatment retained. At 1440 × 810 the document is 967px tall,
  requiring 157px vertical scroll. Below 1360px rows restack instead of scaling small
  text down. Future real data should use pagination/appropriate panel states, not a
  whole-page transform to force a single viewport.
- Keep the two-view hash switch: dependency-free and honest for the current prototype.
  It is not a security guard. Adopt real route/layout/error/permission handling when
  actual destination screens and contracts exist, not merely to add infrastructure.
- Tokens: already share type, accent, motion and focus semantics. Neutral Login
  blacks and navy Dashboard surfaces remain deliberately different; no cosmetic
  aliasing/merging with no actual benefit. No new package or lockfile changes.
- No new OriginKit asset integrated. Recommendations are in
  `dashboard-originkit-mapping.md`.

## Validation evidence

Local evidence directory:
`C:/Users/User/Desktop/Loor/output/super-admin-dashboard-review-20261004`.
Captures are local QA artifacts, not added runtime assets or committed dependencies.

| Dashboard CSS viewport | Document scroll width | Document height | Result |
| --- | --- | --- | --- |
| 1672 × 941 | 1672 | 941 | Reference layout, 262px sidebar, no overflow |
| 1440 × 810 | 1425 | 967 | Readable compact KPIs, 232px sidebar; 157px vertical scroll |
| 1280 × 810 | 1265 | 1429 | Stacked rows, no horizontal overflow |
| 900 × 800 | 885 | 1706 | 76px icon rail, 3+2 KPI grid, no horizontal overflow |
| 390 × 844 | 375 | 2609 | Single-column mobile, no horizontal overflow |
| 320 × 700 | 305 | 2879 | Single-column mobile; 40px menu, no horizontal overflow |

Scrollbar gutters explain 15px differences; widths were read from the live document,
not inferred from screenshots. Vertical scrolling on small screens is intentional.

Login was captured at the same six widths. Scroll widths were 1672, 1440, 1280, 885,
390 and 305 respectively; no horizontal overflow. Desktop/tablet illustration remains
visible; mobile intentionally hides it. Login illustration definitions and visible
SVG tree match `b54329c` after normalizing definition placement/attribute order.
The surrounding Login source/CSS, Wordmark, AmbientTerms and TypeOnceHeading were
not changed. Compared normalized Login reference + current 1440 capture together;
no new regression beyond previously approved motion/illustration differences.

Keyboard/runtime checks:

- Drawer initial close-button focus, first/last wrap in both directions, background
  inert and scroll lock, Escape return, scrim tap, breakpoint exit and focus return.
- Skip link reaches main and retains `#/dashboard`; Ctrl+K focuses search only when
  drawer is closed. Search Enter yields prototype feedback.
- All 22 Dashboard button controls gave prototype notices and stayed on the Dashboard
  URL; no fake destination, data or authenticated identity was created.
- Login empty/malformed-email validation and first-invalid focus; tab sequence E-mail
  → Senha → Mostrar senha → Entrar → recovery; password toggle changes input type
  and accessible label; valid synthetic inputs/recovery produce local notices only.
- Reduced-motion initial load: readable static Wordmark, no canvas, no ambient
  animation; full heading. Forced WebGL-denial remount: canvas not ready, static text
  stays white/readable. Temporary browser-only denial was removed by reload and
  normal WebGL readiness returned. No QA switch added to source.
- No runtime warning/error in the current preview log. Source audit finds no fetch,
  Axios, XMLHttpRequest, API client or external network code. Observed network
  requests stayed on `127.0.0.1:5173` (source/modules/fonts/favicon and development
  HMR); no Backend/auth/financial request. Self-hosted Inter remained local.
- Manual DOM/AX and keyboard checks passed. No existing axe runner/bundle was
  available; no automated 0-violation claim or full WCAG certification is made.

TypeScript, oxlint, production Vite build and `git diff --check` passed. See
`design-qa.md` for visual evidence/state details. No Product scope expansion.

## Local handoff

- Login: `http://127.0.0.1:5173/`
- Dashboard: `http://127.0.0.1:5173/#/dashboard`
- Development server remains frontend-only and running on port 5173 for review.
- One local commit on `feature/super-admin-dashboard-v1`; no push or deployment.
- `dev`/Login feature remain `b54329c`, `main` remains `c2235ac`.
- Ready for user review before any promotion; real data/auth/integration are separate
  future work, not part of this commit.
