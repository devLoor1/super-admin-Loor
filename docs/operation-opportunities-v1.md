# Operação › Oportunidades V1 — local implementation record

Claude implemented Operation V1 on 2026-10-07 in the local working tree of
`feature/super-admin-operation-v1` (HEAD
`ec86b475e0126667e2fbece490730bdecc271584`, read from `.git/HEAD` and the
branch ref without Git commands). At that handoff, all changes were
uncommitted. Codex preserved the complete implementation, reviewed it and
consolidated the final state locally on the same feature branch. No push,
deployment or Backend use.

Operation V1 is three logically independent modules. This record covers
**Oportunidades** and holds the QA evidence for the whole Operation V1 pass:

- [Investidores V1](operation-investors-v1.md)
- [Empreendedores V1](operation-entrepreneurs-v1.md)

Approved composition references (visual direction only — counts, names, dates,
IDs and KYC values in the images are illustrative, not Product truth):

- [`reference/super-admin-operation-opportunities-approved.png`](reference/super-admin-operation-opportunities-approved.png)
- [`reference/super-admin-operation-investors-approved.png`](reference/super-admin-operation-investors-approved.png)
- [`reference/super-admin-operation-entrepreneurs-approved.png`](reference/super-admin-operation-entrepreneurs-approved.png)

## Purpose

A global operational list of Opportunities across Whitelabels, with local
creation, consultation, editing, a prototype operational status and a
classification that consumes three independent domains: Modality (Equity /
Debt), Segment and Resource Use. Frontend prototype only.

## Routes

| Route | Screen |
| --- | --- |
| `#/operation/opportunities` | List. Optional `?empreendedor=:entrepreneurId` contextual filter (used by Empreendedores › Ver oportunidades). |
| `#/operation/opportunities/new` | Dedicated create page. |
| `#/operation/opportunities/:opportunityId` | Detail (Visão geral, Classificação, Configuração, Atividade da sessão). |
| `#/operation/opportunities/:opportunityId/edit` | Dedicated edit page (same form). Optional `?secao=classificacao` focuses the Classificação card. Not in the brief's route list; added so edit has the same guarded page as create. |

Unknown ids use the established not-found pattern (shell + empty state + link
back). Opportunities created in the session are lost on reload, so their URLs
then show not-found.

## Navigation

- **Operação** now links to `#/operation/opportunities` and, while active,
  lists exactly **Oportunidades**, **Investidores** and **Empreendedores**
  (siblings; global screens, no tenant `subNavHrefs`). No other entry.
- Operation pages: `h1` is the module name; the trail is Operação › module ›
  record (record names longer than 32 characters are shortened in the trail
  only).
- Dashboard: the existing *Oportunidades* and *Investidores* KPI cards and the
  *Abrir Operação* quick action now open the Operation screens instead of the
  "módulo ainda não disponível" notice (behaviour only; pixels unchanged).

## Module boundary

Opportunities owns, in this prototype: the opportunity list, creation,
consultation, editing, the prototype operational status and the
classification references. It does **not** own: accounts or identity
(Contas), investments or any financial operation (Financeiro), KYC
(Compliance), catalogs (Financeiro › Segmentos e usos dos recursos) or the
modality catalog (Financeiro › Modalidades e regras). Other Operation modules
only **read** the Opportunities store.

## Structure (`src/features/operation/`)

- `shared/` — reusable Operation pieces:
  - `operationModel.ts`: KYC prototype vocabulary, pending-module copy, the
    safe Accounts destination, sort helpers, page size.
  - `participants.ts`: Investor / Entrepreneur projections over the Accounts
    prototype records (see the participant records).
  - `operationActivity.ts`: session-only activity store keyed by record id.
  - `queuedNotice.ts`: carries a confirmation notice across the route change
    after a save.
  - `OperationUi.tsx`: Operation shell frame (Operação nav + shared Dot
    Matrix), intro row, summary cards, sort button, pagination, Whitelabel
    tag, definition list, domain-navigation card, session activity card.
  - `ParticipantList.tsx`, `ParticipantDetail.tsx`: shared read-only list and
    profile for Investidores / Empreendedores.
  - `DiscardChangesDialog.tsx`: single-form variant of the shared
    unsaved-changes dialog.
  - `Operation.module.css`, `Participants.module.css`.
