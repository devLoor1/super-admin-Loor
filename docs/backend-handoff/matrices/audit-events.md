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

## Frontend local feedback — not an audit capability

Approved frontend `ec86b475e0126667e2fbece490730bdecc271584` includes account-control local history for pause, reactivate, simulated Whitelabel-change requests and Admin additions. Its illustrative history is session-only and reset on reload; no Core/Control Plane event is emitted or persisted. Settings adds local save/Terms feedback, Emails adds local SMTP/event feedback, and Finance adds local gateway/bank/test, modality enable/disable/rule-save/discard and independent Segment/Resource Use create/update/delete activity. Catalog status edits are local updates, not separate authoritative activation events. No real email, provider, banking or financial operation occurs. They do not implement the future uppercase event names below, command authorization, audit durability or an event query API.

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
| ACCOUNT_WHITELABEL_CHANGE_REQUESTED | Authorized reassignment request/preflight, if that stage is approved | Source/target tenant IDs, eligibility/result and request correlation; no claim that migration completed |
| ACCOUNT_WHITELABEL_CHANGED | Authorized reassignment | Source/target tenant IDs and migration operation reference |
| ADMIN_CREATED | Managed tenant Admin provisioning | Admin/tenant IDs and provisioning mode; no password |
| ADMIN_UPDATED | Allowed Admin update | Safe changed-field list and permission/scope context |
| TERMS_PUBLISHED | Authorized authoritative tenant revision publication | Core revision ID/number and prior current revision reference, tenant/operator/correlation/result; no full legal content needed |
| PLATFORM_SETTINGS_UPDATED | Validated Identity/Experience configuration update/reset | Section/key, default-versus-override operation and allowed sanitized difference; tenant/operator/correlation/result; omit secrets |
| PLATFORM_ASSET_UPDATED | Authorized asset upload/replace/remove or agreed default reset | Tenant/asset ID and type, operation, permitted old/new references and correlation/result; no file bytes or signed-access tokens |
| PLATFORM_FEATURE_UPDATED | Authorized established capability update/reset | Authoritative flag key, permitted prior/new value/provenance, tenant/operator/correlation/result; not a generic entitlement grant |
| SMTP_CONFIGURATION_UPDATED | Authorized successful scoped SMTP update | Configuration/tenant/operator, changed field names and sanitized before/after metadata, result/time/correlation; never old/new password |
| SMTP_TEST_REQUESTED | Authorized real test request accepted | Configuration/tenant/operator, agreed test kind/destination metadata and correlation/time; no credential payload |
| SMTP_TEST_SUCCEEDED | Real test reaches the agreed success criterion | Request correlation, result/time and safe provider outcome; distinguish connectivity/dispatch from delivery |
| SMTP_TEST_FAILED | Real test fails under the agreed contract | Correlated sanitized failure code/result/time; no raw provider exception or secret |
| EMAIL_EVENT_ENABLED | Authorized supported-event preference enabled | Tenant/event/operator, sanitized prior/new preference/effective state and result/time/correlation |
| EMAIL_EVENT_DISABLED | Authorized supported-event preference disabled | Tenant/event/operator, sanitized prior/new preference/effective state and result/time/correlation; not proof a queued send was cancelled |
| EMAIL_TEMPLATE_UPDATED | Future authorized template editing/version update | Tenant/template/event mapping, revision references and sanitized changed-field metadata/result/time/correlation; no full content required |
| EMAIL_TEMPLATE_PUBLISHED | Future authorized template revision publication | Tenant/template/event and published revision references, prior state, operator/result/time/correlation; publishing workflow not yet prototyped |
| GATEWAY_CONFIGURATION_CREATED | Authorized configuration creation | Operator/Whitelabel/gateway/provider identifiers, sanitized configuration and result; no credentials |
| GATEWAY_CONFIGURATION_UPDATED | Authorized non-secret or write-only credential update | Sanitized changed-field list/before-after metadata; never secret values |
| GATEWAY_ACTIVATED | Authorized activation after approved prerequisites | Prior/resulting state, operational decision reference, result/correlation |
| GATEWAY_DEACTIVATED | Authorized deactivation | Prior/resulting state, reason/policy result; no implied financial-state mutation |
| GATEWAY_TEST_REQUESTED | Bounded server-side test accepted | Gateway/provider/environment, operator/tenant and correlation; no credential payload |
| GATEWAY_TEST_SUCCEEDED | Test meets the agreed success criterion | Correlated sanitized result and timing; not proof of payment readiness unless explicitly defined |
| GATEWAY_TEST_FAILED | Test fails or times out | Correlated safe failure code/result; no raw provider exception or secret |
| BANK_ACCOUNT_CREATED | Authorized account creation | Operator/Whitelabel/canonical owner/account ID, masked metadata, verification/result |
| BANK_ACCOUNT_UPDATED | Authorized allowed update | Sanitized changed fields and masked state; no full account/Pix values |
| BANK_ACCOUNT_ACTIVATED | Authorized status transition | Prior/resulting status, owner/account reference and result |
| BANK_ACCOUNT_DEACTIVATED | Authorized status transition | Prior/resulting status, constraints/result and correlation |
| BANK_ACCOUNT_REMOVED | Authorized removal under domain constraints | Owner/account reference, reason/result and correlation; no sensitive values |
| MODALITY_ENABLED | Future authorized tenant enablement after approved prerequisites | Operator/Whitelabel/modality, sanitized prior/new enablement, result/time/correlation; no claim of provider health |
| MODALITY_DISABLED | Future authorized disable under active-business/impact policy | Operator/Whitelabel/modality, sanitized state and policy outcome, result/time/correlation; no inferred financial cascade |
| MODALITY_RULES_UPDATED | Future validated allowed rule update/reset | Operator/Whitelabel/modality, changed rule keys, sanitized before/after and provenance/version when agreed, result/time/correlation; no sensitive financial/credential data |
| SEGMENT_CREATED | Future authorized Segment creation | Operator, agreed Whitelabel/context, catalog and Segment ID, sanitized created state, result/time/correlation |
| SEGMENT_UPDATED | Future validated allowed Segment update | Independent Segment ID/catalog, sanitized before/after, changed fields/version, operator/context/result/time/correlation |
| SEGMENT_DELETED | Future authorized Segment deletion under reference/retention policy | Segment/catalog/context reference, safe policy outcome and result/time/correlation; no implied Resource Use or Opportunity cascade |
| SEGMENT_ACTIVATED | Future supported Segment activation/reactivation | Independent Segment identity, sanitized prior/new state, operator/context/result/time/correlation |
| SEGMENT_INACTIVATED | Future supported Segment inactivation | Independent Segment identity, state and safe constraint outcome, operator/context/result/time/correlation; not deletion |
| RESOURCE_USE_CREATED | Future authorized Resource Use creation | Operator, agreed Whitelabel/context, catalog and Resource Use ID, sanitized created state, result/time/correlation |
| RESOURCE_USE_UPDATED | Future validated allowed Resource Use update | Independent Resource Use ID/catalog, sanitized before/after, changed fields/version, operator/context/result/time/correlation |
| RESOURCE_USE_DELETED | Future authorized Resource Use deletion under reference/retention policy | Resource Use/catalog/context reference, safe policy outcome and result/time/correlation; no implied Segment or Opportunity cascade |
| RESOURCE_USE_ACTIVATED | Future supported Resource Use activation/reactivation | Independent Resource Use identity, sanitized prior/new state, operator/context/result/time/correlation |
| RESOURCE_USE_INACTIVATED | Future supported Resource Use inactivation | Independent Resource Use identity, state and safe constraint outcome, operator/context/result/time/correlation; not deletion |

