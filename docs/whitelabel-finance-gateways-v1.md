# Finance / Gateways V1 — local implementation record

Implemented by Claude on 2026-10-07 on the local working tree of
`feature/super-admin-finance-gateways-v1` (HEAD
`5f438035dbac1ec49df68fc3d9799c3fb5078c4a`). Left uncommitted for Codex review.
Status: frontend prototype. **It is not connected to the Backend, makes no
request to any payment provider or bank, and performs no financial operation.**

This file records what the frontend does. It is not an API, security,
persistence, banking or audit specification. The canonical Backend handoff
stays on its own documentation branch, and `docs/backend-handoff/` was not
edited. The approved image sets the visual direction only:
[`reference/super-admin-whitelabel-finance-gateways-approved.png`](reference/super-admin-whitelabel-finance-gateways-approved.png).
Provider names, the real bank, counts, sort/bulk controls, copy buttons and
the "Histórico" tab in that image were deliberately not reproduced (see
*Intentionally not reproduced*).

## Route and navigation

- **Route:** `#/whitelabels/:whitelabelId/finance/gateways`. It is parsed in
  `App.tsx` (`FINANCE_GATEWAYS_PATH`) before the login fallback.
  - View: `finance`.
  - Title: `Super Admin · Financeiro / Gateways`.
  - Dark shell background: `html[data-view='finance']`.
  - An unknown ID shows a "Whitelabel não encontrado" state with a link back to
    Whitelabels.
- **Navigation:** the top-level **Financeiro** module owns the screen; no
  parallel Financeiro model was created.
  - Financeiro became a link and, while active, lists one nested screen:
    **Gateways e contas** (`finance-gateways`).
  - The parent is `aria-current="true"` and the nested entry is
    `aria-current="page"`, following the Plataformas pattern.
  - No other top-level module was renamed, removed or reordered.
- **Sidebar change:** `Sidebar.tsx` now resolves the parent link through
  `subNavHrefs[item.id] ?? item.href`. This keeps the Finance page's parent
  link on the displayed tenant. No other page passes a parent ID, so other
  pages behave exactly as before (checked by the pixel comparison below).
- **Default destination:** from non-Finance pages, Financeiro links to the
  first illustrative tenant (`wl_proto_01`), because there is no tenant-less
  Finance overview yet. A Plataformas page for another tenant does not carry its
  tenant into Financeiro (see *Items for Codex review*).

## Structure (`src/features/finance-gateways/`)

- **`FinanceGatewaysPage.tsx`** contains:
  - the AppShell, the shared Dot Matrix (main area only), the context row (back
    link, scope sentence, reused `WhitelabelContextSelector`);
  - `DetailTransition` keyed by Whitelabel plus `draftReset`;
  - the shared `useUnsavedChangesGuard`, plus a second guard for switching
    gateway while the selected one has drafts;
  - local selection, search and status filter state, and the bank and new
    gateway dialogs.
- **`sections/SummaryCards.tsx`:** four counts taken only from the local
  prototype state (gateways configured, active bank accounts, enabled
  modalities, local pending items). A note says these are not production data.
- **`sections/GatewayList.tsx`:** search by provider, status filter, and a
  table with caption (Provedor / Papel / Ambiente / Status / Credenciais).
  Clicking a row selects it and drives the detail panel. There are no
  checkboxes, bulk actions, sort controls or row menus.
- **`sections/GatewayDetail.tsx`:** header plus four tabs: Visão geral /
  Credenciais / Dependências / Atividade da sessão. Every panel stays mounted
  (`hidden`), so a draft survives switching tabs. It also holds the simulated
  connection validation and Activate / Deactivate.
- **`sections/GatewayPanels.tsx`:**
  - `GatewayOverview`: role and environment editor.
  - `GatewayCredentials`: write-only credentials.
  - `GatewayDependencies`: modalities served and the linked bank account.
  - `GatewayActivity`: session-only feed.
- **`sections/BankAccounts.tsx`:** "Contas bancárias do Whitelabel", a masked
  table with edit / deactivate-reactivate / remove buttons and a short
  session-only "Atividade local recente".
- **`sections/SideSummary.tsx`:** the modalities summary (read-only) and quick
  actions.
