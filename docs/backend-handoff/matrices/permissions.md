# Permissions

These are **SPECIFICATION LABELS ONLY — RBAC NOT IMPLEMENTED**. No operator role mapping, privilege grant, UI action or Core middleware is created by this document. Current Core guards and `Admin.isSuperAdmin` do not implement this matrix. Frontend status below refers to the approved local prototype at `4098158b1aa8f58ea20692f0e9bb177b36a49e97`, not delivered RBAC or authoritative commands. Admin permission areas display **A definir**; conceptual function labels assign no effective grants.

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
| EMAIL_SETTINGS_VIEW | Selected Whitelabel Emails overview | FRONTEND PROTOTYPED; local SMTP/events/template summary | Authorized tenant-scoped safe projection; no secret read access |
| EMAIL_SETTINGS_UPDATE | Allowed tenant email configuration/preferences | FRONTEND PROTOTYPED; local SMTP/event save/discard | Approved mutable operations and scope; umbrella label does not implicitly grant SMTP_TEST or every child action |
| SMTP_VIEW | SMTP metadata/configured state | FRONTEND PROTOTYPED; summary/read view/fixed mask | Existing password never readable; safe metadata only, resource/tenant checks |
| SMTP_UPDATE | SMTP/server/sender and write-only new-secret update | FRONTEND PROTOTYPED; local draft/save only | Secure write-only handling, validated preserve/replace/reset semantics, readback/conflicts and secret-free audit |
| SMTP_TEST | Authorized connectivity/test-send operation | FRONTEND PROTOTYPED; simulated confirmation/result only | Agreed destination/saved-state semantics, bounded side effects, sanitized failures/result and audit; no implicit permission from configuration view/update |
| EMAIL_EVENT_VIEW | Supported catalog and tenant preferences | FRONTEND PROTOTYPED; local event concepts/support labels | Authoritative catalog/effective state and tenant scope; illustrative events not assumed supported |
| EMAIL_EVENT_UPDATE | Permitted tenant event enable/disable | FRONTEND PROTOTYPED; independent Equity/Debt draft switches | Validate supported event, independent preferences, safe suppression/default policy, authoritative readback and audit |
| EMAIL_TEMPLATE_VIEW | Permitted template listing/event mapping/source | FRONTEND PROTOTYPED; illustrative summary only | Safe tenant/default provenance; actual template reads/mapping remain integration work |
| EMAIL_TEMPLATE_UPDATE | Future editor/version/publish operations once approved | Not prototyped; manage notice only | Product-approved editing/publishing/inheritance, operator/tenant scope, validation/version/readback and audit; no editor or grant delivered in V1 |
| GATEWAY_VIEW | Tenant gateway list/detail and sanitized credential status | FRONTEND PROTOTYPED; local illustrative state | Tenant/resource scope; no secret read access |
| GATEWAY_CREATE | Create tenant gateway configuration | FRONTEND PROTOTYPED; local only | Supported provider/schema, validation, authoritative readback and audit |
| GATEWAY_UPDATE | Update non-secret configuration or write-only credentials | FRONTEND PROTOTYPED; local save/discard | Separate allowed fields from secret rotation; sanitized errors/audit |
| GATEWAY_ACTIVATE | Activate configuration | FRONTEND PROTOTYPED; local only | Product-approved operational prerequisites/impact and audit |
| GATEWAY_DEACTIVATE | Deactivate configuration | FRONTEND PROTOTYPED; local only | Active-operation/fallback policy and audit; no implicit financial mutation |
| GATEWAY_TEST | Run bounded provider configuration test | FRONTEND PROTOTYPED; simulated only | Server-side test, rate/timeout policy and sanitized result/audit |
| BANK_ACCOUNT_VIEW | Tenant-related sanitized bank-account projection | FRONTEND PROTOTYPED; local masked data | Canonical ownership/resource scope; minimized sensitive fields |
| BANK_ACCOUNT_CREATE | Create account under the approved owner | FRONTEND PROTOTYPED; local only | Authoritative validation/verification, readback and audit |
| BANK_ACCOUNT_UPDATE | Update allowed account/status/Pix fields | FRONTEND PROTOTYPED; local only | Write-only sensitive values, concurrency/verification and audit |
| BANK_ACCOUNT_DELETE | Remove account when domain policy allows | FRONTEND PROTOTYPED; local remove only | Relationship/in-flight-operation constraints and durable audit |
| MODALITY_VIEW | Supported catalog and tenant modality detail | FRONTEND PROTOTYPED; Equity/Debt local catalog/detail | Confirm catalog; authorized tenant/resource projection, not a global grant |
| MODALITY_UPDATE | Allowed tenant modality configuration | FRONTEND PROTOTYPED; local governance only | Agreed mutable scope/validation/readback; umbrella label does not implicitly grant child operations |
| MODALITY_ENABLE | Enable modality for tenant | FRONTEND PROTOTYPED; immediate local change | Agreed enablement/dependency semantics, authorization and durable audit |
| MODALITY_DISABLE | Disable modality for tenant | FRONTEND PROTOTYPED; local confirmation | Active-business/Opportunity impact policy and authoritative preflight/readback; no financial cascade |
| MODALITY_RULE_VIEW | Rule catalog and effective/default/override reads | FRONTEND PROTOTYPED; generic concepts only | Agreed rule ownership, supported catalog/provenance and tenant/resource scope |
| MODALITY_RULE_UPDATE | Permitted modality rule override/reset | FRONTEND PROTOTYPED; two examples with local save/discard | Typed authoritative rules, validation/inheritance/conflicts/readback and sanitized audit; not an Opportunity editor |