- `opportunities/` — `opportunityModel.ts`, `prototypeOpportunities.ts`,
  `opportunityStore.ts`, `classification.ts`, `OpportunitiesPage.tsx`,
  `OpportunityFormPage.tsx`, `CatalogPicker.tsx`, `OpportunityDetailPage.tsx`,
  `StatusDialog.tsx`, `OpportunityParts.tsx`, `Opportunities.module.css`.
- `investors/`, `entrepreneurs/` — see their records.

No module imports another module's page; Entrepreneurs and Investors read
`useOpportunities()` (read-only) and reuse display parts.

## Local state and data model

```ts
type Opportunity = {
  id: string                 // opp_proto_001… (seeds), opp_local_N (created here)
  name: string
  description: string
  whitelabelId: string       // frontend context only, not authoritative ownership
  entrepreneurId: string | null  // reference to an Operation entrepreneur (account prototype id)
  modality: 'equity' | 'debt'    // from the Finance modality catalog
  segmentIds: string[]       // references into the Whitelabel's Segment catalog
  resourceUseIds: string[]   // references into the Whitelabel's Resource Use catalog
  status: 'draft' | 'active' | 'paused'   // prototype operational states
  updatedAt: string | null   // illustrative for seeds, set locally on create/edit
}
```

- 12 illustrative seeds: 8 Finapop, 4 Loor, none for Nova Plataforma (which
  has no entrepreneurs and empty catalogs). 4 Rascunho, 5 Ativas, 3 Pausadas.
- Entrepreneur references match the Accounts prototype: only entrepreneurs
  whose Accounts "Oportunidades" dependency is "Vínculos existentes"
  (`emp_proto_001`, `003`, `005`, `007`) are referenced by seeds.
- `opportunityStore.ts` is an in-memory `useSyncExternalStore` store (survives
  in-app navigation, lost on reload). Actions: create, update, set status.
  **There is no delete action.**
- References are stored, never copies: names, descriptions and status of
  catalog records and entrepreneurs are resolved at render time.
- `catalogStore.ts` gained one additive read hook, `useCatalogsSnapshot()`,
  to resolve references across Whitelabels; the two catalogs stay separate
  maps. Its records/arrays/maps are detached and frozen, with readonly types.
  The cached snapshot changes only when catalog collections change; activity
  entries alone do not re-render Operation catalog consumers. Existing catalog
  actions and per-tenant selectors are unchanged.

## List

- Header copy, *Nova oportunidade* CTA, summary cards **Total / Rascunho /
  Ativas / Pausadas** derived from the local store (all Whitelabels) with the
  note "não são dados de produção". No money raised, investors or volume.
- Filters: search (name or ID; case- and accent-insensitive), Whitelabel,
  status, modality, Segment, Resource Use, *Limpar filtros*. The Segment and
  Resource Use filters list catalog **records** grouped by Whitelabel
  (inactive ones marked); records from another tenant are dropped when the
  Whitelabel filter changes. Same-named records from different tenants or
  catalogs are never merged.
- `?empreendedor=` shows a removable "Empreendedor: …" context chip.
  Removal/clear also clears the URL parameter; Back/Forward and refresh keep
  the actual context consistent. Unknown IDs remain removable and safe.
- Columns: Oportunidade (name + prototype ID), Whitelabel, Empreendedor,
  Modalidade, Segmento, Uso dos recursos, Status, Atualizada em, Ações (Abrir,
  Editar). No delete.
