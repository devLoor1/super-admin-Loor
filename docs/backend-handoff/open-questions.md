# Open Questions

This is the single canonical list of unresolved Product/Backend decisions for this handoff. IDs are references, not commitments or delivered capabilities. All items remain open as of 2026-10-08. Product chooses policy; Backend confirms feasible contracts/invariants. No assignment to a named person or delivery date is assumed.

Context update: prior business modules, complete Operation V1 and Complete Finance Core V1 are **FRONTEND PROTOTYPED** at approved `dev@9f8abc6d55410e63a2edaf6d8efeafcd217b7a30`. Account, Settings, Emails, Finance and Operation business actions demonstrate local UI only, not answers to the questions below. Finance Core is read-only/supervisory: Investment, Payment, WalletMovement and Wallet balance remain distinct; no automatic financial synchronization is implemented or confirmed. Frontend login/session/guard/logout/authentication refresh is acknowledged separately, not live Backend E2E/RBAC evidence. No real email, provider, banking or financial operation occurs. Existing pause/migration, provisioning/RBAC/audit, inheritance/assets/Terms, SMTP/events/templates, gateway/bank/modality/catalog and Operation/profile questions remain open alongside the Finance Core questions. Local coherence/prototype approval does not establish authoritative contracts or close a decision.

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

- **Q-GM-01 — Product and Backend:** Establish the authoritative catalogs, scope and semantics for these separate concepts:
  - **A — Financial modalities:** Which modalities are officially supported/configurable per tenant, and what is the authoritative source of availability and gateway dependencies? Finance / Gateways V1 currently represents Equity and Debt only; additional modalities require explicit Product definition.
  - **B — Segments:** What is the authoritative Segment catalog and its semantics/scope? Capital de Giro is a Product-defined valid example/option in this independent catalog.
  - **C — Resource Uses / Usos dos Recursos:** What is the authoritative Resource Use catalog and its semantics/scope, separately from Segments? Capital de Giro is also a Product-defined valid example/option here; sharing that example does not merge the domains.

  Segments and Resource Uses now each have independent local CRUD (create, list/read, update, delete) in the combined screen: **FRONTEND PROTOTYPED / CORE SUPPORT TO VERIFY / CONTROL PLANE EXPOSURE NEEDED / PRODUCT DECISION REQUIRED / INTEGRATION PENDING / E2E VALIDATION PENDING**. Their independence and Capital de Giro example are defined by Product; Backend support and Control Plane contracts are not established by the prototype. [Chapter 09](09-whitelabel-finance-segments-resource-uses.md) and Q-CAT-01–13 below extend B/C without closing these existing questions or prescribing route names/technology.

- **Q-GM-02 — Product and Backend:** Does Sandbox count as configured or satisfy a modality dependency, or is Production required for readiness/availability? Define how environment changes status without implying financial execution.

Segments and Resource Uses remain separate and are now presented together in their own prototype; their existing questions/scope above are preserved. The following questions concern modality governance only. Equity/Debt local enablement, generic rule choices and shared Finance dependency displays do not settle Q-GM-01–02.

## Modalities / Rules

