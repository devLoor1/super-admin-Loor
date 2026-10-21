# Global Dashboard — Investor Distribution V1

## Approved metric and lineage

`REGISTERED_INVESTORS_BY_WHITELABEL`: current registered Investor population across **all** registered Whitelabels (active and inactive), not money, KYC, activity or a time series.

- Numerator: canonical `listWhitelabelOptions` → authenticated `GET /api/whitelabels?page=1&perPage=100`, no tenant/search/active filter → explicit `counts.investors`.
- Denominator: the **already loaded**, global-scope-validated `GET /api/dashboard` → `data.kpis.investors`. No second overview read on initial mount.
- Registry consultation time and aggregate generation time are labelled separately. These GETs are not an atomic snapshot and there is no polling.

The shared Whitelabel adapter retains an optional `investorCount`; missing/invalid values never become zero. Legacy valid fields/identity/status rules are unchanged. A nonempty response with `lastPage=0` now fails as malformed, before the historical empty-result normalization can falsely imply complete coverage. Empty results may still report lastPage 0 or 1.

## Fail-closed calculation

Require page 1, perPage 100, lastPage 1, safe nonnegative total <=100, exactly total rows, unique positive canonical Core IDs, usable names and explicit safe nonnegative integer counts. Reject unsafe sums. Require tenant sum = independent global Investor total before rendering any share.

Incomplete coverage, invalid counts, unavailable global total, permission denial and transient errors never render guessed shares. Mismatch shows safe aggregate numbers and an explicit **two-source** retry; other retries reload only the failed source. No retries for 401/403. Central session expiry/abort handling is reused. A session-version-keyed registry hook rejects old-operator results and does not consume `lastData` or store payloads.

Order: Investor count descending, then numeric ID ascending. Identity-keyed golden-angle HSL colours stay stable when counts/ranks change. SVG uses full-precision ratios and cumulative offsets, radius 74.25, thickness 28.5, 177x177 footprint, butt caps and no artificial gaps. Percentage labels alone round to one decimal (pt-BR); tiny positive shares show `< 0,1%`. Zero-count tenants remain in the legend without positive-area segments; verified global zero renders a neutral empty ring and total 0.

## Presentation and accessibility

Approved title/subtitle: “Distribuição de investidores por Whitelabel” / “Participação no total de investidores cadastrados.” Every tenant has name, count and percentage in the semantic legend. The redundant SVG/visual centre is hidden from assistive technology; figure caption supplies metric/total once. The bounded 177px legend scroll region is keyboard-focusable with a 2px visible focus outline. Long names wrap without truncation. Panels <=360px stack the unchanged donut above the legend, avoiding unreadably narrow columns; Dashboard grid/shell CSS is unchanged. No new chart animation; reduced motion remains valid.

## Baseline / independently observed preflight (2026-10-21)

- Frontend dev: `d4097840b011087527451b725fb37f257a9eeebc`; main `c2235ac5d0d65408e9d39bf836a1a717da3d95ae`; handoff `89a3b5058f52f981b3a1b06756d7f33a2a043f27`.
- Control Plane source `9513cb3b714348ecb98f0b02e1663918d113b9a8`; Core source `ed9daad508a5bd9b93c169a8b4f43d53a6096c13`. Backend deployed SHAs are not inferred from source refs.
- Previous official homolog deploy `6ad8beb5b7702e1109598837`, JS `index-z6-Ldd4n.js`.
- Authenticated SUPER_ADMIN GETs: 7 Whitelabels (6 active, 1 inactive); explicit tenant counts sum 4,762 = global KPI 4,762. Existing other counts 78 opportunities / 2,116 payments. These observations are **not** hardcoded application values.
- Safe correlation IDs: registry `187cd9b1-b46a-405a-b8a6-cb64fbcc26fe`; overview `7e3dd785-8db3-4ce6-a34e-f0822fb1b374`; auth `2155742c-8b8b-4dcc-b678-ee08a040ea95`.

## Focused validation and boundaries

- `node scripts/check-investor-distribution.mjs`: pure math, strict metadata/count/identity coverage, sums/overflow, 0/1/2/3/7 tenants, >5 colours, tiny shares/rounding, deterministic order, actual React SSR/accessible legend, source-specific errors/retries, canonical GET request shape, timeout, cancellation, 401, late-session rejection; exact shared-parser byte guard after removing only the reviewed additions.
- Maintained Dashboard read, Whitelabel/auth read, Menu Visibility A/B/C, Lifecycle, Operational CRUD and Finance Read suites retained. Historical release exclusions are unchanged; only exact authorized chart paths/shared projection were added to current reviewed allowlists. No whole-domain exemption.
- TypeScript, oxlint, production Vite build and whitespace check required before commit; inherited >500kB bundle advisory is not new Product scope.
- Actual production-built frontend tested on a disposable **localhost synthetic GET-only fixture server**, not represented as real Backend E2E: widths 1672,1440,900,390,320, all seven rows, long names, fullprecision SVG, no page/legend horizontal overflow, keyboard scrolling/focus and reduced motion. Ready/zero/loading/403/missing/incomplete/mismatch/503 states; retries issued exactly the appropriate source GET(s). Pending registry requests aborted on navigation; Back restored fresh ready state. Synthetic server rejects every business write.

## Release procedure and evidence record

Feature: `feature/dashboard-investor-distribution-v1`, isolated worktree. One reviewed commit; canonical dev fast-forward only after a fresh live-ref/clean-tree check. Preserve feature remotely. No main/handoff changes or history rewrite.

Use the existing Git-connected **loor-super-admin** Netlify site (`25e47255-95dc-4ed6-a22a-8bce03017ee7`), canonical repository/dev branch, unchanged build settings and flags. Netlify's “Production” build context here serves **official homolog**, not business Production. No manual upload or duplicate trigger.

The immutable source commit cannot contain its own resulting deployment ID. Post-publish observed SHA/deploy/assets, safe aggregate readbacks, request ledger, final decision and screenshots are recorded separately in the task's release report and local evidence record:

`C:/Users/User/.codex/visualizations/2026/08/28/01a047eb-4949-7663-bff7-5b0686497ccf/dashboard-investor-distribution-2026-10-21/release-evidence.md`

Do not treat the preflight or this release procedure as proof of a future deployment. Final acceptance requires the new served artifact and authenticated live chart/reload/Back smoke.

## Remaining limitations / next batch

- >100 Whitelabels fail closed. A future bounded multi-page or authoritative aggregate contract is needed, not an automatic unbounded loop.
- Control Plane historically defaults absent underlying Core counts to zero. Frontend proves only explicit valid Control Plane counts and cross-source equality, **not** underlying Core-field presence or atomic consistency.
- Colours are stable and differentiated for the current registry; arbitrarily large identity sets cannot guarantee perceptual uniqueness. Names/counts/% remain the non-colour identification.
- Other-role denial is verified synthetically, not by impersonating live operators. No raw Investor records are fetched.
- Activity by Period still needs an authoritative series/time/filter contract; Recent Events needs an item/source contract; KYC and operational health need authoritative aggregates/health semantics. These panels remain unchanged, not inferred from unrelated sources.
- No Backend/Core, dependency, shell/auth/RBAC, KPI, Activity, Event, KYC, operational-health, lifecycle, financial or infrastructure changes are part of this unit. No business/financial mutations are authorized or needed.
