# Modalidades e regras V1 — local implementation record

Claude implemented this on 2026-10-07 on the local working tree of
`feature/super-admin-finance-modalities-rules-v1` (HEAD
`25b5e65d374d9bf49f4aa1db4a55bdd6d6b21181`, the same commit as `dev`). The
changes were preserved and independently reviewed/refined by Codex for one local
feature commit. No push, promotion, deployment or Backend work was performed.

Status: frontend prototype. It is **not connected to the Backend**. It creates
or changes no Opportunity, investment or payment, and it performs no financial
operation.

This file records what the frontend does. It is not an API, rule-catalog,
permission or audit specification. `docs/backend-handoff/` was not edited.

The approved image gives the composition only:
[`reference/super-admin-whitelabel-finance-modalities-rules-approved.png`](reference/super-admin-whitelabel-finance-modalities-rules-approved.png).
Its incidental details are not treated as product facts. That includes the
timestamps, rule and dependency counts, copy buttons, pagination, row menus,
the Whitelabel card shown in the detail column, and its sidebar.

## Route and navigation

**Route:** `#/whitelabels/:whitelabelId/finance/modalities`.

- It is parsed in `App.tsx` (`FINANCE_MODALITIES_PATH`) before the login
  fallback.
- View: `finance-modalities`. Title: `Super Admin · Financeiro / Modalidades e
  regras`.
- The dark shell background applies through
  `html[data-view='finance-modalities']`.
- An unknown tenant ID shows the established "Whitelabel não encontrado" state.

**Navigation.** Financeiro now lists two screens while it is active:
**Gateways e contas** and **Modalidades e regras** (`finance-modalities`).

- Both Finance pages pass `subNavHrefs` for the parent and both children, so
  switching between them keeps the displayed Whitelabel. For example,
  `#/whitelabels/wl_proto_02/finance/gateways` → Modalidades e regras opens
  `#/whitelabels/wl_proto_02/finance/modalities`.
- On Gateways e contas, the *Modalidades e regras* quick action is now a link
  to the displayed tenant's Modalidades screen. Before, it showed a "módulo
  futuro" notice.
- No top-level module was added, renamed or removed.
- **Segmentos e usos dos recursos** was not added to the navigation, because
  that block does not exist yet and a placeholder entry would lead nowhere.

## Product taxonomy

- The current modalities are **Equity and Debt only**. The catalog is derived
  from `MODALITIES` in `finance-gateways/financeModel.ts`. The Modalidades
  screen adds presentation data only (description, icon, tone), so adding a
  modality later is one change to the Finance model plus its metadata.
- **Capital de Giro is not a modality.** It does not appear as a modality,
  planned modality, dependency, status or count. The only mention is a code
  comment in `modalitiesModel.ts` that records this rule. The built bundle
  contains no occurrence.
- **Segmentos** and **Usos dos recursos** are separate future catalogs tied to
  Opportunity creation. The "Sobre modalidades e regras" panel mentions them in
  one sentence. There is no CRUD, route, count or link.

## Structure (`src/features/finance-modalities/`)

- **`FinanceModalitiesPage.tsx`:** the page frame and the selection logic.
  - Frame: AppShell, the shared Dot Matrix (main area only), the context row
    (back link, scope sentence, reused `WhitelabelContextSelector`), and
    `DetailTransition` keyed by Whitelabel plus `draftReset`.
  - Guards: the shared `useUnsavedChangesGuard` covers the page, and a second
    guard covers switching modality while a rules draft exists.
  - Local state: page tabs (Modalidades / Regras gerais), selection, search,
    status filter and the controlled detail tab.
- **`modalitiesModel.ts`** defines:
  - the catalog metadata and gateway-dependency derivation;
  - the generic rule concepts and categories;
  - the three-state rule choice;
  - session activity types and draft keys.
- **`prototypeModalities.ts`:** illustrative rule choices per tenant. It
  contains only the two editable concepts.
- **`modalitiesStore.ts`:** an in-memory session store for rule choices and
  activity. It survives in-app navigation but not a reload.
- **`sections/`:**
  - `ModalitySummaryCards`
  - `ModalityList`
  - `ModalityDetail` (tabs plus enable/disable)
  - `ModalityPanels` (Visão geral, Dependências, Regras, Atividade da sessão)
  - `GeneralRules` (the Regras gerais page tab)
  - `ModalitySide` (Sobre modalidades e regras, Ações rápidas)
  - `ModalitySections.module.css`