- **Q-MO-01 — Product and Backend:** Within the official financial-modality catalog requested in Q-GM-01-A, what stable identity, supported-versus-configurable distinction, source of truth and definition/version lifecycle govern tenant reads? Equity and Debt are the current prototype catalog, not proof of complete production coverage.
- **Q-MO-02 — Product and Backend:** Does tenant-level modality enablement exist, where is its authoritative state owned, and what validated enable/disable/readback contract and operational meaning apply?
- **Q-MO-03 — Product and Backend:** What impact, if any, does disabling have on new versus existing Opportunities and their Investment/Payment lineage? Is disable allowed while active business exists, and what restrictions or preflight must preserve historical/financial obligations without implicit cascades?
- **Q-MO-04 — Product and Backend:** On re-enable, are prior rule choices/dependency mappings retained, reset or revalidated? What concurrency, ambiguous-response and reconciliation semantics prevent duplicate transitions?
- **Q-MO-05 — Product and Backend:** Which real rules are global, tenant-wide, modality-specific or Opportunity-specific, and who may edit each scope? V1 has only modality-specific editing plus a read-only general overview; it does not define real ownership.
- **Q-MO-06 — Product and Backend:** What authoritative rule catalog, typed values, validation and operational enforcement are supported for each modality? Are the illustrative manual-approval and Opportunity-configuration concepts real configurable rules at all, and what are their effects if adopted?
- **Q-MO-07 — Product and Backend:** For modality rules specifically, do platform defaults exist and how do tenant override granularity, effective provenance, inheritance/fallback, explicit reset, empty/null semantics, versioning and propagation work? Apply Q-ST-01 where appropriate without assuming generic Settings delivers rule inheritance.
- **Q-MO-08 — Product and Backend:** Within Q-GM-01–02 and Q-GW-01–04, what explicit gateway-to-modality mapping/cardinality, provider/fallback selection and readiness criteria govern availability? Can one gateway serve multiple modalities, and how do Sandbox/Production affect readiness independently from local configured/active labels?
- **Q-MO-09 — Product and Backend:** Given Q-BA-01–04, does any modality require a bank account, which canonical owner/account and receiving/payout relation apply, and what readiness constraints follow? Current relationship is Relação não definida; an active-account count is not a requirement.
- **Q-MO-10 — Product and Backend:** What documents/requirements apply per modality, who owns their catalog/version/source, and how do missing requirements affect tenant availability versus a specific Opportunity without creating a duplicate Opportunity-document domain?
- **Q-MO-11 — Product and Backend:** Under Q-RB-01–04, which operator/tenant/resource grants separately authorize modality view/update/enable/disable and rule view/update, and what denied/conflict/dependency error/readback contract is safe? Proposed labels are not RBAC implementation.
- **Q-MO-12 — Product and Backend:** Under Q-AU-01–03, which enable/disable/rule-update successes, failures and denials require durable records, with what rule-key and sanitized before/after metadata and Core/Control Plane correlation? Current session activity is not evidence of those events.

## Segments / Resource Uses

These extend Q-GM-01-B/C for the two independent domains, not modality rules. **PRODUCT DECISION REQUIRED / BACKEND CONTRACT TO DEFINE**; no question is closed by tenant presentation, local CRUD or illustrative seeds. Capital de Giro may exist independently in both and is never a modality, alias or automatic mapping.

