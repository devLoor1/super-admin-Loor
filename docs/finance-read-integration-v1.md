# Finance Read Integration V1

Real-data unit for **Financeiro › Investimentos**, **Pagamentos / PIX** and
**Wallet**, implemented by Cloud from `dev` `874ff93` for Codex review
(reviewed locally). The three screens now read the Nest Control Plane instead of the
illustrative Finance Core records. The integration is **read-only**: no
investment, payment, wallet, movement, balance or provider write exists or can
be sent.

Out of scope and unchanged: Gateways e contas, Modalidades e regras and
Segmentos e usos dos recursos (still prototypes, not reclassified as
authoritative), Opportunities and Companies (no Backend integration in this
unit), and every Backend / Core / database / Netlify configuration.

## Final Investor gate and local commit disposition — 2026-10-18

**LIVE INVESTOR DESTINATION GATE PASSED.** The completed independent Finance
review and its corrections are preserved. The user authorized exactly one
reviewed local feature commit after the final checks below, not push,
promotion or deployment.

- Fetched live refs again: dev `874ff9320fadc4e6a081fda9dd50359bcdfd4f89`,
  main `c2235ac5d0d65408e9d39bf836a1a717da3d95ae`, handoff
  `89a3b5058f52f981b3a1b06756d7f33a2a043f27`. Feature branch remains
  `feature/finance-read-integration-v1`, from that exact dev baseline. All 31
  delivered paths and the prior movement-status correction were retained;
  no Cloud patch was reapplied and no production code changed in this final
  verification. Canonical dev remains clean.
- Reused the preserved authenticated built-in homolog tab. The served bundle
  is `/assets/index-DeV9AQWi.js`, unchanged across reload. This identifies the
  build under test, not an independently exposed deployment-commit mapping.
  The local Finance candidate is **not deployed**. `GET /api/auth/me` returned
  200 in 1,127 ms with SUPER_ADMIN; session validation after reload also returned
  200 (1,350 ms). No credential, token or customer identity field was recorded.
- Used the numeric Investor ID retained from the previous authoritative
  Investment GET, not a name, illustrative ID or substitute. The targeted
  `GET /api/investors/:id` returned **200 in 1,468 ms**; returned Investor ID and
  Whitelabel ID both matched the retained Finance relationship. Safe request
  correlation ID: `422532cf-3da5-4dac-832a-a13ae074eb12`.
- Opened `#/operation/investors/:id`. The UI reached `loaded`, its displayed
  Control Plane ID matched the requested Investor, and the route matched.
  Its Investor GET returned **200 in 1,082 ms**; the expected supplementary
  `GET /api/whitelabels/:id` returned **200 in 1,200 ms**. No missing dependency,
  prototype fallback, wrong route prefix or stale unrelated record appeared.
- Reload passed with the same matching Investor: Investor GET **200 / 1,133
  ms**, Whitelabel GET **200 / 975 ms**. Browser Back returned to Dashboard
  (GET 200); Forward loaded the same Investor again (**200 / 1,610 ms**,
  Whitelabel **200 / 964 ms**). No new console warning/error, failed API request,
  timeout, redirect loop, 401 or 502 appeared during this controlled sequence.
  No recovery retry was needed.
- **Historical root-cause limit:** the earlier 20,021 ms timeout and 1,554 ms
  HTTP 502 did not recur. A client timeout and a received 502 were observed;
  neither alone proves which Backend/Core/proxy layer failed. Recovery of the
  unchanged destination and all its required GETs supports a transient service
  availability explanation, but the precise earlier cause remains unknown
  without correlated server logs. No Finance or Investor defect was reproduced,
  and no Backend/Core change or extra failure-reproduction load was attempted.
- **Proof boundaries:** synthetic tests validate the new Finance-origin link;
  the retained live Finance relationship and existing deployed Investor UI
  validate the destination. These are not one deployed-candidate Finance E2E.
  The full deployed Finance UI-to-live-API E2E and real non-SUPER_ADMIN role
  sessions remain part of a separately authorized promotion cycle.
- Existing evidence remains valid: eight live Finance GET families and scoped
  checks passed; 307 synthetic browser assertion executions; six-width loaded
  and state matrices; scoped accessibility; races, failures and cross-module
  regressions. No entire browser matrix or Finance enumeration was repeated.
- Safety remains unchanged: **zero financial or other business mutations**;
  no Whitelabel mutation or Menu Visibility PUT; their production final Save
  controls remain disabled. Finance has GET-only transport, no raw document
  fallback, no production fixture import and no browser financial persistence.
  No dependencies, Backend/Core, main/dev/handoff or Netlify changes.

Final TypeScript, oxlint, production build and all 14 canonical suites passed
again (Finance **164**). The existing non-blocking >500 kB build advisory is
unchanged. The regenerated candidate assets remain `index-C5-FyghG.js` and
`index-CgbiijFq.css`, consistent with no production-source change in this turn.
All 31 delivered paths are present in the reviewed diff, with no missing or
extra paths; dependency/lockfile, shared auth/transport, Operation, KYC and Audit
source are unchanged. The 303-module/asset production import walk found no
script/fixture imports; fixture-marker and secret-pattern scans found no
leakage. Diff and production safety checks passed, completing the local gate.
See the branch's Git HEAD for the resulting full local commit SHA; no second
commit is needed just to self-reference that SHA in this document.

## Prior resumed independent review — 2026-10-18

Historical interrupted-run evidence follows. Its unfinished/NO COMMIT statements
describe that earlier checkpoint and are superseded by the final gate above.

**SOURCE / SYNTHETIC FINANCE QA PASSED. COMMIT GATE BLOCKED BY FINAL LIVE
INVESTOR-TARGET UI TIMEOUT / UPSTREAM 502. NO COMMIT.**

