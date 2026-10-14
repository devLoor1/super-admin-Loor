# Investor Read Integration V1

Second real-data unit of the Super Admin frontend, implemented by Cloud from
`dev` `74f003f` for Codex review. **Operação › Investidores** (list and
detail) now reads the Nest Control Plane. It is **read-only**: there are no
Investor or Account writes, and KYC and finance are not integrated. Every other
business module is still prototype-only, except the already-canonical Whitelabel
list/detail reads and authentication foundation.

The authenticated-client foundation from
[Whitelabel Read Integration V1](whitelabel-read-integration-v1.md) is reused
unchanged:

- `authenticatedGet` (Bearer token, `X-Correlation-ID`, 20 s budget);
- central 401 handling;
- typed `ApiError` and `describeApiError`.

The shared read-state hook `useRemote` now lives in
`src/lib/useRemoteResource.ts`. It was previously private in
`features/whitelabels/useWhitelabelData.ts`, and its behaviour is identical.
Shared Operation summary cards also accept text or null values so unavailable
Investor metrics can remain explicitly pending rather than displaying fake counts.

## How the contract was established

Nest passes the Investor responses from Core through **without mapping**, and
the Core source was not available. So the shapes were captured live on
homolog on 2026-10-13:

- The operator signed in themselves in the Claude browser pane.
- Cloud ran **GET requests only** in that page and recorded **field names,
  types, nullability and enum tokens**. No values, tokens or headers were
  recorded or exposed.
- Nest source (`backend-super-admin-Loor` `dev` `0177437`) confirms routing,
  validation and the scoped-read forwarding:
  - `src/modules/investor/*`
  - `src/modules/accounts/*`
  - `src/common/dto/pagination-query.dto.ts`

UI QA uses faithful **mocks** of these observed shapes. Codex independently
verified the live contracts below; reviewed-branch UI → live API E2E remains
pending until separately authorized promotion/Netlify deployment. Localhost
CORS has not been changed.

## Endpoints used

| Purpose | Endpoint | Query sent |
| --- | --- | --- |
| Global list | `GET /api/investors` | `page`, `perPage=8`, `search` (when typed) |
| Whitelabel-scoped list | `GET /api/whitelabels/:whitelabelId/accounts` | `tipo=investidores`, `page`, `perPage=8`, `search` |
| Detail | `GET /api/investors/:id` | — |
| Whitelabel names, selector | `GET /api/whitelabels` | `page=1`, `perPage=100` |
| Scope confirmation, detail Whitelabel name | `GET /api/whitelabels/:id` | — |

Never sent:

- `sort` / `order`: Core keys are unpublished.
- `access`: Core support is unconfirmed, and its effect could not be verified.
- `whitelabelId` on `/investors`: observed **400** "property whitelabelId
  should not exist".

## Observed contracts

### Investor projection

The global list and the scoped read return the **same** projection.

| Field | Type observed | UI use |
| --- | --- | --- |
| `id` | number | Investor identity (string in the frontend) |
| `type` | `"investor"` | validated, not shown |
| `fullName` | string | name |
| `email` | string | e-mail |
| `phone` | string, 11 digits | **masked**: `(11) •••••-1234`, as in the approved design |
| `whitelabelId` | number | tenant (name resolved through the Whitelabel registry) |
| `accessState` | string (`active` observed) | Status da conta (`active`/`paused` → Ativa/Pausada, other tokens shown as sent) |
| `businessState` | string (`approved`, `waiting` observed) | **Validação do cadastro** (Aprovada / Aguardando, other tokens shown as sent) |
| `emailVerifiedAt` | ISO datetime | detail |
| `termsAcceptedAt` | null in every sample | detail ("Não informado") |
| `termsRevisionId` | null in every sample | not shown |
| `createdAt` / `updatedAt` | ISO datetime | Cadastro column; detail |

- **List envelope:** `{ data: Investor[], meta: { page, perPage, total, lastPage } }`.
- **Order and limits:** newest `createdAt` first; `perPage` maximum 100 (101 → 400).
- **Scale:** homolog had 4,762 investors (239 pages at the default 20).

### `GET /investors/:id`

- **Wrapped:** `{ data: InvestorDetail }`. This differs from
  `/whitelabels/:id`, which returns the object directly.
- **Extra fields:**
  - `investorType`: `pessoa_fisica` observed, shown as "Pessoa física";
  - `personalInformationFilled`: 0 or 1, shown as Sim / Não;
  - `reasonForDeny`: null in every sample; shown when present.
- **Unknown or non-numeric id:** 404 `CORE_HTTP_ERROR` "Investor not found".

### `GET /whitelabels/:id/accounts?tipo=investidores`

- Same envelope and projection as the global list, filtered **by the server**.
- Every sampled row carried the requested `whitelabelId`. The totals equal
  that Whitelabel's `counts.investors`, and the per-Whitelabel totals sum to
  the global total.
