# Whitelabel CRUD Operational V1

Implementation, synthetic QA and focused technical review: 2026-10-19, Codex Account 1. **Prepared for one local feature commit after the review gates. Live writes remain OFF; promotion and activation require separate authorization.**

## Baseline and scope

- Repository: `devLoor1/super-admin-Loor`.
- Remote `dev`, canonical checkout and feature HEAD: `89872608bc965c584b33920df6bcbbea8e2b2ada`, verified before implementation.
- Branch: `feature/whitelabel-crud-operational-v1`.
- Isolated worktree: `C:/Users/Caio Loor/Documents/Loor/super-admin-Loor-whitelabel-crud-operational-v1`.
- Canonical checkout: `C:/Users/Caio Loor/Documents/Loor/super-admin-Loor` (clean, unchanged).
- No Backend/Core/database/Netlify changes, pushes, deployments or live mutations. This review authorizes exactly one local feature commit after the acceptance gates.

This replaces the transport boundary of the historical [safe preparation](whitelabel-crud-safe-preparation-v1.md). Existing forms, validation, selected-record checks, read adapters and read-only lifecycle presentation are reused.

## Confirmed Backend contract

Inspected `backend-super-admin-loor` revision `88b7bf74f30e01be85401b74c5f513db28065d05`: `docs/whitelabel-operational-v1.md`, Whitelabel controller/service, Create/Update DTOs and their role annotations. Reported Core deployment is `008334d`; no live write was performed to prove deployment parity.

| Operation | Contract |
| --- | --- |
| Create | `POST /api/whitelabels`, exactly `{ name, slug, baseUrl }`; 201 `{ data }`, numeric `data.id`, `isActive=true`, `status=active` |
| Name update | `PATCH /api/whitelabels/:id`, exactly `{ name }`; 200 `{ data }`; slug/baseUrl immutable |
| Authorization | Writes: SUPER_ADMIN only. Reads also allow SUPPORT_ADMIN / READ_ONLY |
| Slug conflict | 409 `E_SLUG_TAKEN`; names need not be unique |
| Concurrency | No Idempotency-Key, ETag, version precondition or optimistic locking; last-write-wins |
| Audit | Best-effort after Core success. A successful mutation does **not** prove durable Audit persistence |

The current Create DTO narrows slugs to `^[a-z0-9]+(?:-[a-z0-9]+)*$` (max 80). The frontend was aligned: leading/trailing/repeated hyphens are refused. Name remains 2–120 characters after the approved whitespace normalization. Absolute HTTP(S), localhost, no URL credentials and the existing stricter URL subset are preserved. IPv6 literals/non-ASCII hosts remain outside that approved subset.

Minimum live check: **one authenticated GET** `/api/whitelabels?page=1&perPage=1` returned 200, a paginated envelope and the expected field names. No response values, tokens or personal identifiers were logged. Existing session was reused; no new login or live mutation occurred. Mutation behavior is source-verified and mock-tested, not live-write-verified.

## Implementation and activation boundary

- `src/lib/whitelabelWriteClient.ts` is the narrow real transport over canonical `apiRequest`, existing token/session access and centralized `handleUnauthorized`. It rechecks SUPER_ADMIN and session identity immediately before dispatch, rebuilds allowlisted payloads, ignores caller-supplied routes/extra fields, and exposes no arbitrary method/path or lifecycle operation.
- `src/lib/api.ts` adds only opt-in expected-success-status checking. Existing authenticated GET, authentication, routes and default transport behavior are unchanged; a canonical check compares all other bytes with the prior baseline.
- `WHITELABEL_WRITES_ENABLED` reads only the build-time value `VITE_WHITELABEL_WRITES_ENABLED === 'true'`. Missing, false, wrong case or any other value disables writes **before token access/fetch**. `.env.example` specifies false. URL/query parameters, navigation and browser storage cannot activate it.
- The transport guard is independent of the disabled UI. A direct transport call with an inactive/missing flag makes zero network requests. Enabled tests use intercepted requests and synthetic sessions; the only enabled browser process points to a loopback-only mock API.
- Create requires the existing review step followed by explicit confirmation. It verifies returned identity/name/slug/baseUrl and initial active state before announcing success.
- Edit exposes only a name input. Slug/baseUrl are read-only facts. It re-reads the selected record before PATCH and refuses changed/missing records. Its response must preserve ID, slug and baseUrl and confirm the requested name.
- Confirmed results refresh list/detail through GET; no optimistic row or rename is fabricated. A new Create selects the returned ID. Manual inspection of a reconciled record closes the dialog and reloads authoritative data.
- Activate, Deactivate, DELETE, slug update, baseUrl update and Menu Visibility writes remain disabled. The 23 canonical Menu Visibility IDs, Finance Read, Opportunities/Companies, participants, Accounts, Audit and KYC boundaries remain protected by their maintained suites.

