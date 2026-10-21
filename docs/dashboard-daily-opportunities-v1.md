# Global Dashboard — Daily Opportunity Creation V1

## Approved metric / scope

`NEW_OPPORTUNITIES_BY_DAY` — currently registered Opportunity records grouped by **createdAt**, across every Whitelabel and every status. Fixed last 30 calendar days including today, timezone **America/Sao_Paulo**. This is not all-time Opportunity total, a status-transition/event history, money, payment, or a reconstruction of deleted records.

Title: **Novas oportunidades por dia**. Subtitle: **Oportunidades cadastradas por dia em todas as Whitelabels nos últimos 30 dias.** Period indicator is noninteractive; no unsupported period-selection path remains.

## Source and complete-coverage gate

Reuse the unchanged `listOpportunities` adapter/canonical authenticated GET with `{ page:1, perPage:100, search:'', sort:'createdAt', order:'desc' }`. No tenant, status, modality, search or invented date filter. No additional participant/Company/Investor requests.

Require the adapter's validated page1/per100/lastPage1, nonnegative safe total <=100, exactly total rows, unique valid Opportunity IDs, and a usable explicit-offset ISO creation instant for **every** record, including old/out-of-window records. Reject missing, naive, invalid rollover/calendar/time/offset dates rather than dropping records. The existing adapter's empty-lastPage normalization is retained; the observed live raw metadata was lastPage1. No shared Opportunity adapter behavior/identity rules changed.

More than100 or incomplete coverage renders a neutral warning, not a partial series or unbounded paging. There is no automatic reconciliation against the independent all-time KPI: they represent different populations/consultation times. A future server daily aggregate or supported date-filter/pagination contract is needed for growth.

## Calendar model and SVG

After a successful read, capture one consultation instant and derive one São Paulo date key. Build exactly30 ordered Gregorian calendar buckets (today + previous29), fill valid zero days, and map every valid source instant through the same IANA timezone. UTC-noon date carriers are used only for calendar arithmetic, never for record grouping. Source instants require a timezone and valid calendar date before Date.parse; no browser-local date assumptions or independent axis clock. Month/year/leap and historical timezone boundaries have focused tests.

Return only bucket date/label/count, start/end, period total, all-time source total and consultation timestamp. Do not retain record names, identities, participant fields, statuses or raw payload in the Dashboard read state/storage/logs.

Preserve the existing SVG456x154 plot, 442px last-x position, six date ticks, five horizontal intervals, zero baseline and theme. Thirty ordered line vertices are derived from actual integer counts; there is no smoothing that fabricates peaks, fake points, arbitrary metric or currency. Integer scale step=max(1,ceil(max/5)), top=step*5; zero is a real flat series with “Nenhuma oportunidade cadastrada neste período.” It is never an integration warning.

SVG and axes are decorative to assistive technology. A semantic description/range/timezone/period total and keyboard-operable native “Ver dados diários (30 dias)” disclosure expose a complete table with date/count for each day. Scroll region has visible focus and bounded200px height. No tooltip, new chart animation or chart library. Responsive tests cover1672,1440,900,390,320 with no page or table horizontal overflow.

## Lifecycle, errors and preservation

Dashboard-scoped session-version-keyed `useRemote`: one bounded read per chart mount or explicit retry, normal fresh read on return, abort on unmount/session change, stale-result protection and no use of lastData. No polling/cache/bus/payload persistence. Canonical auth/Bearer/correlation/20s timeout/central401 behavior unchanged. Source403 shows panel-specific denial without retry; loading/error states show no invented zero buckets or stale series. Retry only reloads the chart source.

Existing four KPIs retain their source semantics and perPage1 count reads. Investor Distribution component/style/model/hook and its177px donut are byte-identical to accepted e4c7b5e. KYC, Recent Events, Operational Status, shared shell/auth/routes, Whitelabel CRUD/Lifecycle, Menu Visibility, Finance and dependencies are unchanged. DashboardPage changes only its explanatory comment.

## Baseline and live pre-promotion feasibility — 2026-10-21

