# Segmentos e usos dos recursos V1 — local implementation record

Claude implemented this on 2026-10-07 in the local working tree of
`feature/super-admin-finance-segments-resource-uses-v1`, from baseline
`4098158b1aa8f58ea20692f0e9bb177b36a49e97` (the unchanged `dev` ref).
Codex Account 1 began the independent review; Account 2 continued from that
checkpoint without discarding work. The completed review is recorded below.
The implementation is consolidated in one local feature commit; no push,
promotion or deployment is part of this review.

**Status:** frontend prototype. It is **not connected to the Backend**. It
creates, edits, links or counts no Opportunity, and it performs no financial
operation.

This is a frontend reference record. It is not an API, catalog, permission or
audit specification. `docs/backend-handoff/` was not edited.

The approved image is used as a composition reference only:
[`reference/super-admin-whitelabel-finance-segments-resource-uses-approved.png`](reference/super-admin-whitelabel-finance-segments-resource-uses-approved.png).
Its counts, list contents, active/inactive totals and integration state are
not treated as facts.

What was deliberately left out of the image:

- row checkboxes (no bulk actions);
- the "Dot Matrix" sidebar entry (the existing shell is authoritative);
- the "Ver documentação" button (there is no in-app destination).

## Route and navigation

- **Route:** `#/whitelabels/:whitelabelId/finance/segments-resource-uses`.
  - `App.tsx` parses it with `FINANCE_CATALOGS_PATH`.
  - View: `finance-catalogs`.
  - Title: `Super Admin · Financeiro / Segmentos e usos dos recursos`.
  - Dark shell background applies through `html[data-view='finance-catalogs']`.
  - An unknown tenant ID shows the established "Whitelabel não encontrado"
    state.
- **Financeiro sub-navigation** now has three entries: Gateways e contas,
  Modalidades e regras and **Segmentos e usos dos recursos**
  (`finance-catalogs`).
  - The new item is one entry for the combined screen. There are no separate
    Segmentos or Usos dos recursos entries.
- **Tenant preserved across all three Finance pages.** Every Finance page now
  passes `subNavHrefs` for the parent and all three children. For example,
  `wl_proto_02/finance/modalities` → Segmentos e usos dos recursos lands on
  `wl_proto_02/finance/segments-resource-uses`.
- **Modalities "Sobre" panel:** it previously said these catalogs would come
  in a future block. It now links to this screen for the displayed tenant.
- **Long sub-navigation labels.** In the full sidebar and the mobile drawer,
  labels over 24 characters now wrap instead of overflowing. This is the
  `data-long` attribute in `Sidebar.tsx` / `Sidebar.module.css`. Shorter
  labels keep the fixed row and render pixel-identically. The 768–1199px icon
  rail is unchanged.

## Why one combined screen

- Both catalogs feed the future Opportunity flow and have the same shape, so
  the screen shows them side by side.
- They remain **two independent models** with:
  - separate TypeScript types (`Segment` / `ResourceUse`, ids `seg_…` / `ru_…`);
  - separate store collections, id sequences and actions;
  - separate dialogs, draft keys and duplicate checks.
- No action touches both catalogs. No record is linked, copied or synchronised.

## Structure (`src/features/finance-catalogs/`)

- `FinanceCatalogsPage.tsx`:
  - AppShell, shared Dot Matrix (main area only), context row with the reused
    `WhitelabelContextSelector`, `DetailTransition` keyed by Whitelabel and
    `draftReset`.
  - The shared `useUnsavedChangesGuard`.
  - Dialog state and the per-catalog CRUD handlers.
- `catalogModel.ts`:
  - `Segment`, `ResourceUse`, `CatalogDraft`, status meta and per-catalog copy.
  - Validation (`validateDraft`), name normalisation, sorting, change summary.
  - Activity and draft-key types.
- `prototypeCatalogs.ts`: illustrative seeds per tenant, kept separate per
  catalog.
- `catalogStore.ts`: in-memory session store. Segment and Resource Use actions
  are separate (`create/update/deleteSegment`,
  `create/update/deleteResourceUse`), plus session activity.
- `sections/`:
  - `CatalogPanel`: one generic list UI, instantiated once per catalog.
  - `CatalogSummary`: summary cards, Observações importantes, Atividade da
    sessão.
  - `CatalogSections.module.css`.