- **Unknown Whitelabel:** 200 with an empty list. The UI therefore confirms the
  Whitelabel in the registry first and shows "Whitelabel não encontrado"
  instead of a misleading empty list.
- **Non-numeric id:** 400.

## Identities

| Identifier | Value | Used for |
| --- | --- | --- |
| **Investor id** | Core `investors.id` (`row.id`) | list rows, `#/operation/investors/:id`, `GET /investors/:id` |
| **Scoped "account" id** | the **same** Core Investor id | Nest forwards `GET /whitelabels/:wl/accounts/:accountId?tipo=investidores` to Core `/investors/:accountId` (source). Live: three scoped rows matched `/investors/:id` exactly. Neither projection exposes a separate account or user id. |
| **Whitelabel id** | Core numeric id (`whitelabelId`) | scope (`?whitelabel=`), names, link to `#/whitelabels?id=` |
| **Future KYC / investment navigation** | Investor id, once those domains are integrated | today there are no links: the KYC and Finance prototypes use `inv_proto_*` ids |

- The code keeps `InvestorRecord.id` and `whitelabelId` as separate fields.
- The frontend does **not** assume that any other domain, such as KYC cases or
  wallets, shares the Investor id.
- No mapping exists between prototype ids and real ids.

## Field classification

**A. Backend-authoritative**

- Name, Investor id, e-mail, phone (masked), Whitelabel id, account access
  state, registration validation.
- Investor type, personal information filled, e-mail verified, terms accepted,
  created and updated dates.
- Denial reason, when present.
- List totals and pages (`meta`).

**B. Derived presentation**

- Avatar initials.
- Whitelabel names, by joining `whitelabelId` with the authoritative registry
  (fallback "Whitelabel #id").
- Pt-BR labels for known tokens, the phone mask and date formatting (Brasília).
- Local sort, offered only when the whole result fits on one page.

**C. Unavailable / pending**

- KYC status, KYC summary and KYC case reference.
- Investment associations and counts.
- Last activity.
- Summary cards "Ativos", "KYC não concluído" and "Com investimentos" (not
  supplied by the integrated read contracts).
- Account administration.

All of these show "—" or "Aguardando integração". **No value comes from the
prototype seeds.**

## UI behaviour

- **URL:** `#/operation/investors?whitelabel=&page=&search=`. Changing a filter
  replaces the history entry, as in KYC, Audit and Whitelabels. Reload,
  Back / Forward and direct links reproduce the same request.
  - An invalid `whitelabel` or `page` value (for example `wl_proto_01`) is
    ignored with a visible note.
  - A page past the last one is replaced by the last page.
- **Whitelabel selector:** "Todos os Whitelabels" uses the global read; a
  Whitelabel uses the **server-scoped read**.
  - The scoped view states "separados pelo Control Plane" and links to that
    Whitelabel's detail (`#/whitelabels?id=`).
  - If any scoped row has a different `whitelabelId`, nothing is shown and
    "Escopo do Whitelabel não confirmado" is displayed.
- **Search:** server-side, debounced 400 ms, at most 120 characters.
- **Filters removed:**
  - account status: global endpoint rejects it; scoped `access` unconfirmed;
  - KYC: no field;
  - investments: no field.
- **Pagination:** windowed, from `meta`.
- **List states:** skeleton rows while loading; an error block with a safe
  message, "Código de diagnóstico" and "Tentar novamente" (no retry for 403);
  separate empty states for "no investors", "none in this Whitelabel" and "no
  search results".
- **Columns:** Investidor · E-mail · Whitelabel · Status da conta · **Validação**
  do cadastro (formerly KYC) · Investimentos (— pending) · **Cadastro** (formerly Última
  atividade; the Core orders by it).
- **Detail:** the approved layout, with these differences:
  - KYC in the hero is "Aguardando integração".
  - The Investimentos and Compliance / KYC tabs are pending panels.
  - "Ver conta", "Ver investimentos" and "Ver no Compliance" are keyboard-
    operable **notices**. Those modules are prototypes keyed by prototype ids,
    so real ids are never sent there.
  - "Atividade da sessão" stays local and is labelled "não é auditoria".
  - "Voltar para Investidores" returns to the exact list context, including
    scope, page and search. The internal-only `returnTo` detail query preserves
    this context after a full reload; no mutable last-list global is used.
- **Prototype ids:** prototype modules still link to `#/operation/investors/inv_proto_*`
  (Financeiro › Investimentos / Wallet, Compliance › KYC). Those links now open
  a controlled "ID de protótipo" not-found state, **without any API call**.
  Those modules are unchanged.
