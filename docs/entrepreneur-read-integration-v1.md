# Entrepreneur Read Integration V1

Third real-data unit of the Super Admin frontend, implemented by Cloud from
`dev` `e8e97f0` for Codex review. **Operação › Empreendedores** (list and
detail) now reads the Nest Control Plane. It is **read-only**: there are no
Entrepreneur, Account or Company writes, and KYC, Opportunities and Finance
are not integrated.

> **EMPRESAS BUSINESS REQUIREMENT = STILL OPEN.**
> The Entrepreneur contract has **no Company entity**. This unit integrates
> *Empreendedores*; it does **not** implement *Empresas*. Details are in
> [Company / Empresa finding](#company--empresa-finding).

The read foundation is reused unchanged:

- `authenticatedGet`: Bearer token, `X-Correlation-ID`, 20 s budget, GET only;
- central 401 handling;
- typed `ApiError` and `describeApiError`;
- `useRemote` (abort, `reload`, `lastData`).

Screens never touch `sessionStorage` directly.

## Evidence classes

| Class | What it is | Where |
| --- | --- | --- |
| **A. Real contract capture** | Read-only GETs against the homolog API in the operator's authenticated session, plus the Nest source | [How the contract was established](#how-the-contract-was-established), [Observed contract](#observed-contract) |
| **B. Local implemented UI** | The built app driven in a browser against a mock that reproduces the class A shapes | [Validation](#validation-cloud) |
| **C. Synthetic edge cases** | Mock or unit scenarios that were not observed live: errors, malformed bodies, scope mismatch, sparse records, unknown tokens | [Validation](#validation-cloud) |

**Not claimed:** reviewed UI → real Backend E2E. Localhost CORS was not
changed, and no build was deployed.

## How the contract was established

Nest passes the Entrepreneur responses from Core through **without mapping**,
and the Core source is not available. The shapes were therefore captured live
on homolog on 2026-10-14 (UTC):

- The operator signed in themselves in the Claude browser pane, on the
  canonical Netlify origin.
- Cloud ran **GET requests only** in that page.
- Cloud recorded **only** envelope structure, field names, types,
  nullability, enum tokens and counts. No personal values, tokens or headers
  were recorded.

Nest source (`backend-super-admin-Loor` `dev` `0177437`) confirms the
following:

- `src/modules/entrepreneur/*`
  - `GET /entrepreneurs` and `GET /entrepreneurs/:id` are pure pass-through
    to Core `/internal/super-admin/v1/entrepreneurs[/:id]`.
  - Roles: `SUPER_ADMIN`, `SUPPORT_ADMIN`, `READ_ONLY`.
- `src/modules/accounts/accounts.service.ts`
  - The scoped list forwards to the **same** Core endpoint with
    `whitelabelId`.
  - The scoped detail forwards to Core `/entrepreneurs/:accountId` with the
    same `whitelabelId`.
- `src/common/dto/pagination-query.dto.ts`: `page` ≥ 1, `perPage` 1–100,
  `search`, `sort`, `order`; unknown keys are rejected.
- `src/integrations/loor-core/loor-core.client.ts`: a Core 401/403 or 5xx
  becomes **502** `CORE_HTTP_ERROR`; other Core 4xx keep their status.

## Endpoints used

| Purpose | Endpoint | Query sent |
| --- | --- | --- |
| Global list | `GET /api/entrepreneurs` | `page`, `perPage=8`, `search` (when typed) |
| Whitelabel-scoped list | `GET /api/whitelabels/:whitelabelId/accounts` | `tipo=empreendedores`, `page`, `perPage=8`, `search` |
| Detail | `GET /api/entrepreneurs/:id` | — |
| Whitelabel names and selector | `GET /api/whitelabels` | `page=1`, `perPage=100` |
| Scope confirmation, detail Whitelabel name | `GET /api/whitelabels/:id` | — |

The last two reads are the shared Whitelabel context, the same calls
Investidores makes.

Never sent:

- `sort` / `order`: the Core keys are unpublished.
- `access`: Core support is unconfirmed.
- `whitelabelId` on `/entrepreneurs`: observed **400** "property whitelabelId
  should not exist".
- Any Company, KYC, Opportunity, Finance or Account-action endpoint.

## Observed contract

### Entrepreneur projection

The global list, the scoped read and the detail return the **same 11
fields**:

| Field | Type observed | Nullability observed | UI use |
| --- | --- | --- | --- |
| `id` | number | never null | Entrepreneur identity (string in the frontend) |
| `type` | `"entrepreneur"` | never null | validated, not shown |
| `whitelabelId` | number | never null | tenant (name from the Whitelabel registry) |
| `email` | string | never null | e-mail |
| `fullName` | string | never null | name |
| `phone` | string | never null | **masked**: area code + last 4 digits |
| `accessState` | string (`active`) | never null | Status da conta (`active` / `paused` → Ativa / Pausada; other tokens shown as sent) |
| `businessState` | string (`profile_complete`, `incomplete`) | never null | **Situação do cadastro** (Cadastro completo / incompleto; other tokens shown as sent) |
| `emailVerifiedAt` | ISO datetime | **null in 9 of 58** | detail |
| `createdAt` / `updatedAt` | ISO datetime | never null | Cadastro column; detail |

Nullability, types and tokens were re-checked over **all 58 records** in one
`perPage=100` read. Only aggregates were recorded.

The parser stays tolerant on display fields anyway. A missing value shows as
"não informado" and is never invented.

**Phone formats observed (58 records):**

| Format | Records |
| --- | --- |
| 11 digits | 48 |
| `+` followed by 13 digits | 8 |
| 13 digits without `+` | 1 |
| 18 digits | 1 |

The mask drops a `55` country prefix on 12–13 digits, with or without `+`.
Other international/irregular lengths use a generic mask and last four digits,
not an invented Brazilian area code. Text with letters, extensions or malformed
punctuation is mask-only; missing/non-string values are unavailable. The full
number is never rendered.

### List

- **Envelope:** `{ data: Entrepreneur[], meta: { page, perPage, total, lastPage } }`.
- **Order:** newest `createdAt` first.
- **Limits:** `perPage` maximum 100 (101 → 400). Unknown query keys → 400.
- **Scale:** 58 entrepreneurs on homolog at capture time (ids 1–58, one
  page at `perPage=100`).
- **Per Whitelabel:** 4 → 35, 6 → 16, 3 → 6, 7 → 1. Whitelabels 1 and 2 have
  none.
- **Search:** bounded probes matched name and e-mail. The full matching
  semantics were not established, and the placeholder makes no promise.

### `GET /entrepreneurs/:id`

- **Wrapped:** `{ data: Entrepreneur }`, with the same fields as the list. The
  adapter also accepts a direct object defensively; that shape was not
  observed.
- **Unknown or non-numeric id:** 404 `CORE_HTTP_ERROR` "Entrepreneur not found".

### `GET /whitelabels/:id/accounts?tipo=empreendedores`

- Same envelope, projection and record ids as the global list, filtered **by
  the server**.
- Every sampled row carried the requested `whitelabelId`, and the totals
  matched that Whitelabel's `counts.entrepreneurs`.
- **Unknown Whitelabel:** 200 with an empty list. The UI therefore confirms
  the Whitelabel separately and shows "Whitelabel não encontrado".
- **Non-numeric Whitelabel id:** 400.

## Company / Empresa finding

**The integrated Entrepreneur read contracts do not expose a Company entity.**
This is not a claim that Company does not exist elsewhere in Core.

Not present in any of the three projections, or in the Nest Entrepreneur and
Accounts modules:

- `companyId`;
- company name or legal name (razão social);
- CNPJ;
- company status or validation;
- an entrepreneur ↔ company relationship.

`businessState` (`profile_complete` / `incomplete`) describes the
entrepreneur's own profile completeness. It is not a company validation and is
not presented as one.

Consequences in this unit:

- The module keeps its name, **Empreendedores**. Nothing was renamed to
  "Empresas", and no Company object is created, derived or mocked.
- The detail shows **Empresa: "Aguardando integração da empresa"** in three
  places:
  - in the hero;
  - in the "Informações principais" list;
  - in an "Empresa — aguardando integração" panel, which explains that the
    contract has no company data.
- The list has no Company column or filter.
- **"Empresas" is not marked complete.**

> **EMPRESAS BUSINESS REQUIREMENT = STILL OPEN.** It needs a Backend contract
> (a Company entity and its relationship to Entrepreneurs) and a Product
> decision (whether Empresas is a separate module, or a section of the
> Entrepreneur profile) before any frontend work.

## Identities

| Identifier | Value | Used for |
| --- | --- | --- |
| **Entrepreneur id** | Core `entrepreneurs.id` (`row.id`) | list rows, `#/operation/entrepreneurs/:id`, `GET /entrepreneurs/:id` |
| **Scoped "account" id** | the **same** Core Entrepreneur id | Nest forwards the scoped detail to Core `/entrepreneurs/:accountId` (source). Neither projection exposes a separate account or user id. |
| **Whitelabel id** | Core numeric id (`whitelabelId`) | scope (`?whitelabel=`), names, link to `#/whitelabels?id=` |
| **Company id** | **does not exist in the contract** | nothing; "Aguardando integração da empresa" |

**Id overlap:** Entrepreneur ids overlap numerically with Investor ids
(separate Core tables; homolog had Investor ids in the same range). An id is
therefore only meaningful together with its domain:

- Routes are namespaced (`/operation/entrepreneurs/:id` vs
  `/operation/investors/:id`).
- Local session activity is keyed `entrepreneur:<id>`, so it never mixes with
  an Investor that has the same number.
- Investor behaviour (validation vocabulary, investor type, investments) is
  **not** assumed for entrepreneurs.

**Strict identity parsing:** a positive safe-integer `id`, a numeric
`whitelabelId` and `type: "entrepreneur"` are required. Anything else fails
closed as "Resposta inesperada". The detail id must equal the requested id.

**Prototype ids:**

- No mapping exists between prototype `emp_proto_*` ids and Core ids.
- Oportunidades and Compliance › KYC still link with prototype ids. Those
  links land on a controlled "ID de protótipo" not-found state **without any
  API call**.

## Field classification

**A. Backend-authoritative**

- Name, Entrepreneur id, e-mail, phone (masked), Whitelabel id.
- Account access state and profile completeness.
- E-mail verified, created and updated dates.
- List totals and pages (`meta`).

**B. Derived presentation**

- Avatar initials.
- Whitelabel names, by joining `whitelabelId` with the authoritative registry
  (fallback "Whitelabel #id").
- Pt-BR labels for known tokens, the phone mask and date formatting.
- Local sort, offered only when the whole result fits on one page.

**C. Unavailable / pending**

- Company (all fields).
- KYC status and KYC case.
- Opportunities and their count.
- Last activity.
- Summary cards "Ativos", "KYC não concluído" and "Com oportunidades".
- Account administration.

All of these show "—" or "Aguardando integração". **No value comes from the
prototype seeds.**

## UI behaviour

- **Design:** the approved Empreendedores composition is kept. Only
  integration states were added (loading skeletons, errors, empty states,
  scope notes, pending badges).
- **URL:** `#/operation/entrepreneurs?whitelabel=&page=&search=`.
  - Filter changes replace the history entry. Reload, Back / Forward and
    direct links reproduce the same request.
  - An invalid `whitelabel` or `page` value (for example `wl_proto_01`) is
    ignored with a visible note.
  - A page past the last one is replaced by the last page.
- **Whitelabel selector:**
  - "Todos os Whitelabels" uses the global read; a selected Whitelabel uses
    the **server-scoped read**.
  - There is no client filtering over a global page.
  - If any scoped row has a different `whitelabelId`, nothing is shown and
    "Escopo do Whitelabel não confirmado" is displayed.
- **Search:** server-side, debounced 400 ms, at most 120 characters.
- **Columns:** Empreendedor · E-mail · Whitelabel · Status da conta ·
  **Situação do cadastro** · Oportunidades (— pending) · Cadastro · Ações.
  There is no KYC or Company column.
- **Filters removed:** status, KYC and opportunity filters (no supported
  field or parameter).
- **Detail:**
  - The hero shows Empresa and KYC as "Aguardando integração".
  - The Oportunidades and Compliance / KYC tabs are pending panels.
  - "Ver conta", "Ver oportunidades" and "Ver no Compliance" are
    keyboard-operable **notices**. They never navigate, because those modules
    are prototypes keyed by prototype ids.
  - "Atividade da sessão" stays local.
  - "Voltar para Empreendedores" restores scope, page and search through the
    internal-only `?returnTo=`, which survives reload. External or unrelated
    destinations are rejected.
- **Errors:**
  - 502 (Core 5xx / 401 / 403), HTML 502, network and malformed responses
    show safe messages with "Código de diagnóstico" and "Tentar novamente".
  - 403 shows no retry.
  - 400 shows "Consulta não aceita".
  - A Nest **401** ends the session centrally. All other failures keep the
    session.
  - Raw Backend text is never shown.

## Domain boundaries

- **KYC:**
  - The contract has no KYC field.
  - `businessState` is never mapped to KYC; the UI says so explicitly.
  - KYC shows "Aguardando integração".
  - "Ver no Compliance" is a notice, never a link with a real id.
- **Finance:** no Finance call or value.
- **Opportunities:**
  - The prototype Opportunities relationship is no longer joined, so no
    prototype count appears.
  - The column, card and tab are pending.
- **Accounts:** no Account call. "Ver conta" is a notice, and no pause /
  reactivate action exists here.
- **Writes:** no POST, PATCH, PUT or DELETE is sent anywhere. The client is
  GET-only.

## Shared changes

- **Investor debounce follow-up**, fixed with the shared
  `src/app/useUrlSearchDraft.ts`.
  - *Problem:* on Investidores, changing scope or page within the 400 ms
    debounce window navigated with the **stale URL search**. That sent one
    extra request with the old term, before the pending term was committed.
  - *Fix:* the hook's `pendingSearch()` gives navigation the pending draft
    instead. Investidores and Empreendedores both use it. The Investor diff is
    a narrow replacement of the inline draft/debounce block (14+/23−), with no
    behaviour change other than the fix.
  - *Before (`e8e97f0`):*
    - clear the search, then change scope → requests `['a', 'a', none]`;
    - type a term, then change scope → `[none, 'ana']`.
  - *After:* `['a', none]` and `['ana']` respectively.
- **`features/operation/shared/whitelabelContext.ts`:**
  - Holds the Whitelabel registry and tenant-name reads used by both modules:
    `useWhitelabelOptions`, `useWhitelabelRecord` and `getTenantWhitelabel`,
    which rejects a different Whitelabel identity.
  - The Investor modules re-export from it, so their behaviour is unchanged.
- **`shared/ReadStates.module.css`:** integration-state styles copied from the
  Investor styles (`validationHeading` → `statusHeading`).
- **`shared/WindowedPagination.tsx`:** the windowed pager.
- **Unused prototype components:**
  - `shared/ParticipantList.tsx` and `ParticipantDetail.tsx` are no longer
    imported.
  - Each carries a "NOT USED SINCE ENTREPRENEUR READ INTEGRATION V1" header;
    Cloud could not delete files on the device. Codex subsequently verified
    absence of consumers and removed both components; they remain recoverable
    from the baseline Git history and original Cloud patch.
  - `participants.ts` remains, because KYC and Opportunities still use it.

## Validation (Cloud)

Class A: the live capture above. Classes B and C, against the observed shapes:

- `tsc -b`, `oxlint`, `npm run build`, `git diff --check`.
- `node scripts/check-entrepreneur-read.mjs` (synthetic, no network). It
  covers:
  - parsing and identity strictness, and that no Company / KYC / account
    field is derived;
  - malformed metadata and the scope guard;
  - exact query keys and `tipo=empreendedores`;
  - prototype ids never reaching the API;
  - central 401 vs 403 / 502 / network;
  - safe error views;
  - phone masking (national, `+55`, long);
  - profile labels, URL state and `returnTo` restrictions.
- All existing repository scripts re-run unchanged.
- Browser QA (mock of the observed shapes):
  - flows: list, pagination, server search, server scope, local sort for a
    complete scope, detail, `returnTo`, Back / Forward, reload, direct route;
  - states: loading, empty (global, scoped, search), scope missing, not-found
    (unknown, prototype, non-numeric);
  - errors: 502, 403, 400, HTML 502, malformed, network, scope mismatch;
    detail 5xx / 403 / malformed / network; retry; 401;
  - debounce cases;
  - the prototype cross-links from Opportunities and KYC;
  - no writes, Authorization only to the API host, no `localStorage`;
  - 320 / 390 / 768 / 1440 / 1672 px, keyboard, axe WCAG A/AA.
- Regression on the new build:
  - Investor and Whitelabel browser QA;
  - Operation / KYC / Audit / Finance suites, including auth without a
    session;
  - a pixel comparison against `e8e97f0`.

## Open Backend / Product questions

1. **Empresas (blocking that requirement):**
   - Is there, or will there be, a Company entity?
   - What is its relationship to Entrepreneurs (1:1, 1:N), and which fields
     and status does it have?
   - Does Empresas belong in Operação as its own module, or inside the
     Entrepreneur profile?
2. **`businessState` vocabulary:** only `profile_complete` and `incomplete`
   were observed. What is the full set? Is it ever tied to company
   validation?
3. **`accessState` vocabulary:** only `active` was observed. Is `paused` the
   Accounts pause state? Does Core honour `access` on the scoped read?
4. **Sort:** which `sort` keys does Core accept for entrepreneurs?
5. **Search fields:** which fields does Core `search` match?
6. **Aggregates:** active, KYC and opportunity counts are not supplied by
   these reads. Should the cards stay pending, or get a summary endpoint?
7. **Opportunities ↔ Entrepreneur:** which contract will link real
   Opportunities to real Entrepreneur ids? Until then, the prototype
   Opportunities keep `emp_proto_*` links that land on the controlled
   not-found state.
8. **Phone format:** four formats were observed (11, `+`13, 13 and 18
   digits). Is the value normalised anywhere (E.164)? Is the 18-digit value
   valid data?

## Out of scope (unchanged)

The following were not touched:

- Company CRUD, Entrepreneur writes, Account writes;
- KYC, Finance, Opportunities, Dashboard, Audit, menu management;
- Backend, CORS, the database, Netlify, `main`, the canonical `dev` and the
  backend-handoff branch.

## Independent Codex review — 2026-10-14

### Recovery and source review

Live `origin/dev` and local HEAD were `e8e97f0`; all 19 Cloud files (10 tracked,
9 new) were preserved on `feature/entrepreneur-read-integration-v1`. The recovery
patch was neither reapplied nor committed. No reset, clean, pull/rebase or
protected-branch update was performed.

All changed/new source and documentation were reviewed. Nest source was read
from GitHub at exact `01774379eee8f4a1ed83afd51cdb2c4c10fc67f8` (Entrepreneur
controller/service, Accounts controller/service and pagination DTO). Those reads
confirm pass-through, domain-qualified routing and no Company mapping in these
modules. Backend source was not modified.

### A. Independent real homolog contract checks

The existing Codex built-in tab initially showed Login. The user authenticated
manually in that same tab; Codex did not request or handle the password.
Subsequent probes used GET only. No credentials, token/header values or private
record values are recorded here.

- Global HTTP 200, `{data,meta}`, total 58; `perPage=100` succeeds.
- Pages 1/2 at `perPage=2` returned distinct IDs (54/55, then 56/57).
- All 58 rows have `type: entrepreneur`. Fields match the 11-field Cloud
  capture; nine records have null email verification. Observed access state:
  `active`; profile states: `profile_complete`, `incomplete`, not exhaustive enums.
- Detail 54: HTTP 200, wrapped `{data}`, identical to its list projection and
  no detail-only fields. No Company/CNPJ/Account/User identity is exposed.
- Tenant 4 scoped read: HTTP 200, total 35, every row in tenant 4; total matches
  the Whitelabel count. Shared projection fields/ID match detail 54.
- Bounded name and e-mail searches each returned the originating record. Full
  matching semantics are not inferred.
- `perPage=101`, global `whitelabelId` and one unknown query key each return 400.
- Unknown and nonnumeric Entrepreneur IDs return 404 `CORE_HTTP_ERROR`.
- Unknown numeric tenant returns HTTP 200 and an empty paginated list;
  nonnumeric tenant returns 400.
- Investor 54 also returns HTTP 200 with `type: investor`: numeric overlap is
  real, not evidence of a shared entity or an identity mapping.
- A redundant later probe hit a browser-controller timeout. The successful
  captured 100-row response was reused for type/nullability/phone-length/order
  evidence, rather than repeating the contract audit.

### Narrow refinements

- Require the observed `type: entrepreneur` identity marker, including when
  display fields are missing; absent/wrong types fail closed.
- Malformed phone text is mask-only; non-Brazilian international formats do not
  acquire a fabricated Brazilian area code. Numeric/non-string inputs cannot throw.
- The shared draft hook now observes the whole URL key. External scope-only
  Back/Forward restores the URL search and cancels an uncommitted draft; local
  scope/page changes explicitly carry the current draft.
- A pending search plus pagination resets to page one of the new result set,
  rather than requesting the selected page of the previous search.
- Remove only the two proven-unused participant components. `participants.ts`
  and dependent Opportunities/KYC/Finance prototypes remain intact.
- README distinguishes already-deployed Investor reads from this local reviewed
  Entrepreneur candidate. No visual redesign or Company capability was added.

### B/C. Independent reviewed local UI / synthetic edge evidence

A disposable external Vite development server used faithful synthetic fixtures
and a non-JWT dummy session through the normal Login UI. It never proxied the
real API or changed application auth code. Temporary fixture settings were not
added to production source/config or Git. Reviewed UI → live Backend E2E is
**not claimed**; it remains a post-promotion step.

The exact `e8e97f0` Investor page was loaded in-memory for comparison without
checking out or overwriting Cloud files. Its clear/scope transition sent the old
scoped search followed by the corrective clear. An initial test incorrectly
required total controller wall time below 400 ms; that timing assertion failed,
while the actual request sequence proved the bug. The semantic comparison and
deterministic 400 ms timer checks replaced that invalid timing assumption.

Final real-React A/B checks passed in both modules: immediate clear/scope sends
one scoped read without the stale term; immediate type/scope sends one scoped
read with the intended draft. C: Back/Forward restores scope/search, including
pending drafts. D: search/scope resets page; the actual navigation functions are
also covered for pending-search/pagination transitions. Two added maintained
assertions initially failed (scope-only history and pending-search pagination);
the code was fixed and those same assertions pass, without weakening them.

Other verified local cases: global/scoped pagination, search, detail/direct
route/reload and exact scoped return context, unknown/prototype IDs, unknown/
legacy tenants, loading with six skeletons, empty state, explicit retry, 403,
502/HTML/malformed responses, scope mismatch, null display values, future tokens,
late-response isolation, safe Account/Opportunity notices and KYC/Opportunity
pending panels. Opportunity and KYC prototype-origin Entrepreneur links reach
controlled not-found without sending prototype IDs to Core. Same numeric
Investor/Entrepreneur fixture 17 renders distinct profiles.

List and detail pass 1672/1440/768/390/320 px with no horizontal overflow.
Keyboard search→scope order and ArrowRight tab switching pass; controls have
accessible names. Reduced-motion skeleton animation is disabled. This is not a
new full axe/WCAG certification. Synthetic 401 uses canonical expiry; browser
Back cannot restore the authenticated shell. Controller startup/selector
deadlines were reconciled from current UI state, not treated as application
defects or blindly replayed.

Representative route smoke passes: Whitelabels, Investors, Dashboard, Accounts,
Settings, E-mails, Opportunities, Gateways, Modalities, Catalogs, Investments,
Payments, Wallet, KYC and Audit. The unavailable historical scratch browser,
pixel and keyboard runners are not claimed as rerun in full. Cloud-reported older
Audit/Auth failures involving `/auth/me` cannot be independently rerun without
those runners. The auth client is unchanged from the canonical baseline and the
maintained Whitelabel/auth checks pass; no new auth failure is attributed to this
feature without evidence.

### Maintained validation and remaining gate

Maintained checks cover Entrepreneur contracts/phone/identity, Investor contracts,
canonical Whitelabel/auth, Operation/Finance/KYC prototype boundaries and the
actual shared draft lifecycle. Temporary adapted copies are not substituted for
maintained coverage. Final results: Entrepreneur 45, Investor 42, draft lifecycle
14, Whitelabel/auth 49, Operation/Finance 285, Compliance/Audit 361, all pass.
TypeScript, oxlint, production build and `git diff --check` pass. The inherited
large-chunk build advisory remains non-blocking; no dependencies were added.
Local browser evidence has 84 successful functional checks plus the separately
classified invalid controller-timing assertion. No application console warnings
or errors were observed. The final mock ledger was stable while idle and contained
no non-auth writes or prototype IDs sent to the API.

The temporary local tab, exact QA server process/helper and empty task directory
were removed; viewport and media overrides were reset. Source/build scans found
no temporary fixture markers. Screenshots remain outside Git. The real homolog
session is preserved; only the synthetic local session was expired for testing.

Company remains an open Product/Backend requirement:
canonical Company ID, legal/display identity and CNPJ, tenant scope/status,
Entrepreneur relationship/cardinality and read authorization/API semantics,
plus Product placement (separate Empresas module versus profile section).

The reviewed read-only frontend can be promoted only with separate authorization.
No live Entrepreneur, Account, Company, KYC, Opportunity or financial mutation
was performed. Main, dev, backend-handoff, Backend, CORS and Netlify remain
unchanged. No feature push or deployment is part of this review.
