# SMTP, e-mail events and Terms contract qualification

Source qualification: 2026-10-25. This document records source contracts, not a successful live SMTP mutation or delivery test. No SMTP configuration, password, recipient test, legal publication or automatic event setting was changed for this qualification.

## Audited versions and scope

- Core `backend` live `origin/dev`: `351c7926163d35d6bc984fd3958ccc6cee2e04c3`.
- Nest Control Plane `backend-super-admin-loor` live dev: `86aa3663915f38903f6ceb2a17b8d48a554ede4f`.
- Existing Admin parity reference: `admin-canvas/src/components/admin/email/`. The separate preserved Terms Admin worktree is `finapop-terms-admin`, commit `1464915f23f15a78b6143e787852fd68be940475`, `src/components/admin/terms/`.
- Backend working branches were not switched or edited. Frontend calls use the normal Control Plane operator session. Admin JWT routes are references only, not an alternate transport for Super Admin.

## Operational frontend decision

Integrate **tenant-scoped SMTP GET only**. `SUPER_ADMIN` and `READ_ONLY` are the qualified read roles. SMTP editing and test sending remain unavailable in the operational application. Their concepts may be explored only in the separate offline mock application.

The read projection retains explicit public metadata only: configuration/tenant IDs, host, port, transport/TLS booleans, sender identity, `hasPassword`, `configured`, `active` and dates. Although the current Core response contains `username`, the frontend projection never reads or retains that field in component/resource state. It never renders a username, password, private configuration bag or raw response. Unexpected secret fields cause a controlled malformed-contract error. An absent record is distinct from unauthorized, unavailable or malformed data.

No automatic send or transport check runs on page load. A stored credential flag proves presence only. It does not prove valid credentials, transport acceptance or recipient delivery. The UI distinguishes:

- no tenant-owned configuration;
- saved configuration;
- configuration complete according to the API;
- tenant-owned SMTP active;
- credential present according to the API.

Core's `configured` calculation does **not** include `active`. When the tenant configuration is absent or inactive, compatible existing consumers can fall back to the global mailer. The SMTP GET does not expose or verify that global mailer's settings.

## Exact SMTP contract

| Operation | Control Plane endpoint | Role | Source result |
| --- | --- | --- | --- |
| Read | `GET /api/whitelabels/:id/emails/smtp` | `SUPER_ADMIN`, `READ_ONLY` | HTTP 200, `{data:null}` or `{data:config}`; nonexistent tenant 404 |
| Replace/upsert | `PUT /api/whitelabels/:id/emails/smtp` | `SUPER_ADMIN` | HTTP 200 saved projection; validation 422; nonexistent tenant 404 |
| Real test send | `POST /api/whitelabels/:id/emails/smtp/test` | `SUPER_ADMIN` | Nest default success HTTP 201; Core success is 200; no config 422; SMTP failure 424 |

The legacy `/api/whitelabels/:id/smtp` alias also exists. The frontend uses the preferred `emails/smtp` path only. Nest passes through to Core `/internal/super-admin/v1/whitelabels/:id/smtp` and `/smtp/test`.

Saved response field types from the Core serializer:

```ts
{ data: {
  id: number, whitelabelId: number,
  host: string, port: number, secure: boolean | 0 | 1,
  username: string, // discarded by the frontend projection
  hasPassword: boolean,
  fromEmail: string, fromName: string | null,
  tlsRejectUnauthorized: boolean | 0 | 1, active: boolean | 0 | 1,
  configured: boolean,
  createdAt: string | null, updatedAt: string | null
} }
```

The frontend validates canonical positive safe integer identity, exact tenant equality, port `1..65535`, bounded safe text/host/sender, complete ISO dates and `configured => hasPassword`. Authenticated GET-only runtime qualification returned HTTP 200 `{data:null}` for Whitelabel 8 and an existing configured record for Whitelabel 6. The latter exposed `secure`, `tlsRejectUnauthorized` and `active` as database numeric `0/1`, while `hasPassword` and `configured` were booleans. Exactly those three stored transport/active fields accept boolean or numeric `0/1`; `hasPassword` and `configured` remain strict booleans. Strings and all other numeric values are contract errors. No username or password value was retained in QA evidence.

PUT is **not a partial patch**. Core requires `host`, `port`, `username` and `fromEmail` for every update. Omitting other metadata resets `secure=false`, `fromName=null`, `tlsRejectUnauthorized=true`, `active=true`. A correct replacement must preserve each untouched field explicitly. New configuration requires a password. Omitting password on an existing configuration preserves the stored password; sending `password:""` is rejected with `E_EMAIL_CONFIG_PASSWORD_INVALID`. Clearing/removing the stored password or deleting/unconfiguring the record has no supported command in this contract. There is no version/ETag/idempotency field.