- Recovered the existing worktree and all 31 delivered paths, including the
  previous free-text movement-status fix and seven extra checks. No patch was
  reapplied, worktree recreated, or source audit restarted.
- Fetched live frontend refs: dev `874ff9320fadc4e6a081fda9dd50359bcdfd4f89`,
  main `c2235ac5d0d65408e9d39bf836a1a717da3d95ae`, handoff
  `89a3b5058f52f981b3a1b06756d7f33a2a043f27`, all unchanged. Canonical dev clean.
  Backend source remote remains `aea5392a18b6a6df327590af38ecd254dadbb55c`.
- Built-in browser inventory now works. Reused the existing authenticated
  homolog tab; `GET /auth/me` returned 200 with SUPER_ADMIN role. No password,
  token, customer name/document, or actual monetary value was emitted.
- Independently observed 200 from all eight Finance GET endpoints; envelopes,
  BRL/centavos declarations, detail identities, Wallet owner mapping, summary
  balance agreement, unsigned movement amounts/directions, masked counterparty
  documents (20-row sample), and alias Whitelabel scoping all passed.
- Eight additional 200 GET checks passed: combined Investment scopes; failed
  status with null amount; Payment status/scope/page/amount sort; Wallet
  scope/sort; movement kind/category; movement Opportunity; alias status/scope;
  alias/global-list row and total equivalence. Current observed list totals:
  Investments 2140, Payments 2116, Wallets 6. These were re-read, not assumed.
- The first multi-GET CDP evaluation timed out at the command boundary; it may
  have completed GETs without returning evidence. The successful bounded run
  supplied the evidence above. No business/financial action or mutation retry.
- Built-in CDP rejected `Page.addScriptToEvaluateOnNewDocument` as unsupported.
  Used the user-authorized Playwright CLI alternative for synthetic local QA:
  cached CLI, isolated non-persistent headless Chrome session, production Vite
  preview at `127.0.0.1:4187`. No real cookies, credentials or tokens copied.
  All non-local API requests are intercepted; non-GET requests are rejected.
  Synthetic session exists only in the test browser. No application bypass,
  dependency, Backend/CORS or Netlify change was introduced.
- Scratch runner and sanitized artifacts are outside Git under the existing
  Codex visualization area, `finance-read-review-2026-10-18/`. Early runner
  setup errors (sandbox lacks URL global; initialization preceded React's
  navigation subscription) were corrected in test infrastructure only.
- Live usage: 26% five-hour / 4% weekly at resume; 43% / 7% before browser flow
  execution. Historical measurements only; re-query before another costly phase.

**First unfinished required check:** complete the Finance-derived Investor target
read/reload in the existing homolog UI once the upstream service is stable.
Do not redo the 307 successful synthetic assertions, the Finance GET checks or
source review. Do not create a commit while required live runtime evidence is
blocked. No promotion/deployment authorization is implied.

### Resumed runtime progress

- Core Finance browser flows passed: server-backed list/detail/filter/sort/page,
  list return/reload/Back, real-shaped Investor-ID link/reload, null amount,
  independent statuses, partial PIX references without payable QR/key, Wallet
  summary, movements/inline focus/Escape, alias scope, unknown-wallet parent
  gate, overflow clamp and GET/header checks (51 successful assertions).
- Errors/safety then passed: 400/403/429/500/502/503, network failure, actual
  20-second client timeout, explicit retry, malformed/money-unit rejection,
  unavailable/conflicting balances, identity/scope rejection, whole-page privacy
  rejection, five empty states, role fixtures and central 401 session expiry.
- Seven held-request race groups passed: filter A→B, page 1→2, Wallet A→B,
  delayed movements, delayed alias, Investment detail A→B and navigation away.
  108 successful browser assertions at that coherent checkpoint; zero writes
  and zero unhandled page exceptions. Counts include successful checks, not
  old Cloud totals.
- Corrected runner-only assumptions with inspected evidence: null payment date
  can show a responsive dash; the ambient Dot Matrix canvas is not a payable QR;
  focus restoration must wait for its animation frame. The Dashboard mock was
  initially missing `/dashboard`; fixed before its regression validation.
- Responsive run hit a transient local-renderer wait while opening Payments;
  one bounded hard reload restored the same test tab and preserved its evidence.
  No application code changed. Normal-motion responsive checks continue from
  the first unfinished matrix cell; screenshots use viewport capture.

### Completed resumed evidence and final disposition

**307 successful independent browser assertion executions (including a repeated
list check during runner recovery); no unresolved synthetic
assertion failure; zero unhandled page exceptions; zero attempted non-GET
business requests.** The retained runner history identifies corrected harness
assertions separately; they are not silently classified as frontend fixes.

- Loaded-state matrix: eight Finance views × 1672/1440/1024/768/390/320 = **48
  cells**. All pass document overflow, unclipped controls/amounts, labelled
  inputs, named buttons, one primary heading, table caption/header semantics.
  Long safe-integer monetary values were included, not just short amounts.
- Empty/error/loading matrix: three list domains × three states × six widths =
  **54 additional cells**. Error alert and loading busy semantics passed.
- Keyboard: filter tab order, visible focus, aria-sort, arrow-key tabs,
  inline movement focus/Escape/return, mobile drawer Escape, Create/Edit and
  Menu Visibility dialog focus/disabled final controls passed. Reduced-motion
  readability passed. This is scoped accessibility QA, not WCAG certification.
- Visual captures were inspected at all six widths, plus the 320px maximum
  amount and 390px movement detail. Monetary values remain readable; masks and
  partial transaction references are visible. All captures are synthetic.
