# Financeiro › Finance Core V1 — local implementation record

Investimentos, Pagamentos / PIX and Wallet, implemented by Claude and
independently reviewed/refined by Codex on 2026-10-08 on
`feature/super-admin-finance-core-v1`, from baseline
`400c1dceeafb47f7d8308af7f797f7b42aa30929`. Consolidated as one local
Finance Core review commit; not pushed or deployed. Codex evidence is separate
from the Claude-reported results below.
Module records: [Investimentos](finance-investments-v1.md) ·
[Pagamentos / PIX](finance-payments-pix-v1.md) · [Wallet](finance-wallet-v1.md).
Approved compositions (illustrative values only):
[`investments`](reference/super-admin-finance-core-investments-approved.png),
[`payments / PIX`](reference/super-admin-finance-core-payments-pix-approved.png),
[`wallet`](reference/super-admin-finance-core-wallet-approved.png).

## 1. Scope

A **frontend-only, read-only financial supervision prototype**: find → inspect
→ understand the explicit relationships → navigate to the responsible module.
No Backend, no financial API, no provider / bank / gateway call, no new
dependency, no OriginKit asset, no deployment, no change to authentication.

| Module | Routes | What it is |
| --- | --- | --- |
| Investimentos | `#/finance/investments` (optional `?investidor=:investorId` or `?wallet=:walletId` context), `#/finance/investments/:investmentId` | Investment records referencing Operation investors and opportunities. |
| Pagamentos / PIX | `#/finance/payments` (optional `?wallet=:walletId`), `#/finance/payments/:paymentId` | Payment records (PIX and illustrative non-PIX methods) referencing a configured gateway and, optionally, an investment. |
| Wallet | `#/finance/wallets`, `#/finance/wallets/:walletId` (optional `?movimento=:movementId`) | Wallets with a "Saldo representado" and their movements (inline detail, same route). |

All six routes are inside the existing session guard (`SHELL_VIEWS` in
`App.tsx`): without a session token they redirect to login exactly like every
other shell screen. Detail ids accept any path segment (safely URI-decoded) so
unknown or malformed ids reach the "não encontrado" state instead of login.

## 2. Navigation

Financeiro now lists, in this order: **Gateways e contas**, **Modalidades e
regras**, **Segmentos e usos dos recursos** (tenant-first, unchanged) and
**Investimentos**, **Pagamentos / PIX**, **Wallet** (global). The parent
*Financeiro* link and the tenant-first hrefs are unchanged; on tenant pages
the global entries keep their global routes. No "Dot Matrix" entry exists.

Six nested entries are taller than the four the shell was tuned for, so
`Sidebar.module.css` gained rules that apply **only when the active domain has
five or more entries**: the decorative "Mais controle…" lines hide at
≤ 1020px tall, rows tighten at ≤ 860px (full sidebar) and ≤ 650 / 580px (icon
rail). Result: every entry and both utilities are visible at 1672×941,
1440×900/860/768, 1280×800, 900×600 and 800×560; at 1440×600 the full sidebar
keeps its existing internal scroll (as the baseline already did with four
entries). No other shell change.

Other entry points now that the modules exist (the brief's "existing modules:
navigate normally" rule): Operação › Investidores *Ver investimentos* (domain
card and Investimentos tab) → `#/finance/investments?investidor=:id`; the
Dashboard *Pagamentos* KPI card and *Consultar Pagamentos* quick action →
`#/finance/payments`.

## 3. Architecture

```
src/features/finance-core/
  shared/financeCoreModel.ts     types, prototype state vocabularies, formatting, destination hrefs
  shared/prototypeFinanceCore.ts illustrative seeds (13 investments, 16 payments, 9 wallets, 20 movements)
  shared/financeCoreRecords.ts   frozen records + explicit-reference lookups (no inference, no computation)
  shared/financeCoreRefs.ts      read-only resolution of Operation investors and Gateways e contas gateways
  shared/financeCoreActivity.ts  "Atividade da sessão" store (in-memory, not audit)
  shared/FinanceCoreUi.tsx       Finance Core frame (shell + Dot Matrix), hero, key/value list, pills, tags, sort select
  shared/FinanceCore.module.css
  investments/  InvestmentsPage, InvestmentDetailPage, Investments.module.css
  payments/     PaymentsPage, PaymentDetailPage, Payments.module.css
  wallets/      WalletsPage, WalletDetailPage, Wallets.module.css
```

