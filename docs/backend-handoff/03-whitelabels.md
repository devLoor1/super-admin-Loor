# Whitelabels

## Mapped flows and current boundary

| Flow | Approved frontend behavior | Current Core finding | Required integration |
| --- | --- | --- | --- |
| List/search/filter/sort | Local illustrative records; no real pagination | Registry model and resolver exist; no management list API found | Scoped registry list, server pagination/filter/sort |
| Detail | Selected local identity and overview; clipboard actions | ID, slug, name, base URL, active flag and timestamps exist | Authoritative detail and safe aggregate references |
| Create | `Novo Whitelabel` gives a notice | No provisioning service/validator/API found | Validated creation with readback and audit |
| Edit | Notice only | No Whitelabel management update contract found | Explicit mutable fields, uniqueness/domain policy, audit |
| Lifecycle/status | Illustrative active/setup/draft/inactive labels | Boolean `is_active`; resolver checks are not a complete pause system | Product-defined transitions and Core access enforcement |
| Account context | Contas quick action opens the selected tenant's account-control prototype | Scoped actor reads exist; global management/access/reassignment contracts remain incomplete | Authorized account projections; no client-selected tenant as permission grant |
| Administrators | Placeholder Whitelabel detail tab; quick action opens account-control Administradores tab | Admin has nullable tenant FK and `isSuperAdmin`; no management CRUD found | Safe list/detail/provision/update/access control |
| Settings | FRONTEND PROTOTYPED: contextual route, per-section local edits/default display/preview | PARTIAL EXISTING CAPABILITIES: tenant platform settings/assets exist | Auth-aware Control Plane/internal exposure, typed schema, inheritance and write/readback contracts |
| Emails | FRONTEND PROTOTYPED: detailed SMTP, independent local event switches and template summary | Existing SMTP/template capabilities; per-tenant event preference support unknown | Scoped safe SMTP read/write/test, supported event catalog/preferences, template mapping; see Emails handoff |
| Finance / Gateways | FRONTEND PROTOTYPED: tenant-scoped gateway, write-only credential, bank-account and modality-summary configuration | CORE SUPPORT TO VERIFY: provider/PAG capabilities exist in narrower domains; no generic tenant gateway/bank model established | Scoped configuration contracts, secure secrets, ownership/RBAC/audit; no financial operation; see Finance handoff |
| Terms | FRONTEND PROTOTYPED: Settings current/history/local publication; Account Control current-revision coherence | Tenant Terms revision and registration acceptance services exist | Safe content/history/publication exposure; reacceptance/governance remain separate |
| Integrations | Placeholder tab/shortcut | SMTP and payment-provider/Opportunity credential capabilities exist in different domains | Safe configuration summaries; do not equate configured with healthy |
| Indicators | Quick-action notice; KPI counts absent | Operational domains exist; required registry/global aggregates absent | Core aggregates with agreed definitions |

Sources: [page](../../src/features/whitelabels/WhitelabelsPage.tsx), [list](../../src/features/whitelabels/WhitelabelListPanel.tsx), [detail](../../src/features/whitelabels/WhitelabelDetailPanel.tsx), [audit source index](audit-findings.md#core-source-index). Aplicações is an undefined visual concept, not a Core module catalog or implemented application-link relation.

Approved navigation is in [detail at the current frontend baseline](https://github.com/devLoor1/super-admin-Loor/blob/5f438035dbac1ec49df68fc3d9799c3fb5078c4a/src/features/whitelabels/WhitelabelDetailPanel.tsx). Contas opens `#/whitelabels/:whitelabelId/accounts`; Administradores adds `?tipo=administradores`. Both carry the selected Whitelabel into [account control](04-whitelabel-account-control.md). Configurações opens `#/whitelabels/:whitelabelId/settings`, detailed in [Settings V1](05-whitelabel-settings.md). The contextual E-mails navigation opens `#/whitelabels/:whitelabelId/emails`, detailed in [Emails V1](06-whitelabel-emails.md); Settings links directly to its SMTP section. None establishes authoritative ownership or tenant permissions. Whitelabel creation/lifecycle and the placeholder Integrações detail tab remain unchanged; Emails management is a separate local prototype, not real integration management.

Financeiro preserves tenant context and opens `#/whitelabels/:whitelabelId/finance/gateways`; see [Finance / Gateways V1](07-whitelabel-finance-gateways.md). Gateway/bank ownership, provider support and modality relationships remain non-authoritative.

## Identity and lifecycle

Core `Whitelabel` stores `id`, `slug`, `name`, `baseUrl`, `isActive` and timestamps. Prototype IDs (`wl_proto_*`) and displayed domain strings are not Backend IDs or an established base-URL/domain schema. Counts for Admins/Aplicações/Integrações and prototype status labels cannot be sent to Core as though persisted fields already exist.

Architecture section 8 proposes list/create/detail/update/status routes under `/internal/super-admin/v1/whitelabels`. None is a delivered current contract at the audit SHA. The actual Core registry and resolver support tenant identification, not full provisioning/lifecycle management.

Resolver paths filter active tenants and can fall back to a default tenant. Ordinary authenticated flows do not consistently enforce the active flag. Consequently setting `is_active=false` must not be described as safely revoking access, tokens or background operations. Account pause is also a separate capability from tenant deactivation.

Investor/Entrepreneur and Opportunity tenant FKs restrict tenant deletion. This is a persistence constraint, not an implemented archive/delete workflow. Lifecycle and identity decisions are [Q-WL-01–03](open-questions.md#whitelabel).

## Configuration and integration boundaries

Architecture sections 9–11 propose tenant Admins, platform settings and SMTP exposure. Current Terms APIs are actor-facing Core routes; platform settings have different tenant-enforcement paths from Terms and account controllers. Internal exposure must resolve this inconsistency, not blindly proxy an arbitrary client-selected tenant header.

Payment-provider resolution and encrypted PAG credentials do not satisfy the proposed generic gateway configuration model in architecture section 18. Current Crenor credential ownership is Opportunity-specific. Existing safe configured/masked metadata should be reused; stored SMTP/gateway secrets must never be returned to the browser or included in handoff examples or audit payloads. Authorized write-only secret input is a separate secure update contract, not permission to read an existing secret.

Terms tenant management is now locally prototyped in Settings; authoritative integration must reuse the existing Core legal domain without a duplicate Control Plane legal store. Publishing a revision and forcing existing-account reacceptance are different capabilities; the latter was not found. The shared frontend current-revision store does not deliver cross-system synchronization or change accepted-revision evidence.

Settings owns the SMTP status/shortcut; Emails owns detailed SMTP and event controls, using one shared local Emails store. Template content management remains future scope. This frontend ownership does not move authoritative configuration, delivery or templates out of Core. Event support/defaults and template resolution remain [Emails decisions](open-questions.md#email-events) and [template decisions](open-questions.md#email-templates).

See [backend matrix](matrices/backend-dependencies.md), [permissions](matrices/permissions.md), and canonical [Terms](open-questions.md#terms), [features](open-questions.md#features) and [account](open-questions.md#accounts) decisions before defining writes.