- Cross-module local regressions passed for Auth/session/explicit logout,
  Dashboard, Investor numeric-ID navigation/reload/Back, Entrepreneur, Accounts
  list/detail, Audit list/list-loaded detail/keyboard/reload-unavailable, KYC
  shared detail/keyboard, Whitelabel GET, Create/name-only Edit safe preparation,
  Menu Visibility Stage A GET/Stage B draft/review/discard, Companies,
  Opportunities, Finance configuration prototypes, and shell/navigation.
- Create, name Save and Menu Visibility Save remained aria-disabled in the
  production build; keyboard activation emitted zero writes. No KYC decision,
  real document operation or source-domain mutation was executed.
- Initial Dashboard and Accounts-detail mock omissions were fixed in the
  scratch transport before those regression cases were revalidated. The Audit
  unavailable message is paragraph text, not a heading; its selector was
  corrected. These are test-infrastructure findings, not application defects.
- Synthetic session was explicitly logged out. Only normal auth keys had been
  present; no financial records in localStorage/sessionStorage. Isolated CLI
  browser closed. The temporary local preview is stopped at handoff. No
  production/homolog browser state was replaced by mock records or credentials.
- Final TypeScript, oxlint, Vite build, diff check and all 14 maintained suites
  passed again; Finance remains **164**. Bundle-size advisory unchanged.
  No dependency/lockfile change or test-fixture production import.

**Previous live Investor-target failure — evidence retained:**

1. Used the existing built-in homolog session and the Investor ID returned by
   the representative live Finance record; no new account/fixture was created.
2. The existing homolog Investor UI requested the record and reached its
   controlled error state after about **20,021 ms**, resource status 0 (timeout).
3. A bounded direct GET to the same documented Investor endpoint returned
   **HTTP 200**, with returned ID matching the Finance reference. No customer
   fields or actual identifier value were emitted or captured.
4. Exactly one explicit UI retry was attempted after that successful GET. Its
   resource response was **HTTP 502** after about **1,554 ms**. The UI remained
   in its controlled error state. No further UI retry loop was performed.
5. Provisional classification then: **homolog upstream/environment instability**,
   not a proven specific-layer cause or a confirmed Finance frontend defect.
   It occurred on the existing homolog application;
   this candidate was never pushed/deployed, and Investor/auth source is
   unchanged. It is not asserted to reproduce Cloud's old 97/98 or Auth/Dashboard
   totals: those scratch runners are unavailable. New independent local
   regressions passed instead.
6. The mocked server-ID round trip and live Finance API reads passed, but they
   do not substitute for this unfinished live UI read/reload. Under the user's
   strict runtime gate, **NO REVIEWED LOCAL COMMIT IS CREATED**. Once stable,
   finish only this live case, recheck Git/affected validation, and make the
   authorized one local feature commit if no required gap remains.

No new production code change was needed during this resume. Only this checkpoint
and the README status note changed beyond the preserved previous review state.
All 31 delivered paths and previous refinements remain intentionally uncommitted.
Dev/main/handoff, Backend/Core, Netlify and homolog business data are unchanged.

Final handoff: temporary preview PID 14124 was identity-checked and stopped;
the isolated CLI browser and agent-created built-in local tab were closed.
The original authenticated homolog tab was restored to Dashboard and preserved.
Final live usage query: 75% five-hour / 12% weekly; ordinary usage allowed.

## Prior independent review checkpoint — 2026-10-18

Historical source-review record; its pending runtime/commit disposition is
superseded by the completed resumed evidence and final Investor gate above.

**REVIEW INCOMPLETE — BROWSER TOOLING BLOCKED. NO REVIEWED COMMIT.**

- **FINANCE READ INTEGRATION V1: IMPLEMENTED IN SOURCE, NOT DEPLOYED.**
- Investments, Payments, Wallets, Wallet movements and Wallet investments:
  **AUTHORITATIVE READ PREPARED**, source/unit-tested; independent runtime
  validation remains pending.
- **FINANCIAL MUTATIONS: NOT ENABLED.** Gateways / Modalities / Catalogs:
  **NOT INTEGRATED IN THIS UNIT.**
- Canonical repository stayed on clean `dev`
  `874ff9320fadc4e6a081fda9dd50359bcdfd4f89`. Live remote refs were fetched and
  checked, not merely read from cached tracking refs. `main` stayed
  `c2235ac5d0d65408e9d39bf836a1a717da3d95ae`; handoff branch stayed
  `89a3b5058f52f981b3a1b06756d7f33a2a043f27`.
- Isolated worktree:
  `C:/Users/User/Desktop/Loor/worktrees/super-admin-finance-read-integration-v1`,
  branch `feature/finance-read-integration-v1`, HEAD still the dev baseline.
  The Cloud patch was absent there, checked and applied **exactly once**.
  Nothing was reapplied or discarded. All 31 delivered paths are preserved.
- Patch SHA-256, computed locally:
  `830a78d4fb0c9f89b108825daa6e727bba280de465a6007eab609230ab2f9956`.
  No independent full-hash manifest was available; this records artifact
  identity, not independent authentication of its provenance.
- Browser discovery failed with
  `failed to write kernel assets: O sistema não pode encontrar o caminho especificado. (os error 3)`.
  One controller reset and one retry produced the same failure **before tab
  discovery**. No authentication state could be inspected. This is not a
  missing-password diagnosis. No external browser, terminal browser, token
  transfer or authentication workaround was used.
- No independent live Finance GETs, local browser QA, screenshots, responsive
  matrix, accessibility scan, console inspection or browser storage check
  completed in this review. Cloud evidence below is **inherited evidence**, not
  a new Codex E2E result. No local preview server was started.
