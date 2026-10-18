# Opportunities + Companies Read Integration V1

Real-data unit for **Operação › Oportunidades**, **Operação › Empreendedores ›
Empresas** and the **Entrepreneur → Company** relationship, implemented by
Cloud from `dev` `3e727b9` for Codex review. The screens now read the Nest
Control Plane instead of the illustrative Opportunity and Company records.

> **OPPORTUNITIES + COMPANIES READ INTEGRATION V1 IS READ-ONLY.** Only `GET`
> requests are sent, through the canonical `authenticatedGet`. No Opportunity
> create, edit, approval, denial, publication or status change exists; no
> Company create, edit, validation or delete exists. `POST /opportunities/:id/approve`
> and `/deny` exist in the Backend but are out of scope and never referenced.

Out of scope and unchanged: Finance (including its known deployed QA limitation
about a CNPJ-like string inside `opportunity.name` on refund / out movements,
tracked separately), Whitelabel CRUD (writes disabled), Menu Visibility (23 IDs,
`PUT` and enforcement disabled), Investors, Accounts, Compliance / KYC, Audit,
Dashboard, and every Backend / Core / database / Netlify configuration.

**Delivery status:** Cloud patch recovered exactly once into the isolated local
branch `feature/opportunities-companies-read-integration-v1` and independently
reviewed for one local feature commit (§ J). No push, promotion or deployment.
No deployed UI-to-live-API E2E has been run for this candidate (it is not deployed).

Evidence classes used below:

| Class | Meaning |
| --- | --- |
| DOCUMENTED | Stated in Backend docs (`docs/opportunities-read-contract-v1.md`, `docs/arthur-demands-backend-v1.md` § Demanda 2) |
| SOURCE-CONFIRMED | Read in the Backend source (`backend-super-admin-Loor` `aea5392`, fixes in `33e4646`) |
| LIVE-GET-VERIFIED | Observed with bounded live GETs on homolog on 2026-10-18 (structure only) |
| MOCK-TESTED | Exercised by node suites or browser QA against synthetic mocks |
| UNCONFIRMED | Not verifiable in this unit |

## A. Baseline

- Frontend baseline: `origin/dev` `3e727b95f9cd9a6fce51de7c13f359d38b2838d9`
  (Finance Read Integration V1), verified before work started. The canonical
  checkout was not touched; work happened in an isolated Cloud worktree.
- Backend: `dev` = homolog source `aea5392`; the Opportunities / Companies
  fixes are in `33e4646`. A historical commit was not assumed to be deployed:
  the deployed behaviour was checked with live GETs (§ B).
- Hosts: frontend homolog `https://loor-super-admin.netlify.app`, Backend
  homolog `https://backend-super-admin-loor.onrender.com/api`.
- Maintained canonical suites at baseline: 14, all passing (counts in § H).

## B. Backend contract

### Source gate (SOURCE-CONFIRMED / DOCUMENTED)

- `OpportunityFiltersDto` extends `PaginationQueryDto`: `page`, `perPage`
  (1–100), `search`, `whitelabelId` (int ≥ 1), `status` ∈ `review | active |
  finished | archived`, `modality` ∈ `equity | debt`, `sort` (string; unknown
  keys ignored by the Core), `order` ∈ `asc | desc`.
- `CompanyFiltersDto`: same pagination, `search`, `whitelabelId`, `status` ∈
  `pending | validated | invalid | not_found | unavailable`, `sort`, `order`.
- `CompanyByEntrepreneurQueryDto`: optional `whitelabelId`.
- Controllers: roles `SUPER_ADMIN`, `SUPPORT_ADMIN`, `READ_ONLY` (SUPER_ADMIN
  always passes the RolesGuard). Detail ids must match `^\d+$` and be > 0,
  otherwise 400 `E_VALIDATION`. Global `ValidationPipe` with `whitelist`,
  `transform`, `forbidNonWhitelisted`. The loor-core client propagates Core
  error codes.

### Live GET gate (LIVE-GET-VERIFIED, 2026-10-18)

162 GETs (including one `/auth/me`), 0 non-GET, with the existing SUPER_ADMIN
session; a page-scoped helper read the token inside its closure and was deleted
afterwards. One more list GET after the independent review checked only the
date format (total 163 GETs, 0 non-GET). Only structure, counts and codes were
recorded — no names, documents or contacts.

