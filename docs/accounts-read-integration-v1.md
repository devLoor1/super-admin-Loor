# Accounts Read Integration V1

Sixth real-data unit of the Super Admin frontend, implemented by Cloud from
`dev` `1005a0d`, then independently reviewed by Codex on
`feature/accounts-read-integration-v1`. **Contas do Whitelabel**
(`#/whitelabels/:whitelabelId/accounts`) now reads the Control Plane Accounts
contract.

The integration is **strictly read-only**:

- the illustrative accounts and every local write simulation (pause,
  reactivate, Whitelabel change, new administrator) are no longer shown;
- no KYC or Company value is mapped or inferred.

Account, Investor, Entrepreneur, Whitelabel administrator, Company and KYC stay
distinct concepts.

The read foundation is reused unchanged:

- `authenticatedGet`: Bearer, `X-Correlation-ID`, 20 s budget, GET only;
- central 401 handling;
- `ApiError` and `describeApiError`;
- `useRemote`;
- `useUrlSearchDraft`;
- the Operation Whitelabel context (`useWhitelabelOptions`, `useWhitelabelRecord`);
- the Investor and Entrepreneur parsers.

The Accounts screens never touch browser storage.

## Evidence classes

| Class | What it is |
| --- | --- |
| **A. Real contract** | Read-only GETs in the operator's authenticated homolog session (2026-10-15; structure, tokens and counts only — no personal values recorded), plus the Nest source `backend-super-admin-Loor` `0177437` (`src/modules/accounts/*`) |
| **B. Local implemented UI** | Codex: production build in the built-in browser against an external loopback-only mock reproducing A's structure, synthetic values only. Cloud's earlier standalone Chromium run is historical, not Codex evidence. |
| **C. Synthetic edge cases** | Unobserved shapes and failures: other-tenant rows, wrong `type`, wrong identity, malformed / duplicate / inconsistent pages, HTML 502, 400 / 401 / 403 / 404 / 5xx, network, 20 s timeout, a homolog-size tenant (4,674 investors) |

**Not claimed:** reviewed UI → live API E2E. The class A capture used the API
directly from the authenticated homolog origin, not this build.

## Live contract (class A)

### Ownership

`AccountsController` (Nest) is a **tenant-scoped pass-through to the Core**:

| `tipo` | Core endpoint used by Nest |
| --- | --- |
| `investidores` | `/internal/super-admin/v1/investors?whitelabelId=` |
| `empreendedores` | `/internal/super-admin/v1/entrepreneurs?whitelabelId=` |
| `administradores` | `/internal/super-admin/v1/whitelabels/:id/admins` |

The same controller also has `POST …/accounts/:accountId/pause` and
`…/reactivate`, which write an audit row. **They are never called** by this
UI (see *Write capabilities*).

### Endpoints

| Read | Response | Notes |
| --- | --- | --- |
| `GET /api/whitelabels/:whitelabelId/accounts?tipo=…&page&perPage&search` | `{ data: Row[], meta: { page, perPage, total, lastPage } }` | non-numeric Whitelabel id → 400 (Nest); **unknown Whitelabel → 200 with `total: 0`** (live: id 999) |
| `GET /api/whitelabels/:whitelabelId/accounts/:accountId?tipo=…` | `{ data: Row }` (wrapped; live for all three kinds) | account of another Whitelabel → **404 `CORE_HTTP_ERROR`** (live: an administrator of WL 6 requested under WL 4); non-numeric account id → 404 (live) |

