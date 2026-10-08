# Finance / Wallet V1 and Wallet Movements

## Baseline and evidence

Status: **FRONTEND PROTOTYPED / INTEGRATION PENDING / E2E VALIDATION PENDING** at `dev@9f8abc6d55410e63a2edaf6d8efeafcd217b7a30`. This is **READ-ONLY / SUPERVISORY PROTOTYPE**. Sources: [Wallet module](https://github.com/devLoor1/super-admin-Loor/tree/9f8abc6d55410e63a2edaf6d8efeafcd217b7a30/src/features/finance-core/wallets), [Wallet and WalletMovement models](https://github.com/devLoor1/super-admin-Loor/blob/9f8abc6d55410e63a2edaf6d8efeafcd217b7a30/src/features/finance-core/shared/financeCoreModel.ts), [read-only records/relationships](https://github.com/devLoor1/super-admin-Loor/blob/9f8abc6d55410e63a2edaf6d8efeafcd217b7a30/src/features/finance-core/shared/financeCoreRecords.ts), and [frontend implementation/review](https://github.com/devLoor1/super-admin-Loor/blob/9f8abc6d55410e63a2edaf6d8efeafcd217b7a30/docs/finance-wallet-v1.md). These are frontend evidence, not an authoritative ledger or operational balance contract.

## Routes and capabilities

| Frontend route | Current behavior |
| --- | --- |
| `#/finance/wallets` | Global Wallet list; search/filter/sort/pagination |
| `#/finance/wallets/:walletId` | Read-only detail; optional `?movimento=:movementId` opens that Wallet's movement contextual detail |

The list shows Wallet ID, owner/context, tenant, currency, **REPRESENTED BALANCE**, movement count, status and date. Search includes explicit related source references; filters cover tenant/status/currency/with-or-without-movements. Summary counts are local prototype values, not global balance/ledger aggregates.

Detail separates overview, movements, financial relationships and session activity. It shows represented balance, Wallet status, separate movements with contextual inline detail, explicit Payment/Investment references and controlled pending Transfer context. Null/missing identities remain honest absence/notices; no owner, movement or financial state is invented.

Opening/closing a movement reconciles `?movimento=` with Back/Forward/reload; foreign/invalid IDs do not select another record. This is **FRONTEND PROTOTYPED NAVIGATION**, not a Backend deep-link or read authorization contract.

## Wallet ownership and state

Current `ownerReference` is an illustrative Operation Investor or operational context. It does **not** settle whether a Wallet belongs to an account, Investor, Entrepreneur, Whitelabel or another financial entity. One-versus-multiple Wallets per owner, canonical owner/source/tenant scope and the currency model remain open (Q-FW-01–02). Prototype BRL presentation is not a single-currency Product rule.

Ativa / Bloqueada is a **PROTOTYPE UX STATE MODEL**, not official lifecycle, access enforcement or a block/unblock command. No status mutation is available.

## Separate WalletMovement entity

**INVESTMENT ≠ PAYMENT ≠ WALLET MOVEMENT ≠ WALLET BALANCE.**

`WalletMovement` is a distinct illustrative record: movement ID, Wallet ID, direction, amount/currency, status, description, optional source type/ID and timestamps. It is not a Payment, an Investment, an authoritative ledger posting or the balance itself.

- Direction: Crédito / Débito — **PROTOTYPE UX RULE** only.
- States: Pendente / Concluído / Falhou — **PROTOTYPE UX STATE MODEL** only.
- Source may explicitly reference Payment, Investment, Transfer or another source. Source identity does not imply final cardinality, ownership, settlement or a coupled lifecycle.
- Movement detail navigates only through explicit source IDs. The Investment view may resolve an explicit Payment's Investment reference; no name/value-based matching is used.
- **No automatic movement generation is implemented or confirmed.** No financial record/status/balance is synchronized from movement display.

Final movement taxonomy, status/direction semantics, posting time, ordering, consistency and historical treatment remain Q-FW-04–05, Q-FW-07 and Q-FC-01–02.

## Represented balance versus authoritative ledger

The exact semantic label is **REPRESENTED BALANCE** (`Saldo representado`), not authoritative available/withdrawable balance.

`representedBalance` is static prototype data. It is **not automatically calculated from displayed movements**, not equivalent to withdrawable/available balance, not necessarily settled balance and not a ledger guarantee. Displaying movements does not prove a complete ledger, posting consistency or recoverable funds. No frontend or Control Plane arithmetic is defined as financial source of truth.

Backend/Product must define authoritative ledger/source, balance composition, available/blocked/pending semantics, when movements affect balances, ordering, consistency/snapshot guarantees, reversals, idempotency and reconciliation. None is inferred from Crédito/Concluído labels, a Payment marked Pago or matching illustrative amounts. These remain [Q-FW-03–07](open-questions.md#finance-wallet) and [Q-FC-01–04](open-questions.md#finance-core-cross-cutting).

## Transfers and financial safety boundary

Transfers currently shows a **controlled pending-module state**; Ver transferência yields a notice. Transfer execution is **NOT IMPLEMENTED**. No Transfer API, lifecycle, sender/receiver rules, cashout, withdrawal or settlement contract is specified or invented. A future dedicated Transfer domain must remain distinct from WalletMovement (Q-FW-06).

The entire Finance Core V1 is read-only/supervisory. Explicitly absent: payment execution, real PIX generation/payable QR/payload/key, settlement, refund, reversal, transfer, cashout, deposit, withdrawal, balance adjustment, manual credit/debit, movement creation, reconciliation and real Gateway calls. Wallet create/delete/edit/block/unblock and movement create/edit are also absent. Allowed actions are search/filter/sort/page, open/read tabs, open/close contextual detail and navigation. Session activity is local/non-persistent/non-authoritative, not audit.

## Cross-domain navigation

| Current action/reference | Frontend destination | Boundary |
| --- | --- | --- |
| Ver titular | `#/operation/investors/:investorId`, or notice for an operational context | Prototype context, not final ownership; no account/access mutation |
| Ver Pagamentos / PIX | `#/finance/payments?wallet=:walletId` or explicit Payment detail | Movement-source filtering/reference, not payment state or a Wallet credit |
| Ver investimentos | `#/finance/investments?wallet=:walletId` or explicit Investment detail | Independent Investment read, not ownership/status synchronization |
| Movement context | Same Wallet detail with `?movimento=:movementId` | Separate WalletMovement read; scoped ID/freshness contract unresolved |
| Transfer source | Controlled pending notice | No Transfer route/API/execution invented |

Accounts keeps identity/access mutations; Operation owns participant/Opportunity context; Compliance owns KYC decisions; Gateways e contas owns provider/credential configuration. Navigation carries no destination-domain grant. Missing relations do not establish zero balance, settled state or another owner. See [Investments](13-finance-investments.md) and [Payments](14-finance-payments-pix.md).

## Required contracts and completion boundary

Unresolved source/ownership/currency, authoritative-versus-represented balance, ledger/movements, movement states/types, Payment/Investment/Transfer relationships, consistency, reversals, idempotency, reconciliation, query/errors/readback, concurrency/versioning, permissions and audit are indexed in [Q-FW-01–09](open-questions.md#finance-wallet) and [Q-FC-01–04](open-questions.md#finance-core-cross-cutting). Transfers/refunds/reversals/reconciliation are unresolved future capabilities, not missing V1 execution buttons to add.

No retained audit proves this Wallet ownership/ledger/projection contract. Narrower A-07 financial lineage is not a ready supervisory Wallet capability. Status: **CORE SUPPORT TO VERIFY / CONTROL PLANE EXPOSURE NEEDED / PRODUCT DECISION REQUIRED / INTEGRATION PENDING / E2E VALIDATION PENDING**; **BACKEND IMPLEMENTATION NEEDED** for support verified absent and historical foundation/audit gaps. Core remains authoritative; Control Plane exposes authorized safe projections, not duplicate financial persistence or inferred balance calculations. See [dependencies](matrices/backend-dependencies.md#finance-core-v1-dependencies) and [evidence limits](audit-findings.md#finance-core-prototype-mapping--no-new-core-finding).

`WALLET_VIEW` and `WALLET_MOVEMENT_VIEW` are **SPECIFICATION LABELS ONLY — RBAC NOT IMPLEMENTED**. `WALLET_VIEWED` and `WALLET_MOVEMENT_VIEWED` are only **AUDIT POLICY DECISION REQUIRED** candidates. No mutation permission or financial event is introduced; [permission](matrices/permissions.md#finance-core-permission-boundaries) and [audit](matrices/audit-events.md#finance-core-audit-policy) policy remain open. Completion requires agreed authoritative sources/policy, authorized reads/consistency/error contracts, readback and scoped E2E, not prototype approval alone.
