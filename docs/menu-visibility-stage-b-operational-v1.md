# Menu Visibility — Stage B Operational V1

2026-10-20 · Account 1 · local implementation for independent review.

**Live writes: OFF. Sidebar enforcement: OFF. Live PUT count: ZERO.**
The initial implementation was uncommitted. The independent review below authorizes
one local feature commit only; no push, promotion, deployment, Netlify setting,
Backend/Core/database change or real business/financial mutation is part of this delivery.

## Baseline and recovery

- Canonical repository: `C:/Users/User/Desktop/Loor/super-admin-Loor`.
- Verified live `origin/dev`: `c5ecb5addf6772bf9ca68c41099e0491ee953fe2`.
- Isolated worktree: `C:/Users/User/Desktop/Loor/worktrees/super-admin-menu-visibility-stage-b-operational-v1`.
- Feature: `feature/menu-visibility-stage-b-operational-v1`, HEAD at that exact baseline;
  initial implementation changes were intentionally **uncommitted** for review.
- Canonical checkout was clean on local `dev` `89872608bc965c584b33920df6bcbbea8e2b2ada`
  and was preserved, not switched, merged, rebased or normalized.
- Protected remote refs at verification: `main` `c2235ac5d0d65408e9d39bf836a1a717da3d95ae`;
  `docs/backend-handoff-v1` `89a3b5058f52f981b3a1b06756d7f33a2a043f27`.
- Historical Stage A / Stage B preparation evidence remains in its original documents;
  only a supersession notice was added to the preparation document.

## Verified Backend contract

Source: `backend-super-admin-Loor` `88b7bf74f30e01be85401b74c5f513db28065d05`,
`docs/menu-visibility-stage-b.md`, module controller/service/DTO/menu IDs and Prisma
`MenuVisibilityConfig`. Inspected read-only via Git objects; no Backend checkout repair.

The existing authenticated built-in homolog session was rediscovered, not replaced.
Exactly **one authenticated GET** of `/api/homolog/menu-visibility` returned HTTP 200:
global scope, version **1**, all **23** known boolean IDs, locked IDs
`dashboard` / `configuracoes`, persisted timestamp `2026-10-16T18:34:49.169Z`,
and an operator ID present. No operator identity, token or other private data is recorded.
This proves the read contract only, not live execution of the new frontend save path.

GET roles: SUPER_ADMIN, SUPPORT_ADMIN, READ_ONLY. Other documented roles receive 403.
PUT role: SUPER_ADMIN only; Backend RBAC remains authoritative.

PUT `/api/homolog/menu-visibility` replaces the full preference map. The frontend sends
exactly two top-level fields, in registry order:

```ts
{ visibility: completeApproved23IdBooleanMap, version: originalReference.version }
```

Missing/extra IDs, nonboolean values, missing/invalid versions, protected false values,
read-only roles, registry drift and unchanged candidates cannot dispatch a write.
No `operation-companies` ID was added. Version is always taken from the authoritative
reference, never a timestamp, a URL, a browser preference, an error's `currentVersion`,
or a guessed default. Empty configuration version 0 is supported.

The existing GET adapter now strictly requires a nonnegative safe integer `version`.
Known missing/nonboolean IDs still fail; unknown GET IDs are bounded/reported as drift
and never become navigation entries. Drift also blocks saving. Persisted scope and
metadata validation are retained; unexpected protected false values are reported, not
silently normalized in the frontend.

## Backend concurrency: shared activation risk, not atomic CAS

The service reads the prior configuration, separately reads the existing row/version,
checks the submitted version, then performs an **unconditional upsert by singleton ID**.
The update predicate does not include the expected version and the sequence is not
wrapped in an atomic compare-and-swap transaction. The resulting version is checked
*after persistence*. Therefore a concurrent request may overwrite the configuration
and then return **409 E_MENU_VERSION_CONFLICT**. The initial-row creation race has a
further gap because the post-update check is conditional on a previously existing row.

An identical map PUT still increments version. Matching maps do not prove attribution.
Frontend guards cannot make this Backend algorithm atomic. **Permanent shared/concurrent
operational activation requires this risk to be corrected or explicitly accepted.**
This does not automatically block a separately authorized sequential, single-operator,
version-checked and reversible homolog smoke. The source contract supports one change,
GET confirmation, restoration using the latest GET version, and a full 23-ID GET check.
No live concurrency experiment or PUT was performed.

