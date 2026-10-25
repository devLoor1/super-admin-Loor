# Settings PUT qualification and release boundary

Source audit: 2026-10-25. This extends the accepted [Settings Read V1 evidence](whitelabel-settings-read-integration-v1.md). It does not enable a live settings editor or claim live write acceptance.

## Verified source references

The coordinator fetched the live development references without changing Backend/Core worktrees:

- Nest Control Plane `86aa3663915f38903f6ceb2a17b8d48a554ede4f`.
- Core `351c7926163d35d6bc984fd3958ccc6cee2e04c3`.

These are verified source references, not evidence that a particular hosted Backend binary has that commit.

| Contract evidence | Source at the above reference |
| --- | --- |
| GET roles `SUPER_ADMIN`, `READ_ONLY`; PUT role `SUPER_ADMIN` | Nest `src/modules/platform-config/platform-config.controller.ts:13–35` |
| Exact Core forwarding and audit after persistence | Nest `src/modules/platform-config/platform-config.service.ts:12–43` |
| Recursive audit redaction is based on property names | Nest `src/modules/audit/audit.service.ts:7–8,87–99` |
| Positive tenant lookup, `{page,key,value}` extraction, 404/422 and success HTTP 200 | Core `app/Controllers/Http/Internal/SuperAdmin/SettingsController.ts:5–32` |
| Tenant identity + grouped values + separate Terms readback | Core `app/Services/Internal/SuperAdmin/SettingsQueryService.ts:7–34` |
| Single-row upsert, exact tenant/page/key lookup | Core `app/Services/Internal/SuperAdmin/SettingsQueryService.ts:37–67` |
| Defaults, whole-row grouping, feature coercion, create/update | Core `app/Services/Platform/PlatformSettingService.ts:33–53,82–99,118–132,135–187` |
| Value JSON serialization | Core `app/Models/WtlbPlatformSetting.ts:20–33` |
| Tenant/page/key uniqueness, 64-character keys and non-null JSON column | Core `database/migrations/20260730160000_create_wtlb_platform_settings.ts:12–27` |
| Admin login supports exactly title/subtitle/three bullets; requires nonempty trimmed entries | Admin `src/components/admin/platform/login/loginPlatformTypes.ts:1–2,66–87` |
| Admin login reads persisted rows without converting missing values into authoritative defaults | Admin `src/components/admin/platform/login/normalizeAdminLoginSettings.ts:39–93` |

No source files, branches, configuration or data in Backend/Core were modified for this qualification.

## Actual transport semantics

The supported authenticated Control Plane endpoint is `PUT /api/whitelabels/:id/settings`. It forwards a single row:

```json
{ "page": "login", "key": "title", "value": "Tenant login title" }
```

Success is **HTTP 200**, with `{data:{id,page,key,value}}`. There is no whitelabel ID in the row receipt; tenant identity must also be established through the scoped authoritative Settings GET. The client checks receipt ID, page, key and value, then performs that GET.

This is a single-row upsert. Other page/key rows are preserved. An object stored in `value` is replaced in its entirety; this is **not** a sparse nested-object merge. The service does not offer a bulk section update, version/ETag, conditional update, transactional concurrency check, idempotency key, delete, reset or inheritance restoration operation.

An omitted `value` is not equivalent to `null`: update skips undefined while explicit null is persisted. Generic Core accepts values without the Admin editor's domain validation. Therefore the frontend never exposes a generic page/key/value editor and never sends omitted/null values from this implementation.

The preflight GET detects an already changed baseline and suppresses PUT. It cannot eliminate the race between GET and PUT. This is single-operator guarded persistence, **not atomic concurrency safety**.

## Qualified frontend allowlist

Prepared modules: `settingsWriteContract.ts`, `settingsWriteClient.ts`, `SettingsWriteEditor.tsx` and its dedicated CSS.

| Exact row | Accepted new value | Qualification |
| --- | --- | --- |
| `login.title` | Nonempty string, maximum 240 characters | Source-qualified; live acceptance pending |
| `login.subtitle` | Nonempty string, maximum 1,000 characters | Source-qualified; live acceptance pending |
| `login.bullets` | Exactly three nonempty strings, maximum 240 characters each | Source-qualified; live acceptance pending |
| `features.investor_profile_enabled` | Boolean | Source-qualified; not released |
| `features.anonymous_invest_default` | Boolean | Source-qualified; not released |
| `features.wallet_visible` | Boolean | Source-qualified; not released |
| `features.opportunity_show_entrepreneur` | Boolean | Source-qualified; not released |
| `features.opportunity_show_whatsapp` | Boolean | Source-qualified; not released |
| `features.opportunity_show_total_investors` | Boolean | Source-qualified; not released |
| `features.opportunity_show_investor_profile` | Boolean | Source-qualified; not released |
| `features.opportunity_show_warranty_amount` | Boolean | Source-qualified; not released |

The string maximums and rejection of HTML, controls and obvious token/private-key material are **defensive frontend limits**, not claims about Backend-enforced bounds. New copy uses NFC normalization and trimming. Existing read baselines are not normalized, shortened or converted: missing, null, empty and false remain distinct. Nothing silently truncates an existing value.