- Sort: Oportunidade, Status, Atualizada em (default newest first; records
  without a date stay last). Pagination: 8 per page (presentation choice).
- Columns collapse by the list card's container width and their data moves
  under the name (date ≤ 1240px, classification ≤ 1060px, Whitelabel and
  entrepreneur ≤ 820px, modality and status ≤ 560px).

## Create and edit

- Dedicated page with **Dados gerais** (Nome, Whitelabel, Descrição,
  Empreendedor, status) and **Classificação** (Modalidade, Segmentos, Usos
  dos recursos). Actions: create — *Cancelar*, *Salvar* (back to the list),
  *Salvar e visualizar* (detail); edit — *Cancelar*, *Salvar alterações*.
- Status: create always starts as **Rascunho** (read-only); edit offers the
  three prototype states.
- **PROTOTYPE UX CONSTRAINTS** (presentation only, not Backend/Product rules):
  name 3–80 characters; description up to 300; Whitelabel required; one
  modality required. The UI says so next to each field.
- Errors appear after the first save attempt, are linked with
  `aria-describedby`, and focus moves to the first invalid field.
- Entrepreneur: optional, one selector listing the selected Whitelabel's
  entrepreneurs (paused accounts are labelled). Copy states that the final
  cardinality is a Product decision.
- Whitelabel change (frontend prototype behaviour): entrepreneur, Segments and
  Resource Uses belong to one Whitelabel, so they are cleared with a visible
  notice. In edit mode a second note says that moving an Opportunity between
  tenants is prototype-only and its real meaning is pending Product/Backend.
- Modality: radio cards from the Finance catalog — **Equity and Debt only**.
  Once a Whitelabel and modality are chosen, the hint shows (read-only) the
  modality's state for that tenant in Modalidades e regras, e.g. "Não
  configurada — informativo, o protótipo não bloqueia a escolha". No rule is
  enforced.
- Segments / Resource Uses (`CatalogPicker`): a disclosure button + checkbox
  list + removable chips per catalog. Only **active** records are offered; an
  already-selected inactive or removed record stays visible, labelled and
  removable. Each picker reads only its own catalog; selecting a Segment never
  changes Resource Uses (and vice versa). Multi-selection avoids imposing a
  one-only rule; the copy says it is not the final cardinality.
- Callout: modality, segments and resource uses are independent; the same name
  may exist in both catalogs (Capital de Giro) as separate records; Capital de
  Giro is not a modality.

### Capital de Giro example

`opp_proto_003` "Capital de Giro 2026": Debt + Segment `seg_finapop_capital_giro`
+ Resource Use `ru_finapop_capital_giro` — two records from independent
catalogs, different ids, independent lifecycle, no synchronization. Deleting the
Segment in Financeiro leaves the Resource Use untouched; the Opportunity then
shows the Segment reference as "Não encontrado no catálogo local" (no cascade).

## Detail

- Header card: name, status pill, prototype ID, Whitelabel, Empreendedor (link
  to the Empreendedores profile), Modalidade; actions *Alterar status*,
  *Editar*; back link and breadcrumb for normal navigation. No delete.
- **Visão geral:** Informações principais and Resumo de classificação, each
  with an *Editar* link (the classification one opens the edit page focused on
  Classificação).