- **`dialogs/`:** `DisableModalityDialog` and its stylesheet.
- **Shared code reused:** `SettingsSection`, `useSectionEditor`,
  `UnsavedChangesDialog`, `Dialog`, `Tabs` (underline and segmented), `IconTile`,
  `StatusPill`, `EmptyState`, `DetailTransition`, `DotMatrixBackground` and
  `WhitelabelContextSelector`.
  Codex added an optional presentation-status input to `SettingsSection` and an
  opt-in focusable text body to `Dialog`; their existing defaults stay intact.
- **Shared Finance styles:** the card, table, detail, tab, summary and
  quick-action classes come from `finance-gateways/sections/FinanceSections.module.css`,
  so both Finance screens use one look.

## State: single source with Gateways e contas

- **Enablement:** a modality is enabled when the Finance store's
  `settings.modalities[id]` is `'enabled'`. Gateways e contas reads the same
  value, so the two screens never disagree.
  - The Finance `ModalitySetting` gained one additive value, `disabled`
    ("Desabilitada"). It is used when a configured modality is disabled here.
  - The `not_configured` value remains for modalities that were never set up
    (Nova Plataforma).
- **Gateway dependency:** derived from the existing Finance demo rule. An
  enabled modality is *served* when at least one **active** local gateway is
  marked for it, Sandbox included. Otherwise it is *pending*. A disabled or
  unconfigured modality shows *não avaliada*.
  - This rule is a prototype convention, not an authoritative statement about
    which gateway serves Equity or Debt.
- **Rule choices:** stored only in this module's store. They are not stored
  in the Finance model.

## Screen behaviour

### Summary cards

Every value is derived from local state, and a note says so:

- **Modalidades habilitadas:** *n* of 2.
- **Dependências pendentes:** the number of enabled modalities with no active
  gateway.
- **Regras com configuração local:** *n* of 4 editable concepts.
- **Catálogo oficial de regras:** `—`, "Aguardando Produto e Backend".

### List

- **Columns:** Modalidade, Descrição, Status, Dependências (gateway), Regras
  (*n* de 2 locais), and an edit-rules button.
- **Search** matches the name and the description.
- **Status filter:** Habilitada / Dependência pendente / Desabilitada / Não
  configurada.
- **Interaction:** clicking a row selects it and drives the detail panel. The
  edited row also shows "Alterado localmente" while its rules have an unsaved
  draft.
- There are no bulk actions, row menus or pagination.
- *Configurar {modalidade}* and the pencil button open the Regras tab and move
  focus to *Editar regras*.

### Detail tabs

- **Visão geral:** status, description, Whitelabel scope (name and ID),
  configuration origin, rule summary, gateway dependency, "Integração:
  Aguardando Backend" and "Última alteração".
  - The last change is shown only as a time within this session, or "Nenhuma
    nesta sessão".
  - The tab holds the *Habilitar modalidade* or *Desabilitar modalidade*
    button.
- **Dependências** are conceptual and derived from Gateways e contas:
  - **Gateway ativo:** served / pending / not evaluated, with the demo-rule note
    and a link to the tenant's Gateways e contas.
  - **Conta bancária:** informative only. It counts active accounts, labels
    the relationship "não definida", and never blocks.
  - **Regras:** a count of local choices. It does not block.
  - **Documentação e requisitos:** "Definição pendente".
- **Regras:** the generic rule prototype, described below.
- **Atividade da sessão:** see *Session activity*.

### Regras gerais page tab

- A read-only overview of the six structural categories. Each card shows the
  Equity and Debt state for that category.
- A conceptual strip shows *Padrão da plataforma (Padrão não definido) →
  Override do Whitelabel (Configuração local)*, with "Herança real e
  persistência: aguardando Backend".
- Buttons open each modality's Regras tab.

### Quick actions

- Configurar regras.
- Regras gerais (switches the page tab and focuses it).
- Ver dependências.
- Auditoria (notice: "módulo futuro").

## Enable / disable

- **Habilitar modalidade** acts locally and at once. The notice states that
  operational impact depends on Product and Backend. If no active gateway
  serves the modality, it also says the dependency is pending.
