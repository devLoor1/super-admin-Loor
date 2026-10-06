# Whitelabel Account Control

## Approved frontend prototype

Whitelabel Account Control V1 is **FRONTEND PROTOTYPED** at approved `dev@cc28f3c26e6a9ec0e905ca04c4a1f49c468e0d7a`. Source: `src/features/whitelabel-accounts/` ([approved module](https://github.com/devLoor1/super-admin-Loor/tree/cc28f3c26e6a9ec0e905ca04c4a1f49c468e0d7a/src/features/whitelabel-accounts)). Route: `#/whitelabels/:whitelabelId/accounts`, with optional `?tipo=investidores`, `?tipo=empreendedores` or `?tipo=administradores`.

The UI includes Whitelabel context, three account tabs, search, separate access/business filters, sorting/paging, account detail, account-specific states, dependency summaries, Terms/profile display, pause/reactivate, Change Whitelabel simulation, local Admin creation and local history/feedback. Responsive and accessible interaction states were reviewed, including keyboard/focus/dialog behavior and reduced-motion/static fallbacks. All data/actions are illustrative and local; reload resets them. No authentication, business API, authoritative persistence or financial mutation exists in this prototype.

Architecture sections 9, 13–14, 20, 24 and 30 still establish the management/read boundaries. UI approval demonstrates the flow; it does not authorize unresolved domain behavior or establish a Backend contract.

| Account type | Prototyped detail | Existing Core support and limits |
| --- | --- | --- |
| Whitelabel Administrator | Illustrative identity, tenant, conceptual function/permission areas, invitation/access state and dependency/history summaries | `Admin` has one nullable tenant FK, hidden password and `isSuperAdmin`. Dev/test registration is not tenant provisioning/invitation. No management list/detail/pause workflow found. |
| Investor | Illustrative identity/validation, classification/questionnaire state, Terms revisions, dependency/history summaries and access state | Scoped actor Admin reads and portfolio exist. Detail expects some profile/address data; global/incomplete-account reads need adaptation. Approve/deny is limited to manual validation, not general access control. |
| Entrepreneur | Illustrative identity, Company/CNPJ/validation, dependency/history summaries and access state | Scoped Admin list/detail/create/update/company services exist. No generic pause, deletion or reassignment domain found. Company validation is not account access state. |

Proposed reads should preserve missing/null distinctions and expose only fields permitted for the operator. Existing Investor Terms revision/acceptance and profile classification are relevant detail sources; equivalent Terms acceptance for every other actor is not evidenced. No account password, recovery token or credential plaintext should be returned.

## Pause and reactivate account

| Dimension | Classification |
| --- | --- |
| Frontend | FRONTEND PROTOTYPED |
| Backend | BACKEND IMPLEMENTATION NEEDED |
| Product | PARTIALLY DEFINED |
| Integration | INTEGRATION PENDING |
| E2E | E2E VALIDATION PENDING |

Confirmed intent: **pause temporarily prevents account access while preserving account data and history**. **Reactivate restores access without changing unrelated business or validation states**. Reactivation must not be presented as KYC approval, email verification, Company validation, suitability recalculation or financial settlement.

Current prototype: pause requires a reason, changes only local access state to **Pausada** and adds local feedback/history. Reactivate restores local **Ativa** without modifying business/validation state. Account data/history preservation is explicit in the copy and demonstrated in local state, not guaranteed by a Backend transaction. Neither action enforces real login denial, token revocation or background-operation policy.

No dedicated access-state field/service covering all three account types was found. Investor denial, Investor self soft-deletion, Entrepreneur tool disable and Whitelabel `is_active` do not implement this intent. Ordinary auth checks and private-module access are separate enforcement surfaces; no general all-session revocation command was found.

Backend needs a Core-owned access-control command and readback, enforcement across the agreed access surfaces, protected history and audited pause/reactivate transitions. The storage model and command routes remain undesigned. Login, existing tokens, password recovery, background operations, financial continuity, reactivation prerequisites and actor coverage are centralized in [Q-PA-01–07](open-questions.md#pause-reactivate). No policy is silently chosen here.

## Dependencies and preservation

Investor dependencies include profile/classification, personal/company/address data, KYC, Terms, bank/Pix information, Investment/Opportunity/contract linkage, payments/refunds, receipts/installments and wallet/cashout history. Investor wallet presentation aggregates operational records; it is not an independent balance record to move or edit.

Entrepreneur dependencies include personal/address/company data, globally unique Company CNPJ, Opportunities with their own tenant/provider lineage, documents, bank/Pix data, tools and financial/cashout references. Admin dependencies include tenant scope, menu configuration and authored administrative records. Core remains the authoritative owner of all these relationships.

Pause must preserve this data. Financial/background treatment remains a decision, not a reason to delete or fabricate records. Proposed audit records carry actor, target, tenant, reason/result and correlation with sanitized metadata; see [audit events](matrices/audit-events.md).

## Tenant association and reassignment

Status: **FRONTEND PROTOTYPED / BACKEND IMPLEMENTATION NEEDED / PRODUCT DECISION REQUIRED / INTEGRATION PENDING / E2E VALIDATION PENDING**.

The three-step Change Whitelabel simulation shows destination selection, linked-dependency impact/warning, then reason/confirmation. Completion records only a local simulated request and feedback. The account remains in its source tenant; no FK, dependency or historical lineage changes, and no migration request is submitted to Backend. A simulated outcome is not authoritative eligibility or migration success.

Current account models store one `whitelabel_id`; Admin allows null. Opportunity also has its own tenant. These fields are not a migration contract. Updating an account FK alone would not establish correct ownership for historical financial records, Terms, tenant-specific configuration, identity uniqueness, documents or provider credentials.

No supported reassignment service/API was found. A future command needs Core-owned preflight and invariants, permissions, explicit lineage policy, failure/readback handling and audit. Do not cascade or rewrite historical ownership by inference. See [Q-TR-01–04](open-questions.md#tenant-reassignment).

Backend remains responsible for eligibility, dependency validation, migration semantics, history ownership and safe persistence; Product must resolve the policy before integration.

## Admin creation prototype

**FRONTEND PROTOTYPED**, with **BACKEND IMPLEMENTATION NEEDED / PRODUCT DECISION REQUIRED / INTEGRATION PENDING / E2E VALIDATION PENDING**. The form demonstrates name, email, the selected Whitelabel, conceptual function/permission labels, invitation/access state and local duplicate handling. A successful local action adds an illustrative Admin with **Convite pendente**; permission areas remain **A definir**, not a role-to-grant matrix.

There is no real provisioning, invitation/email, credential generation or effective RBAC grant. Backend dependencies remain safe Admin provisioning/invitation, credential lifecycle, duplicate handling, RBAC, tenant scoping and audit. Local duplicate validation is not a server uniqueness policy. Allowed Admin updates are still future scope, not an implemented editor.

## Terms and Investor profile display

Investor detail prototypes accepted revision, current tenant revision and acceptance date, including missing/outdated states. These are local illustrative values. **CORE EXISTS** for current tenant Terms/Investor registration acceptance; **CONTROL PLANE EXPOSURE NEEDED / INTEGRATION PENDING / E2E VALIDATION PENDING** for authoritative reads. No publisher or forced reacceptance is implemented; coverage/governance remains [Q-TE-01–03](open-questions.md#terms).

Profile detail displays current classification and questionnaire completed/pending state, with null handling. No questionnaire, weights/ranges, classification override or per-Whitelabel editor exists. Questionnaire/classification remain global in the audited Core; local display does not imply persisted raw answers or answer-version history. Safe read exposure is pending; governance/versioning stays [Q-QU-01–03](open-questions.md#questionnaire) and [Q-CL-01–03](open-questions.md#classification).

Admin provisioning, account read scope, role distinction and acceptance visibility depend on [account](open-questions.md#accounts), [Terms](open-questions.md#terms) and [RBAC](open-questions.md#rbac) decisions. Conceptual permissions are in the [permissions matrix](matrices/permissions.md); they are not implemented permissions.