- **`dialogs/`:**
  - Validate connection.
  - Deactivate gateway.
  - New gateway (provider / role / environment).
  - Bank account form (create / edit, with discard confirmation).
  - Bank deactivate / remove confirmation.
- **`financeModel.ts`:** types, vocabularies, derived states and validation.
- **`prototypeFinance.ts`:** illustrative per-tenant data.
- **`financeStore.ts`:** in-memory session store and activity feed
  (`useSyncExternalStore`). It survives in-app navigation but not a reload.

Reused without changing their behaviour: `SettingsSection`,
`useSectionEditor`, `UnsavedChangesDialog`, `Dialog`, `Tabs`, `StatusPill`,
`IconTile`, `EmptyState`, `WhitelabelContextSelector`, `DetailTransition` and
`DotMatrixBackground`. `settingsModel.ts` gained one additive section status,
`incomplete` (label "Incompleto", warning tone), used by the Finance sections.

## Illustrative data

| Whitelabel | Gateways | Bank accounts | Modalities |
| --- | --- | --- | --- |
| Finapop (`wl_proto_01`) | Provedor Alfa: principal, produção, active, 4/4 credentials, serves Equity + Debt, linked account. Provedor Beta: secundário, sandbox, active, 2/4 credentials, serves Debt. Provedor Gama: contingência, produção, inactive, 4/4 credentials | Banco Exemplo, active, random Pix key (masked) | Equity enabled, Debt enabled |
| Loor (`wl_proto_02`) | Provedor Alfa: principal, sandbox, 3/4 credentials, Equity only | Banco Demonstração, inactive, e-mail Pix (masked) | Equity and Debt enabled, so Debt shows **Dependência pendente** |
| Nova Plataforma (`wl_proto_03`) | none (empty state) | none (empty state) | Equity / Debt not configured |

- Providers ("Provedor Alfa/Beta/Gama/Delta") and banks (codes 901–903,
  "Banco Exemplo", "Banco Demonstração", "Cooperativa Exemplo") are fictitious.
  The real supported catalog is a Backend/Product decision.
- No real provider or bank name appears in the page (checked in the flow).

### Product taxonomy correction

Capital de Giro is **not a financial modality**. It is a valid example in
both the independent **Segment** and **Resource Use / Usos dos Recursos**
catalogs. Each catalog will have its own insert, list/consult, update and
delete scope; neither CRUD is implemented here. Current modalities are only
Equity and Debt; adding any other modality requires explicit Product scope.

The model and all three tenant seeds now contain only Equity and Debt. The
summary cards, readiness states, gateway dependency controls and session
descriptions derive from that same catalog; the denominator is two, with no
replacement third item. The unused planned-modality state was also removed.

The retained historical layout reference
`docs/reference/super-admin-whitelabel-finance-gateways-approved.png` shows
an obsolete third modality and count. That taxonomy is not authoritative
and is not reproduced. The obsolete Modalidades e Regras image is not an
implementation specification; no such page or catalog navigation was added.

Canonical handoff correction is deferred to `docs/backend-handoff-v1`:

- `docs/backend-handoff/07-whitelabel-finance-gateways.md`, Modalities summary.
- `docs/backend-handoff/open-questions.md`, Q-GM-01.

Those canonical files were inspected read-only and are not edited in this
frontend correction.

### Taxonomy audit and correction validation — 2026-10-07

Baseline: `dev@6b46d570262dc5f6a66737bd88eb1cedb7b6a8d9`.
Correction branch: `fix/capital-de-giro-taxonomy`.
Search covered the full frontend source, navigation, typed catalogs, seeds,
derived modality consumers and frontend/reference documentation. Canonical
handoff was searched separately at
`origin/docs/backend-handoff-v1@7b0e75520469274fc954a4234113d004664cd869`.

Occurrence classification (locations refer to the pre-correction baseline):

- **A — incorrect modality:** ten source/text occurrences in
  `financeModel.ts` (lines 161, 169), `prototypeFinance.ts` (71, 102, 108),
  `README.md` (486), and this note (95, 97, 126, 347). All corrected; the
  associated unused `planned` setting/display metadata was removed too.
