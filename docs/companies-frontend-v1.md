# Companies Frontend V1

Frontend-only unit, implemented by Cloud from `dev` `075809e`, then reviewed
and narrowly refined by Codex on `feature/companies-frontend-v1`. It adds a dedicated **Empresas** list and
detail, ready for a future `GET /companies` / `GET /companies/:id`.

> **COMPANIES FRONTEND V1 IS A PROTOTYPE. NO AUTHORITATIVE COMPANY BACKEND CONTRACT IS CURRENTLY INTEGRATED.**
>
> Every Company on screen comes from an isolated, clearly labelled
> illustrative source. The frontend sends **no** Company request (no
> `/companies` call of any kind), sends **no** Entrepreneur or Whitelabel
> request with a prototype reference, and performs **no** mutation.

Company ≠ Entrepreneur. No Company is derived from an Entrepreneur's name,
e-mail, `businessState`, Whitelabel, Account or any earlier prototype.

## Evidence

| Class | What it is |
| --- | --- |
| **A. Contract evidence** | None. No Company contract exists in the integrated Control Plane reads ([Entrepreneur Read Integration V1](entrepreneur-read-integration-v1.md#company--empresa-finding)). Field names below are **candidates**, not a contract. |
| **B. Local implemented UI** | Codex built-in browser exercised the reviewed production build against a disposable localhost-only synthetic API (ordinary synthetic login, writes refused and logged). Cloud's earlier headless/scratch results are historical below. Neither is a live Backend E2E. |
| **C. Synthetic edge cases** | Missing and very long values, empty / no-match / unknown-scope states, prototype state previews, keyboard-only use, 1672 → 320 px. |

## Placement (stable menu ids)

- **No new sidebar entry and no new menu-visibility id.** `operation-companies`
  is not added anywhere (`navigation.ts` is unchanged). The page is
  contextual under **Operação › Empreendedores**: the sidebar keeps the
  existing `operation-entrepreneurs` item active, and the breadcrumb reads
  Operação › Empreendedores › Empresas.
- A small **Empreendedores | Empresas · Protótipo** link switch sits in the
  intro row of both pages (`operation/shared/EntrepreneurViews.tsx`, plain
  links, no data). It is the only change to the Entrepreneurs list.
- Routes: `#/operation/companies` and `#/operation/companies/:companyId`.
  `operation/entrepreneurs/companies` was not used because the existing
  Entrepreneur detail pattern would capture it as an Entrepreneur id, and an
  `operation/companies` path keeps a later promotion (if Product decides it)
  a navigation-only change. Internal view names are `operation-company-list`
  / `operation-company` (not menu ids).
- Promoting Empresas to its own sidebar entry is a **Product decision**; it
  would need a new id in the shared menu configuration, which this unit
  deliberately does not add.

## List

`#/operation/companies?whitelabel=&page=&search=`

| Column | Value |
| --- | --- |
| Razão social | legal name (fallback: trade name, then "Empresa sem nome informado") + illustrative id |
| Nome fantasia | trade name or "—" |
| CNPJ | masked (`••.•••.•••/0001-01`) or "—" |
| Empreendedor | illustrative reference (text only) or "—" |
| Whitelabel | illustrative reference (text only) or "—" |
| Status oficial | "Aguardando integração" (wide layouts; announced in the caption at all widths) |

- **Server-ready shells:** search (debounced into `?search=`), Whitelabel
  filter (`?whitelabel=`), pagination (`?page=`, 10 per page, windowed pager)
  — all URL-backed (reload, Back / Forward, return context from the detail).
  While the prototype is active they run **locally on the illustrative rows**
  and the footer says so.
- **No status filter**: it is rendered only once the Backend supports one and
  publishes its vocabulary.
- **No sorting**: the server order is not known.
- Columns collapse by container width (status → trade name → Entrepreneur →
  Whitelabel → CNPJ); their values move under the company name.
- **States:** loading (skeleton rows), empty list, empty search ("Limpar
  busca"), unknown Whitelabel scope, contract unavailable, read error with
  "Tentar novamente", out-of-range page clamped.

### Prototype state previews

`?previa=carregando|vazio|indisponivel|erro` (list) and
`?previa=carregando|indisponivel|erro` (detail) pin a read state so it can be
reviewed **without any request**. A notice says "Prévia de estado do
protótipo … Nenhuma requisição é feita" with a "Sair da prévia" link. The
error preview uses the shared read-error copy (HTTP 503 → "Control Plane
indisponível"); retry shows a short loading phase and answers again from the
local source. The parameter belongs to the prototype source and is removed
with it.

**Codex decision: retain, explicitly as prototype functionality.** The
parameter is recognized only on these Company routes, requires the ordinary
authenticated shell, always shows a visible notice and exit link, and cannot
trigger requests, writes, access changes or other-domain state. Invalid values
are reported and ignored. Both the URL parser and source hooks ignore preview
pins when `COMPANY_CONTRACT.integrated` becomes true (covered with an in-memory
flag variation). This is not a hidden authentication/QA bypass. Remove the
parameter and prototype source when adding the real adapter; flipping that
flag alone does **not** implement a Backend integration.

## Detail

`#/operation/companies/:companyId?returnTo=`

- **Empresa:** razão social, nome fantasia, CNPJ (masked; note "Valor
  sintético … formato, validação e unicidade aguardam definição"), status
  oficial ("Aguardando integração").
- **Relacionamentos:** Empreendedor and Whitelabel references, each with
  "Referência ilustrativa — sem vínculo com … do Control Plane", plus a note
  that the future link is `company.entrepreneurId` (and
  `company.whitelabelId`) and that cardinality is undefined.
- **Sistema:** Company id, data origin ("Ilustrativa (protótipo)"),
  criado em / atualizado em ("Não informado" when absent).
- **Outros domínios (pending):** KYC "Aguardando integração do KYC",
  Oportunidades "Aguardando integração", Finanças "Sem dados financeiros —
  nenhum total ou valor é exibido". Not links, not buttons.
- **States:** loading, contract unavailable, read error + retry, **not
  found** (any id the illustrative source does not hold, including numeric
  Core-looking ids — nothing is requested). Unknown `previa` values are
  reported and ignored.
- No actions: **no Company CRUD** (create / edit / remove are not offered).

## Provenance

- List and detail show a subtle dashed notice: **"Dados ilustrativos —
  integração de Empresas pendente."** with one sentence saying that names,
  CNPJs and links are fictional and not Control Plane data.
- Rows say "ID ilustrativo"; the footer says "empresas ilustrativas · Busca e
  filtro locais do protótipo"; the table caption repeats it for screen
  readers.
- The switch labels Empresas as **Protótipo**.
- Illustrative data (`prototypeCompanies.ts`): 13 frozen records,
  `cmp_proto_101…113`; names contain "Exemplo"; Whitelabel references are
  fictional ("Whitelabel Ilustrativo Alfa / Beta / Gama",
  `wl_proto_cmp_*`), never Finapop / Loor / Nova Plataforma; Entrepreneur
  references are `ent_proto_cmp_*` ("Empreendedor ilustrativo NN"); no person
  names or e-mails.

## Expected `/companies` contract (candidate — to be confirmed by the Backend)

`companyContract.ts` holds types only (no request code):

```ts
type CompanyRecordCandidate = {
  id: string                    // independent Company identity, never inferred from entrepreneurId
  entrepreneurId: string | null // Core Entrepreneur id — the authoritative link
  whitelabelId: string | null   // Core Whitelabel id (tenant scope)
  legalName: string | null      // razão social
  tradeName: string | null      // nome fantasia
  taxId: string | null          // CNPJ as returned; displayed masked, never validated here
  officialStatus: string | null // raw value; vocabulary open
  createdAt: string | null
  updatedAt: string | null
}
// GET /companies?page=&perPage=&search=&whitelabelId=  → { data: CompanyRecordCandidate[], meta: { page, perPage, total, lastPage } }
// GET /companies/:companyId                            → CompanyRecordCandidate
```

`COMPANY_CONTRACT.integrated` is `false`. `companyPresent.viewFromCandidate`
is prepared for Backend records (links only valid Core ids; shows the status
raw) and is exercised by the check script only.

## Relationships

- **Entrepreneur ↔ Company:** the future authoritative link is
  `company.entrepreneurId`. Prototype references stay inside the prototype
  data, contain `_proto_` (so the Entrepreneur detail's existing guard would
  treat them as prototype ids), fail `isServerEntrepreneurId`, are rendered
  as text only and are never sent to `GET /entrepreneurs/:id`. No cross-link
  to a real profile exists in either direction; the Entrepreneur detail is
  unchanged ("Aguardando integração da empresa").
- **Whitelabel ↔ Company:** the future link is `company.whitelabelId`.
  Prototype references fail `isServerWhitelabelId`, are text only and are
  never sent to `GET /whitelabels/:id`. The Companies Whitelabel filter lists
  the illustrative references, not the Control Plane registry; a Core id in
  `?whitelabel=` shows "Whitelabel não encontrado" (no mapping is inferred).

## Open questions (not decided here)

- **Cardinality:** 0..1 or N Companies per Entrepreneur. The candidate
  `company.entrepreneurId` only says a Company points to at most one
  Entrepreneur. The prototype uses one reference per Company as a data shape,
  not a decision; no screen counts or groups Companies by Entrepreneur, and
  the Entrepreneur pages show no Company.
- **Status vocabulary / lifecycle:** none invented. Prototype status is
  always null ("Aguardando integração"); a future value is shown raw with
  "Vocabulário de status ainda não definido pelo Backend". `businessState`,
  `accessState`, KYC and Account states are never reused, and the Accounts
  prototype's `CompanyValidation` vocabulary is not used.
- **CNPJ:** format, validation and uniqueness are pending. The frontend only
  masks for display (non-14-digit values are fully masked); no check digit,
  duplicate or "invalid" judgement exists.
- **Company CRUD:** none in this version.
- **Placement:** contextual page vs. own sidebar entry (see above).

## Boundaries

- **KYC:** "Aguardando integração do KYC". Company KYC is not part of the
  Company record here.
- **Opportunities:** pending only; no list, count or link.
- **Finance:** no totals, amounts, investments, payments or wallets.
- Nothing from Compliance › KYC, Oportunidades, Finance Core or the Accounts
  prototype is imported by the Companies module.

## Architecture

```
src/features/operation/companies/
  companyContract.ts    future API contract — candidate types + integration flag, no requests
  prototypeCompanies.ts isolated illustrative source + local query stand-in
  companyPresent.ts     presentation model (provenance, relation views, CNPJ mask)
  companyRoute.ts       URL state, hrefs, return context, prototype previews
  useCompanyData.ts     source boundary (prototype only; states of the future read)
  CompaniesPage.tsx / CompanyDetailPage.tsx / CompanyParts.tsx / Companies.module.css
src/features/operation/shared/EntrepreneurViews.tsx (+ .module.css)  Empreendedores | Empresas switch
```

Other touched files: `App.tsx` (two routes, titles, session guard),
`OperationUi.tsx` (`trail` accepts `{ label, href }` crumbs; existing callers
unchanged), `EntrepreneursPage.tsx` (switch in the intro row only).
`entrepreneurApi.ts`, `navigation.ts` and the Entrepreneur detail are
unchanged.

**Integrating the real contract later:** add a Companies API module (strict
parser + GET client; never inside `entrepreneurApi`), make
`useCompanyData.ts` read it, map records with `viewFromCandidate`, switch the
Whitelabel filter to the Control Plane registry, drop `?previa=` and the
prototype source, and remove the provenance notice.

## Backend contract information required to replace the prototype

1. Endpoint paths and auth roles for list and detail (`GET /companies`,
   `GET /companies/:id`), and whether a Whitelabel-scoped variant exists.
2. Response envelope and pagination `meta`; default and maximum page size;
   default sort order.
3. Server search: which fields (legal name, trade name, CNPJ digits?),
   normalization, minimum length.
4. Filters: `whitelabelId` (and its validation / unknown-id behaviour),
   `entrepreneurId`, status (only if supported, with its vocabulary).
5. Field list and nullability: id format, `legalName`, `tradeName`, `taxId`
   (raw digits or formatted; masked by the Backend or not), `officialStatus`,
   `createdAt`, `updatedAt`.
6. Relationship semantics: `entrepreneurId` presence and **cardinality**
   (0..1 vs N Companies per Entrepreneur), and whether the Entrepreneur read
   will expose its Company id(s).
7. Status vocabulary and lifecycle (values, labels, transitions) — or
   confirmation that the field is free text.
8. CNPJ rules: validation, uniqueness scope (global vs per Whitelabel).
9. Error codes: 404 vs invalid id, scope mismatch, 403 roles.
10. Whether Company KYC / Opportunities / Finance will be separate domains
    (expected) and how they reference `companyId`.

## Validation

- `npm run typecheck`, `npm run lint`, `npm run build`, `git diff --check`.
- `node scripts/check-companies-frontend.mjs` — contract flag, prototype
  isolation (ids, refs, synthetic CNPJ, null status, no reused names /
  e-mails / tenants), local query, presenter (no links for prototype refs;
  future links only from Core ids), route state, source boundaries (no
  request code, no storage, no real data hooks, no other-prototype joins, no
  `operation-companies`, nothing added to `entrepreneurApi`), docs statement.
- Existing check scripts unchanged and passing.

### Codex review — 2026-10-15 (current acceptance gate)

The live `origin/dev` baseline was fetched and verified as
`075809e5aa1b086eef4da8e45d26b1687aa0ad48`. Cloud's four tracked modifications
and thirteen new files were preserved on the new feature branch without
reset, recovery-patch replay, merge, push or deployment.

Minimal refinements:

- Clarified **independent identity namespaces**, not an inequality between
  numeric values: a Company and Entrepreneur can have the same numeric id
  value without being the same entity. Candidate mapping tests also preserve
  two Companies pointing at one Entrepreneur; no cardinality is selected.
- Clarified that relationship labels are illustrative, not live links.
- Shortened the list intro after the screenshot review to avoid repeating
  the provenance warning. The main notice, prototype badge, row ids, caption
  and local-query footer remain. No layout or shared Dot Matrix redesign.
- Named the switch's navigation explicitly as the operational views of
  Entrepreneurs **and** Companies; ordinary links and one `aria-current=page`
  remain, not filter/tab semantics.
- Added the future-integration preview guards described above.

Maintained canonical checks: **1,716 PASS** — Companies **664**, plus the ten
unchanged suites (**1,052**). Companies coverage now includes actual rendered
relationship/status/switch components, actual source-hook state selection,
overlapping numeric ids, 1:N-compatible mapping, prototype-scope rejection,
unsafe return targets, and the existing page-frame function's exact breadcrumb
props compared with baseline for all three Operation sections. Transport/menu
detectors use syntax nodes, and in-memory planted violations prove detection
without treating comments or quoted examples as executable calls. Hook
primitives in those unit tests are synchronous stubs; they do not claim to
test React timing (the browser checks cover that).

Codex built-in browser, reviewed production bundle, synthetic local API only:

- **114 passing assertions**, no unresolved product failure. Two early runner
  assumptions were corrected and rechecked: wait for asynchronous pagination
  to settle, and target the uniquely named Company-pending region rather than
  assuming pending copy occurs only once. No application assertion was relaxed.
- Direct list/detail, auth guard, reload, Back/Forward, list return context,
  page clamp, search/accent handling, pending search across scope changes,
  unknown/malformed ids, real-looking tenant scope rejection, all explicit
  preview states, preview exit, missing names/trade names/relations/dates,
  keyboard row/link activation and visible keyboard focus passed.
- 77 layout observations (including repeated/final captures) cover **1672,
  1440, 1024, 768, 390 and 320** across list, long detail, empty, unavailable,
  loading and error states. No horizontal document overflow. Final full-page
  mobile captures include feedback and cross-domain sections below the fold;
  initial pre-refinement captures are not final visual evidence.
- Mandatory Entrepreneur regression exercised global/scoped list, detail,
  pagination, search/debounce, pending clear + tenant switch, reload and
  Back/Forward through the existing API adapters against synthetic DTOs.
  Its detail still shows **Aguardando integração da empresa**, with no link
  to a prototype Company. Other domains received route/render smoke checks.
- Complete local API ledger: **31 requests = 30 GET + one synthetic login
  POST**. **0 `/companies` requests, 0 prototype references sent to real-module
  adapters, 0 business writes, 0 financial operations.** No live Backend API
  was contacted. The temporary local fixture server was removed after review;
  no helper, credentials, screenshots or ledger belongs in the commit.
- Console warnings/errors: **0**. JavaScript exceptions: **0**. Keyboard,
  semantic labels and responsive reflow were inspected; this is not a claim
  of complete WCAG compliance or new live authenticated E2E.

TypeScript, oxlint, production build and `git diff --check` pass. The inherited
large-bundle advisory is non-blocking; no dependency was added. All pre-existing
Operation callers retain string trails; the only new linked trail is the
Companies list link, built by the constrained internal return helper. Shared
navigation/menu ids, Entrepreneur detail/adapter, auth, and other domain
implementations are unchanged.

**Ready for separate promotion authorization as Companies Frontend V1 —
prototype only.** Companies authoritative integration remains blocked on the
contract questions above; no Backend rule is invented by this review.

### Historical Cloud QA (scratch harness — not the canonical acceptance gate)

- Static: typecheck and build pass; oxlint 0 warnings / 0 errors;
  `git diff --check` clean; `check-companies-frontend.mjs` 589 checks; the
  ten existing check scripts pass with unchanged counts.
- Companies browser flow (headless Chromium, production build, scratch mock
  Control Plane): **109/109**. It covered:
  - direct list / detail routes, provenance, placement (sidebar current item
    = Empreendedores, breadcrumb, no Empresas menu entry);
  - pagination, search, Whitelabel filter, return context after reload, URL
    edge cases, all prototype previews and retry;
  - detail sections, not-found for five ids (unknown, numeric, Entrepreneur
    ref, malformed, Whitelabel ref), missing and long values;
  - keyboard order and Enter, focus ring;
  - 1672 / 1440 / 1024 / 768 / 390 / 320 px with no horizontal overflow
    (visible columns 7 / 6 / 5 / 3 / 0 / 0);
  - axe WCAG A/AA on 11 states with 0 violations; session guard.
- Network: the Companies pages alone requested only `GET /auth/me` (shell
  session check). Over the whole flow there were zero `/compan…` requests,
  zero requests carrying a prototype reference, zero non-GET requests and no
  request outside the app origin and the mock.
- Regression, new vs `075809e` (same harness):
  - module flows: Investors 98/98, Entrepreneurs 123/123, Accounts 120/120,
    Audit 101/101 and Whitelabels read flow (CRUD-aware variant) 103/103 on both builds;
  - Dashboard 81/88 on both (the same 7 stale or date-dependent checks);
  - Whitelabel CRUD dialog flow 96/98 on both (the same 2 copy checks);
  - legacy Whitelabel flow: same known stop on both (the actions menu makes
    its menu selector ambiguous);
  - shared suites identical to the previous record: sweep 160 states,
    keyboard 34/34, axe 0 violations / 116 states, KYC 100/100, Dashboard
    160/160, Operation 114/114 + keyboard 19/19, links 70 / 0 broken,
    taxonomy OK, Finance gateways 72/72, modalities 58/58, auth 26/27 (the
    same pre-existing check).
- Pixel comparison: only the Empreendedores list differs, in the intro-row
  switch area (1440: 296 × 42 px; 390: the switch row moves the page down by
  54 px). Two one-off diffs (E-mails 390 scroll offset, a 4 × 3 px area on
  Pagamentos) did not reproduce on rerun.

The Dashboard 81/88, Auth 26/27, CRUD 96/98 and legacy-selector stops above
belong to Cloud's older scratch/browser runners, **not** the maintained
`scripts/check-*.mjs` suites. They were not accepted as canonical baseline
failures or used to waive assertions. The current gate is the maintained
green suites and fresh Codex built-in-browser review described above.

## Out of scope (unchanged)

Company CRUD and any Company, Entrepreneur, Whitelabel, Account, Opportunity,
KYC or Finance mutation; Backend, database, Netlify; menu configuration.