- Current usage was queried live: initially 0% five-hour / 0% weekly; a later
  live query returned 19% / 3%, ordinary usage allowed. These are historical
  checkpoint measurements, never a future allowance estimate.

**First unfinished step:** after the built-in browser controller is repaired,
rediscover tabs, verify the authorized homolog session, perform representative
GET-only contract checks, then run this feature's independent synthetic browser
QA/regressions at 1672/1440/1024/768/390/320. Do not reapply the patch or claim
Cloud captures validate the current reviewed worktree. Create the one local
feature commit only after the required review passes; no push or deploy.

## A. Backend contract

Cloud source reference: `backend-super-admin-Loor` `dev` = homolog = `aea5392` (Finance changes
in `b414963`; `aea5392` itself only adds Menu Visibility Stage B locks and
Whitelabel audit safety, outside this unit). Contract document:
`docs/finance-read-contract-v1.md`. Nest returns Core's body unchanged.

The following live findings were reported by **Cloud on 2026-10-17** against
the Nest source and homolog. They have not been independently rerun by Codex:

- The operator signed in themselves in the Claude browser pane (SUPER_ADMIN).
- Cloud ran a controlled, **GET-only** client inside that page (the token stayed
  inside a closure, was never returned, logged or stored; the helper was deleted
  afterwards). About 150 GETs, **zero** non-GET requests.
- Only **structure** was recorded: field names, types, nullability, enum
  tokens, totals and filter consistency. No amount, name, e-mail, document,
  transaction reference, token or header value was recorded.

| Endpoint | Envelope | Query accepted (unknown keys → 400) |
| --- | --- | --- |
| `GET /api/investments` | `{ data, meta{page,perPage,total,lastPage}, money{currency:"BRL",unit:"centavos"} }` | `page`, `perPage` (≤ 100), `search`, `status`, `whitelabelId`, `investorId`, `opportunityId`, `sort` (`createdAt`/`updatedAt`/`status`), `order` |
| `GET /api/investments/:id` | `{ data, money }` | — |
| `GET /api/payments` | `{ data, meta, money, domain:"payment", note }` | same filters; `sort` adds `amount` |
| `GET /api/payments/:id` | `{ data, money, domain }` | — |
| `GET /api/wallets` | `{ data, meta, money, domain:"wallet_balance", note }` | `page`, `perPage`, `search`, `whitelabelId`, `sort` (`createdAt`/`name`, others → 400), `order`; `ownerType` is NOT in the current Nest DTO |
| `GET /api/wallets/:id` | `{ data, money }` | — |
| `GET /api/wallets/:id/movements` | `{ data, meta, money, domain:"wallet_movement", note }` | `page`, `perPage`, `kind`, `category`, `opportunityId` — `search` / `sort` / `order` → 400 |
| `GET /api/wallets/:id/investments` | `{ data, meta, money }` | alias of `/investments?whitelabelId=:id`; a `whitelabelId` param → 400 |

Roles (source, `@Roles` on all three controllers): `SUPER_ADMIN`,
`FINANCIAL_ADMIN`, `READ_ONLY`. Other roles receive 403 from the RolesGuard.

### Reported fixes — Cloud live evidence, not independently repeated

| Reported fix | Live result |
| --- | --- |
| Investment filters applied | Each of the 7 statuses filtered; status totals sum to the list total; Whitelabel totals sum to the total; `investorId`, `opportunityId` and combined filters consistent. |
| Payment filters applied | 4 statuses sum to the total; Whitelabel, investor and opportunity filters consistent; `investmentId` / `provider` → 400. |
| Invalid enums rejected | Wrong investment / payment status, movement `kind` / `category`, wallet `sort` → 400. |
| Unknown params rejected | `foo`, `investmentId` on investments, `perPage=101` → 400. |
| Movement CPF masked | 2,032 movement rows scanned across wallets, kinds, categories and first / last pages: every `counterparty.document` is `***.***.***-dd` or `null`; **0 unmasked**. |
| Movements: no search / sort | `search`, `sort`, `order` → 400. |
| Movement overflow clamped | A page past the end returns `meta.page = lastPage` with the last page's rows. |
| Wallet summary | `summary.authoritativeBalanceCents` equals the detail and list balance; `countIn` / `countOut` equal the `kind` filter totals; category totals add up. |
| Alias scoped | `/wallets/:id/investments` returns exactly the rows, totals and keys of `/investments?whitelabelId=:id`. |

### Residual discrepancies (documented, handled by the frontend)

1. Investments and Payments **silently ignore unknown `sort` keys** (Wallets reject
   them). The frontend only sends documented keys, so this is never relied on.
2. The alias returns **200 empty for an unknown wallet** (no existence check). The
   wallet detail is read first (404 → "Wallet não encontrada"), so the alias is
   only reached for an existing wallet.
3. Movement `status` is an **opaque source status** (`paid`, `completed`,
   `confirmed`, `refunded`, …), not a global enum: shown as a neutral label,
   never as success / failure.
4. Payment rows carry `opportunityId` but **no opportunity name**: shown as
   "Oportunidade #id".
5. `FINANCIAL_ADMIN` cannot read `/whitelabels`: tenant names come from the
   wallet projection (`GET /wallets?perPage=100`), which every Finance role can
   read; fallback "Whitelabel #id".
6. `FINANCIAL_ADMIN` / `READ_ONLY` access and 403 for other roles are
   **source-confirmed only** (no such homolog session); 429 / 5xx were not
   provoked live. Both are covered by mocks.
7. Every live envelope carries `money: { currency: "BRL", unit: "centavos" }`,
   but the contract document only states "integer centavos + `currency`". The
   frontend requires the declaration (without it no amount can be trusted);
   the Backend should document it.

