# Super Admin Whitelabels V1 — review

Date: 2026-10-04. Scope: frontend-only visual prototype of the Whitelabels
list/detail page inside the approved App Shell. No Git operation, Backend, API,
authentication, persistence or additional screen was introduced by Claude.

Approved reference: [`reference/super-admin-whitelabels-approved.png`](reference/super-admin-whitelabels-approved.png)
(1672 × 941). Route: `#/whitelabels`.

## Claude's initial implementation (historical snapshot)

The description below records the incoming work, not the final Codex-refined state.
The final review and validation section at the end supersedes checkbox/copy/shared
ownership details and open implementation items in this historical snapshot.

- `WhitelabelsPage` inside the unchanged `AppShell` (title "Whitelabels",
  breadcrumb "Whitelabels", context selector/search/notifications/user kept).
- Four data-ready KPI cards (Total de plataformas, Ativas, Em configuração,
  Integrações): "—" + "Aguardando integração". The shared Dashboard `MetricCard`
  is reused; only its padding is tightened through a page-scoped container query.
- "Lista de white labels" panel: "Novo white label" (prototype notice), labelled
  search, native status select, quick chips (Todos / Ativos / Em configuração /
  Inativos, synced with the select), sortable columns (Nome, Domínio, Status,
  Atualizado em), selectable rows, row actions (notice), result count and
  inert pagination (page 1, arrows disabled).
- Detail panel bound to the active row (default Finapop): avatar, name,
  "white label • ID: wl_proto_0x", tabs (only Visão geral has content),
  Informações principais (Status, Domínio + copy, Slug + copy, Última
  atualização "—", Editar notice), summary cards (Administradores, Aplicações
  vinculadas, Integrações: "—" / "Aguardando dados"), and five quick actions
  (Configurações, Administradores, Aplicações, Integrações, Indicadores →
  notices).
- Rows are illustrative (`prototypeWhitelabels.ts`): names, domains, slugs and
  statuses from the image; IDs are prototype IDs; every count/date is empty.

## Shared-file changes

| File | Change | Effect on other screens |
| --- | --- | --- |
| `src/app/App.tsx` | Adds the `whitelabels` view, title and shell theme-color. | None. |
| `src/components/shell/navigation.ts` | `Plataformas` gets `href: '#/whitelabels'`. | Dashboard sidebar now navigates to Whitelabels on Plataformas instead of showing a notice; pixel-identical. |
| `src/styles/tokens.css` | Adds `--status-*` tokens (success/warning/neutral/muted). | None (new tokens). |
| `src/styles/global.css` | Dark body selector also matches `data-view='whitelabels'`. | None. |

New generic UI: `PrimaryButton`, `StatusPill`, `SearchField`, `SelectField`,
`FilterChips`, `Tabs` (+ `tabIds.ts`). Dashboard and Login source are unchanged.

## Navigation decision

The reference image shows "Whitelabels" and "Aplicações" as sidebar items and no
"Sistema". Per the user's Product decision the approved App Shell navigation is
kept unchanged; **Plataformas** is the active parent area on this page. Final
taxonomy is a separate future decision.

## Visual comparison at 1672 × 941

The page fits the viewport (document height 941, no scroll) like the reference.

Close matches: header, KPI row, panel split (list ≈ 794px / detail ≈ 531px),
table column order and positions (±8px), active-row treatment, status pills,
tabs, information rows (31px pitch), summary cards, quick-action grid and
pagination placement.

Deliberate or known differences:

1. Sidebar keeps the approved shell (262px vs ≈251px in the image), so content
   starts ≈12px further right and the panels are ≈6px narrower.
2. Sidebar items differ (navigation decision above).
3. Header search shows "Ctrl K" (shell) instead of "⌘ K".
4. KPI cards are equal width; the image's cards vary slightly. Values are "—".
5. Quick-action descriptions wrap to two lines at 11px; the image uses ≈9.5px
   text on one line. "Aplicações vinculadas" wraps in its summary card for the
   same reason. Minimum text size was preferred over pixel fidelity.
6. The header checkbox is indeterminate when one row is selected (correct
   tri-state); the image shows it empty.