The editor requires explicit field review and confirmation. It is SUPER_ADMIN-only, keyed to the numeric tenant and session version, and guarded against unsaved navigation. The client rechecks authentication and authorization immediately before its one PUT. Duplicate attempts lock synchronously per tenant/field. Errors are rendered from fixed messages; no raw API error body or settings bag is retained in the mutation ledger. Server error codes pass an exact known-code allowlist, and correlation references must be UUID-shaped. Arbitrary metadata strings and server messages are discarded, including credential-like echoes. No draft is stored in local/session storage.

The default release scope is **empty**. `SettingsWriteEditor` renders no controls unless its caller provides an explicit `releasedFields` array, and `executeSettingsWrite` denies the operation without that same release scope before any request. This is a frontend readiness gate; it does not substitute for Backend RBAC. The official operational page leaves this scope unreleased while persistence acceptance remains pending.

Integration API:

```tsx
<SettingsWriteEditor
  id={tenantId}
  data={authoritativeSettingsRead}
  onReload={reloadAuthoritativeRead}
  // releasedFields intentionally omitted until the live acceptance gate passes.
/>
```

## Defaults, provenance and reversible acceptance

Settings GET merges built-in defaults for `features`, `terminology`, `quick_profile` and `dashboard`. It **does not inherit from tenant 0 or another tenant**, and provides no raw row ID, stored/default provenance or reset metadata. Equality with a built-in default does not prove that a stored override exists.

There are no built-in Core `login` defaults. A concrete login title/subtitle/bullets value in this grouped read therefore proves an explicit row at this source version. A controlled change followed by exact original-value restoration could be qualified against such an existing disposable tenant row **only if the original value round-trips through the new-value validator unchanged**. `isExactlyRestorableSetting` rejects missing/null/empty, oversized or normalization-changing originals for that purpose. A missing row is different: PUT creates it, and no supported Control Plane DELETE/reset can restore absence. Writing a default-looking value would leave a new tenant override and must not be reported as restoration.

The coordinator's bounded live read of isolated QA tenant 8 returned HTTP 200 with no login keys and no App configuration rows. No Settings PUT was performed. Shared tenant branding/content is outside that reversible QA plan. The precise remaining acceptance dependency is an authorized isolated existing copy row with authoritative original value, or a supported Backend provenance/reset contract enabling restoration of a newly created override. No direct database write or Admin-JWT workaround is proposed.

## Uncertain results and audit limitations

Nest awaits Core persistence, then writes `UPDATE_PLATFORM_CONFIG` audit data. An audit failure can return 500 after the row was already saved. Therefore network errors, 5xx, unexpected success statuses or malformed receipts lead to a scoped GET reconciliation. A matching GET is labelled **readback matches**, not a clean HTTP success. A mismatch or unavailable GET stays uncertain and locked. Explicit recovery sends GET only. No PUT is automatically retried.

Audit records the request body as afterData, without a before snapshot or settings version. Redaction walks property names. For arbitrary `{page,key,value}`, the dynamic meaning of `page` and `key` is not interpreted when redacting `value`. This is an additional reason to reject generic credential/SMTP/PAG configuration writes and keep only non-secret allowlisted copy/booleans in this client. The frontend cannot guarantee redaction for an arbitrary secret pasted as ordinary prose; credentials must never be entered here.

## Consumer behavior and held capabilities

Core reads platform rows from the database; this service has no settings cache invalidation operation. Investor `/investor/platform` exposes raw rows plus grouped pages and performs tenant resolution independently. Application consumers may cache their projection (the current front-app provider uses a five-minute stale window and explicit refetch). A successful Settings GET does not prove an already-open Investor view refreshed or consumed a value. That consumer check remains separate acceptance evidence.

The generic Settings GET does contain `app_entry/content` and `app_authenticated/content` when stored; it is not a privacy/domain allowlist. The operational read parser retains only qualified projection fields. App v1 serializers must preserve unknown root fields, unknown screens and unknown properties inside known screens, because the full content row is replaced. A sparse screen patch would lose unrelated data. Composite App, terminology and theme writes are held until that full preservation contract is implemented and tested.

Brand/media rows are also held: the internal Settings endpoint bypasses the Admin Platform asset normalization/ownership flow. Do not write raw asset URLs or unverified references. Terms publishing and SMTP credentials have separate contracts; neither is enabled by this generic row qualification.

## Focused verification

`node scripts/check-settings-write.mjs`: **87 checks passed**, synthetic transport only. It exercises exact scalar/boolean/three-bullet payloads, key/tenant allowlists, bounds, missing/null/empty preservation, exact restoration eligibility, default-off scope, roles/session replacement, fresh baseline conflicts, no-op suppression, duplicate locking, rejected/uncertain statuses, audit-after-commit 500 reconciliation, exact receipt/GET identity, aborts, explicit GET-only recovery, safe-code/UUID-only metadata with credential-echo rejection, Unicode control rejection, and rendered authorization/release boundaries. It uses synthetic credentials and data only; it is not real authenticated E2E.

Targeted oxlint for all three new TypeScript modules: passed with no warnings. Whole-candidate TypeScript/build/maintained-suite and browser evidence belong to the coordinated release checkpoint; this document does not claim those were rerun by the contract subtask. No live Settings mutation, Backend change, new dependency, commit, push or deployment was performed by this subtask.