## Errors and uncertain outcomes

Loading disables repeated submission and closing during a pending operation. The shared coordinator permits one in-flight mutation, binds attempts to their target and session, and survives dialog close/ordinary route navigation within that session. Late/superseded continuations are ignored. No automatic POST/PATCH retry exists.

| Result | Behavior |
| --- | --- |
| 400 / 422 | Safe validation/refusal copy; invalid field keys when recognized; manual correction and fresh review |
| 409 `E_SLUG_TAKEN` | Slug conflict; retain values for correction (legacy 422 with this code also understood) |
| 401 | Existing central session-expiry behavior; no retry |
| 403 | Authorization refusal; no retry |
| 404 on name pre-read/update | Missing record; never substitute another ID |
| Network / timeout / 5xx / malformed or mismatching success | **Uncertain**. Block resubmission; offer an authoritative GET conference |

Create reconciliation searches by slug through the existing GET adapter, checks exact slug plus name and URL, and carries the returned ID. Search coverage must be complete; inconsistent/duplicate pagination or the 20-page bound remains inconclusive and cannot prove absence. Even matching all values yields **“Registro compatível encontrado”**, not “created by this request”: without idempotency/request attribution, another request may have created it. Different values or multiple exact matches are divergent. An exact absence with complete coverage permits only a new manual review, never automatic submission.

PATCH reconciliation re-reads the same ID and compares requested/baseline name and immutable identity. Requested state => found by reading; baseline state => manual review may be retried; a third state => concurrent change, review again. Diagnostics from uncertain responses retain the request correlation ID. Core success is kept separate from Audit persistence.

The coordinator is in memory. Full reload/tab closure clears its attempt ledger; the mounted dialog warns before unloading an unresolved draft/result. No token, payload or attempt history is newly persisted. After losing an uncertain attempt's browser context, an operator must reconcile through authoritative GET before another manual request. This is a documented activation/runbook limitation, not an idempotency guarantee.

The pre-submit freshness GET cannot close the race before PATCH. Concurrent edits still use Backend last-write-wins.

## Verification evidence

All **16 maintained canonical suites** pass, including the 15 existing suites and `check-whitelabel-operational` (37 focused intercepted-transport/UI checks). Existing checks were updated only for explicit Operational V1 files, the tighter slug DTO, immutable baseline facts and Create reconciliation's non-attributing `found` state. Menu Visibility's other-domain checks and exact 23-ID registry remain in place. Total: **2,728 assertions**.

Focused checks cover required/invalid fields, localhost/credentials, exact payloads and routes, 201/initial active state, SUPER_ADMIN and denied roles, 401/403, malformed/wrong identity responses, timeouts/network/5xx, no automatic retry, complete GET reconciliation, stale/missing records, session replacement, repeated submission, retained uncertain attempts and default-disabled direct/UI calls.

TypeScript, oxlint, production build and `git diff --check` pass. Production build uses the default disabled guard. P2: the existing Vite chunk-size advisory (>500 kB) remains; no scoped P0/P1 defect remains known.

Focused native-browser QA used the Codex browser and `scripts/serve-whitelabel-operational-mock.mjs`, bound to `127.0.0.1:4319`. It has no upstream client, database, credentials or disk persistence. No production imports reference this harness.