7. Footer adds "· 1 selecionado · Dados ilustrativos" after "Mostrando 3 de 3
   resultados".
8. Detail ID is `wl_proto_01` instead of the image's `wl_01F8A2`, so it cannot
   be mistaken for a real identifier.

## Claude-reported pre-review validation (historical, not Codex audit evidence)

- `npm run typecheck`, `npm run lint` (oxlint, deny warnings) and
  `npm run build` pass. No dependency or lockfile change.
- Horizontal overflow: none at 1920, 1672, 1600, 1536, 1440, 1366, 1360, 1359,
  1280, 1200, 1199, 1024, 900, 820, 768, 767, 600, 480, 430, 390, 360, 320px.
  No table cell content overflows its column at any of these widths.
- Document height: 941 (1672 × 941), 1096 (1440 × 810), 1488 (1280 × 810),
  1639 (900 × 800), 2625 (390 × 844), 2668 (320 × 700).
- 61 scripted interaction checks passed (Playwright, production build):
  search by name/domain/slug (accent/case-insensitive), empty state + "Limpar
  filtros", chip/select sync, sorting and `aria-sort`, mouse and keyboard row
  activation, tri-state selection without changing the detail, tabs
  (Arrow/Home/End, wrap, roving tabindex), clipboard copy, every prototype
  notice, unchanged URL, disabled pagination, Plataformas navigation from the
  Dashboard and browser Back, mobile drawer (Plataformas current, Escape) and
  mobile row → detail scroll.
- axe-core: 0 violations at 1672px and 390px (QA tool only, not a project
  dependency; not a WCAG certification).
- Network: only same-origin assets; no API, Backend or third-party request.
  Console: no warnings or errors.
- Regression: Login (1440 × 810, 390 × 844) and Dashboard full-page captures
  (1672, 1440, 390) are pixel-identical (0 differing pixels) to captures taken
  before this phase.

## Points for Codex review

1. Page-scoped `MetricCard` density override (`.summaryCell > article`) — consider
   a `density` prop when MetricCard moves to `components/ui`.
2. `MetricCard` is imported from `features/dashboard`; quick-action tile styles
   resemble the Dashboard quick actions. Candidates for shared components.
3. Main landmark id is still `dashboard-content` (shell-owned skip link target).
4. On the Dashboard, the "Ver Whitelabels" quick action and the "Whitelabels" KPI
   still show a Plataformas-module notice instead of linking to `#/whitelabels`;
   Dashboard was intentionally not modified in this phase.
5. Row selection has no bulk action yet — decide whether to keep checkboxes.
6. Detail tabs scroll horizontally on phones without a visual overflow hint.

## Open Product / terminology questions

- "white label" vs "whitelabel" vs "Whitelabels" (page title) and grammatical
  gender ("Novo white label" vs "desta white label").
- Relationship between Plataformas (nav) and Whitelabels (page), and whether
  "Aplicações" becomes a top-level domain.
- Authoritative status model (Ativa / Em configuração / Rascunho / Inativa?) and
  who can transition between states.
- KPI semantics (what counts as "Integrações"; global vs tenant scope).
- Whether slug is editable, unique and shown publicly; domain verification state.
- Which detail tabs (Administradores, Aplicações, Integrações) and quick actions
  belong to tenant-scoped screens vs global configuration.

The architecture document referenced by the brief was not attached in the
Claude session; Codex has now read the supplied DOCX as contextual guidance.

## Codex final review — 2026-10-04

### Repository and scope

- Incoming branch: `dev`, HEAD and live `origin/dev`
  `c07bcb7d6f32d374466377eb0ef96ee0294d1dc9`. Claude changes were uncommitted.
- Created `feature/super-admin-whitelabels-v1` from that exact base without
  discarding any work. Main and Dashboard feature refs remain unchanged.
- One local commit contains Claude implementation, the refinements below,
  this review and the OriginKit mapping. No push, merge, deploy, Backend,
  authentication, persistence or new destination module.

### Assessment and refinements