- **Classificação:** three independent cards — Modalidade, Segmentos, Usos dos
  recursos — separated by "≠", each with its origin link (Modalidades e regras
  or the catalog screen of the Opportunity's Whitelabel) and per-reference
  state (active, inactive, not found).
- **Configuração:** controlled extension state. States that
  Opportunity-specific parameters depend on Product decisions, modality rules
  and Backend contracts; shows "Nenhum parâmetro disponível nesta versão" and,
  read-only, the existing generic rule *Permite configuração no nível da
  Oportunidade* for that modality and tenant from Modalidades e regras. No
  rates, returns, valuation, maturity, schedules, minimums, goals or fees.
- **Atividade da sessão:** local entries for this Opportunity, labelled "Não
  representa trilha de auditoria".

## Prototype status

Rascunho / Ativa / Pausada only, presented as prototype operational states.
*Alterar status* opens a dialog with the three states (current preselected);
any state can be chosen from any other — no official workflow or transition
graph is implied, and no Published / Approved / Funding / Closed / Cancelled /
Settled state exists.

## Unsaved changes

Create/edit reuse `useUnsavedChangesGuard`: in-app links (Operation, sidebar,
cross-domain), Back/Forward, reload / tab close (browser prompt) and *Cancelar*
ask before discarding; the dialog lists the changed fields and defaults to
*Continuar editando*. After a save the page leaves only once the clean state
has been registered, so no false prompt appears. Investors and Entrepreneurs
have no dirty state.

## Session activity

Created locally; edited locally (fields; Whitelabel move flagged as prototype
behaviour); classification changed; status changed (from → to). In-memory,
newest first, never sent.

## Cross-domain navigation

Existing destinations navigate normally: entrepreneur profile, Modalidades e
regras, the catalog screen. No Opportunity action targets a module that does
not exist.

## Conceptual permissions and future audit (specification labels only)

- Permissions: `OPPORTUNITY_VIEW`, `OPPORTUNITY_CREATE`, `OPPORTUNITY_UPDATE`,
  `OPPORTUNITY_STATUS_UPDATE`. No RBAC is implemented.
- Possible future Backend events: `OPPORTUNITY_CREATED`,
  `OPPORTUNITY_UPDATED`, `OPPORTUNITY_STATUS_CHANGED`,
  `OPPORTUNITY_CLASSIFICATION_CHANGED`. No audit exists; the session activity
  is not one.

## Open Product / Backend questions

1. Official Opportunity statuses and workflow (and whether Rascunho / Ativa /
   Pausada map to anything).
2. Publication and approval semantics.
3. Modality requirement and cardinality.
4. Segment cardinality and whether at least one is required.
5. Resource Use cardinality and whether at least one is required.
6. Entrepreneur cardinality: exactly one, several representatives,
   company/person relationships, other originator structures.
7. Whitelabel ownership of an Opportunity and the meaning of moving it between
   tenants.
8. Opportunity-specific financial parameters and how modality rules constrain
   them.
9. Deletion, archive and cancellation rules.
10. Behaviour of references to catalog records that become inactive or are
    deleted.
11. Name and description rules (length, uniqueness) — today prototype UX
    constraints only.

## Excluded scope

Investor assignments, investment creation or amounts, fundraising totals,
Wallet, Pix, payments, KYC decisions, regulatory documents, returns,
valuation, amortization, repayment schedules, permanent deletion, official
publish/approval workflow, real persistence, RBAC, audit.

## Claude-reported local QA (2026-10-07) — whole Operation V1 pass

**How it was run.** Every check used a local `vite build` of this working
tree served on 127.0.0.1, with the pristine baseline build served beside it
for regressions. Playwright (Chromium) scripts and an axe-core 4.x copy live in
the session scratchpad; none were added to the repo.

### Baseline

- Branch and HEAD matched (read from `.git/HEAD` and the branch ref; `dev`
  points to the same commit). All nine prior modules were present.
- Baseline `tsc -b`, `oxlint --deny-warnings` and `vite build` passed.

### TypeScript, lint, build

- `tsc -b` exit 0; `npm run lint` / `oxlint --deny-warnings` exit 0, no
  findings; `vite build` passed with the same pre-existing chunk-size
  advisory. `package.json` / `package-lock.json` unchanged.

### Interaction flow: 120/120

Covers all three modules: navigation (exactly three entries, hrefs, current
marker, titles), Dashboard shortcuts, derived summaries, pagination, null-last
date sort, case/accent-insensitive search and ID search, every filter
(including tenant-scoped catalog filters and their reset), clear filters,
sort with `aria-sort`, no delete, create validation and focus, tenant-scoped
pickers (active-only options, no Segment → Resource Use auto-selection,
Escape/focus return, chip removal), Whitelabel-change clearing, cancel/sidebar/
Back guards, save-and-view, the queued save notice, classification /
configuration / activity tabs, status dialog and focus return, edit with
classification focus, tenant-move note, discard, plain *Salvar*, not-found
states, the live entrepreneur relationship, *Ver oportunidades* context filter,
pending-module notices, *Ver conta* into Accounts (correct type tab, Back
returns), investor/entrepreneur filters and searches, read-only KYC and
investments (no money patterns, no mutation buttons), catalog deletion without
cascade, no console errors and no external requests.

### axe: 0 violations in 75 states

At 1440, 390 and 320: list, entrepreneur-filtered list, create page, create
errors, open picker with chip, tenant-change notice, discard dialog, the four
Opportunity detail tabs, status dialog, edit page, investors list, the four
investor tabs, pending-module notice, entrepreneurs list, three entrepreneur
tabs. At 1440 only: empty result, Back guard over a dirty form, three
not-found routes and an entrepreneur without opportunities.

### Keyboard: 18/18

Logical tab order (navigation → CTA → filters → table), Tab from name to
Whitelabel, arrow keys on modality radios, picker open with Enter / select with
Space / close with Escape (focus to its toggle), chip removal by keyboard,
reload prompt while dirty (`beforeunload`, draft kept when dismissed), Enter
submits, tab arrows and End, status dialog initial focus, focus never reaches
the page behind a modal dialog, Escape returns focus, pending notices by
keyboard with focus kept.

### Responsive and short heights

- 1672, 1440, 1280, 900, 390 and 320 for list, create, detail and edit of
  Opportunities and for both lists and profiles of Investors and Entrepreneurs:
  no horizontal page scroll and no console errors.
- 1440×600: the sidebar scrolls (772px content); 900×600: the icon rail fits.
  Form actions, the discard dialog and the status dialog actions stay
  reachable.

### Dot Matrix

Main content only (never under the sidebar or header) on all Operation pages;
WebGL canvas animating with motion allowed, a still frame with reduced motion,
no canvas and the static fallback with `--disable-webgl --disable-3d-apis`; no
errors.

### Finance taxonomy

Modalidades e regras rows and Gateways modality values are Equity and Debt for
all three tenants; Operation modality filter and form offer only Equity and
Debt; in the list Capital de Giro appears only inside Segment and Resource Use
chips, never in a modality chip; `opp_proto_003` resolves to
`seg_finapop_capital_giro` and `ru_finapop_capital_giro`.

### Regressions (baseline build vs this build)

- Pixels (viewport and full page, WebGL off, reduced motion): Login,
  Dashboard, Whitelabels, Account Control, Settings, E-mails, Gateways,
  Modalidades and Segmentos e usos — **identical** at every captured width.
- Flows: Gateways 72/72 and Modalidades 58/58 on both builds (one check per
  script updated on purpose: *Operação* is now a link instead of a
  notice button); E-mails 61/61; Settings 67/67; Segmentos e usos 61/61;
  Account Control 110 checks, 0 failures (includes the Investidores /
  Empreendedores tabs).
- Differential smoke: the only differences are the new *Operação* link in the
  sidebar link lists.

## Independent Codex review (2026-10-07)

### Checkpoint and source coverage

Verified repository/origin, branch `feature/super-admin-operation-v1`, baseline
`ec86b475e0126667e2fbece490730bdecc271584`, 7 tracked modifications + 32 new
files, none staged. Claude's entire worktree was preserved. Reviewed all 26
Operation source files, all seven shared tracked diffs, three local records
and three approved composition images before changing code.

The following refs were preserved throughout; no push or merge was performed:

- `dev` / `origin/dev`: `ec86b475e0126667e2fbece490730bdecc271584`
- `main` / `origin/main`: `c2235ac5d0d65408e9d39bf836a1a717da3d95ae`
- `docs/backend-handoff-v1` / origin:
  `777e354e1bb4fa2c3e90f84ed765fd04d8df6182`

### Narrow refinements and retained decisions

1. Cleared the Entrepreneur query parameter when its chip/all filters are
   removed, preventing refresh from restoring a stale filter.
2. Made `useCatalogsSnapshot()` detached, frozen and stable for activity-only
   changes. Three Operation catalog consumers and the reference resolver now
   accept readonly input. An isolated Node/TypeScript-transpilation scratch
   test passed 18 assertions for freeze/detachment, snapshot stability,
   create/update/delete, old-snapshot immutability and no catalog cascade.
3. Renamed the combined participant KYC card to **KYC não concluído**; retained
   the explicit Pendente / Em análise split and Compliance ownership.
4. Excluded null timestamps before deriving an Entrepreneur's latest linked
   Opportunity update, so a null record cannot hide a real date.
5. Clarified README's exclusions as catalog/modality-screen boundaries, not
   a contradiction of Operation's local Opportunity creation.

No CSS, visual assets, dependencies, account model or catalog write APIs were
refined by Codex. The design audit informed only these evidence-backed
usability/correctness changes, not a redesign.

Retained: explicit `/edit` route sharing the guarded form; classification
focus parameter; optional Entrepreneur reference; tenant-change clearing
with explanation while retaining modality; prototype-only 3–80 / 300 and
required Whitelabel/modality constraints; one-time destination save notice;
page size 8 as presentation; inactive/missing references remain removable.
No official workflow, final cardinality, financial parameters or delete added.

### Built-in browser functional checks

Used only the Codex built-in browser against the local Vite preview.

- Opportunity search, tenant/catalog/modality filters, clear, page 2 and reset;
  Segment and Resource Use use independent IDs, including Capital de Giro.
- Empty-form validation/focus/linked errors; independent checkbox pickers,
  inactive selected references, chip removal and tenant clearing notice.
- Local create → detail/readback → classification → status → activity;
  linked Entrepreneur count/profile updated immediately from the same store.
- Edit/save, classification focus, clean cancellation; dirty Cancel, sidebar,
  Operation navigation, Finance navigation, Back and Forward guards.
- Reload protection generated a native `beforeunload` event; dismissal kept
  the draft. The browser controller auto-dismissed that native prompt.
- Save notice appeared once, was dismissible, did not repeat after returning
  or reloading; provider timeout is 4200 ms. Timeout removal was observed in
  the ongoing review rather than through a dedicated timed assertion.
- Entrepreneur filter removal now survives refresh; Back/Forward restore or
  clear it correctly. Unknown participant/Opportunity IDs show controlled
  not-found; unknown edit section is ignored safely.
- Participant list search/filter/sort/pagination/empty states and all four
  detail tabs; existing Accounts routes preserve tenant/type. Pending
  Investments/Compliance feedback does not navigate or mutate anything.

### Responsive, accessibility and rendering

- All three lists at 1672, 1440, 1280, 900, 390 and 320; all four tabs of all
  three detail types at every width; create/edit at each width. Status dialog
  at all six widths with 600px height. No page-level horizontal overflow.
- 1440×600 / 900×600 lists, create/edit actions and detail tabs passed;
  desktop sidebar uses scrolling, the 900px icon rail fits, dialog body scrolls
  while actions remain reachable. Mobile drawer navigation also passed.
- Manual landmarks, headings, labelled filters, table headers/captions,
  text statuses, linked errors, visible focus, arrow/Home/End tabs, keyboard
  picker Enter/Space/Escape, modal initial focus/background exclusion/Escape
  and focus return passed. A native modal may let Tab reach browser chrome,
  but it did not focus the background application.
- No usable axe bundle was found. No dependency was installed just to rerun
  it. Claude's 75-state axe result above is historical/attributed, not an
  independently repeated result or WCAG certification.
- Existing Dot Matrix reused inside main only; no canvas under header/sidebar.
  Reduced-motion emulation froze WebGL drawing: after layout settled, the draw
  counter stayed at 16 over a 27-second interval and resumed after restoring
  normal motion. Forced unavailable WebGL rendered the CSS/static fallback in
  all three modules, including a stable 320px capture. Temporary browser-only
  context/draw instrumentation was removed by reload; no QA switch in source.
- Scoped browser smoke/visual review of Login, Dashboard, Whitelabels, Accounts,
  Settings, Emails, Gateways, Modalities and catalogs found no new regression.
  Login invalid-field focus and password toggle, Dashboard Operation shortcut,
  Accounts tabs/detail/local pause-reactivate/tenant navigation, Settings section
  navigation and Gateway/Modality tabs were exercised. This is not a fresh
  reproduction of Claude's full pixel-differential or regression script counts.

### Validation and runtime boundary

- `npm run typecheck`: exit 0.
- `npm run lint` (`oxlint`): exit 0, no findings.
- `npm run build`: exit 0; JS 909.69 kB / gzip 268.38 kB, CSS 199.66 kB /
  gzip 34.86 kB. Existing >500 kB advisory remains; Operation adds bundle
  weight. No code-splitting/product expansion was introduced for this review.
- `git diff --check`: passed. `package.json` / lock unchanged.
- Browser error/warning log: empty. Captured reload requests were local asset
  GETs, but that buffer was truncated; not claimed as a full session trace.
  A fresh, untruncated trace around search/detail/tabs/filters across all three
  modules recorded **zero requests**. Source inspection confirmed no business
  API/fetch/persistence code in Operation.
- Zero Backend use and zero real investment/payment/Pix/transfer/cashout/
  refund/wallet/repayment actions.

### Local-only QA mutation ledger

These were ephemeral browser-memory prototype changes, not homolog records:

1. Created `opp_local_1` (**QA Codex Operation**), Finapop / Debt /
   `emp_proto_002`, Segment `seg_finapop_capital_giro`, Resource Use
   `ru_finapop_capital_giro`; Rascunho → Ativa through prototype status dialog.
2. Edited seed `opp_proto_003` name to **Capital de Giro 2026 QA**; after a
   reload, separately edited its description to a QA save-confirmation sentence.
3. Existing Accounts `inv_proto_001` paused with a local QA reason, then
   reactivated. Dependency data stayed unchanged.
4. Unsaved picker/tenant drafts were discarded, not saved as extra records.

Final reload restored the original seeds (12 Opportunities; `opp_local_1`
absent; seed name/description restored) and removed test instrumentation.

### Explicitly retained limitations / future handoff

- Accounts pause/reactivate/tenant edits remain local to its page; Operation
  reads the original account projection. Retain/document option A, no broad
  Accounts refactor or invented Backend identity.
- Catalog **Uso em Oportunidades: —** remains a future derived integration;
  do not expand this pass into Catalog V2.
- Official workflow/publication, ownership/movement, all cardinalities and
  validation limits, authoritative identity/KYC/investment/readback, permissions,
  persistence, audit and per-record deep links remain Product/Backend decisions.

After promotion, canonical handoff updates will be needed in
`00-context-and-architecture.md`, `01-current-frontend-scope.md`,
`02-dashboard.md`, `04-whitelabel-account-control.md`,
`09-whitelabel-finance-segments-resource-uses.md`, handoff `README.md`,
`open-questions.md`, `audit-findings.md`, and the permissions/business-rules/
backend-dependencies/audit-events matrices, plus separate specifications for
the three Operation modules. **No handoff file was edited in this task.**

**Result:** complete Operation V1 is technically ready for final user review;
the three modules, domain boundaries and corrected Finance taxonomy remain
preserved. Promotion still requires user approval. One local consolidation
commit only; no push/deployment.