| Query | Support (live + source) | Sent by the UI |
| --- | --- | --- |
| `tipo` | DTO enum `investidores` / `empreendedores` / `administradores`; missing → `investidores`; anything else → **400** (live: `tipo=foo`) | always |
| `type` | DTO alias `investor` / `entrepreneur` / `admin` (overrides `tipo`) | **never** — `tipo` is the only vocabulary used |
| `page`, `perPage` | `perPage` ≤ 100 | `page`, `perPage=8` |
| `search` | Server search. Live: an administrator e-mail fragment returned 1 of 2 (same as a local match over the same page); a nonsense term returned 0. Investors / entrepreneurs: verified in the Investor / Entrepreneur units | when typed (≤ 120 characters) |
| `access` | Accepted; admin list does not forward it, Investor/Entrepreneur lists forward it when Core supports it. Live Investor `access=paused` returned the same active rows and total. | **never** |
| `sort` | Accepted/forwarded. Live Investor `sort=fullName` retained the default IDs/order. No supported sort-key contract inferred. | **never** |
| `order` | Accepted/forwarded. **Independent correction:** Investor `order=asc` returned a different, ascending-date page. Do not generalize Cloud's earlier inert-order claim across domains. No order control is part of this V1. | **never** |
| anything else (`status`, …) | Validation whitelist → **400 `HTTP_ERROR`** (live: `status=x`) | never |

### Rows

| Kind | Fields (live) | Notes |
| --- | --- | --- |
| Investor (`type: "investor"`) | `id`, `type`, `whitelabelId`, `fullName`, `email`, `phone`, `accessState`, `businessState`, `emailVerifiedAt`, `termsAcceptedAt`, `termsRevisionId`, `createdAt`, `updatedAt` (13) | the **same projection and id** as `GET /api/investors`; detail adds `investorType`, `personalInformationFilled`, `reasonForDeny` (16) |
| Entrepreneur (`type: "entrepreneur"`) | `id`, `type`, `whitelabelId`, `fullName`, `email`, `phone`, `accessState`, `businessState`, `emailVerifiedAt`, `createdAt`, `updatedAt` (11) | the **same projection and id** as `GET /api/entrepreneurs` |
| Administrator (`type: "admin"`) | `id` (number), `type`, `whitelabelId` (number), `email` (string), `fullName` (**null on all 4**), `accessState`, `businessState` (observed `active`), `invitation` (observed `accepted`), `isSuperAdmin` (boolean, **false on all 4**), `createdAt`, `updatedAt` (11) | the Core tenant-admin record; detail identical |

Homolog distribution on 2026-10-15:

| Kind | Distribution |
| --- | --- |
| Administrators | WL 4 → 2, WL 6 → 1, WL 7 → 1; WL 1 / 2 / 3 → 0 (**total 4**) |
| Investors | WL 4 → 4,674 |
| Entrepreneurs | WL 4 → 35 |

## Identity model

| Concept | Identity | In this UI |
| --- | --- | --- |
| **Account** | `(Whitelabel id, tipo, id)` — no separate account or user id exists in the contract | URL `#/whitelabels/:id/accounts?tipo=…&conta=:id`; detail region keyed by `kind:id` |
| **Investor** | Core investor id (same number in `/investors/:id`) | proven cross-link to `#/operation/investors/:id` |
| **Entrepreneur** | Core entrepreneur id (same number in `/entrepreneurs/:id`) | proven cross-link to `#/operation/entrepreneurs/:id` |
| **Whitelabel administrator** | Core tenant-admin id — **its own id space** | no other module; no link invented |
| **Whitelabel** | Core Whitelabel id | confirmed by `GET /api/whitelabels/:id`; link to `#/whitelabels?id=` |
| **Company** | not exposed | "Aguardando integração da empresa" |
| **KYC** | not exposed | "Aguardando integração (Compliance › KYC)" |

Ids **overlap across domains**: an investor, an entrepreneur and an
administrator may share a number. The detail request always carries `tipo`,
and the response must have:

- the requested `type`;
- the requested `id`;
- the requested `whitelabelId`.

Otherwise nothing is shown ("Conta não confirmada" or "Resposta inesperada").

A list row whose `whitelabelId` differs from the requested tenant invalidates
the whole page (`SCOPE_MISMATCH`, "Escopo do Whitelabel não confirmado").
Ids are validated as canonical positive integers (`^[1-9]\d{0,17}$`). A
prototype id (`inv_proto_*`), `01` or `1e3` resolves to "Conta não encontrada"
**without a request**.