- **B — correct Segment / C — correct Resource Use:** no existing catalog
  occurrence before the correction. The Product rule is now stated in this
  note and README for both independent future catalogs, without adding code,
  CRUD, a new page or navigation.
- **D — historical reference:** the retained Finance/Gateways image named
  above contains an obsolete Capital de Giro card and three-item count.
  It is preserved only as layout history, not current taxonomy guidance.
- **E — canonical handoff requiring later correction:** exactly the two
  paths named above (Finance summary and Q-GM-01). The canonical README,
  current scope, dependency/business-rule/permission/audit-event matrices
  and other handoff files contain no additional Capital de Giro association.

Validation of the corrected frontend:

- `npm run typecheck`, `npm run lint`, `npm run build`, and
  `git diff --check` passed. Only the existing >500 kB bundle advisory remains.
- Focused Node assertions passed: only Equity/Debt in the catalog and all
  tenant seeds; no planned state; readiness and counts match each tenant;
  disabling all gateways produces pending dependencies for both modalities.
- Built-in-browser readback: Finapop **2/2** enabled, **1** local pending;
  Loor **1/2** enabled, Debt pending, **2** local pending; Nova Plataforma
  **0/2**, both unconfigured, **0** local pending.
- Selected-gateway dependency read view and editor show only Equity/Debt;
  Tab moves from Equity to Debt. The untouched draft was cancelled, not saved.
- Finance visual checks passed at 1672 × 941, 1440 × 810, 1280 × 810,
  900 × 810, 390 × 844 and 320 × 844. No horizontal page overflow; two cards
  fill the existing adaptive grid and stack at 320 px. No CSS redesign.
- Browser smoke review passed for Login, Dashboard, Whitelabels/detail,
  Account Control, Settings, E-mails and Finance/Gateways. E-mail Equity/Debt
  switches remain independent, with their seed states unchanged.
- No browser console errors/warnings observed. Captured network requests
  were local GET assets only, with no XHR/Fetch or non-GET request. That
  navigation sample's older events were evicted; a separate complete capture
  of dependency-tab/editor/cancel interactions recorded **zero requests**.
  Source inspection also found no API transport in the Finance module.
- No Backend use, financial action, new dependency, canonical handoff edit,
  Segment/Resource Use CRUD or Modalidades e Regras screen was introduced.
  Login, Dashboard, shared shell and other feature source files are unchanged.

## States and local rules

- **Gateway status:**
  - Derived from credentials: 4/4 → Configurado; 0 → Não configurado;
    otherwise Em configuração.
  - Any gateway with `active=false` is **Inativo**.
  - While the selected gateway has an unsaved draft, its row also shows
    **Alterado localmente**, and the edited section shows the same badge.
  - "Integração: **Aguardando integração**" is always shown, because no
    provider state is real.
- **Overview edit:**
  - Role (Principal / Secundário / Contingência) and environment
    (Sandbox / Produção).
  - Local rule: only one principal gateway per Whitelabel (inline error, focus
    moves to the field).
  - Switching to Produção with incomplete credentials shows a warning but
    does not block the save.
- **Dependencies:**
  - Checkboxes for the modalities the gateway would serve.
  - An optional link to one of the tenant's bank accounts. Inactive accounts
    are labelled as such.
- **Modalities summary:**
  - Equity and Debt states: Habilitada / Não configurada / Dependência pendente.
  - **Dependência pendente** means the tenant enabled the modality but no
    *active* gateway serves it.
  - There is no editor. A note says these are prototype states, not Backend
    flags; per-modality rules belong to a future module.
- **Pendências locais:** count active gateways without complete credentials,
  plus modalities with a pending dependency.

## Credential and secret handling

- **The model never holds a credential value.** Each credential stores only
  `{ configured: boolean, hint?: string }`. Prototype seeds contain no secret
  strings.
- **Read view:** a fixed mask (`••••••••`) plus "Configurada" / "Não
  configurada".
  - Identifiers (client ID, account ID) may show their last 4 characters,
    taken once at save time.
  - Secrets (API key, webhook secret) never show a hint.
  - The read view has no inputs and no reveal (eye) or copy controls.