- **Q-CAT-01 — Product and Backend:** Who owns each catalog and its source of truth: global, per-Whitelabel, global plus tenant overrides or global plus per-tenant enablement? Define identity/provenance and authorized read/write scope independently; the tenant-scoped UI does not establish ownership.
- **Q-CAT-02 — Product and Backend:** What is the official Segment dataset/source of truth, stable identity and seed/definition lifecycle? Which list/read/query behavior is supported, and how do official versus locally managed records evolve without adopting illustrative seeds as authoritative data?
- **Q-CAT-03 — Product and Backend:** What is the official Resource Use dataset/source of truth, stable identity and seed/definition lifecycle, separately from Segments? Which list/read/query behavior is supported, without deriving IDs/contents from the other catalog or shared names?
- **Q-CAT-04 — Product and Backend:** What final per-catalog/scope uniqueness and comparison rules apply, including case, accents, spacing, inactive/deleted names and rename conflicts? The frontend blocks normalized same-catalog duplicates only and permits cross-catalog names; this is not an authoritative validator.
- **Q-CAT-05 — Product and Backend:** What final required fields, formats and length limits govern each catalog's create/update and sanitized field errors? Name 2–60 and description up to 160 characters remain prototype UX constraints, not settled rules.
- **Q-CAT-06 — Product and Backend:** What does active/inactive mean operationally for each catalog, is reactivation supported, and how does status affect future selection and existing Opportunity references? Does status use update or distinct commands, with what preconditions/readback?
- **Q-CAT-07 — Product and Backend:** Does hard or soft delete exist, can referenced/previously used records be deleted, does inactivation replace deletion after use, and what historical retention/reference protection and safe conflict/readback apply? Local removal and inactive retention are different prototype behaviors, not Backend semantics.
- **Q-CAT-08 — Product and Backend:** How are Segments and Resource Uses consumed independently in authoritative Opportunity creation/configuration, with what required/optional selection, reference identity, readback and permitted changes? Define effects on existing versus future Opportunities, usage/reference reads and any separately approved migration/assignment. Operation now consumes local references, but this does not settle the contract; catalog reverse usage/count remains `—` and authoritative integration is pending.
- **Q-CAT-09 — Product and Backend:** Does an Opportunity allow one or multiple Segments, and independently one or multiple Resource Uses? Is any cross-catalog relationship needed at all; if so, what explicit semantics/mapping apply? Currently there is no automatic relationship, and same names do not imply one.
- **Q-CAT-10 — Product and Backend:** Does either catalog need hierarchy, parent relationships, stable codes or persistent ordering? Define metadata, validation and query behavior separately; local table sorting is not a domain order or proof of hierarchy.
- **Q-CAT-11 — Product and Backend:** Under Q-RB-01–04, which independent operator/resource/scope grants authorize Segment and Resource Use view/create/update/delete? If supported, do activate/inactivate need separate permissions? Specification labels are not RBAC or automatic grants from a shared screen.
- **Q-CAT-12 — Product and Backend:** Under Q-AU-01–03, which catalog create/update/delete/activate/inactivate successes, failures and denials need durable audit, with what operator/context/catalog/record ID, sanitized before/after, result/time/correlation and query authorization? Define Core/Control Plane ownership/durability without treating session feedback as existing events.
- **Q-CAT-13 — Backend with Product approval:** What version/concurrency/conflict and authoritative readback guarantees apply to each catalog's commands, including ambiguous responses/retries and referenced records? Define safe field/not-found/auth/reference/conflict errors and correlation; no prototype store behavior establishes these guarantees.

## Operation Opportunities

The [Opportunity prototype](10-operation-opportunities.md) does not answer these policy/contract questions. Workflow, cardinalities, tenant moves and validators remain **PRODUCT DECISION REQUIRED / BACKEND DECISION REQUIRED**, not rules adopted from UI composition.