Cloud reported no stop condition: no unmasked CPF, no filter ignored, no scope
leak. This is not an independent live-read conclusion of the current review.

## B. Investments

- **List** `#/finance/investments`: server pagination (20 per page), search,
  status, Whitelabel and sort selects; investor and opportunity filters from
  each row ("Filtrar por este investidor / esta oportunidade") shown as
  removable context chips. Every filter is a URL parameter (`status`,
  `whitelabel`, `investidor`, `oportunidade`, `search`, `page`, `sort`, `order`)
  and maps 1:1 to a documented query key. Invalid values are reported
  ("Filtro da URL não reconhecido e ignorado") and never sent; the prototype
  `?wallet=` link is reported, not mapped.
- **Summary cards** are Backend totals (`meta.total` of `perPage=1` reads for
  the scope: total, `paid`, `waiting_payment`, `failed`). No money is summed.
- **Detail** `#/finance/investments/:id` (`?returnTo=` keeps the list context):
  investor, opportunity, Whitelabel, amount, quotas, status, anonymous flag,
  risk acceptance and dates; tabs Visão geral / Pagamento / PIX / Wallet do
  Whitelabel / Atividade da sessão.
- `amountCents: null` (failed investments) is shown as **"Valor
  indisponível"**, never R$ 0,00, with an explanation in the detail.
- **Paid status is never inferred** from the investment: the payment block
  shows the Backend `payment` object (status, provider, amount, date) with
  "status do investimento e status do pagamento são independentes". A `null`
  payment says so; nothing is fabricated.
