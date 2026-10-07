# Business Rules

## Confirmed rules

Confirmed architecture boundaries are requirements for the handoff, not claims that the audited code already complies. Confirmed Core behaviors below are static source findings, not Production parity or E2E evidence.

| ID | Confirmed basis | Rule or observed behavior |
| --- | --- | --- |
| C-01 | Architecture sections 2–5, 39 | Core remains the operational source of truth; Control Plane uses internal services, without direct DB access or operational duplication. |
| C-02 | Architecture sections 24, 30 | Operator authorization and service authentication are separate; requested tenant filters are not permission grants. |
| C-03 | Approved frontend source at ec86b475e0126667e2fbece490730bdecc271584 | Login, Dashboard, Whitelabels, Whitelabel Account Control, Whitelabel Settings, Whitelabel Emails, Finance / Gateways, Modalities / Rules and Segments / Resource Uses V1 are FRONTEND PROTOTYPED without authentication/business API integration. Actions/saves/activity are local and reset on reload; no real email, provider, banking or financial operation occurs. |
| C-04 | Current user intent and approved local prototype | Pause intent is temporary access prevention with data/history preservation; the prototype requires a reason and changes only local access state. Reactivate restores local access without changing unrelated business/validation state. Real enforcement is not implemented; policy is PARTIALLY DEFINED. |
| C-05 | Core audit | Investor validation denial/self soft-deletion, tenant active flag and owner-tool disable are separate behaviors, not generic account pause. |
| C-06 | Core Terms service/auth | Current tenant revision is required at Investor registration; rejected acceptance/stale revision fail before Investor creation in the audited path. Existing-user forced reacceptance was not found. |
| C-07 | Core questionnaire/profile | Global catalog has 7 questions/30 canonical answers; validator uses fixed numeric IDs, Q6 array, remaining answers scalar. Classification is weighted and attached as a result; full answer/version history is not persisted by that path. |
| C-08 | Core models | Accounts and Opportunities carry tenant FKs; their existence does not provide a supported reassignment command. |
| C-09 | Architecture sections 15–17, 28 | No generic wallet/payment ownership or amount edits; financial mutations require domain-specific commands and safe idempotency policy. |
| C-10 | Architecture sections 20, 24, 29 | Secrets/service tokens are never frontend or audit output; critical operations require traceable sanitized records. |
| C-11 | Approved local reassignment/Admin prototype | Change Whitelabel records a simulated request without moving tenant/lineage. Admin creation adds a local illustrative record/invitation state, not provisioning, credentials, invitation delivery or a permission grant. |
| C-12 | Approved Settings prototype | General is read-only; Identity assets are local previews; Experience and four capability concepts show default/tenant provenance with section-level save/discard. No inheritance resolver, server asset validation, feature enforcement or entitlement system is delivered. |
| C-13 | Approved shared Settings/Account Control store | Local Terms publication updates Settings current revision/history and Account Control current revision without changing Investor accepted revision/date or requesting reacceptance. This is session coherence, not authoritative publication or cross-system synchronization. |
| C-14 | Explicit Emails Product requirement and approved prototype | Investment confirmed — Equity and Investment confirmed — Debt must be independently configurable per Whitelabel. Independent switches exist locally; authoritative trigger/preference support remains CORE SUPPORT UNKNOWN / TO VERIFY and INTEGRATION PENDING. |
| C-15 | Explicit security requirement and approved write-only UI | Existing SMTP password/secret must never be readable or returned in full; updates are write-only and logs/audit/errors must omit secrets. Prototype stores only configured metadata, dropping the new draft on save/discard; secure Backend storage/contract is not thereby proven. |
| C-16 | Approved Emails/Settings shared store | Settings owns safe SMTP summary/shortcut; Emails owns detailed SMTP/events. One tenant-local Emails store supplies summary and sender; no duplicate SMTP truth. Real authorization, persistence, event support validation and delivery remain Backend work. |
| C-17 | Approved Emails event labels and template scope | Registration completed, password recovery, account approved and Terms updated are illustrative, not confirmed Backend-configurable flags. Templates is summary-only; local categories/default labels do not establish actual coverage, inheritance or an editor. |
| C-18 | Approved Finance / Gateways prototype and architecture financial boundary | The module is configuration/governance only and performs no wallet, Investment, Payment, Pix, refund, cashout, withdrawal, transfer or reconciliation mutation. Gateway/bank state is local and non-authoritative. |
| C-19 | Approved write-only credential UI | Existing gateway secrets are never readable; edits start blank and only configured/masked metadata is shown. Secure Backend storage and contracts are not proven by the UI. |
| C-20 | Explicit corrected Product taxonomy and approved frontend catalog | Equity and Debt are the only current prototype modalities, not proof of the complete production catalog. Capital de Giro is not a modality; it may exist independently in the separate Segments / Resource Uses catalogs, now presented in their own combined prototype screen. |
| C-21 | Approved Modalities / Rules frontend and financial boundary | Regras gerais is read-only; the sole editor is modality-specific. Shared Finance enablement and local rule choices/activity are in-memory. No Opportunity editing or wallet/payment/Pix/Investment/refund/cashout/withdrawal/transfer/reconciliation mutation occurs. This confirms prototype boundaries, not real rule ownership or enforcement. |
| C-22 | Corrected Product taxonomy and approved catalog model/store | Segment and Resource Use are separate domains with independent identity/lifecycle. Same-name records, including Capital de Giro in both, are not aliases, synchronized records or an automatic mapping. Shared presentation does not merge domains. |
| C-23 | Approved Segments / Resource Uses prototype | Each catalog has independent local CRUD, search/filter/sort/pagination and status. Activity is local/session-only, not authoritative audit; no Opportunity CRUD, association, usage count, migration, assignment or financial mutation occurs. This confirms frontend behavior, not Backend support. |

