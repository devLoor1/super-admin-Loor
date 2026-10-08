# Operation / Entrepreneurs V1

## Baseline and purpose

Status: **FRONTEND PROTOTYPED / INTEGRATION PENDING / E2E VALIDATION PENDING** at `dev@9f8abc6d55410e63a2edaf6d8efeafcd217b7a30`. Source: [Entrepreneur module](https://github.com/devLoor1/super-admin-Loor/tree/9f8abc6d55410e63a2edaf6d8efeafcd217b7a30/src/features/operation/entrepreneurs), [participant projection](https://github.com/devLoor1/super-admin-Loor/blob/9f8abc6d55410e63a2edaf6d8efeafcd217b7a30/src/features/operation/shared/participants.ts), [frontend review record](https://github.com/devLoor1/super-admin-Loor/blob/9f8abc6d55410e63a2edaf6d8efeafcd217b7a30/docs/operation-entrepreneurs-v1.md).

This independent **read-only operational projection** finds an originator/representative, shows account/Company and KYC context, reads linked Opportunities and navigates to the responsible domain. It does not duplicate Accounts or Opportunity mutations. Core remains authoritative; no duplicate Entrepreneur/profile persistence belongs in Control Plane. Current shell login/session integration is separate from this non-integrated business prototype.

## Routes and current behavior

| Frontend route | Purpose |
| --- | --- |
| `#/operation/entrepreneurs` | Global list across explicit Whitelabel contexts |
| `#/operation/entrepreneurs/:entrepreneurId` | Read-only profile; unknown ID shows not-found |

Current behavior includes name/email/ID search, tenant/account/KYC/Opportunity-relationship filters, sorting/pagination, local summary counts, account and limited Company context, KYC summary, linked Opportunities, session activity and navigation to Accounts/Opportunities/future Compliance. Detail separates overview, Opportunities, Compliance/KYC and activity. Global visibility is not a global authorization grant.

**No Entrepreneur creation, account mutation, Opportunity mutation inside this module or KYC mutation exists.** No corporate/bank/document editor or financial operation is introduced.

## Identity and person-company model

Operational IDs reuse/projection of Accounts prototype records and appear as Opportunity `entrepreneurId` references. This is a **FRONTEND PROTOTYPE MAPPING**, not final Backend modeling. Explicit tenant context does not establish global identity, deduplication or entity ownership.

Product/Backend must define person versus company/legal entity, representative versus originator, multiple representatives/entities, global versus tenant identity and Account ↔ operational profile mapping (Q-OE-01–02). Company name/validation shown here is limited to existing Accounts prototype context; it does not establish a full corporate structure or KYC approval.

Accounts owns identity, authentication/access, account lifecycle/mutations and account-level tenant association. Account page pause/reactivate edits do not automatically synchronize into Operation's seed projection: **FRONTEND PROTOTYPE LIMITATION / INTEGRATION CONTRACT REQUIRED**, not Backend behavior. Source/freshness/synchronization remain Q-OC-01.

## Opportunity relationship

Linked counts/list/status/classification and latest dated update read the **Opportunity local store live**, not duplicated Opportunity state. Session create/edit/reassignment in the Opportunity module is reflected by these reads; the Entrepreneur module does not write that store. Null dates cannot displace a known latest date; absent dates remain missing presentation data, not manufactured readback.

Ver oportunidades opens `#/operation/opportunities?empreendedor=:id`, a removable contextual filter. Individual references open the existing Opportunity detail. This is frontend prototype navigation, not authoritative relationship enforcement or a Backend endpoint.

The prototype has one optional Entrepreneur reference per Opportunity. Actual required/optional relationship and one-versus-many cardinality remain **PRODUCT DECISION REQUIRED / BACKEND DECISION REQUIRED** (Q-OE-03 and Q-OP-06). No representative/company cardinality, cross-tenant reassignment or historical lineage is inferred. [Operation Opportunities](10-operation-opportunities.md) retains create/edit/status/classification ownership; official workflow is unresolved there.

## KYC evidence boundary

Entrepreneur KYC is **FRONTEND ILLUSTRATIVE DATA**. Existing Accounts prototype records lack equivalent Entrepreneur KYC, so Operation supplies illustrative status/date/process references explicitly labelled as a prototype summary. These values are **not Core/Backend evidence**, Company validation readback or official KYC workflow.

**Compliance / KYC owns reviews/decisions** and is not implemented in this frontend. There is no approve/reject, document validation or risk decision. Ver no Compliance gives a controlled pending-module notice without navigation. Authoritative source/state/Company-validation relation and safe fields remain Q-OE-04.

## Cross-domain navigation

| Action | Existing behavior | Unresolved contract |
| --- | --- | --- |
| Ver conta | `#/whitelabels/:whitelabelId/accounts?tipo=empreendedores` | Existing tenant/type tab, not a per-account deep link |
| Ver oportunidades | `#/operation/opportunities?empreendedor=:id` | Prototype contextual relationship/filter; authoritative source/cardinality unresolved |
| Opportunity reference | `#/operation/opportunities/:opportunityId` | Existing local detail; writes remain in Opportunities |
| Ver no Compliance | Pending-module feedback; no navigation | Compliance summary/process destination to define |

Desired account/process deep links are **CONTROL PLANE CONTRACT / DEEP LINK TO DEFINE** (Q-OE-05); no Backend route or permission is invented. Finance retains investments/payments/Pix/wallet and financial mutations; no such action belongs here.

## Required contracts, permissions and audit

Retained **CORE EXISTS** evidence covers scoped Admin Entrepreneur/Company reads and separate Opportunity lineage (A-05/A-07), not this target Super Admin projection or an authoritative person/company model. **CORE SUPPORT TO VERIFY / CONTROL PLANE EXPOSURE NEEDED / PRODUCT DECISION REQUIRED** apply to profile source/Account mapping, person-company identity, tenant/global scope, Opportunity relationships, KYC sources, query/errors/readback and cross-domain destinations. **BACKEND IMPLEMENTATION NEEDED** applies to retained missing foundation/audit and conditionally to support verified absent, never inferred from seeds. See [dependencies](matrices/backend-dependencies.md#operation-v1-dependencies), [audit evidence](audit-findings.md#operation-prototype-mapping--no-new-core-finding) and [questions](open-questions.md#operation-entrepreneurs).

`ENTREPRENEUR_VIEW` is a **SPECIFICATION LABEL ONLY — RBAC NOT IMPLEMENTED**. Accounts, Opportunities, Finance and Compliance keep their own command grants. Filters/visible links do not enforce tenant/resource authorization.

`ENTREPRENEUR_VIEWED` is a possible future event only: **AUDIT POLICY DECISION REQUIRED**. Session activity is **local, non-persistent, non-authoritative and not audit**. Potential future records require agreed sanitized metadata/durability, not copies of illustrative values. See [permissions](matrices/permissions.md#operation-permission-boundaries) and [audit](matrices/audit-events.md#operation-audit-policy).

Authoritative integration/E2E remains pending until identity/policy and Core/Control Plane contracts are agreed, delivered and validated. Prototype approval does not resolve those dependencies or imply current Backend capability; no new Core/live investigation is performed here.