- Relations: investor → `#/operation/investors/:id` (Investor Read V1, same Core
  id); payment → `#/finance/payments/:paymentId` (the payment's own id); wallet
  → `#/finance/wallets/:whitelabelId`; opportunity name shown **without a link**
  (Opportunities is still a prototype).

## C. Payments

- **List** `#/finance/payments`: same URL-backed filters with the Payment
  status vocabulary (`waiting_payment`, `paid`, `expired`, `refunded`) and the
  documented `amount` sort. Cards: total, paid, waiting, refunded (Backend
  totals). Columns: payment, investment, investor, Whitelabel, provider,
  amount, status, paid at, created at.
- **Detail** `#/finance/payments/:id`: Visão geral, PIX (TxID and end-to-end id
  **partial** — first 8 + … + last 4, marked "(parcial)"; expiration, payment
  and liquidation dates), Relações (investment by `investmentId`, investor,
  opportunity filter), Atividade da sessão. No QR Code, PIX key or
  copy-and-paste code exists.
- **Payment status is independent of the investment status**; both screens say
  so.
- A filter change always returns to page 1; a page past the end (direct URL /
  stale context) is clamped to the last page once (no stale page, no loop).

## D. Wallets

- **List** `#/finance/wallets`: one ledger wallet per Whitelabel, search and
  sort (`name` / `createdAt` — the only documented keys). The balance is the
  Backend **`authoritativeBalanceCents`**; it is never calculated, and balances
  of different Whitelabels are **never summed** ("Saldo somado" card is
  explicitly unavailable). `null` → "Saldo indisponível".
- **Identity**: the contract (and every response) has `id = whitelabelId =
  ownerId`, `ownerType = "whitelabel"`. Rows that break it are rejected
  (`WALLET_IDENTITY_MISMATCH`); no other ID equality is assumed.
- **Detail** `#/finance/wallets/:id` — tabs are URL state (`?aba=`):
  - **Visão geral**: Backend `summary` (total in / out, counts, authoritative
    balance), shown as sent — a missing total or count is "Valor indisponível" /
    "Não informado", never zero. Two balances for one wallet that disagree
    (including one missing) → `BALANCE_MISMATCH`, no balance is shown.
  - **Movimentações** (child view): `GET /wallets/:id/movements`, server pages
    (`?mpage=`), `kind` (`?tipo=`), `category` (`?categoria=`) and opportunity
    (`?oportunidade=`) filters. Fixed Backend order (date desc); **no search,
    sort or order is ever sent**. Direction comes from `kind` (Entrada /
    Saída); amounts are unsigned. The server clamp is followed **downwards
    only** (`meta.page < requested`), so a misbehaving response cannot cause a
    page loop. Inline movement detail is URL state (`?movimento=`); there is no
    movement detail endpoint, so a movement outside the loaded page says so.
    Origin references are free-form (keys vary by category): transaction
    references and anything that could carry a payment key or document
    (`txid`, `end_to_end_*`, `pix*`, `*key*`, `qr`, `emv`, `document`, …) are
    shown partially; the counterparty document is displayed exactly as the
    Backend masks it.
  - **Investimentos** (read-only relationship): the alias
    `GET /wallets/:id/investments` with a status filter (`?istatus=`,
    `?ipage=`); every row must carry the wallet's Whitelabel
    (`SCOPE_MISMATCH` otherwise). "Abrir em Investimentos" opens the main list
    filtered by the same Whitelabel.
  - **Atividade da sessão**: in-memory navigation log (unchanged concept).
- The detail is keyed by wallet id: switching wallet A → B remounts it, and the
  request keys include the wallet id, so a late response of A is never shown
  under B.

## E. Frontend

| File | Role |
| --- | --- |
| `src/features/finance-core/shared/financeApi.ts` | Typed narrow adapters (GET only, canonical `authenticatedGet`), strict parsers, query builders |
| `shared/financePresentation.ts` | Display boundary: `formatCents` (BigInt, `12345 → "R$ 123,45"`), labels, partial references, error copy, tenant names, page text |
| `shared/financeRoute.ts` | URL state parsers / hrefs for lists, wallet detail and return contexts |
| `shared/useFinanceData.ts` | `useRemote` hooks (keyed, abortable, stale-safe) |
| `shared/FinanceCoreUi.tsx` | Shell plus shared UI: `Money`, status pills, `KindTag`, `ReadError`, skeletons, `IgnoredParams`, `RecordNotFound`, `DetailStatus`, `ServerPagination` (KYC / Audit exports kept) |
| `investments/*`, `payments/*`, `wallets/*` | Rewritten pages and CSS (approved Finance Core composition preserved) |
| `src/app/App.tsx` | Finance routes now hand the raw URL params to the pages (no other route change) |
| **Removed** | `prototypeFinanceCore.ts`, `financeCoreRecords.ts`, `financeCoreRefs.ts`, `financeCoreModel.ts` |

- **Money**: integer centavos end to end; formatted only in `Money` /
  `formatCents` (BigInt, no float division, no `toFixed`); `null` is never
  money. No screen sums or reconstructs an amount or a balance.
- **Strict parsing, whole-response rejection**: a missing or wrong `money`
  declaration (`MONEY_UNIT_MISMATCH`), an unmasked document
  (`UNMASKED_DOCUMENT`), a row outside an applied filter (`SCOPE_MISMATCH`), a
  detail of another record (`IDENTITY_MISMATCH`), a wallet identity break or two
  balances reject the whole response with specific copy — nothing partial is
  shown. Display text is tolerant (missing → "Não informado"). Unknown status
  tokens are shown as sent (no prototype-key lookups).
- **Identifiers**: only positive safe-integer ids reach the API; prototype ids
  (`INV-0001`, `WAL-0001`, …), ids beyond `Number.MAX_SAFE_INTEGER` and
  malformed filters are refused locally with no request (not-found / ignored).
- **Payment date ≠ payment status**: a payment without `paymentAt` shows "Sem
  data de pagamento"; only the payment status says whether it is paid.
- **States**: loading skeletons, empty, filtered-empty (with "Limpar filtros"),
  missing detail (404 and invalid id), 401 (central session end), 403
  ("Acesso não permitido", session kept, no retry), 400 ("Consulta não
  aceita", no retry), 404, 429 ("Muitas consultas"), 5xx, timeout (20 s),
  network, malformed, privacy / unit / scope rejections; "Tentar novamente"
  where it can succeed.
- **Stale protection**: every request key contains the record id or the full
  query; a newer key aborts the previous request; late responses never
  overwrite current data.
- **Accessibility**: labelled selects, table captions, `aria-sort`, live range
  text, URL-backed tabs, movement detail with focus handoff and Esc that
  returns focus to the row action.

## F. Safety

- **Read-only**: the Finance adapter imports only `authenticatedGet`; no
  `POST` / `PUT` / `PATCH` / `DELETE`, alias or write transport exists in
  `src/features/finance-core` (syntax-aware checks). No financial write was
  executed or probed against homolog; mutation-safety is proven with isolated
  mocks (any non-GET → 405 and fails the run).
- **Privacy**: an unmasked CPF / CNPJ rejects the whole response — in the
  counterparty `document` (a masked value needs ≥ 3 masked positions, no more
  visible digits than masked ones, ≤ 6 digits), in any origin `reference`
  value (document-like keys must be masked; other values may not contain a
  CPF / CNPJ written with dots, spaces, hyphen or as a bare 11 / 14-digit run;
  transaction references may not *be* one), in the description, counterparty
  or opportunity name, or in the investment detail's embedded investor /
  opportunity names. The Backend masks documents (verified live); frontend
  masking is **not** used as a substitute. Transaction and key-like
  references are partial. No token, header or raw document is rendered,
  logged or stored.
- **No client persistence**: no financial record in `sessionStorage`,
  `localStorage`, IndexedDB or cookies; the session activity log is in memory.
- **Prototype data has no authority**: the illustrative Finance records were
  deleted; no fixture fallback, no `?previa=`-style override. Test fixtures live
  only in `scripts/fixtures/finance-read-fixtures.mjs` (synthetic values).
- **Authorization**: 401 → central `handleUnauthorized`; 403 → permission
  state without clearing the session. No bypass, no role gating invented on
  the client, no CORS change.
- Whitelabel CRUD (writes disabled) and Menu Visibility (PUT and sidebar
  enforcement disabled) boundaries are unchanged.

## G. Evidence

### Cloud-delivered canonical suites (`node scripts/check-*.mjs`)

| Suite | Before (`874ff93`) | After |
| --- | --- | --- |
| accounts-read | 33 | 33 |
| audit-read | 97 | 97 |
| companies-frontend | 680 | 680 |
| compliance-audit | 400 | 400 |
| dashboard-read | 45 | 45 |
| entrepreneur-read | 45 | 45 |
| investor-read | 42 | 42 |
| menu-visibility | 1223 | 1257 |
| operation-finance-regression | 285 | 136 |
| url-search-draft | 14 | 14 |
| whitelabel-crud-mocks | 43 | 43 |
| whitelabel-crud | 69 | 69 |
| whitelabel-read | 49 | 49 |
| **finance-read (new)** | — | **157** |

- **finance-read** (new): adapters, money formatting, nullable amounts, unit /
  privacy / scope / identity / balance rejections, exact query keys (movements
  never send `search` / `sort` / `order`; documented sort keys only), route
  parsing and ignored params, pagination clamp, 401 / 403 / 429 / 5xx, error
  copy, no fixture fallback, no write / transport / storage capability in any
  Finance file. Source-text checks run on comment-free code. During
  development, six planted regressions (masking, movement sort, balance
  mismatch, alias scope, null → 0, clamp) were each confirmed to fail the
  suite (not part of the script). React behaviour (clamp effects, page reset,
  wallet A → B) is covered by the browser QA below, not by this suite.
- **operation-finance-regression**: the ~150 checks that asserted the
  illustrative Finance records were *retained* were replaced by checks that
  they are *removed*, that Finance screens cannot import prototype records,
  storage or transport, that the adapter is GET-only and that prototype ids
  never reach the API (same pattern as the Investor Read removal). The
  participant, KYC, Investor and Entrepreneur checks are unchanged.
- **menu-visibility**: its source boundary now also lists the reviewed Finance
  Read files explicitly (no directory exemption) and scans every Finance file
  for transport / persistence capabilities. App.tsx must be identical to the
  baseline except the **17 reviewed Finance Read statements** (2 helpers, 9
  resolver, 6 render), located by syntax and compared **verbatim** against an
  allowlist (each exactly once); resolver and render statements are replaced
  by a positional marker, so they must stay where the baseline has them.
  Six planted App changes are encoded and rejected: a Finance render moved
  above the session guard, a navigation side effect in a render statement, a
  resolver hijack, a side effect in a helper, a duplicated resolver statement
  and a non-Finance route change. The count changed because per-statement
  checks were consolidated into one allowlist check.
- TypeScript (`tsc -b`), oxlint (0 warnings), `vite build` and
  `git diff --check` pass.

### Cloud-reported browser QA (scratch mock Control Plane, synthetic data)

Production build with a mock that mirrors the live contract (400 for unknown
params / invalid enums, clamp, alias rules, role guard), Chromium:
**186 / 186 checks**, including:

- exact requests per screen, filters, sort, search, pagination, page reset on
  filter change, overflow clamp without loops, ignored URL params;
- money formatting, "Valor indisponível" / "Saldo indisponível", status
  independence, partial references, masked documents;
- wallet A → B and late detail responses (held and released out of order):
  only the current wallet is shown;
- `FINANCIAL_ADMIN` / `READ_ONLY` read everything; `SUPPORT_ADMIN` /
  `COMPLIANCE_ADMIN` get the 403 state with the session kept;
- 400, 404, 429, 500, 502, 503, HTML 502, network, timeout, malformed, wrong
  money unit, scope mismatch, unmasked CPF, balance mismatch, 401 → login with
  the session-expired notice; retry recovers;
- 7 screens × 6 widths (1672 / 1440 / 1024 / 768 / 390 / 320) without
  horizontal overflow; axe (WCAG 2.1 AA + best practice): no serious / critical
  violations;
- zero non-GET requests, Bearer + correlation id on every Finance call, no
  dialogs, no unexpected console errors, no financial data in browser storage.

Cloud reports regressions against `874ff93`, but no reproducible browser runner
was delivered in this repository. The user brief reports 193/193 Finance browser
checks whereas this Cloud document reports 186/186. Neither total is treated as
independent evidence, nor has the discrepancy been resolved by this review.

## Prior independent source / unit review — 2026-10-18

### Backend source scope and remaining proof limits

Live Git `dev` of `backend-super-admin-Loor` was verified at
`aea5392a18b6a6df327590af38ecd254dadbb55c`. Its contract, all three Finance
controllers, query DTOs, forwarding services, global validation, role guard and
Core envelope unwrapping were inspected **read-only**. No Backend checkout,
file repair, configuration change or database action was performed. Source ref
verification does not prove the deployed Backend ref.

- All eight Finance routes explicitly admit SUPER_ADMIN / FINANCIAL_ADMIN /
  READ_ONLY; Whitelabel GET explicitly excludes FINANCIAL_ADMIN. Finance tenant
  names use the permitted Wallet projection, not `/whitelabels`.
- Wallet controller/documentation explicitly map `:id` to Whitelabel ID; the
  alias service forces `whitelabelId = :id`. The parser's
  `id = whitelabelId = ownerId`, ownerType `whitelabel`, is therefore an explicit
  contract constraint, not sample-based inference.
- Current Wallet list DTO does **not** accept `ownerType`. Corrected the Cloud
  document above; the frontend never sent that parameter, so no adapter change
  was necessary. Nest rejects unknown fields globally.
- Investment/Payment DTOs forward supported scopes; movement DTO only admits
  page/perPage/kind/category/opportunityId. Wallet investments do not accept a
  caller-supplied whitelabelId. Frontend only offers supported sort choices.
- The `money` envelope declaration, detailed Core projection fields, live sort
  behavior, counts, unknown-wallet alias behavior and deployed privacy remain
  Cloud-reported/runtime-unverified here. Nest forwards Core data, so source
  inspection alone cannot independently re-prove all those live properties.
- Movement status is explicitly free source text, **not an unresolved mandatory
  global vocabulary**. No Product vocabulary is invented to close this review.
- No current live privacy violation was observed: no live data was requested.
  The older `finance-contract-gate.md` describes an earlier Backend version and
  is not evidence of a current violation or current fix.

### Confirmed frontend defect corrected

`parseMovement` used the short token grammar for `status`. A synthetic regression
first failed (`awaiting reconciliation` became null), then passed after the
parser was changed to preserve free-text status through the ordinary optional
text parser. Tests include spaces, punctuation, accented text, long values and
absent values. The existing whole-response document privacy gate now also covers
that newly accepted free-text field. No enum, success/failure semantics or
financial state transition was added.

No other production code was changed by Codex. Codex changes beyond the recovered
patch are confined to `financeApi.ts`, `check-finance-read.mjs`, this document and
the README delivery-status note. All remain **uncommitted**.

### Meaningful regression coverage mapping

The 285 → 136 Operation/Finance count is not itself approval evidence. The removed
baseline assertions were inspected by family:

| Removed baseline assertion | Classification / current replacement |
| --- | --- |
| Four seed arrays must be nonempty and frozen, with each seed frozen | Obsolete illustrative-data requirement. Four deleted seed modules are explicitly inaccessible; Finance source cannot import them. |
| Seed `investmentById` / `paymentById` / `walletById` returns the identical object | Replaced by requested-ID/detail-ID matching, numeric identity parsing and malformed/prototype-ID rejection before any request. |
| `movementsForInvestment` / `movementsForPayment` follows explicit seed foreign keys | Seed join helpers deliberately removed. Server investment/payment references and embedded identity checks replace them; Opportunity IDs never link to unintegrated prototype details. No amount/name join exists. |
| Seed `walletRelations` and `walletIdsOf` remain scoped, including payment links | Replaced by explicit Wallet owner mapping, scoped alias rows, applied movement filters, parent detail existence gate and whole-page cross-tenant rejection. Wallet movements lack their own walletId field; their scope comes from the authoritative path, not an invented row field. |
| Read lookups leave all four seed collections unchanged | Restored as a new executable check over deeply frozen, independently parsed Investment/Payment/Wallet/Movement responses. Statuses/balances remain independent and source objects remain byte-for-byte unchanged. |
| Finance prototype investor IDs remain prototype-only | Stronger replacement: invalid/prototype Finance identifiers make zero requests, and Finance's Investor href uses the server Investor ID. The independent real-link browser round trip is still pending. |
| Participant / KYC / Investor / Entrepreneur regression assertions | Retained unchanged. Finance removal did not remove those checks. |

Added canonical review checks also compare the baseline and current runtime
bodies of KeyValueList, DetailHero, TabPanel, ContextChip and DateStack. SortSelect
has only a backward-compatible optional label with the unchanged default.
Shared CSS changes retain old selectors and append Finance-specific rules; the
old debit selector remains alongside the new `kind=out` selector. This supports
source compatibility, **not a completed visual or keyboard regression pass**.

Menu Visibility exemptions were reviewed: explicit file paths only; 17 exact
Finance App statements, each once, in baseline positions; all remaining runtime
App code unchanged. Encoded planted guard/resolver/side-effect regressions are
rejected. No broad Finance directory or auth/navigation exemption was added.

### Independently executed validation

TypeScript, oxlint, production Vite build and `git diff --check` pass. The build
retains the non-blocking >500 kB chunk advisory. All 14 maintained suites pass:
Accounts 33; Audit 97; Companies 680; Compliance/Audit 400; Dashboard 45;
Entrepreneur 45; Investor 42; Menu Visibility 1257; Operation/Finance 136;
URL search 14; Whitelabel CRUD mocks 43; Whitelabel CRUD 69; Whitelabel/auth 49;
Finance Read **164** (Cloud delivered 157; seven independent review checks added).
These are synthetic/source/GET-only injected-transport checks, not live E2E.

The former Investor `INV-0001` expectation is safely replaced at adapter/route
level by controlled no-request rejection plus server-ID navigation. Its real
browser link round trip remains unverified. Cloud's Investor 97/98, Auth 26/27
and Dashboard 82/88 browser anomalies are **NOT independently proven inherited**:
the scratch runners were not delivered and browser access is blocked. Auth,
Dashboard, Investor, KYC, Audit and other non-Finance source are unchanged;
their maintained canonical suites pass. Stage A's historical mock lacking Wallet
endpoints, the Companies timeout and screenshot differences likewise remain
unreproduced, not relabelled as passed.

### Safety and disposition

- No live financial or business mutation, Whitelabel write or Menu Visibility
  write was executed. No authentication/token handling was introduced. No
  dependency, Backend/Core, main/dev, handoff branch or Netlify change.
- Production Finance source only imports canonical `authenticatedGet`; all
  Finance source is scanned for write transports and persistence. Test fixtures
  remain outside `src`. An independent walk of the production entry's 303 local
  modules/assets found zero script/fixture imports; generated JavaScript has
  none of the Finance fixture markers. No package/lockfile changes exist.
  Browser runtime storage/console and final UI safety
  cannot be signed off without the pending browser phase.
- No local feature commit, no push, no promotion and no deployment. The isolated
  worktree intentionally stays dirty with the recovered implementation and
  review refinements preserved; canonical dev stays clean.
- **Technical approval / readiness for separate promotion: NOT YET.** Source
  and canonical results are positive, but required independent browser QA,
  responsive/accessibility/regression evidence and representative live GET
  validation remain unfinished. This is a tooling evidence blocker, not a new
  Backend/Product dependency inferred from missing evidence.

## H. Pending

- The live Investor-target read/reload gate is now complete. The reviewed local
  commit does not authorize push. Remaining: separately authorized promotion / Netlify deploy
  and the deployed UI → live API E2E (including a real `FINANCIAL_ADMIN` /
  `READ_ONLY` session).
- Backend: reject unknown `sort` keys on Investments / Payments (today ignored);
  existence check on `/wallets/:id/investments`; optional opportunity name on
  payments; document the existing opaque movement status semantics and money
  envelope. These are recorded follow-ups, not invented frontend Product rules.
- Opportunities / Companies integration (opportunity links stay unlinked).
- Frontend follow-ups (non-blocking): a list scope change (search, Whitelabel,
  investor, opportunity) issues up to 5 GETs (list + 4 `perPage=1` counts; the
  tenant read is cached per screen) — a Backend status-count endpoint would
  reduce this; focus is not moved after removing a context chip or switching
  tabs from a navigation card.
- No financial write is planned or prepared in this unit.
