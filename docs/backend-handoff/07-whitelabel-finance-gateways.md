# Whitelabel Finance / Gateways V1

Status: **FRONTEND PROTOTYPED / INTEGRATION PENDING / E2E VALIDATION PENDING** at `dev@4098158b1aa8f58ea20692f0e9bb177b36a49e97`.

Route: `#/whitelabels/:whitelabelId/finance/gateways`. Source: `src/features/finance-gateways/`.

The page is a tenant-scoped configuration and governance prototype. Gateway, credential, bank-account and modality data are illustrative in-memory records. Local edits survive in-app navigation only and reset on reload. There is no business API call, provider request, banking integration, durable persistence or authoritative audit.

## Financial safety boundary

Finance / Gateways V1 is **CONFIGURATION / GOVERNANCE**, not **FINANCIAL OPERATION**. It does not expose or perform:

- manual wallet balance edits, credits or debits;
- Investment creation or mutation;
- payment-state mutation or manual paid marking;
- Pix transaction generation;
- refunds, cashout, withdrawal or transfers;
- manual reconciliation.

Future integration must preserve this boundary. Configuration commands must not implicitly mutate existing Investment, Payment, wallet or settlement state.

## Payments reference boundary

Current `dev@d2a51753047d447983fe12145d53d9f42334e547` retains this configuration prototype and independent [Payment supervision](14-finance-payments-pix.md). Payments reads an explicit Gateway ID against the local configuration; Ver gateway opens the Payment tenant's `#/whitelabels/:whitelabelId/finance/gateways`, with no per-Gateway selection/deep-link contract. This is frontend read/navigation, not provider connectivity, payment readiness or synchronization. Gateways e contas continues to own credentials/secrets, provider activation, environment and connectivity configuration; Payments owns none of those writes. Safe identity/read/deep-link/event contracts remain Q-FP-03 and Q-GW-01–04; no Core support is newly claimed.

The former “Auditoria — módulo futuro” shortcut now opens `#/audit?whitelabel=:whitelabelId&resourceType=gateway`. This is **FRONTEND PROTOTYPED NAVIGATION** to [immutable Audit consultation](17-governance-audit.md), not proof of Backend gateway events/filtering/deep links. Configuration/test session activity does not append to Audit; masks/read examples do not deliver secure Backend credential storage or provider health.

## Gateway configuration

The frontend prototypes tenant-scoped provider identity, role, environment, configured state, active/inactive state and credential status. It supports local edit/save/discard, shared unsaved-change protection, simulated connection validation and local activation/deactivation.