- **Q-OP-01 — Product and Backend:** What are the official Opportunity states, allowed transitions, preconditions and pause/resume semantics? How, if at all, do Rascunho/Ativa/Pausada map to them? These are only a PROTOTYPE UX STATE MODEL; no transition graph or financial eligibility is confirmed.
- **Q-OP-02 — Product and Backend:** What separates draft, review, approval, publication and public/investment visibility, who may perform each transition, and what provider/document/financial side effects and authoritative readback apply? No official approval/publication action is prototyped.
- **Q-OP-03 — Product and Backend:** Is modality required, may an Opportunity have one or multiple modalities, and how do official catalog/version and tenant enablement/rule constraints govern selection? Current one-of-Equity/Debt UX is not final cardinality or enforcement; extend Q-GM-01-A/Q-MO-01–10.
- **Q-OP-04 — Product and Backend:** Is a Segment required, can one or multiple Segments be associated, and how are scoped active/inactive/deleted records and historical references validated/read back? Decide independently of Resource Use; extend Q-CAT-08–09.
- **Q-OP-05 — Product and Backend:** Is a Resource Use required, can one or multiple be associated, and what independent selection/reference/retention policy applies? Multi-select is PROTOTYPE UX BEHAVIOR, not cardinality; same names or Capital de Giro do not create a Segment mapping.
- **Q-OP-06 — Product and Backend:** Is an Entrepreneur/originator required, is the relationship one or many, and how do person/company/representative roles and permitted tenant scope map to it? One optional prototype reference does not settle ownership/cardinality; coordinate Q-OE-02–03.
- **Q-OP-07 — Product and Backend:** What is authoritative Opportunity Whitelabel ownership, and is changing tenants allowed, restricted, clone/migration-based or forbidden? Define eligibility, identity/configuration/Entrepreneur/catalog/financial lineage safeguards, permission, atomicity and readback. Clearing tenant refs while retaining modality is only PROTOTYPE SAFETY BEHAVIOR, not account migration policy.
- **Q-OP-08 — Product and Backend:** Are cancel, archive, hard/soft delete or restore supported, with what lifecycle/dependency constraints and historical/financial retention? No deletion action exists; do not infer one from edit/status UX.
- **Q-OP-09 — Product and Backend:** Which Opportunity-specific financial parameters are needed and owned by which domain: minimum investment, target, valuation, interest/yield/return, maturity/amortization/schedule or fees? Define authoritative validations/calculation/read scope separately; none is supplied by modality labels or implemented in Operation V1.
- **Q-OP-10 — Product and Backend:** What final required fields, name/description formats/lengths, uniqueness and relationship validators apply to create/edit, with what sanitized errors? Name 3–80, description ≤300 and required tenant/modality remain PROTOTYPE UX CONSTRAINTS, not authoritative Backend rules.

## Operation Investors

See [Investor handoff](11-operation-investors.md). The module stays read-only; Accounts owns identity/access, Compliance KYC decisions, and Finance investments/financial actions.

- **Q-OI-01 — Product and Backend:** Is Investor identity global or tenant-scoped, how is Account ↔ Investor/profile related, and what stable IDs, multi-tenant participation and deduplication rules apply? Reusing Accounts prototype IDs does not define this model or authorize cross-tenant merging.
- **Q-OI-02 — Product and Backend:** Which Core-owned source supplies the operational Investor profile, permitted fields and complete/incomplete/null representations, and does it have a distinct profile ID? How is requested global/tenant scope authorized? Coordinate Q-AC-03 rather than creating duplicate operational persistence.
- **Q-OI-03 — Product and Backend:** Which authoritative Compliance KYC summary/source, statuses, process/reference/date and allowed personal fields may Operation read, and how are KYC, account access/validation and suitability kept distinct? Prototype contextual values are not official workflow.
- **Q-OI-04 — Product and Backend:** Which Finance source exposes Investment associations/counts and Opportunity references, with what inclusion/status/freshness/scope and null/error semantics? Current seeds are illustrative, read-only and amount-free, not financial source of truth; no financial mutation belongs in Operation.
- **Q-OI-05 — Product and Backend:** What per-account, Finance Investment and Compliance process deep-link contracts/IDs and destination read permissions are supported? Current Accounts navigation selects only tenant/type; Ver investimentos now opens the frontend Finance list with `?investidor=:investorId`, while Compliance gives pending feedback. This is FRONTEND PROTOTYPED NAVIGATION; CONTROL PLANE CONTRACT / DEEP LINK TO DEFINE remains open, not invented Backend routes.

## Operation Entrepreneurs

See [Entrepreneur handoff](12-operation-entrepreneurs.md). Accounts owns account identity/access/mutations, Opportunities its writes, and Compliance KYC decisions.