- `dialogs/`:
  - `CatalogItemDialog`: create/edit.
  - `DeleteCatalogItemDialog`.
  - `CatalogDialogs.module.css`.
- **Shared code reused unchanged:**
  - the shared Finance stylesheet;
  - `Dialog`, including Codex's `focusableBody` for the text-only delete
    confirmation;
  - `UnsavedChangesDialog`, `StatusPill`, `IconTile`, `EmptyState`, settings
    dialog form styles.
  - The sort and pagination look mirrors Account Control.

## Data model

```ts
type Segment     = { kind: 'segment';      id: `seg_${string}`; name; description; status: 'active' | 'inactive' }
type ResourceUse = { kind: 'resource_use'; id: `ru_${string}`;  name; description; status: 'active' | 'inactive' }
```

The model has no hierarchy, codes, ordering, regulatory category,
Opportunity link or cardinality.

### Illustrative seeds

| Tenant | Segments | Resource uses |
| --- | --- | --- |
| Finapop | Tecnologia, Saúde, Educação, Agronegócio (inativo), **Capital de Giro** | Expansão, Modernização, Marketing, Aumento de estoque (inativo), **Capital de Giro**, Reestruturação (inativo) |
| Loor | Serviços, Varejo, Indústria (inativo) | **Capital de Giro**, Expansão |
| Nova Plataforma | — (empty state) | — (empty state) |

**Capital de Giro appears in both catalogs on purpose**, as unrelated records:
`seg_finapop_capital_giro` and `ru_finapop_capital_giro`. It is **not a
modality**.

## CRUD behaviour (per catalog, independent)

### List

- Search by name or description; case-, accent- and spacing-insensitive.
- Status filter: Todos / Ativos / Inativos.
- Sorting by Nome or Status, with `aria-sort`. Default is Nome ascending.
- Local pagination at 6 per page. The pager appears only when there is more
  than one page.
- Count, range and active/inactive totals.
- Per-row edit and delete buttons, named with the item.
- No bulk or cross-catalog actions.

### Create / Edit

- Fields: Nome, Descrição (optional), Status (Ativo/Inativo).
- Edit preloads the current values.
- **Validation:**
  - name is required; whitespace is collapsed;
  - name is 2–60 characters; description is at most 160 — prototype UX
    constraints only, not authoritative Product/Backend rules;
  - same-catalog duplicate check (see *Duplicate names*).
- Errors appear inline, linked with `aria-describedby`, and focus moves to the
  first invalid field.
- **Saving:**
  - local only;
  - a toast says nothing was sent to the Backend;
  - an entry is added to session activity;
  - the list clears filters if needed and shows the page containing the saved
    item.

### Delete

- Always confirmed. The dialog says that:
  - deletion only removes the record from this local prototype;
  - Product/Backend must define restrictions for records already used by
    Opportunities;
  - no existing Opportunity is changed and no cascade is simulated;
  - **delete is not the same as inactivating**.
- If the other catalog has an item with the same name, the dialog states that
  it is independent and will not be deleted.

### Active vs inactive

- Inactive keeps the record in the catalog, shown with the "Inativo" chip.
- Whether inactive items stay selectable or visible on existing Opportunities,
  and whether reactivation or deletion after use are allowed, is **not
  defined**. The form says so.

**Delete and deactivate are separate concepts.** Delete removes the local
record. Inactive retains it.

## Duplicate names

- **Within one catalog:** obvious duplicates are blocked. The comparison
  ignores case, accents and repeated spaces, and an item does not conflict
  with itself when edited.
  - This is shown as a **prototype UX rule — Backend/Product validation
    required**.
- **Across catalogs:** never blocked.
  - When the typed name exists in the other catalog, the form says so and
    states that no link is created.
  - Example: Segment "Capital de Giro" and Resource Use "Capital de Giro" are
    both valid.

## Summary cards

All values come from local state:

- **Segmentos:** count, plus active and inactive.
- **Usos dos recursos:** count, plus active and inactive.
- **Catálogos independentes:** `—`, "Sem relacionamento automático".
- **Uso em Oportunidades:** `—`, "Aguardando integração".

The note "não são dados de produção" is shown below them. There are no
Opportunity counts.

