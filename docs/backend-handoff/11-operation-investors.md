# Operation / Investors V1

## Baseline and purpose

Status: **FRONTEND PROTOTYPED / INTEGRATION PENDING / E2E VALIDATION PENDING** at `dev@9f8abc6d55410e63a2edaf6d8efeafcd217b7a30`. Source: [Investor module](https://github.com/devLoor1/super-admin-Loor/tree/9f8abc6d55410e63a2edaf6d8efeafcd217b7a30/src/features/operation/investors), [participant projection](https://github.com/devLoor1/super-admin-Loor/blob/9f8abc6d55410e63a2edaf6d8efeafcd217b7a30/src/features/operation/shared/participants.ts), [frontend review record](https://github.com/devLoor1/super-admin-Loor/blob/9f8abc6d55410e63a2edaf6d8efeafcd217b7a30/docs/operation-investors-v1.md).

This is an independent **read-only operational projection**: find an Investor, inspect account/KYC/Investment context, then navigate to the responsible domain. It is not a second Accounts screen, an Investment editor or a Compliance decision surface. Core remains authoritative; Control Plane must not create a duplicate Investor/profile database to copy prototype records. Current shell authentication is acknowledged separately, not live Investor business integration/E2E evidence.

## Routes and current behavior

| Frontend route | Purpose |
| --- | --- |
| `#/operation/investors` | Global list across explicit Whitelabel contexts |
| `#/operation/investors/:investorId` | Read-only operational profile; unknown ID shows not-found |

Current behavior includes name/email/ID search, tenant/account/KYC/Investment-reference filters, sorting/pagination, local summary counts, detail, account context, KYC summary, illustrative Investment relationships, session activity and cross-domain navigation. Detail separates overview, Investments, Compliance/KYC and activity. Dates/nulls and missing context are presentation data, not Backend readback.

**No Investor creation, account mutation, KYC mutation or Investment mutation exists.** There are no amounts, balances, returns, wallet, Pix or payment actions. Global list/filter visibility is not an authorized global scope.

## Identity and account projection

Operational IDs currently reuse Accounts prototype IDs through a frontend projection. Tenant context remains explicit. This **FRONTEND PROTOTYPE MAPPING** does not establish a final Backend profile ID or one global identity across Whitelabels.

Product/Backend must define global versus tenant-scoped identity, Account ↔ Investor profile mapping/source, stable IDs and deduplication. No matching/merging of people across tenants is inferred (Q-OI-01–02).

Accounts owns identity, authentication/access context, account lifecycle/mutations and account-level tenant relationship. Its page-local pause/reactivate edits do **not automatically synchronize** with Operation's seed projections: **FRONTEND PROTOTYPE LIMITATION / INTEGRATION CONTRACT REQUIRED**, not Backend behavior or an authoritative access check. Actual freshness/state synchronization is Q-OC-01.

## Investments and KYC boundaries

Investment associations are illustrative, read-only and reference/count-oriented. The operational panel retains its amount-free `prototypeInvestments` associations; labels/modality/status read the local Opportunity store, while association IDs/dates remain seeds. **No amounts are used in this operational panel.** Finance Core separately owns its frozen Investment records/amounts/statuses; navigation to Finance does not merge or synchronize these datasets. A prototype tenant move does not migrate Investment lineage. Authoritative association/read scope is Q-OI-04 and Q-FI-03–05.

**Finance owns financial Investment concerns**, not Operation. [Finance / Investments V1](13-finance-investments.md) now supplies a read-only supervision destination; Ver investimentos opens `#/finance/investments?investidor=:investorId`. This is **FRONTEND PROTOTYPED NAVIGATION**, not a definitive Backend deep-link contract or financial action. [Operation Opportunities](10-operation-opportunities.md) owns Opportunity writes; Investor profile only reads/navigates. [Payments](14-finance-payments-pix.md) and [Wallet](15-finance-wallet.md) also consume participant/context references read-only; no account/financial/KYC mutation ownership is transferred.

KYC is a read-only contextual summary derived from the Accounts prototype dependency; its process/date metadata is illustrative. The display labels do not define the official KYC workflow. **Compliance / KYC owns review and decisions** and is not yet implemented in this frontend. There is no approval, rejection, document validation or risk decision here. Authoritative status/source/read policy remains Q-OI-03; KYC must not be inferred from access or suitability state.

## Cross-domain navigation

| Action | Existing behavior | Contract boundary |
| --- | --- | --- |
| Ver conta | `#/whitelabels/:whitelabelId/accounts?tipo=investidores` | Existing tenant/type tab only; no per-account deep-link contract |
| Opportunity reference | `#/operation/opportunities/:opportunityId` | Existing local Opportunity detail, not an Investment editor |
| Ver investimentos | `#/finance/investments?investidor=:investorId` | FRONTEND PROTOTYPED NAVIGATION; authoritative Finance source/IDs/read permissions/deep-link contract still to define |
| Ver no Compliance | Pending-module notice; no navigation | Compliance / KYC summary/deep link to define |

**CONTROL PLANE CONTRACT / DEEP LINK TO DEFINE** applies to the desired per-account/Investment/Compliance target semantics (Q-OI-05). These frontend hashes do not prescribe Backend routes or grants. Following a link does not authorize a destination-domain mutation.

## Required contracts, permissions and audit

Retained **CORE EXISTS** evidence covers scoped Admin Investor/account/portfolio reads (A-05), not a ready global Super Admin operational profile. Verify target support for profile source, identity/Account mapping, tenant/global scope, safe KYC and Investment relationship summaries, query/error/readback and deep links: **CORE SUPPORT TO VERIFY / CONTROL PLANE EXPOSURE NEEDED / PRODUCT DECISION REQUIRED**. Implement target support only where verified absent; retained missing operator/audit foundation remains **BACKEND IMPLEMENTATION NEEDED** at the audited baseline, not a fresh live deployment claim. See [dependencies](matrices/backend-dependencies.md#operation-v1-dependencies), [audit evidence](audit-findings.md#operation-prototype-mapping--no-new-core-finding) and [questions](open-questions.md#operation-investors).

`INVESTOR_VIEW` is a **SPECIFICATION LABEL ONLY — RBAC NOT IMPLEMENTED**; cross-domain grants remain with Accounts, Finance and Compliance. Operator/tenant/resource and field-level policy must be enforced server-side, not by filters.

`INVESTOR_VIEWED` is only a possible future event: **AUDIT POLICY DECISION REQUIRED**, not a mandatory confirmed writer. Current profile/tab/navigation activity is **local, non-persistent, non-authoritative and not audit**. See [permission boundaries](matrices/permissions.md#operation-permission-boundaries) and [audit policy](matrices/audit-events.md#operation-audit-policy).

Completion requires agreed identity/policy, verified/implemented Core sources, Control Plane safe authorized projection, authoritative reconciliation and E2E. Neither approved UI nor a session guard closes those needs; no new Core source/live API was audited for this chapter.