- **Desabilitar modalidade** always asks for confirmation. The dialog says:
  - it changes only the prototype configuration state;
  - Product and Backend must define the operational impact;
  - existing Opportunities, investments and payments are not changed;
  - local rules and gateway links are kept, and no cascade is simulated.

  Focus returns to the toggle.
- **No cascading effect:** gateways, bank accounts and rule choices are left
  untouched. No request is made (the flow checks this).

## Rule prototype

The **structural categories** are Disponibilidade, Elegibilidade, Fluxo
operacional, Configuração por Oportunidade, Documentos e requisitos and Limites.
They organise the screen only; they are not a confirmed contract.

| Category | Concept | Kind | Behaviour |
| --- | --- | --- | --- |
| Disponibilidade | Disponível para este Whitelabel | derived | Follows enablement (Sim/Não); read-only |
| Elegibilidade | Critérios de elegibilidade | pending | "—", Aguardando Backend |
| Fluxo operacional | Exige aprovação manual | choice | Padrão não definido / Sim / Não |
| Configuração por Oportunidade | Permite configuração no nível da Oportunidade | choice | Padrão não definido / Sim / Não |
| Documentos e requisitos | Requisitos de documentação | pending | "—", Aguardando Backend |
| Limites | Limites | pending | "—", Aguardando Backend |

- **Every item is marked as unconfirmed.** Each shows an origin tag
  (*Padrão não definido*, *Override do Whitelabel*, *Derivado da habilitação*
  or *Aguardando Backend*). Each also shows the text "Configuração de
  protótipo · Decisão de Produto pendente · Contrato de Backend pendente".
  Pending items show only the last two.
- **Default and override are conceptual only.** *Padrão não definido* means no
  platform default exists. *Sim* or *Não* is shown as a local "Override do
  Whitelabel". No inheritance is implied, and the Visão geral origin row says
  the platform default is undefined.
- **No financial rules are invented.** There are no interest rates,
  percentages, minimum amounts, terms, amortization, return calculations,
  valuations or payment schedules. A note in the Regras tab says these are not
  configured on this screen.
