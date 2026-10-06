# Open Questions

This is the single canonical list of unresolved Product/Backend decisions for this handoff. IDs are references, not commitments or delivered capabilities. All items remain open as of 2026-10-06. Product chooses policy; Backend confirms feasible contracts/invariants. No assignment to a named person or delivery date is assumed.

Context update: Whitelabel Account Control and Whitelabel Settings V1 are **FRONTEND PROTOTYPED** at approved `dev@df87de8e5d3ded2da3915c5de602620c282ab5ba`. Account actions and Settings per-section local editing/default display/assets/features/Terms publication demonstrate the UI, not answers to the questions below. Pause enforcement, migration lineage, provisioning/RBAC/audit, inheritance/asset policy, Terms reacceptance, SMTP ownership, global questionnaire/classification governance and feature/module rules remain unresolved. Local current-Terms coherence across Settings/Account Control is implemented; authoritative synchronization is still a contract question. No question is closed by prototype approval or local feedback.

## Whitelabel

- **Q-WL-01 — Product and Backend:** What are the authoritative identity fields and permitted edits, including slug uniqueness/immutability, base URL versus displayed domain, environment ownership and domain verification?
- **Q-WL-02 — Product and Backend:** Is lifecycle limited to active/inactive, or does it include setup/draft/archive? What transitions, prerequisites and tenant-wide access/background effects are required, including resolver fallback behavior?
- **Q-WL-03 — Product:** What does Aplicações mean, and how do Plataformas, Whitelabels, application counts and detail destinations map to actual entities/modules?
- **Q-WL-04 — Product and Backend:** Define Dashboard/tenant metrics: included populations/statuses, count/volume basis, activity series, distribution denominator, units, date/time zone, rounding, freshness and missing/partial/error semantics. Which integration indicators represent configuration versus actual health?

## Accounts

- **Q-AC-01 — Product and Backend:** How are Control Plane operators provisioned and recovered, and how is their identity kept separate from tenant Admins and legacy Core `isSuperAdmin`?
- **Q-AC-02 — Product and Backend:** What is the tenant Admin invitation/password-setting flow, permitted updates, tenant cardinality and management of elevated privileges? Which operations belong in V1?
- **Q-AC-03 — Product and Backend:** Which global/per-tenant list, search and detail fields are allowed for each actor, including incomplete accounts, personal data, KYC, profile, Terms and financial references?
- **Q-AC-04 — Product:** Should account-control detail expose only current state or historical verification/validation/profile/acceptance changes, and which existing validation decisions may be surfaced as separate actions?

## Pause Reactivate

- **Q-PA-01 — Product and Backend:** Does pause block every login/access surface, including private modules and API tokens? What dedicated access state and consistent error contract should Core own?
- **Q-PA-02 — Product and Backend:** Are existing sessions/tokens revoked immediately or denied on subsequent authorization checks, and how are already-running requests handled?
- **Q-PA-03 — Product and Backend:** While paused, are password recovery/change, email confirmation and profile/verification actions allowed? None must silently reactivate the account.
- **Q-PA-04 — Product and Backend:** Which background operations continue, stop or queue during pause, especially payment webhooks, scheduled jobs, notifications and financial obligations? How is data/history preserved without implying settlement cancellation?
- **Q-PA-05 — Product and Backend:** What prerequisites restore access, and how are unchanged KYC, email, Company, suitability and other business states preserved on reactivation?
- **Q-PA-06 — Product and Backend:** Which reason, authorization, result and sanitized before/after fields are mandatory for pause/reactivate audit? Refer to Q-AU-01–03 for shared audit policy.
- **Q-PA-07 — Product:** Is the same capability required for tenant Admins, Investors and Entrepreneurs in V1, and what are the self-pause, last-admin and privileged-account restrictions?

## Tenant Reassignment

- **Q-TR-01 — Product:** Which actors may move tenants, under what eligibility restrictions, and does reassignment affect future operations only or historical ownership?
- **Q-TR-02 — Product and Backend:** How are Opportunities, Investments, contracts/documents, payments/refunds, receipts/wallet/cashouts, provider configuration, KYC, Company and tools treated without corrupting their lineage?
- **Q-TR-03 — Product and Backend:** How are identity uniqueness, destination Terms acceptance, classification/catalog differences and tenant configuration resolved before migration?
- **Q-TR-04 — Backend with Product approval:** What preflight, atomicity/partial-failure, idempotency/readback and rollback policy can the Core migration command guarantee, and which audit operation links source and target?

## Terms