Claude provided a good foundation: clean page-local state, existing shell/tokens,
semantic table, local search/filter/sort, independent generic controls and honest
empty KPI/count/date states. Main weaknesses were two competing selection models,
mixed terminology/gender, feature-to-feature KPI ownership, stale detail under
filters, implicit Product scope and mobile tab discoverability.

1. **Terminology:** use Whitelabel / Whitelabels and masculine copy consistently
   within this screen (Novo Whitelabel, Ativo/Inativo, deste Whitelabel). This is
   a consistent prototype editorial choice, not a final organization-wide glossary.
   Existing approved Login copy is deliberately untouched.
2. **Selection:** removed header/row checkboxes and unused Set state/CSS. No
   credible bulk purpose is established. Name-button keyboard activation and
   mouse row activation drive one highlighted detail. No bulk action invented.
3. **Detail/filter coherence:** preserve the selected row if it is still visible;
   otherwise show the first matching row. Zero matches clear detail into a neutral
   empty state. A polite status announces the displayed identity. On phones,
   selection focuses/scrolls the detail region; reduced motion uses immediate scroll.
4. **Product honesty:** footer/caption mark all data and statuses as illustrative;
   detail says Whitelabel ilustrativo and Status proposto. Rascunho and Em
   configuração remain reference-derived proposals, not an official enum.
   Aplicações is explicitly a visual concept in summary, quick action and tab.
   Future tabs/actions do not imply that modules already exist or persist data.
5. **Shared ownership:** moved MetricCard and its CSS unchanged into components/ui,
   with a compact-density option replacing the page's structural article override.
   Dashboard keeps default density. Renamed shell skip-link/main ID to app-content
   in all three locations. Other shared controls remain small and domain-neutral.
   Quick-action tile extraction is deferred: Dashboard/detail density differs,
   and no present duplication warrants a broader refactor.
6. **Existing Dashboard connections:** only Whitelabel KPI and Ver Whitelabels
   now navigate locally to `#/whitelabels`; other module notices remain. Sidebar
   Plataformas already navigates there. No sidebar hierarchy redesign.
7. **Mobile tabs:** thin scrollbar plus a small swipe/arrow hint. Browser testing
   found keyboard focus could leave the last tab clipped; focus now explicitly
   scrolls the tab into view without animated scrolling.

### Architecture and Product boundary

Source: Arquitetura_Super_Admin_LOOR_V1.docx, 2026-09-14. It is contextual
guidance, not new authorization or an immutable Product specification.

| Topic | Proposed in architecture | Still requires Product/contract definition |
| --- | --- | --- |
| Terminology/hierarchy | Whitelabels under Plataformas (§6, §8, §31) | Final glossary, submenu presentation and other platform capabilities |
| Statuses | Activate/deactivate; active/inactive indicators (§7–8) | Exact enum/transitions; Em configuração and Rascunho are not established |
| Domain | Platform settings / Whitelabel detail | Verification ownership, pending/failed states, primary/custom domains |
| Slug | No definitive mutability/uniqueness rule found | Format, uniqueness, editability, collision handling, public exposure |
| Tenant/global settings | Core owns tenant settings; Control Plane orchestrates (§4, §10) | Editable field set, override precedence, tenant versus global navigation |
| Administrators | Admins belong to Whitelabels, distinct from Super Admin (§9) | Role granularity, cross-tenant membership, invite and management permissions |
| Applications | No separate Applications management domain established | Meaning of linked application, ownership, counts and V1 inclusion |
| Integrations | SMTP and gateway by tenant (§11, §18) | Generic API/webhook connector scope is not established; not implemented |
| Indicators | Core-authoritative global/by-tenant data (§7–8) | Exact metric/count/time-window definitions; no totals inferred from mock rows |
| Activation | Specific Core service and audit/RBAC (§8, §20, §24) | Required permission, confirmation, dependency checks and consequences |

The screen is structurally compatible with that direction: list/search/detail
and visible future tenant destinations. It is NOT an implemented Control Plane
client or real tenant-management product. No architectural business operation was
silently created to satisfy a visual concept.

### Current-run visual/interaction evidence

Capture folder: `C:/Users/User/AppData/Local/Temp/super-admin-whitelabels-review-20261004`.
Screenshots are local QA artifacts, not project/runtime dependencies.

