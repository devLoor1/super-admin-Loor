# Whitelabel Emails V1

## Approved frontend and evidence boundary

Approved frontend: `dev@5f438035dbac1ec49df68fc3d9799c3fb5078c4a`. Route: `#/whitelabels/:whitelabelId/emails`, optionally `?section=smtp|envios|templates` to scroll to/focus a section. Source: `src/features/whitelabel-emails/` ([pinned module](https://github.com/devLoor1/super-admin-Loor/tree/5f438035dbac1ec49df68fc3d9799c3fb5078c4a/src/features/whitelabel-emails)). The [frontend review record](https://github.com/devLoor1/super-admin-Loor/blob/5f438035dbac1ec49df68fc3d9799c3fb5078c4a/docs/whitelabel-emails-v1.md) retains completed prototype/browser QA; it is not real delivery, storage, RBAC or audit evidence. This documentation update does not repeat those tests or inspect live Backend behavior.

Emails V1 is **FRONTEND PROTOTYPED / INTEGRATION PENDING / E2E VALIDATION PENDING**. The three areas are distinct:

| Area | Purpose | Current boundary |
| --- | --- | --- |
| A. SMTP | How the Whitelabel sends: server, credentials and sender | Local editor/read view and simulated test; no connection or real email |
| B. Automatic email events | When the platform sends particular emails | Independent tenant-local preferences; no Backend suppression/dispatch integration |
| C. Templates summary | What those emails contain | Illustrative platform-default summary; no full editor, mapping read or versioning |

Core facts remain limited to the historical read-only audit at `eb12e282c52230114553bf5e8722542adc9efe78`, indexed in [audit findings](audit-findings.md#core-source-index). Existing SMTP/template operations and limited writer calls do not prove a supported event-preference system or a Super Admin contract. No new endpoint routes, DTOs or internal persistence architecture are prescribed here.

## Whitelabel context, local state and navigation

The selected illustrative Whitelabel is explicit in the context selector, breadcrumb and scoped sidebar links. Unknown prototype IDs show an empty/not-found state. IDs such as `wl_proto_*`, UI categories and seed values are not authoritative tenant identifiers or an API schema.

The [Emails store](https://github.com/devLoor1/super-admin-Loor/blob/5f438035dbac1ec49df68fc3d9799c3fb5078c4a/src/features/whitelabel-emails/emailStore.ts) holds independent tenant values in memory. SMTP and events have separate drafts and explicit save/discard. Saved values survive navigation inside the current page session and reset on full reload; there is no durable storage, business API integration or real email. Discard restores saved values; confirmed navigation discard clears section drafts without undoing prior local saves.

The [shared guard](https://github.com/devLoor1/super-admin-Loor/blob/5f438035dbac1ec49df68fc3d9799c3fb5078c4a/src/app/useUnsavedChangesGuard.ts) protects tenant switching, links and browser Back/Forward with stay/discard confirmation; reload/document exit uses native beforeunload behavior. These UX protections do not provide server atomicity, authorization or concurrency control.

Activity records actual local configuration saves, simulated tests and event changes with session timestamps. It resets on reload and is explicitly **not an audit trail**. Decorative Orbit borders identify visual state only, not successful dispatch or Backend support.

## A. SMTP

### Prototype fields and behavior

Source: [SmtpSection](https://github.com/devLoor1/super-admin-Loor/blob/5f438035dbac1ec49df68fc3d9799c3fb5078c4a/src/features/whitelabel-emails/sections/SmtpSection.tsx) and [frontend model](https://github.com/devLoor1/super-admin-Loor/blob/5f438035dbac1ec49df68fc3d9799c3fb5078c4a/src/features/whitelabel-emails/emailModel.ts).

| Field/state | Approved prototype |
| --- | --- |
| Host | Read/edit server hostname; required/format checks |
| Port | Read/edit numeric port; frontend range 1–65535 |
| Security/TLS | STARTTLS or implicit SSL/TLS selection; displayed port hints are not automatic provider discovery |
| Username | Read/edit authentication username |
| Password/secret | Existing secret represented by configured metadata/fixed mask only; blank write-only new-password draft, no reveal control |
| Sender email / display name | Read/edit sender with frontend email/required/length checks |
| Configured/unconfigured | Illustrative local state; real connection is awaiting integration |
| Edit/save/discard | Section-local draft; save updates the safe shared projection, discard restores it |
| Test email | Destination validation, confirmation, simulated processing/result using saved local configuration; unavailable while unconfigured or editing |

A blank new-password draft retains the local configured flag when one already exists; configuring a previously unconfigured seed requires a new draft value. The typed value is dropped after save/discard; the shared store retains only `secretConfigured`, never the password. Activity lists changed field names, not secret values. No real credentials are included in seed data or this handoff. This is write-only UI representation, not secure Backend storage evidence or an agreed wire schema. Empty/omitted update semantics still need a safe contract.

The test explicitly reports that **no email was sent**. It does not connect, authenticate, enqueue, dispatch or prove delivery. Saving a configuration likewise does not test connectivity. Frontend validators/hints are not settled server limits or Product/provider policy.

### SMTP classification

| Dimension | Classification |
| --- | --- |
| Frontend | FRONTEND PROTOTYPED |
| Core | PARTIAL / EXISTING SMTP CAPABILITY — configuration/test operations and safe metadata found at the audit baseline |
| Control Plane | CONTROL PLANE EXPOSURE NEEDED |
| Backend | CONTRACT / SECURITY WORK NEEDED |
| Integration | INTEGRATION PENDING |
| E2E | E2E VALIDATION PENDING |

### Required secure integration

Conceptual capabilities, not delivered endpoints:

- Authorized tenant/environment-scoped safe reads and allowed updates for server, TLS, sender and configured state; authoritative readback and sanitized validation/conflict results.
- Existing passwords/secrets must never be readable or returned in full. Return only agreed configured/masked metadata, never reversible secret data. New credentials are write-only input for an authorized secure update, not browser-held service credentials.
- Agree preserve/replace/reset semantics and secure server-side storage/handling; no secrets in responses, logs, notices, audit, tracing or provider exception output.
- Define a bounded authorized connectivity/test-send operation with destination validation, safe requested/result states and sanitized errors. Distinguish connectivity/authentication, dispatch/acceptance and actual delivery; configured alone proves none of them.
- Enforce operator permission, tenant/resource ownership, service authorization and durable correlated audit. Do not proxy arbitrary tenant headers or expose Core service credentials to the browser.

Ownership/security remains [Q-SM-01](open-questions.md#smtp), specific test semantics [Q-SM-02](open-questions.md#smtp), shared RBAC [Q-RB-01–04](open-questions.md#rbac) and audit [Q-AU-01–03](open-questions.md#audit). Existing audited Core operations must be reused/assessed against these requirements; this document does not claim their underlying implementation is entirely absent.

## B. Automatic email events

Source: [EventsSection](https://github.com/devLoor1/super-admin-Loor/blob/5f438035dbac1ec49df68fc3d9799c3fb5078c4a/src/features/whitelabel-emails/sections/EventsSection.tsx). Switches change a draft for the selected Whitelabel; explicit save applies only to local memory. Equity and Debt values are independent, including when one is enabled and the other disabled. Unconfigured SMTP and disabled password-recovery warnings are illustrative risk feedback, not verified real suppression behavior.

| Event | Product classification | Core evidence | Backend/integration status |
| --- | --- | --- | --- |
| Investment confirmed — Equity (`Investimento em Equity`) | PRODUCT REQUIREMENT — independently configurable | CORE SUPPORT UNKNOWN / TO VERIFY for tenant preference and authoritative trigger | BACKEND IMPLEMENTATION NEEDED for the required configurable path, subject to reuse verification; INTEGRATION PENDING |
| Investment confirmed — Debt (`Investimento em Debt`) | PRODUCT REQUIREMENT — independently configurable, not tied to Equity | CORE SUPPORT UNKNOWN / TO VERIFY for tenant preference and authoritative trigger | BACKEND IMPLEMENTATION NEEDED for the required configurable path, subject to reuse verification; INTEGRATION PENDING |
| Registration completed | Illustrative proposal; PRODUCT DECISION REQUIRED before configurable inclusion | CORE SUPPORT UNKNOWN / TO VERIFY for configurable flag; an existing registration flow does not establish one | BACKEND IMPLEMENTATION NEEDED if approved and absent; INTEGRATION PENDING |
| Password recovery | Illustrative proposal; PRODUCT DECISION REQUIRED before configurable inclusion/suppression | CORE SUPPORT UNKNOWN / TO VERIFY for configurable flag; an existing recovery flow does not establish one | BACKEND IMPLEMENTATION NEEDED if approved and absent; INTEGRATION PENDING |
| Account approved | Illustrative proposal; PRODUCT DECISION REQUIRED before configurable inclusion | CORE SUPPORT UNKNOWN / TO VERIFY for configurable flag and actor coverage | BACKEND IMPLEMENTATION NEEDED if approved and absent; INTEGRATION PENDING |
| Terms updated | Illustrative proposal; PRODUCT DECISION REQUIRED before configurable inclusion | CORE SUPPORT UNKNOWN / TO VERIFY for configurable flag; legal revision support does not establish email preference/dispatch | BACKEND IMPLEMENTATION NEEDED if approved and absent; INTEGRATION PENDING |

No event row establishes a real configurable Backend flag or email dispatch. The two investment preferences are confirmed Product requirements, not evidence of delivery; the remaining four are not settled requirements. Exact catalog/trigger/suppression/default decisions are [Q-EM-01–04](open-questions.md#email-events).

### Expected event contract capabilities

- List the supported event catalog with stable identities, descriptive metadata and support/configurability information; local camelCase IDs/categories are not prescribed Backend names.
- Read enabled/disabled preferences scoped to an authorized Whitelabel, with explicit absent/effective/default provenance when applicable.
- Update permitted preferences for that Whitelabel only; validate that the event exists and supports configuration. Reject unsupported events with sanitized errors rather than storing arbitrary frontend flags.
- Preserve independent Equity and Debt confirmation preferences and apply them at authoritative domain trigger points. Do not infer investment confirmation from a frontend screen or introduce financial mutations through configuration.
- Define safe suppression and missing-preference behavior before integration; prototype booleans do not settle fallback, mandatory notices or historical/backlogged-send handling.
- Return authoritative state after updates; enforce RBAC/ownership, conflict/readback behavior and durable sanitized audit of enabled/disabled changes.

These capabilities do not prescribe tables, workers, routes or where existing Core sends must be rewritten. Current support must be verified before choosing implementation.

## C. Templates summary

Source: [TemplatesSummary](https://github.com/devLoor1/super-admin-Loor/blob/5f438035dbac1ec49df68fc3d9799c3fb5078c4a/src/features/whitelabel-emails/sections/TemplatesSummary.tsx). The panel shows illustrative platform-default source/categories, the sender from local saved SMTP and a Settings identity link. `Gerenciar templates` is a next-capability notice. **No full editor, template API listing, real event mapping, override, publish action or version history exists in this block.** The summary does not prove every displayed category has a real template or sender resolution.

Audited Core tenant-template operations/limited audit are existing capabilities, not a delivered Super Admin editor or proof of the proposed inheritance/mapping model. Future dependencies remain explicit:

- Authorized template listing and stable event-to-template mapping.
- Tenant-specific override versus inherited platform default, effective source and reset/propagation semantics: [Q-ET-01](open-questions.md#email-templates).
- Later editor, revision/versioning and publishing workflow: [Q-ET-02](open-questions.md#email-templates).
- Authoritative sender/branding resolution across SMTP, identity, defaults and template overrides: [Q-ET-03](open-questions.md#email-templates).

Templates summary is **FRONTEND PROTOTYPED**; future management needs **CONTROL PLANE EXPOSURE NEEDED / BACKEND IMPLEMENTATION NEEDED WHERE ABSENT / PRODUCT DECISION REQUIRED / INTEGRATION PENDING / E2E VALIDATION PENDING**. Do not duplicate Core template truth in Control Plane.

## Settings and Emails ownership

[Settings](05-whitelabel-settings.md) contains SMTP status/shortcut and visual identity. Its [SMTP summary](https://github.com/devLoor1/super-admin-Loor/blob/5f438035dbac1ec49df68fc3d9799c3fb5078c4a/src/features/whitelabel-settings/sections/SmtpSummary.tsx) reads the same Emails store and links to `emails?section=smtp`. **Emails owns detailed SMTP and event editing; Settings does not maintain a second SMTP configuration.** Templates shows that local sender and links back to Settings identity without editing it. Authoritative configuration/content/delivery remains Core-owned through Control Plane, not frontend-owned because of this UI separation.

## Permissions, audit and completion boundary

The [permissions matrix](matrices/permissions.md) specifies `EMAIL_SETTINGS_VIEW`, `EMAIL_SETTINGS_UPDATE`, `SMTP_VIEW`, `SMTP_UPDATE`, `SMTP_TEST`, `EMAIL_EVENT_VIEW`, `EMAIL_EVENT_UPDATE`, `EMAIL_TEMPLATE_VIEW` and `EMAIL_TEMPLATE_UPDATE`. **SPECIFICATION LABELS ONLY — RBAC NOT IMPLEMENTED.** Template update is future scope; umbrella permission labels do not imply child grants or bypass tenant checks.

The [audit matrix](matrices/audit-events.md) distinguishes existing Core writer calls from future `SMTP_CONFIGURATION_UPDATED`, `SMTP_TEST_REQUESTED`, `SMTP_TEST_SUCCEEDED`, `SMTP_TEST_FAILED`, `EMAIL_EVENT_ENABLED`, `EMAIL_EVENT_DISABLED`, `EMAIL_TEMPLATE_UPDATED` and `EMAIL_TEMPLATE_PUBLISHED`. Required metadata includes operator, Whitelabel, affected configuration/event/template, sanitized before/after state, result, timestamp and correlation ID. Never record SMTP passwords or secret payloads. Shared event coverage/durability remains [Q-AU-01–03](open-questions.md#audit); local activity emits none of those events.

Before integration/E2E closure: resolve canonical event/test/template decisions; verify/reuse Core support; deliver authorized safe contracts, secure write-only secrets, authoritative scoped readback, sanitized errors and durable audit. Then validate actual SMTP/test outcomes, supported preferences and independent Equity/Debt dispatch behavior without conflating configured state with health. Template editing/versioning is a later capability, not unfinished Emails V1 frontend work. The [dependency matrix](matrices/backend-dependencies.md) keeps all current integration/E2E gaps explicit; no dependency is closed by visual approval or a local save.
