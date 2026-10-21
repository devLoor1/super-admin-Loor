# Whitelabel Lifecycle V1

Frontend-only, SUPER_ADMIN-only, official homolog `https://loor-super-admin.netlify.app`.
Baseline: `cc94466ba08212a2533cca96d304adf3ee291e37`. The release is the single
`feat: enable guarded whitelabel lifecycle` commit introducing this document
(`git log -1 --format=%H -- docs/whitelabel-lifecycle-v1.md`). No Backend/Core,
Render/CORS, physical-delete, identity-edit, bulk or financial capability is added.

## Contract and flags

| Action | Exact request, without body | Required starting state | Result |
|---|---|---|---|
| Activate | `PATCH /api/whitelabels/:id/activate` | inactive | active / isActive=true |
| Deactivate | `PATCH /api/whitelabels/:id/deactivate` | active | inactive / isActive=false |
| Logical delete | `DELETE /api/whitelabels/:id` | active | inactive / isActive=false |

DELETE is the existing deactivation alias. Identity/record are retained, no
cascade is performed, and reactivation remains possible. This does not promise
universal tenant access blocking or deletion of related records.

`VITE_WHITELABEL_LIFECYCLE_ENABLED` must equal the string `true`; missing/other
values fail closed, independently of `VITE_WHITELABEL_WRITES_ENABLED`.
The existing Create/name and Menu Visibility flags remain unchanged. Official
homolog enablement uses this existing site's Netlify Production context (Git
branch **dev**, not business Production); other deploy contexts remain false.
No URL/storage/runtime override exists. Rebuild required after changing flags.

## Review and reconciliation

Existing menu, native dialog/focus, canonical auth/API client, pure commands,
shared per-target/global attempt coordinator and GET adapter are reused.
Positive canonical numeric IDs only; routes/methods are rebuilt from an internal
allowlist, never accepted from a caller. Lifecycle sends no body/name/slug/baseUrl.

Opening a review performs GET of the selected ID, checks original identity,
status and updatedAt, and displays name/ID/slug/baseURL/current/expected state.
All actions require a checkbox; logical delete additionally requires the exact
slug. Selection or permission/session changes close the review. Immediately
before sending, another freshness GET and the canonical session/role checks
prevent stale or redirected dispatch. One shared in-flight lock blocks repeated
clicks and overlapping commands.

Strict HTTP 200 acknowledgement must contain matching identity/status/isActive.
Lifecycle acknowledgement alone never refreshes list/detail: an automatic GET
must reconcile identity and status first. Network/timeout/5xx/malformed outcomes
also trigger **read-only** reconciliation, never a mutation retry. An uncertain
GET confirms current state, not causation. Failed GET leaves the attempt/target
held for manual read verification; new submissions remain blocked. Attempts are
session-memory only (ordinary navigation retains them; full reload loses that
ledger, so operators must re-read before any manual action).

No optimistic locking, idempotency key or atomic Audit/Core transaction exists.
Preflight is not a concurrency guarantee; use sequential single-operator review.
Default-tenant policy/universal access effects remain separate Product/Backend
questions, not claims of this UI. Audit is best effort.

## Validation and controlled execution evidence

19 maintained suites (18 regressions plus the lifecycle suite), TypeScript,
oxlint, production Vite build and diff check are required. The new suite covers
74 synthetic checks: exact routes/no body, state transitions, identity/status
freshness, role/flag/session guards, duplicate clicks, wrong target, uncertain
transport, GET-only reconciliation, post-read failure and delayed responses.
Create/name-only and Menu Visibility retain their canonical regression suites.
Mock browser QA covers desktop 1440 and mobile 390/320, no horizontal overflow,
deliberate deletion, retained record, menu arrows/Escape/focus return and a 503
after application reconciled by GET without a second mutation. Mock-only API
404s for unrelated Dashboard/menu reads are fixture limitations, not live failures.
The inherited bundle-size advisory is non-blocking.

Release/deployment and live smoke must be recorded **after publication**, not
predicted in this pre-release commit. Durable execution ledger and screenshots:

`C:/Users/User/.codex/visualizations/2026/08/28/01a047eb-4949-7663-bff7-5b0686497ccf/whitelabel-lifecycle-2026-10-21/checkpoint.md`

That ledger records actual release SHA, deployment ID/artifact, effective flags,
each HTTP/correlation/GET/reload result, Audit evidence and final acceptance.
At commit time no live lifecycle request has been sent. Never replay completed
ledger entries after an interruption.

Authorized smoke target only: **8**, `SA Operational Smoke 20261020 Renamed`,
slug `sa-op-smoke-20261020-a1-c8170b06`, baseURL
`https://sa-op-smoke-20261020.example.invalid`; initial inactive. Maximum four
UI requests: activate, deactivate, reactivate, logical-delete. End inactive,
retained identity, six original tenants unchanged. No Create/name/Menu Visibility
or financial writes. The zero-balance Wallet row for ID 8 is an expected tenant
projection, not a transaction; verify zero movements, not row absence.

On uncertainty stop automatic smoke progression, GET first; never blindly
retry. A remaining attributable deactivation may only use the same four-request
budget. P0/P1 recovery: disable only the lifecycle build flag and rebuild forward,
preserving existing features. On successful acceptance, keep all three flags ON.