Protected IDs are now enforced by Backend (`400 E_MENU_LOCKED`); the older preparation
statement that the server accepts hiding them is historical, not current.
Audit is **best-effort after persistence**: the service catches Audit write failures.
A successful PUT/readback does not prove durable Audit delivery, and this frontend
does not manufacture Audit events or infer that Audit failure rolls back persistence.

## Implementation and save UX

- `src/lib/menuVisibilityWriteClient.ts`: narrow allowlisted PUT over canonical
  `apiRequest`, Bearer, X-Correlation-ID, exact HTTP 200 requirement, 20-second timeout
  and central 401 handling. No second fetch/auth client or retry mechanism.
- `VITE_MENU_VISIBILITY_WRITES_ENABLED === 'true'` is the only activation source.
  Absent, false, wrong-case, whitespace, booleans and other strings remain OFF.
  The transport checks it **before token access or dispatch**, not just in the UI.
  `.env.example` is false. URL/storage/draft/navigation cannot enable it.
- Reference and draft are independent. The draft retains its originating version;
  a new source GET cannot replace unsaved edits. Unknown GET IDs block a candidate.
- Review shows preference changes, parent/child consequences, protected values and the
  exact full map/version. Only a valid reviewed SUPER_ADMIN candidate in an enabled
  build can submit. No changes means no PUT.
- A synchronous one-attempt coordinator locks repeated activation before the first
  await. Pending writes/readbacks disable editing and review/discard actions.
- Every completed current-session attempt is followed by authoritative GET (including
  400, 403 and 409); authoritative 401 instead uses canonical expiry. GET failures can
  retry **only GET**. PUT is never automatically repeated.
- The ledger survives ordinary route unmount/remount. A pending-navigation warning
  explicitly says that leaving does not cancel, undo or repeat the dispatched write.
- Session version, operator ID and roles bind the ledger/editor/dialogs. Identity/role
  changes invalidate editable state, even a change between two SUPER_ADMIN identities.
  Late responses cannot update another operator's UI or expire a newer session.

### Reconciliation

| Classification | Evidence / behavior |
| --- | --- |
| APPLIED | Exact HTTP 200, valid acknowledgement with candidate map, reference version + 1 and submitting operator; subsequent GET matches map, version and persisted metadata. Only then is the reference replaced. This is observed agreement, not an atomicity guarantee. |
| NOT CONFIRMED | Timeout/network/5xx/malformed or unexpected 2xx, failed readback, refusal, or matching candidate map without a valid acknowledgement. No success claim, including when version advanced by one. |
| DIVERGED / CONFLICTED | 409 always remains conflicted, even if GET equals the attempted candidate. A third map, regressing version, drift or an unexpected newer version is divergent. Current GET map/version are displayed separately from the original draft/reference. |

An explicit “Usar leitura atual e revisar rascunho” adopts the readback as a new reference
while preserving the attempted full map as intent. It does not send anything. The next
review recomputes *all* differences against the new global state, including concurrent
preferences the old intent would replace. No silent merge/rebase or stale replay occurs.

### Unchanged boundaries

The resolver remains confined to draft/review/isolated preview. Actual Sidebar,
AppShell, `navigation.ts`, routing/guards, direct URLs, Dashboard shortcuts, internal
links and login landing are unchanged. Hiding Financeiro in the mock configuration
did not hide the actual Finance sidebar link. Dashboard and Configurações remain
protected; Sistema/Configurações/Ajuda remain independent; hidden parent preferences
do not rewrite child preferences. No new recovery screen.

Whitelabel operational writes remain OFF; its source/client and Finance/Operation,
Accounts, Audit, KYC, Investors, Entrepreneurs, auth and shared read transport were not
modified. Only canonical-test allowlists were narrowly extended for this one new PUT
client; existing protected-domain byte and transport checks remain in force.

## Validation and evidence

