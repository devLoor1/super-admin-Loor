# SA-BE-007 — Operators Read V1 + permanent homolog policy

## Persistent checkpoint — 2026-10-23

Coordinated publication **NOT performed**. Frontend implementation and local qualification are preserved in `feature/operators-read-permanent-homolog-policy-v1`, isolated worktree `worktrees/super-admin-operators-read-permanent-homolog-policy-v1`.

Accepted/live frontend baseline: `9f4d69634254af00eb5e95ff553930aa722e5eed`. Main remains `c2235ac5d0d65408e9d39bf836a1a717da3d95ae`; handoff remains `89a3b5058f52f981b3a1b06756d7f33a2a043f27`. Existing worktrees preserved. Control Plane inspected through `origin/dev` at `73ccb918ae4e22be1e16d3ab6ab12a215d3f2916`; historical Backend checkout and Core untouched.

### Exact release blocker / next unfinished transition

The built-in browser timed out during existing Netlify deploy-page navigation, then again during tab rediscovery (kernel reset). A bounded direct recovery restored the authenticated official homolog tab; **Netlify tab 7 still timed out on DOM inspection** (`Runtime.evaluate`). The read-only Netlify connector independently returns `Authentication required`. This is tooling/deployment-evidence availability, **not evidence of a failed homolog login or Backend defect**.

Before any promotion: restore/read the existing Netlify project/deploy evidence and verify current Git-connected canonical dev workflow, collect remaining bounded browser console/network evidence, then recheck live refs and acceptance gates. Do not restart implementation or replay preflight needlessly. Only then fast-forward dev, push once and verify the new official artifact and authenticated UI. No intermediate policy-only release and no second publication merely for post-release documentation.

No push, promotion, deployment, environment/flag change, Operator mutation or business/financial write was performed. Latest measured allowance before checkpoint: 95% five-hour used / 27% weekly used (not a future allowance).

## Authoritative deployed contract qualification

Existing official `https://loor-super-admin.netlify.app` session, SUPER_ADMIN, built-in browser only. GET `/api/auth/me` = 200; roles includes SUPER_ADMIN. GET `/api/operators?page=1&perPage=20` = 200, `{data,meta:{page,perPage,total,lastPage}}`, total 1, page 1/lastPage 1. One observed CUID was used for detail GET = 200, `{data:Operator}`, same identity. No IDs or raw contacts are reproduced here.

Actual projection keys: `id,name,email,status,roles,roleDetails,lastLoginAt,createdAt,updatedAt`. Live status ACTIVE, assigned role SUPER_ADMIN, `roleDetails` entries contain `slug,name` (not a description/permissions matrix). Live timestamps parse as instants; source allows nullable lastLoginAt. No sensitive credential keys in list/detail. Bounded observed-name search with order asc and observed-email search with order desc both returned 200 and included the observed identity. This verifies semantics with **one live record**, not a live multi-row ordering/paging exercise.

Source controller restricts both GETs to SUPER_ADMIN; Prisma uses CUID identity, ACTIVE/INACTIVE status and multi-role associations. Service searches name/email, orders createdAt asc/desc, caps perPage 100. Shared DTO accepts `sort` but service ignores arbitrary field selection: UI/adapter expose no sort/status/role/tenant filters. No standalone Operator test files were present in the inspected source inventory; guards/serializer/DTO/models were inspected read-only, no Backend tests or code executed.

## Implementation

Dedicated Control Plane domain, not Core Whitelabel Admin. GET-only adapter validates identities/envelopes/counts/page/order/dates/duplicate IDs and exact role-details membership; allow-list projection immediately discards credential extras and replaces email with a fully hidden mask. Name text suppresses embedded contacts/documents. No payload storage, polling or mock fallback.