- **`GET /opportunities`** → `{ data, meta }`, total 78. Row keys: `id`,
  `whitelabelId`, `entrepreneurId` (numbers), `name`, `businessName`,
  `modality`, `status`, `fundraisingCompletion` (`reached_minimum_goal` |
  `did_not_reach_minimum_goal` | null), `isPrivate`, `segment {id, name}`,
  `resourceUse {code, name} | null`, `dueAt` / `openedAt` / `endedAt`
  (string | null), `createdAt`, `updatedAt`. All dates are full timestamps with
  the São Paulo offset (`…T00:00:00.000-03:00` or other times), so formatting
  them in `America/Sao_Paulo` shows the intended local calendar date. Every filter and combination
  added up and returned matching rows. Search matches `name` / `businessName`.
  Sort works for `createdAt`, `updatedAt`, `name`, `status`, `dueAt` (nulls
  first ascending, last descending); unknown keys are ignored. A page past the
  end answers an empty page with `meta.page` = requested (not clamped).
- **`GET /opportunities/:id`** → `{ data }` + `description`, `about`,
  `quotaQuantity`, `reasonForArchiving`. Unknown → 404
  `E_OPPORTUNITY_NOT_FOUND`; `abc` / `0` / `-1` / `1.5` → 400 `E_VALIDATION`.
  No money, Company or investor field exists. Every `entrepreneurId` exists
  and its Whitelabel matches. `id == entrepreneurId` on 2 rows is a
  coincidence, not an identity rule.
- **`GET /companies`** → `{ data, meta, cardinality }` with
  `cardinality = { entrepreneurToCompany: "0..1", companyToEntrepreneur: "1", note }`,
  total 25. Row keys: `id`, `entrepreneurId`, `whitelabelId`, `legalName`,
  `tradeName` (null on 7), `cnpj` (14 raw digits), `status`, `createdAt`,
  `updatedAt`. `entrepreneurId` values are unique. Filters add up; search
  matches legal name, trade name and CNPJ digits; sort works for `createdAt`,
  `updatedAt`, `cnpj`, `legalName`; default `perPage` 20.
- **`GET /companies/:id`** → `{ data, cardinality }` + `phone`, `email`,
  `validationSource`, `validatedAt`. Unknown → 404 `E_COMPANY_NOT_FOUND`;
  `abc` / `0` → 400.
- **`GET /entrepreneurs/:id/company`** → with a Company: 200 `{ data, cardinality }`
  (equal to the Company detail); without: 200 `{ data: null }` (33 of 58
  Entrepreneurs); unknown Entrepreneur: 404 `E_ENTREPRENEUR_NOT_FOUND`;
  `abc` / `0` / `-3`: 400 `E_VALIDATION`; a non-matching `whitelabelId`:
  404 `E_ENTREPRENEUR_NOT_FOUND`; an unknown query key: 400. The Entrepreneur
  detail itself has no Company field.

**Gate verdict: PASS.** No stop condition was triggered (authentication,
tenant isolation, cardinality, identity and the write-free read path all held).

### Discrepancies (documented; none blocking)

| Observation | Class | Frontend handling |
| --- | --- | --- |
| Docs mention a `per_page` alias; live it is rejected (400) | LIVE-GET-VERIFIED | Only `perPage` is sent |
| Invalid filters answer 400 `HTTP_ERROR`, not `E_VALIDATION` | LIVE-GET-VERIFIED | Any 400 → "Consulta não aceita" |
| Unknown `sort` keys are silently ignored (both resources) | LIVE-GET-VERIFIED | Only documented keys are offered or sent |
| Companies: `tradeName` sort is ignored | LIVE-GET-VERIFIED | Not offered |
| Opportunities: no `entrepreneurId` filter (400) | LIVE-GET-VERIFIED | `?empreendedor=` reported as unsupported; no per-Entrepreneur Opportunity list |
| Roles other than SUPER_ADMIN | SOURCE-CONFIRMED only | MOCK-TESTED (READ_ONLY / SUPPORT_ADMIN allowed, others 403) |
| 429 / 5xx behaviour | UNCONFIRMED live | MOCK-TESTED |

## C. Opportunities