- Canonical/dev/live baseline `e4c7b5e4302691485ae588ad67800e5fe2c6def8`, clean. Previous homolog deploy `6ad8c9fdbcc67e3cac40d88e`, JS `index-DPem69ub.js`, CSS `index-BvG7_QNU.css`.
- Main `c2235ac5d0d65408e9d39bf836a1a717da3d95ae`; handoff `89a3b5058f52f981b3a1b06756d7f33a2a043f27`; neither may change.
- Last audited Control Plane source `9513cb3b714348ecb98f0b02e1663918d113b9a8`; Core `ed9daad508a5bd9b93c169a8b4f43d53a6096c13`. These source refs are not proof of deployed Backend SHA parity; no Backend/Core changes made.
- Rediscovered built-in browser initially at Login; user manually authenticated. No credentials handled or automatic login attempts. First authorized auth read timed out without HTTP; one bounded read revalidation succeeded, not treated as invalid credentials or justification to change auth/Render/CORS.
- GET `/api/auth/me` HTTP200, SUPER_ADMIN; safe correlation `7dca775d-45fc-41a5-9310-895885b72052`.
- Bounded unfiltered GET `/api/opportunities?page=1&perPage=100&sort=createdAt&order=desc` HTTP200; meta page1/per100/total78/lastPage1,78 rows,0 invalid dates/IDs, at `2026-10-21T17:54:59.315Z`; safe correlation `25d937af-90ae-48e3-b6e5-14c64f60a71d`.
- All-time status populations: review15/active33/finished29/archived1. Window `2026-09-22` through `2026-10-21`, São Paulo: **34** creations, daily counts30 buckets. Values are observed evidence, never app fixtures/hardcoded acceptance totals. Authoritative zero days are legitimate.

## Focused verification

- `scripts/check-daily-opportunities.mjs`:99 synthetic calendar/math/SSR/transport/source-boundary checks. Also run with process timezone Pacific/Kiritimati. Includes exactly100/zero/partial/>100 records, strict dates, midnight/offset/rollover/leap, all statuses, old/future exclusions, deterministic30 buckets, scales/point positions, accessible30-row markup, 401/403/network/timeout/5xx/malformed/cancel/stale-session safety and byte-identical protected source paths.
- Maintained Dashboard Read93, Investor Distribution48, Whitelabel/Auth Read49, Menu Visibility A/B/C1344+47, Opportunity/Company Read115, Lifecycle74, Operational CRUD37. Canonical useRemote lifecycle coverage retained; no historical invariants removed. Exact four chart-file allowlist amendments only; other Dashboard files remain protected.
- TypeScript/oxlint/production Vite build/diff checks pass before commit. Inherited bundle-size advisory remains nonblocking.
- Production-built **synthetic localhost** browser QA, not claimed as live E2E: positive27-source/22-period series; old-only and empty valid zero; invalid/missing/naive date, incomplete, malformed,403 and503 isolation; exactly one read/mount; explicit retry sends only perPage100 query; navigation cancels pending chart read and Back loads fresh ready data. Other KPI/Distribution states remain ready; no writes.
- Actual browser timezone Pacific/Kiritimati had local day22 while São Paulo/chart end remained21; reduced motion active with no chart animation. Native disclosure opened with Enter,2px visible focus,30 accessible rows sum22, bounded table, no horizontal overflow at320. Five-width screenshots and safe synthetic read ledgers are local artifacts.

## Release and observed evidence record

Isolated branch/worktree: `feature/dashboard-daily-opportunities-v1` / `C:/Users/User/Desktop/Loor/worktrees/super-admin-dashboard-daily-opportunities-v1`. One reviewed feature commit, safe canonical dev fast-forward, normal push and preserved remote feature. No main/handoff changes, force push, merge/rebase/squash or unrelated cleanup.

Existing Netlify Git CD site `loor-super-admin` (`25e47255-95dc-4ed6-a22a-8bce03017ee7`), canonical dev, unchanged flags/build settings. This site's Netlify “Production” context is **official homolog**, not business Production. No manual upload or duplicate deploy trigger.

The immutable source commit cannot contain its own resulting deployment ID. Actual commit/deploy/assets/hash, successful post-publish GET/series/UI/reload/Back evidence, safe request ledger and final outcome are recorded in the final task report and:

`C:/Users/User/.codex/visualizations/2026/08/28/01a047eb-4949-7663-bff7-5b0686497ccf/dashboard-daily-opportunities-2026-10-21/release-evidence.md`

Do not treat preflight or release procedure as proof of a future successful publish. Live source and deployed rendering must pass independently.

## Remaining scope boundaries

No business/financial mutation, Backend/Core/schema/endpoint, auth/session/CORS/Render/AWS, Netlify flag change or new dependency. No raw records/credentials exported. Deleted records are not reconstructable; client consultation clock is not an atomic Backend snapshot. Other-role cases are synthetic, not live impersonation; no human assistive-technology user test is claimed.

No next module started. Next useful independent contract batch: Recent Events item/source semantics, authoritative KYC aggregates, and actual operational service-health contracts. Preserve these unavailable placeholders until contracts are proven; do not repeat the general Dashboard audit.