- **Edit form:**
  - Fields are always empty. Configured ones say "Deixe em branco para manter".
  - Secrets use `type="password"` with `autocomplete="new-password"`;
    identifiers use `autocomplete="off"`. `spellCheck` is off.
  - Validation rejects spaces and short values (secrets ≥ 12 characters,
    identifiers ≥ 4). It runs only on values typed now.
- **Lifecycle of a typed value:**
  - It exists only in the section's edit draft.
  - On save, the draft becomes `{configured: true, hint?}`.
  - On save or discard, the draft is cleared.
  - It never reaches the store, notices, the activity feed (which lists field
    *labels* only) or `console`.
- **Flow checks:** a typed secret is not present in the DOM after save, and
  not in console messages.
- **No storage claim:** the UI says nothing about encrypted Backend storage.
  How secrets are stored, rotated and read back (sanitized) is listed below as
  a Backend dependency.

## Connection validation (simulated)

- Validar conexão → confirmation dialog ("Nenhuma requisição real é feita ao
  provedor…") → about 1.4 s loading state ("Validando…", `aria-disabled`, live
  status) → simulated result.
- **Result rule:**
  - Missing credentials → failure listing the missing *labels*.
  - Otherwise → "Configuração local consistente."
  - The result always ends with "Integração real: aguardando Backend."
- The result and its time are stored in session state and logged to session
  activity.
- The flow verified that **no network request is made** while validating.

## Activate / Deactivate

- **Ativar** is local and immediate. Its notice says: "…O impacto operacional
  depende das regras do Backend."
- **Desativar** requires confirmation. The dialog warns: "Este protótipo
  altera apenas o estado local da configuração. O impacto operacional
  (cobranças, recebimentos ou operações em andamento) depende das regras do
  Backend. Nenhum valor, pagamento ou investimento é alterado." When the
  gateway is the principal, it says so. Focus returns to the toggle.
- **Effects:** both update the derived statuses (gateway, modalities, summary)
  and session activity. No money movement, payment or provider call exists.

## Bank accounts

