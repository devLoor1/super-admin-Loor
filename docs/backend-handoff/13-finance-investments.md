# Finance / Investments V1

## Baseline and evidence

Status: **FRONTEND PROTOTYPED / INTEGRATION PENDING / E2E VALIDATION PENDING** at `dev@9f8abc6d55410e63a2edaf6d8efeafcd217b7a30`. Complete Finance Core V1 is a **READ-ONLY / SUPERVISORY PROTOTYPE**. Sources: [Investment module](https://github.com/devLoor1/super-admin-Loor/tree/9f8abc6d55410e63a2edaf6d8efeafcd217b7a30/src/features/finance-core/investments), [models](https://github.com/devLoor1/super-admin-Loor/blob/9f8abc6d55410e63a2edaf6d8efeafcd217b7a30/src/features/finance-core/shared/financeCoreModel.ts), [frozen records](https://github.com/devLoor1/super-admin-Loor/blob/9f8abc6d55410e63a2edaf6d8efeafcd217b7a30/src/features/finance-core/shared/financeCoreRecords.ts), and [frontend implementation/review](https://github.com/devLoor1/super-admin-Loor/blob/9f8abc6d55410e63a2edaf6d8efeafcd217b7a30/docs/finance-core-v1.md). These establish approved UI behavior, not Backend delivery, real transactions or live E2E.

## Routes and capabilities

| Frontend route | Current behavior |
| --- | --- |
| `#/finance/investments` | Global cross-Whitelabel list; optional `?investidor=:investorId` and/or `?wallet=:walletId` contextual filters |
| `#/finance/investments/:investmentId` | Read-only detail; unknown/malformed IDs show not-found |

The list supports ID/Investor/Opportunity search, Whitelabel/status/modality/payment-context filters, sorting, pagination and context removal. Local counts and illustrative amounts are not authoritative totals. Global presentation is not a global permission grant. Removing a context reconciles the URL while retaining the other context; clearing filters removes both.

Detail separates overview, Payment / PIX, Wallet / movements and session activity. It displays explicit Investor, Opportunity, related Payment and Wallet/movement references, amount/currency, dates/nulls and the Investment's own tenant/modality. Missing relations yield honest absence/notices, not an invented destination or financial state.

## Independent financial concepts

**INVESTMENT ≠ PAYMENT ≠ WALLET MOVEMENT ≠ WALLET BALANCE.**

`Investment` currently presents `investmentId`, `investorId`, `opportunityId`, `whitelabelId`, `modality`, `amount`, `currency`, `status`, optional `paymentId` and timestamps. These are **prototype fields**, not a settled API contract, authoritative amount or ownership model. Equity and Debt are the only current modalities; Capital de Giro remains an independent Segment/Resource Use concept, never a modality or financial rule.

Investor/Opportunity names resolve read-only from Operation records; the Investment retains its own recorded tenant/modality and shows differing current Opportunity context without rewriting either record. Related movements are found by explicit source IDs, directly or through the referenced Payment. Their presence does not establish Wallet ownership, ledger completeness or final cardinalities.

**No automatic synchronization is implemented or confirmed.** Payment paid does not make Investment active or credit a Wallet; Investment status does not change Payment status; movement changes do not change Payment state; represented balance is not the sum of displayed movements. Matching illustrative values/statuses are not a business rule. Future synchronization needs explicit Product/Backend event semantics, not frontend inference (Q-FC-01).

## Prototype state and action boundary

Pendente / Ativo / Encerrado is a **PROTOTYPE UX STATE MODEL**, not an official Investment lifecycle, transition graph, payment eligibility or settlement guarantee. There is **no official workflow** implemented here.

Allowed behavior is read/navigation: search, filter, sort, paginate, open, switch tabs and follow explicit references. There is no create, amount edit, manual status mutation, cancel, settlement, deletion or financial execution. No Investment, Payment, movement or balance is mutated; no business API/provider is called. Session activity is in-memory, non-persistent, non-authoritative and not audit.

## Cross-domain navigation and ownership

| Reference/action | Current frontend destination | Contract limit |
| --- | --- | --- |
| Ver investidor | `#/operation/investors/:investorId` | Operation projection; Accounts retains identity/access mutations; Compliance retains KYC |
| Ver oportunidade | `#/operation/opportunities/:opportunityId` | Operation owns Opportunity writes; this is not an approval/publication action |
| Ver pagamento / PIX | `#/finance/payments/:paymentId` | Independent Payment read; missing Payment remains absent |
| Ver Wallet / movement | `#/finance/wallets/:walletId`, optionally `?movimento=:movementId` | Explicit movement association, not inferred ownership/balance |
| Operation Investor: Ver investimentos | `#/finance/investments?investidor=:investorId` | **FRONTEND PROTOTYPED NAVIGATION**, not a definitive Backend deep-link contract |

Destination-domain/resource read permission and stable IDs must be defined independently. No navigation authorizes account, KYC, Opportunity or financial commands. See [Investor handoff](11-operation-investors.md), [Payments](14-finance-payments-pix.md) and [Wallet](15-finance-wallet.md).

## Required contracts and completion boundary

Keep unresolved: source of truth; authoritative amount/units/currency; official lifecycle/statuses; Investor and Opportunity relationships; Whitelabel ownership; payment cardinality and payment-to-Investment synchronization; cancellation and financial settlement semantics; Wallet/movement relationships; concurrency/versioning; permissions; sanitized query/error/readback contracts; and audit. Canonical questions: [Q-FI-01–06](open-questions.md#finance-investments) and [Q-FC-01–04](open-questions.md#finance-core-cross-cutting).

Retained **CORE EXISTS** evidence is only narrower portfolio/independent lineage (A-05/A-07), not a ready Super Admin Investment contract. **CORE SUPPORT TO VERIFY / CONTROL PLANE EXPOSURE NEEDED / PRODUCT DECISION REQUIRED** applies to target projections and semantics; **BACKEND IMPLEMENTATION NEEDED** only where target support is verified absent, plus the retained historical foundation/audit gaps. Verify/reuse authoritative Core support; do not duplicate financial persistence in Control Plane or invent callable APIs. See [dependency matrix](matrices/backend-dependencies.md#finance-core-v1-dependencies) and [audit evidence limits](audit-findings.md#finance-core-prototype-mapping--no-new-core-finding).

`INVESTMENT_VIEW` is a **SPECIFICATION LABEL ONLY — RBAC NOT IMPLEMENTED**. `INVESTMENT_VIEWED` is only an **AUDIT POLICY DECISION REQUIRED** candidate, not an implemented or necessarily required read writer. No financial mutation permissions/events are introduced. See [permissions](matrices/permissions.md#finance-core-permission-boundaries) and [audit policy](matrices/audit-events.md#finance-core-audit-policy).

Completion needs agreed source/relationships/policy, safe authorized Control Plane reads, authoritative amount/status/readback, errors/versioning/freshness and scoped E2E. Visual approval and a client session guard do not close these dependencies.
