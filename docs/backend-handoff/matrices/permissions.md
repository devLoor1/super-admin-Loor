# Permissions

These are **conceptual specification labels, NOT implemented permissions**. No operator role mapping, privilege grant, UI action or Core middleware is created by this document. Current Core guards and `Admin.isSuperAdmin` do not implement this matrix.

Architecture sections 24 and 30 require independent operator authorization plus validated resource/tenant ownership. Global reads need an explicitly granted global scope; tenant-scoped permission does not imply access to every tenant. A frontend filter or hidden button is never an authorization control.

| Conceptual label | Resource or operation | Required boundary |
| --- | --- | --- |
| WHITELABEL_VIEW | Registry list/detail | Authorized global or assigned-tenant read scope |
| WHITELABEL_CREATE | Provision tenant | Validated creation, audit, readback |
| WHITELABEL_UPDATE | Mutable tenant fields | Allowed fields and resource scope |
| WHITELABEL_PAUSE | Tenant lifecycle action | Agreed lifecycle semantics; not account pause |
| WHITELABEL_ADMIN_VIEW | Tenant Admin list/detail | Safe fields; no password/recovery token |
| WHITELABEL_ADMIN_CREATE | Tenant Admin provisioning | Agreed invitation/provisioning policy |
| WHITELABEL_ADMIN_UPDATE | Tenant Admin metadata | Protect privilege and tenant ownership |
| WHITELABEL_ADMIN_PAUSE | Admin access control | New Core access-state semantics and audit |
| INVESTOR_VIEW | Investor/detail/history projection | Tenant ownership and field-level data policy |
| INVESTOR_PAUSE | Investor access control | Preserve validation/financial lineage |
| INVESTOR_REACTIVATE | Restore Investor access | Do not implicitly approve KYC or verification |
| INVESTOR_CHANGE_WHITELABEL | Explicit reassignment command | Preflight and historical lineage policy |
| ENTREPRENEUR_VIEW | Entrepreneur/company/Opportunity reads | Tenant ownership and safe related data |
| ENTREPRENEUR_PAUSE | Entrepreneur access control | Preserve Company and Opportunity state |
| ENTREPRENEUR_REACTIVATE | Restore Entrepreneur access | Do not implicitly validate Company or approve Opportunity |
| ENTREPRENEUR_CHANGE_WHITELABEL | Explicit reassignment command | Core-owned migration policy and audit |
| PLATFORM_SETTINGS_VIEW | Tenant settings read | Safe projection and explicit tenant |
| PLATFORM_SETTINGS_UPDATE | Allowed tenant settings | Typed validation and sanitized audit |
| TERMS_VIEW | Tenant legal revision/acceptance reads | Separate public content from personal acceptance metadata |
| TERMS_UPDATE | Publish tenant legal revision | Agreed editorial/publishing governance and audit |

Counterpart activation/reactivation labels, Dashboard/audit reads, questionnaire/classification management and secret-configuration permissions must be completed with the agreed policy before exposure. This is a deliberately initial matrix, not a complete production RBAC catalog. Decisions are in [Q-RB-01–04](../open-questions.md#rbac).

Proposed acceptance: unauthorized operator, unauthorized tenant, wrong resource ownership and ordinary actor/service-token confusion are rejected server-side. Tests should cover global versus tenant scope, privilege escalation and disabled operators. Do not reuse a customer's token as service authentication or log credential payloads during permission diagnostics.