**Adapter** (`opportunities/opportunityApi.ts`, GET only):
`listOpportunities` sends exactly `page`, `perPage` (20; 1 for the summary
counts), `search` (only when non-empty, ≤ 120 chars), `whitelabelId`, `status`,
`modality`, `sort`, `order`. Responses are parsed strictly on identity (`id`,
`whitelabelId`, `entrepreneurId` positive safe integers; status / modality are
valid tokens kept as sent) and tolerantly on display text (missing → `null`,
never invented). The page envelope must be consistent (meta, unique ids, no
empty page inside the range). A row contradicting an applied filter rejects the
whole page (`SCOPE_MISMATCH`); a page or page size other than the requested
one is rejected (`PAGE_MISMATCH` — the Backend echoes the requested page, even
past the end); a detail describing another id is rejected
(`IDENTITY_MISMATCH`). Invalid ids (prototype slugs, `0`, negatives, floats,
unsafe integers) are refused locally — no request.

**List** (`#/operation/opportunities`): summary cards with Backend totals
(four `perPage=1` reads: total, review, active, finished — "sem dados" while
loading or on failure, never 0); server-side search, Whitelabel (registry
names), status, modality and sort; URL keys `whitelabel`, `status`,
`modalidade`, `search`, `sort`, `order`, `page`; windowed pagination; a page
past the end is clamped once. Columns: name (fallback "Oportunidade sem nome
informado (#id)") with id and business name, Whitelabel, Entrepreneur link
(`opportunity.entrepreneurId`), modality, segment, resource use, status, due
date, updated at, view action. Invalid URL values are reported and dropped;
`?empreendedor=` is reported as unsupported; a leftover `?previa=` is ignored.

**Detail** (`#/operation/opportunities/:id`, optional `?returnTo=`): hero with
status, modality, the Whitelabel name and *Ver empreendedor* / *Oportunidades
deste Whitelabel* actions (the Whitelabel link is in *Visão geral*); tabs
*Visão geral*, *Classificação*, *Empreendedor e empresa* and *Atividade da
sessão*. The Company tab reads the Entrepreneur's Company lazily (first opening
only; the read is latched, so switching tabs never repeats it) and labels it as
**the Entrepreneur's Company** — the Opportunity contract has no Company.
No approve / deny / edit / status action.

**Create / edit routes** (`/new`, `/:id/edit`) remain reachable and render a
read-only "Criação/Edição de oportunidades indisponível" state (no form, no
store, no save).

**Not shown, because the contract has none:** amounts, investments, investor
counts, fundraising progress, Company of the Opportunity. `fundraisingCompletion`
is shown as the goal flag it is ("Meta mínima de captação"), not as progress.

## D. Companies

**Adapter** (`companies/companyApi.ts`, GET only): `listCompanies` sends
`page`, `perPage` (10 — the page size this screen already used), `search`,
`whitelabelId`, `status`, `sort` (`createdAt | updatedAt | legalName | cnpj`),
`order`. A pasted formatted CNPJ (`00.000.000/0000-00`) is searched by its
digits, as the Backend matches CNPJ digits; other text is sent as typed.
`cardinality`, when present, must be `0..1` / `1`; any other model and
two Companies for one Entrepreneur in a page are rejected
(`CARDINALITY_MISMATCH`). Scope, page and identity are enforced as for
Opportunities.

**Navigation:** Empresas stays a contextual page under Operação › Empreendedores
(`#/operation/companies`, `#/operation/companies/:id`). The sidebar keeps the
stable `operation-entrepreneurs` item; there is **no `operation-companies` menu
ID and no Companies sidebar entry**. The Empreendedores / Empresas view switch
is unchanged except that its "Protótipo" tag is removed.

**List:** search (legal name, trade name, CNPJ digits), Whitelabel, validation
status, sort, pagination; columns legal name, trade name, CNPJ, Entrepreneur
link (`company.entrepreneurId`), Whitelabel, validation, open action. A leftover
`?previa=` is reported as ignored and never pins or fabricates a state.

**Detail:** Empresa (legal / trade name, CNPJ, validation status, source and
date), Contato (e-mail; phone masked with the existing `maskPhone`),
Relacionamentos (Entrepreneur and Whitelabel by the Company's own fields),
Sistema (ids, dates) and "Outros domínios" (KYC, Oportunidades, Finanças:
*Indisponível* — no fabricated data).

**CNPJ decision:** shown formatted in full (`00.000.000/0000-00`) to every
authorized role (SUPER_ADMIN, SUPPORT_ADMIN, READ_ONLY), exactly as the Backend
returns it; it is formatted for reading only, never completed, validated or
inferred. This reverses the prototype's "masked CNPJ" display and **needs
explicit Product / LGPD confirmation** (a MEI CNPJ identifies an individual) —
listed in § I. Finance privacy guards are unchanged.

## E. Entrepreneur → Company

`GET /entrepreneurs/:id/company?whitelabelId=` (tenant-scoped with the
Entrepreneur's / Opportunity's Whitelabel), via `useEntrepreneurCompany` keyed by
Entrepreneur **and** Whitelabel. The four outcomes stay distinct:

| Backend outcome | UI |
| --- | --- |
| 200 Company | The authoritative Company, linked by its own id |
| 200 `{ data: null }` | "Sem empresa vinculada" — a confirmed absence; no synthetic Company |
| 404 `E_ENTREPRENEUR_NOT_FOUND` | "Vínculo não confirmado" — never "no Company" |
| Anything else (400 / 403 / other 404 / 429 / 5xx / timeout / network / malformed / identity / cardinality) | Error ("A empresa não é dada como inexistente."), retry when it can succeed — never "no Company" |

Only an explicit `data: null` means absence; a missing `data` key is malformed.
A Company for another Entrepreneur or Whitelabel is rejected. It appears on the
Entrepreneur profile (hero value, info row and the Empresa panel that replaces
the former pending section) and in the Opportunity detail's *Empreendedor e
empresa* tab. The Entrepreneur list makes no per-row Company read (no N+1).

Identity rules: Company ID ≠ Entrepreneur ID ≠ Whitelabel ID ≠ Opportunity ID.
Equal numbers never merge records; links always use the explicit relationship
field (`company.entrepreneurId`, `opportunity.entrepreneurId`, `…whitelabelId`).

## F. Frontend

- **New:** `operation/shared/coreIds.ts` (positive Core ids), `operation/shared/readErrors.ts`
  (read-failure copy on top of `describeApiError`), `opportunities/opportunityApi.ts`,
  `opportunityPresent.ts`, `opportunityRoute.ts`, `useOpportunityData.ts`,
  `companies/companyApi.ts`, `companyRelation.ts`, `EntrepreneurCompanyPanel.tsx`.
- **Rewritten:** `OpportunitiesPage`, `OpportunityDetailPage`, `OpportunityFormPage`
  (read-only state), `OpportunityParts`, `CompaniesPage`, `CompanyDetailPage`,
  `CompanyParts`, `companyPresent`, `companyRoute`, `useCompanyData`, the two CSS
  modules; `EntrepreneurDetailPage` (Company relationship); `EntrepreneurViews`
  (no "Protótipo"); `App.tsx` (route params).
- **Removed from the application:** `opportunities/CatalogPicker.tsx`,
  `StatusDialog.tsx`, `classification.ts`, `opportunityModel.ts`,
  `opportunityStore.ts`, `prototypeOpportunities.ts`; `companies/companyContract.ts`,
  `prototypeCompanies.ts`. Synthetic fixtures live only in
  `scripts/fixtures/opportunities-companies-fixtures.mjs` (test infrastructure).
- **Unchanged infrastructure:** one transport (`authenticatedGet`: Bearer,
  `X-Correlation-ID`, central 401), the shared `useRemote` request model, the
  shared Whitelabel registry reads. No screen touches `sessionStorage`; no second
  fetch/auth layer; no new frontend RBAC.
- **Stale-request safety:** every read is keyed by its full query or record id
  (the relationship by Entrepreneur + Whitelabel); a newer key aborts the older
  request and a late answer can never fill another record. A failure is never
  rendered as an empty list or as "no Company". Known shared `useRemote`
  behaviour (unchanged, also used by Finance): returning to a key that already
  settled (A → B → A) re-displays A's own answer while A is refreshed — never
  B's. The Opportunity Company tab avoids even that by latching its read.
- **Narrow widths:** the row's Entrepreneur column collapses into the name cell,
  where "Empreendedor #id" stays a link.
- **States covered:** loading (skeletons, `aria-busy`), empty, filtered-empty,
  not found, invalid id, Company absent, Entrepreneur not confirmed, 400, 401
  (central), 403 (no retry), 404, 429, 5xx, timeout, network, malformed, scope /
  identity / cardinality rejection, retry.

## G. Safety

- Business writes: POST 0, PATCH 0, PUT 0, DELETE 0 — in production code (AST
  capability scanners: only the two adapters may use `authenticatedGet`; no
  `/approve` / `/deny` path; no other method), in the node suites and in every
  browser QA session (network audit). Financial, Whitelabel and Menu Visibility
  mutations: 0.
- No credential, token, Authorization value or real personal / company data in
  the patch, fixtures, logs or screenshots (synthetic CNPJs with root
  `00.000.000` and invalid check digits; `example.test` / `example.invalid`
  contacts).
- Finance: no file changed; privacy guards, DTO handling and documentation
  untouched; its opportunity names stay unlinked. The known Finance QA
  limitation remains open and tracked separately — Finance QA is not claimed
  closed.
- Whitelabel CRUD (writes disabled) and Menu Visibility (23 IDs, `PUT` and
  enforcement disabled) are preserved; the Menu Visibility suite's reviewed-path
  exemptions were extended only for the reviewed Opportunities / Companies
  statements and files (planted probes prove the exemptions stay narrow).

## H. QA

### Static checks

`tsc -b`, `oxlint`, `vite build` and `git diff --check`: clean (see the final
report for the exact run).

### Canonical suites

| Suite | Baseline `3e727b9` | Now |
| --- | --- | --- |
| check-accounts-read | 33 | 33 |
| check-audit-read | 97 | 97 |
| check-companies-frontend | 680 (prototype boundaries) | 121 (authoritative boundaries, rewritten) |
| check-compliance-audit | 400 | 400 |
| check-dashboard-read | 45 | 45 |
| check-entrepreneur-read | 45 | 45 |
| check-finance-read | 164 | 164 |
| check-investor-read | 42 | 42 |
| check-menu-visibility | 1257 | 1302 |
| check-operation-finance-regression | 136 | 137 |
| check-opportunities-companies-read | — (new) | 115 |
| check-url-search-draft | 14 | 14 |
| check-whitelabel-crud-mocks | 43 | 43 |
| check-whitelabel-crud | 69 | 69 |
| check-whitelabel-read | 49 | 49 |

Maintained canonical suites: **15** (14 + the new
`check-opportunities-companies-read`). The lower count of
`check-companies-frontend` is expected: most of its 680 baseline checks iterated
over illustrative rows that no longer exist.

### Removed or modified invariants

- `check-companies-frontend` (rewritten):
  - *Removed* (prototype no longer exists): frozen / synthetic prototype source,
    `cmp_proto_` ids, local query, provenance view model, "Dados ilustrativos"
    notice, explicit preview states, the `COMPANY_CONTRACT.integrated === false`
    flag and "no request code exists". Replaced by the removal checks, the
    GET-only adapter scanners and the fixture-based adapter checks.
  - *Inverted*: "Multiple Companies may reference the same Entrepreneur" → the
    documented 0..1 cardinality is enforced (duplicate `entrepreneurId` in a page
    → `CARDINALITY_MISMATCH`). "No Company data joined into Entrepreneur screens"
    → the profile reads exactly `useEntrepreneurCompany` and the panel; the
    Entrepreneur list still reads none. "View switch shows Protótipo" → it must
    not.
  - *Modified*: "CNPJ masked" → CNPJ formatted in full for authorized operators
    (never completed or validated); "raw status, absent status pending" →
    documented status labels, unknown tokens shown as sent (neutral).
  - *Kept*: one current view link; Operation breadcrumb parity with `075809e`;
    return-target safety list; no CRUD; no menu id / sidebar entry; no financial
    values; Entrepreneur adapter unchanged.
  - *Added*: stale-request safety of the actual hooks (A→B, populated → absent,
    delayed earlier answer, tenant in the key, retry, idle, same-key re-entry),
    the four relationship outcomes rendered by the actual components for 11
    error kinds × 2 variants, a non-specific 404 never claiming "não existe",
    reviewed-import allowlist, fixture hygiene (every fixture CNPJ has invalid
    check digits; contacts on reserved domains; no real Whitelabel names).
- `check-opportunities-companies-read` (new, 115): ids, strict / tolerant
  parsing, malformed envelopes, exact query keys, scope / identity / page /
  cardinality rejections, CNPJ search normalisation, the four relationship
  cases, 401 / 403 / 429 / 5xx, error copy, labels (status sort labelled as
  Backend order), live date format, routes, AST capability scanner, removal of
  the prototype sources, hook keys, the latched Company tab, Entrepreneur
  profile wiring, clamp / reset, read-only form, no `operation-companies`.
- `check-operation-finance-regression` (136 → 137): "Missing Company is pending"
  replaced by "the profile reads `useEntrepreneurCompany(entrepreneur.id,
  entrepreneur.whitelabelId)`, has no 'Aguardando integração da empresa' and the
  panel owns 'Sem empresa vinculada'".
- `check-menu-visibility` (1257 → 1302): reviewed exemptions for the six
  Opportunities / Companies route statements and the reviewed file list
  (including removals); four new planted probes (render above the guard, render
  swapped, Companies resolver hijack, create route changed); capability scan of
  both directories. Expected counts `2/12/9` (baseline `0/12/9`).

### Browser QA (MOCK-TESTED)

Production builds of this candidate and of the baseline `3e727b9`
(`VITE_API_BASE_URL` pointing at an intercepted mock host), Playwright /
Chromium, a scratch mock Control Plane that mirrors the live contract with
synthetic data (45 Opportunities, 13 Companies on 22 Entrepreneurs, ids
deliberately overlapping across domains), role tokens and error scenarios.
**236 / 236 checks passed** on the final build:

- navigation parity with the baseline build (sidebar entries, hrefs and current
  item identical on Oportunidades, Empresas and the Entrepreneur profile; no
  Companies entry);
- Opportunities list: exact default query, four count reads, filters, search
  (Backend), sort (rows keep the Backend order), pagination, page-past-end
  clamp, invalid / unsupported / legacy URL values, loading (held responses),
  503 / 500 / 429 / 403 / 400 / network / HTML 502 / malformed / scope / page
  mismatch / empty, retry (exactly one new GET), 401 → Login;
- Opportunity detail: list context, lazy and latched Company tab (one
  tenant-scoped GET), present / absent / 503 Company, not-found (404, invalid
  ids without any request), error states, A → B switch with a late answer for A,
  read-only create / edit routes;
- Companies list and detail: defaults, CNPJ formatting, relationship links by
  `company.entrepreneurId`, filters, CNPJ-digit and formatted-CNPJ search, sort,
  pagination and clamp, `?previa=` ignored, errors including duplicate
  Entrepreneur and cardinality model, empty, masked phone, not-found / invalid
  ids, A → B switch;
- Entrepreneur → Company: present, absent, 4 → 5 switch with a held answer,
  delayed earlier answer never shown for the newer Entrepreneur, 503 / network /
  403 / 429 / other 404 / `E_ENTREPRENEUR_NOT_FOUND` / missing `data` /
  identity / cardinality — never "Sem empresa vinculada" — and retry; no
  per-row reads in the Entrepreneur list;
- roles: READ_ONLY and SUPPORT_ADMIN read both lists; FINANCIAL_ADMIN and
  COMPLIANCE_ADMIN get a permission error (no retry, session kept, never
  "no Opportunities");
- responsive at 1672 / 1440 / 1024 / 768 / 390 / 320 px on six screens (42
  checks, no horizontal page scroll, no console errors); axe-core (WCAG 2.1
  A/AA + best practice) on 19 screen / width combinations, no serious or
  critical violation; keyboard order and activation on Companies;
- network audit over every session: **0 non-GET**, no `/approve` / `/deny`,
  only the local builds and the mock host contacted, no dialogs; no token in
  the DOM and no record in browser storage.

### Regression flows (MOCK-TESTED)

The earlier module flows, each with its own mock extended only by the new
read endpoints, were run against this candidate and against the baseline
`3e727b9` build:

| Flow | Baseline | Candidate |
| --- | --- | --- |
| Accounts | 120 / 120 | 120 / 120 |
| Audit | 101 / 101 | 101 / 101 |
| Dashboard | 82 / 88 | 82 / 88 (same 6 pre-existing stale expectations) |
| Entrepreneurs | 123 / 123 | 123 / 123 (adapted copy: 5 checks rewritten for the intended Company / Opportunities changes) |
| Investors | 97 / 98 | 97 / 98 (same pre-existing failure) |
| Whitelabel CRUD (writes disabled) | 103 / 103 | 103 / 103 |
| Menu Visibility Stage B | 117 / 117 | 117 / 117 |
| Menu Visibility read (Stage A) | 200 / 201 | 200 / 201 (same pre-existing failure) |
| Whitelabel / Configurações / Sistema | 87 / 87 | 87 / 87 |
| Finance (Investimentos / Pagamentos / Wallet) | 193 / 193 | 193 / 193 |

The candidate never differs from the baseline except for the intended
Entrepreneur-profile changes. The former Operation V1 Opportunities and
Companies prototype flows are obsolete (their records no longer exist) and are
replaced by the browser QA above. The regression flows ran on the build before
one final copy-only change in the Opportunity Company tab subtitle; the final
build passed the full browser QA above.

### Independent review

An independent reviewer sub-agent (read-only) found no blocker and no confirmed
major. Fixed afterwards: page / page-size identity (`PAGE_MISMATCH`), the
latched Company tab, formatted-CNPJ search, "Empreendedor #id" kept as a link at
narrow widths, the non-specific 404 copy, the status sort label, a stale
prototype sentence on the Entrepreneur not-found state, fixture hygiene checks
and doc wording. Verified, not a defect: the date concern (live timestamps carry
`-03:00`; § B). Kept and listed as pending decisions: the full-CNPJ display and
display-field tolerance (§ I).

### Live verification

The Backend contract gate (§ B) is the live evidence for this unit. The frontend
candidate is not deployed, so **no deployed UI-to-live-API E2E is claimed**.

## I. Pending

- Deployed UI-to-live-API E2E of this candidate after an authorized promotion.
- Entrepreneur → Opportunities: needs a Backend `entrepreneurId` filter (today 400).
- Backend docs: `per_page` alias (rejected live) and the `HTTP_ERROR` vs
  `E_VALIDATION` code for invalid filters.
- Live confirmation of the READ_ONLY / SUPPORT_ADMIN / other-role behaviour
  (source-confirmed and mock-tested only).
- Opportunity approval / denial and any Opportunity or Company write: out of
  scope; would need a separate authorized unit.
- KYC, Opportunity and Finance views per Company: no contract.
- Product / LGPD confirmation of the full-CNPJ display for READ_ONLY and
  SUPPORT_ADMIN (§ D); masking would be a one-line presenter change.
- Display tolerance: a display field present in an undocumented shape (e.g. a
  non-numeric segment id) is shown as "not informed" rather than rejecting the
  record; identity, status, modality and relationship fields stay strict.
- Finance opportunity names stay unlinked; the separately tracked Finance QA
  limitation remains open.

## J. Account 4 focused independent review — 2026-10-18

### Recovery and source review

- Live frontend `origin/dev` verified before patch recovery and again before
  closure: `3e727b95f9cd9a6fce51de7c13f359d38b2838d9`.
- The canonical checkout was clean and preserved. Created an isolated worktree
  on `feature/opportunities-companies-read-integration-v1`; `git apply --check`
  passed and the complete 43-path patch was applied **once**. No reset, merge,
  rebase or Cloud reimplementation.
- Reviewed the 43 delivered paths: adapters, hooks, screens, relationship panel,
  route integration, shared helpers/styles, documentation and canonical tests.
  No P0 or material P1 defect was confirmed; no application code was changed by
  this independent review. Codex changes to the delivery are this evidence entry
  and README delivery-status clarification only.
- Independently read Backend controllers, query DTOs, pagination DTO, forwarding
  services and Company contract documentation at
  `aea5392a18b6a6df327590af38ecd254dadbb55c`; the live Backend `dev` ref still
  matches. GET roles are SUPER_ADMIN / SUPPORT_ADMIN / READ_ONLY. No Backend or
  Core files, settings or data were changed.

### Small independent live sample (not the Cloud sample)

Used the already authenticated built-in homolog browser, with the token kept
inside its page context. **14 authorized GETs; zero non-GETs.** No customer
names, CNPJs, contacts, response bodies or credentials were saved to artifacts.
Only schema keys, counts, status codes and comparison booleans were emitted.

- Opportunity list and detail: 200, `{ data, meta }` / `{ data }`, numeric
  identities, requested detail ID matches. Combined tenant/status/modality
  filter returns only matching rows. Page 2 has the requested metadata and
  identities distinct from page 1.
- Company list and detail: 200, documented envelopes/cardinality, requested
  Company identity matches. Combined tenant/status filter matches every row.
- Entrepreneur → Company: present response has the same Company ID as detail,
  and matching Entrepreneur and tenant IDs. Unknown Entrepreneur returns 404
  `E_ENTREPRENEUR_NOT_FOUND`; invalid ID returns 400 `E_VALIDATION`.
- **Independent live absence limitation:** four sampled relationship reads all
  returned Companies; this review did not independently observe `data:null`.
  No further enumeration was performed. Its live evidence remains Cloud's § B
  report; the independent proof is source plus actual-adapter/component/hook
  tests and local browser null/error scenarios. Other roles were not exercised
  live; their authorization evidence remains source plus mocks.
- This verifies live API contracts separately from local candidate UI behavior;
  **it is not candidate UI-to-live-Backend E2E**.

### Coverage assessment and final validation

The 680 → 121 Companies reduction was reviewed semantically. Removed checks
primarily protected frozen illustrative rows, `_proto_` provenance, in-memory
queries/joins, preview states, and the old unsupported-status contract. Those
production behaviors are intentionally gone. Core invariants remain or are
stronger: neutral missing-name fallback, independent identities, safe return
routes, current-link semantics, contextual navigation, no writes/storage,
strict tenant/cardinality/page parsing, and no prototype production imports.
Actual hooks and rendered relationship components now cover stale responses,
explicit absence and failures. The new 115-check adapter suite complements
the 121-check UI/boundary suite. No meaningful missing invariant was found that
required restoring prototype assertions.

Menu Visibility exemptions were reviewed: explicit file allowlist, six exact
Operation route statements at their baseline positions, unchanged session/auth
and sidebar code, capability scans even within the exempted paths, and planted
unreviewed-path/router-change rejection tests. No directory-wide exemption or
write/enforcement activation was introduced.

Final required run, once after the final application code state:

- TypeScript: PASS.
- oxlint: PASS.
- production Vite build: PASS; existing >500 kB chunk advisory remains.
- `git diff --check`: PASS (including final documentation/staging review).
- All **15 maintained canonical suites PASS**: Accounts 33, Audit 97,
  Companies 121, Compliance/Audit 400, Dashboard 45, Entrepreneur 45,
  Finance 164, Investor 42, Menu Visibility 1302, Operation/Finance 137,
  Opportunities/Companies 115, URL search 14, CRUD mocks 43, CRUD 69,
  Whitelabel/auth 49. Synthetic/injected transport only, not live E2E.

Independent targeted real-browser QA: **89/89 assertions PASS**, synthetic
localhost responses only; **215 intercepted API requests, all GET**; zero
unexpected routes, write attempts or page exceptions. Covered list/detail,
server filters/pagination, present/null/404/400/5xx relationship states,
wrong identity/tenant rejection, held A→B responses for relationships and both
detail domains, ignored previews, contextual Companies navigation, disabled
create/edit routes, list-context reload/Back, and narrow-screen critical links.

Responsive/accessibility scope: six changed views at **1440, 390 and 320 px**
(18 combinations); no document horizontal overflow or clipped form controls;
labelled controls, named buttons, table headers, one H1 and no duplicate IDs.
Keyboard filter order/visible focus, arrow-key tabs, mobile menu/Escape and
reduced-motion readability passed. Desktop/mobile captures were visually
inspected. This is focused accessibility QA, not a complete WCAG certification.
Cloud's broader six-width / cross-module evidence remains separately recorded
above; it was not relabelled as independently rerun.

Local harness setup differences are not application defects: the cached CLI
needed a small URL parser and explicit synthetic session bootstrap; the initial
Vite dev server refused a font outside the worktree through the dependency
junction. Visual QA therefore used the **production preview** with bundled
fonts: zero new console errors. Deliberate mocked 400/404/500 responses and the
earlier dev-only font 403 are not unexpected production-preview errors. No auth
bypass, fixture or QA switch was added to application source or committed.

### Findings and disposition

- **P0/P1:** none confirmed; contract, identity, stale-response, pagination and
  read-only acceptance gates pass within the evidence boundaries above.
- **P2 — Product OPEN:** full formatted Company CNPJ display to authorized
  SUPER_ADMIN / SUPPORT_ADMIN / READ_ONLY remains a Product/LGPD decision.
  Controller authorization is confirmed; no stricter Company presentation
  policy or unauthorized/cross-tenant disclosure was demonstrated. Retained
  the delivered behavior. This is **not** the separate Finance privacy blocker;
  Finance guards and source remain untouched.
- **P2 — inherited/documented:** optional display-shape tolerance and Backend
  query/documentation quirks in § I remain. They do not fabricate identities or
  relationships and do not block the read-only local commit.
- Deployed candidate E2E remains pending separate promotion authorization.
  No Company/Opportunity write capability, Whitelabel CRUD activation, Menu
  Visibility PUT/enforcement, business mutation or financial mutation occurred.

**Review decision: APPROVED FOR SEPARATE PROMOTION.** One local feature commit
only; no push, dev/main/handoff update or deployment is authorized in this unit.