## Administrators and the Dashboard `tenantAdmins` finding

The counts disagree:

| Source | Administrators |
| --- | --- |
| `GET /api/dashboard` → `kpis.tenantAdmins` (live 2026-10-15) | **6** |
| Whitelabel registry `admins` (= `counts.admins`): 7→1, 6→1, 4→2, 1/2/3→0 | **4** |
| Accounts `tipo=administradores` lists, summed over all six Whitelabels | **4** |

The registry and the Accounts lists **agree with each other (4)**. The Accounts
contract does **not** explain the Dashboard's 6:

- Accounts exposes no filter for inactive, deleted, invited or global
  administrators;
- every listed admin is `active`, `accepted` and `isSuperAdmin: false`.

**Semantic relationship: UNKNOWN.** The Nest Dashboard service is only a Core
pass-through and does not define the counted population. No cause, exclusion or
Backend defect is inferred, and the registry page covers all six listed tenants.

The Dashboard is **not modified** by this unit and keeps its existing card
semantics (see `docs/dashboard-read-integration-v1.md`). This is listed as an
open Backend question.

## Whitelabel scope

- The page confirms the tenant with `GET /api/whitelabels/:id` (the same
  shared lookup used by Operação). The accounts list is requested in parallel
  but **shown only for a confirmed Whitelabel**. An unknown id answers the list
  with `200`/empty, so the list alone cannot prove a tenant exists.
- 404 → "Whitelabel não encontrado"; other errors → error + retry; no account
  data is shown in either case.
- A non-numeric path id → "Selecione um Whitelabel" with the Control Plane
  registry as links; no accounts request is made. This includes the side
  menu's existing `wl_proto_01` default, the prototype modules' sub-nav and the
  KYC "Ver conta" links.
- The context selector lists the registry (`GET /api/whitelabels?perPage=100`).
  Choosing a Whitelabel navigates (history entry) to its Accounts route,
  keeping `tipo`.
