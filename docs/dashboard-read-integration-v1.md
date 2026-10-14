# Dashboard Read Integration V1

Fourth real-data unit of the Super Admin frontend, implemented by Cloud from
`dev` `692f3ac` for Codex review. The Global Dashboard now reads
`GET /api/dashboard` for the **two KPIs whose meaning is proven**:
**Whitelabels** and **Investidores**. It is **read-only**.

Every other Dashboard element keeps its data-ready state ("—", "Sem dados",
"Aguardando integração"):

- the other three KPI cards;
- the activity chart;
- the Whitelabel distribution;
- operational status;
- recent events.

A partial authoritative Dashboard is preferred over a complete-looking one.

The read foundation is reused unchanged:

- `authenticatedGet`: Bearer, `X-Correlation-ID`, 20 s budget, GET only;
- central 401 handling;
- typed `ApiError` and `describeApiError`;
- `useRemote`.

Dashboard components never touch `sessionStorage`.

## Evidence classes

| Class | What it is |
| --- | --- |
| **A. Real contract capture** | Read-only GETs in the operator's authenticated homolog session (2026-10-14), plus the Nest source |
| **B. Local implemented UI** | The built app in a browser against a mock reproducing the class A shape |
| **C. Synthetic edge cases** | Mock / unit scenarios not observed live: zero, missing or invalid counts, non-global scope, errors, timeout |

**Not claimed:** reviewed UI → live API E2E. That check requires separate
promotion authorization and is not part of this local review.

## How the contract was established

**Live capture (class A).**

- The homolog session was already open in the Claude browser pane; the
  operator had signed in themselves.
- Only GET requests were sent. Cloud recorded field names, types,
  nullability, tokens and **aggregate** counts — no record-level values,
  tokens or headers.
- `GET /dashboard` was read twice, 3 s apart.
- The registry, Investor and Entrepreneur reads were run in the same minute
  for cross-checks.

**Nest source (`backend-super-admin-Loor` `dev` `0177437`).**

- `src/modules/dashboard/*` is a pure pass-through to Core
  `/internal/super-admin/v1/dashboard`.
- Roles allowed: `SUPER_ADMIN`, `READ_ONLY`, `FINANCIAL_ADMIN`,
  `COMPLIANCE_ADMIN`. **`SUPPORT_ADMIN` gets 403**, unlike the Investor and
  Entrepreneur reads.
- The query is forwarded **unvalidated** (`Record<string, string>`). No
  tenant or period parameter is documented, so the frontend sends **no
  query**.
- `loor-core.client.ts`: a Core 401/403/5xx becomes **502**
  `CORE_HTTP_ERROR`; other 4xx keep their status.
- Q-WL-04 (Dashboard metric definitions), in the backend-handoff open
  questions, remains the governing Product question.

## Observed contract (class A)

`GET /api/dashboard` → HTTP 200, `application/json`, wrapped in `{ data }`:

| Field | Type | Observed | Nullability observed |
| --- | --- | --- | --- |
| `data.scope` | string token | `"global"` | not null |
| `data.freshness` | ISO datetime | Cloud captured different timestamps on two reads 3 s apart, about 1 s after request dispatch; no cache/generation guarantee is established | not null |
| `data.kpis.whitelabels` | number | 6 | not null |
| `data.kpis.whitelabelsActive` | number | 6 | not null |
| `data.kpis.investors` | number | 4762 | not null |
| `data.kpis.entrepreneurs` | number | 58 | not null |
| `data.kpis.tenantAdmins` | number | 6 | not null |
| `data.events` | array | **empty** (length 0) — no item shape observable | not null |
| `data.operationalStatus.core` | string token | `"ok"` | not null |
| `data.operationalStatus.note` | string | "Aggregate counts only; service health probes are not included." | not null |

Two consecutive calls returned identical `kpis`. There is no period, unit,
denominator or per-tenant data.

### Cross-checks against already-integrated authoritative reads