Final aggregate command: TypeScript, oxlint, standard production build,
`git diff --check`, then every `scripts/check-*.mjs` in a separate Node process.
All passed after final code changes: **17/17 suites**, including **83 focused
operational checks** and **1,300 Menu Visibility Product/read regression checks**.
The inherited >500 kB bundle advisory remains non-blocking; no dependency was added.

New `check-menu-visibility-operational.mjs` executes the actual transport and coordinator
with intercepted fetch, synthetic sessions and `.example.invalid` data. Cases cover
version 0/saved/malformed, exact body/auth headers, all role refusals, all 23 missing-ID
cases, extra/nonboolean/protected maps, no-op, duplicates, acknowledgement/readback,
409 before/after persistence, third-map concurrency, newer identical maps, 400/401/403,
timeout/network/5xx/malformed 2xx, readback failure/retry, identity/role changes and stale
responses. No real credential/service access is possible in these tests.

The maintained Menu Visibility suite preserves Stage A and Product-rule regressions;
its obsolete test-only coordinator (map-only success after uncertainty, hypothetical
409 rejection) was replaced by tests of the real operational coordinator, not waived.

Browser QA used the **Codex built-in browser**, production-mode local bundles and
`scripts/serve-menu-visibility-operational-mock.mjs`. The mock binds loopback only,
stores volatile synthetic data, has no upstream client, database or disk writes,
and is never imported by the application. Synthetic local login POSTs and menu PUTs
are mock requests, **not live business mutations**.

Observed browser cases:

- 1440px: exact review body/version 0, 23 preferences, protected values retained,
  Tab inside dialog, Escape returns focus to Review, one synthetic PUT followed by
  GET, version 1 confirmed, no dirty bar, real Finance sidebar link unchanged.
- 390px: 409-after-concurrent-update, current version 2 shown separately from original
  version 0, one-edit draft preserved, explicit re-review creates version-2 payload
  with both resulting differences, no second PUT.
- A long conflict re-review button initially overflowed at 390px. Feedback layout and
  wrapping were corrected locally; both 390px and the targeted **320px** recheck have
  no horizontal overflow. No broad historical screen matrix was repeated.
- Mock 503 after persistence: candidate map/version 1 read back but **NOT CONFIRMED**,
  original reference version 0 retained; explicit read retry added only GET, one PUT total.
- Held PUT: editing/review disabled; route exit warns correctly; return/reconciliation
  gives one PUT total, not a new request from remount.
- READ_ONLY: 23 read states, zero switches/draft/review/save; another synthetic
  SUPER_ADMIN identity reload reconstructs a clean editor without the old dialog/draft.
- Flag-absent production build: Save disabled; URL and browser storage attempts cannot
  activate it; mock request ledger stays **zero PUT**, configuration version 0.
- No captured JS console errors. Expected synthetic HTTP conflicts/unavailability are
  deliberate test responses, not evidence of live Backend failure.

Tooling limitations: the controller refuses to activate an `aria-disabled` protected
switch (actionability), so refusal/focusable semantics are additionally covered by
canonical policy/render tests. One local discard click timed out in the controller;
DOM readback showed it had completed, so it was not blindly repeated.

Local evidence (outside repository):
`C:/Users/User/.codex/visualizations/2026/08/28/01a047eb-4949-7663-bff7-5b0686497ccf/menu-stage-b-2026-10-20/`
contains `browser-evidence.json`, `applied-1440.png`, `conflict-390-fixed.png`,
`conflict-320-fixed.png` and `writes-off-review-1440.png`. The initial overflow capture
is retained for comparison, not presented as the final result. Temporary preview/API
processes and local QA tabs were stopped/closed; the real homolog session was not logged out.

## Findings / operational limits

- Frontend P0/P1: no known open issue from focused validation; final suite gate below.
- Backend P1 activation risk: non-atomic version check/upsert, including 409 after a
  write. This is disclosed, not repaired or disguised by frontend reconciliation.
- P2 fixed: conflict-feedback mobile overflow; pending-exit copy must not say “nothing
  was saved” after a request has been dispatched (corrected).
- Full page reload/process restart loses the in-memory attempt ledger. It is **not**
  an idempotency guarantee. Reconcile real authoritative state before another attempt;
  uncertain writes may still finish later. No persisted replay queue was added.