## Unsaved changes

- **Draft keys:** `segment-form` and `resource-use-form`. They are reported
  only while a create or edit form has changes.
- **Inside the dialog:**
  - Cancelar, ×, Escape or a backdrop click on a dirty form switches the
    footer to "Descartar os dados digitados?" with *Continuar editando* and
    *Descartar*.
  - A clean form closes at once.
- **Page level:** the shared guard covers browser Back/Forward and reload.
  - Back with a dirty form opens the shared unsaved-changes dialog on top of
    the form.
  - *Continuar editando* keeps the typed values.
- **While a form is open:** the tenant selector and the Finance links are
  inert behind the modal, so they cannot be used. With no dirty form, tenant
  switching updates both catalogs.

## Session activity

- Entries: created, updated (with field-level changes), and deleted locally.
- Each entry shows its catalog and a session-local time.
- There is no operator name, no historical record and no database ID.
- The panel says: "Somente ações locais desta sessão do navegador — não é
  trilha de auditoria."

## Ownership, Opportunity relationship and cardinality

- **Tenant scope is not authoritative.** The screen is tenant-scoped to match
  the current Super Admin flow. Open question: are catalogs global, per
  Whitelabel, global with tenant overrides, or shared with selective
  enablement? No inheritance is implemented.
- **Opportunity relationship:** both catalogs are meant for Opportunity
  creation, but this screen does not create, edit or assign Opportunities. It
  shows no Opportunity counts or links and does no migration.
- **Cardinality is not modelled.** Whether an Opportunity has one or several
  Segments or Resource Uses is a Product/Backend decision.

## Conceptual permissions and future audit (specification labels only)

- **Permission labels:** `SEGMENT_VIEW`, `SEGMENT_CREATE`, `SEGMENT_UPDATE`,
  `SEGMENT_DELETE`; `RESOURCE_USE_VIEW`, `RESOURCE_USE_CREATE`,
  `RESOURCE_USE_UPDATE`, `RESOURCE_USE_DELETE`. There is no RBAC.
- **Future events (not in the Backend):** `SEGMENT_CREATED`, `SEGMENT_UPDATED`,
  `SEGMENT_DELETED`, `RESOURCE_USE_CREATED`, `RESOURCE_USE_UPDATED`,
  `RESOURCE_USE_DELETED`.
- **A real audit record should keep:** operator, Whitelabel/context, catalog,
  item ID, sanitized before/after state, result, timestamp and correlation ID.

## Business rules not invented

- Mandatory Segment or Resource Use.
- Number allowed per Opportunity.
- Hierarchy or ordering priority.
- Regulatory categories.
- Automatic linkage.
- Delete blocking.
- Historical retention.
- Reuse rules.

## Responsive behaviour

| Width | Layout |
| --- | --- |
| Wide main area | Context row and four summary cards. The two catalog cards sit side by side when each gets ≥ 480px (`repeat(auto-fit, minmax(min(100%, 480px), 1fr))`). Below them, Observações sits beside Atividade da sessão. |
| < 1200px | Summary cards are 2 × 2. Catalogs stack when narrow. Notes and activity stack. |
| < 768px | Drawer navigation; one summary card per row below 480px. |

**Card-level container queries:**

- The count moves below the controls at ≤ 600px.
- The description moves under the name at ≤ 540px.
- At ≤ 420px: header actions go full width, controls stack, and the status
  column and table header hide (status shows under the name).
- Dialogs use the shared responsive `Dialog`. Body scrolling at short heights
  keeps the footer visible.

## Claude-reported local QA (2026-10-07)

**How it was run.** Every check used a local `vite build` of this working
tree, served on 127.0.0.1. All checks below were rerun on the final tree after
the README and docs edits, with the same results. Playwright (Chromium)
scripts live in the session scratchpad and were not added to the repo.
axe-core 4.x was a scratch copy, not a project dependency.

### Baseline

- Branch and HEAD were read from `.git/HEAD` and the branch ref, without Git
  commands.
- All earlier modules, including Modalidades e regras and the taxonomy
  correction, were present.
- Baseline `tsc -b`, `oxlint --deny-warnings` and `vite build` passed.

### TypeScript, lint and build