- **Q-OE-01 — Product and Backend:** What global/tenant Entrepreneur identity, Account ↔ operational-profile mapping/source, stable ID and safe field/read contract applies? Prototype Account-ID projection is not a definitive Backend model; avoid duplicate persistence.
- **Q-OE-02 — Product and Backend:** How are natural person, company/legal entity, originator and representative modeled, including multiple representatives/entities and deduplication? What Company data belongs to Accounts versus the operational profile, and how is validation distinguished from KYC?
- **Q-OE-03 — Product and Backend:** What authoritative Entrepreneur ↔ Opportunity relationship, required/optional one-versus-many cardinality, representative role and tenant/lineage constraints apply? The live local Opportunity store read is prototype coherence, not a confirmed relationship contract; coordinate Q-OP-06.
- **Q-OE-04 — Product and Backend:** What Compliance-owned Entrepreneur KYC source/status/process/date/allowed-field contract exists, and how does Company validation relate without implying approval? Current KYC is FRONTEND ILLUSTRATIVE DATA because Accounts lacks equivalent prototype fields, not Core evidence.
- **Q-OE-05 — Product and Backend:** What per-account and Compliance process deep links/IDs/read permissions apply, and how should the authoritative Opportunity contextual filter be exposed? Existing tenant/type and Opportunity hash links do not establish Backend routes or record-specific Account navigation.

## Operation Cross Cutting

- **Q-OC-01 — Backend with Product approval:** What authoritative Account/Operation projection/readback, freshness/invalidation and synchronization contract keeps access/tenant/context current? Page-local Accounts pause/reactivate is not automatically reflected in Operation seeds: FRONTEND PROTOTYPE LIMITATION / INTEGRATION CONTRACT REQUIRED, not Backend behavior.
- **Q-OC-02 — Product and Backend:** Under Q-RB-01–04, which independent global/assigned-tenant/resource/field grants authorize Opportunity view/create/update/status and participant views, and which destination-domain grants govern links/actions? Conceptual labels and session guards do not implement RBAC, official workflow permissions or financial/KYC/account grants.
- **Q-OC-03 — Product and Backend:** Under Q-AU-01–03, which authoritative Opportunity create/update/status/classification successes, failures and denials need durable audit? Is read auditing such as INVESTOR_VIEWED/ENTREPRENEUR_VIEWED needed at all (AUDIT POLICY DECISION REQUIRED)? Define sanitized operator/context/record/before-after/result/time/correlation metadata, durability/query and cross-system ownership; session activity is not audit.
- **Q-OC-04 — Backend with Product approval:** What version/concurrency/conditional-write/conflict and command/readback guarantees apply, including ambiguous responses, retry/idempotency and independent domains? In-memory saves and unsaved-change guards do not establish server guarantees.
- **Q-OC-05 — Backend with Product approval:** Which sanitized validation/not-found/auth/ownership/reference/workflow/conflict/partial-source errors and safe correlation/readback contracts apply? Missing data must not become false zero/approval/configured state; do not expose secrets or raw provider errors.
- **Q-OC-06 — Product and Backend:** What authoritative pagination/search/filter/sort contract, searchable fields, matching semantics, ordering/null handling, scoped totals and freshness applies to the three lists? Frontend local pages/counts and global presentation are neither authoritative query semantics nor permission grants; Dashboard metrics remain independently unresolved under Q-WL-04.

## Finance Investments

See [Investments handoff](13-finance-investments.md). All questions remain unresolved; Pendente/Ativo/Encerrado is prototype-only, with no official workflow or financial commands.

- **Q-FI-01 — Product and Backend:** Which Core-owned Investment records/services are authoritative for the target supervisory projection, and what stable IDs, authoritative amount/unit/currency, precision, date and null/source semantics apply? Prototype fields/formatting are not an amount or storage contract.
- **Q-FI-02 — Product and Backend:** What is the official Investment lifecycle/status vocabulary, eligibility and transition policy, including cancellation and financial settlement semantics? Do not map Pendente/Ativo/Encerrado or Payment status to an official workflow; no V1 execution is implied.
- **Q-FI-03 — Product and Backend:** What authoritative Investor and Opportunity relationships/cardinalities, Whitelabel ownership, historical context and authorized global/tenant scope apply? How are mismatches/missing references exposed without tenant migration, identity merging or duplicated Operation records?
- **Q-FI-04 — Product and Backend:** Is Investment ↔ Payment zero/one/many, can Payment be independent, and how are related payments read back? Any payment-to-Investment synchronization/event/precondition policy remains explicit Q-FC-01, never inferred from a displayed Pago or amount.
- **Q-FI-05 — Product and Backend:** Which explicit Wallet/WalletMovement references belong in Investment detail, with what lineage/cardinality/absence policy? Does a relation confer any ownership or settlement meaning, and what safe cross-domain deep links/IDs are supported? Current direct/via-Payment movement lookup is only prototype navigation.
- **Q-FI-06 — Product and Backend:** What Investment-specific read permissions, sensitive fields, audit policy, concurrency/version/freshness, query and sanitized error/readback contracts are needed under Q-FC-02–04, Q-RB-01–04 and Q-AU-01–03? UI counts/global filters and session activity provide none of these guarantees.

