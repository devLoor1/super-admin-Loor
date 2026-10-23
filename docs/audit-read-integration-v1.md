# Audit Read Integration V1

> Current contract addendum — 2026-10-23: SA-BE-008 exact server filters and
> correlation-ID search are now independently source/live-qualified. See
> [Advanced Audit filters](audit-advanced-filters-read-v1.md) for the current
> URL, validation, inclusive date and UI contract. The original delivery and
> review evidence below is preserved historically: its unsupported-filter,
> search-scope and summary-card limitations are superseded by that addendum.
> The no-detail-endpoint limitation and privacy/RBAC boundaries remain.

Fifth real-data unit of the Super Admin frontend, implemented by Cloud from
`dev` `afe24bf` for Codex review. **Auditoria** now reads the Control Plane
audit log through `GET /api/audit`.

The integration is **strictly read-only**, and the illustrative event dataset
is no longer shown. **Detail:** the Control Plane has **no detail endpoint**,
so the detail screen presents the row that the list returned in this
session, explicitly labelled as such.

The read foundation is reused unchanged:

- `authenticatedGet`: Bearer, `X-Correlation-ID`, 20 s budget, GET only;
- central 401 handling;
- typed `ApiError` and `describeApiError`;
- `useRemote`;
- `useUrlSearchDraft`;
- `WindowedPagination`.

Audit screens never touch `sessionStorage`.

## Evidence classes

| Class | What it is |
| --- | --- |
| **A. Real contract** | Read-only GETs in the operator's authenticated homolog session (2026-10-14), plus the Nest source `backend-super-admin-Loor` `0177437` (`src/modules/audit/*`, `prisma/schema.prisma` `AuditLog`) |
| **B. Local implemented UI** | The built app in the Codex built-in browser against an external loopback-only mock reproducing class A's structure (34 synthetic rows: 25 success / 9 failure) |
| **C. Synthetic edge cases** | Unobserved shapes: admin-action rows with before / after data, hostile metadata (secrets, nested tokens, JWT, CPF, deep nesting, long values), unknown tokens, errors, malformed / duplicate / inconsistent responses |

**Not claimed:** reviewed UI → live API E2E (pending Codex promotion).

## Live contract (class A)

### Ownership

The audit log is **owned by the Control Plane itself**: a Nest + Prisma
`audit_logs` table on MySQL, not a Core pass-through.

**Writers:** Nest writes rows for its own actions:

- login success and failure;
- Whitelabel create / update;
- admin create;
- account pause / reactivate;
- SMTP update / test;
- gateway update;
- platform configuration update;
- opportunity approve / deny.

**Readers:** `SUPER_ADMIN`, `COMPLIANCE_ADMIN` and `READ_ONLY` may read it.
`SUPPORT_ADMIN` is excluded by the source role guard; that role was not impersonated in live QA.

### `GET /api/audit`

`{ data: AuditLog[], meta: { page, perPage, total, lastPage } }`

| Query | Support (live + source) | Sent by the UI |
| --- | --- | --- |
| `page`, `perPage` | `perPage` ≤ 100 (101 → 400). A page past the end returns 200 with an empty `data` and the real `total`. | `page`, `perPage=8` |
| `search` | Case-insensitive substring over **`action`, `resourceType`, `resourceId` only** (MySQL `contains`). Live: `LOGIN_FAILURE` and `login_failure` both returned 9. | when typed (≤ 80 characters) |
| `order` | `asc` / `desc` on `createdAt`. Live: `asc` gave oldest first. | `order=asc` only (desc is the default) |
| `sort` | Accepted by the DTO but **ignored**. Live: `sort=action` kept the date order. | never |
| anything else (`action`, `whitelabelId`, actor, resource, period…) | Source validation whitelist rejects unknown keys. Independently observed live: `action=LOGIN_FAILURE` → **400** `HTTP_ERROR`; not every unsupported key was separately probed. | never |

**Ordering:** newest first by default. **Independent Codex read:** 34 events;
Cloud's earlier 33-row capture is historical, not the current count.

### Row (`AuditLog` plus `superAdmin`)