- **Ownership:** the Whitelabel-level grouping is a **prototype premise, not
  authoritative**. The form says so ("Titularidade no nível do Whitelabel é
  uma premissa do protótipo"). Whether accounts belong to the Whitelabel, a
  legal entity, an Opportunity or a payout setting is open.
- **Fields:**
  - Bank (fictitious list), agency (4 digits), account number (4–12 digits)
    plus check digit.
  - Type (corrente / pagamento / poupança).
  - Holder (required, ≤ 80 characters).
  - Optional Pix key type plus key.
- **Masking:**
  - Only the last 4 account digits plus the check digit are stored, shown as
    `•••• 4821-0`.
  - The Pix key is reduced once to a masked hint (e-mail `f•••@domínio`,
    CNPJ / phone / random partially masked).
  - The full number and full key are never kept, displayed or logged.
- **Editing:**
  - Number and Pix key are write-only. The fields are empty, and placeholders
    show the current masked value. Leaving them empty keeps the current value.
  - Changing the Pix type requires a new key.
- **Desativar / Reativar / Remover:**
  - Local only, with confirmation for deactivate and remove.
  - Removing an account also clears gateway links to it.
  - Closing a dirty form asks for confirmation.
- **Not available:** no balance, statement, verification, micro-deposit or
  payout behaviour.

## Unsaved changes

- **Tracked drafts:** `gateway-config`, `gateway-credentials`,
  `gateway-dependencies`, `gateway-new` and `bank-form`.
- **Shared guard:** the page-level `useUnsavedChangesGuard` protects sidebar
  and other links, browser Back/Forward, reload (`beforeunload`) and the
  Whitelabel selector.
  - *Descartar e continuar* clears every draft through the `draftReset` key.
- **Gateway switch:** selecting another gateway while the selected one has
  drafts opens the same `UnsavedChangesDialog` ("selecionar outro gateway").
  *Continuar editando* keeps the draft.
- There is no global "Salvar tudo". Each section saves on its own.

## Session activity

- Per gateway, the "Atividade da sessão" tab shows the local actions of this
  browser session: overview or dependency saves, credentials updated (labels
  only), simulated validations, and activation/deactivation, with local times.
- Bank actions appear in "Atividade local recente (sessão)".
- Both say they are not an audit trail. Nothing is invented: a fresh session
  shows an empty state.

## Responsive behaviour

| Width | Layout |
| --- | --- |
| ≥ 1360px | Context row (scope text + tenant card), four summary cards, gateway list beside the selected-gateway panel (`minmax(460px, 42%)`), then bank accounts beside modalities + quick actions. |
| 768–1359px | Single column: list, detail, banks, modalities, quick actions. Summary cards 2 × 2 below 1200px. |
| < 768px | Drawer navigation. Context card stacks; summary cards one per row below 480px; table columns collapse by container width; dialogs stack fields. |

- **Gateway list:** container queries hide Papel / Ambiente (≤ 660px, still
  shown under the name), then Credenciais (≤ 520px), then the Status column and
  header (≤ 460px, status moves under the name).
- **Bank table:** holder and type move under the bank name at ≤ 700px. At
  ≤ 520px, Pix and status also move inline.
- **Detail tabs:** stay on one row down to the 1360px two-column layout, then
  become a 2 × 2 grid in phone-width panels (no clipped or orphaned tab at
  320px).

## Claude-reported local QA (2026-10-07)

All runs used a local `vite build` of this working tree served on 127.0.0.1,
with Playwright (Chromium) scripts kept in the session scratchpad (not added to
the repo). axe-core 4.x was a scratch copy, not a project dependency.

- **TypeScript / lint / build:** `tsc -b` exited 0 with no output.
  `npm run lint` (oxlint) and `oxlint --deny-warnings` both exited 0 with no
  findings. `vite build` passed; it shows the same bundle-size advisory as the
  baseline build.
- **Interaction flow, 72/72 checks.** Covered:
  - navigation, titles and current markers; preserved top-level modules;
  - search and filter; selection driving the detail;
  - overview validation and save, production warning;
  - write-only credentials (empty password inputs, no reveal control,
    validation, never rendered or logged, hint only for identifiers);
  - session activity without secrets;
  - gateway-switch guard;
  - validation dialog, loading, success and failure, with no request;
  - deactivate and activate; modality Dependência pendente; new gateway rules;
  - bank create (masked), edit (write-only number kept), discard confirmation,
    deactivate, reactivate, remove;
  - guards on tenant switch, sidebar link and Back;
  - no console errors and no external requests.
- **axe** (WCAG 2.0/2.1/2.2 A/AA plus best-practice), **0 violations in 23
  states:**
  - 1440px: view, overview edit, credentials view, credentials edit with
    error, dependencies edit, gateway-switch guard, validate dialog,
    validating, result, activity tab, deactivate dialog, new gateway with
    errors, bank form with errors, bank discard confirmation, bank remove
    confirmation, open context selector, tenant-switch unsaved dialog;
  - plus Finapop at 390 and 320 (with the bank dialog at 320), Loor at 1440,
    Nova Plataforma at 390, and the not-found state.
  - One `heading-order` finding (summary-card `h3` without an `h2`) was fixed
    by adding a visually hidden `h2`.
- **Keyboard:**
  - The tab walk follows reading order, through the list rows, the selected
    tab only (roving tabindex), the actions, the bank row buttons and the
    quick actions.
  - Arrow and End keys move between tabs.
  - Escape closes dialogs and focus returns to the trigger.
- **Responsive:** 1672 / 1440 / 1280 / 900 / 390 / 320 for all three tenants.
  No horizontal page scroll; the only out-of-viewport boxes are clipped
  decorative SVG and the closed mobile drawer, as on other screens. No console
  errors.
- **Short heights:** 1440×600 and 900×600. Content does not clip.
  - At 1440×600 the sidebar scrolls, as it does on every shell page (Finance:
    700px of content; E-mails / Whitelabels: 808px).
  - The bank dialog body scrolls with the footer actions visible.
- **Dot Matrix:**
  - Rendered only inside `main`.
  - With WebGL: canvas present.
  - With `--disable-webgl --disable-3d-apis`: no canvas, static background,
    no errors.
  - Reduced motion: still frame, no fade on tenant switch.
- **Regressions:**
  - **Pixel comparison** (WebGL off, reduced motion) of the baseline build
    against this build: 36 comparisons, viewport and full-page, for Login,
    Dashboard, Whitelabels, Account Control, Settings and E-mails at
    1440 / 1672 / 1280 / 390. All identical.
  - Settings flow 67/67; E-mails flow 61/61; Account Control interaction
    script 110 checks, 0 failures.
  - A differential smoke test (Login, Dashboard, Plataformas → Whitelabels
    search, Contas, Settings, E-mails, unknown route) shows one difference
    only: the Financeiro sidebar entry is now a link.
  - The older Dashboard and Whitelabels interaction scripts from earlier phases
    fail identically on the baseline build (they predate later changes), so
    they were not used as evidence.

## Known Backend / Product dependencies

1. **Provider catalog:** which providers, environments and credential schemas
   per provider (field names, which are secret, formats).
2. **Configuration ownership:** per Whitelabel, per legal entity or per
   Opportunity. Rules for principal / secondary / contingency.
3. **Secret storage:** encrypted at rest, key management, rotation, and who
   can write.
4. **Write-only update contract:** omitted field = keep; explicit clear;
   partial updates.
5. **Sanitized reads:** `configured` plus an optional non-secret hint. A
   secret value is never returned.
6. **Activation semantics:** what "active" changes operationally (routing,
   failover, in-flight operations), and preconditions such as complete
   credentials or a validation.
7. **Connection test contract:** endpoint, timeout, sanitized error taxonomy,
   rate limits, and whether results are stored.
8. **Bank account ownership and verification:** which entity owns accounts,
   holder rules, verification, Pix key ownership checks.
9. **Relationships:** Whitelabel ↔ bank account ↔ Opportunity, and payout
   semantics (out of scope here).
10. **Modality flags:** the authoritative Equity / Debt
    enablement per tenant, and which gateways may serve each.
11. **RBAC:** permissions for viewing, editing configuration, writing secrets,
    activating, validating and managing bank accounts. Suggested labels for
    discussion only: `GATEWAY_VIEW`, `GATEWAY_EDIT`, `GATEWAY_SECRET_WRITE`,
    `GATEWAY_ACTIVATE`, `GATEWAY_TEST`, `BANK_ACCOUNT_VIEW`,
    `BANK_ACCOUNT_EDIT`, `BANK_ACCOUNT_DEACTIVATE`.
12. **Durable audit:** actor, time, tenant, change summary without secret
    values. The session activity here is not that.
13. **Error presentation:** sanitized provider and bank errors safe to show
    to Super Admins.

## Explicitly not implemented

Wallet balance, credit/debit, investments, payment state, Pix charge
generation, refunds, cashout, withdrawals, transfers, reconciliation, payout
scheduling, statements, any financial mutation, real provider or bank
requests, persistence, a detailed modality/rules editor, audit, RBAC, and
bulk operations.

## Intentionally not reproduced from the approved image

- Real provider and bank names (Asaas, BCodex, Crenor/ONZ, Banco do Brasil)
  and their logos.
- Fabricated counts ("2 / 1 / 3 / 2"), row checkboxes, sort arrows, "⋯"
  menus.
- Copy buttons and the "Segredos nunca são exibidos por completo" eye icon
  (no secret is ever partially exposed).
- The "Histórico" tab (replaced by "Atividade da sessão"; no fake history).
- "Ver auditoria" / "Regras financeiras" as working destinations (notices
  instead).
- The image's sidebar (the existing shell is authoritative).

## Items for Codex review

- `Sidebar.tsx` parent-href resolution (`subNavHrefs[item.id]`) is shared. The
  tenant-scoped Accounts, Settings and E-mails pages now pass `financeiro`, so
  navigation to Finance preserves the selected Whitelabel.
- The additive `incomplete` status in `settingsModel.ts` is retained as a
  reusable presentation status; it does not define a Backend state.
- The single-principal rule and the production warning remain local prototype
  assumptions and are now identified as such in the UI.
- Pix masking formats and bank validation ranges, which are illustrative.
- Whether "Dependência pendente" should consider sandbox gateways as serving
  a modality remains a Product/Backend decision. The UI now states explicitly
  that this prototype counts any active local gateway, including Sandbox.
- The tab labels "Dependências" (the brief offered "Regras/Dependências") and
  "Atividade da sessão".
