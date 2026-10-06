# Whitelabel Settings V1

## Approved frontend and classification

Approved frontend: `dev@df87de8e5d3ded2da3915c5de602620c282ab5ba`. Route: `#/whitelabels/:whitelabelId/settings`. Source: `src/features/whitelabel-settings/` ([pinned module](https://github.com/devLoor1/super-admin-Loor/tree/df87de8e5d3ded2da3915c5de602620c282ab5ba/src/features/whitelabel-settings)). The [frontend review record](https://github.com/devLoor1/super-admin-Loor/blob/df87de8e5d3ded2da3915c5de602620c282ab5ba/docs/whitelabel-settings-v1.md) records prototype QA, not an integrated Backend capability.

| Dimension | Classification |
| --- | --- |
| Frontend | FRONTEND PROTOTYPED |
| Core | PARTIAL EXISTING CAPABILITIES |
| Control Plane | CONTROL PLANE EXPOSURE NEEDED |
| Backend | IMPLEMENTATION / CONTRACT WORK NEEDED WHERE APPLICABLE |
| Integration | INTEGRATION PENDING |
| E2E | E2E VALIDATION PENDING |

Core findings retain the historical read-only audit SHA `eb12e282c52230114553bf5e8722542adc9efe78`; this update does not re-audit Backend or establish live deployment parity. Existing actor-facing settings, asset, Terms and SMTP capabilities are not a Super Admin operator/service API.

## Prototype areas

| Area | Approved local behavior | Boundary |
| --- | --- | --- |
| General | Selected tenant identity/context, domain/public URL and lifecycle; copy controls | Read-only illustrative data; no identity, domain or lifecycle mutation |
| Identity | Logo/favicon selection and replacement simulation, primary/accent colors, source badges and local preview | Files remain local object URLs; no upload/storage/change to a running tenant application |
| Experience | Public name, slogan, institutional/login/empty-list messages, CTA label and Opportunity terminology | Structured frontend keys, not an accepted Backend schema; local default/override display and save/discard |
| Features | Perfil do investidor, Wallet, Investimento anônimo como padrão, Informações da oportunidade | Only established capability concepts; no generic plans/entitlements, effective RBAC or live feature enforcement |
| Terms | Current revision, revision history, content view and first/new local publication | Immediate session-only current revision; no legal publication or existing-user reacceptance |
| SMTP | Configured/not-configured/awaiting-integration summary and Gerenciar SMTP notice | Summary/shortcut only; no SMTP editor, credential handling or send/test operation in this block |

The local feature keys (`investorProfile`, `walletVisibility`, `anonymousInvestmentDefault`, `opportunityDetails`) do not prove one-to-one Core flag mappings. Profile availability is not questionnaire/classification governance; Wallet visibility is not financial-state mutation; anonymous default is not forced anonymity; Opportunity information visibility needs an agreed field scope. Exact effect, ownership and enforcement remain [Q-FE-01–03](open-questions.md#features).

## Editing, defaults and local persistence

Identity, Experience and Features own independent drafts, frontend validation, save/discard and simulated saving/saved/error feedback. Unsaved section markers and guards cover tenant switching, in-app navigation and same-document browser Back/Forward; document exit/reload uses the native beforeunload warning. These are user-experience protections, not transactions or concurrency control.

The [model](https://github.com/devLoor1/super-admin-Loor/blob/df87de8e5d3ded2da3915c5de602620c282ab5ba/src/features/whitelabel-settings/settingsModel.ts) labels values `default` or `tenant`. Usar padrão changes the local draft; no live inheritance resolver, global-default editor or server override removal exists. Equality with a default is handled illustratively by the UI, not a settled Product persistence rule. Default propagation, empty/null/false values and explicit override semantics remain [Q-ST-01](open-questions.md#settings).

The [store](https://github.com/devLoor1/super-admin-Loor/blob/df87de8e5d3ded2da3915c5de602620c282ab5ba/src/features/whitelabel-settings/settingsStore.ts) is in-memory: saved changes survive in-app navigation and reset on full reload. Nothing is sent to a business API or stored durably. Prototype IDs, timestamps, status badges and draft types must not be adopted as API fields by inference.

Current client asset checks accept PNG/SVG/JPEG/WebP, logo up to 1,048,576 bytes (UI label 1 MB), favicon up to 262,144 bytes (UI label 256 KB). Colors use `#RRGGBB`; Experience has field-level required/length checks. These are prototype validations only, not approved server limits, MIME/content validation, SVG safety or accessibility policy. Storage, delivery, cleanup and authoritative validation require [Q-ST-02–03](open-questions.md#settings).

## Terms coherence

Settings local publication moves the previous current revision to local history and increments the illustrative revision number. Account Control subscribes to the same tenant Settings store for current revision; the Investor's accepted revision/date stays separate and unchanged. Recorded prototype QA showed current revision 5 in both screens with accepted revision 4 retained. These are seed/session values, not Core revision IDs or acceptance evidence.

Authoritative integration must read the current revision and history from the Core legal domain and keep personal acceptance evidence separately scoped. The frontend must reconcile the successful publication result/readback across both screens rather than inventing a revision ID/number or implying acceptance. History exposure and synchronization/version/conflict behavior need agreed contracts; existing-user reacceptance and actor coverage remain [Q-TE-01–04](open-questions.md#terms). No duplicate Control Plane legal source of truth is proposed.

## Backend dependencies

| Area | CORE EXISTS at audit baseline | CONTROL PLANE EXPOSURE NEEDED | BACKEND IMPLEMENTATION NEEDED where applicable | PRODUCT DECISION REQUIRED |
| --- | --- | --- | --- | --- |
| Settings read/write | Tenant key/value settings/default service; actor scope inconsistencies recorded | Authorized tenant-scoped typed reads and allowed writes through internal Core services | Contract/schema adaptation, consistent ownership checks, concurrency/readback and validation/error semantics where absent | Q-ST-01, Q-ST-03; global defaults versus tenant overrides |
| Identity assets | Platform-asset operations and limited Core events | Safe metadata/delivery and permitted upload/replace/remove commands | Close storage/validation/cleanup gaps against the agreed policy, not a parallel asset store by assumption | Q-ST-02; asset types/limits and lifecycle |
| Features | Selected tenant flags, Admin menu and owner tools are separate capabilities | Expose only agreed authoritative flag mappings and scopes | Implement missing semantics only if approved; no inferred entitlement domain | Q-FE-01–03; each of the four concepts, display versus access |
| Terms | Tenant current/revision publication and registration acceptance | Current/content/history/acceptance reads and authorized publication | History read contract and cross-screen readback/version/conflict support where absent; reacceptance only if approved | Q-TE-01–04; publishing governance and acceptance policy |
| SMTP | Existing configuration/test operations and safe metadata | Safe scoped summary plus a separately defined management surface | Contract/ownership and management gaps assessed in the dedicated SMTP block | Q-SM-01, Q-FE-03; provider/environment/tenant scope |
| Permissions and audit | Legacy actor guards and limited best-effort Core audit | Independent operator RBAC, service auth, resource scope and correlated results | Missing Control Plane authorization, durable/queryable audit and shared error contracts | Q-RB-01–04, Q-AU-01–03, Q-ST-03 |

No frontend-facing or internal endpoint shapes are delivered by this document. Existing Core routes must not be called with service credentials from the browser. The [dependency matrix](matrices/backend-dependencies.md) and [historical audit](audit-findings.md) retain the evidence limits.

## Permissions, audit and integration acceptance

Settings/assets/features/Terms permission labels are **SPECIFICATION LABELS ONLY — RBAC NOT IMPLEMENTED**, listed in the [permissions matrix](matrices/permissions.md). Future `PLATFORM_SETTINGS_UPDATED`, `PLATFORM_ASSET_UPDATED`, `PLATFORM_FEATURE_UPDATED` and `TERMS_PUBLISHED` requirements remain unimplemented Super Admin events; see [audit events](matrices/audit-events.md). Local save timestamps and notices are not audit records.

Before integration/E2E closure: agree the Product-dependent schema/flags/inheritance/legal policy; deliver operator/service authorization and safe contracts; validate permitted reads/writes with authoritative readback, default/override provenance, error/conflict behavior, safe assets and durable correlated audit. Validate that current Terms updates across Settings/Account Control without changing accepted-revision evidence. SMTP management remains dedicated future scope. Ambiguous writes must be reconciled before retry; prototype approval closes none of these dependencies.