| Field | Type | Independently observed (34 rows) | Notes |
| --- | --- | --- | --- |
| `id` | string (cuid) | always | event identity |
| `action` | string token | `LOGIN_SUCCESS`, `LOGIN_FAILURE` | observed vocabulary is not exhaustive; source writes other tokens |
| `result` | string | `success`, `failed` | not treated as an exhaustive enum |
| `superAdminId` | string (cuid) / null | null × 7 | null = no operator identified (failed login with an unknown e-mail) |
| `superAdmin` | `{ id, name, email }` / null | present × 27, `id` = `superAdminId` every time | operator who performed the action |
| `resourceType`, `resourceId` | string / null | **null × 34** | |
| `whitelabelId` | int / null | **null × 34** | |
| `beforeData` | JSON / null | **null × 34** | |
| `afterData` | JSON / null | null × 27; `{ email: string }` × 7 | attempted identifier, never substituted as actor |
| `ip` | string | × 34 | operator / requester IP; raw values not recorded in this report |
| `userAgent` | string | × 34 | |
| `correlationId` | string | × 34 | request id |
| `createdAt` | explicit-zone ISO datetime | × 34 | descending order independently checked |

### Detail availability

There is **no `GET /audit/:id`**: the controller has only the list. It was not
called, and no route was guessed.

The source list query uses Prisma `findMany` with no row-field selection, plus
the operator. This does **not** establish an individual authoritative detail
API. The screen presents a bounded projection of that list response, held in a
500-row, session-version-scoped memory cache, explicitly labelled **Registro da
listagem** above every tab. It is not a fresh individual read.

On a direct link or a reload, the screen shows an explicit **"Detalhe do
evento indisponível"** state with a link back to the list. Nothing is fetched
by id, guessed, or taken from the old illustrative dataset.

## Identity and fields shown

Field classes: **A** = authoritative Backend value, **B** = derived
presentation, **C** = unavailable.

| UI element | Source | Class |
| --- | --- | --- |
| Event ID | `id` | A |
| Action code | `action` | A |
| Event label ("Login realizado"…) | from `action`; unknown tokens shown as sent | B |
| Result pill | `result` (`success` → Sucesso, `failed` → Falha; others as sent) | A + B |
| Data e hora | `createdAt` (Brasília) and the ISO value in Metadados | A + B |
| Actor | `superAdmin.name` + `superAdminId`. No operator: "Não identificado". Name missing: "Operador sem nome". **Names are never derived from ids.** | A |
| Actor e-mail | `superAdmin.email`, **partially masked** (`o•••@domain`), detail only | A, masked |
| Resource | `resourceType` label + `resourceId`, or "Sem recurso registrado" | A + B |
| Whitelabel | `whitelabelId` as "Whitelabel ID n", or "Sem Whitelabel". **No name is looked up or guessed.** | A |
| Before / after | `beforeData` / `afterData`, sanitized (below) | A, sanitized |
| Correlation ID, IP, user agent | `correlationId`, `ip`, `userAgent` — detail "Metadados" tab only, never in the list | A |
| Module | **not in the contract**: no module column, icon or filter | C |
| "Com alterações", "Hoje", "Últimos 7 dias" cards | no aggregate in the contract; a page-local count would be partial | C ("—") |
| Related events (same correlation id) | `search` does not cover `correlationId` | C (removed) |
| "Ir para recurso" | resource ids are unproven and all null live; no mapping to prototype records | C (removed) |

## Labels

Action tokens written by the Nest source map to Portuguese labels:

- `LOGIN_SUCCESS`, `LOGIN_FAILURE` (the only ones observed);
- `CREATE_WHITELABEL`, `UPDATE_WHITELABEL`, `CREATE_ADMIN`;
- `PAUSE_ACCOUNT`, `REACTIVATE_ACCOUNT`;
- `TEST_SMTP`, `UPDATE_SMTP`;
- `UPDATE_GATEWAY`, `UPDATE_PLATFORM_CONFIG`;
- `APPROVE_OPPORTUNITY`, `DENY_OPPORTUNITY`.

Resource-type tokens written by Nest are labelled the same way:

- `whitelabel`, `whitelabel_admin`, `smtp`, `gateway`, `platform_config`;
- `opportunity`, `investor`, `entrepreneur`, `admin`.

Rules:

- Unknown tokens use neutral labels after safe-text projection; recognized
  credential-shaped values are hidden, not echoed as arbitrary labels.
- Lookups use own properties only, so tokens like `toString` stay safe.
- A label describes the recorded event only. An event about SMTP, KYC or
  Opportunities **does not** mean that module is integrated.

## Sanitization