- `tsc -b` exited 0.
- `npm run lint` and `oxlint --deny-warnings` exited 0 with no findings.
- `vite build` passed with the same bundle-size advisory as the baseline.

### Interaction flow: 61/61 checks passed

- **Navigation:**
  - tenant-preserving links from Modalidades (sidebar and Sobre link) and from
    Gateways;
  - exactly three Finance entries, with no separate Segmentos or Usos entries;
  - titles and current markers.
- **Data and list behaviour:**
  - derived summary;
  - Capital de Giro in both catalogs with different ids;
  - sort by name and status (`aria-sort`);
  - accent-insensitive search; status filter;
  - each catalog filters independently.
- **Create:**
  - focus moves to Nome; required-name error and focus;
  - normalised same-catalog duplicate blocked, with the prototype-rule copy;
  - a cross-catalog same-name note;
  - segment "Expansão" created while the resource use "Expansão" stays
    untouched;
  - focus returns to the create button.
- **Resource Use create:**
  - its duplicate check is scoped to Resource Uses;
  - a segment name is allowed;
  - the pager appears and the new item's page is shown.
- **Edit:** values preloaded; Ativo → Inativo; activity detail recorded.
- **Unsaved changes:**
  - a dirty form asks before closing on Escape;
  - *Continuar editando* keeps the values;
  - Back is guarded while the form is dirty (stay keeps the form);
  - discarding leaves the data unchanged.
- **Delete:**
  - confirmation copy and the independent-twin note;
  - Cancel focus and focus return;
  - the deleted segment is gone and its Resource Use twin is kept;
  - focus moves to *Novo segmento*;
  - an inactive item stays listed;
  - no request is made during CRUD.
- **Resource Use delete:** the pager disappears when the list falls back to 6.
- **Taxonomy:** Modalidades still shows only Equity and Debt after catalog
  changes.
- **State and tenants:**
  - the catalog state survives in-app navigation;
  - a clean tenant switch updates both catalogs;
  - Nova Plataforma shows empty states;
  - an unknown tenant shows not-found.
- No console errors and no external requests.

### Taxonomy integrity

Checked on the built app for all three tenants:

- Modalidades rows are only Equity and Debt; summary denominators are "de 2".
- Status options, Regras gerais and Gateways' modality summary contain no
  Capital de Giro.
- In source, "Capital de Giro" appears only in the `finance-catalogs` files
  (seeds and notes) and in an explanatory comment in `modalitiesModel.ts`.
- `finance-catalogs` imports nothing from the modality modules.

### axe: 0 violations in 28 states

- **At 1440, 390 and 320:**
  - the page;
  - the create dialog, its errors and the cross-catalog note;
  - the discard confirmation;
  - edit (Resource Use);
  - the delete dialog.
- **At 1440 only:**
  - the Back guard over a dirty form;
  - pagination plus activity;
  - the filtered empty state;
  - the open context selector.
- **Other tenants:** Loor at 1440, Nova Plataforma at 390, and the not-found
  state.
