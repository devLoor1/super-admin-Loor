# Governance / Audit V1

## Baseline and purpose

Status: **FRONTEND PROTOTYPED / READ-ONLY / IMMUTABLE FRONTEND PROTOTYPE / INTEGRATION PENDING / E2E VALIDATION PENDING** at `dev@d2a51753047d447983fe12145d53d9f42334e547`. Sources: [approved Audit module](https://github.com/devLoor1/super-admin-Loor/tree/d2a51753047d447983fe12145d53d9f42334e547/src/features/governance-audit), [model](https://github.com/devLoor1/super-admin-Loor/blob/d2a51753047d447983fe12145d53d9f42334e547/src/features/governance-audit/auditModel.ts), [frozen illustrative dataset](https://github.com/devLoor1/super-admin-Loor/blob/d2a51753047d447983fe12145d53d9f42334e547/src/features/governance-audit/prototypeAudit.ts), [defensive formatting](https://github.com/devLoor1/super-admin-Loor/blob/d2a51753047d447983fe12145d53d9f42334e547/src/features/governance-audit/auditFormat.ts) and [frontend review record](https://github.com/devLoor1/super-admin-Loor/blob/d2a51753047d447983fe12145d53d9f42334e547/docs/compliance-audit-v1.md).

Purpose: read-only governance history consultation across tenants and global context: find an illustrative event, inspect who/what/resource/result/time and sanitized changes, then navigate to the owning resource. This UI is not an audit infrastructure, authoritative log or source of truth for the underlying domains. Its frozen examples do not establish Backend event delivery or durable persistence.

## Routes and current capabilities

**Auditoria remains top-level**, separate from Compliance, with no combined KYC/Audit business state.

| Frontend route | Current behavior |
| --- | --- |
| `#/audit` | Global list; optional `?resourceType=`, `?resourceId=`, `?whitelabel=`, `?actor=`, `?action=` |
| `#/audit/:auditEventId` | Read-only detail; unknown/malformed ID shows controlled not-found |

Current UI supports immutable event list, search, combined filters, periods, sorting, pagination, derived counts and detail. Detail separates overview, changes, context and metadata: actor, source-resource snapshot, tenant/global context, result, timestamps, correlation and safe technical examples. Safe actions copy event/correlation IDs, filter by actor/resource and navigate to supported source destinations.

URL-backed valid context survives reload; other view state is local. Enum checks admit own entries only, not inherited object-property names; invalid context shows an ignored-filter note. An unknown resource ID produces an empty list. The fixed **2026-10-08 São Paulo reference day** drives prototype Hoje/7/30-day periods, not live activity/freshness or authoritative clock policy. Client session guards are not server RBAC.

## Immutability and domain separation

**KYC ≠ AUDIT. NO AUTOMATIC KYC → AUDIT SYNCHRONIZATION EXISTS.**

Audit's 28 events are pre-seeded, deeply frozen illustrative records. No app module appends to them. Audit does not consume [KYC session activity](16-compliance-kyc.md#session-activity-is-not-audit), emit real events or change source records. KYC may change its own ephemeral case state; Audit never approves/rejects KYC and never owns that case state. Immutable frontend data is not proof of Backend append-only/integrity guarantees.

No manual event creation, edit, delete, history correction, rollback, restore, replay, reprocess, approval/rejection, source-resource mutation or **V1 export** is present. Navigating to an owning module performs no business action; any later action must use that domain's separate authority/contract. Audit is observation, not orchestration, a repair console or duplicate operational persistence.

## Illustrative event model

| Conceptual field | Current frontend representation / evidence limit |
| --- | --- |
| Event ID | Illustrative `AUD-*` reference, not canonical Backend identity |
| Actor ID/display context | Illustrative operator ID/name/role; null actor for an unauthenticated attempt, not an identity directory |
| Action | Code and label from the prototype taxonomy |
| Module/domain | Plataformas, Operação, Financeiro, Compliance, Sistema; prototype grouping only |
| Resource type/ID | Explicit source-domain reference; snapshot label is not current resource readback |
| Whitelabel/global context | Tenant reference or global/null; not an authorization grant |
| Result | Sucesso / Falha; **PROTOTYPE UX RULE**, not official success/failure/denial taxonomy |
| Timestamp | Illustrative ISO instant and Brasília display; authoritative event/ingestion/ordering semantics unresolved |
| Correlation ID | Safe illustrative reference used to find related examples |
| IP / user agent | Documentation-range fictitious IP and generic user-agent example; no real user telemetry |
| Old / new value | Sanitized field maps/redaction markers only |

These conceptual fields do not prescribe storage, framework, transport technology or a canonical Backend schema. Product/Backend defines authoritative source/model, taxonomy, IDs, actor identity, result, timestamp and integrity under [Q-AU-01–10](open-questions.md#audit).

## Before and after

Primary presentation is field-oriented **Campo | Antes | Depois**, not a full raw event dump. Unchanged values may be omitted; absent/null values display `—`; create events may have no Before; login/logout/test events may have no recorded field changes. The prototype compares recorded sanitized fields only, not entire source-domain objects or a live resource snapshot.

Secondary structured/raw representation is collapsed and sanitized (`[redacted]` where required). There is no raw-secret toggle. This UX is not a canonical Backend diff contract; schema/version/type, missing-versus-null and change selection need agreement (Q-AU-06).

## Mandatory redaction boundary

Desired authoritative Backend safety: Audit must **never expose passwords, session tokens, refresh tokens, Authorization headers, API keys, gateway secrets, webhook secrets, SMTP passwords, cookies, private credentials or complete sensitive KYC/document payloads**. Safe summaries must minimize personal/document/financial data as well.

Frontend V1 uses fixed masks, `[redacted]` and fail-closed sanitization. Seed data stores only redaction markers for sensitive fields. Sensitive key names are masked again at render/raw view; unexpected structured values fail closed instead of exposing nested payloads. Safe copy actions copy identifiers only. This defensive rendering is not a substitute for authoritative Backend sanitization in API responses, logs, errors or canonical audit storage.

Backend must define redaction/masking/allowlisting, permitted before/after fields and safe errors; do not rely on client masking to make plaintext delivery safe. IP/user-agent collection, visibility, minimization and retention are policy decisions, not permission to collect telemetry from the prototype. See Q-AU-02, Q-AU-05–06 and Q-RB-04.

## Illustrative coverage and KYC events

Pre-seeded examples reference Authentication, Whitelabels, Accounts, Settings, SMTP, Gateways, Operation, Compliance/KYC and Finance configuration. This demonstrates cross-domain supervision UX, not that all corresponding Backend events exist. Result labels and example timestamps do not prove successful live actions.

KYC decision examples are **PRE-SEEDED ILLUSTRATIVE EVENTS**. They are not generated by local KYC actions, do not prove Backend audit integration and imply no automatic frontend synchronization. Future canonical emission must originate from the authoritative Backend/Control Plane, with agreed source-domain ownership, durability and correlation; KYC session activity is never retroactively promoted to evidence.

Taxonomy is preserved in illustrative changes: modality is Equity or Debt; Capital de Giro may independently appear in Segment and Resource Use context, **never as a modality**. There are no real financial events/executions introduced by this dataset.

## Navigation to Audit and source resources

| Entry point | Current destination / limit |
| --- | --- |
| Dashboard Acessar Auditoria / Últimos eventos “Ver todos” | `#/audit`; Dashboard events/metrics remain empty/non-integrated |
| KYC “Ver na Auditoria” | `#/audit?resourceType=kyc_case&resourceId=:kycCaseId`; filter only |
| Gateways Audit shortcut | `#/audit?whitelabel=:whitelabelId&resourceType=gateway` |
| Modalities Audit shortcut | `#/audit?whitelabel=:whitelabelId` |

These replace previous future-module notices with **FRONTEND PROTOTYPED NAVIGATION**. They do not confirm event coverage, Backend filtering/deep links or read permissions.

“Ir para recurso” may open KYC case, Operation Opportunity, tenant/type Accounts tab, tenant Gateways, Settings, Emails SMTP or Whitelabel list. Per-account, per-gateway and per-Whitelabel selection are not invented; missing/unsupported destinations such as administrative-session detail show controlled feedback. Source navigation never edits a resource or grants a command. Destination IDs/scope and resource-deep-link contracts remain Q-AU-08 and the existing domain questions.

## Backend dependencies, permissions and completion

Retained [A-11](audit-findings.md#findings-and-implications) shows limited Core SMTP/template/asset/Terms writer calls with a best-effort writer, not general immutable Control Plane Audit delivery. [Current Core events](matrices/audit-events.md#current-core-events), frontend illustrative events and future requirements remain distinct. No new Core/live audit investigation was performed for this documentation update.

Required contracts: canonical Control Plane Audit API/source, event/domain/resource/result taxonomies, actor identity, timestamp/order semantics, sanitized before/after, authoritative redaction, correlation propagation, IP/user-agent policy, retention, immutability/integrity, authorized pagination/filter/search, safe errors and source-resource links. **CORE SUPPORT TO VERIFY / CONTROL PLANE EXPOSURE NEEDED / PRODUCT DECISION REQUIRED / INTEGRATION PENDING / E2E VALIDATION PENDING** remain; **BACKEND IMPLEMENTATION NEEDED** applies to retained or verified target gaps. See [Audit dependencies](matrices/backend-dependencies.md#governance-audit-v1-dependencies).

`AUDIT_VIEW` is **SPECIFICATION LABEL ONLY — RBAC NOT IMPLEMENTED**. `AUDIT_EXPORT` is a future policy decision, not V1 capability or effective permission. Source-domain mutation permissions are never implied. `KYC_CASE_VIEWED` / `AUDIT_EVENT_VIEWED` and other reads are **AUDIT POLICY DECISION REQUIRED**, not existing emitted events. See [permissions](matrices/permissions.md#compliance-and-audit-permission-boundaries), [event policy](matrices/audit-events.md#compliance-and-audit-event-policy), [rules](matrices/business-rules.md#compliance-and-audit-rules) and [canonical Audit questions](open-questions.md#audit).

Frontend prototype coverage is complete for this planned V1 module. Backend completeness, integration/E2E, production readiness, security/integrity validation, legal compliance and financial-processing validation remain unproven; no storage technology or final operational policy is selected by this handoff.