**Control Plane (write time).** Keys matching
`password|secret|token|api[_-]?key|authorization|credential` are stored as
`"[REDACTED]"`.

**Gaps:** the following are **not** covered at write time:

- e-mail values (observed: the attempted identifier of failed logins);
- SMTP `pass` / `pwd`, private / PIX keys;
- documents (CPF, CNPJ, RG, passport);
- card and bank data;
- OTP / PIN;
- signatures, payloads;
- token-like values under innocuous keys.

`ip` and `userAgent` are stored in full.

**Frontend (render time, `auditPresent.ts`).** Every recorded value goes
through a structure-preserving, fail-closed sanitizer:

- **Recognized sensitive keys do not show a value.** The pattern is a superset of the
  Control Plane list plus the gaps above, e.g. `pass`, `senha`, `chave`,
  `pin`, `cvv`, `card`, `iban`, `agência`, `cookie`, `session`, `payload`.
  These render as "••••••••".
- **`"[REDACTED]"` markers** render as "[redacted]". **JWT / Bearer / PEM
  values** are masked whatever the key.
- **E-mail values** (including addresses embedded in arrays/free text) show only the first character
  and the domain: `a•••@dominio`. Anything that is not an address is fully
  masked. The operator's own e-mail is masked the same way.
- **Non-finite numbers and unsupported values** are masked.
- **Limits:** depth 5, 100 entries per container, a global budget of 500 nodes
  and 32,768 characters, displayed strings capped at 300 and keys at 120.
  Oversized input strings above 32,768 are hidden. Non-JSON objects/accessors
  fail closed; getters are not executed. Credential-pattern detection precedes
  API scalar truncation, including patterns embedded later in the string.
- **Raw view:** the secondary JSON view is generated from the **sanitized**
  tree only.
- Audit code does not persist recorded data in browser storage or log/copy raw
  metadata. List rows are retained in the bounded session memory cache described
  above. Only validated event IDs and safe identifier-shaped correlation IDs can
  be copied; masked/credential-shaped correlation values cannot. Authorized
  operators still receive the API response: frontend masking does not redact the
  network response, repair stored data, or replace server-side controls.

## UI behaviour

- **URL:** `#/audit?search=&order=asc&page=`. Changes replace the history
  entry; reload, Back / Forward and links reproduce the same request.
  - An invalid `page` or `order` is ignored with a note.
  - A page past the end is clamped to `meta.lastPage`.
- **Prototype context links** from other prototype modules — KYC "Ver na
  Auditoria", the Gateways / Modalidades quick actions — still pass
  `resourceType`, `resourceId`, `whitelabel`, `actor` and `action`. These are
  shown as **"não suportado pelo Control Plane e ignorado"** and are never
  applied on the client. The list shows the full query result.
- **Controls:**
  - search box (server-side, debounced 400 ms; the placeholder states what it
    matches);
  - date order select ("Mais recentes" / "Mais antigos primeiro");
  - "Limpar filtros".

  The module, result, period, Whitelabel, actor and action filters were
  removed: none is supported.
- **Columns:** Evento / ID · Código da ação · Recurso · Whitelabel · Ator ·
  Resultado · Data e hora · Ações. No sort buttons; the date header carries
  `aria-sort` for the server order.