## Segment and Resource Use rules

See [chapter 09](../09-whitelabel-finance-segments-resource-uses.md). **CONFIRMED** describes explicit taxonomy/observed frontend boundaries, not authoritative Backend semantics. **PROTOTYPE UX RULE** is local behavior only; **PRODUCT DECISION REQUIRED** and **BACKEND DECISION REQUIRED** remain distinct unresolved policy/contract needs.

| ID | Classification | Rule / unresolved boundary |
| --- | --- | --- |
| CAT-01 | CONFIRMED | Two independent catalogs; Capital de Giro may exist in both with separate IDs/lifecycle and is not a modality. There is no automatic Segment ↔ Resource Use relationship; any future relation requires explicit definition (Q-CAT-09). |
| CAT-02 | CONFIRMED frontend V1 behavior | Identical names across catalogs are allowed without creating a mapping. Authoritative naming policy remains unresolved under Q-CAT-04. |
| CAT-03 | PROTOTYPE UX RULE | Block duplicates only within the same catalog using case-, accent- and extra-space-normalized comparison; not a Backend uniqueness rule (Q-CAT-04). |
| CAT-04 | PROTOTYPE UX RULE | Name 2–60 characters and description up to 160; not final Product/Backend validation (Q-CAT-05). |
| CAT-05 | PRODUCT DECISION REQUIRED / BACKEND DECISION REQUIRED | Active/inactive meaning, selection eligibility, reactivation and new/existing Opportunity effects are unresolved; local inactive retains a record (Q-CAT-06). |
| CAT-06 | PRODUCT DECISION REQUIRED / BACKEND DECISION REQUIRED | Hard/soft delete, deletion of used records, inactivation instead of deletion, reference protection and historical retention are unresolved; prototype delete only removes the local record (Q-CAT-07). |
| CAT-07 | PRODUCT DECISION REQUIRED / BACKEND DECISION REQUIRED | Global, per-Whitelabel, global plus tenant overrides or global plus per-tenant enablement remain alternatives; tenant presentation does not define ownership (Q-CAT-01). |
| CAT-08 | PRODUCT DECISION REQUIRED / BACKEND DECISION REQUIRED | Official Segment and Resource Use datasets/source of truth, lifecycle, hierarchy/codes/order remain unresolved independently (Q-CAT-02–03, Q-CAT-10). |
| CAT-09 | PRODUCT DECISION REQUIRED / BACKEND DECISION REQUIRED | Expected future Opportunity consumption is not implemented; one/multiple Segments and one/multiple Resource Uses must be decided separately. No inferred associations/migration/assignment (Q-CAT-08–09). |
| CAT-10 | PRODUCT DECISION REQUIRED / BACKEND DECISION REQUIRED | Final per-domain permissions, durable audit, concurrency/versioning, sanitized errors and authoritative readback remain to define (Q-CAT-11–13, Q-RB-01–04, Q-AU-01–03). |

## Modality prototype assumptions