## Finance Payments / PIX

See [Payments / PIX handoff](14-finance-payments-pix.md). Prototype Payment states and reused Status PIX do not settle official Payment/PIX lifecycles.

- **Q-FP-01 — Product and Backend:** Which Core source/record contract, authoritative amount/units/currency and official Payment states/transitions apply, and which separate PIX states/lifecycle/method semantics exist? Define state mapping, timestamps/nulls and absence handling; prototype Pago does not mean settlement or receipt.
- **Q-FP-02 — Product and Backend:** Are multiple Payments per Investment supported, may a Payment have no Investment, and what Investor/Opportunity/Whitelabel relationships/cardinalities and lineage/read scopes apply? Optional prototype references do not decide this policy; coordinate Q-FI-03–04.
- **Q-FP-03 — Product and Backend:** What Gateway/provider IDs, safe projection and destination deep links apply, and how are external charge/TxID/event IDs modeled? Define Gateway webhook/event authenticity, duplicates/order, processing ownership and correlation without exposing credentials or giving Payments configuration ownership; coordinate Q-GW-01–04 and Q-FC-01.
- **Q-FP-04 — Product and Backend:** What precisely constitutes payment, financial settlement and confirmed investor receipt, and what authoritative evidence/time/status fields distinguish them? Define independent effects/guarantees, not a frontend paid → active/credit rule.
- **Q-FP-05 — Product and Backend:** What retry/reprocessing, expiration and cancellation rules, permitted commands, eligibility and idempotency/ambiguous-response guarantees apply, including provider failures/in-flight requests? These are future capabilities, not implemented V1 actions.
- **Q-FP-06 — Product and Backend:** Are refund, reversal and chargeback distinct entities/processes, with what full/partial amount, original lineage, permissions, lifecycle and settlement effects? No refund/reversal command or state propagation is authorized by read-only V1.
- **Q-FP-07 — Product and Backend:** What authoritative reconciliation source/process, external reference matching, inconsistency/failure handling, idempotency and traceability guarantees apply? Do not reconcile by matching displayed amounts or manually marking paid.
- **Q-FP-08 — Product and Backend:** What Payment/PIX-specific safe fields, read permissions, audit, version/freshness/query and sanitized error/readback contracts apply under Q-FC-02–04? Separate configured Gateway metadata, operational health and delivered financial evidence.

## Finance Wallet

See [Wallet/WalletMovement handoff](15-finance-wallet.md). REPRESENTED BALANCE is non-authoritative; no ledger, posting, available funds or ownership model is established by the prototype.