- A fresh axe run of the Gateways *Desativar gateway* dialog at 320×640 (after
  Codex's `focusableBody` fix) also reports 0 violations.

### Keyboard

- Tab order follows reading order: sidebar (three Finance entries), header,
  context, then each catalog's create button, search, filter, sort buttons and
  row edit/delete pairs.
- Focus stays inside the open dialog.
- Escape closes the delete dialog and returns focus to its trash button.
- A keyboard-only create works: typing, Tab, arrow keys on the status radios,
  then Enter to submit.

### Responsive and short heights

- **Widths:** 1672, 1440, 1280, 900, 390 and 320 for all three tenants, with no
  horizontal page scroll and no console errors.
- **Short heights (1440×600, 900×600):**
  - At 1440×600 the sidebar scrolls (788px of content; E-mails is 808px). At
    900×600 the icon rail fits.
  - The create dialog body scrolls with its footer actions visible.

### Dot Matrix

- It stays in the main area only.
- With WebGL there is a canvas.
- With `--disable-webgl --disable-3d-apis` there is no canvas, a static
  background and no errors.
- With reduced motion there is a still frame and no fade.

### Regressions

Compared against the pristine baseline build.

- **Pixels** (WebGL off, reduced motion):
  - Login, Dashboard, Whitelabels, Account Control, Settings and E-mails are
    identical, viewport and full page.
  - Gateways and Modalidades differ only in the sidebar (the new third
    entry). Modalidades also differs in its Sobre text (the new link).
- **Flows:**
  - Gateways: 72/72. In the final pass, one run made in parallel with six
    other browser scripts missed the timing-based *Validando…* check once
    (it waits a fixed 250 ms); run alone, it passed 72/72.
  - Modalidades: 58/58 on the baseline. On this build it is 58/58 after
    updating the one check whose expectation changed on purpose: it
    previously asserted that no Segmentos navigation entry exists.
  - Settings: 67/67.
  - E-mails: 61/61.
  - Account Control script: 110 checks, 0 failures.
- **Differential smoke test:** the only differences are the new sidebar entry
  on the Finance pages and the one-character text change in the Modalidades
  Sobre text.

## Known Backend / Product dependencies

1. Catalog ownership: global, per Whitelabel, global with overrides, or shared
   with selective enablement.
2. The source of truth and the official initial contents of both catalogs.
3. Definitive name rules: uniqueness scope, case, accents, length and
   reserved names.
4. The meaning of inactive: selectable or not, visible on existing
   Opportunities, reactivation.
5. Delete semantics after use: blocked, soft delete, retention or migration.
6. Opportunity relationship and cardinality: one or many Segments, one or
   many Resource Uses, and whether either is mandatory.
7. Whether hierarchy, codes, ordering or regulatory categories are needed.
8. The permission model (labels above).
9. Audit events with the required fields.
10. Sanitized errors for create, update and delete, including conflicts.
11. Concurrency and versioning for edits.

None of these blocks the frontend prototype.

## Excluded scope

The following are not implemented:

- **Opportunity work:** create, edit or assign Opportunities; Opportunity
  counts or associations; bulk migration.
- **Catalog-level features:** cardinality rules; links between catalogs; global
  inheritance; bulk actions.
- **Platform services:** RBAC; persistent audit; Backend calls.
- **Financial operations:** no financial operation of any kind.
- **Process:** no new OriginKit asset, no new dependency, no
  `docs/backend-handoff/` edit.

## Original items for Codex review (resolved below)

- **Sidebar `data-long` wrapping** for sub-navigation labels over 24
  characters. It applies to the full sidebar and drawer only, and other pages
  are unchanged in pixels.
- **The `subNavHrefs` additions** on Gateways and Modalidades, and the
  Modalidades Sobre link.
- **The teal "Novo uso do recurso" button.** It is a local class on
  `PrimaryButton` that follows the approved image. White text on `#0f6f61`
  to `#15806f` is at least 4.8:1 contrast.
- **The duplicate-name normalisation** (case, accents, spacing) and the length
  limits (60 / 160), which are prototype choices.
- **Page size 6** and **default sort Nome ascending**.
- **No page-level guard on tenant switch while a form is open:** the modal
  makes the selector unreachable. Back/Forward and reload are guarded.

## Independent Codex review completion — Accounts 1 / 2, 2026-10-07

### Recovery and refinements

- Branch and committed baseline matched the checkpoint. The index was empty;
  Claude's 12 modified tracked files and 12 new files were preserved. Account
  1's small refinement was present in the new catalog module, not a separate
  commit: an explicit prototype-limit form hint and a comment beside the
  `NAME_MAX` / `DESCRIPTION_MAX` constants. Both were retained unchanged.
- The initial Login fallback was a stale Vite preview process, not a routing
  defect. Restarting that verified local preview restored the route without
  a source change.
- Account 2 changed only this implementation record and the README's matching
  limit description. No redesign, shared-component change, new dependency,
  additional OriginKit asset or Backend integration was required.
- `dev` / `origin/dev` remained at `4098158b1aa8f58ea20692f0e9bb177b36a49e97`;
  `main` / `origin/main` at `c2235ac5d0d65408e9d39bf836a1a717da3d95ae`;
  the local/remote documentation branch at
  `970c676f54d7df8cc2e7a9229aab3218c66ae93e`. Remote refs were checked live.

### Scope, taxonomy and independent local CRUD

The source review covered all ten files in `src/features/finance-catalogs/`,
the supplied approved image and local implementation notes, and every changed
shared file: App, navigation, Sidebar TSX/CSS, global CSS, the two Finance page
components and Modalidades' About component/style. Each shared change serves
route registration, tenant-preserving navigation, the About link, dark-shell
styling or long-label wrapping; there is no cross-catalog business coupling.

- The running screen retains the approved composition, shell, navy/violet
  surfaces, cards and existing Dot Matrix. It intentionally omits unsupported
  bulk checkboxes, a Dot Matrix sidebar destination and an inert documentation
  button. These are integration/scope decisions, not new Product behavior.
- Finance has exactly three destinations: Gateways e contas, Modalidades e
  regras, Segmentos e usos dos recursos. The existing Loor (`wl_proto_02`)
  selector and all three destinations, including the Modalidades About link,
  preserve the selected tenant. Nova Plataforma's two empty catalogs render
  separately. This UI partition does not settle domain ownership.
- Modalities remain exactly `equity` / `debt` in `financeModel.ts`. Capital de
  Giro appears as independent illustrative `seg_finapop_capital_giro` and
  `ru_finapop_capital_giro` records, never a third modality. Neither catalog
  imports or embeds modality or Opportunity relationships.
- Account 1 tested independent create/read/update/delete with local records
  named `ZZ QA Catalog`: `seg_local_1` and `ru_local_1`. Both coexisted;
  changing the Segment's description/status did not change the Resource Use,
  and vice versa. Deleting the Segment left the Resource Use present. Both
  disposable local records were then deleted; reloading restores the seeds.
  No remotely persistent fixture was created.
- Required name, normalized same-catalog duplicate (`SAUDE` against `Saúde`),
  61-character name and 161-character description errors were observed with
  focus on the invalid field. Cross-catalog names produced an informative
  independence notice, not an error. Normalization and length limits remain
  explicitly prototype-only, pending definitive Product/Backend validation.
- Search found Saúde / Modernização without accents; independent inactive
  filters and Nome/Status sorting worked. Creating the seventh Resource Use
  revealed page 2, with a correct 7–7 of 7 range. Page size 6 and default
  locale-aware name sorting remain presentation choices.
- Inactivation retained the record. Delete confirmations described local
  removal, no cascade, no Opportunity change, unresolved used-record semantics
  and the independent same-name record where applicable. Deleting restored
  focus to the relevant catalog's create button.
- Summary cards derive only from the local datasets; integration/relationship
  cards use “—”, not fabricated Opportunity counts. Session activity names
  the affected catalog and says it is not an audit trail; it has no operator
  attribution or Backend IDs.
- The teal Resource Use CTA is consistent with the reference and established
  tone family. Independently calculated white-text contrast is 4.83:1 at
  `#15806f` and 6.06:1 at `#0f6f61`. Its gradient was retained.

### Browser evidence, responsive layout and accessibility

Only the existing Codex built-in browser was used. Captures are temporary QA
artifacts at `C:/Users/User/AppData/Local/Temp/super-admin-catalogs-codex-20261007/`,
not production assets or a new repository dependency. The approved reference
and the captured screen were inspected together before refinements.

| Viewport | Independent result |
| --- | --- |
| 1672×941 | Two catalog columns; long Finance label wraps cleanly. |
| 1440×810 | Two columns; descriptions adapt to card width. |
| 1280×810 | Two columns; compact rows remain readable. |
| 900×810 | Stacked catalogs; fixed icon rail remains intact. |
| 390×844 | Stacked cards/controls; descriptions/status inline; actions visible. |
| 320×640 | Same mobile structure; long labels/actions wrap without overflow. |
| 1440×600 | Sidebar scrolls; no clipping or horizontal page overflow. |
| 900×600 | Icon rail fits; content scrolls normally. |

Document/body widths never exceeded the viewport in these checks. The drawer
was opened at 320px: the combined catalog label wraps in two lines, the menu
scrolls at short height, and the existing shorter labels retain their layout.
Search/filter labels, table captions, `aria-sort`, named row actions, inline
error associations, textual statuses and visible focus were checked. Native
modal semantics make underlying tenant/Finance controls inert. Focus starts
on Nome or Cancelar, remains off the underlying app during keyboard traversal,
and returns to the opener (or the create fallback after deletion).

- Dirty Escape, Cancelar and close-button actions ask before discarding.
  Declining retains the draft. Settled Back and Forward tests displayed the
  shared navigation guard, restored the current history entry and preserved
  the form when the user continued editing.
- Reload was independently observed through `Page.javascriptDialogOpening`
  with `type=beforeunload`; the browser closed it with `result=false`, and
  `Reload guard QA` remained in the open form. There was no silent reset.
- At 320×640 the create form has an internally scrollable body with visible
  footer actions. The Gateways “Desativar Provedor Alfa?” regression check
  retained its named, `tabIndex=0`, text-only scroll region (361px viewport /
  443px content), keyboard scroll response, visible Cancelar and Desativar
  controls, Escape behavior and focus return to Desativar. The deactivation
  itself was **not submitted**.
- No local axe runtime was available after focused searches of the workspace,
  Codex files and temporary artifacts. No dependency was installed. This is
  a manual/DOM accessibility review, **not a fresh axe pass**; Claude's earlier
  reported axe results above remain separately attributed.

### Dot Matrix and targeted regressions

- Existing Dot Matrix TSX/CSS are unchanged. The WebGL host is decorative,
  pointer-inert and inside `main`; captures show no sidebar/header leakage.
- Emulating `prefers-reduced-motion: reduce` produced byte-identical viewport
  captures and a static field. The emulation was then removed.
- A temporary browser-only diagnostic made WebGL contexts unavailable while
  re-entering the catalog route: zero canvases / WebGL hosts, a readable
  static CSS Dot Matrix fallback and no horizontal overflow. A settled
  `no-webgl.png` was inspected. Reload removed the diagnostic and restored the
  normal WebGL host. No QA switch was added to application code.
- Login, Dashboard, Whitelabels, Account Control, Settings and E-mails received
  targeted route/render/screenshot checks; Login required-field validation and
  password visibility toggle passed. Gateways quick-action navigation and its
  narrow deactivation dialog passed. Modalidades rendered only Equity/Debt and
  its About link opened the matching tenant's catalog. No regression was found
  in this scoped review; this does not claim a rerun of every historical suite.

### Validation and safety

- Final TypeScript, oxlint, production Vite build and `git diff --check` passed.
  The existing single-bundle size advisory remains non-blocking.
- Browser warning/error logs were empty. Retained reload trace entries were
  local static GETs only; an older broad trace was truncated, so it is not
  presented as a complete network archive. A fresh bounded, untruncated
  search/form-validation/cancel trace contained **zero requests and zero
  runtime exceptions**. Source search found no business HTTP client in `src`.
- No Backend work, business API call, real financial operation, external
  browser, push, deployment or canonical handoff modification was performed.

### Canonical handoff impact — deferred until approved promotion

The separate `docs/backend-handoff-v1` branch was inspected read-only. After
promotion, the handoff update should cover these exact paths:

- **New:** `docs/backend-handoff/09-whitelabel-finance-segments-resource-uses.md`
  for the two independent prototype catalogs and unresolved contracts.
- **Existing:** `docs/backend-handoff/README.md`,
  `docs/backend-handoff/00-context-and-architecture.md`,
  `docs/backend-handoff/01-current-frontend-scope.md`,
  `docs/backend-handoff/07-whitelabel-finance-gateways.md`,
  `docs/backend-handoff/08-whitelabel-finance-modalities-rules.md` for current
  scope, taxonomy, navigation and the About link.
- **Matrices/questions:** `docs/backend-handoff/matrices/backend-dependencies.md`,
  `docs/backend-handoff/matrices/business-rules.md`,
  `docs/backend-handoff/matrices/permissions.md`,
  `docs/backend-handoff/matrices/audit-events.md`,
  `docs/backend-handoff/open-questions.md` for ownership, validation, deletion,
  inactive semantics, Opportunity cardinality and conceptual permissions/audit.

No new audit finding requires changing `audit-findings.md`. Account Control,
Settings and E-mails handoff contracts do not need unrelated edits.

**Outcome:** technically ready for final user review. The independent catalogs
and corrected modality taxonomy are preserved; existing screens are stable in
the targeted checks. The feature may be promoted only after user approval.
The eleven Product/Backend dependencies listed above remain open and were not
silently converted into authoritative rules.