Routes `#/settings/operators` and `#/settings/operators/:id`. Search/page/order URL state; invalid/duplicate/unsupported restrictions block rather than widen requests. Detail returns only to a validated local list context. Direct/reload detail uses authoritative GET. Contextual SUPER_ADMIN card in Configurações; no new persistent menu ID. No editable form or Operator mutation action. Unknown status neutral; null lastLoginAt means unavailable/not recorded, not proof of never logging in. Backend role names displayed without invented descriptions/permissions.

Canonical `authenticatedGet`, `ApiError`, `describeApiError`, `useRemote`, session version/useSyncExternalStore, useSessionOperator, abort and bounded timeout retained. Role denial produces no request; 403 isolated/no auto retry; central 401 unchanged; stale session responses discarded; only explicit recoverable retry.

## Permanent policy

`homolog-readiness-policy.md` is normative for all future frontend deliveries. Root `AGENTS.md` requires it and maintained release checks. Existing `presentationAvailability.ts` reused unchanged; local prototypes retained, production mock routes/nav/header/metrics suppressed, real errors/empty/null/read-only states retained. Readiness and privacy are independent, neither grants authorization. Registry, protected IDs, preferences and write coordinator remain unchanged. No new feature flag or CI infrastructure. Check execution is a mandatory manual release gate; no automatic CI release-blocking gate currently exists.

## Validation recorded

- Operators: 71 focused synthetic checks: projection/credentials, CUID/meta/count/order/roles/null/malformed, exact GET query, role denial, 401/403/404/5xx, timeout/network/abort/session replacement/explicit retry.
- Readiness: 100 maintained checks, actual SSR components with synthetic hook/session doubles in both DEV and production semantics; real nav transformer, header controls, four vs five Dashboard KPI rendering, mock direct-route eligibility, authorized/denied list/detail, truthful zero/errors, exact historical source reversals and adversarial guard rejection.
- Production-built synthetic browser list/detail at 1672,1440,900,390,320: no page-wide overflow; contained focusable table scrolling, multi-role/long name/ID/null values. Search/order/paging (21 synthetic records), detail/reload/Back context, visible keyboard focus and semantic controls verified. Unknown-status pill initially overlapped its neighbor; fixed only in new table CSS and verified within its cell. Reduced-motion media active, zero running document animations; no shared visual code changed.
- Synthetic runtime zero/403/502/malformed states verified, no retry for 403; retry offered for recoverable failures. Production mock Settings direct route unavailable; separate local Vite DEV Settings prototype shows General and prototype header controls. Synthetic dummy session exists only on loopback; no real token/credential copied locally. External loopback harness is not committed/deployed and refuses non-GET business requests.
- TypeScript, oxlint (zero warnings), production build, diff check passed. Inherited >500 kB chunk advisory remains. Full final rerun: **27 suites / 3,811 checks passed** (including 71 Operators, 100 readiness, 1,409 Menu Visibility and retained historical adversarial checks).
- Live evidence is contract preflight only; **the reviewed Operator UI has not been deployed**, so no claim of new-UI/live-Backend E2E, live other-role impersonation or post-release smoke. Final console/network ledger and official new UI smoke remain pending the release gate.

## Exact changed-path manifest

