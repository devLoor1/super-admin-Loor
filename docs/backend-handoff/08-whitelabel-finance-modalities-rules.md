# Whitelabel Finance / Modalities / Rules V1

Status: **FRONTEND PROTOTYPED / INTEGRATION PENDING / E2E VALIDATION PENDING** at `dev@4098158b1aa8f58ea20692f0e9bb177b36a49e97`.

Route: `#/whitelabels/:whitelabelId/finance/modalities`. Source: `src/features/finance-modalities/` ([approved source](https://github.com/devLoor1/super-admin-Loor/tree/4098158b1aa8f58ea20692f0e9bb177b36a49e97/src/features/finance-modalities), [implementation and local review evidence](https://github.com/devLoor1/super-admin-Loor/blob/4098158b1aa8f58ea20692f0e9bb177b36a49e97/docs/whitelabel-finance-modalities-rules-v1.md)). Those references describe the approved UI, not a Backend contract or deployment.

This is Whitelabel-scoped configuration/governance only. Local state survives in-app navigation, resets on reload and has no business API, authoritative persistence or financial integration. The cited SHA is this phase's approval; current `dev@9f8abc6d55410e63a2edaf6d8efeafcd217b7a30` retains it, separate [shell authentication](01-current-frontend-scope.md#login-v1), [Operation Opportunities](10-operation-opportunities.md) and read-only [Investment supervision](13-finance-investments.md). Operation reads the Equity/Debt catalog and informative local rule/dependency state; it does not enforce the illustrative approval/configuration rules or financial parameters. Finance Core retains Equity/Debt record references, not an official rule engine or a financial synchronization cascade. Capital de Giro remains outside modality logic. Existing Core evidence remains the retained read-only audit, not a fresh investigation.

## Catalog and taxonomy

The current frontend catalog contains **Equity and Debt only**, derived from the shared Finance `MODALITIES` model; this module adds presentation metadata, not a second catalog. Search, status filter, selection and summary counts use local illustrative data. Additional modalities, official IDs, supported/configurable scope, source of truth and definition lifecycle still need confirmation.

Separate classifications:

| Dimension | Status / evidence limit |
| --- | --- |
| Current Equity/Debt UI catalog | FRONTEND PROTOTYPED |
| Complete production catalog | PRODUCT CATALOG TO CONFIRM / PRODUCT DECISION REQUIRED |
| Target Core catalog and tenant management support | BACKEND SUPPORT TO VERIFY / CORE SUPPORT TO VERIFY |
| Super Admin exposure | CONTROL PLANE CONTRACT TO DEFINE / CONTROL PLANE EXPOSURE NEEDED |
| Authoritative integration/runtime | INTEGRATION PENDING / E2E VALIDATION PENDING |

**Capital de Giro is not a modality** and is not represented as a planned modality, modality rule, dependency, status, permission or count. **Segments / Segmentos** and **Resource Uses / Usos dos recursos** now have a separate [combined prototype screen](09-whitelabel-finance-segments-resource-uses.md), with independent CRUD/identity/lifecycle. Capital de Giro may exist in both without merging, mapping or synchronizing them. Their Core support and authoritative contracts remain to verify/define; chapter 09 owns their handoff, not this modality rule model. See [Q-GM-01](open-questions.md#gateway--modality-relationship) and [catalog decisions](open-questions.md#segments--resource-uses).

## Tenant enablement and detail

The prototype enables/disables a selected modality for the displayed Whitelabel. Enable is an immediate local change; disable requires a local confirmation. Both Finance screens share one enablement source in the Finance store. Rule choices live separately in the modality store. Disabling does not locally remove gateway/bank data or saved rule choices; this observed demo behavior does not establish a real re-enable/retention policy.

Presentation distinguishes **Habilitada**, **Dependência pendente**, **Desabilitada** and **Não configurada**. Explicit disable is not never-configured. Enabled counts include dependency-pending enabled modalities; pending dependencies do not silently change enablement. Counts and statuses do not prove operational readiness.

Selected detail offers Visão geral, Dependências, Regras and Atividade da sessão. It displays tenant context, local configuration origin, dependency/rule summaries, integration pending and a session timestamp (or no change this session), not an authoritative historical last-change value. Tenant-preserving navigation now connects all three Finance screens, including the separate catalogs.

Whether tenant enablement exists in Core, what it permits, effects on new/existing Opportunities and investments/payments, disable restrictions while active business exists, and re-enable behavior remain **PRODUCT DECISION REQUIRED / CORE SUPPORT TO VERIFY**. No cascading behavior is claimed. See [Q-MO-01–04](open-questions.md#modalities--rules).

## Generic rule prototype

The rule model is a **GENERIC STRUCTURAL PROTOTYPE**, not a confirmed authoritative rule catalog.

| Conceptual category | Prototype presentation |
| --- | --- |
| Disponibilidade | Read-only value derived from local enablement/dependency display |
| Elegibilidade | Pending concept; no authoritative criteria |
| Documentos e requisitos | Pending concept; no required-document list or enforcement |
| Limites | Pending concept; no numeric limits |
| Fluxo operacional | Editable example: Exige aprovação manual |
| Configuração por Oportunidade | Editable example: Permite configuração no nível da Oportunidade |

Both editable examples are **PROTOTYPE CONFIGURATION / PRODUCT DECISION REQUIRED / BACKEND CONTRACT REQUIRED**. Local choices are default/yes/no; their frontend keys are not an API schema or permission to skip actual business approvals. Derived and pending concepts carry the same pending-contract boundary; naming a category does not deliver validation/enforcement.

The frontend intentionally avoids inventing rates, percentages, minimum amounts, maturity, amortization, returns, valuations or payment schedules. Product defines real ownership/semantics and Backend confirms the supported catalog, types, validation and effects ([Q-MO-05–06](open-questions.md#modalities--rules)).

## Platform default and tenant override

Platform default → Whitelabel override is a **conceptual model only**. The UI uses **Padrão não definido**, **Configuração local**, **Override do Whitelabel**, **Derivado da habilitação** and **Aguardando Backend**. No platform rule default or real inheritance resolver exists in this prototype. Local default choice is not authoritative reset-to-default.

Global default existence, ownership, inheritance semantics, override granularity, fallback, reset, empty/null values, versioning and change propagation remain unresolved ([Q-MO-07](open-questions.md#modalities--rules), [Q-ST-01](open-questions.md#settings)). Do not extrapolate a rule-default service from existing generic Settings capability.

**Regras gerais** is read-only: it summarizes the categories and each modality's local choices, with links to the sole modality-specific editor. There is no competing tenant-wide rule editor. Product/Backend must decide which real rules are global, tenant-wide, modality-specific or Opportunity-specific before defining writes.

## Dependencies

All relationships are conceptual unless separately established by authoritative evidence.

| Dependency | Local presentation | Unresolved contract |
| --- | --- | --- |
| Gateway | Any active local gateway mapped to the modality counts as served, **Sandbox included**; otherwise an enabled modality is pending. Disabled/unconfigured modalities are not evaluated. | Mapping, cardinality, provider/fallback selection, Sandbox/Production semantics and operational readiness |
| Bank account | Active-account count is informative only; **Relação não definida**; does not locally block enablement. | Whether required, canonical owner/selected account, receiving/payout relation and readiness |
| Rules | Counts local choices; does not prove a valid/effective operational rule set. | Authoritative catalog, validation, ownership/defaults/effects |
| Documentation / requirements | Pending Product/Backend definition; no inferred checklist. | Required documents, applicability, version/source and missing-document effects |

The active-gateway demo rule is **NOT AN AUTHORITATIVE OPERATIONAL RULE**. A local served/configured state is not a provider health check or permission for financial execution. One gateway may be mapped locally to multiple modalities, but real cardinality is unresolved. See [Q-GM-01–02](open-questions.md#gateway--modality-relationship), [Q-GW-01–04](open-questions.md#finance--gateways), [Q-BA-01–04](open-questions.md#bank-accounts) and [Q-MO-08–10](open-questions.md#modalities--rules).

## Local editing and activity

Rules have section-local drafts, explicit save/discard and shared unsaved-change protection. Detail/page tabs retain the draft; modality change, tenant switch, sidebar navigation, browser Back/Forward and document exit are guarded. Save changes only local rule choices; discard restores the last local value. There is no authoritative write/readback, concurrency/version handling or durable configuration.

Session feedback covers enable, disable, rule save and discard, with local labels/differences/time. It is **local / current-session only / non-persistent / not authoritative audit**, and has no operator or Backend event identity. Local activity names must not be confused with future durable events.

## Opportunity and financial boundaries

This module does **not** implement Opportunity creation/editing, Opportunity-specific values/documents/contracts, rates, percentages, investment limits, amortization or maturity schedules. The Opportunity-configuration example is governance presentation only, not an Opportunity editor.

It cannot modify wallet balances or payments, generate Pix, create/change investments, refund, cash out, withdraw, transfer funds or reconcile transactions. It calls no provider and performs no financial mutation. Future configuration/governance integration must preserve that boundary; any operational impact policy belongs in explicit domain contracts, not implied frontend cascades.

## Expected Control Plane capabilities

These are conceptual future needs, not delivered APIs or prescribed route/internal architecture:

- list the supported modality catalog and read selected-tenant configuration;
- enable/disable a modality under agreed operational constraints;
- read/update permitted modality rules with authoritative validation;
- read effective/default/override state and agreed reset/provenance;
- validate confirmed gateway/bank/rule/document dependencies;
- enforce operator authorization plus resource/tenant ownership;
- return authoritative state, conflicts and sanitized errors with correlation;
- emit durable, sanitized audit for approved operations.

The retained audit contains narrower modality-policy/provider evidence ([A-13](audit-findings.md#findings-and-implications)); it does **not** establish this complete tenant-governance model. Separate **CORE EXISTS** evidence from **CORE SUPPORT TO VERIFY**, **CONTROL PLANE EXPOSURE NEEDED**, and **BACKEND IMPLEMENTATION NEEDED** where capabilities are confirmed absent. Product decisions precede dependent writes; no pending dependency is called blocked merely for needing implementation.

## Permissions, audit and completion

Conceptual labels: `MODALITY_VIEW`, `MODALITY_UPDATE`, `MODALITY_ENABLE`, `MODALITY_DISABLE`, `MODALITY_RULE_VIEW`, `MODALITY_RULE_UPDATE`. **SPECIFICATION LABELS ONLY — RBAC NOT IMPLEMENTED**. Umbrella update does not implicitly grant enable/disable or rule updates.

Future events: `MODALITY_ENABLED`, `MODALITY_DISABLED`, `MODALITY_RULES_UPDATED`. They do not exist as delivered Super Admin events. Required safe metadata may include operator, Whitelabel, modality, changed rule keys, sanitized before/after state, result, timestamp and `correlation_id`; never secrets, credentials or sensitive financial data. Failed/denied coverage and durability remain canonical audit decisions.

See [dependencies](matrices/backend-dependencies.md#modalities--rules-v1-dependencies), [rules](matrices/business-rules.md#modality-prototype-assumptions), [permissions](matrices/permissions.md), [events](matrices/audit-events.md#future-super-admin-requirements) and [Q-MO-11–12](open-questions.md#modalities--rules). Authoritative integration completion requires agreed Product contracts, verified/implemented Core support, Control Plane exposure, RBAC, safe errors/readback, durable audit and E2E validation. Frontend prototype completion is separate from these pending capabilities.
