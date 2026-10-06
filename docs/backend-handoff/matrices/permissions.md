# Permissions

These are **CONCEPTUAL / SPECIFICATION ONLY**, **NOT implemented permissions**. No operator role mapping, privilege grant, UI action or Core middleware is created by this document. Current Core guards and `Admin.isSuperAdmin` do not implement this matrix. Frontend status below refers to the approved local prototype at `cc28f3c26e6a9ec0e905ca04c4a1f49c468e0d7a`, not delivered RBAC or authoritative commands. Admin permission areas display **A definir**; conceptual function labels assign no effective grants.

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
| PLATFORM_SETTINGS_VIEW | Tenant settings read | Not prototyped; shortcut only | Safe projection and explicit tenant |
| PLATFORM_SETTINGS_UPDATE | Allowed tenant settings | Not prototyped | Typed validation and sanitized audit |
| TERMS_VIEW | Tenant legal revision/acceptance reads | FRONTEND PROTOTYPED; Investor revision display only | Separate public content from personal acceptance metadata |
| TERMS_UPDATE | Publish tenant legal revision | Not prototyped; no publisher | Agreed editorial/publishing governance and audit |

The Admin reactivation/reassignment labels above only identify existing prototype flows; they do not approve V1 actor coverage or grant authority. Tenant activation/counterpart labels, Dashboard/audit reads, questionnaire/classification management and secret-configuration permissions must still be completed with the agreed policy before exposure. All account commands remain **BACKEND IMPLEMENTATION NEEDED / INTEGRATION PENDING / E2E VALIDATION PENDING** where the audit found no command. This is a deliberately initial matrix, not a complete production RBAC catalog. Decisions are in [Q-RB-01–04](../open-questions.md#rbac), [Q-PA-07](../open-questions.md#pause-reactivate) and [Q-TR-01–04](../open-questions.md#tenant-reassignment).

Proposed acceptance: unauthorized operator, unauthorized tenant, wrong resource ownership and ordinary actor/service-token confusion are rejected server-side. Tests should cover global versus tenant scope, privilege escalation and disabled operators. Do not reuse a customer's token as service authentication or log credential payloads during permission diagnostics.