- **Errors:**
  - Nest maps Core 5xx and Core 401/403 to **502** for investors (no 503
    remap, unlike Whitelabels). All of these show "Control Plane indisponível".
  - A Nest **401** ends the session centrally. 403, 5xx, network and timeout
    errors keep it.

## KYC boundary

- The Investor contract has **no KYC field**.
- `businessState` is the investor's registration validation (Core
  `/admin/investors` approve/deny; `reasonForDeny`). It is the same concept as
  the Accounts prototype's "Validação do investidor". It is shown as
  "Validação do cadastro" and explicitly labelled as **not** the Compliance KYC
  decision.
- Prototype KYC statuses (`KYC_DETAILS`, Accounts KYC dependency) are never
  used for real investors.

## Finance boundary

- No investment, wallet or payment request is made.
- Illustrative investment associations (`investors/prototypeInvestments.ts`)
  had no remaining imports/symbol consumers and were removed by Codex. The
  separate Finance Core seeds remain in use and were preserved. The removed
  file remains recoverable from Git history/the original recovery patch.
- Nothing is summed or counted from finance seeds.

## Validation (Cloud, mocked contract)

- `tsc -b`, `oxlint`, `npm run build`, `git diff --check`.
- `node scripts/check-investor-read.mjs` (synthetic, no network): parsing,
  identity strictness, the scope guard, exact query keys, prototype ids never
  reaching the API, central 401 vs 403/502, phone masking, URL state.
- Browser QA against a mock of the observed shapes:
  - flows: list → search → scope → pagination → detail → Back / Forward →
    reload;
  - states: loading, empty, scope missing, errors (502, 403, 400, HTML 502,
    malformed, network, scope mismatch), 401;
  - viewports: 320 / 390 / 768 / 1440 / 1672;
  - keyboard and axe.
- Regression: Whitelabel QA, the Operation / KYC / Audit / Finance suites,
  and a pixel comparison against `74f003f`.

## Open Backend / Product questions

1. **`businessState` vocabulary:** only `approved` and `waiting` were observed.
   What is the full set (`denied`?, others)? Registration validation is already
   established as distinct from Compliance KYC; that ownership is not reopened.
2. **`accessState` vocabulary:** only `active` was observed. Is `paused` the
   Accounts pause state? Does Core honour `access` on the scoped read, so the
   account-status filter could return server-side?
3. **Sort:** which `sort` keys does Core accept for investors? Today the order
   is `createdAt` desc, and local sort is offered only for single-page results.
4. **Search fields:** which fields does Core `search` match (name, e-mail,
   document)? The placeholder makes no promise.
5. **Aggregates:** active, KYC and investment counts are not supplied by these
   Investor read contracts. No additional metrics endpoint is integrated in
   this unit; this is not a claim that the entire Backend lacks aggregates. Should
   the summary cards stay pending or get a summary endpoint?
6. **Terms:** `termsAcceptedAt` / `termsRevisionId` were always null. Are they
   populated in other tenants, or not yet wired?
7. **Whitelabel → Investors entry point:** the approved Whitelabel detail has
    no "Investidores" action. Today the context is reached through the
    selector or `#/operation/investors?whitelabel=:id`. Should Product add an
    action there?

Resolved, not prerequisites for this integration: the global `whitelabelId`
filter is rejected (400), while the supported scoped Accounts endpoint works;
Investor detail is wrapped `{data}` and Whitelabel detail is direct. Those
endpoint-specific envelopes do not require Backend normalization. Direct-object
Investor detail is accepted defensively by the adapter, not claimed as a live
Backend response. Prototype links remain controlled not-found routes until their
source domains have separately approved real contracts; no identity mapping is invented.

## Independent Codex review — 2026-10-13

### A. Live homolog Backend contract evidence (read-only)

Authenticated Codex built-in browser, canonical `loor-super-admin.netlify.app`
origin and Render API. No credentials, token/header values or private record
values are recorded here. Initial probe/tool timeouts were reconciled; successful
subsequent reads established the following facts without changing Backend/CORS.

- Global pages 1/2 with `perPage=2`: HTTP 200, `{data,meta}`, total 4,762,
  distinct returned IDs and `lastPage=2381`.
- Detail of list-returned Investor 4772: HTTP 200, wrapped `{data}`; extra fields
  `investorType` string, `personalInformationFilled` number, `reasonForDeny` null.
- Scoped tenant 4: HTTP 200, total 4,674 matching its Whitelabel Investor count;
  every sampled row belongs to 4. A scoped row and detail have identical shared
  projection fields/Investor ID. No separate `accountId` or `userId` is exposed.
- Tenant 6: HTTP 200, total 68; every row belongs to 6. Observed `accessState`:
  `active`; `businessState`: `waiting`, `approved`. These are not exhaustive enums.
- One bounded name-derived search returned the originating ID. This proves that
  case, not the full set of searched fields or matching semantics. No raw query
  value is recorded.