- Sub-nav links keep the current path id. With a real numeric id, the
  prototype Config. / E-mails / Financeiro screens fail closed ("Whitelabel
  não encontrado") — known, unchanged prototype behaviour.

## Access state, registration state and KYC

| Field | Meaning in the UI | Labels |
| --- | --- | --- |
| `accessState` (all kinds) | **Acesso** — account access, rounded pill with a dot | `active` → Ativa, `paused` → Pausada, other tokens shown as sent (muted) |
| investor `businessState` | **Validação do cadastro** — never KYC | `approved` → Aprovada, `waiting` → Aguardando, others as sent (neutral) |
| entrepreneur `businessState` | **Situação do cadastro** — profile completeness, never Company validation | `profile_complete` → Cadastro completo, `incomplete` → Cadastro incompleto, others as sent |
| admin `invitation` | **Convite** | `accepted` → Convite aceito, `pending` → Convite pendente, others as sent |
| admin `businessState` | **Situação (valor do Core)** — meaning undefined in the contract | shown as sent (neutral) |
| admin `isSuperAdmin` | **Sinalizador isSuperAdmin (Core)** — meaning undefined | Sim / Não as sent; never presented as a role or permission |

Registration states use squared badges (`BusinessBadge`); access uses the
rounded `StatusPill`, so the two never read as one state.

Unknown tokens:

- are shown as sent;
- are looked up with `Object.hasOwn`, so `constructor` and `__proto__` stay
  inert.

## Company and KYC boundaries

Neither contract exposes Company or KYC fields. The detail shows them as
pending notes only:

| Kind | Pending notes |
| --- | --- |
| Investor | KYC, Investimentos |
| Entrepreneur | Empresa, KYC |
| Administrator | "Função e permissões: não expostas" |

No KYC status, Company name, CNPJ, role or permission is derived. The open
**Empresas** requirement is unchanged.

## Write capabilities

All account writes stay **disabled and unreachable**. The detail shows
"Ações de acesso desativadas (somente leitura)" with no buttons. Nothing calls:

- pause, reactivate;
- change Whitelabel, delete, create, edit;
- password reset, invitation;
- role, access or permission changes.

The superseded prototype files are **no longer imported**:

- `accountListConfig.ts`;
- `dialogs/AccessDialogs.tsx`, `ChangeWhitelabelDialog.tsx`,
  `NewAdminDialog.tsx`;
- `dialogs/AccountDialogs.module.css`.

Codex verified source/import consumers and removed these five dead files.
The canonical test now asserts absence rather than keeping inert write dialogs.
No write functionality is thereby authorized or introduced.

`accountModel.ts` and `prototypeAccounts.ts` stay because Operação,
Compliance and participants still import them.

## Fields shown (A / B / C)

| Class | Fields |
| --- | --- |
| **A — real contract, defined meaning** | id, `fullName`, `email`, `whitelabelId` (→ Whitelabel name / link), `accessState`, investor / entrepreneur `businessState`, admin `invitation`, `phone` (masked: area code + last 4), `emailVerifiedAt`, `createdAt`, `updatedAt`, investor `investorType`, `personalInformationFilled`, `reasonForDeny` (only when present), `termsAcceptedAt`, `termsRevisionId` |
| **B — real contract, meaning undefined (shown raw, neutral)** | admin `businessState`, admin `isSuperAdmin` |
| **C — not in the contract (pending / not shown)** | Company, KYC, investments, roles / permissions, last activity, CPF / CNPJ documents, dependencies, history, terms revision currency, transfer requests |

## UI behaviour

**URL state:** `#/whitelabels/:id/accounts?tipo=&page=&search=&conta=`.
Reload, Back / Forward and direct links reproduce the same reads.

| Parameter | Behaviour |
| --- | --- |
| `tipo` | an unknown value is reported ("Parâmetro da URL não reconhecido e ignorado") and investors are shown |
| `page` | invalid → reported; past the end → clamped to `meta.lastPage` |
| `search` | ≤ 120 characters, debounced 400 ms |
| `conta` | the selected account; without it, the detail shows the first row of the current page |

**History:**

| Action | URL change | Effect |
| --- | --- | --- |
| Select an account | push | — |
| Change `tipo`, page or search | replace | resets `conta` |
| Change Whitelabel | push | — |

**List:**

- type tabs (segmented, ←/→; vertical below 480 px);
- server search and windowed server pagination (`1 2 3 … 585` on a
  homolog-size tenant);
- columns Nome | E-mail | Acesso | Validação do cadastro / Situação do cadastro
  / Convite | Criada em, which collapse by container width;
- states:
  - loading skeleton;
  - empty: tenant / search, with "Limpar busca";
  - error with a diagnostic code and retry when retryable;
- no access / registration filters (the Core ignores them) and no sort.

**Administrators:** the contract has no names, so the row shows the e-mail as
the display name plus "Nome não informado · ID n". The e-mail wraps before "@".

**Detail:** one persistent `#account-detail` region (shared detail
transition) containing:

- Informações principais;
- Dados do cadastro / Dados do administrador;
- Vínculos;
- Ações da conta (disabled note).

States:

- loading;
- "Conta não encontrada", with "Ver a primeira conta da lista";
- error with retry;
- "Nenhuma conta em exibição";
- "Detalhes indisponíveis" when the list failed.

On phones, selecting a row scrolls the stacked detail into view and focuses it.

**Errors:**

| Response | Shown as |
| --- | --- |
| 400 | "Consulta não aceita" |
| 401 | central sign-out |
| 403 | "Acesso não permitido" (no retry) |
| 404 | not found |
| 5xx / Nest 502 `CORE_HTTP_ERROR` | "Control Plane indisponível" |
| timeout | "demorou a responder" |
| network | "Sem conexão" |
| malformed / HTML | "Resposta inesperada" |

Backend messages are never rendered.

## Files

| File | Role |
| --- | --- |
| `src/features/whitelabel-accounts/accountsApi.ts` | contract notes, kind vocabulary, strict admin parser, kind / scope / identity guards, GET-only requests (supported keys only), label helpers |
| `accountsRoute.ts` | `?tipo=&page=&search=&conta=` parsing and hrefs |
| `accountsPresent.ts` | registration-state headings / labels, initials, scope-error wording |
| `useAccountsData.ts` | `useAccountList`, `useAccountDetail` (keyed by Whitelabel, kind and id) |
| `WhitelabelAccountsPage.tsx` (+ CSS) | tenant confirmation, choose / not-found / error states, tabs, list + detail composition, URL navigation |
| `AccountListPanel.tsx` (+ CSS) | read-only list panel |
| `AccountDetailPanel.tsx` (+ CSS) | read-only detail + read states |
| `AccountsWhitelabelSelector.tsx` (+ CSS) | registry-backed context selector (reuses the prototype selector's styles; the prototype selector itself is unchanged for Config. / E-mails / Financeiro) |
| `src/app/App.tsx` | Accounts route passes `tipo`, `page`, `search`, `conta` and the raw query |
| `scripts/check-accounts-read.mjs` | maintained synthetic contract checks, strengthened by review |
| `scripts/check-compliance-audit.mjs` | preserves existing checks and covers all 23 KYC→Accounts prototype context links |
| dead dialog/config files | removed after consumer proof (see *Write capabilities*) |

**Not modified:**

- Whitelabels, Investidores, Empreendedores, Dashboard, Auditoria and Auth;
- the Oportunidades, Financeiro and KYC prototypes;
- the side navigation;
- Backend, database, Netlify and the canonical handoff branch.

## Historical validation (Cloud)

The following records Cloud's first pass. Its scratch 120/120 browser claim is
not counted as independently executed Codex browser coverage. Dashboard 81/88
and Auth 26+1 scratch results were reported baseline-identical, not maintained
repository suites; they are not silently counted green or treated as Accounts
regressions. The maintained repository suites are rerun independently below.

See the final report for the run of 2026-10-15. Maintained checks:

- `npm run typecheck`;
- `npx oxlint`;
- `npm run build`;
- `git diff --check`;
- every `scripts/check-*.mjs`.

Browser QA (classes B / C) and module regressions ran on scratch builds
against the scratch mock and are not repository code.

## Independent Codex review — 2026-10-15

### Recovery and live contract (A)

Verified live `origin/dev` and local HEAD at
`1005a0d4a6a37bb29e2033fb39a674e3d1788bc2`, preserved all 22 Cloud files, and
created `feature/accounts-read-integration-v1` without reset, recovery-patch
reapplication, rebase or lost work. Source was inspected read-only at Nest
`01774379eee8f4a1ed83afd51cdb2c4c10fc67f8` (Accounts controller/service/DTO,
pagination DTO and Dashboard service). No Backend checkout or configuration changed.

Independent authenticated homolog GET evidence:

- Registry: HTTP 200, all six tenants on one page. Administrator counts sum to 4.
- All six `tipo=administradores&perPage=100` reads: HTTP 200; WL 4 → 2,
  WL 6 → 1, WL 7 → 1, WL 1/2/3 → 0. All four observed rows had null fullName,
  `accessState=active`, `businessState=active`, `invitation=accepted`,
  `isSuperAdmin=false`. No role/permission or Company/KYC relationship was present.
- WL 4 Investor and Entrepreneur lists: HTTP 200 / `{data,meta}`, total 4,674
  and 35 respectively, numeric domain IDs/tenant IDs, expected field sets and
  valid created/updated timestamps. Their access/business state vocabularies
  remain distinct; phone/name/e-mail values are not copied into this document.
- Scoped detail for all three kinds: HTTP 200 / `{data: Row}`, requested
  identity/type/tenant matched. Investor detail added investorType,
  personalInformationFilled and reasonForDeny. Investor and Entrepreneur
  scoped detail bodies exactly equalled their respective global detail bodies.
- Known listed records requested under another tenant: 404 `CORE_HTTP_ERROR`
  for all three kinds. One malformed administrator ID (`abc`) also returned
  404. No unrelated-ID enumeration or write endpoint was used.
- Missing tipo defaulted to Investor; invalid tipo and unsupported status
  returned 400 `HTTP_ERROR`. perPage 100 succeeded, 101 failed 400; page 2
  returned the next eight Investor records. An administrator e-mail-fragment
  search returned one matching record; its actual value is not recorded.
- Investor `access=paused` returned the same active rows/count; `sort=fullName`
  alone retained the default IDs/order. **Correction:** `order=asc` alone
  returned ascending createdAt records. It is not inert for Investors. Other
  kinds' order/search-field semantics are not extrapolated from this probe.
- Dashboard HTTP 200 still returned `tenantAdmins=6`. Nest only passes the Core
  aggregate through. **Accounts=4 / registry=4 / Dashboard=6; relationship UNKNOWN.**
  This is a Backend/Product question, not a proven defect or a UI correction.

An initial aggregate browser command exceeded its tooling deadline; it was not
classified as an API error. Subsequent bounded GET summaries established the
facts above. Credentials/tokens and raw personal values were never exported.

### Justified refinements

1. Added Accounts-local canonical positive/safe-integer tenant validation,
   rejecting zero, leading-zero, exponent, prototype and unsafe IDs before any
   tenant/Accounts request. Shared Whitelabel/Operation parsers are unchanged.
2. Reject pagination over the proven perPage cap, nonempty out-of-range pages,
   and responses whose page/perPage differ from the actual request. A test mock
   now echoes the requested metadata correctly; no meaningful assertion was removed.
3. Found a genuine 320 px middle-page pagination overflow (document width 393;
   pager width 362 inside a 243 panel). Added only `flex-wrap: wrap` and
   `max-width: 100%` to the Accounts pager. Controls and approved layout remain.
4. Removed only five proven-dead Account dialog/config files. Shared accountModel,
   prototypeAccounts, badges, selector styles, KYC and Operation consumers remain.
5. Corrected stale README promotion text using the accepted Audit deployment/E2E
   result. No canonical handoff branch or other feature documentation was changed.

### Local UI / synthetic edges (B / C)

Only the Codex built-in browser was used. The reviewed production bundle was
served by an external temporary loopback server with an in-memory API URL
replacement and fully synthetic fixtures. Normal local Login used dummy values;
no real access token, credentials, API proxy or frontend auth bypass was used.
The on-disk production bundle retains the real API URL. This is **not reviewed
UI → live Backend E2E**.

- Tenant selection, all type tabs, server pagination/search, page reset/clamp,
  pending-search → type transition, list → detail, direct detail, reload and
  Back/Forward passed. The fixture deliberately overlaps numeric ID 3 across
  all three domains; kind/tenant switches never substitute another record.
- Late Investor responses did not overwrite the newer Entrepreneur context.
  New tenant scope remounts independently. Prototype and leading-zero tenant
  routes show selection recovery without Accounts requests; prototype account
  IDs show not-found without a fake request or fallback.
- Wrong list tenant/type and malformed pages hide the entire page; wrong detail
  id/type/tenant hide detail. Explicit scope wording, 404, 403 without retry,
  safe 500 and explicit retry recovery passed. The mock's raw PII-error sentinel
  was not rendered. Retry caused one list GET plus its normal selected-detail GET.
- Empty search/list, loading and detail-unavailable states passed. Null admin
  names remain explicit, with e-mail as a separate display identifier, not an
  invented person name. Admin businessState/isSuperAdmin remain raw and qualified.
- **49 saved responsive observations:** seven scenarios (Investor middle-page
  pager, Entrepreneur pending Company/KYC, long-email/null-name admin, empty,
  error, not-found, loading) × 1672/1440/1280/1024/768/390/320. No document overflow;
  semantic loading was present at all seven widths. An oversized browser-test
  batch hit a tooling timeout; its lost result array was not counted. The final
  shorter batches were rerun and saved outside Git.
- Keyboard arrow selection, panel relationships, selector ArrowDown/Escape and
  focus return passed. Screenshots were saved/inspected in this run; no full
  WCAG/axe conformance claim is made. The design audit prompted the narrow pager
  fix only, not typography, shell, Dot Matrix or Product redesign.
- Zero captured console errors/warnings. The local request ledger contains no
  business writes or prototype-ID requests. Synthetic 401 cleared local token
  and operator storage and returned to Login with the expiration notice.

Flow review: (1) choose a real tenant — healthy/recoverable; (2) inspect a scoped
list and detail — healthy, clearly read-only; (3) inspect null-name administrator
metadata — healthy, unknown semantics explicitly qualified. Final captures
`03-choose-tenant.png`, `04-reviewed-list-detail.png`, `05-admin-null-name.png`
and generated responsive/request ledgers are outside the source repository.

### Maintained validation and disposition

Maintained suites: Accounts **33**, Compliance/Audit **400**, Audit **97**,
Whitelabel/auth **49**, URL lifecycle **14**, Operation/Finance **285**, Investor
**42**, Entrepreneur **45**, Dashboard **45** — **1,010 passing checks**.
All 31 original Accounts cases remain (with dead-file expectations migrated),
plus pagination-response and narrow-pager coverage. Compliance/Audit retains
all 331 prior assertions and adds three Accounts-navigation assertions for
each of the 23 frozen KYC cases. No temporary adapted suite replaces canonical tests.

TypeScript, oxlint, production Vite build and `git diff --check` pass. Only the
inherited large-bundle advisory remains. Source diff guards confirm Dashboard,
Audit, Operation, KYC, auth/shared API clients and dependencies are unchanged.
Cloud's baseline-identical scratch failures were not independently reproduced
or counted green; there are no failing maintained feature checks hidden here.

**Disposition:** reviewed local feature ready for separate promotion authorization.
No push, dev promotion, deployment, Backend/configuration change or live business
mutation occurred. Future promotion still needs deployed read-only Accounts E2E.
The open Backend/Product questions below do not authorize inference or write UI.

## Open Backend / Product questions

1. **Dashboard `tenantAdmins` = 6 vs 4 listed administrators** — which
   administrators does the KPI count that the per-tenant admins endpoint does
   not return?
2. **Admin `businessState`** (`active`) — what does it mean beside
   `accessState`, and what is its vocabulary?
3. **Admin `isSuperAdmin`** — what does it grant? Is it ever true for a tenant
   admin?
4. **Admin names** — `fullName` is null on every administrator; is a name
   captured anywhere?
5. **Invitation vocabulary** beyond `accepted`, and how pending / expired
   invitations appear.
6. **`access` / `sort`** are accepted with no filtering/sort-key effect observed
   in the reviewed Investor probes. What semantics are supported per kind?
   Investor `order=asc` does work by date; its cross-kind contract remains to
   be documented. This V1 sends none of those three optional parameters.
7. **Unknown Whitelabel** answers the list with 200/empty instead of 404.
8. **Search fields** per kind (which columns `search` covers) are not
   documented.
9. **Company** entity and the Entrepreneur ↔ Company relationship (the open
   Empresas requirement).
10. **KYC** read contract per account.
11. The account **write contract**: pause / reactivate exist in Nest; the
    authorization, reason, audit and UI rules are still to be designed.
12. The side menu "Contas" default — should it remember the last Whitelabel
    instead of the prototype id?

## Follow-ups (out of scope here)

- Whitelabels detail quick action "Contas" still shows its notice; linking it
  to `#/whitelabels/:id/accounts` is a separate Whitelabels change.
- Config. do Whitelabel / E-mails / Financeiro remain prototypes keyed by
  `wl_proto_*` ids.
- Any future write UI requires a separately approved contract and implementation;
  the removed prototype dialogs are not a deferred live-write integration.