Reused, unchanged: the App Shell, `DotMatrixBackground` (main content only),
the Operation list/detail building blocks (`OperationUi`, `Operation.module.css`
— page intro, summary cards, filters, sort buttons, pagination, domain
navigation card, notes, session-activity card), `FinanceSections.module.css`
surfaces, `Tabs`, `StatusPill`, `ModalityChip`. One additive read-only hook was
added to `finance-gateways/financeStore.ts` (`useAllFinanceSettings`) so a
payment's gateway is resolved against the live configuration; nothing in
Gateways e contas was otherwise touched.

## 4. Domain models — four independent record types

```
Investment     { investmentId, investorId, opportunityId, whitelabelId, modality, amount, currency, status, paymentId?, createdAt?, updatedAt? }
Payment        { paymentId, whitelabelId, investmentId?, investorId?, opportunityId?, gatewayId, method, amount, currency, status,
                 externalReference?, pixReference?, pixChargeId?, createdAt?, updatedAt?, paidAt? }
Wallet         { walletId, whitelabelId, ownerReference?, currency, representedBalance, status, createdAt?, updatedAt? }
WalletMovement { movementId, walletId, direction, amount, currency, status, description, sourceType?, sourceId?, createdAt?, updatedAt? }
```

**INVESTMENT ≠ PAYMENT ≠ WALLET MOVEMENT ≠ WALLET BALANCE.** Each type has its
own status vocabulary and its own amount. No screen derives one from another:
an investment's status is never computed from its payment, a payment's status
never creates or completes a movement, a wallet's "Saldo representado" is a
static value and is **not** the sum of its movements (the seeds deliberately
disagree to make that visible). Arrays and top-level records are
`Object.freeze`d; this is not a recursive freeze of nested ownership metadata.
No Finance Core consumer writes these records or metadata.

### Prototype states (no transition graph, no action changes them)

| Record | States | Tone (text always present) |
| --- | --- | --- |
| Investimento | Pendente · Ativo · Encerrado | warning · success · muted |
| Pagamento | Pendente · Em processamento · Pago · Falhou | warning · neutral · success · danger |
| Wallet | Ativa · Bloqueada | success · danger |
| Movimentação | Pendente · Concluído · Falhou | warning · success · danger |
| Natureza | Crédito · Débito | arrow icon + text |

## 5. Relationships — explicit references only

| From | Field | To | Used for |
| --- | --- | --- | --- |
| Investment | `investorId` | Operação › Investidores (account prototype id) | name (read live), *Ver investidor* |
| Investment | `opportunityId` | Operação › Oportunidades | name (read live from the store), *Ver oportunidade* |
| Investment | `paymentId` | Payment | Pagamento column/tab, *Ver em Pagamentos / PIX* |
| Payment | `investmentId` | Investment | *Ver investimento*, Relações financeiras |
| Payment | `investorId`, `opportunityId` | Operation records | list columns, *Ver oportunidade* |
| Payment | `gatewayId` | Gateways e contas (seeded configs) | provider name, *Ver gateway* (tenant Gateways screen) |
| WalletMovement | `walletId` | Wallet | Movimentações |
| WalletMovement | `sourceType` + `sourceId` | Payment / Investment / Transfer / other | origin, reference links, Relações financeiras |
| Wallet | `ownerReference` | Operation investor, or an operational context (`OPR-…`) | *Ver titular* (investor) or a notice (context) |

Lookups follow ids only (`financeCoreRecords.ts`): an investment's movements
are those whose source is the investment **or** the payment the investment
references; a wallet's related investments are those referenced by a movement
**or** by a payment a movement references (each row says "Via movimento …" /
"Via pagamento …"). Nothing is inferred from "same investor", "same amount" or
"same Whitelabel".