The test accepts `{to:string}` (legacy `{email:string}` also recognized). Core checks nonempty destination but the internal path does not apply the Admin e-mail validator. A test targets the saved configuration even when `active=false`; it is an actual nodemailer send, not a preview. Transport acceptance is not mailbox delivery.

Core 4xx, including 422/424, are preserved through Nest; Core 401/403 and upstream/server failures map to 502. The normal frontend read client has a bounded wait, central 401 handling, cancellation and session-generation isolation. The SMTP adapter additionally discards server error text/code before resource state and retains only status/kind and canonical UUID correlation metadata; feedback never reflects arbitrary error metadata. It never retries automatically.

### Concrete write-release blockers

1. **Credential audit retention:** Nest copies the entire PUT body to `afterData`, masking `password` only. The shared audit redactor does not match literal `username`. A normal full SMTP replacement therefore risks persisting the SMTP username in Audit. Frontend omission is not a solution because Core requires that field on every replacement.
2. **Safe preservation/restoration:** Withholding the existing username from frontend state while the API requires it for unchanged metadata makes safe edit-only updates impossible under the current no-credential-retention rule. There is no sparse credential-preserving metadata update. A new config cannot be cleanly removed, and the old password cannot be recovered from GET; no live creation/replacement is used to discover the contract.
3. **Uncertain side effects:** Nest awaits Core persistence/send before awaiting Audit insertion. A later Audit failure can report an error after configuration persisted or a message was sent. Never retry uncertain PUT/POST automatically. A safe config GET can reconcile non-secret saved metadata, but cannot prove an omitted-password replacement or an e-mail's delivery outcome.
4. **Validation/operational controls:** Nest accepts a generic record and internal Core bypasses the stricter Admin DTO validator. The only demonstrated throttle is the global default 120 requests/60 seconds; no SMTP-specific cooldown, approved-recipient boundary or idempotency was found. Core's SMTP error logger receives the nodemailer error object; its credential safety requires a Backend review before write/test exposure.

These are specific blockers to qualified operational SMTP editing/testing, not a claim that the endpoints do not exist. No write client, disabled faux editor, feature-flag activation or live test-send is added by this frontend change.

## Terms: preserve current read, qualify lifecycle separately

Existing operational Settings Read V1 already reads tenant-scoped `terms.current` and history through `GET /api/whitelabels/:id/settings`. Core returns the current legal revision and the latest 20 revisions. Preserve that read model and immutable history display.

Core Admin has `GET/PUT /admin/terms-of-use`; public consumers have `GET /terms-of-use`. These use the existing Admin/public tenant-resolution contract, not the Control Plane operator token. A Terms PUT immediately publishes an immutable next revision, makes earlier revisions noncurrent and returns `{data:{configured,revision_id,revision,title,content_markdown,published_at,updated_at}}`. It is not a draft save. Title is trimmed, required, max 256; content is trimmed and required. The service does not expose editing an existing revision, deletion, unpublication or a draft workflow.

Investor registration validates the current revision ID and records the accepted revision/time. A new publication does not itself rewrite historical acceptances. A mandatory existing-investor reacceptance flow was not established by this source audit.

The audited Nest modules and Core internal Super Admin routes do not expose a Terms publication/draft command. Generic Settings PUT must not be misrepresented as a legal-publication endpoint. Therefore Terms draft, preview and publish remain mock-only until a tenant-scoped Control Plane contract is delivered; this task publishes no legal content.

## Templates and automatic events

Core Admin exposes template types, list, create, update and preview through `/admin/email-templates`. The Admin frontend currently edits confirmation, investment contract, welcome approval and Terms/privacy templates. Core's catalog is broader and specifies per-type variables and required placeholders.

Template `active` is **not an event-dispatch switch**. `resolveForSend` selects an active custom tenant template, then an active system default; compatible consumers may still fall back to an Edge view when none is selected. Inactivating a custom template does not establish that an automatic e-mail event stops sending. System defaults are not editable through the custom-template update path.

No qualified Nest template editor, e-mail event preference registry or event disable policy exists at the audited reference. Preserve offline mock editing; do not create arbitrary production setting keys or infer event policy from template activity.

## Actionable delivery backlog

