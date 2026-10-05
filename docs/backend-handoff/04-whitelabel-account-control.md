# Whitelabel Account Control

## Planned scope

The UI is **TO BE PROTOTYPED**. No account-control screen, pause switch or tenant-transfer action exists in the approved frontend. Architecture sections 9, 13–14, 20, 24 and 30 establish the management/read boundaries; the user's new pause/reactivate intent extends the account plan but does not authorize unresolved domain behavior.

| Account type | Planned detail | Existing Core support and limits |
| --- | --- | --- |
| Whitelabel Administrator | Safe identity, tenant association, permissions and access state | `Admin` has one nullable tenant FK, hidden password and `isSuperAdmin`. Dev/test registration is not tenant provisioning/invitation. No management list/detail/pause workflow found. |
| Investor | Identity, tenant, email verification, KYC/validation, latest profile, Terms acceptance and financial references | Scoped actor Admin reads and portfolio exist. Detail expects some profile/address data; global/incomplete-account reads need adaptation. Approve/deny is limited to manual validation, not general access control. |
| Entrepreneur | Identity, tenant, personal/company data, Company validation, Opportunities and related documents/history | Scoped Admin list/detail/create/update/company services exist. No generic pause, deletion or reassignment domain found. Company validation is not account access state. |

Proposed reads should preserve missing/null distinctions and expose only fields permitted for the operator. Existing Investor Terms revision/acceptance and profile classification are relevant detail sources; equivalent Terms acceptance for every other actor is not evidenced. No account password, recovery token or credential plaintext should be returned.

## Pause and reactivate account

| Dimension | Classification |
| --- | --- |
| Frontend | TO BE PROTOTYPED |
| Backend | IMPLEMENTATION NEEDED |
| Product | PARTIALLY DEFINED |
| Integration | PENDING |

Confirmed intent: **pause temporarily prevents account access while preserving account data and history**. **Reactivate restores access without changing unrelated business or validation states**. Reactivation must not be presented as KYC approval, email verification, Company validation, suitability recalculation or financial settlement.

No dedicated access-state field/service covering all three account types was found. Investor denial, Investor self soft-deletion, Entrepreneur tool disable and Whitelabel `is_active` do not implement this intent. Ordinary auth checks and private-module access are separate enforcement surfaces; no general all-session revocation command was found.

Backend needs a Core-owned access-control command and readback, enforcement across the agreed access surfaces, protected history and audited pause/reactivate transitions. The storage model and command routes remain undesigned. Login, existing tokens, password recovery, background operations, financial continuity, reactivation prerequisites and actor coverage are centralized in [Q-PA-01–07](open-questions.md#pause-reactivate). No policy is silently chosen here.

## Dependencies and preservation

Investor dependencies include profile/classification, personal/company/address data, KYC, Terms, bank/Pix information, Investment/Opportunity/contract linkage, payments/refunds, receipts/installments and wallet/cashout history. Investor wallet presentation aggregates operational records; it is not an independent balance record to move or edit.

Entrepreneur dependencies include personal/address/company data, globally unique Company CNPJ, Opportunities with their own tenant/provider lineage, documents, bank/Pix data, tools and financial/cashout references. Admin dependencies include tenant scope, menu configuration and authored administrative records. Core remains the authoritative owner of all these relationships.

Pause must preserve this data. Financial/background treatment remains a decision, not a reason to delete or fabricate records. Proposed audit records carry actor, target, tenant, reason/result and correlation with sanitized metadata; see [audit events](matrices/audit-events.md).

## Tenant association and reassignment

Current account models store one `whitelabel_id`; Admin allows null. Opportunity also has its own tenant. These fields are not a migration contract. Updating an account FK alone would not establish correct ownership for historical financial records, Terms, tenant-specific configuration, identity uniqueness, documents or provider credentials.

No supported reassignment service/API was found. A future command needs Core-owned preflight and invariants, permissions, explicit lineage policy, failure/readback handling and audit. Do not cascade or rewrite historical ownership by inference. See [Q-TR-01–04](open-questions.md#tenant-reassignment).

Admin provisioning, account read scope, role distinction and acceptance visibility depend on [account](open-questions.md#accounts), [Terms](open-questions.md#terms) and [RBAC](open-questions.md#rbac) decisions. Conceptual permissions are in the [permissions matrix](matrices/permissions.md); they are not implemented permissions.