`TERMS_PUBLISH` refines the prior provisional `TERMS_UPDATE` specification label; this is not a deployed permission rename or grant migration. Emails labels above specify separate read/update/test operations, not effective grants, roles or settled permission inheritance. Settings' SMTP summary shortcut does not authorize configuration or sending. `EMAIL_TEMPLATE_UPDATE` describes later capability, not a current editor/publisher.

The Admin reactivation/reassignment labels above only identify existing prototype flows; they do not approve V1 actor coverage or grant authority. Tenant activation/counterpart labels, Dashboard/audit reads, questionnaire/classification management and secret-configuration permission policy must still be completed before exposure. All account commands remain **BACKEND IMPLEMENTATION NEEDED / INTEGRATION PENDING / E2E VALIDATION PENDING** where the audit found no command. Settings/Emails commands likewise remain **CONTROL PLANE EXPOSURE NEEDED / INTEGRATION PENDING / E2E VALIDATION PENDING**, with Backend implementation/contract/security work where applicable. This is an initial matrix, not a complete production RBAC catalog. Decisions are in [Q-RB-01–04](../open-questions.md#rbac), [Q-PA-07](../open-questions.md#pause-reactivate), [Q-TR-01–04](../open-questions.md#tenant-reassignment), [Settings questions](../open-questions.md#settings), [SMTP](../open-questions.md#smtp), [event](../open-questions.md#email-events) and [template decisions](../open-questions.md#email-templates).

Proposed acceptance: unauthorized operator, unauthorized tenant, wrong resource ownership and ordinary actor/service-token confusion are rejected server-side. Tests should cover global versus tenant scope, privilege escalation and disabled operators. Do not reuse a customer's token as service authentication or log credential payloads during permission diagnostics.

Modality labels remain **SPECIFICATION LABELS ONLY — RBAC NOT IMPLEMENTED**. Local controls grant no authority. Real ownership/operation boundaries are [Q-MO-05–06, Q-MO-11](../open-questions.md#modalities--rules), under existing Q-RB-01–04. Modality update does not imply enable/disable/rule-update permission; no financial permission or Segment/Resource Use management permission is added. See [Modalities / Rules](../08-whitelabel-finance-modalities-rules.md#permissions-audit-and-completion).