- Concurrent global edits can invalidate a reference at any time. Best-effort Audit
  and non-atomic Backend updates prevent claiming linearizable/audit-atomic execution.
- No live PUT E2E is claimed. A controlled sequential smoke requires separate explicit
  authorization and a restricted authorized frontend origin/session. Permanent shared
  activation separately requires concurrency resolution or explicit risk acceptance.

## Initial implementation gate (historical)

**IMPLEMENTED — DEFAULT OFF — READY FOR FRESH-CONTEXT ACCOUNT 1 TECHNICAL REVIEW.**

TypeScript PASS · oxlint PASS · production build PASS · diff check PASS · canonical
suites 17/17 PASS · focused mock browser PASS at 1440/390 and targeted 320px.
No known open frontend P0/P1; disclosed Backend concurrency risk still blocks live
activation. Best-effort Audit, ledger loss on full reload and browser tooling limits
above remain explicit limitations, not concealed live-E2E claims.

At the initial handoff, feature HEAD was `c5ecb5addf6772bf9ca68c41099e0491ee953fe2`;
all implementation, tests and documentation changes were **uncommitted**. That phase
performed no commit/push/promotion/deploy; the review below supersedes its commit status.
Live menu-visibility PUTs **0**. Live business/financial mutations **0**.

## Independent review — 2026-10-20

Live `origin/dev`, `origin/main` and the handoff branch were fetched and matched the
baseline above. The 19 expected changed files were intact; no unrelated work was
discarded or overwritten. Review inspected transport guards, strict versions/maps,
operator identity, single-flight state, 409/uncertain handling, UI reference adoption,
canonical session/error machinery, representative assertions and the Backend service
at `88b7bf7`. No additional live API request was necessary.

Confirmed in-scope defect: after a successful readback, a subsequent failed GET kept
the previous `readback` available, labelled current and eligible for adoption. A new
regression first failed against that implementation. The coordinator now clears the
previous snapshot/decision when a fresh GET starts and also refuses adoption while
a read error exists. GET failure cannot unlock another PUT via a stale snapshot.
The original attempted map/version remain intact; no automatic PUT retry was added.

A second focused mock test verifies sequential change → GET → restore with the latest
GET version → GET, restoring **all 23 original preferences**. This is contract evidence
for the proposed controlled smoke, not a live financial/business operation.

Independent validation **PASS**: TypeScript, oxlint, standard production build,
`git diff --check`, **17/17 canonical suites run once**, including **85 operational
checks** (the original 83 plus the failed-refresh regression and sequential restoration).
The inherited bundle-size advisory remains non-blocking. No dependencies changed.

Small built-in browser check **PASS**: desktop 1440px sent one synthetic PUT for
`ajuda` at version 0, then confirmed version 1 by GET. A failed refresh removed the
old global snapshot and re-review action; GET-only recovery confirmed again without
another PUT. Mobile 390px showed the disabled Save action and no horizontal overflow;
it sent **zero additional PUTs**. Initial focus returned to the Back-to-draft action.
Only loopback mocks were used, with synthetic authentication. Captured console errors:
none. A background compositor screenshot issue was resolved by briefly presenting
the local preview; DOM viewport and final rendered capture were both verified, with
no application workaround. The previous broad synthetic matrix was not repeated.

Review evidence outside Git:
`C:/Users/User/.codex/visualizations/2026/08/28/01a047eb-4949-7663-bff7-5b0686497ccf/menu-stage-b-review-2026-10-20/`
(`review-evidence.json`, `desktop-save.png`, `mobile-off.png`). Temporary mock tabs and
the three local API/preview processes were closed/stopped; prior browser display state
and viewport were restored. No real homolog session was replaced or logged out.

**APPROVED FOR PROMOTION + CONTROLLED HOMOLOG SMOKE**, subject to the separate stage
authorization and restricted-origin/session qualification below. No current source-
contract blocker or open frontend P0/P1 was identified. The stale-refresh finding is
corrected and covered by a failing-before/passing-after regression.

This review is consolidated into exactly one **local feature commit** (obtain its SHA
with `git log -1` on this branch). Remote dev/main/handoff refs remain untouched.
No live PUT, push, promotion, deployment, Backend/Core modification or real business/
financial mutation was performed. This approval does not enable permanent shared writes.