| `/dashboard` field | Compared with | Result |
| --- | --- | --- |
| `kpis.whitelabels` = 6 | `GET /whitelabels` `meta.total` = 6 | **equal** |
| `kpis.whitelabelsActive` = 6 | registry: `isActive: true` × 6, `status: "active"` × 6 | consistent, but **nothing discriminates** (no inactive tenant exists) |
| `kpis.investors` = 4762 | `GET /investors` `meta.total` = 4762; Σ registry `counts.investors` = 4762 | **equal** |
| `kpis.entrepreneurs` = 58 | `GET /entrepreneurs` `meta.total` = 58; Σ registry `counts.entrepreneurs` = 58 | **equal** |
| `kpis.tenantAdmins` = 6 | Σ registry `counts.admins` = 4 (and Σ `admins` = 4) | **differs** |

## Semantic classification

| Field | Class | Why |
| --- | --- | --- |
| `scope` | **A** | `"global"`; used as a guard (see below) |
| `freshness` | **A** | Timestamp supplied with the aggregate response; observed advancing across reads. Cache policy and business-record modification time are not established. |
| `kpis.whitelabels` | **A** | Same count as the Whitelabel registry the Whitelabels page lists |
| `kpis.investors` | **A** | Same count as the Investidores list total, and the sum of per-tenant counts |
| `kpis.entrepreneurs` | **A** | Same count as the Empreendedores list total. **The approved Dashboard has no card for it** (see the [mapping](#dashboard-mapping)). |
| `kpis.whitelabelsActive` | **B** | The definition of "active" (`isActive`? lifecycle `status`? something else?) cannot be established: every homolog tenant is active, so 6 = 6 proves nothing |
| `kpis.tenantAdmins` | **B** | 6 ≠ the registry's admin counts (4). The counted population (inactive / paused / deleted admins? platform admins?) is unknown. |
| `events` | **B** | Always empty; item shape and meaning (audit events? operational activity?) unknown. An empty array cannot be told apart from "not implemented". |
| `operationalStatus.core` | **B** | The note says service health probes are **not** included. The token's full semantics are unestablished; a successful aggregate read is not a health signal. |
| time series, distribution, Opportunities, payments, KYC, service health | **C** | Not provided |

### Proven KPI semantics

**`kpis.whitelabels` → card "Whitelabels"**

- *Counts:* Whitelabels in the Core registry. It equals `GET /whitelabels`
  `meta.total`, the list the Whitelabels page shows.
- *Scope:* global (`scope: "global"`).
- *Inactive tenants:* all observed tenants are active. Equality of totals
  does not prove inclusion/exclusion of inactive, suspended or deleted tenants.
- *Kind:* global aggregate with an API-supplied `freshness` timestamp; no
  polling or real-time/cache guarantee.
  Authoritative: Core aggregate, no Nest mapping.

**`kpis.investors` → card "Investidores"**

- *Counts:* investors across all Whitelabels. It equals `GET /investors`
  `meta.total` (the Investidores page total) and the sum of the registry's
  per-tenant `counts.investors`.
- *Scope:* global.
- *States included:* captured totals agree with the unfiltered list and
  registry counts. Equality alone does not establish inclusion/exclusion of
  paused, blocked, deleted or other future states.
- *Kind:* authoritative global aggregate with an API-supplied timestamp.

**Zero vs unavailable** applies to both. A count is accepted only as a
non-negative safe integer:

- `0` is shown as **0**.
- Missing, `null`, negative, fractional, string or out-of-range values show
  **"—"** with "Não informado pelo Control Plane", never 0 and never a
  guess.

## Dashboard mapping

Mapping categories: (1) can use `/dashboard`; (2) can use another
already-integrated authoritative read; (3) no authoritative source yet; (4)
Product semantics required.

| Element | Category | State in V1 |
| --- | --- | --- |
| KPI **Whitelabels** | 1 | **Integrated**: `kpis.whitelabels` |
| KPI **Investidores** | 1 | **Integrated**: `kpis.investors` |
| KPI Oportunidades | 3 | "Aguardando integração" (Opportunities are still a prototype; no field) |
| KPI Pagamentos | 3 + 4 | "Aguardando integração" (no field; confirmed/pending/failed and amount basis undefined) |
| KPI KYC | 3 + 4 | "Aguardando integração" (no field; KYC state mapping undefined) |
| Entrepreneurs (`kpis.entrepreneurs`) | 1 (data) / 4 (layout) | Not displayed: the approved five-card row has no Entrepreneur card. Adding one is a Product / layout decision. The value is proven and ready. |
| Active Whitelabels, tenant administrators | 4 | Not displayed: definitions unproven (class B) |
| "Atividade por período" (time series) | 3 + 4 | Empty chart: no series, period, unit or time zone in the contract |
| "Distribuição por Whitelabel" | 4 | "Sem dados". The subtitle promises a share of **platform volume**: per-tenant investor counts from the registry would be a different metric, so nothing is derived. |
| "Status operacional" (Pagamentos, Wallet, Compliance, E-mail/SMTP, Gateways) | 3 | "Aguardando integração" on all five. `operationalStatus.core` is not service health (see [Provider health](#provider--configuration-health)). |
| "Últimos eventos" | 3 + 4 | Empty table. `events` is always empty with unknown semantics, and Audit is not read (see [Audit boundary](#recent-activity--audit-boundary)). |
| "Supervisão global" panel | — | Static copy, unchanged |
| "Ações rápidas" and KPI destinations | — | Unchanged |
| Header "Visão global" | — | Unchanged: no tenant / period contract, no query sent |

## UI behaviour

- **One request per visit.** `GET /dashboard` is sent once when the Dashboard
  mounts, and again only on an explicit "Tentar novamente", a reload or a
  return visit. There is no polling and no automatic retry.
- **Loading:** the two integrated cards show a skeleton and "Carregando…"
  with `aria-busy`. The pending cards are unchanged.
- **Success:** the card shows the value in pt-BR digits (`4.762`) and the
  status line "Atualizado às HH:MM (Brasília)" from `freshness`. If
  `freshness` is invalid, the status line reads "Dados do Control Plane".
  The parser requires an explicit timezone and a real calendar date; naive
  dates, numeric strings and rollover dates are not treated as instants.
  This is the aggregate's timestamp, not a claim about the last underlying
  business mutation or continuous refreshing.
- **Per-field unavailable:** "—" with "Não informado pelo Control Plane". The
  other card still shows its value.
- **Request failure:**
  - Both integrated cards show "—" with "Indisponível no momento".
  - A row under the KPI grid gives a safe title, an explanation, the
    "Código de diagnóstico" (the request's correlation id) and "Tentar
    novamente".
  - 403 shows "Acesso não permitido" with no retry.
  - The rest of the Dashboard and the shell stay fully usable.
  - No raw Backend text is ever shown.
- **Error handling by status:**
  - **401:** central handling (session cleared, login with "Sua sessão
    expirou").
  - **403, 5xx / HTML 502, network, 20 s timeout, malformed:** the session
    is kept.
- **Scope guard:** a response whose `scope` is not `"global"` is rejected as
  malformed. Tenant-scoped numbers can never appear under "Visão global".
- **Envelope:** the observed `{ data }` wrapper is required. A body without
  `kpis` is malformed.
- **Prototype data:** none. No prototype dataset is aggregated, and no
  prototype value is used as a fallback.

## Charts and distributions

None is integrated. The contract has no time series, distribution,
denominator, period or unit. Nothing is derived from unrelated totals: no
percentages, and no shares computed from registry counts. The chart axes
derive only from today's date, as before.

## Provider / configuration health

There is **no health contract**. `operationalStatus` explicitly excludes
service health probes. `core: "ok"` has no independently established service
health meaning and is not displayed.

The Dashboard does **not** infer health from SMTP, Gateway or Settings
configuration (configuration ≠ operational health). All five services stay
"Aguardando integração", in neutral colours.

## Recent activity / Audit boundary

- Audit events ≠ operational activity.
- The Dashboard does **not** read `/audit`, and does **not** render
  `events`, whose item shape and meaning are unknown.
- "Últimos eventos" keeps its empty table. "Ver todos" still opens
  Auditoria, which is itself a prototype.

## Files

| File | Change |
| --- | --- |
| `src/features/dashboard/dashboardApi.ts` | new — parser (envelope / scope / per-field counts), `GET /dashboard`, labels |
| `src/features/dashboard/useDashboardOverview.ts` | new — `useRemote` hook |
| `src/features/dashboard/DashboardPage.tsx` | KPI sources for Whitelabels / Investidores, error row |
| `src/features/dashboard/DashboardPage.module.css` | error row styles |
| `src/components/ui/MetricCard.tsx` | optional `reading` prop: loading / ready / unavailable. Without it the markup is unchanged (the Whitelabels page summary cards are untouched). |
| `src/components/ui/MetricCard.module.css` | value skeleton, unavailable status colour |
| `scripts/check-dashboard-read.mjs` | new — unit and source contracts |
| `README.md`, this doc | documentation |

## Validation (Cloud)

- **A:** the live capture and cross-checks above.
- **Checks:** `tsc -b`, `oxlint`, `npm run build`, `git diff --check`.
- **`node scripts/check-dashboard-read.mjs`** (synthetic, no network):
  - observed envelope → only the proven KPIs exposed;
  - zero kept;
  - eight invalid count shapes → unavailable, plus a partial case;
  - six malformed envelopes;
  - five non-global scopes;
  - freshness label in Brasília time;
  - exact request (no query, Bearer, correlation id, GET);
  - 401 central vs 403 / 502 / network;
  - no raw Backend text;
  - source boundaries: no storage, no prototype or Audit imports, no other
    API path, pending panels untouched.
- **All existing repository scripts re-run.**
- **Browser QA (B/C) against the observed-shape mock:**
  - guard and login → Dashboard;
  - loading, success, zero, partial, invalid counts, large counts, invalid
    freshness;
  - errors: 502, 403, HTML 502, network, 400, malformed, non-JSON, missing
    `kpis`, non-global scope, missing scope, unwrapped body, 20 s timeout;
  - retry, 401;
  - no loop or polling, reload / session restoration, card destinations
    (the Investidores page total matches the card);
  - no writes, Authorization only to the API host, no `localStorage`;
  - 1672 / 1440 / 768 / 390 / 320 px in the success, error and large-number
    states;
  - keyboard and axe WCAG A/AA.
- **Regression:** Whitelabel, Investor and Entrepreneur browser flows on the
  new build and on `692f3ac`; the Operation / KYC / Audit / Finance suites;
  and a pixel comparison against `692f3ac`.

## Open Product / Backend questions (refining Q-WL-04)

1. **Active Whitelabels:** which field defines "active" (`isActive`,
   lifecycle `status`, or another)? Are suspended / draft tenants counted in
   `whitelabels`? A homolog tenant in a non-active state would let this be
   verified.
2. **Tenant administrators:** what does `tenantAdmins` count, given 6 ≠ the
   registry admin counts of 4? Inactive / paused / deleted admins,
   multi-tenant admins counted per tenant, or platform administrators? Which
   number should Product show?
3. **Investor / Entrepreneur inclusion:** are paused, blocked or deleted
   accounts included? Today it is the same population as the lists; only
   `active` access was observed.
4. **Entrepreneur card:** should the KPI row gain an "Empreendedores" card
   (layout change), or stay at the approved five? The value is ready.
5. **`events`:** what is an event (audit record? operational activity?), and
   what is its item schema (type, tenant, module, actor, timestamp, time
   zone)? Is it limited, ordered or tenant-filtered? Who may see actor
   identity?
6. **Health:** will Core expose per-service health (Pagamentos, Wallet,
   Compliance, SMTP, Gateways) with states, a check time and failure
   semantics? Until then, "Status operacional" stays pending.
7. **Series / distribution:** which metric, period, time zone, unit and
   denominator ("volume total da plataforma" = invested amount? payment
   amount? counts?) apply to "Atividade por período" and "Distribuição por
   Whitelabel"?
8. **Opportunities / Payments / KYC KPIs:** status groupings, amount basis
   and time window.
9. **Scope parameters:** Nest forwards any query unvalidated. Will a
   `whitelabel_id` / `from` / `to` contract be defined and validated, and
   how is tenant access authorised? `SUPPORT_ADMIN` currently gets 403 here.
10. **Freshness:** the timestamp advanced across sampled reads. What generation
    and cache policy is guaranteed, and what staleness is acceptable?

## Out of scope (unchanged)

The following were not touched:

- every Whitelabel, Investor, Entrepreneur, Account, KYC or Finance
  mutation, and configuration writes;
- Audit integration, menu management;
- Backend, CORS, the database, Netlify, `main`, the canonical `dev` and the
  backend-handoff branch.

## Independent Codex review — 2026-10-14

### Recovery and Git boundary

Live `origin/dev` and local HEAD were `692f3acbbb0e2dcc9d5abf0d44abc5c799aa0a1d`.
All nine Cloud files (five modified, four new) were carried intact to
`feature/dashboard-read-integration-v1`. The recovery patch was not reapplied.
Cloud screenshots remain outside Git. No reset, clean, protected-branch
promotion, push or deployment was performed.

### A. Independent real homolog contract evidence

The existing Codex built-in homolog tab was already authenticated. No password,
token value or record-level identity was requested, copied or logged. All real
API probes were GET-only.

- `GET /dashboard`: HTTP 200, `{data}`, `scope: global`; all five KPI fields
  were numeric and non-null in the captured responses: Whitelabels 6, active
  Whitelabels 6, Investors 4762, Entrepreneurs 58, tenant administrators 6.
- `events` was an empty non-null array. No item contract was inferred.
- `operationalStatus` contained `core: ok` and the explicit note excluding
  service health probes. Neither field is presented as health.
- `freshness` advanced from `2026-10-14T14:09:14.537Z` to
  `2026-10-14T14:10:50.963Z`, with unchanged KPI values. This is observed
  response timestamp behavior, not proof of an uncached real-time SLA.
- Global list totals independently matched: Whitelabels 6, Investors 4762,
  Entrepreneurs 58. Registry tenant-count sums matched the latter two.
- All six registry tenants were active; this fixture cannot distinguish the
  possible definitions of `whitelabelsActive`.
- The documented administrator endpoint was checked for all six tenant IDs:
  `GET /whitelabels/:id/accounts?tipo=administradores&page=1&perPage=1`.
  Every response was HTTP 200. Totals were IDs 1/2/3: 0, ID 4: 2, IDs 6/7: 1
  each. Their sum **4** agrees with the registry, but differs from Dashboard
  `tenantAdmins: 6`. The counted population remains unknown. No explanation
  (other states, deleted records, platform administrators, or different count
  basis) is asserted as fact.
- The current Nest source was read at exact
  `01774379eee8f4a1ed83afd51cdb2c4c10fc67f8`: Dashboard is a pass-through;
  its query is forwarded without a defined tenant/period DTO. No speculative
  Dashboard parameters were sent. Accounts maps the documented administrator
  read to the tenant-admin Core endpoint.
- The available local Core checkout at `fe054bb` did not contain this Dashboard
  route/aggregate definition in inspected source. It was not changed or used
  to infer deployed Core semantics.
- The real stored operator role was confirmed as SUPER_ADMIN and authenticated
  Dashboard reads succeeded. Other-role restrictions are source evidence,
  not impersonated live tests. A bounded unauthenticated read was aborted
  without an authoritative HTTP result; **a live 401 is not claimed**. The
  real session remained intact.

Some browser command deadlines occurred. Completed aggregate responses were
recovered from the debugger event stream rather than blindly replayed; the
initial aborted request was not counted as successful evidence. These tooling
observations do not establish an application defect.

### Narrow refinements and regression coverage

- MetricCard's no-reading path omits integration attributes, preserving the
  baseline render structure exactly for both densities. Actual React
  server-render comparisons against `692f3ac` cover this compatibility.
- Maximum-safe integer counts were visibly clipped at 1672px before refinement.
  Only integrated ready values now wrap; the complete count remains visible,
  with no abbreviations, rounding changes or legacy-consumer CSS changes.
- Freshness now rejects ambiguous/no-zone dates and invalid calendar rollover,
  fails safely even when the label helper is called directly, and names Brasília
  explicitly. Documentation no longer infers lifecycle populations from equal
  totals or interprets `core: ok` as service health.
- Dashboard checks now include additional nonnumeric/nonfinite counts, strict
  timestamp cases, equivalent explicit offsets and real MetricCard rendering.
- The canonical Whitelabel/Auth suite already expected one restored-session
  `GET /auth/me` and no duplicate after a fresh login, so its valid assertions
  and Auth implementation remain unchanged. Dashboard-specific maintained
  tests additionally verify exact method/path, Bearer and correlation headers,
  plus zero hydration requests without a session.
  The historical 26/27 scratch runner was not recovered in the repository or
  supplied artifacts; it is not claimed as rerun or repaired. No failing
  maintained canonical assertion was skipped or weakened.

### B/C. Independent local UI and synthetic edge evidence

An external, disposable loopback-only fixture server used synthetic operator
and record data through the normal login/GET contracts. It never proxied a real
API. No auth bypass, real token, helper, fixture, QA switch or credential was
added to application source/configuration.

Source-mode responsive QA covered six states (loading, normal values, zero,
unavailable, 502, maximum-safe integers) at 1672/1440/768/390/320px: no page
overflow or KPI text clipping. Partial and invalid counts preserve isolation;
invalid freshness uses the safe fallback. Non-global/malformed envelopes,
403, HTML 502, network failure and timeout leave the shell/session usable;
403 has no retry and raw error text is never rendered. Explicit retry sends
one read. Canonical synthetic 401 clears the session, shows its expiry notice,
and browser Back cannot restore the shell.

Vite development StrictMode performs cancelled effect setup/cleanup reads, so
its cumulative ledger is not used to claim production request counts. The
actual production build was also served locally, with only the public API base
substituted in the fixture server's **in-memory response buffer**. The on-disk
build retains the real API URL and unchanged auth code. An isolated production
visit sent exactly **one Dashboard GET** and one background `/auth/me` after
reload; idle observation added zero Dashboard reads. Pending-read navigation
and a new zero-value visit did not allow old values to overwrite current data.

Keyboard card order/activation and focus-visible styling pass; reduced-motion
skeleton animation is disabled. Loading has busy semantics, errors use an alert,
and zero/unavailable states remain distinct. Axe was not installed, so this is
not claimed as an independent full WCAG/axe certification.

Built-app smoke passes: Whitelabels, Investors, Entrepreneurs, Accounts, Settings,
E-mails, Opportunities, Gateways, Modalities, Catalogs, Investments, Payments,
Wallet, KYC and Audit. Legacy Whitelabel KPI cards retain their unavailable
markup. The Cloud-reported 88 browser checks remain historical Cloud evidence,
not an assertion that the unavailable original runner was rerun in full.

### Maintained validation and promotion gate

All maintained suites pass: Dashboard 45, Whitelabel/Auth 49, Investor 42,
Entrepreneur 45, shared draft 14, Operation/Finance 285, Compliance/Audit 361.
TypeScript, oxlint, the real-API production build and diff checks pass. The
inherited large-bundle advisory remains non-blocking; no dependencies were added.

No live business or financial mutation was performed. Only two approved KPI
slots are integrated; no Entrepreneur card was added. Every unavailable metric,
chart, activity/health contract and Product question above remains explicit.
The reviewed feature requires **separate promotion authorization**, followed by
deployed UI-to-real-API E2E. It has not been pushed or deployed.

The temporary local QA tab, exact fixture server process and external helper
were removed after testing; viewport and media overrides were reset. Screenshots
remain outside Git. The real homolog session was preserved. The on-disk release
bundle contains the real API URL and no temporary fixture markers.