| Owner | Required delivery | Acceptance requirement |
| --- | --- | --- |
| Nest + Core | Safe SMTP metadata update with server-preserved username/password and strict DTOs | Changing sender/flags does not require reading/resending credentials; typed safe readback; tenant/RBAC tests |
| Nest | Redact SMTP username and nested credential aliases before Audit; audit only allowlisted metadata | No credential value reaches logs, errors, Audit or readback; tests with credential sentinels |
| Nest + Core | Define outcome/idempotency/concurrency and restoration semantics | Audit failure cannot invite duplicate sends; GET reconciliation is documented; safe original config restoration is demonstrable |
| Backend + Product/Ops | Qualify SMTP test-send recipient/cooldown/audit/delivery semantics and disposable configured QA tenant | Explicit controlled recipient and single-send acceptance, no discovery send; no unknown password replacement |
| Nest + Core | Tenant-scoped Terms revision publication API | Numeric tenant, permissions, stale/current-revision guard, immutable history and audit; explicitly distinguish draft save from publication |
| Product + Backend | Define drafts, preview, publication warnings and reacceptance rules | Existing published Terms/history and historical acceptances remain coherent; legal copy never published solely for QA |
| Nest + Core | Template catalog/read/preview/editor API preserving scoped defaults/overrides | Required placeholders, safe HTML preview, default immutability, version/history and tenant isolation |
| Product + Backend | Versioned automatic-event preferences and mandatory-event policy | Explain each trigger, default/fallback, allowed opt-outs and audit; template activity never silently treated as dispatch disablement |
| Frontend | After the corresponding contract/QA delivery, integrate only qualified operations | Preserve per-tenant drafts, dirty guards, explicit test confirmation, mutation locks and uncertain-outcome reconciliation |

## Source evidence

Paths below are within the immutable Core/Nest references recorded above; line numbers are source qualification anchors, not live deployment proof.

- Nest `src/modules/smtp/smtp.controller.ts:16`: preferred/legacy paths; GET roles at 23, PUT at 29, test at 45; generic request bodies.
- Nest `src/modules/smtp/smtp.service.ts:12`: GET proxy; update at 21, full-body Audit copy at 32, post-side-effect Audit at 34; test proxy at 46 and Audit at 59.
- Nest `src/modules/audit/audit.service.ts:7`: sensitive-key regex; persisted Audit at 29; recursive redaction at 97.
- Nest `src/integrations/loor-core/loor-core.client.ts:30`: timeout; safe forwarding/error projection at 62; upstream mapping at 103.
- Nest `src/app.module.ts:78`: global throttling; guard at 111. `src/config/configuration.ts:10`: default TTL/limit.
- Core `start/routes/internal/superAdmin.ts:35`: Settings and SMTP routes; no legal publication route in this audited registry.
- Core `app/Controllers/Http/Internal/SuperAdmin/SmtpController.ts:14`: password-empty error and internal input conversion; test at 46, errors at 53/56/62.
- Core `app/Services/Internal/SuperAdmin/SmtpQueryService.ts:6`: absent-config GET; full replacement at 16; password preservation at 42; metadata defaults at 49; real test at 62; serialized metadata/password-presence contract at 87.
- Core `app/Models/PlatformEmailConfig.ts`: password excluded from model serialization; dedicated service serialization exposes username, never password.
- Core `app/Helpers/PlatformMailHelper.ts:53`: resolve active tenant config; fallback/default at 85/109; real test at 165, nodemailer error logging at 192; transport at 211.
- Core `app/Services/Internal/SuperAdmin/SettingsQueryService.ts:11`: Terms current/history; `listTerms` at 70 caps history to 20.
- Core `start/routes/admin/index.ts:168`: legal GET/PUT; SMTP Admin at 351; template prefix at 368. `start/routes/public/index.ts:18`: public current Terms.
- Core `app/Services/Legal/TermsOfUseService.ts:12`: current; immutable publish at 35; transactional next revision at 51; stale acceptance at 83; serializer at 98.
- Core `app/Controllers/Http/Admin/TermsOfUseController.ts:27`: publishing action and audit. `app/Validators/Admin/TermsOfUseUpsertValidator.ts:6`: title/content validation.
- Core `app/Controllers/Http/Investor/AuthController.ts:36`: revision acceptance validation; accepted revision recorded at 60.
- Core `app/Services/EmailTemplate/EmailTemplateService.ts:29`: active custom/default resolver; custom creation at 110. `app/Services/EmailTemplate/EmailTemplateCatalog.ts:16`: supported catalog; required welcome/Terms placeholders at 146.

## Focused frontend evidence

`scripts/check-smtp-settings.mjs`: the initial 178-check synthetic run passed before live qualification; the updated candidate includes the strict observed `0/1` database boolean cases (**184 checks**, final execution recorded in the release checkpoint). The suite exercises the actual parser, role/session-aware GET client and rendered metadata/error projection using synthetic responses only. It covers tenant mismatch, empty/malformed distinction, primitive types, dates, field bounds, credential accessor non-read, unknown bags, unexpected secret rejection, sanitized retained errors/correlation IDs, 401/403, timeout/cancel, session replacement and absence of write transport/UI. No SMTP persistence, real authenticated delivery or Terms publication acceptance is claimed by these synthetic checks.
