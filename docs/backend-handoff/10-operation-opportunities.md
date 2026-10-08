# Operation / Opportunities V1

## Baseline and evidence

Status: **FRONTEND PROTOTYPED / INTEGRATION PENDING / E2E VALIDATION PENDING** at approved `dev@400c1dceeafb47f7d8308af7f797f7b42aa30929`. Source: [Opportunity module](https://github.com/devLoor1/super-admin-Loor/tree/400c1dceeafb47f7d8308af7f797f7b42aa30929/src/features/operation/opportunities), [frontend implementation/review record](https://github.com/devLoor1/super-admin-Loor/blob/400c1dceeafb47f7d8308af7f797f7b42aa30929/docs/operation-opportunities-v1.md). Earlier local QA is retained evidence, not a new Backend audit or live E2E claim.

Operation V1 has three independent siblings; this chapter owns Opportunities only. [Investors](11-operation-investors.md) and [Entrepreneurs](12-operation-entrepreneurs.md) read relationships and navigate; they do not write Opportunities. Core remains authoritative for operational entities; Control Plane must expose/orchestrate Core services without duplicating them. Current [shell authentication integration](01-current-frontend-scope.md#login-v1) does not connect Opportunity business APIs.

## Routes and current capabilities

| Frontend route | Purpose |
| --- | --- |
| `#/operation/opportunities` | Global list; optional `?empreendedor=:id` contextual filter |
| `#/operation/opportunities/new` | Dedicated local create form |
| `#/operation/opportunities/:opportunityId` | Detail |
| `#/operation/opportunities/:id/edit` | Dedicated edit form; optional `?secao=classificacao` focuses classification |

These are frontend hash routes, not prescribed Backend endpoints. Unknown IDs show the established not-found state. Session-created records disappear on reload, so their URLs then become not-found.

The prototype provides global list, name/ID search, Whitelabel/status/modality/Segment/Resource Use filters, sorting, pagination, local summary counts, create/detail/edit, status change, classification, Entrepreneur references and session activity. Tenant context is explicit; global presentation is not a global permission grant. The Entrepreneur filter is removable and its URL state reconciles with navigation.

Detail separates overview, classification, configuration and session activity. Create/edit have local validation, save/discard and unsaved-change protection. The configuration tab shows a controlled pending-parameters state and informative modality-rule context, not a financial editor. **No delete, official publication/approval workflow or financial operation exists.**

The [Opportunity store](https://github.com/devLoor1/super-admin-Loor/blob/400c1dceeafb47f7d8308af7f797f7b42aa30929/src/features/operation/opportunities/opportunityStore.ts) is in-memory and supports create/update/status only. State survives in-app navigation but resets on reload. IDs, dates, counts and field names are prototype data, not an API schema, persistence evidence or production aggregates.

## Prototype status model

**PROTOTYPE UX STATE MODEL:** Rascunho (`draft`), Ativa (`active`), Pausada (`paused`). Create begins as Rascunho; edit/status dialog permits the prototype states without an official transition graph.

These are **not confirmed Product workflow**. In particular Ativa does not prove publication, approval, investment eligibility or provider configuration. Product/Backend must define official statuses/transitions, publication, approval, pause/resume and cancel/archive/delete semantics. See [Q-OP-01–02, Q-OP-08](open-questions.md#operation-opportunities); no status mapping to Core is inferred.

## Classification and cardinality

| Independent concept | Current prototype | Authoritative boundary |
| --- | --- | --- |
| Modality | Equity or Debt from shared Finance catalog | Supported catalog, requirement/cardinality and actual rule enforcement need contracts |
| Segment | References into its own catalog for the displayed Whitelabel | Scope, required/optional selection, cardinality and retained references need contracts |
| Resource Use | References into its separate catalog for the displayed Whitelabel | Independently decide scope, requirement, cardinality and retained references |
| Entrepreneur | One optional reference to an Operation/Accounts prototype record | Person/company/originator model and required/optional one-versus-many relationship remain unresolved |

**Capital de Giro is NOT a modality.** It may exist independently as a Segment and as a Resource Use, with separate IDs/lifecycle. No automatic Segment ↔ Resource Use mapping, selection or synchronization exists. Sharing a name never merges records. Catalog ownership remains with [chapter 09](09-whitelabel-finance-segments-resource-uses.md); modality governance remains with [chapter 08](08-whitelabel-finance-modalities-rules.md).

Multiple Segment and Resource Use selections are **PROTOTYPE UX BEHAVIOR**, not Product truth. Modality, Segment, Resource Use and Entrepreneur cardinalities must be decided separately (Q-OP-03–06, Q-CAT-08–09). Prototype one-modality/optional-one-Entrepreneur fields do not settle those decisions.

Catalog references resolve through the shared read snapshot, not copied names or merged catalogs. Active records are selectable; existing inactive/missing references remain visible/removable. Renames/status changes are resolved live; deleting a Segment leaves its stored reference missing and does not change Resource Uses. These are presentation behaviors, not authoritative referential/historical safeguards. Catalog administration still displays `—` for reverse usage in Opportunities; no authoritative usage/count integration exists.

## Whitelabel change and validation

Changing the Whitelabel clears Entrepreneur, Segment and Resource Use references to avoid stale cross-tenant references; **modality remains independent and retained**. Classification: **PROTOTYPE SAFETY BEHAVIOR**. This does not define an actual tenant move. Product/Backend must choose allowed, restricted, clone/migration-based or forbidden behavior and define lineage/ownership checks (Q-OP-07), separately from account reassignment.

**PROTOTYPE UX CONSTRAINTS:** name 3–80 characters, description up to 300, Whitelabel required and modality required. First-invalid focus and field error presentation are frontend UX. Final required fields, uniqueness/formats/limits and server validation/error contracts remain Product/Backend decisions (Q-OP-10); do not adopt these limits as authoritative validators.

## Financial and cross-domain boundaries

Opportunity V1 does **not** define investment minimum, funding target, valuation, interest rate, yield, return, maturity, amortization, payment schedule, fees, wallet, Pix or payments. Equity/Debt labels do not supply these values or formulas. Opportunity-specific financial requirements and ownership need explicit Product/domain contracts (Q-OP-09).

Accounts owns identity, authentication/access, account lifecycle/mutations and account-level tenant relationship. Compliance owns KYC review/decisions. Finance / Investments owns Investment and financial operations. Current links reach the Entrepreneur profile and tenant-preserving Finance modality/catalog pages; those links neither mutate those domains nor confer their permissions.

## Required contracts and completion boundary

**CORE EXISTS** is limited to retained [A-07 tenant/Opportunity lineage](audit-findings.md#findings-and-implications), not delivered Super Admin CRUD/workflow. **CORE SUPPORT TO VERIFY** applies to target source/read/write/relationship support. **CONTROL PLANE EXPOSURE NEEDED** covers safe authorized reads/commands; **BACKEND IMPLEMENTATION NEEDED** applies to proven missing foundation/audit in the retained audit and conditionally to target support found absent after verification. **PRODUCT DECISION REQUIRED**, **INTEGRATION PENDING** and **E2E VALIDATION PENDING** are separate facts, not automatic frontend blockers.

Contracts need Core-owned source of truth, scoped CRUD exposure (delete only if approved), official workflow/publication/approval, Whitelabel ownership, independent Entrepreneur/modality/Segment/Resource Use relationships, final validation, pagination/search, sanitized errors, concurrency/versioning and authoritative readback. Archive/delete semantics are unresolved; no ad hoc database writes or invented callable routes are specified. See [dependencies](matrices/backend-dependencies.md#operation-v1-dependencies) and [canonical decisions](open-questions.md#operation-opportunities).

## Permissions and audit

Conceptual labels: `OPPORTUNITY_VIEW`, `OPPORTUNITY_CREATE`, `OPPORTUNITY_UPDATE`, `OPPORTUNITY_STATUS_UPDATE` — **SPECIFICATION LABELS ONLY — RBAC NOT IMPLEMENTED**. They confer no account, KYC, financial or tenant-migration grants. Cross-domain destinations require their own domain authorization and resource scope.

Future conceptual events: `OPPORTUNITY_CREATED`, `OPPORTUNITY_UPDATED`, `OPPORTUNITY_STATUS_CHANGED`, `OPPORTUNITY_CLASSIFICATION_CHANGED`. They are not delivered Backend events. Potential safe metadata: operator, agreed tenant/context, record ID, sanitized before/after, result, timestamp and `correlation_id`. Coverage, durability and query policy remain Q-AU-01–03/Q-OC-03. See [permissions](matrices/permissions.md#operation-permission-boundaries) and [audit](matrices/audit-events.md#operation-audit-policy).

Current session activity is **local, non-persistent, non-authoritative and not audit**. Integration completion requires agreed policy, verified/implemented Core support, Control Plane exposure, authoritative readbacks, authorization/errors/version reconciliation and independent E2E; prototype approval does not close any of those dependencies.
