# Audit Events

## Current Core events

**CURRENT CORE EVENT** means a writer call found at `eb12e282c52230114553bf5e8722542adc9efe78`, not a new Super Admin event or a runtime guarantee. Sources: [AuditLog model](https://github.com/devLoor1/backend/blob/eb12e282c52230114553bf5e8722542adc9efe78/app/Models/AuditLog.ts), [AuditLogService](https://github.com/devLoor1/backend/blob/eb12e282c52230114553bf5e8722542adc9efe78/app/Services/Audit/AuditLogService.ts), and [Terms controller](https://github.com/devLoor1/backend/blob/eb12e282c52230114553bf5e8722542adc9efe78/app/Controllers/Http/Admin/TermsOfUseController.ts). Additional caller paths are indexed in [audit findings](../audit-findings.md#core-source-index).

| Current action | Current domain | Classification |
| --- | --- | --- |
| `email_config.update`, `email_config.test` | SMTP configuration/test | CURRENT CORE EVENT |
| `email_template.create`, `email_template.update`, `email_template.delete`, `email_template.activate` | Tenant email templates | CURRENT CORE EVENT |
| `platform_asset.upload`, `platform_asset.replace`, `platform_asset.remove` | Platform assets | CURRENT CORE EVENT |
| `terms_of_use.publish` | Tenant Terms revision | CURRENT CORE EVENT |

The current table has Admin ID, module, entity ID, action, JSON metadata and timestamps. `recordSafe` catches/logs failures; a successful domain mutation does not guarantee a durable audit event. The model lacks dedicated operator/tenant/result/IP/user-agent/correlation fields and append-only protections. General account/lifecycle/reassignment audit and an audit query API were not found.

## Future Super Admin requirements

All names below are **FUTURE SUPER ADMIN REQUIREMENT**, not implemented event names or a promise that the associated command is approved. Architecture section 20 proposes immutable audit with actor/resource/tenant, sanitized state and correlation.

| Proposed event | Trigger | Safe record focus |
| --- | --- | --- |
| WHITELABEL_CREATED | Successful provisioning | Resource ID, allowed identity fields, scope/result |
| WHITELABEL_UPDATED | Allowed tenant update | Changed field names and sanitized allowed values |
| WHITELABEL_ACTIVATED | Agreed activation transition | Prior/resulting lifecycle state |
| WHITELABEL_DEACTIVATED | Agreed deactivation transition | State and reason reference, not account deletion |
| ACCOUNT_PAUSED | Authorized account pause | Actor type/ID, tenant, access-state transition, reason |
| ACCOUNT_REACTIVATED | Authorized access restoration | State transition; no implied validation changes |
| ACCOUNT_WHITELABEL_CHANGED | Authorized reassignment | Source/target tenant IDs and migration operation reference |
| ADMIN_CREATED | Managed tenant Admin provisioning | Admin/tenant IDs and provisioning mode; no password |
| ADMIN_UPDATED | Allowed Admin update | Safe changed-field list and permission/scope context |
| TERMS_PUBLISHED | Tenant revision publication | Revision ID/number, tenant, editor; no full legal content needed |
| PLATFORM_SETTINGS_UPDATED | Validated configuration update | Page/key, allowed sanitized difference; omit secret fields |

Architecture also requires relevant login success/failure, SMTP/gateway changes/tests and authorized Opportunity actions. Event coverage must be completed as those commands are scoped, without adding financial controls through this documentation task.

Proposed shared metadata: operator ID, actor type, resource type/ID, tenant ID, action, result, timestamp, correlation ID and reason/operation reference. Sanitized old/new fields, IP and user agent are subject to agreed access/retention policy. Failed and denied attempts need a defined policy; command success/failure must not be conflated.

Never store passwords, recovery/confirmation/service tokens, API keys, SMTP/PAG secret values, full credential payloads or complete sensitive documents. Audit read permission and retention/durability are [Q-AU-01–03](../open-questions.md#audit). Preserve current Core events while defining correlation between Core and Control Plane rather than inventing duplicate audit truth.