| Path | Purpose |
| --- | --- |
| `src/app/App.tsx` | Only Operator route/type/title/shell/render additions |
| `src/features/menu-visibility/MenuVisibilityPage.tsx` | Only contextual entry import/render; no draft/save change |
| `src/features/control-plane-operators/operatorApi.ts` | GET-only validated safe domain projection and access guard |
| `src/features/control-plane-operators/operatorRoute.ts` | Strict URL/query and safe list return context |
| `src/features/control-plane-operators/operatorPresent.ts` | Status and Brasília date presentation |
| `src/features/control-plane-operators/useOperators.ts` | Session/role-scoped canonical read hooks |
| `src/features/control-plane-operators/OperatorUi.tsx` | Configurações entry, shell, roles/status/feedback |
| `src/features/control-plane-operators/OperatorsListPage.tsx` | Authoritative list, search/order/paging/states |
| `src/features/control-plane-operators/OperatorDetailPage.tsx` | Authoritative detail and safe back navigation |
| `src/features/control-plane-operators/Operators.module.css` | Focus/responsive/contained scroll/status wrapping |
| `scripts/check-operators-read.mjs` | Focused synthetic contract/privacy/GET lifecycle checks |
| `scripts/check-homolog-readiness.mjs` | Maintained actual-rendered two-mode readiness acceptance |
| `scripts/operators-test-harness.mjs` | Test-only TS/TSX/CSS loader, explicit SSR doubles |
| `scripts/reviewed-operators-boundary.mjs` | Exact authorized delivery pins/reversals, no directory waiver |
| `scripts/reviewed-audit-filters-boundary.mjs` | Reverse only exact Operator App additions before earlier hash |
| `scripts/reviewed-360-boundary.mjs` | Recognize only exact pinned new delivery; original pins retained |
| `scripts/check-audit-advanced-filters.mjs` | Exact contextual-card reversal/byte comparison, other freezes retained |
| `scripts/check-overview-360.mjs` | Same narrow contextual-card reversal; registry/save/auth frozen |
| `scripts/check-menu-visibility.mjs` | Exact pinned OperatorUi route mention only; state-import prohibition retained |
| `docs/homolog-readiness-policy.md` | Permanent normative reusable policy |
| `AGENTS.md` | Durable short mandatory repository instructions |
| `docs/operators-read-integration-v1.md` | This contract/QA/recovery checkpoint |

Historical hygiene doc, shared shell, Dashboard, Audit, KYC, 360, Finance, existing adapters, dependencies, flags and deployment configuration unchanged. Historical assertions remain active; normalizers reject extra App/card changes and unlisted paths.

## Remaining scope — not started

Operator create/update/role/lifecycle/password/invitation workflows; SA-BE-001 Opportunity writes; SA-BE-002 Whitelabel Admin lifecycle; SA-BE-003 Account pause/reactivation. No new Backend dependency found for Operators read. Current limitation is release verification tooling, not unsupported read semantics. Rollback not applicable: nothing published.

## Recovery continuation — 2026-10-23, 07:09 Brasília onward

This section appends to, and does not replace, the historical checkpoint above.

- Live allowance queried anew: five-hour **1% used**, weekly **28% used**; resources available. The earlier 95%/27% values are historical only.
- Fetched canonical frontend origin: dev still `9f4d69634254af00eb5e95ff553930aa722e5eed`, main still `c2235ac5d0d65408e9d39bf836a1a717da3d95ae`, handoff still `89a3b5058f52f981b3a1b06756d7f33a2a043f27`. Existing 16 frontend worktrees retained. No reconciliation/reset/merge needed.
- Feature branch and HEAD unchanged. All implementation, policy, instructions, test amendments and this report remain **uncommitted**, with no feature commit, promotion, push or publication. The candidate was not lost.
- Executed the exact reviewed SHA-256 guard for all **10 runtime files** (App, contextual Menu Visibility entry and all eight Operators files): every fingerprint matches the candidate that passed the recorded 27 suites / 3,811 checks. No differences in auth/shared components/Dashboard/Audit/KYC/Operation/Finance/readiness transformer/dependency manifests. Existing responsive list/detail captures at all five widths recovered. Full suite/build were not unnecessarily repeated; diff check passes again. No frontend source refinement in this continuation.
- Backend historical checkout remains clean at `9513cb3b714348ecb98f0b02e1663918d113b9a8`; Core remains clean at `fe054bb8ff1d8f431f9b78afbc6a415d0d729baa`. Neither source nor infrastructure modified.
- Per the recovery brief, made **one bounded built-in browser recovery attempt** (`cua.getState`, 20-second bound). It failed before tab discovery with the exact error: **`failed to write kernel assets: O sistema não pode encontrar o caminho especificado. (os error 3)`**. No controller reset loop, external browser, speculative environment repair, credential handling or authentication attempt.
- This current error is a browser-tool initialization/filesystem failure, not an authoritative app/API/authentication response. Current official application/session/Netlify state cannot be independently rechecked through the required browser in this continuation. Historical contract evidence remains valid but is not relabelled as a new live check.
- **Gates A/B/C/D: recovered prior PASS, exact runtime candidate preserved. Gate E: BLOCKED — supported built-in browser initialization fails before page access.** Authenticated post-publication UI verification is therefore not currently available; an alternate Netlify deploy-status source alone cannot complete that gate.
- **Exact first unfinished step:** restore supported built-in browser operation and rediscover existing official homolog session; perform the bounded release-path/console/network check, then recheck live refs, review and commit the unchanged candidate, fast-forward/push once, observe the normal Git-connected publication, and complete authenticated GET-only final smoke. Do not restart implementation or rerun all historical checks solely because of another session transition.
- No new commit/deploy ID or served assets exist for this feature. Last accepted publication remains `6adadee28d45da99ba91c9e3` / JS `index-CUPJFDL-.js` / CSS `index-CQR9yF00.css` (historical accepted identity, not freshly reverified here). Zero live business/financial/Operator mutations; no Menu Visibility preference writes; no flags/settings changed.