- **Q-TE-01 — Product:** Do published revisions require existing-user reacceptance? If so, which actors/actions are gated and what remains available before acceptance?
- **Q-TE-02 — Product and Backend:** Is acceptance limited to Investors or required for Entrepreneurs/Admins too, and what immutable acceptance history/evidence must be retained across revisions and tenant changes?
- **Q-TE-03 — Product:** Who drafts, approves and publishes tenant Terms, and is the current immediate-publication model sufficient or is a draft/approval workflow required?
- **Q-TE-04 — Backend with Product approval:** What scoped current/history/publication and acceptance-read contracts expose Core revision IDs, and how do Settings/Account Control reconcile publication, concurrent revisions, freshness and conflicts without changing accepted-revision evidence?

## Questionnaire

- **Q-QU-01 — Product:** Is the suitability catalog global or tenant-specific, and is editing content/options in V1 or only consultation?
- **Q-QU-02 — Product and Backend:** What catalog versioning, fixed-ID compatibility, activation and in-flight-answer policy is required before edits are possible?
- **Q-QU-03 — Product and Backend:** Must raw selected answers and catalog versions be retained, and how do changed questions affect existing results or reassessment requirements?

## Classification

- **Q-CL-01 — Product:** Who approves weights, ranges, labels and scoring semantics? Are the seeded ranges approved or provisional?
- **Q-CL-02 — Product and Backend:** Are tenant-specific algorithms or manual overrides permitted, and what reason, permissions and version/audit evidence would they require?
- **Q-CL-03 — Product and Backend:** Do rule changes recalculate historical profiles, apply only to new assessments, or require explicit reassessment? How is the resulting history represented?

## Features

- **Q-FE-01 — Product and Backend:** Which existing settings/flags can Super Admin manage, with what typed validation and tenant-wide effect? Distinguish display preferences from access enforcement.
- **Q-FE-02 — Product:** Are Aplicações/commercial plans/entitlements in V1, or does scope remain existing settings, Admin menu visibility and owner tools? Advanced commercial flags are deferred in the architecture.
- **Q-FE-03 — Product and Backend:** How should tenant-level gateway choice/configuration, Opportunity-level PAG credentials and build-time frontend flags be represented without conflating ownership or configured state with health?

The four Settings concepts (Investor Profile, Wallet, anonymous-investment default and Opportunity information) demonstrate availability/default choices only. Q-FE-01 must establish each authoritative flag mapping, affected fields/actions and whether it is visibility, an initial value or access enforcement; their local keys do not settle those semantics. Q-FE-02 remains open; no generic plans/entitlements were added.

## Settings

- **Q-ST-01 — Product and Backend:** What is the global-default versus tenant-override/inheritance policy per setting? Define effective value/provenance, propagation of default changes, explicit reset/removal, equal-to-default overrides and empty/null/false semantics. Who can edit global defaults versus tenant values?
- **Q-ST-02 — Product and Backend:** Which logo/favicon types, byte/dimension limits, content/SVG validation, storage/delivery access, replacement/removal/default and orphan-cleanup rules are authoritative? Current frontend checks and object URLs are illustrative, not approved Backend limits or storage.
- **Q-ST-03 — Product and Backend:** Which Identity/Experience keys, formats/lengths and editable fields are allowed? Define section/field validation errors, authorization scope, write atomicity, concurrency/version conflicts, authoritative readback and safe ambiguous-response/retry behavior. General tenant identity/domain/lifecycle stays read-only in this prototype.

## SMTP

- **Q-SM-01 — Product and Backend:** Who owns tenant/environment SMTP configuration and safe status reads, which provider/credential fields and test/send operations belong in the dedicated management scope, and how are secret storage/masking, permissions and durable audit guaranteed? Settings implements only a summary/shortcut; configured is not a delivery-health guarantee.

## RBAC

- **Q-RB-01 — Product and Backend:** What operator roles, permission grants, default-deny rules and privileged-account safeguards are required? Complete counterpart activation/reactivation and non-account permissions before exposing commands.
- **Q-RB-02 — Product and Backend:** Can operators be restricted to assigned tenants, and which permissions separately grant global read or write scope?
- **Q-RB-03 — Backend:** What are the service credential issuance/rotation, issuer/audience, expiry and internal-route authorization contracts? Ordinary actor tokens must not authorize internal routes.
- **Q-RB-04 — Product and Backend:** Which sensitive fields/configurations are readable or editable, and how are denied attempts and inactive operator sessions enforced?

## Audit

- **Q-AU-01 — Product and Backend:** What is the ownership/correlation model for Control Plane and Core audit, and the durability guarantee if a critical mutation succeeds but audit persistence fails?
- **Q-AU-02 — Product and Backend:** What append-only protections, retention, query permissions, redaction and IP/user-agent policy apply to administrative evidence?
- **Q-AU-03 — Product and Backend:** Which successful, failed and denied actions must be recorded, with what ordering/result and event-query contract for Dashboard and audit management?

Resolved decisions should be recorded against their IDs with an evidence reference. Do not delete uncertainty by implementing an assumption or relabeling an unrelated existing Core action.