These are **PROTOTYPE ASSUMPTION**, not confirmed operational rules. Editable examples are **PROTOTYPE CONFIGURATION / PRODUCT DECISION REQUIRED / BACKEND CONTRACT REQUIRED**; the categories are a **GENERIC STRUCTURAL PROTOTYPE**. See [Modalities / Rules V1](../08-whitelabel-finance-modalities-rules.md#generic-rule-prototype).

| ID | Local prototype behavior | Unresolved authoritative decision |
| --- | --- | --- |
| M-01 | Tenant enable/disable changes only shared local state; explicit disabled differs from never-configured. | PRODUCT DECISION REQUIRED / BACKEND DECISION REQUIRED: real state/semantics and existing-business restrictions (Q-MO-02–04) |
| M-02 | Disponibilidade follows local presentation; Elegibilidade, Documentos e requisitos and Limites are pending concepts. | PRODUCT DECISION REQUIRED / BACKEND DECISION REQUIRED: supported catalog, validation/enforcement and required documents (Q-MO-05–06, Q-MO-10) |
| M-03 | Exige aprovação manual and Permite configuração no nível da Oportunidade accept local default/yes/no choices. | PRODUCT DECISION REQUIRED / BACKEND DECISION REQUIRED: whether supported configurable rules and their effects; no confirmed approval bypass (Q-MO-06) |
| M-04 | Platform default → tenant override is conceptual; Padrão não definido is not a real default/reset. | PRODUCT DECISION REQUIRED / BACKEND DECISION REQUIRED: defaults, inheritance/fallback, scope, reset/version/propagation (Q-MO-05, Q-MO-07, Q-ST-01) |
| M-05 | Any active local mapped gateway, including Sandbox, satisfies the demo dependency. | PRODUCT DECISION REQUIRED / BACKEND DECISION REQUIRED: mapping/cardinality/provider selection and Sandbox versus Production readiness (Q-GM-01–02, Q-MO-08) |
| M-06 | Bank-account count is informational; Relação não definida; no local enablement gate. | PRODUCT DECISION REQUIRED / BACKEND DECISION REQUIRED: ownership, requirement, receiving/payout and readiness (Q-BA-01–04, Q-MO-09) |
| M-07 | Enable/disable preserves local gateway/bank/rule values; no financial cascade occurs. | PRODUCT DECISION REQUIRED / BACKEND DECISION REQUIRED: new/existing Opportunity impact, active business and re-enable retention/revalidation (Q-MO-03–04) |
| M-08 | Save/discard, labels and time produce session feedback only. | BACKEND DECISION REQUIRED with PRODUCT DECISION REQUIRED: authoritative readback/errors/RBAC and durable success/failure/denial audit (Q-MO-11–12, Q-RB-01–04, Q-AU-01–03) |

No rate, percentage, minimum amount, maturity, amortization, return, valuation or payment schedule is invented. **CONFIRMED** describes the taxonomy and observed prototype boundary above; **PROTOTYPE ASSUMPTION** describes demo behavior. **PRODUCT DECISION REQUIRED** identifies policy, and **BACKEND DECISION REQUIRED** identifies feasible authoritative contracts/validation. Existing narrower Core policy/provider evidence is not a delivery claim for this rule model.

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
| P-08 | Expose typed Settings values with effective/default/override provenance and explicit reset semantics; agree conflicts, field errors and readback before integrating local forms. | Q-ST-01–03 |
| P-09 | Reuse Core-owned Terms and asset domains; synchronize current Terms after publication without altering immutable acceptance evidence. Keep SMTP management a separate scope. | Q-TE-01–04, Q-ST-02, Q-SM-01 |
| P-10 | Expose a supported event catalog and authorized tenant preference reads/writes; reject nonexistent/unsupported events. Preserve independent Equity/Debt preferences at authoritative trigger points, with readback and sanitized errors/audit. Exact support and policies are not inferred from frontend IDs. | Q-EM-01–04, Q-RB-01–04, Q-AU-01–03 |
| P-11 | Agree SMTP omitted/blank/replace/reset secret-update behavior and bounded test semantics; configured state must not imply connectivity, dispatch or delivery success. | Q-SM-01–02 |
| P-12 | Reuse Core template capability with agreed event mapping, inherited defaults/tenant overrides, later editor/versioning and sender/branding resolution, rather than adopting the local summary as a Backend model. | Q-ET-01–03 |
| P-13 | Expose gateway configuration only after provider catalog, role/environment, principal/default and activation semantics are agreed. The single-principal and Production-completeness behaviors remain prototype assumptions. | Q-GW-01–04 |
| P-14 | Keep gateway secret updates write-only with sanitized readback/errors/audit and safe rotation/revocation semantics. | Q-GW-01, Q-RB-04, Q-AU-01–03 |
| P-15 | Define canonical bank ownership, verification, payout/receiving and removal constraints before adopting the Whitelabel-scoped prototype model. Frontend masks/validation remain illustrative. | Q-BA-01–04 |
| P-16 | Define modality source of truth and Sandbox-versus-Production readiness before using gateway state as an operational dependency. | Q-GM-01–02 |
| P-17 | Define the official catalog/tenant enablement and active-business/Opportunity impact before exposing enable/disable; reconcile authoritative state after commands. | Q-MO-01–04 |
| P-18 | Define rule ownership, typed catalog/validation, defaults/override and dependency semantics before adopting local concepts; do not add a competing tenant-wide editor or infer operational readiness. | Q-MO-05–10 |

## Product decisions required

The authoritative question text exists only in [open-questions.md](../open-questions.md). This index identifies unresolved policy areas without introducing another question list.

| Area | Canonical decision IDs |
| --- | --- |
| Tenant identity/lifecycle and metric semantics | [Q-WL-01–04](../open-questions.md#whitelabel) |
| Operator/tenant Admin provisioning and account detail | [Q-AC-01–04](../open-questions.md#accounts) |
| Pause/reactivate semantics | [Q-PA-01–07](../open-questions.md#pause-reactivate) |
| Tenant reassignment | [Q-TR-01–04](../open-questions.md#tenant-reassignment) |
| Terms reacceptance/coverage/governance and authoritative synchronization | [Q-TE-01–04](../open-questions.md#terms) |
| Questionnaire scope/versioning | [Q-QU-01–03](../open-questions.md#questionnaire) |
| Classification governance | [Q-CL-01–03](../open-questions.md#classification) |
| Feature/module availability | [Q-FE-01–03](../open-questions.md#features) |
| Settings inheritance/assets/validation and SMTP ownership | [Q-ST-01–03](../open-questions.md#settings), [Q-SM-01](../open-questions.md#smtp) |
| SMTP test outcomes and safe write-only update semantics | [Q-SM-01–02](../open-questions.md#smtp) |
| Configurable event catalog, Equity/Debt triggers, suppression and absent preferences | [Q-EM-01–04](../open-questions.md#email-events) |
| Template inheritance/mapping, versioning and sender/branding resolution | [Q-ET-01–03](../open-questions.md#email-templates) |
| Gateway providers, credentials, activation/default semantics and tests | [Q-GW-01–04](../open-questions.md#finance--gateways) |
| Bank-account ownership, verification and financial relationships | [Q-BA-01–04](../open-questions.md#bank-accounts) |
| Gateway/modality and Sandbox/Production semantics | [Q-GM-01–02](../open-questions.md#gateway--modality-relationship) |
| Modality catalog, tenant transitions/impact, rule ownership/catalog/defaults, dependencies, RBAC and audit | [Q-MO-01–12](../open-questions.md#modalities--rules) |
| Independent Segment/Resource Use ownership, official datasets, validation, lifecycle/delete, Opportunity cardinality, structural metadata, permissions/audit/versioning | [Q-CAT-01–13](../open-questions.md#segments--resource-uses) |
| RBAC and audit guarantees | [Q-RB-01–04](../open-questions.md#rbac), [Q-AU-01–03](../open-questions.md#audit) |

Do not convert seed comments, UI labels, nullable columns, domain-specific denial or architecture route examples into settled Product rules.

Accepted Terms evidence and classification/questionnaire state remain read-only displays. Settings now prototypes local current-Terms publication, not an acceptance edit or a Backend publisher. Existing Core legal/profile capabilities and all reacceptance, inheritance, flag-effect, governance and authorization decisions remain separate from this local behavior. Prototype validation limits/default values are not settled Product rules.

Emails confirms UI separation and independent investment-event requirements, not Backend delivery. Proposed event support/suppression and template rules require canonical decisions before integration; illustrative switches cannot authorize suppressing mandatory/security messages. SMTP save/test is local only. See [Emails V1](../06-whitelabel-emails.md).
