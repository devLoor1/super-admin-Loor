# Permissions

These are **SPECIFICATION LABELS ONLY — RBAC NOT IMPLEMENTED**. No operator role mapping, privilege grant, UI action or Core middleware is created by this document. Current Core guards and `Admin.isSuperAdmin` do not implement this matrix. Frontend status below refers to the approved local prototype at `df87de8e5d3ded2da3915c5de602620c282ab5ba`, not delivered RBAC or authoritative commands. Admin permission areas display **A definir**; conceptual function labels assign no effective grants.

Architecture sections 24 and 30 require independent operator authorization plus validated resource/tenant ownership. Global reads need an explicitly granted global scope; tenant-scoped permission does not imply access to every tenant. A frontend filter or hidden button is never an authorization control.

| Conceptual label | Resource or operation | Frontend status | Required boundary |
| --- | --- | --- | --- |
| WHITELABEL_VIEW | Registry list/detail | FRONTEND PROTOTYPED; local | Authorized global or assigned-tenant read scope |
| WHITELABEL_CREATE | Provision tenant | Not prototyped; notice only | Validated creation, audit, readback |
| WHITELABEL_UPDATE | Mutable tenant fields | Not prototyped; notice only | Allowed fields and resource scope |
| WHITELABEL_PAUSE | Tenant lifecycle action | Not prototyped | Agreed lifecycle semantics; not account pause |
| WHITELABEL_ADMIN_VIEW | Tenant Admin list/detail | FRONTEND PROTOTYPED; local | Safe fields; no password/recovery token |
| WHITELABEL_ADMIN_CREATE | Tenant Admin provisioning | FRONTEND PROTOTYPED; local addition only | Agreed invitation/provisioning, credential/duplicate/RBAC policy |
| WHITELABEL_ADMIN_UPDATE | Tenant Admin metadata | Not prototyped; no update editor | Protect privilege and tenant ownership |
| WHITELABEL_ADMIN_PAUSE | Admin access control | FRONTEND PROTOTYPED; local access state | New Core access-state semantics and audit; actor coverage pending |
| WHITELABEL_ADMIN_REACTIVATE | Restore Admin access | FRONTEND PROTOTYPED; local access state | Preserve invitation/function; privileged/last-admin policy pending |
| WHITELABEL_ADMIN_CHANGE_WHITELABEL | Explicit Admin reassignment command | FRONTEND PROTOTYPED; simulation only | Eligibility, destination scope/grants and historical lineage policy pending |
| INVESTOR_VIEW | Investor/detail/history projection | FRONTEND PROTOTYPED; local | Tenant ownership and field-level data policy |
| INVESTOR_PAUSE | Investor access control | FRONTEND PROTOTYPED; local access state | Preserve validation/financial lineage |
| INVESTOR_REACTIVATE | Restore Investor access | FRONTEND PROTOTYPED; local access state | Do not implicitly approve KYC or verification |
| INVESTOR_CHANGE_WHITELABEL | Explicit reassignment command | FRONTEND PROTOTYPED; simulation only | Preflight and historical lineage policy |
| ENTREPRENEUR_VIEW | Entrepreneur/company/Opportunity reads | FRONTEND PROTOTYPED; local summaries | Tenant ownership and safe related data |
| ENTREPRENEUR_PAUSE | Entrepreneur access control | FRONTEND PROTOTYPED; local access state | Preserve Company and Opportunity state |
| ENTREPRENEUR_REACTIVATE | Restore Entrepreneur access | FRONTEND PROTOTYPED; local access state | Do not implicitly validate Company or approve Opportunity |
| ENTREPRENEUR_CHANGE_WHITELABEL | Explicit reassignment command | FRONTEND PROTOTYPED; simulation only | Core-owned migration policy and audit |
| PLATFORM_SETTINGS_VIEW | General/Identity/Experience tenant settings read | FRONTEND PROTOTYPED; local context/default/override display | Safe typed projection, provenance and explicit authorized tenant |
| PLATFORM_SETTINGS_UPDATE | Allowed tenant Identity/Experience values/reset | FRONTEND PROTOTYPED; local save/discard only | Agreed mutable fields/inheritance, server validation, conflicts/readback and sanitized audit; no General identity/lifecycle edits |
| PLATFORM_ASSETS_VIEW | Logo/favicon metadata and delivery | FRONTEND PROTOTYPED; illustrative/local preview | Authorized safe asset metadata and agreed delivery policy |
| PLATFORM_ASSETS_UPDATE | Permitted upload/replace/remove or restore-default | FRONTEND PROTOTYPED; local selection only | Tenant ownership, authoritative content/size validation, storage/cleanup and audit |
| PLATFORM_FEATURES_VIEW | Established tenant capability values | FRONTEND PROTOTYPED; four local concepts | Exact flag mapping/provenance; separate display, enforcement and RBAC |
| PLATFORM_FEATURES_UPDATE | Allowed capability override/reset | FRONTEND PROTOTYPED; local switches only | Product-approved semantics, scoped server validation and audit; not generic entitlements |
| TERMS_VIEW | Tenant current/history content and permitted acceptance reads | FRONTEND PROTOTYPED; Settings content/history and Investor revisions | Separate public legal content from personal acceptance evidence; tenant scope |
| TERMS_PUBLISH | Publish tenant legal revision | FRONTEND PROTOTYPED; session-only publication | Agreed editorial/publishing governance, authoritative revision/readback and audit; no automatic reacceptance |

`TERMS_PUBLISH` refines the prior provisional `TERMS_UPDATE` specification label; this is not a deployed permission rename or grant migration. SMTP management permissions remain to be scoped separately; a summary shortcut does not authorize configuration or sending.

The Admin reactivation/reassignment labels above only identify existing prototype flows; they do not approve V1 actor coverage or grant authority. Tenant activation/counterpart labels, Dashboard/audit reads, questionnaire/classification management and secret-configuration permissions must still be completed with the agreed policy before exposure. All account commands remain **BACKEND IMPLEMENTATION NEEDED / INTEGRATION PENDING / E2E VALIDATION PENDING** where the audit found no command. Settings commands likewise remain **CONTROL PLANE EXPOSURE NEEDED / INTEGRATION PENDING / E2E VALIDATION PENDING**, with Backend implementation/contract work where applicable. This is an initial matrix, not a complete production RBAC catalog. Decisions are in [Q-RB-01–04](../open-questions.md#rbac), [Q-PA-07](../open-questions.md#pause-reactivate), [Q-TR-01–04](../open-questions.md#tenant-reassignment) and [Settings questions](../open-questions.md#settings).

Proposed acceptance: unauthorized operator, unauthorized tenant, wrong resource ownership and ordinary actor/service-token confusion are rejected server-side. Tests should cover global versus tenant scope, privilege escalation and disabled operators. Do not reuse a customer's token as service authentication or log credential payloads during permission diagnostics.
