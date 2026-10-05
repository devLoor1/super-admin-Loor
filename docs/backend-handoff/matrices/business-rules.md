# Business Rules

## Confirmed rules

Confirmed architecture boundaries are requirements for the handoff, not claims that the audited code already complies. Confirmed Core behaviors below are static source findings, not Production parity or E2E evidence.

| ID | Confirmed basis | Rule or observed behavior |
| --- | --- | --- |
| C-01 | Architecture sections 2–5, 39 | Core remains the operational source of truth; Control Plane uses internal services, without direct DB access or operational duplication. |
| C-02 | Architecture sections 24, 30 | Operator authorization and service authentication are separate; requested tenant filters are not permission grants. |
| C-03 | Approved frontend source | Login has local validation only; Dashboard and Whitelabels have no business API integration. |
| C-04 | Current user intent | Pause prevents access temporarily while preserving data/history; reactivate restores access without changing unrelated business/validation state. Detailed policy is only PARTIALLY DEFINED. |
| C-05 | Core audit | Investor validation denial/self soft-deletion, tenant active flag and owner-tool disable are separate behaviors, not generic account pause. |
| C-06 | Core Terms service/auth | Current tenant revision is required at Investor registration; rejected acceptance/stale revision fail before Investor creation in the audited path. Existing-user forced reacceptance was not found. |
| C-07 | Core questionnaire/profile | Global catalog has 7 questions/30 canonical answers; validator uses fixed numeric IDs, Q6 array, remaining answers scalar. Classification is weighted and attached as a result; full answer/version history is not persisted by that path. |
| C-08 | Core models | Accounts and Opportunities carry tenant FKs; their existence does not provide a supported reassignment command. |
| C-09 | Architecture sections 15–17, 28 | No generic wallet/payment ownership or amount edits; financial mutations require domain-specific commands and safe idempotency policy. |
| C-10 | Architecture sections 20, 24, 29 | Secrets/service tokens are never frontend or audit output; critical operations require traceable sanitized records. |

## Proposed rules

These require contract/design review and are not delivered behavior.

| ID | Proposal | Dependency |
| --- | --- | --- |
| P-01 | Keep account access state independent of email/KYC/Company/suitability/financial state. | Q-PA-01–07 |
| P-02 | Expose Core-owned list/detail/global aggregates through authorized Control Plane projections. | Q-WL-04, Q-AC-03, Q-RB-02 |
| P-03 | Require preflight and explicit lineage policy before tenant reassignment; do not rewrite historical records by inference. | Q-TR-01–04 |
| P-04 | Use safe invitation/password-setting for managed Admin provisioning, as the architecture recommends. | Q-AC-02 |
| P-05 | Evolve catalog/classification management only with versioned, governed Core semantics. | Q-QU-01–03, Q-CL-01–03 |
| P-06 | Separate tenant configuration, menu visibility, owner tools, provider mapping and commercial entitlements. | Q-FE-01–03 |
| P-07 | Pair commands with authoritative readback and sanitized durable audit; reconcile ambiguous responses before retry. | Q-AU-01–03 |

## Product decisions required

The authoritative question text exists only in [open-questions.md](../open-questions.md). This index identifies blocked policy areas without introducing another question list.

| Area | Canonical decision IDs |
| --- | --- |
| Tenant identity/lifecycle and metric semantics | [Q-WL-01–04](../open-questions.md#whitelabel) |
| Operator/tenant Admin provisioning and account detail | [Q-AC-01–04](../open-questions.md#accounts) |
| Pause/reactivate semantics | [Q-PA-01–07](../open-questions.md#pause-reactivate) |
| Tenant reassignment | [Q-TR-01–04](../open-questions.md#tenant-reassignment) |
| Terms reacceptance/coverage/governance | [Q-TE-01–03](../open-questions.md#terms) |
| Questionnaire scope/versioning | [Q-QU-01–03](../open-questions.md#questionnaire) |
| Classification governance | [Q-CL-01–03](../open-questions.md#classification) |
| Feature/module availability | [Q-FE-01–03](../open-questions.md#features) |
| RBAC and audit guarantees | [Q-RB-01–04](../open-questions.md#rbac), [Q-AU-01–03](../open-questions.md#audit) |

Do not convert seed comments, UI labels, nullable columns, domain-specific denial or architecture route examples into settled Product rules.