Architecture also requires relevant login success/failure, SMTP/gateway changes/tests and authorized Opportunity actions. Event coverage must be completed as those commands are scoped, without adding financial controls through this documentation task.

The prototype's simulated request corresponds only to a future request-stage concept, never proof of `ACCOUNT_WHITELABEL_CHANGED`. Account, Settings and Emails actions have local UI demonstrations; `ADMIN_UPDATED` and template editing/publication remain future-only. Settings feedback does not emit `PLATFORM_SETTINGS_UPDATED`, `PLATFORM_ASSET_UPDATED`, `PLATFORM_FEATURE_UPDATED` or `TERMS_PUBLISHED`. Emails activity emits none of the SMTP/event/template uppercase names. Existing Core `email_config.*`, `email_template.*`, `platform_asset.*` and `terms_of_use.publish` writer calls must not be relabeled as delivered Super Admin events. Every proposed event remains **BACKEND IMPLEMENTATION NEEDED / INTEGRATION PENDING / E2E VALIDATION PENDING** for Control Plane audit; Product still defines event coverage and success/failure guarantees.

Finance session activity emits none of these events. Future records may include operator, Whitelabel, gateway/account/modality identifier, changed rule keys, affected configuration/action, sanitized before/after state, result, timestamp and `correlation_id`. They must never include passwords, API secrets, full credentials, sensitive financial data or sensitive bank/Pix values. The proposed modality names are future requirements, not evidence of existing Core writer calls. [Q-MO-12](../open-questions.md#modalities--rules) extends Q-AU-01–03 for their success/failure/denial coverage, ownership and durability; rule save/discard feedback is not authoritative audit.

Catalog activity is likewise **local/session-only, non-persistent and not authoritative audit**. The ten Segment/Resource Use names above are future requirements, not delivered Core/Control Plane events. Activation/inactivation coverage depends on the final lifecycle contract; local status editing is not evidence of separate writer calls. Safe metadata may include operator, Whitelabel/context only as agreed by ownership, catalog, independent record ID, sanitized before/after, result, timestamp and `correlation_id`. Same-name records must not collapse into one audit identity. [Q-CAT-12](../open-questions.md#segments--resource-uses) extends Q-AU-01–03 for durability, query authorization, failure/denial policy and Core/Control Plane correlation. See [chapter 09](../09-whitelabel-finance-segments-resource-uses.md#permissions-and-audit).

Proposed shared metadata: operator ID, actor type, resource type/ID, tenant ID, action, result, timestamp, correlation ID and reason/operation reference. Sanitized old/new fields, IP and user agent are subject to agreed access/retention policy. Failed and denied attempts need a defined policy; command success/failure must not be conflated.

Never store passwords, recovery/confirmation/service tokens, API keys, SMTP/PAG secret values, full credential payloads or complete sensitive documents. Audit read permission and retention/durability are [Q-AU-01–03](../open-questions.md#audit). Preserve current Core events while defining correlation between Core and Control Plane rather than inventing duplicate audit truth.

For Emails, Q-AU-01–03 must cover configuration/test/preference changes and later template operations, including which failed/denied attempts are mandatory, shared request/result correlation and sanitized before/after fields. Test outcome semantics are [Q-SM-02](../open-questions.md#smtp); template publishing/version semantics are [Q-ET-02](../open-questions.md#email-templates). These references extend the existing canonical audit questions rather than create a competing event-policy list. See [Emails V1](../06-whitelabel-emails.md#permissions-audit-and-completion-boundary).