`Provedor Alfa`, `Provedor Beta`, `Provedor Gama` and `Provedor Delta` are mock labels. They do not establish a supported provider catalog. The actual catalog, provider-specific schema, role/environment semantics, configuration ownership, concurrent active-provider policy and principal/default behavior require Product and Backend decisions ([Q-GW-01–04](open-questions.md#finance--gateways)).

Conceptual Control Plane capabilities:

- list tenant gateway configurations and read one sanitized configuration;
- create/update configuration;
- update credentials without readback;
- activate/deactivate a gateway;
- run a bounded server-side configuration test;
- enforce operator/tenant authorization and return sanitized errors;
- emit durable sanitized audit evidence.

These are expected capabilities, not prescribed route names or proof of Backend implementation.

## Credentials and secrets

The frontend models credentials as write-only. Existing secret values are never displayed; edit fields start blank; read state exposes only configured/masked metadata. New values exist only in a local draft and must never appear in logs, session activity or audit.

Required Backend boundary:

- secure encrypted storage and provider-specific validation;
- write-only preserve/replace/rotate/revoke semantics;
- sanitized read contract with configured state and only approved non-secret hints;
- no secret echo in success, validation or provider-error responses;
- no secret value in logs, durable audit or diagnostic metadata.

Classification: **FRONTEND PROTOTYPED / CONTROL PLANE EXPOSURE NEEDED / BACKEND CONTRACT / SECURITY WORK NEEDED / INTEGRATION PENDING / E2E VALIDATION PENDING**. The retained Core audit shows Opportunity-specific provider resolution and a safe PAG credential resource; it does not prove a generic tenant gateway-secret contract or encryption for this prototype.

## Connection validation

The current flow simulates request → loading → success/failure. It sends no provider request.

The expected Backend capability is a safe server-side test with provider-specific validation, bounded timeout, sanitized result/error, no secret echo and correlated audit without credentials. Product/Backend must define what success proves; a configured state must not imply provider health or financial readiness.

## Activation and deactivation

Activation/deactivation changes local prototype state only. Product/Backend must define:

- the operational meaning of active;
- effects on future payment flows and existing operations;
- whether active/in-flight operations block deactivation;
- fallback/provider-switching behavior;
- principal/default provider rules.

No existing Investment, Payment or wallet state is assumed to change automatically.

## Prototype assumptions

The following are explicitly **PROTOTYPE ASSUMPTIONS — PRODUCT / BACKEND VALIDATION REQUIRED**:

- one principal gateway per Whitelabel;
- a warning when Production is selected with incomplete credentials;
- any active local gateway, including Sandbox, may satisfy the prototype modality summary.

They are not confirmed business rules.

## Whitelabel bank accounts

The frontend prototypes local create, edit, activate/deactivate and remove actions; masked account data; masked/write-only Pix information; and account status. For UX the records are presented as Whitelabel-scoped, but that ownership is not authoritative.

Unresolved domain decisions include canonical owner, Whitelabel/Opportunity/provider relationships, receiving and payout semantics, verification state, multiplicity, principal/default account and removal/deactivation constraints ([Q-BA-01–04](open-questions.md#bank-accounts)).

Required safety properties include data minimization, masking, no unnecessary full account/Pix exposure, write-only sensitive updates where appropriate, authorization, sanitized errors and secret-free audit. Current field validation and masking are illustrative UX rules, not an authoritative banking validator.

Conceptual capabilities are list/read sanitized accounts, create/update, activate/deactivate/remove subject to policy, and authoritative readback. Backend selects the domain model and implementation.

## Financial modalities summary

This page remains a conceptual summary for **Equity and Debt**; the separate [Modalities / Rules V1](08-whitelabel-finance-modalities-rules.md) now provides local enable/disable and a generic rule editor. These are the only current prototype modalities, not a proven complete production catalog or proof of tenant-configurable Core flags.

The Gateway and Modality screens derive their modality catalog and enablement from the same local Finance model/store. Explicit **Desabilitada** differs from never-set-up **Não configurada**. The enabled count includes an enabled modality with **Dependência pendente**; missing gateway readiness does not silently disable it. The Modalidades quick action and Finance subnavigation retain the displayed Whitelabel. Rule choices and their activity use a separate module-local store, not a second enablement source. The Segment and Resource Use collections belong to their own catalog store, not this modality catalog.

**Product-defined taxonomy:** Capital de Giro is not a modality. It is a valid example/option in both **Segments** and **Resource Uses / Usos dos Recursos**, with independent identity/lifecycle and no automatic relationship. The separate [Segments / Resource Uses V1 screen](09-whitelabel-finance-segments-resource-uses.md) now prototypes each catalog's CRUD; neither belongs to gateway or modality logic. Classification for both: **FRONTEND PROTOTYPED / CORE SUPPORT TO VERIFY / CONTROL PLANE EXPOSURE NEEDED / PRODUCT DECISION REQUIRED / INTEGRATION PENDING / E2E VALIDATION PENDING**. This does not establish API routes or existing Backend support. Catalog/ownership semantics remain in [Q-GM-01](open-questions.md#gateway--modality-relationship) and [catalog decisions](open-questions.md#segments--resource-uses).

The new modality-specific editor remains non-authoritative. Product/Backend must still define source of truth, gateway mapping and whether Sandbox counts as configured, satisfies a dependency, or whether Production is required for operational readiness ([Q-GM-01–02](open-questions.md#gateway--modality-relationship), [modality decisions](open-questions.md#modalities--rules)). The bank relationship remains **Relação não definida**; neither screen establishes payout/receiving requirements.

## Local state, activity and completion boundary

Gateway and bank edits use local save/discard plus shared route/browser unsaved-change protection. Activity records session-only configuration actions and simulated test results. It is not durable audit and contains no secret values.

Integration completion requires authoritative tenant-scoped read/write contracts, RBAC, sanitized errors/readback, durable audit and E2E validation. Conceptual permissions are in [permissions](matrices/permissions.md), rules in [business rules](matrices/business-rules.md), events in [audit events](matrices/audit-events.md), dependencies in [backend dependencies](matrices/backend-dependencies.md), and decisions in [open questions](open-questions.md#finance--gateways).