### Next stage: separately authorized controlled homolog smoke

1. Promote the reviewed **default-OFF** release and verify its served bundle.
2. Qualify a restricted write-enabled frontend origin/session already authorized for
   the homolog API; do not expose it as an unrestricted shared operational release.
3. Capture the complete original 23-ID map, version and safe persisted metadata.
   Coordinate a single operator/no concurrent writers for this bounded window.
4. Change exactly one non-protected preference; review the exact map/version; send
   one PUT and confirm via GET. Do not infer success from matching maps alone.
5. Restore the captured original map using the **latest authoritative GET version**;
   verify all 23 preferences by GET. Versions advance; restoration concerns map values,
   not rolling back the version or audit history. An already-restored no-op needs no PUT.
6. On ambiguity, 409, a concurrent version/map change, authorization failure or inability
   to verify/restore: do not replay automatically or overwrite another operator's map.
   Reconcile authoritative state and escalate that concrete condition.
7. Disable/close the temporary frontend and its session; standard shared build stays OFF.

No source-contract obstacle to that sequential procedure was identified. Availability
of the restricted authorized origin/session must be qualified at that stage; it is not
proven by loopback mocks and is not a generic request for new Backend implementation.
Permanent concurrent activation is **not** approved by this procedure.

## Official homolog activation — corrected frontend-only authorization (2026-10-20)

The current user authorization supersedes the temporary-origin procedure above for
this activation: use only the official homolog frontend, with one SUPER_ADMIN
operator and two sequential, explicitly reviewed UI PUTs (change `ajuda`, then
restore the full original map). No Backend/Core or Render work is authorized.
The existing Backend version check remains **non-atomic**; no concurrency-safety
claim or parallel-writer test is made. Coordinate single-operator use before any
broader concurrent rollout.

The smallest supported activation is **site-scoped Netlify build configuration**;
the approved application/transport/RBAC/navigation implementation remains unchanged.

| Target | Configuration |
| --- | --- |
| Official homolog | `https://loor-super-admin.netlify.app` |
| Netlify site ID | `25e47255-95dc-4ed6-a22a-8bce03017ee7` |
| Git production branch for this homolog site | `dev` |
| Homolog API | `https://backend-super-admin-loor.onrender.com/api` |
| `VITE_MENU_VISIBILITY_WRITES_ENABLED` | Exact string `true` in this site's Production deploy context only; `false` for previews, branch deploys, agent runners and local development |
| `VITE_WHITELABEL_WRITES_ENABLED` | Exact string `false` |
| Actual sidebar enforcement | OFF, unchanged |

These are public build-time booleans, not secrets. Current Netlify plan exposes all
scopes rather than a selectable Builds-only scope; context/site isolation is retained.
Changing a variable alone does not alter a published Vite bundle. Use the existing
Git-connected build and verify the exact published commit/assets before any PUT.
Local `.env.example` defaults stay OFF; no source-code hardcoding is introduced.

Before the first UI PUT, preserve a fresh authoritative GET's complete 23-ID map,
version, updatedAt and updatedBy in the sanitized local checkpoint. Re-read map and
version immediately before each PUT. Exactly one non-protected `ajuda` difference
is permitted. Require HTTP 200, validated acknowledgement and authoritative GET;
reload to prove persisted state, not React memory. Restore all original preference
values using the latest GET version, then GET/reload again. Versions and Audit
history advance rather than rolling back. No Whitelabel or financial write is allowed.

On timeout/5xx/malformed response/409/unexpected state, stop mutations and reconcile
by GET; a 409 may occur after persistence under the existing Backend. Never retry
automatically or overwrite another operator's changes. If the smoke fails, set this
site's Menu Visibility flag to `false` and rebuild through the existing supported
deployment workflow. Do not claim restoration until the original map is observed.

Keep the homolog flag enabled after successful persistence/restoration validation,
as explicitly requested. This does not activate sidebar filtering, alter role access,
or resolve the known Backend concurrency limitation. Audit remains best-effort.
Runtime result, release/deploy identifiers, request counts and restoration evidence
must be recorded separately after execution; this activation procedure is not itself
evidence that the two live PUTs have already occurred.