- `perPage=100`: HTTP 200/100 rows; `perPage=101`: HTTP 400.
- Global `whitelabelId`: HTTP 400; nonnumeric tenant ID: HTTP 400.
- Unknown Investor 2147483647: HTTP 404 `CORE_HTTP_ERROR`; unknown tenant with
  the same numeric probe ID: HTTP 200 with an empty paginated list.
- Sampled nullable fields include email verification and Terms acceptance/revision.
  No KYC, financial, last-activity or separate Account identity was inferred.

### Review refinements

- Own-property status lookup prevents `constructor`/`toString` from resolving
  inherited functions and crashing a badge. Future tokens retain neutral labels.
- Safe-integer, consistent total/per-page/last-page metadata checks fail closed.
- Tenant-name reads reject a response whose Whitelabel ID differs from the request.
- Internal-only URL return context preserves scoped page/search after detail reload;
  external and unrelated return destinations are rejected.
- Visible list label is now explicitly “Validação do cadastro”, with wrapping.
- The unreferenced Operation Investor investment seed was deleted; shared
  prototype participants remain required by Finance/KYC/Entrepreneur screens.

### Maintained regression coverage

The full historical Operation/Finance browser runners were scratch-only and were
not recoverable in this repository. Their old assertion/pixel/axe totals are not
claimed as a fresh rerun. No temporary adapted copies replace maintained tests.

- `scripts/check-investor-read.mjs`: augmented existing contracts, not weakened.
- `scripts/check-operation-finance-regression.mjs`: maintained source/model checks
  for frozen independent Finance records and explicit lineage, retained Entrepreneur
  prototypes, KYC/Finance prototype identity boundaries, no Investor fallback,
  read-only transport, windowed pagination, date sorting and reload-safe return URLs.
- Existing `check-whitelabel-read.mjs` and `check-compliance-audit.mjs` remain intact.
- Actual browser scenarios below are representative reviewed-branch checks, not
  claims that the unavailable legacy browser suites were rerun in full.

### B/C. Reviewed local UI / synthetic edges

A disposable external Vite development-only server uses synthetic non-JWT
credentials and faithfully shaped records. It does not proxy Backend or change
application auth code. Its helper, process and local tab are removed before commit.
Screenshots stay outside the repository and contain synthetic records only.

Verified locally: global/scoped paging and totals, bounded server search, URL state,
detail/direct route/reload and browser Back/Forward, scoped return after reload,
unknown/prototype Investor IDs, unknown/legacy tenant handling, empty state,
explicit retry, 403/500/HTML/malformed failures, nullable fields, future status tokens,
scope mismatch rejection, loading semantics and late-response scope protection.
Cross-domain notices and pending Finance/KYC tabs do not display prototype values.
The literal-space URL assertion was corrected to check decoded query values (`+`
and `%20` are equivalent encodings); tenant and row checks were retained.

Responsive list checks: 1672, 1440, 768, 390 and 320 px, no horizontal page overflow.
Keyboard tab navigation passed. This does not claim a new full axe/WCAG audit.

Additional verified scenarios: profile widths 390/320 without overflow, disabled
Account navigation, keyboard switching into the KYC pending panel, Finance and KYC
prototype-origin profile links reaching controlled not-found, and the 20-second
read timeout retaining the session and recovering through explicit retry. A local
synthetic 401 used centralized expiry/clearing; Back could not restore the shell.
The request ledger stayed at 110 while idle and recorded no non-auth writes,
financial/KYC requests or requests containing invalid prototype identities.

Representative local smoke checks passed on Dashboard, Whitelabels, Accounts,
Settings, E-mails, Opportunities, Entrepreneurs, the six Finance pages, KYC and
Audit. They are not a replacement claim for unavailable historical pixel/full-flow
runners. No console warnings/errors or uncaught application errors were observed;
controller timeouts whose actions completed were reconciled through readback,
not treated as frontend failures or blindly replayed.

Final validation: TypeScript, oxlint, production build and `git diff --check` pass.
Maintained checks: Investor 42; Operation/Finance boundary 254; Whitelabel/auth 49;
Compliance/Audit 361. No assertions were dropped or weakened. Build retains the
non-blocking large-chunk advisory and reported environment-dependent Vite plugin
timings. No dependencies were added.

The external QA process/helper/empty task directory and temporary local tab were
removed before commit; viewport overrides were reset. Source/build scans found
no temporary fixture markers. Screenshots remain outside Git. Original Cloud
patch was neither applied nor committed. Main, canonical dev, Backend, Netlify and
the backend-handoff branch remain unchanged. No Investor/Account/KYC/financial
mutation was performed against homolog. This review creates one local feature
commit only; reviewed-branch UI → live API E2E awaits separate promotion approval.
