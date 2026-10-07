# Whitelabel Finance / Segments / Resource Uses V1

Status: **FRONTEND PROTOTYPED / CORE SUPPORT TO VERIFY / CONTROL PLANE EXPOSURE NEEDED / PRODUCT DECISION REQUIRED / INTEGRATION PENDING / E2E VALIDATION PENDING** at `dev@ec86b475e0126667e2fbece490730bdecc271584`.

Route: `#/whitelabels/:whitelabelId/finance/segments-resource-uses`. Source: `src/features/finance-catalogs/` ([approved module](https://github.com/devLoor1/super-admin-Loor/tree/ec86b475e0126667e2fbece490730bdecc271584/src/features/finance-catalogs), [implementation and frontend review](https://github.com/devLoor1/super-admin-Loor/blob/ec86b475e0126667e2fbece490730bdecc271584/docs/whitelabel-finance-segments-resource-uses-v1.md)). These references establish the approved prototype, not a Backend delivery or runtime persistence claim.

## Two independent catalogs

V1 is **one screen containing two independent catalog domains** for operational convenience:

| Domain | Current frontend identity/state | Local operations |
| --- | --- | --- |
| Segments / Segmentos | Separate Segment records, `seg_…` prototype IDs, collection, actions and draft | Create, list/read, update, delete, active/inactive state, search, status filter, sorting and pagination |
| Resource Uses / Usos dos recursos | Separate Resource Use records, `ru_…` prototype IDs, collection, actions and draft | Create, list/read, update, delete, active/inactive state, search, status filter, sorting and pagination |

These are not the same entity. Shared UI primitives do not imply shared records, shared IDs or domain coupling. Prototype prefixes/types/field keys are not prescribed API identity or schemas. Each list reads its own collection; no Backend detail request is made. Search covers name/description, status filtering is independent, and name/status sorting and pagination operate locally in each panel.

Changes survive in-app navigation only and reset on reload. Save/discard, unsaved-change guards, local confirmation and feedback are frontend behavior, not authoritative commands, authorization or durable storage.

## Capital de Giro and modality boundary

**CONFIRMED taxonomy:** Equity and Debt are the only current prototype modalities. **Capital de Giro is NOT a modality**. Segments and Resource Uses are separate taxonomies and do not enter modality enablement, rule, dependency, permission or count logic.

A Segment named **Capital de Giro** and a Resource Use named **Capital de Giro** may coexist as two independent records with separate identity and lifecycle. The illustrative frontend seeds demonstrate this deliberately. They are not aliases, automatically related or synchronized; changing/deleting/inactivating one does not change the other.

There is currently **no automatic Segment ↔ Resource Use relationship**. Same-name records do not imply a mapping. Any future relationship must be explicitly defined by Product and Backend, not inferred from names, the combined screen or tenant context. Existing modality/gateway semantics remain in [chapter 07](07-whitelabel-finance-gateways.md) and [chapter 08](08-whitelabel-finance-modalities-rules.md).

## Prototype validation only

| Observed frontend behavior | Classification | Authoritative boundary |
| --- | --- | --- |
| Block duplicate names within the same catalog, excluding the edited record | PROTOTYPE UX RULE | Final uniqueness scope/comparison/conflict semantics require Product and Backend decisions |
| Normalize case, accents and extra spaces (trim/collapse whitespace) for that comparison | PROTOTYPE UX RULE | Not a Core constraint, cross-tenant rule or database collation requirement |
| Allow identical names across the two catalogs | CONFIRMED frontend V1 behavior | Does not merge identity or impose an authoritative naming policy |
| Name 2–60 characters; description up to 160 characters | PROTOTYPE UX RULE | Final limits, required fields, formats and server validation remain to define |

Prototype limits and normalized duplicate handling must not be promoted to Product/Backend rules. Illustrative seed contents are not an official dataset, regulatory classification or migration source. See [Q-CAT-02–05](open-questions.md#segments--resource-uses).

## Delete versus inactive

The frontend treats these as separate concepts:

- **DELETE:** remove only the local prototype record from its own collection.
- **INACTIVE:** retain the record with inactive status, selected through its local create/edit form; it can be changed back to active locally.

There is no reference/usage lookup or cascade. Neither action changes an Opportunity or a same-name record in the other catalog. Local removal is not proof of a hard-delete API; local reactivation is not proof that Backend supports it.

Product/Backend must define hard versus soft delete, whether referenced records may be deleted, whether inactivation replaces deletion after use, historical retention, inactive selection semantics, reactivation and impact on new/existing Opportunities. See [Q-CAT-06–09](open-questions.md#segments--resource-uses). Do not claim current Backend semantics or resolve these choices through the UI alone.

## Ownership and scope

The frontend is tenant-scoped for presentation and local state. This is **NOT authoritative domain ownership**. All alternatives remain unresolved:

- global catalog;
- per-Whitelabel catalog;
- global catalog plus tenant overrides;
- global catalog plus per-tenant enablement.

Classification: **PRODUCT DECISION REQUIRED / BACKEND CONTRACT TO DEFINE**. Backend must establish the source of truth separately for Segment and Resource Use, stable identity and resource/scope enforcement. Frontend grouping is not permission or evidence of a tenant-owned Core table. See [Q-CAT-01–03](open-questions.md#segments--resource-uses).

## Future Opportunity consumption

Segments and Resource Uses are expected to be consumed during future Opportunity creation/configuration. V1 does **not** implement Opportunity CRUD, associations, usage counts, migration or assignment.

Cardinality remains unresolved independently: one or multiple Segments per Opportunity, and one or multiple Resource Uses per Opportunity. Required/optional selection, active-record eligibility, retention of historical references and change effects also need explicit contracts. There is no automatic relationship between the two selections. See [Q-CAT-08–09](open-questions.md#segments--resource-uses).

## Expected Control Plane capabilities

These are conceptual future capabilities, not delivered APIs, prescribed route names, implementation technology or an approved database model:

| Segment capability | Resource Use capability | Expected contract boundary |
| --- | --- | --- |
| List Segment catalog | List Resource Use catalog | Independent authoritative source/IDs, agreed scope, search/filter/sort/pagination and safe state |
| Read Segment | Read Resource Use | Stable resource identity, scoped authorization and authoritative fields/version |
| Create Segment | Create Resource Use | Final required fields/validation/uniqueness, permitted scope, safe conflict errors and readback |
| Update Segment | Update Resource Use | Allowed fields, version/concurrency checks, referenced-record policy and authoritative readback |
| Delete Segment | Delete Resource Use | Agreed deletion/retention policy, usage/reference protection and safe reconciliation |
| Activate/inactivate Segment, if supported | Activate/inactivate Resource Use, if supported | Agreed state transitions/reactivation and Opportunity effects; command shape remains to define |

Each domain additionally needs operator authorization, resource/tenant ownership, conflict detection/rejection, protection of referenced records, sanitized errors/correlation, concurrency/version handling and durable audit. Confirm/reuse any actual Core support before deciding new implementation. **CORE SUPPORT TO VERIFY** is the current catalog evidence status; **BACKEND IMPLEMENTATION NEEDED** applies to confirmed missing foundation/audit and conditionally to missing catalog support after verification. **CONTROL PLANE EXPOSURE NEEDED**, **INTEGRATION PENDING** and **E2E VALIDATION PENDING** are separate facts, not a default blocked label.

Official seeds, hierarchy, codes and persistent ordering are not defined by the prototype. Current table sort is a presentation function, not a domain ordering contract. See the [dependency matrix](matrices/backend-dependencies.md#segments--resource-uses-v1-dependencies).

## Permissions and audit

Conceptual labels are `SEGMENT_VIEW`, `SEGMENT_CREATE`, `SEGMENT_UPDATE`, `SEGMENT_DELETE`, `RESOURCE_USE_VIEW`, `RESOURCE_USE_CREATE`, `RESOURCE_USE_UPDATE`, `RESOURCE_USE_DELETE`: **SPECIFICATION LABELS ONLY — RBAC NOT IMPLEMENTED**. Separate activate/inactivate grants, if needed, remain a future Product/RBAC decision; update/delete labels do not silently settle that authorization. Global versus tenant ownership must be resolved before grants are defined. See [permissions](matrices/permissions.md) and [Q-CAT-11](open-questions.md#segments--resource-uses).

Future event requirements, **not existing delivered events**:

- `SEGMENT_CREATED`, `SEGMENT_UPDATED`, `SEGMENT_DELETED`, `SEGMENT_ACTIVATED`, `SEGMENT_INACTIVATED`;
- `RESOURCE_USE_CREATED`, `RESOURCE_USE_UPDATED`, `RESOURCE_USE_DELETED`, `RESOURCE_USE_ACTIVATED`, `RESOURCE_USE_INACTIVATED`.

Possible safe metadata includes operator, Whitelabel/context under the eventual ownership model, catalog, record ID, sanitized before/after, result, timestamp and `correlation_id`. Durability, query authorization, failure/denial coverage and Core/Control Plane correlation are [Q-CAT-12](open-questions.md#segments--resource-uses) under Q-AU-01–03. No secrets or unnecessary sensitive business data belong in audit.

Current frontend activity is **local/session-only, non-persistent and not authoritative audit**. It records local create/update/delete feedback; status edits are local updates, not proof that separate activation/inactivation events exist. No operator identity, Core/Control Plane event or persistent audit is emitted. See [audit events](matrices/audit-events.md#future-super-admin-requirements).

## Evidence and integration completion

The retained Core audit SHA and existing findings remain unchanged. This documentation update does not inspect new Core source/live endpoints or prove Segment/Resource Use CRUD, scope, seeds, reference protection, RBAC or event support. Narrower modality/provider evidence is not catalog evidence. See [catalog prototype mapping](audit-findings.md#catalog-prototype-mapping--no-new-core-finding).

Frontend prototype approval is complete at the cited commit. Authoritative integration completion remains **INTEGRATION PENDING / E2E VALIDATION PENDING** and requires agreed Product policy, verified/implemented Core support, Control Plane exposure, per-domain authorized CRUD/readback, final validation, reference protection, conflict/version reconciliation and durable sanitized audit. Existing [open questions](open-questions.md#segments--resource-uses) are not closed by prototype approval.

This is configuration/governance only: no Investment, Payment, wallet, Pix, refund, payout, cashout, transfer, provider request or financial mutation is implemented or performed by this screen or this documentation task.