- **States:** loading skeleton; empty log; empty search (with "Limpar
  busca"); error with a safe message, "Código de diagnóstico" and "Tentar
  novamente" (no retry for 403).
- **Detail tabs:**
  - **Visão geral:** fields above, plus navigation: search by this action
    code, copy ID, copy Correlation ID, back to the list.
  - **Dados registrados:** before / after trees, the privacy note, and the
    sanitized JSON.
  - **Metadados:** Correlation ID, IP, user agent, ISO and Brasília time,
    operator ID.
- **Back link:** "Voltar para Auditoria" restores search, order and page
  through the internal-only `?returnTo=`. External or unrelated destinations
  are rejected.
- **Errors:**
  - 400 → "Consulta não aceita".
  - 403 → "Acesso não permitido".
  - 5xx / HTML 502 → "Control Plane indisponível".
  - Network, timeout and malformed → their own safe messages.
  - **Malformed covers:** a bad id or action token, an invalid date, an actor
    object of another operator, duplicate ids, inconsistent `meta`.
  - A 401 ends the session centrally; every other failure keeps it.
  - Raw Backend text (e.g. Prisma messages) is never shown.
  - The shell stays usable.

## Audit semantics and boundaries

- **Read-only.** There is no edit, delete, revert, restore, replay,
  reprocess, approve / reject or export. The only interactions are
  navigation and copying an ID. The client is GET-only.
- **Not operational activity.** The Dashboard still shows "Últimos eventos"
  and "Atividade por período" as unavailable; it does not read `/audit` (a
  source check enforces this). "Ver todos" still just opens Auditoria.
- **No proof of other integrations.** UPDATE_SMTP, APPROVE_OPPORTUNITY and
  similar events are only recorded facts. Settings, E-mails, Finance,
  Opportunities and KYC keep their prototype boundaries.
- **The illustrative dataset is no longer displayed.** Codex removed only the
  proven-dead `prototypeAudit.ts`, `auditModel.ts` and `auditFormat.ts` after
  checking source consumers and migrating the maintained Compliance/Audit suite.
  KYC's model, store, fixtures and UI are unchanged. The prototype resource
  destination helper was removed from `auditRefs.ts`.

## Files

| File | Change |
| --- | --- |
| `src/features/governance-audit/auditApi.ts` | new — parser (strict identity, consistent `meta`, actor check), `GET /audit` with supported keys only, session-scoped in-memory row cache |
| `src/features/governance-audit/auditRoute.ts` | new — URL state, unsupported-param report, `returnTo` |
| `src/features/governance-audit/auditPresent.ts` | new — labels, sanitizer, e-mail mask, actor / resource text |
| `src/features/governance-audit/useAuditData.ts` | new — `useRemote` hook |
| `src/features/governance-audit/AuditListPage.tsx` | rewritten — real list |
| `src/features/governance-audit/AuditDetailPage.tsx` | rewritten — session row presentation or explicit unavailable state |
| `src/features/governance-audit/AuditUi.tsx` | real-data cells (actor, tenant, result, icon) |
| `src/features/governance-audit/auditRefs.ts` | copy helper only |
| `src/features/governance-audit/Audit.module.css` | recorded-data tree styles |
| `src/features/governance-audit/{prototypeAudit,auditModel,auditFormat}.ts` | deleted after consumer proof and canonical test migration |
| `src/app/App.tsx` | `#/audit` passes `search` / `order` / `page`; detail passes `returnTo` |
| `scripts/check-audit-read.mjs` | new — unit, sanitization and source contracts |
| `scripts/check-compliance-audit.mjs` | migrated obsolete fake-event expectations; retained KYC independence and all 23 context-link checks |
| `README.md`, `docs/governance-audit-v1.md`, this doc | documentation |

## Historical validation (Cloud, first pass)

The following is Cloud's supplied evidence, not a claim that Codex independently
reran its axe or pixel-comparison tooling. Codex evidence is recorded separately
below. Historical mock CUIDs are synthetic, not live event IDs.

- **A:** live capture of structure and tokens, plus query probes:
  - `search` case-insensitivity;
  - `order=asc`;
  - `sort` ignored;
  - unknown key → 400;
  - `perPage=101` → 400;
  - page 2 and out-of-range page.
- **Checks:** `tsc -b`, `oxlint`, `npm run build`, `git diff --check`.
- **`node scripts/check-audit-read.mjs`** (synthetic, no network):
  - parsing (observed rows, 10 malformed shapes, list consistency);
  - exact query keys;
  - session-scoped row cache;
  - 401 central vs 403 / 5xx / network;
  - no raw text;
  - URL state and `returnTo` restriction;
  - 38 sensitive keys;
  - marker / JWT / PEM masking;
  - e-mail masking;
  - nested / array / depth / size limits;
  - unsupported scalars;
  - labels;
  - source boundaries: no prototype data, storage, writes or logging in the
    Audit screens, and no Dashboard → Audit read.
- **All existing repository scripts re-run.**
- **Browser QA (B / C) against the observed-structure mock:**
  - guard;
  - loading;
  - list (real ids, order, footer, totals);
  - pagination and clamp;
  - server search (debounced) and empty search;
  - server order;
  - unsupported prototype params;
  - detail from the list (no request), Back / Forward, reload → unavailable,
    prototype id → unavailable;
  - masked attempted e-mail;
  - hostile metadata (no sentinel in the DOM);
  - unknown tokens and sparse rows;
  - nine error shapes, empty log, retry, 401;
  - Dashboard boundary;
  - no writes or `localStorage`;
  - 1672 / 1440 / 768 / 390 / 320 px (list and all three detail tabs);
  - keyboard and axe WCAG A/AA (list, three detail tabs, unavailable, error,
    empty).
- **Regression:** the Whitelabel, Investor, Entrepreneur and Dashboard flows
  on the new build and on `afe24bf`; the shared Operation / KYC / Finance /
  auth suites; and a pixel comparison against `afe24bf`.

## Independent Codex review — 2026-10-14

### Recovery and live evidence (A)

- Preserved all 17 Cloud worktree files from `afe24bfefc9dfe7eb985084f7d32e3b4ba27cced`;
  no reset, patch reapplication, lost work or automatic dev reconciliation.
  Review branch: `feature/audit-read-integration-v1`.
- Independently inspected current Control Plane source
  `01774379eee8f4a1ed83afd51cdb2c4c10fc67f8`, including controller, service,
  pagination DTO, global validation and Prisma `AuditLog`.
- Authenticated homolog `GET /api/audit?page=1&perPage=100` returned **200**,
  34 rows, `{data, meta}`, `page=1`, `perPage=100`, `total=34`, `lastPage=1`.
  Individual IDs and raw personal values were not retained in documentation.
- `LOGIN_FAILURE` and `login_failure` searches both returned 9 and identical
  ordered IDs; substring `FAIL` also returned 9 matching rows. `order=asc`
  was monotonic ascending; `sort=action` retained the default date order.
- Page 2 / perPage 8 returned 8 with `lastPage=5`; page 99 returned 200 / empty
  data while preserving total 34. perPage 101 and an unsupported `action` query
  returned 400 / `HTTP_ERROR`.
- Later ID-recovery reads encountered upstream **502 / network failure / timeout**.
  The successful earlier reads establish the contract, not continued availability.
  No Backend/CORS/configuration change or undocumented detail request was made.

**Single blocked case:** a direct local route using an *actual previously observed
live CUID* could not be exercised because individual live IDs were not retained
and were not recoverable. Per the user's explicit continuation instruction, no
ID was fabricated and no further live request was made solely to obtain one.
This is an upstream-availability/evidence limitation, not a demonstrated frontend
defect. Direct synthetic valid-CUID, old-prototype-ID and reload cases passed;
these are not labelled as the missing real-ID case.

### Refinements justified by review

- Kept the Cloud API/list/route foundation. Hardened explicit-zone/calendar
  timestamp validation, the perPage cap and scalar credential detection before
  truncation; reused the unchanged canonical auth/session client.
- Normalized sensitive keys, covered short `pass` / `pwd` and PIN variants,
  retained harmless `compass`, `discarded` and `cardinality`, masked embedded
  Bearer/JWT/PEM and keyless e-mail values, and imposed global traversal budgets.
- Protected actor/resource/metadata text and unsupported URL-filter echoes.
  Masked correlation values cannot become copy actions. Sanitized field-key
  collisions cannot cause duplicate React keys.
- Moved list provenance above the tabs so it remains visible in every detail
  section. Kept IP / user-agent secondary in Metadados. Qualified privacy copy
  to distinguish recognized-pattern masking from Backend storage responsibility.
- Added narrow wrapping for masked values and unknown result pills. No shared
  StatusPill, shell, Dashboard, KYC, auth, Product or visual-system redesign.
- Removed three dead Audit-only source files after consumer proof. Migrated the
  canonical Compliance/Audit suite, not a temporary copy: obsolete fake-event
  dataset/count/reference-period assertions became real-contract boundaries;
  frozen KYC fixtures/store, participant destinations and **all 23** KYC→Audit
  unsupported-context links remain covered. No KYC UI/data changes.

### Local UI and synthetic evidence (B / C)

Only the Codex built-in browser was used. An external temporary loopback-only
server served the production build with an in-memory API-base replacement and
fully synthetic responses. Normal Login UI used a dummy local-only session;
no real token, credential, Backend proxy or app auth bypass was used. The on-disk
production bundle retains the real API base. This is **not authenticated live E2E**.

- Pagination, debounced server search, ascending order, URL state, out-of-range
  clamp, loading, empty log/search, safe 500, 403 and malformed-response states,
  and a single-request retry passed. 403 preserves the shell and omits retry.
- List → detail uses the loaded row with visible provenance and **zero detail
  GETs**. Back / Forward retains search/order/page. Reload and prototype/direct
  synthetic CUID show controlled unavailability without substitution.
- Attempted e-mail never becomes an authenticated actor. Null resource/tenant
  values remain unavailable, unknown vocabulary remains neutral.
- Hostile nested data / JSON and credential-shaped user-agent/correlation values
  exposed no test sentinel. Correlation copy is absent when masked. Deep / large
  structures remain bounded with explicit omission, not recursive expansion.
- Lists and all three detail tabs passed **1672 / 1440 / 768 / 390 / 320 px**
  document-overflow checks. Captures were saved outside Git and visually inspected.
- Arrow-key tab selection/focus, one selected tab, linked tab panels and visible
  focus outline passed. Independent axe/WCAG conformance or pixel-diff testing
  is **not claimed**; the earlier Cloud claims remain historical evidence.
- Dashboard source is unchanged, its local UI keeps activity unavailable and its
  navigation issued only `GET /dashboard`, not `GET /audit`.
- Synthetic 401 cleared local session storage and returned to Login through the
  centralized handler; 403/5xx did not clear the session. No local business writes
  or `/audit/:id` calls occurred. Browser console contained no captured app errors.

### Maintained validation and disposition

Canonical suites: Audit **97**, Compliance/Audit **331**, Whitelabel/auth **49**,
URL draft **14**, Operation/Finance **285**, Investor **42**, Entrepreneur **45**,
Dashboard **45** — **908 passing checks**, synthetic/source/deterministic, no network.
The dedicated Audit suite retains the first-pass cases and adds fail-closed
privacy, metadata, parser and rendering boundaries. No assertions were weakened
to hide a regression.

TypeScript, oxlint, production Vite build and `git diff --check` pass. The inherited
large-bundle advisory remains non-blocking. No new dependencies, recovery patch,
screenshots, temporary browser/server helper or real sensitive fixture belong
to the reviewed commit.

**Disposition:** technically reviewed local feature, with the single real-CUID
case explicitly blocked as above. No reviewed UI → live Backend E2E claim.
Separate promotion authorization and deployed read-only runtime QA remain next;
no push, dev promotion, deployment or backend-handoff update is part of this task.

## Open Backend / Product questions

1. **Detail endpoint:** should the Control Plane expose `GET /audit/:id`, so
   direct links and reloads can show an event? Today they show "indisponível".
2. **Filters:** `action` (exact), actor, `resourceType` + `resourceId`,
   `whitelabelId`, result and a date range are all rejected (400). Which
   filters will the Control Plane support? Should `search` also cover
   `correlationId` and actor?
3. **Sort:** `sort` is accepted but ignored. Remove it from the DTO, or
   implement it?
4. **Aggregates:** totals by result, by day ("Hoje", "Últimos 7 dias") or
   "with changes" would need an aggregate. Should the cards stay pending?
5. **Personal data (LGPD):**
   - Failed logins store the **attempted e-mail** in `afterData`. That may be a
     third party's address or a mistyped password; the UI masks it.
   - Operator e-mail, IP and user agent are returned to every reader role.
   - What may each role see, and for how long are rows retained?
   - Should the Control Plane mask or omit these server-side?
6. **Write-time redaction gaps:** extend the server pattern (`pass`, private
   / PIX keys, documents, card / bank data, OTP / PIN, token-like values)?
   The frontend already masks these, but stored data should not depend on it.
7. **Event taxonomy:**
   - Only `LOGIN_SUCCESS` / `LOGIN_FAILURE` were observed live. Is `result` limited to
     `success` / `failed`?
   - Will admin actions always set `resourceType`, `resourceId` and
     `whitelabelId`?
   - Are those ids Core ids? Navigation to the resource stays disabled until
     this is confirmed.
8. **Module / tenant naming:** the contract has no module and no Whitelabel
   name. Should the list show tenant names (a join), or is the ID enough?
9. **`SUPPORT_ADMIN`** cannot read Audit (403). Is that intended?

## Out of scope (unchanged)

The following were not touched:

- every mutation of Audit, Whitelabel, Investor, Entrepreneur, Account,
  Opportunity, KYC, Finance or Settings, and exports;
- the Dashboard;
- Backend, the database, CORS, Netlify, `main`, the canonical `dev` and the
  backend-handoff branch.