| Viewport/configuration | Fresh browser coverage |
| --- | --- |
| 1440 × 1000, mock-enabled | Create required/invalid fields, localhost, explicit review, initial active success, double-click => one POST; name-only Edit/review/success and one PATCH; authoritative refresh |
| 390 × 844, mock-enabled | Create and Edit review, simulated applied-but-503 outcomes, GET reconciliation, Create attribution warning, consultation of found record, PATCH state confirmation without resend |
| 360 × 800, mock-enabled | Create duplicate slug/correction preserving draft; Edit required name/read-only identity, review/success, no horizontal overflow |
| Default flag absent, SUPER_ADMIN | Create/Save buttons remain disabled even with `writes=true` in URL; mock API counted **zero** mutation requests |
| READ_ONLY, mock-enabled | Both entry points disabled; no dialog or mutation |

Visual screenshots were inspected at desktop and both mobile widths. Native dialog containment, first invalid field, review/result focus, keyboard submit, and close/focus return were checked. These are focused checks, not a full WCAG audit or repetition of prior domain QA matrices.

## Focused technical review

The existing worktree, actual diff, production code, intercepted behavioral tests and canonical assertion changes were independently inspected from the approved baseline. No Backend contract rediscovery or live write was necessary. The shared transport comparison still protects every byte except the exact opt-in success-status check; exceptions for the narrow write client and adapter remain explicit paths. No dependencies or unrelated feature files changed.

No P0/P1 defect was found. One P2 presentation issue was corrected: selection/session-change announcements no longer say “Nada foi enviado”, because an attempt may already have been dispatched before the dialog closes. The actual page-handler checks now guard that distinction. Obsolete comments describing the now-guarded transport as review-only were corrected too.

Fresh review browser checks used 1440 × 1000 and 390 × 844 only: Create required fields/URL credentials/localhost/confirmation, exact three-field POST, name-only PATCH, double-click prevention, 409 correction, applied-but-503 reconciliation, and authoritative GET refresh. An uncertain PATCH survived A/B navigation under its original ID without another PATCH. Create read-back retained the non-attribution warning. Dialog geometry stayed inside the mobile viewport with no horizontal overflow; required-field and result focus were checked.

The default-disabled check also used the actual production bundle served locally, with an absent flag and a loopback-only synthetic API. After direct route access and refresh, both final actions stayed disabled even with `writes=true`, `VITE_WHITELABEL_WRITES_ENABLED=true` in the URL, and corresponding session/local storage values. The mock recorded zero POST/PATCH requests in this configuration. Production dead-code elimination retains a write function that only throws `WHITELABEL_WRITES_DISABLED`; no enabled confirmation button remains. Explicit build-time activation remains a separate operational gate, never a URL or storage setting.

The remaining P2 item is the existing Vite bundle-size advisory. Last-write-wins, absent idempotency, best-effort Audit, no automatic retry, non-durable in-memory attempt history and disabled lifecycle operations remain accepted V1 limitations. No broader regression or accessibility matrix was repeated.

## Files and handoff

- UI/coordinator: `WhitelabelsPage.tsx`, both existing CRUD dialogs, MutationStates, contract/commands/form/outcome/runner; new `OperationalMutationState.tsx`, `useWhitelabelMutation.ts`, `whitelabelOperationalApi.ts`.
- Transport/config: new `src/lib/whitelabelWriteClient.ts`, opt-in status check in `src/lib/api.ts`, `.env.example` false.
- Tests: existing Whitelabel CRUD/mocks and Menu Visibility boundary checks; new operational suite and local-only browser mock server.
- Documentation: this file and a historical-preparation supersession note.

The local feature commit SHA and final gate results are recorded in the review handoff. No push, PR, promotion or deployment is part of this review. The canonical `dev` checkout and remote `origin/dev` must remain at the approved baseline; the feature worktree must be clean after the single local commit.

Any live smoke is a separate authorization: agree the exact test slug/URL, active-tenant isolation and a cleanup/neutralization procedure first. Do not assume DELETE is available or permitted. This task grants no permission to enable the feature for homolog or to create a smoke tenant.