| Step | Captured evidence | Health / observations |
| --- | --- | --- |
| 1 Incoming desktop/mobile | 01-claude-1672.png, 02-claude-390.png | Good fidelity; competing checkboxes/detail selection and hidden mobile tabs |
| 2 Refined desktop | whitelabels-final-1672.png; reference-versus-refined.png | Approved composition preserved; ~794px list / ~531px detail; no scroll at 941px |
| 3 Search/filter/empty | 04-empty-results.png | Accent/case/trim search, domain and slug search, coherent chip/select, sorting, clear-filter recovery; no stale detail |
| 4 Detail tabs | 05-concept-tab.png | Arrow/Home/End/wrap, one tab stop, honest future/concept content, copy domain/slug succeed |
| 5 Phone selection/keyboard | 06-mobile-detail-keyboard.png | Selected detail gets focus; End tab fully visible after fix; mobile menu closes on Escape and returns focus |
| 6 Regression | dashboard/login before/after 1440 and 390 | Dashboard captures pixel-identical; Login mobile pixel-identical; desktop form unchanged, decorative backdrop phase differs |

Comparison to the approved reference was inspected side by side. Preserved: header,
KPI hierarchy, ~60/40 list/detail split, density, violet selected row, status pills,
tabs, information card, summaries, quick-action grid, typography/surfaces. Deliberate
differences: approved existing shell/nav (262px sidebar), honest prototype labels,
larger readable small copy, no unsupported checkboxes, masculine Whitelabel copy.
It is a faithful adaptation to the existing approved shell, not pixel identity.

| Requested viewport | Document height | Reflow / visible columns | Horizontal overflow |
| --- | ---: | --- | --- |
| 1672 × 941 | 941 | Side by side; all seven columns | None |
| 1440 × 810 | 1096 | Side by side; name/domain/status/date/actions | None |
| 1280 × 810 | 1488 | Stacked; all seven columns | None |
| 900 × 900 | 1639 | Icon rail, stacked; Applications column hidden | None |
| 390 × 844 | 2692 | Drawer, stacked; name/actions, inline domain/status | None |
| 320 × 800 | 2739 | Same, labels/details reflow, horizontally scrollable tabs only | None |

Measured scrollWidth equals clientWidth (desktop scrollbars consume 15px, so
clientWidth may be smaller than requested innerWidth). No visible table-cell
content overflow at the six widths. Full-page screenshots inspected.

### Validation and limits

- TypeScript, oxlint, production Vite build and git diff --check pass.
- Final clean reload + interactions: no console warning/error. Editing while Vite
  was running briefly exposed an intermediate removed-checkbox/import HMR mismatch;
  those old logs are not final runtime failures. Fresh clean-runtime.json records
  the post-edit check separately.
- Fresh captured network window: 98 requests, all 127.0.0.1:5173, no business/API,
  authentication or third-party request, no event truncation. Source has no
  fetch/axios/XMLHttpRequest or business API client. Vite asset/HMR traffic only.
- Accessibility: labels, caption/scope, aria-sort, text status, single active row,
  linked tab/panel IDs, roving tab index, Arrow/Home/End/wrap, visible keyboard focus,
  clipboard announcements, polite detail identity and skip link checked. No duplicate
  IDs or nested interactive controls. Mobile drawer inert/Escape/focus return passed.
- Login: required errors, first-invalid focus, email → password → toggle tab order
  and password toggle passed; synthetic inputs cleared, no successful auth submitted.
- Reduced motion used for controlled captures and mobile immediate scroll; existing
  Login/Dashboard fallback source was not modified. Normal motion preview restored.
- Limits: focused developer/browser checks, not a full WCAG, screen-reader, Safari,
  real-device or long-duration performance certification. Claude's historical axe
  result is not presented as a new Codex axe run. Desktop Login decoration is not
  asserted pixel-identical, although form/layout/source show no regression.

**Ready for user visual review: YES, as a frontend-only Whitelabels V1 prototype.**
No new relevant regression observed. Production functionality and unresolved Product
rules are not claimed complete. OriginKit opportunities are mapped separately;
no new OriginKit asset was integrated.
