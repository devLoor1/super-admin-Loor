# Finance / Payments / PIX V1

## Baseline and evidence

Status: **FRONTEND PROTOTYPED / INTEGRATION PENDING / E2E VALIDATION PENDING** at `dev@9f8abc6d55410e63a2edaf6d8efeafcd217b7a30`. This is **READ-ONLY / SUPERVISORY PROTOTYPE**, not payment processing. Sources: [Payment module](https://github.com/devLoor1/super-admin-Loor/tree/9f8abc6d55410e63a2edaf6d8efeafcd217b7a30/src/features/finance-core/payments), [independent models](https://github.com/devLoor1/super-admin-Loor/blob/9f8abc6d55410e63a2edaf6d8efeafcd217b7a30/src/features/finance-core/shared/financeCoreModel.ts), [read-only reference resolver](https://github.com/devLoor1/super-admin-Loor/blob/9f8abc6d55410e63a2edaf6d8efeafcd217b7a30/src/features/finance-core/shared/financeCoreRefs.ts), and [frontend implementation/review](https://github.com/devLoor1/super-admin-Loor/blob/9f8abc6d55410e63a2edaf6d8efeafcd217b7a30/docs/finance-payments-pix-v1.md). No Backend support or deployment is inferred from these sources.

## Routes and capabilities

| Frontend route | Current behavior |
| --- | --- |
| `#/finance/payments` | Global list; optional `?wallet=:walletId` explicit movement-based context |
| `#/finance/payments/:paymentId` | Read-only detail; unknown/malformed IDs show not-found |

List behavior includes search by Payment/Investment/Investor/Opportunity reference, Whitelabel/status/method/Gateway/with-or-without-Investment filters, sorting and pagination. Local cards/counts are prototype values, not live financial metrics.

Detail separates overview, PIX, financial relationships and session activity. It displays explicit Investment, Investor, Opportunity, Gateway and Wallet movement context; amount/currency, dates/nulls and external/PIX traceability fields are illustrative. Some prototype Payments have no Investment; this demonstrates absence handling, not final optionality/cardinality policy. Investor/Opportunity/Gateway references resolve read-only; no domain record is copied or synchronized.

## Independent lifecycle and PIX traceability

**Investment ≠ Payment ≠ WalletMovement ≠ Wallet balance.** A displayed Payment status/amount is not an Investment state, investor receipt, ledger posting or available balance. No automatic cross-domain financial synchronization is implemented or confirmed.

Pendente / Em processamento / Pago / Falhou is a **PROTOTYPE UX STATE MODEL**, not confirmed Backend Payment states or transitions. The prototype PIX tab reuses the Payment status; this does **not** establish an official PIX lifecycle/state mapping. PIX methods and charge/TxID/external references are illustrative identifiers, not real payment instruments. Null fields remain absent; expiration is not present in the current prototype record and is not inferred from timestamps.

## PIX and financial safety boundary

V1 does **not** generate real PIX, a payable QR code, copy-and-paste payload or a real PIX key. PIX detail shows a non-payable placeholder; non-PIX records show no PIX data. There is no real charge/link, payment confirmation, settlement, refund, reversal, retry/reprocessing, cancellation of real charges or Gateway execution. There is no amount/status edit, balance adjustment, movement creation, financial execution or real provider request.

Session activity records local views/navigation only; it is non-persistent, non-authoritative and not audit. Prototype values do not prove dispatch, payment, settlement, delivery, reconciliation or external health.

## Gateway and cross-domain boundary

Gateway configuration remains owned by **Financeiro > Gateways e contas**. Payments reads an explicit `gatewayId` against the local configuration to display a provider/environment/active context. It owns no credentials, secrets, provider activation, environment mutation or connectivity configuration. Configured/active state is not payment readiness or provider health.

| Current reference | Frontend destination | Unresolved integration requirement |
| --- | --- | --- |
| Investment | `#/finance/investments/:investmentId` | Stable authorized relationship/cardinality; no implied financial command |
| Investor | `#/operation/investors/:investorId` | Operation read; account/access and KYC ownership stay separate |
| Opportunity | `#/operation/opportunities/:opportunityId` | Operation read; no approval/publication side effect |
| Ver gateway | `#/whitelabels/:whitelabelId/finance/gateways` | Payment's tenant configuration page only; no per-Gateway selection/deep-link contract |
| Wallet / movement | `#/finance/wallets/:walletId`, optionally `?movimento=:movementId` | Explicit source reference, not a credit/settlement guarantee |

Missing references yield notices/absence, not fabricated links. Future safe Gateway identity/projection, deep-link selection, scope and errors must be agreed separately (Q-FP-03, Q-GW-01–04). See [Gateways](07-whitelabel-finance-gateways.md), [Investments](13-finance-investments.md) and [Wallet](15-finance-wallet.md).

Dashboard Payments KPI/quick action now reaches the Payment list. This is **FRONTEND PROTOTYPED NAVIGATION** only: KPI values and service status remain non-integrated, with `Aguardando integração`; no financial aggregate/health contract is thereby implemented.

## Required contracts and completion boundary

Unresolved decisions include official Payment and PIX states; settlement definition; retries; multiple Payments per Investment; Payment without Investment; expiration; cancellation; refund/reversal/chargeback; Gateway webhook/event handling; reconciliation; idempotency; external references; authoritative source/amount/query/errors; permissions; concurrency/versioning; and audit. See [Q-FP-01–08](open-questions.md#finance-payments--pix) and [Q-FC-01–04](open-questions.md#finance-core-cross-cutting).

Retained A-07 lineage and A-10/A-13 narrower provider/PAG evidence are **CORE EXISTS** only within the original audit. They do not confirm this Payment/PIX lifecycle, global projection, webhook/retry/reconciliation guarantees or generic tenant Gateway contract. Target status is **CORE SUPPORT TO VERIFY / CONTROL PLANE EXPOSURE NEEDED / PRODUCT DECISION REQUIRED / INTEGRATION PENDING / E2E VALIDATION PENDING**; missing support requires **BACKEND IMPLEMENTATION NEEDED** after verification, not an invented existing API. Desired contracts remain separate from Core evidence and frontend fields. See [dependencies](matrices/backend-dependencies.md#finance-core-v1-dependencies) and [audit limits](audit-findings.md#finance-core-prototype-mapping--no-new-core-finding).

`PAYMENT_VIEW` is a **SPECIFICATION LABEL ONLY — RBAC NOT IMPLEMENTED**. `PAYMENT_VIEWED` is an **AUDIT POLICY DECISION REQUIRED** candidate only. No mutation permissions/events or financial commands are added. Completion requires agreed lifecycle/source/relationships, authorized sanitized reads, authoritative readback and E2E; [permissions](matrices/permissions.md#finance-core-permission-boundaries) and [audit](matrices/audit-events.md#finance-core-audit-policy) remain independent requirements.
