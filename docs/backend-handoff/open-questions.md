# Open Questions

This is the single canonical list of unresolved Product/Backend decisions for this handoff. IDs are references, not commitments or delivered capabilities. All items remain open as of 2026-10-06. Product chooses policy; Backend confirms feasible contracts/invariants. No assignment to a named person or delivery date is assumed.

Context update: Whitelabel Account Control, Whitelabel Settings, Whitelabel Emails and Finance / Gateways V1 are **FRONTEND PROTOTYPED** at approved `dev@6b46d570262dc5f6a66737bd88eb1cedb7b6a8d9`. Account, Settings, Emails and Finance actions demonstrate local UI only, not answers to the questions below. No real email, provider, banking or financial operation occurs. Pause/migration, provisioning/RBAC/audit, inheritance/assets/Terms, SMTP/events/templates, gateway/provider/secret semantics, bank ownership, modality relationships and profile governance remain unresolved. Local cross-screen coherence does not establish authoritative contracts, and no question is closed by prototype approval or local feedback.

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
- **Q-SM-02 — Product and Backend:** What exactly does the real SMTP test verify: connection/TLS/authentication, message dispatch/acceptance or delivery? Does it use saved configuration or an explicit draft, which destinations and limits/timeouts/retry rules apply, and what sanitized result/error and request/readback semantics avoid implying delivery from configuration alone?

Q-SM-01 now applies to the detailed Emails prototype as well as the Settings summary; it remains unresolved. The secure contract must define omitted/blank/replace/reset secret updates, safe configured/masked reads and server-side storage without exposing existing passwords. No additional SMTP ownership/security question duplicates it.

## Email Events

- **Q-EM-01 — Product and Backend:** What is the exact supported/configurable event catalog, stable event identity and actor coverage? Which of registration completed, password recovery, account approved and Terms updated may be configured, if any, and how are unsupported events rejected? The four current rows are illustrative, not confirmed flags.
- **Q-EM-02 — Backend with Product approval:** At which authoritative Core transitions are Equity and Debt investment confirmations currently dispatched, and which existing trigger/preference capabilities can be reused to deliver independent per-Whitelabel controls? Define confirmation criteria and duplicate/retry behavior without coupling the two confirmed Product requirements or inferring state from the frontend.
- **Q-EM-03 — Product and Backend:** Which existing email sends can safely be suppressed per Whitelabel, which security/mandatory messages must remain available, and how do changed preferences affect queued/in-flight/retried or historical sends without altering underlying business state?
- **Q-EM-04 — Product and Backend:** When a tenant event preference is absent, what is the authoritative fallback/effective state and provenance? Does absence inherit a default or preserve existing dispatch behavior, how do default changes propagate, and how do read/update/reset contracts distinguish absent from explicitly enabled/disabled values?

Equity and Debt independence is already a Product requirement; these questions concern supported contracts and effects, not whether the frontend should tie the switches together. Event audit policy references Q-AU-01–03 below; it is not a separate duplicate question set.

## Email Templates

- **Q-ET-01 — Product and Backend:** What authoritative listing and event-to-template mapping expose platform defaults versus tenant overrides, and what inheritance/effective-source/reset/propagation rules apply? Which audited Core capabilities already support that model? The current summary does not prove coverage or overrides.
- **Q-ET-02 — Product and Backend:** For the later template editor, what versioning, draft/approval/publication, activation/rollback and concurrency rules are required, and which revision is used for an in-flight send? Define authorized update/publish readback; no editor is delivered by Emails V1.
- **Q-ET-03 — Product and Backend:** How are sender email/display name and visual branding resolved across SMTP, tenant Identity, platform defaults and template overrides, including unconfigured/missing values? Establish precedence and ownership without duplicating SMTP or Identity truth.

## Finance / Gateways

- **Q-GW-01 — Product and Backend:** Which providers are supported, which credential schema/validation belongs to each provider and who owns tenant gateway configuration? Define secure preserve/replace/rotate/revoke semantics and sanitized configured metadata without secret readback.
- **Q-GW-02 — Product and Backend:** What do principal, secondary and contingency mean? May multiple providers be active, and how is a principal/default provider selected or changed?
- **Q-GW-03 — Product and Backend:** What does a connection test prove, which saved/draft configuration may it use, and what timeout/rate/result/error contract safely avoids secret or raw provider-error exposure?
- **Q-GW-04 — Product and Backend:** What are activation/deactivation prerequisites and effects on future versus existing operations, in-flight work, provider switching and fallback? No financial state change may be inferred from the prototype.

The single-principal rule and Production completeness warning are prototype assumptions, not answers to Q-GW-01–04.

## Bank Accounts

- **Q-BA-01 — Product and Backend:** What is the canonical owner of a bank account and how does it relate to Whitelabel, Opportunity and gateway/provider configuration?
- **Q-BA-02 — Product and Backend:** What verification, receiving and payout semantics apply, and which states are authoritative?
- **Q-BA-03 — Product and Backend:** Are multiple accounts supported; is there a principal/default account; and how is an account selected for a flow?
- **Q-BA-04 — Product and Backend:** Which active/in-flight relationships constrain update, deactivation or removal, and what minimized/masked/write-only fields, authorization and audit are required?

The prototype's Whitelabel ownership and banking validation/masks are illustrative, not authoritative.

## Gateway / Modality Relationship

- **Q-GM-01 — Product and Backend:** What is the authoritative source of tenant modality availability and gateway dependencies for Equity, Debt and any future Capital de giro capability?
- **Q-GM-02 — Product and Backend:** Does Sandbox count as configured or satisfy a modality dependency, or is Production required for readiness/availability? Define how environment changes status without implying financial execution.

## RBAC

- **Q-RB-01 — Product and Backend:** What operator roles, permission grants, default-deny rules and privileged-account safeguards are required? Complete counterpart activation/reactivation and non-account permissions before exposing commands.
- **Q-RB-02 — Product and Backend:** Can operators be restricted to assigned tenants, and which permissions separately grant global read or write scope?
- **Q-RB-03 — Backend:** What are the service credential issuance/rotation, issuer/audience, expiry and internal-route authorization contracts? Ordinary actor tokens must not authorize internal routes.
- **Q-RB-04 — Product and Backend:** Which sensitive fields/configurations are readable or editable, and how are denied attempts and inactive operator sessions enforced?

## Audit

- **Q-AU-01 — Product and Backend:** What is the ownership/correlation model for Control Plane and Core audit, and the durability guarantee if a critical mutation succeeds but audit persistence fails?
- **Q-AU-02 — Product and Backend:** What append-only protections, retention, query permissions, redaction and IP/user-agent policy apply to administrative evidence?
- **Q-AU-03 — Product and Backend:** Which successful, failed and denied actions must be recorded, with what ordering/result and event-query contract for Dashboard and audit management?

For Emails, Q-AU-01–03 include SMTP configuration changes, test request/results, supported event enabled/disabled changes and later template update/publication. Define required operator/Whitelabel/configuration-or-event references, sanitized before/after state, result, timestamp and correlation, including failure/denial coverage and Core writer correlation. Secrets must never enter evidence. Session activity does not answer these existing audit questions.

Resolved decisions should be recorded against their IDs with an evidence reference. Do not delete uncertainty by implementing an assumption or relabeling an unrelated existing Core action.