The 13 investments use the same investor ↔ opportunity pairs as the
illustrative Operation associations (`operation/investors/prototypeInvestments.ts`),
so both screens tell the same story; they remain two separate data sets and
nothing synchronises them. Payments/wallet history exist only for investors
whose Accounts "Pagamentos e Wallet" dependency is "Histórico existente"
(Carla Mendes' investment has no payment and her wallet has no movement).

Brief reference chain: **INV-0001** (João Carvalho · Expansão Sul · Finapop ·
Debt · Ativo) → **PG-00045** (PIX · Pago · Provedor Alfa) → **MOV-0001**
(Crédito · Concluído · origem Pagamento PG-00045) in **WAL-0001**.

### Operation records are reused safely

Finance Core only **reads** the Opportunities store, the investor projections
and the Gateways configuration (verified by import audit: no create/update/
status function of another module is referenced). When an Operation
opportunity is renamed during the session the new name appears in Finance
(live reference); when its modality or Whitelabel changes, the investment keeps
its own value and the detail shows "Em Operação, a oportunidade está hoje como
… O investimento mantém o próprio registro — nada é sincronizado
automaticamente." (verified in the flow test).

## 6. Safety boundaries (absolute)

Not present anywhere in Finance Core: create / edit / delete of any record;
status change; confirm, settle, cancel, refund, reverse, chargeback,
reprocess; charge creation or PIX generation; amount edit; wallet credit /
debit, balance adjustment, movement create/edit, transfer execution, cashout,
withdrawal, deposit, reconciliation, block / unblock; bulk selection; any
network request (no `fetch`, no API client, no storage, no clipboard).

PIX: the tab shows only method, a fictitious charge id (`COB-…`), a fictitious
TxID-like reference (`TX-PIX-…`), the status (in V1 the PIX status **is** the
payment status), gateway and dates; expiration is not shown because no record
carries it. A dashed placeholder says **"QR Code não disponível no
protótipo."** There is no payload, EMV string, copy-and-paste code, PIX key,
scannable image or payment link (asserted by the flow test). Provider names
are the fictitious Gateways catalog ("Provedor Alfa/Beta"); no third-party
logo (gateway brands, PIX mark, flags) is reproduced — generic icons only.

Transfers: movements may reference `TRF-…`; every transfer affordance answers
"Módulo Financeiro › Transferências ainda não implementado. Nenhuma navegação
foi feita." and the Relações financeiras card is tagged "Módulo pendente".

## 7. Session activity

Each detail page has **Atividade da sessão** (in-memory, newest first,
1.5 s de-duplication), labelled "Somente ações locais desta sessão do
navegador. Não representa trilha de auditoria e nada é enviado ao Backend."
It records reads (record viewed, tab viewed, movement opened) and navigation
requests (including "sem destino" notices). The Auditoria domain is untouched.

## 8. Visual and responsive

The approved images define composition: summary cards, filter bar, table
columns, hero (monogram, "Tipo ID", status, context, two domain links), tabs,
label/value cards, domain navigation card, info note. Deliberate deviations:
no row checkboxes (no bulk actions), no "Itens por página" selector (shared
8-row pagination of the other modules), fictitious providers instead of real
brands, Whitelabel names as in the rest of the prototype, and states from the
brief (e.g. "Pago / Falhou" rather than "Liquidado / Aguardando PIX" seen in
the illustrative image). Dot Matrix stays behind the main content only.

Responsive (container queries on the list card): Investimentos hides
*Atualizado em* + *Whitelabel* ≤ 1260px, *Modalidade* ≤ 1100px, *Pagamento*
≤ 900px, investor/opportunity ≤ 740px, header row/amount/status ≤ 520px;
Pagamentos hides *Atualizado em* ≤ 1320px, Whitelabel/Gateway ≤ 1180px,
Oportunidade/Método ≤ 1000px, Investimento/Investidor ≤ 800px, header ≤ 520px;
Wallet hides *Atualizada em* ≤ 1100px, Whitelabel/Moeda ≤ 900px, Titular/
Movimentações ≤ 700px, header ≤ 520px. Hidden data moves under the record id;
an **Ordenar por** select (same sort state as the headers) appears once a
sortable column collapses, so every brief sort stays reachable at every width.

## 9. Claude-reported local QA (2026-10-08)

Built from the device baseline in a cloud copy; servers on 127.0.0.1 only.
Browser checks ran with a **test-harness session** injected into
`sessionStorage` by the QA scripts (scratchpad only — no authentication mock in
repository code); the login regression answered `POST /api/auth/login` from
Playwright, so no Backend was contacted.

| Check | Result |
| --- | --- |
| `tsc -b` | 0 errors |
| `oxlint` | 0 warnings, 0 errors |
| `vite build` | OK (pre-existing warnings only: >500 kB chunk, `api.ts` ineffective dynamic import) |
| Functional flow (lists, filters, search, sort, pagination, contexts, details, tabs, notices, not-found/invalid ids, Back/Forward, cross-module links, live Operation reference without sync, no mutation controls, no PIX payload) | 161/161 |
| Responsive sweep — 17 states × 1672×941, 1440×900, 1280×800, 900×900, 390×844, 320×700, 1440×600, 900×600 | 136/136, no horizontal overflow, no internal table scroll |
| axe-core (WCAG 2.0/2.1/2.2 A/AA + best practice) — 35 states × 4 widths | 0 violations (140 runs) |
| Keyboard (tab order, visible focus, tabs arrows/Home/End, notices, movement detail Enter/Space/Escape/focus return, drawer) | 24/24 |
| Dot Matrix — 6 routes × motion / no-WebGL / reduced motion | WebGL animating in main only; static fallback without WebGL; still frames with reduced motion; no console errors |
| Auth / session / logout (guard on 10 routes incl. all Finance Core routes, 401 message, login, reload, logout, Back after logout, revoked token) | 24/24 |
| Link crawl (all records × all tabs × movement details) | 91 unique hrefs, 0 broken |
| Taxonomy | Modality chips/filter only Equity/Debt; "Capital de Giro 2026" is an opportunity name (Debt); no "capital/giro" in Finance Core code |
| Console / network | 0 console errors; only local document/assets; 0 API requests |

Regressions against the untouched baseline build: pixel-identical Login,
Dashboard, Whitelabels, Contas, Configurações and E-mails; Gateways,
Modalidades and Segmentos differ only in the sidebar (three new entries, hidden
decorative lines) plus ±1 RGB anti-aliasing on 7 pixels; existing flows —
Gateways 72/72, Modalidades 58/58, E-mails 61/61, Configurações 67/67, Contas
110/110, Segmentos 60/61 (the one expectation "three Finance entries" now
intentionally six), Operation 120/120 and Operation keyboard 19/19 (one check
each updated from the old "Investimentos pending notice" to the new real
navigation), Operation taxonomy OK, differential smoke identical except the
Financeiro sidebar links.

## 10. Open questions (Product / Backend) — not answered here

These contract and Product questions remain open. The prototype does not
invent official financial rules to answer them.

1. Source of truth and contracts for investments, payments, wallets and
   movements (ids, fields, pagination, filtering, sorting, tenancy).
2. Official state models and transitions for each record type (the four
   vocabularies above are prototype states).
3. Cardinalities: investment ↔ payment (one, many, partial?), payment ↔
   movement, investor ↔ wallet, wallet ↔ Whitelabel.
4. Wallet ownership model (investor, entrepreneur, company, Whitelabel
   operation context) and whether `ownerReference` is authoritative.
5. Meaning and authority of the wallet balance (represented vs ledger vs
   available) — "Saldo representado" is a prototype representation only.
6. Whether a payment's PIX status differs from the payment status, and which
   PIX fields (charge id, TxID, end-to-end id, expiration) the Backend exposes.
7. Supported payment methods (PIX, Boleto, TED are illustrative) and gateways
   per Whitelabel / modality.
8. Relationship between the Operation investment associations and Finance
   investment records (single source, projection, or separate).
9. Transfers: module, model and relationship to movements.
10. Deep-link contracts (per gateway in Gateways e contas, per account in
    Contas, per transfer).
11. Permissions for viewing each module and following each link; whether reads
    are audited.
12. Currency support beyond BRL and amount precision / rounding rules.

## 11. Limitations

Illustrative data only; no persistence; session activity lost on reload;
gateway link opens the Whitelabel's Gateways screen (first gateway selected);
the investor context filter accepts any id (unknown ids show an empty list
with the id in the chip); pre-existing shell behaviour kept as is (with
reduced motion the mobile drawer does not move focus into itself — identical
on the baseline build); Operation detail pages still render hidden tab panels
as empty focusable grid items (pre-existing in `Operation.module.css`; Finance
Core panels add `[hidden] { display: none }` locally).

The inherited session guard checks only whether an access-token string is
present in `sessionStorage`. It does not prove token validity, expiration or
server-side revocation. Finance Core uses that guard unchanged; no real
authentication/Backend E2E is claimed by this frontend-only review.

## 12. Independent Codex technical and browser review (2026-10-08)

### Checkpoint and scope

Claude's uncommitted implementation was preserved. A fresh fetch and live
remote inspection confirmed `origin/dev` remained at `400c1dceeafb47f7d8308af7f797f7b42aa30929`,
`origin/main` at `c2235ac5d0d65408e9d39bf836a1a717da3d95ae`, and
`origin/docs/backend-handoff-v1` at `9f1f781785162bc509d96e953c5fefdd5bcbdb44`.
There was no newer dev to reconcile and no merge/rebase. All 33 scoped files
(16 Finance Core sources, 10 existing integration/doc files, four module
documents and three supplied reference images) were reviewed.

The Product Design audit/computer-use workflow was screenshot-first, used
only the Codex built-in browser and preserved the existing shell as the
visual authority. The existing localhost Vite process was reused. A clearly
local-only test session was injected into the temporary QA tab to inspect
guarded screens without calling authentication or any Backend. It was removed
after QA, together with the GPU probe, media and viewport overrides; the
temporary tab was closed. No test mocks were added to repository code.

### Findings and narrow refinements

| Finding | Before | Reviewed result |
| --- | --- | --- |
| P2 — combined Investment context chips | Removing Investor while Wallet remained left Investor in the URL; reload restored it. | Each removal serializes only the remaining context. Both directions, clear, reload and originating Investor Back navigation pass. |
| P2 — Wallet movement navigation | Returning from a movement query to the base Wallet route could retain its inline detail; opening rows did not update the reloadable selection. | Open/close use the existing hash router; removal of the query clears selection. Back/Forward, reload, Enter/Space, Escape and row-focus return pass. |
| P3 — 1280px Investment table | Collapsed column minimums produced approximately 1px of internal horizontal scroll. | ID minimum reduced from 190px to 188px in the existing collapsed-column breakpoint. Recheck: table and parent both 941px, no internal scroll. No composition redesign. |

Final lint flagged direct Wallet hash assignments. The same-document route
change now uses the existing `walletHref` helper with `location.assign`;
the focused open/Back/Forward/reload/close/focus sequence was rerun afterward.

Only three source files were refined by Codex: `InvestmentsPage.tsx`,
`Investments.module.css`, `WalletDetailPage.tsx`. These module-local documents
were reconciled too. Sidebar density, the read-only gateway hook and the
Dashboard/Investor links were retained after review. No shared design, state
model, authentication or Product rule was changed.

### Independent results (not Claude's harness counts)

| Check | Observed result |
| --- | --- |
| Flow health | Healthy within the read-only prototype boundary: global list → filter/sort → detail → explicit record/domain links → originating context. No executable financial transition. |
| Lists | 51 explicit browser assertions passed across filters, search, pagination, desktop/mobile sorting, contexts, links, keyboard and session checks, including four final Wallet navigation rechecks. Four summary cards per module remain record counts, not live metrics or financial totals. |
| Details | All 12 tabs across Investment, Payment and Wallet exercised; one visible Finance tab panel at a time. Explicit chain INV-0001 → PG-00045 → MOV-0001 / WAL-0001 reconciled. Missing-payment Investment INV-0007 and non-PIX/no-Investment Payment PG-00042 show safe empty states. |
| Route safety | Malformed/unknown Investment, Payment and Wallet IDs produce not-found inside the shell. Unknown Investor/Wallet query contexts produce empty lists. Unknown or foreign Wallet movement IDs show a notice with no wrong movement opened. Missing related IDs also have guarded source paths; no synthetic unknown records were injected. |
| Responsive | Six list/detail scenes × 1672×941, 1440×810, 1280×810, 900×900, 390×844, 320×700, 1440×600, 900×600 = 48 captures/DOM measurements, no page horizontal overflow. The 1280 table was rechecked after its 2px minimum-width fix. Collapsed data remains inline and every sort key remains selectable on mobile. |
| Navigation | Finance has exactly six destinations; active states, compact rail and mobile drawer pass. At 1440×600 and small mobile heights, utilities require sidebar scroll and remain keyboard-reachable. Denser rows are scoped to a domain with at least five children; existing shell structure is unchanged. No Dot Matrix navigation item. |
| Keyboard/accessibility | Labels, textual statuses, visible focus, tab arrows/Home/End, mobile focus containment, record Enter navigation and movement Space/Enter/Escape/focus return checked. The 320px movement detail remains readable and scrollable. No independent axe run: axe was not available in the existing local setup; no dependency installed, and no WCAG certification claimed. |
| Dot Matrix | Existing shared implementation unchanged, canvases inside main only. A temporary uniform probe observed increasing shader time in normal motion and zero further time updates in reduced motion. Context-loss/unavailable-context diagnostic rendered the static CSS fallback on all six routes; original WebGL behavior restored afterward. |
| Session | All six routes redirect to Login without a token; reload, logout, Back after logout and clearing the local token before navigation pass. A nonempty invalid test token still opens the shell: inherited presence-only guard, not a new Finance defect. Server-side invalid/revoked-token behavior is unverified and outside this no-Backend review. |
| Regressions | Representative entry points captured for Dashboard, Whitelabels, Accounts, Settings, E-mails, Gateways, Modalities, catalogs and all three Operation lists. Accounts type tabs and Gateway/Modality read tabs exercised. Login empty-field validation/password-toggle preserved without a login request. No introduced regression observed; not a claim of an independent exhaustive/pixel-identical baseline comparison. |
| Console/network | No browser console warnings/errors captured. Earlier long-run network buffering was truncated (remaining events were local assets/data images, no failing status); a fresh bounded six-route + PIX-tab smoke had complete capture, zero requests and no truncation. Source audit found no business/financial API or provider call in Finance Core. |
| Final commands | TypeScript, oxlint, production Vite build and diff checks pass. Existing >500kB bundle and ineffective dynamic-import advisories remain non-blocking. |

Independent screenshots and assertion/viewport JSON are local scratch evidence
in `C:/Users/User/AppData/Local/Temp/finance-core-codex-20261008`, not committed
test artifacts. Representative captures: `final-payments-pix-1440.jpg`,
`investments-1280x810-final.jpg`, `mobile-finance-drawer-390.jpg`,
`movement-keyboard-320-final.jpg`, and `regression-*-1440.jpg`.

### Inherited findings and release boundary

- Operation inactive tab panels still compute to `display: grid` with
  `tabindex=0`; baseline source has the same issue. Finance Core explicitly
  hides its own panels.
- With reduced motion, the inherited mobile drawer can open without moving
  focus into it. Normal-motion entry, Escape return and tab containment pass.
  `AppShell.tsx` is unchanged from the baseline; no broad fix was made.
- Token-presence-only authentication is a pre-existing security/integration
  limitation, not validated real authorization. This commit is technically
  ready for **prototype user review**, not a production financial release.

The four record domains remain distinct and read-only. No automatic
financial synchronization, represented-balance calculation, payable PIX,
payment/refund/transfer/cashout execution, financial mutation, new dependency,
new OriginKit integration, Backend work, push or deployment occurred.

After user approval and separate dev promotion, the future canonical handoff
should add these read-only modules, six routes, four independent models,
explicit relationship contracts and the open Product/Backend questions in
section 10. `docs/backend-handoff/` was deliberately untouched in this review.