- **Save model:** the shared section editor runs edit → dirty ("Alterado
  localmente") → Salvar (a local simulation of about 650 ms) or Descartar.
  - There is no global save.
  - Saving logs which labels changed (for example, "Exige aprovação manual:
    Padrão não definido → Sim"). Discarding a dirty draft logs a discard
    entry.

## Unsaved changes

- **Draft key:** `modality-rules`. It is reported by the section editor.
- **Shared page guard:** covers sidebar and other links, browser Back/Forward,
  reload and the Whitelabel selector. *Descartar e continuar* resets the draft
  through `draftReset`.
- **Modality switch:** switching modality, including from Regras gerais or the
  pencil buttons, opens the same `UnsavedChangesDialog` ("selecionar outra
  modalidade"). *Continuar editando* keeps the draft.
- **No unmounting:** the page tabs and detail tabs keep their panels mounted
  (`hidden`), so changing tabs never drops a draft.

## Session activity

- Entries: modality enabled locally, modality disabled locally, rules changed
  locally (with label-level changes), and rules changes discarded.
- Every entry shows a session-local time only. There is no operator name, no
  persistent record and no database ID.
- The panel says: "Somente ações locais desta sessão do navegador — não é
  trilha de auditoria."
- Discards caused by navigating away through the guard are not logged.

## Conceptual permissions and future audit (specification labels only)

**Permission labels.** These are for discussion and are not implemented:

- `MODALITY_VIEW`, `MODALITY_UPDATE`, `MODALITY_ENABLE`, `MODALITY_DISABLE`
- `MODALITY_RULE_VIEW`, `MODALITY_RULE_UPDATE`

There is no RBAC in the prototype.

**Future audit events.** These do not exist in the Backend:

- `MODALITY_ENABLED`, `MODALITY_DISABLED`, `MODALITY_RULES_UPDATED`

A real audit record should keep the operator, Whitelabel, modality, sanitized
before/after state, result, timestamp and correlation ID.

## Financial safety and Opportunity boundary

- **Not implemented:** wallet balance changes, payment changes, Pix generation,
  investment changes, refunds, withdrawals, cashout, transfers, reconciliation
  or manual financial operations.
- **No Opportunity work:** no Opportunity is created or edited. There are no
  Opportunity-level values, contracts, documents or investment limits. This
  module covers tenant-level modality governance only.

## Responsive behaviour

| Width | Layout |
| --- | --- |
| ≥ 1360px | Context row and summary cards. Page tabs and the list sit beside the selected-modality panel (`minmax(460px, 42%)`). Below them, Sobre sits beside Ações rápidas. |
| 768–1359px | Single column: tabs and list, detail, Sobre, Ações rápidas. Summary cards are 2 × 2 below 1200px. |
| < 768px | Drawer navigation. Summary cards are one per row below 480px, and the page tabs share the width. |

**Container queries** handle the narrower panels:

- **List:** Descrição moves under the name at ≤ 760px. Regras hides at
  ≤ 600px, Dependências at ≤ 500px, and Status plus the header at ≤ 430px
  (status moves under the name).
- **Detail tabs:** follow the Finance rules: one row down to the 1360px
  two-column width, then 2 × 2 on phones.
- **Rule rows:** stack at ≤ 420px.
- **Regras gerais:** two columns, then one at ≤ 560px.

## Claude-reported local QA (2026-10-07)

All runs used a local `vite build` of this working tree served on 127.0.0.1,
with Playwright (Chromium) scripts kept in the session scratchpad and not added
to the repo. axe-core 4.x was a scratch copy, not a project dependency.

- **Baseline checks:**
  - Branch and HEAD were read from `.git/HEAD` and the branch ref, read-only.
    No Git command was run.
  - All prior modules, the taxonomy correction (Equity and Debt only),
    tenant-preserving Finance links and the shared Dot Matrix were present.
  - Baseline `tsc -b`, `oxlint --deny-warnings` and `vite build` passed.
- **TypeScript, lint and build:** `tsc -b` exited 0. `npm run lint` and
  `oxlint --deny-warnings` exited 0 with no findings. `vite build` passed with
  the same bundle-size advisory as the baseline.
- **Interaction flow: 58/58 checks passed.** Covered:
  - Tenant-preserving navigation from Gateways (sidebar and quick action),
    titles, current markers, preserved modules and no Segmentos entry.
  - Only the Equity and Debt rows, no Capital de Giro on either Finance page,
    the filter options, and the derived summary values for all three tenants.
  - Search, filter empty state, selection, and the Visão geral content.
  - The Regras tab: markers, the six categories, exactly two editable
    concepts, the dirty badge and row indicator, and the modality-switch guard
    (stay, discard).
  - Saving and its activity entries.
  - The tenant-switch, sidebar-link and Back guards.
  - Disable: confirmation copy, focus to Cancel, focus return, no cascade, no
    request, and the shared "Desabilitada" state on Gateways.
  - Re-enable with its notice; Regras gerais (6 categories, conceptual strip,
    edit buttons); the quick actions.
  - Nova Plataforma: enabling without a gateway gives "Dependência pendente".
  - The not-found state; no console errors; no external requests.
- **axe: 0 violations in 20 states.**
  - At 1440: overview, dependencies, rules view, rules edit with a dirty draft,
    modality-switch guard, open context selector, tenant-switch unsaved
    dialog, activity with entries, disable dialog, disabled state, Regras
    gerais, filtered empty state.
  - At 390 and 320: the page; at 320 also rules edit, Regras gerais and the
    disable dialog.
  - Also Loor at 1440, Nova Plataforma at 390, and the not-found state.
  - Fixed during QA: the first disable dialog scrolled at 320×640 without a
    focusable element (`scrollable-region-focusable`). The redundant summary
    list was removed.
- **Keyboard:**
  - The tab order follows reading order: sidebar (both Finance children),
    header, back link, selector, page tab, *Configurar*, search, filter, rows
    with their edit buttons, the selected detail tab, the toggle, and the
    quick actions.
  - Arrow and End keys move between tabs.
  - Escape closes the disable dialog, and focus returns to the toggle.
- **Responsive:** 1672 / 1440 / 1280 / 900 / 390 / 320 for all three tenants.
  No horizontal page scroll and no console errors.
- **Short heights (1440×600, 900×600):**
  - Content does not clip. The disable dialog fits without scrolling.
  - At 1440×600 the sidebar scrolls (736px of content, the same as Gateways
    now; E-mails is 808px). At 900×600 the icon rail fits.
- **Dot Matrix:**
  - Main area only.
  - With WebGL: canvas present.
  - With `--disable-webgl --disable-3d-apis`: no canvas, static background,
    no errors.
  - With reduced motion: still frame, no fade on tenant switch.
- **Regressions, compared against the pristine baseline build:**
  - **Pixels** (WebGL off, reduced motion): Login, Dashboard, Whitelabels,
    Account Control, Settings and E-mails are identical in all 36
    comparisons.
  - Gateways differs only where expected:
    - the sidebar (the new child);
    - the quick-action description ("Governança por modalidade" instead of
      "Módulo futuro");
    - a sub-visible background gradient shift (maximum channel difference 1)
      at 390, caused by the 15px taller page.
  - **Flows:**
    - Gateways flow: 72/72, after updating the one intentionally changed check
      (quick action is now a link). Two copy checks were updated to match
      Codex's taxonomy-correction wording; the same flow also passes 72/72 on
      the baseline.
    - Settings flow: 67/67. E-mails flow: 61/61. Account Control script: 110
      checks, 0 failures.
  - **Differential smoke test:** the only differences are the new sidebar
    child and the quick-action text.
- **Pre-existing finding, not fixed:** the Gateways *Desativar gateway*
  dialog at 320×640 reports the same `scrollable-region-focusable` issue on
  the baseline build and on this one. It is listed for Codex.

## Known Backend / Product dependencies

1. **Official modality catalog,** and how a new modality is added.
2. **Per-tenant enablement:** whether modalities can be enabled per
   Whitelabel, and the source of truth (platform, tenant, or both).
3. **Default and override semantics:** the platform default, tenant override,
   inheritance and how a reset works.
4. **Authoritative rule catalog per modality:** names, types, validation and
   ownership.
5. **Effect of disabling a modality** on new and existing Opportunities,
   ongoing investments, payments and communications.
6. **Relationship to existing Opportunities:** whether disabling is blocked,
   warned about or scheduled.
7. **Gateway relationship:** which gateway serves each modality, fallback,
   and whether Sandbox satisfies a modality.
8. **Bank-account relationship:** whether an account is required, and which
   one.
9. **Sandbox / Production semantics** for modality readiness.
10. **Document requirements** per modality.
11. **Permission model** (labels above).
12. **Audit:** the events above, with the required fields.
13. **Sanitized errors** for enable, disable and rule updates.

None of these blocks the frontend prototype.

## Codex review decisions and refinements (2026-10-07)

Initial repository: `C:/Users/User/Desktop/Loor/super-admin-Loor`, branch
`feature/super-admin-finance-modalities-rules-v1`, HEAD
`25b5e65d374d9bf49f4aa1db4a55bdd6d6b21181`. Claude's 10 modified tracked files,
14 new feature files and 2 new documentation/reference files were intact.
The entire new feature, tracked diff, shared guard/editor/dialog implementation
and approved composition image were reviewed. No work was discarded.

- **Taxonomy/model:** retained the single Equity/Debt Finance catalog and the
  additive `disabled` state. It expresses an explicit local operator choice,
  unlike never-configured; it is not a Backend enum. No third modality, Segment
  CRUD, Resource Use CRUD, Opportunity editor or financial rule was added.
- **Settings coupling:** restored `settingsModel.ts` to its committed baseline.
  Finance-only labels now come from `modalitiesModel.ts` as `{ label, tone }`.
  `SettingsSection.tsx` accepts that optional presentation metadata without
  broadening Settings' status catalog. Shared dirty/saving/saved badges still
  take precedence; existing string-status consumers behave as before.
- **Summary consistency:** corrected the existing Gateways enabled-count
  calculation to use enablement, not gateway-readiness display status. Shared
  Finance state remains the only enablement source; rule choices are separate.
- **Sandbox wording:** strengthened the dependency note to explicitly state
  that any active local gateway, **including Sandbox**, is a demo assumption
  and proves no Production readiness. Bank relationship stays **Relação não
  definida**; no account is declared authoritative or required.
- **Shared styles:** retained the existing Finance surface/table/detail/quick
  primitives; the single link-decoration addition is safe. There is no reverse
  import from Gateways into the new feature and no feature dependency cycle.
- **320px overflow:** removed the mobile inline-status indent only when the
  list container is at most 300px wide. This fixes the observed 5px Loor table
  overflow (long pending-status pill); desktop layout is unchanged.
- **Baseline Gateway accessibility issue:** `Dialog` gained opt-in
  `focusableBody` with a named region and visible focus outline. Only the
  text-only deactivate Gateway dialog opts in. This is a minimal keyboard
  scrolling correction, not a defect introduced by Modalidades.
- **Rules/ownership:** retained the six generic categories and two illustrative
  editable concepts. Every concept visibly declares Product/Backend pending;
  default/override is explicitly conceptual. Regras gerais remains read-only,
  with the sole rule editor in the selected modality detail.
- **Visual direction:** preserved the approved shell, typography, spacing,
  Dot Matrix and list/detail composition. The wide list's empty region is
  restrained and appropriate for two entries. At 1672px, description folding
  follows the list container query; it is intentional, readable and unclipped.

Codex code changes relative to Claude's delivered worktree:
`modalitiesModel.ts`, `ModalityPanels.tsx`, `ModalitySections.module.css`,
`SettingsSection.tsx`, `Dialog.tsx`, `Dialog.module.css`,
`GatewayDialogs.tsx`, Gateways `SummaryCards.tsx`, plus the restoration of
`settingsModel.ts` (there is no final diff for that restored file).
Local documentation changes are this record, the Gateways follow-up and README
QA attribution. No dependency/package file or canonical handoff file changed.

## Independent Codex runtime and validation evidence

All runtime checks used the **Codex built-in browser**, the existing local Vite
setup at `127.0.0.1:5173`, and session-only illustrative data. No external Chrome,
Backend, provider or real credential was used. Screenshot evidence was saved
outside the repository in the temporary directory
`super-admin-modalities-codex-20261007`.

- **Tenant states:** Finapop has Equity and Debt locally enabled/served; Loor
  has Equity served and Debt enabled but dependency pending; Nova Plataforma
  begins with both not configured. Enabling Nova's Equity produces dependency
  pending, not fabricated readiness.
- **Enable/disable:** Loor Equity disabled only after the explicit local
  confirmation. Focus began on Cancelar and returned to the toggle; Gateway
  summary also showed Desabilitada and enabled count 1. Re-enable restored count
  2. Gateway and bank rows and stored rule choices were unchanged. Confirmation
  copy explicitly excludes changes to existing Opportunities/investments/payments.
- **Rules:** edit → dirty → local save → readback/activity, and edit → dirty →
  discard → previous saved value passed. Only two labelled numeric-free concept
  controls exist; no global Save All. Saving is a simulation, not persistence.
- **Draft lifecycle:** detail-tab and page-tab switches retain the draft.
  Modality change, tenant change, sidebar navigation, browser Back and Forward
  each showed the unsaved dialog. Stay retained the draft; discard-and-continue
  changed selection and removed the old draft. Re-entry reconstructed the saved
  local value, not stale hidden edits.
- **Unload:** the browser emitted `Page.javascriptDialogOpening` of type
  `beforeunload`, then canceled it (`result=false`); the dirty value survived.
  This exercises the same listener used by tab close without closing the preview.
- **Search/filter:** empty search shows 0 of 2 with a useful adjustment prompt;
  pending filter isolates Debt in Loor. No fake pagination or counts.
- **Keyboard:** ArrowRight and End selected the expected detail tabs and moved
  focus. Rule selects are labelled; status meaning is textual. Disable dialog
  and mobile drawer closed with Escape and restored opener focus. Text-only
  Gateway dialog at 320×640 supports keyboard scrolling and focus return.
- **Responsive:** 1672×941, 1440×810, 1280×810, 900×810, 390×844, 320×640,
  1440×600 and 900×600 were independently captured and inspected. Final page
  scroll width equals client width at all eight sizes. Cards, description
  folding, list/detail, tabs, rule editor, dependency cards, sidebar and mobile
  confirmation remained usable; short-height content scrolls normally.
- **Motion/fallback:** reduced-motion media matched in runtime, with no active
  DOM animations; existing Dot Matrix code renders its fixed reduced-motion
  frame. Forced unavailable WebGL, via a temporary local runtime context stub,
  produced zero canvases and the CSS static fallback inside main only. Normal
  WebGL returned after reload. Media emulation/context stubbing were removed;
  no QA switch was added to source. The Dot Matrix implementation is unchanged.
- **Existing-screen regressions:** source review plus built-in-browser smoke
  checks covered Login, Dashboard, Whitelabels, Account Control, Settings,
  E-mails and Gateways. Login empty-form validation and password visibility
  still work. Settings' original status/dirty/discard cycle restores its prior
  copy. Equity and Debt email switches remain independent with their existing
  values and pending-contract wording. Tenant navigation and shared Finance
  enablement are consistent. No regression was found within these checks;
  Claude's earlier full scripts/pixel comparisons were not represented as
  fresh Codex runs.
- **Console/network:** no runtime errors; one expected Motion reduced-motion
  warning during emulation. A fresh bounded trace covering tenant change,
  enablement, rule save and Gateway navigation contained **zero requests**, no
  truncation. An older retained network sample had only local GETs but was
  truncated, so it is not treated as a complete session trace. Source review
  found no API/network/storage integration in the new feature.
- **axe limitation:** no fresh axe run. A scratch package fetch from the
  official registry/CDN failed TLS certificate validation; no certificate
  bypass or dependency installation was performed. Claude-reported axe results
  above remain separate historical evidence. The Gateway fix is validated by
  direct DOM/focus/scroll checks, not by an unexecuted axe claim.
- **Final automated checks:** `npm run typecheck`, `npm run lint`,
  `npm run build` and `git diff --check` pass. The existing >500kB bundle-size
  advisory remains; no new dependency or code-splitting scope was introduced.
- **Safety:** no real financial operation; no Opportunity, Investment, Pix,
  Payment, refund, balance, withdrawal, cashout or provider mutation. No push,
  deployment, Backend work or new OriginKit work.

## Canonical handoff impact after approved promotion — not edited here

Update the following existing files on the separate documentation branch only
after promotion:

- `docs/backend-handoff/README.md` — module index/frontend reference.
- `docs/backend-handoff/01-current-frontend-scope.md` — tenant route and boundaries.
- `docs/backend-handoff/07-whitelabel-finance-gateways.md` — shared enablement,
  count semantics and link to the new module.
- `docs/backend-handoff/open-questions.md` — modality/rule operational semantics.
- `docs/backend-handoff/audit-findings.md` — review outcomes and accessibility
  finding reconciliation.
- `docs/backend-handoff/matrices/backend-dependencies.md` — catalog, enablement,
  rules/defaults, dependency readiness and sanitized mutation results.
- `docs/backend-handoff/matrices/business-rules.md` — unresolved real rules,
  Sandbox, bank relationship and disabling impact, without promoting demo rules.
- `docs/backend-handoff/matrices/permissions.md` — conceptual permissions only.
- `docs/backend-handoff/matrices/audit-events.md` — future authoritative events,
  separate from the current session feed.

Add a dedicated `docs/backend-handoff/08-whitelabel-finance-modalities-rules.md`
chapter when the handoff is updated. Do not change earlier Login/Dashboard/
Account Control/Settings/Emails contracts merely to add this prototype.

**Review outcome:** technically ready for final user visual review. Promotion
remains subject to user approval. `dev`, `main` and the separate documentation
branch remain at their starting commits.

## Follow-up — Segmentos e usos dos recursos V1 (Claude, 2026-10-07)

This section supersedes the earlier statements that Segmentos e usos dos
recursos has no navigation entry, route or link. The rest of this record is
unchanged.

- Financeiro now lists a third entry, **Segmentos e usos dos recursos**
  (`#/whitelabels/:id/finance/segments-resource-uses`), one entry for both
  catalogs. This page passes it in `subNavHrefs` so the tenant is preserved.
- The *Sobre modalidades e regras* sentence no longer says the catalogs are
  "tratados em um bloco futuro". It now ends with a link, *Segmentos e usos dos
  recursos*, to the displayed tenant's catalog screen (`AboutModalities`
  receives `catalogsHref`; new `.aboutLink` style with a focus ring).
- **Taxonomy is unchanged:** modalities are still Equity and Debt only.
  "Capital de Giro" now appears in the built bundle, but only as illustrative
  Segment and Resource Use records of the catalog module, never as a modality,
  status, dependency or count. The catalog module imports nothing from the
  modality modules.
- The Modalidades flow check that asserted "no Segmentos entry" was replaced by
  a check that the single *Segmentos e usos dos recursos* entry links to the
  displayed tenant's route; all 58 checks pass.
- Record: [`whitelabel-finance-segments-resource-uses-v1.md`](whitelabel-finance-segments-resource-uses-v1.md).