- **Q-FW-01 — Product and Backend:** What Core source and canonical Wallet ownership apply: account, Investor, Entrepreneur, Whitelabel or another financial entity? Is there one or multiple Wallets per owner, with what identity/tenant/historical relationship and permitted read scope? The prototype owner/context reference decides none of these alternatives.
- **Q-FW-02 — Product and Backend:** Is Wallet single- or multi-currency, what currency/unit/precision contract applies to balances/movements, and are conversions supported at all? Prototype BRL is not a final currency model or conversion rule.
- **Q-FW-03 — Product and Backend:** Which authoritative ledger/source defines balance composition and available/blocked/pending/settled semantics? How should represented versus authoritative values, as-of/snapshot metadata and unavailable/incomplete data be exposed? `representedBalance` is not withdrawable balance, necessarily settled value, sum of displayed movements or a ledger guarantee.
- **Q-FW-04 — Product and Backend:** What is the official separate WalletMovement taxonomy (type/direction/state), posting/recognition policy and chronology, and when do movements affect each balance component? Define ordering/consistency and pending/failed/reversal history without treating Crédito/Débito or Concluído as a final ledger rule.
- **Q-FW-05 — Product and Backend:** What explicit Payment, Investment, Transfer or other-source relationships/cardinalities and source-ID read contracts apply to movements? How are direct/via-Payment lineage, missing/foreign references and authorized navigation represented without inferring Wallet ownership or generating movements automatically?
- **Q-FW-06 — Product and Backend:** Should Transfers be a dedicated independent domain, with what eventual source, sender/receiver, lifecycle, cashout/withdrawal/settlement scope and destination contract? No Transfer API or execution exists; a pending notice/source ID must not be treated as an implemented Transfer contract.
- **Q-FW-07 — Product and Backend:** What reversal/correction, idempotent posting and reconciliation guarantees apply to the ledger and movements, including ordering/duplicate events, partial failures and consistency with external sources? No manual balance adjustment or arithmetic over visible rows supplies these guarantees.
- **Q-FW-08 — Product and Backend:** What Wallet/movement query/pagination/freshness/snapshot and sanitized error/authoritative readback contracts apply, especially when movement history is incomplete? Missing data must not be shown as zero funds or a settled balance; coordinate Q-FC-02–04.
- **Q-FW-09 — Product and Backend:** Which independent Wallet/WalletMovement view permissions, field policy, official Wallet lifecycle and audit/version guarantees apply? Ativa/Bloqueada is only a PROTOTYPE UX STATE MODEL; no block/unblock or financial mutation permission is implied by viewing a Wallet.

## Finance Core Cross Cutting

- **Q-FC-01 — Product and Backend:** Which authoritative cross-domain financial event/synchronization policies, if any, couple Investment, Payment, WalletMovement and balance? Define owners, causal evidence, cardinalities, ordering, idempotency, partial failure and authoritative readback. Frontend V1 implements/confirms none: Payment paid → Investment active/Wallet credit, Investment state → Payment state, movement → Payment state, or represented balance → sum of displayed movements must never be inferred.
- **Q-FC-02 — Backend with Product approval:** Which authorized source/query/record/reference contracts, stable IDs, ordering/null handling, scoped totals, amount/units, freshness/snapshots and deep-link semantics are required across the three supervision lists/details and separate movements? Define independent domains, safe empty/partial states and Core-authoritative readback, not financial aggregation from UI records or duplicate Control Plane persistence.
- **Q-FC-03 — Product and Backend:** Under Q-RB-01–04/Q-AU-01–03, what independent global/assigned-tenant/resource/field grants apply to INVESTMENT_VIEW, PAYMENT_VIEW, WALLET_VIEW and WALLET_MOVEMENT_VIEW, and is auditing their reads needed at all? AUDIT POLICY DECISION REQUIRED includes minimized safe metadata, failure/denial coverage, retention, durability/query and Core/Control Plane correlation. Labels/session guards/activity are not grants or audit writers; no V1 financial mutation permission is implied.
- **Q-FC-04 — Backend with Product approval:** What consistency/version/concurrency and sanitized auth/scope/not-found/reference/conflict/partial-source/error contracts apply to financial reads and eventual approved commands, with what correlation/idempotency/readback guarantees? Preserve existing source truth after ambiguous responses; never expose secrets, unnecessary personal/bank/PIX data or raw provider errors. Future settlement/refund/transfer capabilities require separate contracts, not implementation through this handoff.

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