**COORDINATED RELEASE BLOCKED — Gate E: built-in browser cannot initialize (`kernel assets`, os error 3).**

## Gate E recovery and approved release candidate — 2026-10-23, 07:26 Brasília onward

The historical blocked sections above are preserved; this section supersedes their current execution status.

- The single normal supported browser initialization **succeeded**. Existing official homolog tab rediscovered, authenticated Dashboard visible; no new login, cache deletion, permissions change, reinstall or speculative filesystem repair.
- Authoritative GET `/auth/me` returned **200 / SUPER_ADMIN**. GET `/homolog/menu-visibility` returned **200**, version **5**, **23** entries; sorted preference-map SHA-256 remains `fb7910fbb9e0e3baeb6016151cdadcdce0d40723d10331a74e44b9394df5b7fe`.
- Existing authenticated Netlify browser session is readable. Project `loor-super-admin`, canonical `devLoor1/super-admin-Loor`, published `dev@9f4d696`, deploy `6adadee28d45da99ba91c9e3`, **auto publishing on from dev** confirmed live. Official application still loads `index-CUPJFDL-.js`. No Netlify settings/env/flag changes and no manual deploy trigger.
- Fetched live frontend refs still match the accepted baseline and protected refs. All 10 reviewed runtime fingerprints match the already validated candidate. Exact scoped diff reviewed: GET-only Operator domain; SUPER_ADMIN-only discovery/direct-route no-data denial; safe projection; session/abort boundaries; no Operator mutations; only two contextual lines in existing Menu Visibility page plus route additions. Historical presentation transformer, registry, saved-map code, auth, dependencies and unrelated modules unchanged.
- Reuse the recorded **27 suites / 3,811 checks**, TypeScript, lint/build and five-width browser QA for this unchanged candidate; no unnecessary full rerun. Diff check passes. Current official console error count is **0** before release, and fresh network/exception observation is enabled for the publication smoke.
- **A contract PASS; B read-only implementation PASS; C permanent readiness policy PASS; D tests/privacy/RBAC/regression PASS; E reliable official verification path PASS.** Proceed with one feature commit, safe dev fast-forward, one normal dev push and one existing Git-connected publication. Preserve main/handoff and all other worktrees.
- This is the pre-publication checkpoint, not a claim that publication or final smoke already succeeded. Final immutable SHA/deploy/assets/GET-only smoke evidence will be recorded outside the published repository at `C:/Users/User/.codex/visualizations/2026/08/28/01a047eb-4949-7663-bff7-5b0686497ccf/operators-2026-10-23/release-evidence.md` and in the final report. Do not create a second publication merely to append post-release evidence.
