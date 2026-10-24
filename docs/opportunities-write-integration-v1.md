# SA-BE-001 — Opportunities write integration V1 checkpoint

2026-10-24. **SCOPED RELEASE CANDIDATE PASSED — PUBLICATION NEXT.** Browser recovered after the user restarted the workstation. Existing implementation/evidence preserved. Official homolog will expose only authoritative reads plus SUPER_ADMIN review-state `about` editing/archive; creation, upload, denial, broader edits and approval/provider operations remain unavailable. PATCH41/archive41 remain live-verified,41 remains archived, no new live business mutation. Image1770 retained; creation is synthetic-validated but not live-persistence-verified after `E_MISSING_PROFILE_BANK`. Final deployed commit/assets/runtime evidence is recorded in the external `opportunities-write-2026-10-23/release-evidence.md` companion after the single Git-connected publication; this commit alone is not deployment proof.

## Browser recovery and scoped release — 2026-10-24 09:25 UTC-3

Reused the existing feature/worktree at c935f46, including all 17 previously uncommitted files and six matching runtime fingerprints before edits. Opening live usage **15% five-hour /30% weekly used**; later34%/33%, ordinary usage allowed. One normal supported browser initialization succeeds. Rediscovered the existing official authenticated built-in tab; no external Chrome, browser override, password/token handling or authentication workaround. Native-app inventory timeout does not affect the operational built-in browser.

### Accepted independent release boundary

- Existing authoritative list/detail reads remain intact. Only `SUPER_ADMIN` can enter the operational editor; direct routes for other roles disclose no editor/data.
- Review-state `about` is the **only** released PATCH key. Review-state archive is the only released POST command. Fresh ID/tenant/status/value preflight, canonical transport, explicit confirmation, synchronous attempt locks, session/abort guards and response+GET reconciliation are retained. Unsupported production actions/fields are denied in the client, not merely hidden in the UI.
- Active/finished/archived/future states are read-only in the new editor. A contextual detail link is shown only for review+SUPER_ADMIN. Existing Backend RBAC remains authoritative; no new flag or Menu Visibility ID.
- Production creation/upload/approval/deny and wider descriptive/identity/classification edits remain withheld. The full existing DEV workbench and create/approval contract code are preserved for later separately qualified acceptance; no inference that untested creation persisted successfully.
- About-only production editing has no catalog dependency; no unnecessary five-helper fetch. DEV wider-field checks retain their authoritative helpers.
- No automatic retry or optimistic-concurrency/idempotency guarantee. Backend checks remain non-atomic, and in-memory locks do not survive reload or coordinate other operators. An uncertain result stays locked/reconciled by GET; never present GET consistency alone as a successful command receipt.

### Validation of this activation delta

All **30 maintained suites /4,127 checks passed** once after the final runtime delta. Focused Opportunity suite118 includes actual rendered role/status/direct-route controls, production command/field denial, fresh-state checks, one-command reconciliation, stale/uncertain outcomes and retained DEV contracts. TypeScript, oxlint, production Vite build and diff check pass. Inherited >500kB bundle advisory remains non-blocking. Local build assets: `index-Bsq3yB2o.js`, `index-BOhiZaKw.css`; environment-specific official asset names must be verified independently after deployment.

Built-in browser, loopback-only synthetic API (no live proxy):

- Production review editor renders exactly two textareas: About and archive reason. Confirmation initially focuses Cancel; Escape closes it and returns focus. Cancel does not dispatch; unsaved navigation shows discard/stay protection.
- One **synthetic-only** about PATCH and one **synthetic-only** archive exercised the newly published form path. Response+GET confirms each; archive removes all editor controls and reload remains read-only. These are not additional real QA mutations or new live persistence evidence.
- 1672,1440,900,390,320px: no horizontal overflow; saved `editorial-production-<width>.png` captures. New layout fits existing shell; no Login/Dashboard/Account/Settings/Finance redesign.
- Active editor is read-only; direct create route remains readiness-unavailable. Rendered tests cover other states/roles and forbid upload/provider/approval controls.
- Reduced-motion + forced no-WebGL **external harness only**: static background, zero canvas, readable review form with both controls, no overflow/errors. No fallback switch, mock token, injected session or QA server enters the repository/build.
- DEV full creation form/helpers still render. Existing unchanged DEV responsive/interaction captures and prior synthetic matrix reused. No DEV create/upload or other business action replayed. A full-page DEV capture timed out; normal-viewport capture succeeded. Unsupported CDP media command/read-only evaluator operation were tooling limitations, resolved through the isolated HTML harness, not frontend changes.
- Console: final production fallback and DEV checks have no application errors. Initial local QA origin mismatch was in the external harness, corrected to same-origin synthetic API; no real CORS/Backend/environment change.

### Live preservation / release prerequisites

Normal official published read UI again shows Opportunity41 **archived**, its exact saved About marker and archive reason. No mutation left uncertain; no upload/create/PATCH/archive replay. Prior Menu Visibility GET200/version5/all23/hash unchanged remains accepted; post-publication GET-only smoke will verify the served surface/preferences. No Menu PUT or registry/settings changes.

Netlify dashboard authenticated and operational: existing `loor-super-admin` serves `https://loor-super-admin.netlify.app`, canonical `devLoor1/super-admin-Loor`, build branch `dev`, **automatic publishing ON**, current published c935f46/deploy6adbea0cd725af94c522e49e. Initial dashboard navigation timeout resolved by reading the same loaded tab; not a deployment/Backend failure. No manual deploy, relink, flag/configuration change or second publication trigger.

Fresh refs before promotion: dev/origin/dev c935f46; main/origin/main c2235ac; handoff/origin/handoff89a3b505. Canonical worktree clean. SA-BE-002, SA-BE-003A owner-attested evidence and Settings Read artifact hashes unchanged (values in prior recovery section). Auth/session, 23-ID registry/preferences, dependencies and unrelated runtime modules unchanged. Existing candidate is preserved plus the justified narrow activation/test adaptations: **21 intentional files**.

**Release decision: GO for read/review-about/archive only.** Create remains blocked by Entrepreneur33's actual missing Core bank-profile prerequisite. Do not modify that profile in this delivery, repeat upload/create, unarchive41, expose approval or claim published form-click live mutation acceptance. Retain image1770. No further Product/Backend approval cycle needed for this accepted subset.

Next: scoped local commit → verify latest dev unchanged/ancestor → clean fast-forward and one normal push → one existing Git-connected Netlify publication → verify actual deployed commit/served assets/authenticated editor/read-only states and Menu Visibility using GET-only. Record final result in the persistent companion release ledger without a docs-only second deployment.

## Latest resume — 2026-10-24 08:38:17 UTC-3

Credits restored: opening live Account1 usage **4% five-hour /28% weekly used**, ordinary usage allowed. Reused exactly the same worktree `C:/Users/User/Desktop/Loor/worktrees/super-admin-opportunities-write-integration-v1`, branch `feature/opportunities-write-integration-v1`, HEAD `c935f46d3f3c2318737246cd081960c95aafdafc` plus the preserved 17-file uncommitted implementation/test/checkpoint diff. **All six runtime fingerprints still match** the validated candidate. No files discarded/reset/recreated, no Cloud patch reapplied, no implementation restart.

### Interrupted final evidence recovered — no replay needed

Read `opportunities-write-2026-10-23/live-smoke-ledger.json` from the persistent external QA directory. It contains the complete minimized observed write ledger and readbacks:

- One banner upload HTTP201 → **image1770**; no supported automatic delete; retain its ID.
- One create HTTP422 **`E_MISSING_PROFILE_BANK`**; no new Opportunity ID; scoped unique-name GET200 total0/exactMatches0. This is a genuine Core profile prerequisite, not an assumed rejection based on Company status. Do not modify Entrepreneur33 or retry this create/upload.
- One descriptive `about` PATCH41 HTTP200 → exact independent GET match, still review.
- One archive41 HTTP201 → independent GET **ID41 / WL6 / owner28 / archived**, about retained and archive reason matched.
- **No uncertain mutation.** No second upload/create/PATCH/archive. No approval/provider/financial operation. Opportunities39/40/45 untouched.
- **Menu Visibility was already recovered before interruption:** GET200/version5/all23, sorted-entry SHA256 `fb7910fbb9e0e3baeb6016151cdadcdce0d40723d10331a74e44b9394df5b7fe`, unchanged. Correlation `02c54584-da4f-4306-a26a-94b2ef53e1c8`. Do not rerun it merely because the earlier checkpoint summary said pending.
- The **unmodified published read UI** was also reconciled before interruption: official Opportunity41 page displayed `Arquivada`, the controlled QA marker and exact archive reason. Screenshot `live-opportunity41-archived.png`. Temporary candidate namespace/fetch instrumentation was removed, viewport override cleared, official tab marked for handoff. This is distinct from deployed write-form acceptance: the actual writes used the unchanged candidate client temporarily in the authenticated official browser origin, not published form clicks.

There was **no commit, push or deployment** before interruption. No completed suites or business actions were repeated in this resume; runtime fingerprints and diff check only. The source still limits all new commands/UI to DEV; production remains the pre-existing operational read surface. No claim that edit/archive is already published.

### Independent release assessment — feasible, not yet activated

The exact live-tested subset can ship without successful creation acceptance:

1. Retain authoritative Opportunity reads for existing authorized roles.
2. Expose only **review-state `about` editing** and **review-state archive**, SUPER_ADMIN-only, with existing canonical transport, fresh tenant/status/field preflight, explicit confirmation, one-attempt locks, response+GET reconciliation and no automatic retry.
3. Keep active/finished/archived Opportunities read-only in the new operational editor;41 must remain archived. Broader PATCH fields, identity/taxonomy/image edits, deny, creation and approval/provider actions remain outside the production release subset.
4. Preserve complete create and wider contract/DEV work for later acceptance. Do not delete/simplify it or label creation persistence live-verified. No new flag/registry/RBAC/Backend policy is needed; use existing presentation-readiness mechanism plus fail-closed action/field guards in the client.
5. Add only the scoped production edit destination/contextual link and truthful disclosure; verify unsupported direct routes/actions remain unavailable. Targeted production guard/UI checks are genuinely new because activation changes behavior. Reuse all unchanged synthetic, responsive and live evidence; run required maintained release checks after the actual delta, not before it or repeatedly without changes.

This activation delta **has not been implemented or tested in this resume**, because its mandatory browser verification path is currently unavailable. No further Product/Backend approval is being demanded. Creation needs a normally prepared eligible QA bank profile and separately authorized later acceptance, not a Backend code/config workaround.

### Concrete current tooling blocker

Supported Codex built-in browser initialization `await cua.getState()` failed before any tab could be discovered:

`failed to write kernel assets: O sistema não pode encontrar o caminho especificado. (os error 3)`

Performed **one supported `cua_repl.js_reset`**, then one fresh normal `cua.getState()`; identical failure. No stale tab handle was used. This is not an observed application authentication/CORS/Backend failure. Read-only Windows diagnostics: TEMP and TMP are configured and their directories exist. The failing kernel asset path is not exposed; root cause remains unproven. No speculative temp creation/deletion, cache reset, permission change, installation, infrastructure/browser-security change, external Chrome or browser override.

Netlify reader connector additionally reports `MCP tool codex_apps/netlify.netlify-project-services-reader is not available to the model`; this is not a site/build failure. Existing Git-connected site/repository/dev workflow remains the intended publication path. No manual deploy, project relink, environment/flag change or new deployment infrastructure.

### Preserved Git / evidence state

Fresh frontend fetch confirms local/remote dev **c935f46d3f3c2318737246cd081960c95aafdafc**, main **c2235ac5d0d65408e9d39bf836a1a717da3d95ae**, handoff **89a3b5058f52f981b3a1b06756d7f33a2a043f27**. Canonical frontend worktree clean; isolated feature retains the expected uncommitted work. Backend CP/Core worktrees clean and unchanged. Diff check passes.

Protected evidence hashes still match: SA-BE-002 `c957ecebcfa123024d8edfbf6b3d43ef68711ba608826636642794ce17e29b3b`; SA-BE-003A `fe772b53944faee88a00566df068ac805b1449c9a9c288d7ca3a3594e875fe8a`; Settings Read release `bcc0e32fe5cd7d5a96253e39a617124ccfb447f560de396c814795d1b5b4579a`. Existing SA-BE-003A owner-attested acceptance classification preserved.

**Exact next unfinished action:** restore supported built-in browser initialization; then implement the narrow production `about`/review-archive release boundary, validate only the relevant new behavior and mandatory release gates, commit/review/fast-forward/push through the existing Git-connected Netlify path, verify actual deployment/assets and authenticated UI with GET-only/no mutations. Do **not** replay the four recorded writes, unarchive41, repeat completed smoke/tests, request another QA approval or promote the current DEV-only candidate as if operational production controls were already verified.

## Live mutation ledger — 2026-10-23 QA autonomy authorization (mutation cycle complete)

User now authorizes exactly one no-warranty QA create attempt for WL6/Entrepreneur33/Company1 without another administrative Backend approval. If actual create rejects a genuine Core prerequisite, one descriptive PATCH + GET + archive + GET on disposable Opportunity41 is authorized as fallback. Existing45 alternative;39/40 avoided. Approval/activation/provider/financial operations excluded. Publication is conditional on actual verified scope and remaining release gates. Prior concurrence hold is superseded, not an active blocker.

Opening live usage:87% five-hour /26% weekly. Six source fingerprints unchanged. Reused the candidate and prior suites; no repeated synthetic matrix. A temporary external Vite IIFE harness imports the **unchanged candidate client/contract** with its normal DEV eligibility and official API base. It executes in the existing authenticated official built-in homolog tab; canonical auth/session/RBAC and transport are retained. No token export, second transport, published asset replacement or live environment flag change. This is **pre-release candidate-client-to-live-Backend testing**, not published form-click/deployed UI acceptance. Temporary namespace and write-count instrumentation will be removed afterward.

Explicit create draft, locally validated before upload: Equity (matches owner33's existing reference modality), no warranty, public, empty members/extras; segment1 from helper; resource `working_capital`; QA name `SA-BE-001 QA 20261023 A1 — disposable no-warranty`; clearly synthetic descriptive content; maximum BRL1000→100000 centavos, minimum BRL10→1000, warranty0, participation1%. Canonical Company CNPJ is sourced in-browser; no raw identity value is recorded. No prior Opportunity's asset is reused. Normal SUPER_ADMIN/auth GET200 and owner33 scoped/profile-filled helper verified.

| Sequence | Request/result | Persisted identifier / correlation |
| --- | --- | --- |
| 1 DONE | One candidate image upload `POST /opportunities/helpers/images`, HTTP201 | **image1770**, `5fb59edf-118c-4a39-8252-b77bec0a9023` |
| 2 DONE / REJECTED | One create `POST /opportunities`, HTTP422 **`E_MISSING_PROFILE_BANK`** | No Opportunity ID; `d994973b-6933-4aec-9620-2ba8bedc7b68` |
| 3 DONE / GET | Unique QA-name search scoped to WL6 HTTP200, total0/exactMatches0; Opportunity41 detail verified WL6/owner28/Debt/review | Search `aa51c2e7-d8d0-4706-9e32-b25e395f931e` |
| 4 DONE / VERIFIED | One candidate `PATCH /opportunities/41` HTTP200, only `about`; candidate response+GET confirmed, extra independent GET exact value and QA marker match, still review | `29230940-d3a0-46ab-9939-00c60a253613` |
| 5 DONE / VERIFIED | One candidate `POST /opportunities/41/archive` HTTP201; candidate response+GET confirmed, extra independent GET ID41/WL6/owner28/archived; about and exact archive reason preserved | `597f4509-5cd3-4e94-935d-17088a3a278d` |

Banner is a newly generated plain QA-only PNG. No supported automatic file-delete path; retain image1770 as an uploaded QA asset. Final budgets: **upload1/create1(rejected)/PATCH1/archive1/approval0/provider0/financial0**. Actual Core bank-prerequisite rejection (not Company status `not_found`) activated the explicitly authorized Opportunity41 fallback. HTTP422 was a rejection, not a timeout/5xx uncertain outcome; scoped unique-name GET returns no matching new record. About-only PATCH41 and archive41 are now candidate-client-to-live-Backend verified; final state **archived**. No new Opportunity created. Opportunities39/40/45 untouched. No uncertain outcome, retry or extra mutation. **Menu Visibility GET and published read UI reconciliation were subsequently completed and recovered above. Remaining: narrow production activation/release gates, currently blocked by browser initialization.**

## Earlier checkpoint — Whitelabel6 alternative qualification, 2026-10-23 21:40:52 UTC-3 (concurrence condition superseded)

The user explicitly provided disposable reference Opportunity41 (Debt/review/Entrepreneur28, preferred) and Opportunity45 (Equity/review/Entrepreneur33, alternative), plus Opportunities40/finished and39/active as read-only. Product permits **one new** clearly identified no-warranty QA Opportunity using an eligible existing Entrepreneur in WL6 **only after Backend operational concurrence with the shared-tenant exception**. This replaces the earlier requirement to use only a matching disposable tenant, but does **not** waive the Backend QA policy. Existing 39/40/41/45 remain immutable for this new-create smoke. No edit-only smoke is authorized merely by describing 41 as a future alternative.

Reused the same preserved worktree, branch/HEAD and six pinned runtime fingerprints; all match the validated candidate. No implementation change, repeat synthetic matrix, new worktree, commit, push, promotion, deployment or Backend/Core modification. Opening fresh usage **79% five-hour /24% weekly used**, ordinary usage allowed. Existing built-in official homolog browser only; normal SUPER_ADMIN authenticated GET access.

Bounded deliberate requests: **nine authenticated official Nest GETs, all HTTP200**. No raw names, contact details, CPF/CNPJ, bank/Pix values, token or full profile retained.

| Path | Authoritative minimized result | Correlation |
| --- | --- | --- |
| `/auth/me` | SUPER_ADMIN | `68454369-42ca-4188-a0e2-7a2c87dfd5c5` |
| `/whitelabels/6` | ID6 / active / isActive=true | `d6479c26-bb14-4211-8269-0db85d109698` |
| `/entrepreneurs/28/overview` | ID28 / WL6 / personalInformationFilled=true; access=active; email verified; company=null | `b57a8b05-d25e-40e3-916c-a6c0bd491423` |
| `/entrepreneurs/33/overview` | ID33 / WL6 / personalInformationFilled=true; access=active; email verified; Company1 present | `360287e9-d5f8-494e-b307-7377e127c554` |
| `/entrepreneurs/28/company?whitelabelId=6` | `data=null` (authoritative absence, not a failed read) | `a7851b17-6609-4c9a-8150-c4a9f02eac00` |
| `/entrepreneurs/33/company?whitelabelId=6` | Company1 / Entrepreneur33 / WL6; canonical CNPJ and legal name present; validation status=`not_found` | `abf66759-229e-41c0-9746-53593c312bd5` |
| `/opportunities/41` | ID41 / WL6 / Entrepreneur28 / debt / review | `edeeded8-21d6-4360-8a51-29b796e8815b` |
| `/opportunities/45` | ID45 / WL6 / Entrepreneur33 / equity / review | `ef9762db-511f-4ce5-b145-ec7001c6cc02` |
| `/opportunities/helpers/entrepreneurs?whitelabelId=6` | Both28/33 returned in scope, personalInformationFilled=true | `f96ddfe5-f742-4a89-a355-42c7456d28ae` |

**Eligibility distinction:** Entrepreneur28 cannot be qualified for the current canonical-Company create path because Company is absent. The existence of old Opportunity41 does not prove current prerequisites. Entrepreneur33 is the remaining conditional candidate: Company1 and canonical CNPJ exist, but no new rule is inferred from `not_found`. That status alone is not labeled a confirmed create rejection. The delivered Overview/Company read projections expose no address/bank/Pix completeness or values; these prerequisites remain **unproven**, not assumed missing or valid. No Admin JWT/private fallback endpoint was queried to obtain them. Reference Opportunity45 is not evidence of present-time readiness by itself.

The official delivered Backend contract was consulted only for the narrow prerequisite/policy check: active tenant, same-tenant completed personal profile, canonical Company/CNPJ and required Core profile address/bank/Pix fallback. Its QA section prefers disposable `sa-op-smoke-*` tenants and discusses documented shared QA use; neither this text nor HTTP200/RBAC access is treated as the specific Backend concurrence required by the user's latest condition.

### Operational concurrence — NOT received and NOT declined

Looked for an existing authorized communication route without creating a replacement Backend agent or broad investigation:

- Available Codex chat inventory contains no identifiable Backend/Ops conversation; no message was sent to an unrelated chat.
- GitHub connector issue search reports unavailable. Existing authenticated GitHub CLI works; a bounded SA-BE-001 issue search and recent-issues list both return empty.
- Official repository `devLoor1/backend-super-admin-Loor` is **PUBLIC**, issues enabled. No operational eligibility data or exception request was posted publicly, no issue created, no new connection/authentication/infrastructure introduced.

**Concurrence has not been delivered to Backend through a private channel.** A private Backend contact or user-relayed Backend decision is needed. Do not represent a drafted question, source reading, another frontend agent's judgment or Product permission as Backend concurrence.

Exact narrow request prepared for private relay:

> Backend/Ops: Do you concur with the one-off SA-BE-001 homolog exception in Whitelabel6 using existing QA Entrepreneur33 / canonical Company1 for exactly one official Nest banner upload → one clearly identified no-warranty review Opportunity → GET → one descriptive PATCH → GET → archive only that new Opportunity → GET? Please confirm that its current Company status `not_found` and required Core address/bank/Pix fallback prerequisites are eligible for this flow, or identify the precise missing prerequisite. Entrepreneur28 currently has no Company. No changes to existing Opportunities39/40/41/45, no approval/activation, no external provider/financial operations, no account/tenant/Company provisioning, no Backend/Core code/configuration/deployment changes. Operational concurrence only; do not execute the smoke on the frontend's behalf.

Mutation ledger remains **upload0/create0/PATCH0/archive0/approval0/provider0/financial0**. No uploaded asset or new Opportunity ID. No uncertain mutation or cleanup requirement. No existing fixture was changed; no related entity was created/reactivated. Candidate execution/origin still requires normal qualification after concurrence; no publication or browser override was introduced to bypass that prerequisite. The Menu Visibility GET remains a pre-publication check, not claimed recovered here.

**Publication assessment: HOLD pending the specific Backend response and completion of the single conditional live smoke.** This is no longer blocked solely by inactive WL8, and Backend has not declined the exception. Next action: provide a private Backend contact or relay the narrow request/decision; do not repeat synthetic suites or silently choose a different owner/tenant. Source fingerprints, diff check and protected local refs remain unchanged; Backend/Core checkouts remain clean.

## Earlier checkpoint — controlled write smoke preflight, 2026-10-23 21:25:41 UTC-3 (WL6 conditional alternative supersedes target restriction)

User authorized exactly one banner upload → one no-warranty review Opportunity → GET → one safe partial PATCH → GET → archive the same new Opportunity → GET. No approval/activation, provider/financial operations, additional upload/create/PATCH, related-account/tenant mutations, Backend/Core changes or publication. No prerequisite entities may be created. No earlier feature's write authorization is reused.

Reused the existing feature worktree and preserved all 17 intentional uncommitted files. HEAD remains `c935f46d3f3c2318737246cd081960c95aafdafc`; branch `feature/opportunities-write-integration-v1`. All **six runtime fingerprints match** the validated candidate. Diff check passes; no implementation change or redundant full-suite rerun. Local dev/main/handoff refs remain at the preserved values below. Live opening Account 1 usage: **73% five-hour / 24% weekly used**, ordinary usage allowed.

Rediscovered the existing Codex built-in browser tab at the official authorized origin `https://loor-super-admin.netlify.app`. Normal session verified through the official Nest Control Plane. No credentials/tokens copied, exposed or entered; no external Chrome, published asset override, frontend activation, infrastructure change or second API pipeline.

Exactly four deliberate, authenticated **GET-only** preflight requests:

| Request | HTTP | Authoritative result | Correlation |
| --- | --- | --- | --- |
| `/auth/me` | 200 | `SUPER_ADMIN` | `88467f46-f9ed-41e3-bae0-8218f7594e45` |
| `/whitelabels?page=1&perPage=100` | 200 | Complete registry: total7 / lastPage1. Only one tenant matches both approved QA slug and `.example.invalid` origin patterns. | `840b64ca-24eb-4c3c-9324-a8f2bb8a15e1` |
| `/whitelabels/8` | 200 | ID8, slug `sa-op-smoke-20261020-a1-c8170b06`, `status=inactive`, `isActive=false` | `e859afcb-5c73-45ed-b874-9f4c6df1451a` |
| `/opportunities/helpers/entrepreneurs?whitelabelId=8` | 200 | `data=[]`, count0. No same-tenant Entrepreneur to qualify. | `a4c4b51a-8967-4605-bcf5-10679a22d76e` |

Tenant8 is `SA Operational Smoke 20261020 Renamed`, baseURL `https://sa-op-smoke-20261020.example.invalid`; existing `docs/whitelabel-lifecycle-v1.md` identifies it as a disposable lifecycle fixture intended to end inactive. That historical lifecycle authorization is **not** reused to activate it here. Other registry tenants do not match this smoke pattern, and no equivalent target has been explicitly designated for this current Opportunity test. Shared Finapop/Loor tenants and their historical QA identities are not silently substituted.

**Exact blocker:** no currently eligible disposable QA tenant/Entrepreneur pair. The matching tenant is inactive (the validated create UI/preflight requires active), and its official Entrepreneur helper is empty. Therefore Core personal-profile/Company/address/bank/Pix prerequisites cannot be verified for an owner in that tenant. No account/Company provisioning or tenant activation was attempted.

Mutation ledger for this authorization:

- Banner upload: **0**; uploaded asset ID: **NONE**.
- Opportunity create: **0**; created Opportunity ID: **NONE**.
- Partial PATCH: **0**.
- Archive: **0**.
- Approval/activation/provider provisioning/financial operations: **0**.
- No uncertain mutation outcome or orphan asset exists from this continuation. No existing Opportunity was modified. Nothing needs archive recovery.

No live persistence acceptance is granted: create/edit/archive remain synthetic-validated, **not live-verified**. Source-documented archive recovery remains unchanged; runtime archive cannot be tested without the new authorized Opportunity. The candidate itself is not published or loaded through an override. Its real UI execution/origin path still needs qualification once the fixture prerequisite is satisfied; normal authenticated GETs from the existing official origin do not prove candidate write E2E.

Stopped browser smoke progression at the missing fixture as instructed. The previously timed-out Menu Visibility GET is still a pre-publication check, not claimed completed by this preflight. No Menu Visibility read/write was added after discovering the blocker. Existing 23-ID source/clients/preferences were not changed. Temporary minimized preflight metadata was removed from the browser; the official session is preserved for handoff.

**Publication recommendation: HOLD write-enabled publication.** Next action is explicit designation of an **existing active disposable QA tenant with an eligible same-tenant Entrepreneur and verifiable Core prerequisites**, or separate authority for prerequisite preparation outside this smoke. Current authorization does not permit creating/reactivating those prerequisites. Preserve the candidate and completed quality evidence; do not restart implementation or spend the upload/create/PATCH allowance on another target without qualification. No commit, push, promotion or deployment in this continuation.

## Gate A recovery — 2026-10-23 Account 1

Started 20:29:55 UTC-3. Live opening usage 23% five-hour/16% weekly, ordinary usage allowed. Reused the existing isolated worktree and preserved untracked checkpoint; no previous runtime implementation existed. Safely fast-forwarded this feature branch from b1dc5f1 to approved/live frontend **c935f46d3f3c2318737246cd081960c95aafdafc**, retaining the checkpoint. Canonical dev, main, handoff and unrelated worktrees unchanged.

Official delivered reference read completely: CP `origin/dev@86aa3663915f38903f6ceb2a17b8d48a554ede4f`, `docs/sa-be-001-opportunities-write-contract-v1.md`. Updated controller/service and Core editable-detail projection inspected read-only. No Backend/Core file/checkout/deployment changes; deployed binary SHA is not established by source inspection or Backend-team smoke.

Authenticated official built-in browser, GET only:

| Path | HTTP | Minimized evidence / correlation |
| --- | --- | --- |
| `/auth/me` |200| SUPER_ADMIN /`02dc3c68-4303-4bfb-8058-32b03eae5646` |
| `/opportunities/helpers/segments?whitelabelId=6` |200|1 row, ID/name/tenant6 /`95040835-f8e5-4ea4-a1ee-4c7eb706ddae`|
| `/opportunities/helpers/resource-utilizations?whitelabelId=6` |200|3 rows, ID/code/name/tenant6 /`db1a1555-58ff-4192-9466-c41081dd879e`|
| `/opportunities/helpers/entrepreneurs?whitelabelId=6` |200|16 rows, matching tenant, profile-filled boolean /`67e8e5e8-1ceb-442e-bcce-6ae3ae10c022`|
| `/opportunities/helpers/contracts?whitelabelId=6` |200|21 rows, matching tenant /`fe593bc2-93f8-4ca6-9017-76a215f061b9`|
| `/opportunities/helpers/investor-profiles?whitelabelId=6` |200|5 rows, matching tenant /`1ba25d6c-1ebe-4c67-bfb8-9e26ca6804fe`|
| `/opportunities?whitelabelId=6&status=review&page=1&perPage=1` |200| Existing review record used only to choose a schema sample |
| `/opportunities/45` |200|ID45/tenant6/review; editable image, taxonomy, private flag, CPF/CNPJ, video/WhatsApp aliases present /`5792bed2-8c6f-4ab4-bddb-75831035fcef`|

**Opportunity45 and all helper records are read-only samples, NOT authorized QA mutation targets.** No helper email, raw identity value, complete record or provider secret is retained here. The image POST contract is source/document-qualified only; **no live upload was attempted**. All previous missing catalog/image/editable-readback gaps are resolved for frontend implementation. Contract helper still does not assert unused-file eligibility; documented Backend approval checks and external recovery limits remain displayed, not reopened as a Gate A block.

Creation monetary convention is aligned with the existing authoritative Admin-parity boundary in `admin-canvas/src/components/admin/opportunityCreationUx.ts` and its create mapper: BRL input → integer centavos exactly once. The candidate rejects ambiguous/grouped/excess-precision input; does not round or modify profitability semantics. Optional monetary/readback gaps are not filled from projections.

Current local candidate adds helper/detail allow-lists, create/partial PATCH/approval/reason builders, official multipart image transport via the existing API/session pipeline, preflight/scoped readbacks, attempt locks and explicit GET-only recovery. Production form eligibility remains unchanged/unavailable and transport fails closed outside DEV. No new readiness/authorization flag, Admin JWT pipeline, or live-write activation. Existing read detail/list remain untouched. Only the qualified no-warranty create variant is exposed; members are empty, optional extras0–3, address/bank/Pix fallback belongs to Core. No warranties/catalog IDs or financial values are fabricated.

Initial focused synthetic suite 67 checks passed before final refinements. Final validation completed below. Local code/checkpoint remain uncommitted. Real approval is excluded from the recommended initial smoke and requires separate provider/Ops authority. No real business/provider/financial mutation.

## Frontend candidate and browser evidence — current continuation

Candidate: `feature/opportunities-write-integration-v1`, HEAD `c935f46d3f3c2318737246cd081960c95aafdafc` **plus the uncommitted scoped diff**. There is no new implementation commit or release. Runtime fingerprints are pinned in `scripts/reviewed-opportunity-write-boundary.mjs`; these pins are narrow historical-boundary adaptations, not a directory exemption or business-write authorization.

Runtime files:

- `src/features/operation/opportunities/write/opportunityWriteContract.ts`: scope/alias/privacy projection; helper choices; exact BRL-centavos/create, status-dependent changed-only PATCH, approval and reason builders; JPG/PNG/20 MiB validation.
- `src/features/operation/opportunities/write/opportunityWriteClient.ts`: canonical transport/session/RBAC, fresh preflight, one-attempt locks, immediate returned-ID capture, success-status checks, response plus independent GET reconciliation, explicit GET recovery. No automatic mutation retry. Scope cancellation prevents late writes after leaving a preflight; abort after dispatch remains uncertain, never treated as non-persistence.
- `src/features/operation/opportunities/write/OpportunityWritePage.tsx` and `OpportunityWrite.module.css`: local DEV-only helper-backed create/edit workbench, native dialogs, unsaved/tenant guard, upload receipts, review-only deny/archive and approval preparation. Existing read UI is not replaced. The rehydrated status is rendered from the current editor record, not stale initial context.
- `src/features/operation/opportunities/OpportunityFormPage.tsx`: exact DEV-only integration; production unavailable fallback retained.
- `src/lib/api.ts`: only FormData handling added to the existing transport. Browser supplies multipart boundary; JSON/GET/auth/correlation/timeout semantics otherwise retained. `authenticatedGet` remains GET-only. No second API pipeline.

Maintained coverage: new `scripts/check-opportunity-write.mjs`; new exact boundary helper; focused historical guard adaptations in `check-account-access.mjs`, `check-audit-advanced-filters.mjs`, `check-homolog-readiness.mjs`, `check-menu-visibility.mjs`, `check-opportunities-companies-read.mjs`, `check-overview-360.mjs`, `check-whitelabel-crud.mjs` and `reviewed-360-boundary.mjs`. The exact multipart normalizer is compared with the accepted transport byte-for-byte; unknown paths and changed pinned bytes still fail. No canonical policy, routing, auth/session, menu registry, flags, dependencies or other business domain changed.

### Synthetic browser transport, not live E2E

External QA artifacts: `C:/Users/User/.codex/visualizations/2026/08/28/01a047eb-4949-7663-bff7-5b0686497ccf/opportunities-write-2026-10-23/`.

Built-in browser only. Local Vite DEV at loopback 4406 uses a loopback-only fake API at 4405, which never proxies live requests. Production-built local UI at 4407 uses the same synthetic API; its external harness substitutes only the API base and synthetic session while serving the actual production-compiled guards. This is **local production-semantics QA, not official deployed UI-to-live-Backend E2E**. No source auth bypass, real token, live upload or fixture is introduced. External QA files are not imported by runtime source and remain outside the repo.

Observed browser results:

- Create form hydrates synthetic tenant 400, owner 500, segment ID 20 and resource code `working_capital`. All source choices are explicit; no financial defaults. Debt is separate from Equity; Capital de Giro is a resource use, not modality.
- Oversized image rejected locally before upload; corrected feedback no longer describes local validation as a Backend refusal. Normal PNG selection, review, Cancel default focus, Tab, Escape and return to opener work.
- Exactly **one synthetic image POST 201 → image 8101**, then **one synthetic create POST 201 → Opportunity 9101/review**, followed by independent GET. Synthetic payload: BRL `1000,00` → max_goal 100000 centavos, `10.00` → min 1000; Debt profitability 1.5/monthly/12 installments; no Equity, bank, address, private allow-list or implicit grace fields. This proves request mapping, not live financial persistence.
- Independent edit entry reconstructed the created record. Browser Back opened the unsaved-change dialog; continuing kept the draft. Exactly one PATCH 200 body `{name: "Synthetic reviewed name"}`; untouched fields omitted; response plus GET confirmed and rehydrated the form.
- Approval preparation lists tenant contract/profile choices, requires explicit provider-effects acknowledgment, displays eligibility/idempotency/orphan warnings and is canceled without sending approval. No provider credential field exists in this candidate.
- Short archive reason blocked locally inside the dialog. One subsequent valid **synthetic archive POST 201 → GET → archived**; edit/lifecycle controls removed. No fake denied state or restore action.
- Active synthetic record 9002: no editable responsible CPF/SPE and no review lifecycle buttons. Authenticated synthetic HTTP 403: truthful denied state, no record substituted.
- Separate synthetic PATCH on 9001 returned post-commit HTTP 500: independent GET matched; UI reported `readback_matches`, retained the uncertainty warning and disabled resubmission. Never labeled response accepted or retried automatically.
- DEV create captures at **1672, 1440, 900, 390, 320 px**: no horizontal document/field overflow. Mobile approval dialog is native modal, 288 px wide, bounded to 868 px in a 320×900 viewport with scrollable body. Reduced-motion media tested. Forced no-WebGL on the local production read frame remained readable; the temporary canvas simulation was removed by reload.
- Production-built direct create **and** edit: unavailable at all five widths; zero candidate form inputs. Existing Opportunity detail still renders GET-backed data, null/unavailable dates and read-only disclosure. Console clean in the final production run. Initial local harness base-URL configuration mismatch was corrected externally before the final run; not a frontend auth/Backend defect.

Exact **synthetic-only** mutation ledger: image POST 201; create POST 201; PATCH 9101/200; archive 9101/201; uncertainty PATCH 9001/500. Persisted externally as `synthetic-browser-ledger.json`. These IDs do not name live records. **Live business/financial/provider writes/uploads: ZERO.** No approval POST in browser QA (approval client is synthetic-unit-tested only).

Captures: `dev-create-{1672,1440,900,390,320}.png`, `synthetic-create-confirmed.png`, `approval-preparation-320.png`, `production-edit-unavailable-320.png`. Initial screenshot clipping during scrolled mobile dialog emulation was a capture-coordinate issue; DOM geometry/modal containment were inspected independently. No layout/CSS change was made to the approved shared dialog to work around it.

### Preserved boundaries and remaining limits

- Production eligibility and client transport both remain fail-closed for these commands. No new flag or live CRUD activation. Current official publication remains Settings Read V1/c935f46, not this candidate.
- All 23 Menu Visibility IDs/clients/policy remain byte-identical; no preference PUT. Prior accepted configuration was v5/23 with sorted-entry hash `fb7910fbb9e0e3baeb6016151cdadcdce0d40723d10331a74e44b9394df5b7fe`. A final fresh official GET hit **`Timed out running CDP command "Runtime.evaluate" for tab 1`**; HTTP result/version/hash were not recovered and are not claimed freshly verified. Official authenticated shell remained open. This is limited readback/tooling evidence, not proof of Backend failure or preference drift.
- Attempt locks are in-memory for the current module/session. They are **not** durable idempotency or atomic concurrency. Reload/interruption is not permission to repeat a write: retain IDs/correlation in the checkpoint and GET first. No automatic search-based claim that an ambiguous create did not persist.
- Unknown image result has no authoritative helper recovery/delete path in the delivered contract: stop and reconcile with Ops; no blind upload retry. Confirmed uploaded IDs are reused after a later rejection; image-attempt keys are reset only after an explicitly confirmed command and deliberate next-command preparation. No automatic orphan deletion.
- Current detail confirms editable presentation/status/identity, not full monetary, contract, Debt/provider lineage. Approval status active alone is insufficient to certify provider completion. Contract helper membership does not prove unused-file eligibility.
- Qualified create UI intentionally supports **no warranty, empty members**, optional 0–3 extra images and Core-owned profile/address/bank/Pix fallback. Warranty/member-entry variants are not claimed implemented. No invented catalog, Product rule, identity autofill or financial defaults.

### Smallest subsequent authorized live smoke — NOT authorized yet

1. Separately designate one disposable owner and tenant whose Company/profile/address/bank/Pix prerequisites are verified. GET samples 45/50 and protected Opportunity 49 are **not** implied mutation targets. No extra account/company creation.
2. Review this exact candidate and authorize temporary controlled write-enabled acceptance separately; the current production build deliberately cannot submit. Do not promote/activate automatically.
3. One valid banner upload; record returned image ID immediately. One no-warranty Opportunity create to review; record returned Opportunity ID immediately, then GET identity, tenant, status and exposed editable fields. Financial values must not be claimed independently read back from this DTO.
4. One small partial PATCH plus GET/re-entry. One archive with explicit reason≥20 characters plus GET archived is the recovery/cleanup path; archive is not file/record deletion. Retain any uploaded image ID; no unsupported delete.
5. Ambiguous response: reconcile GET by known ID before any decision. Unknown create ID or upload result: stop for bounded authoritative investigation/Ops; no automatic retry. No real provider approval, Investment, payment, Pix, Debt lifecycle, refund, payout or cashout in this smoke.

Separate real approval would need explicit provider-side authorization and an operational recovery/orphan plan. No additional Backend question is necessary merely to continue the already documented frontend integration.

## Final validation and preserved state

Completed 2026-10-23, approximately 21:16 UTC-3 (2026-10-24 00:16 UTC). Latest live usage: **71% five-hour / 23% weekly used**, ordinary usage allowed; this is a fresh Account 1 reading, not inherited allowance.

- **TypeScript PASS; oxlint PASS; production Vite build PASS; git diff --check PASS.** Existing >500 kB chunk advisory remains. Production outputs: `index-DWYuPzf0.js`, `index-BordYXih.css`.
- **All 30 maintained suites PASS**, full run reported **3,977 checks / zero failures**. A subsequent test-only expansion of the same unchanged runtime candidate raised the focused write suite **70 → 78 PASS**, explicitly adding write 401/404, helper GET 401/403/404/422, unknown-ID create locking and local-vs-Backend validation wording. The other 29 suite results are reused, not needlessly repeated. Thus the current maintained test set accounts for **3,985 passing checks**, not a second full-run claim.
- The ambiguous-create test initially collided with an earlier confirmed synthetic owner key (intentional module lock); corrected the test fixture to a distinct synthetic owner, not the runtime locking behavior. No real request or code fallback was introduced.
- Local DEV and production-semantics browser results above PASS. Production local ledger contains **8 GETs / zero writes** (`production-browser-ledger.json`); browser overrides/emulation and local tabs were removed, agent-started DEV/fake servers stopped. Only the existing official authenticated Dashboard tab remains, preserved for handoff. No published asset override was used.
- Final exact scoped diff: **17 intentional files** = six runtime files listed above, ten maintained-test/boundary files, this checkpoint. No dependencies, runtime fixtures, auth bypass, environment/Netlify config, Menu Visibility or readiness-policy changes.

Fresh final frontend fetch confirmed local and remote:

| Ref | SHA |
| --- | --- |
| feature/opportunities-write-integration-v1 HEAD | `c935f46d3f3c2318737246cd081960c95aafdafc` + uncommitted candidate |
| dev / origin/dev | `c935f46d3f3c2318737246cd081960c95aafdafc` |
| main / origin/main | `c2235ac5d0d65408e9d39bf836a1a717da3d95ae` |
| docs/backend-handoff-v1 / origin counterpart | `89a3b5058f52f981b3a1b06756d7f33a2a043f27` |

Canonical frontend worktree clean. Backend CP/Core checkouts clean and unchanged. Protected checkpoint SHA-256:

- SA-BE-002 `whitelabel-admin-lifecycle-v1.md`: `c957ecebcfa123024d8edfbf6b3d43ef68711ba608826636642794ce17e29b3b` (unchanged).
- SA-BE-003A `sa-be-003a-release-evidence.md`: `fe772b53944faee88a00566df068ac805b1449c9a9c288d7ca3a3594e875fe8a` (unchanged; owner-attested acceptance remains owner-attested).
- Settings Read `release-evidence.md`: `bcc0e32fe5cd7d5a96253e39a617124ccfb447f560de396c814795d1b5b4579a` (preserved).

**Next unfinished action:** review/authorize this exact local candidate and explicitly designate the minimal disposable live-write smoke target and controlled activation path. Do not restart implementation or run live commands from this checkpoint. No implementation commit, staging, push, promotion or publication was made. No **live** approval, upload or business/financial mutation was made; synthetic loopback-only actions are separately itemized above.

---

## Historical pre-delivery Gate A checkpoint (superseded, preserved)

## Recovery and immutable baseline

- Frontend canonical local `dev` and freshly fetched `origin/dev`: `b1dc5f1b6b5f52fe83737790609441af730b463c`; clean before this task. Existing 15 additional frontend worktrees preserved.
- Isolated worktree: `C:/Users/User/Desktop/Loor/worktrees/super-admin-opportunities-write-integration-v1`; branch `feature/opportunities-write-integration-v1`, starting at that exact approved SHA. This new checkpoint is the only intentional tracked-content addition; no runtime files changed.
- Protected local/remote `main`: `c2235ac5d0d65408e9d39bf836a1a717da3d95ae`; local/remote handoff: `89a3b5058f52f981b3a1b06756d7f33a2a043f27`.
- Freshly fetched Control Plane (CP) `origin/dev`: `73ccb918ae4e22be1e16d3ab6ab12a215d3f2916`. Existing Backend worktree remains clean at `9513cb3b714348ecb98f0b02e1663918d113b9a8`.
- Freshly fetched Core `origin/dev`: `efb224dcbb76779319f76f14b89b27ca2bac81f9`. Existing Core checkout remains clean at `fe054bb8ff1d8f431f9b78afbc6a415d0d729baa`.
- Source inspection used `git show origin/dev:<path>` and the remote tree, not stale Backend/Core checked-out source. No Backend/Core file changes.
- Root `AGENTS.md` and normative `docs/homolog-readiness-policy.md` read. Existing historical regression boundaries inspected; none weakened. No readiness eligibility or Menu Visibility change.
- Execution started `2026-10-23 10:54:32 UTC`. Live opening usage: five-hour **32% used**, weekly **32% used**; not a historical allowance carried forward.

## Evidence classes and bounded live verification

**Source** below means the exact inspected commits, not proof of the binaries running in homolog. **Live** means authenticated GET in the existing Codex built-in browser at the official frontend `https://loor-super-admin.netlify.app`, API `https://backend-super-admin-loor.onrender.com/api`. No external Chrome, token export, credentials entry or login request. Existing authenticated shell was rediscovered and `/auth/me` returned 200 with `SUPER_ADMIN`.

| Live GET | HTTP | Minimized observation |
| --- | --- | --- |
| `/auth/me` | 200 | Canonical operator shape; `roles=[SUPER_ADMIN]` |
| `/whitelabels` | 200 | `{data,meta}`, seven rows; no target selected or authorized by this read |
| `/opportunities?page=1&perPage=3` | 200 | `{data,meta}`, three rows; current real read contract present |
| `/opportunities/helpers/entrepreneurs?whitelabelId=6` | 200 | `{data}`, 16 rows; each reports Whitelabel 6; keys `id,fullName,email,whitelabelId,personalInformationFilled` |
| `/opportunities/helpers/contracts?whitelabelId=6` | 200 | `{data}`, 21 rows; each reports Whitelabel 6; keys `id,name,whitelabelId` |
| `/opportunities/helpers/investor-profiles?whitelabelId=6` | 200 | `{data}`, five rows; keys `id,title,description,minPoints,maxPoints,whitelabelId`; source says profiles global, tenant required for access |
| `/opportunities/50` | 200 | Read-only schema sample: ID 50, Whitelabel 4, Entrepreneur 36, `finished`, `debt`; **not a QA write target** |
| `/docs-json` | 200 | Live OpenAPI advertises all five writes and three helpers, but no request-body schemas for these commands and no image/upload/segment/resource-utilization paths |
| `/homolog/menu-visibility` | 200 | Version **5**, exactly **23** entries; sorted-map SHA-256 `fb7910fbb9e0e3baeb6016151cdadcdce0d40723d10331a74e44b9394df5b7fe`, matching accepted prior evidence |

Nine deliberate GETs; zero live POST/PATCH/PUT/DELETE by this task. These reads establish current contracts, **not deployed write behavior or Backend release SHA**. No raw helper emails, legal identifiers, tokens, secrets or full records retained in this document.

The exact live Opportunity detail keys were:

`id, whitelabelId, entrepreneurId, name, businessName, modality, status, fundraisingCompletion, isPrivate, segment, resourceUse, dueAt, openedAt, endedAt, createdAt, updatedAt, description, about, quotaQuantity, reasonForArchiving`.

## Authoritative command contract recovered

### Source references

CP: `src/modules/opportunity/opportunity.controller.ts`, `opportunity.service.ts`, `src/integrations/loor-core/loor-core.client.ts`, `src/main.ts`, `docs/sa-be-specs-status-v1.md`.

Core: `app/Controllers/Http/Internal/SuperAdmin/OpportunityController.ts`, `app/Services/Internal/SuperAdmin/{OpportunityCommandService,OpportunityQueryService}.ts`, `app/Validators/Admin/{Opportunity/StoreRequestValidator,ApproveValidator,ArchiveValidator}.ts`, `app/Validators/Entrepreneur/Opportunity/UpdateValidator.ts`, `app/Helpers/OpportunityEditableFieldsHelper.ts`, `app/Services/Opportunity/{CreateService,OpportunityTaxonomyService}.ts`, `app/Services/Admin/Opportunity/ApproveService.ts`, `app/Services/Entrepreneur/CompanyInformationService.ts`, `app/Services/Whitelabel/WhitelabelModalityPolicy.ts`. Core Admin create regression source inspected, not executed.

### Transport, RBAC and responses

- CP reads/helpers: `SUPER_ADMIN`, `SUPPORT_ADMIN`, `READ_ONLY`; all writes `SUPER_ADMIN` only. This session proves only SUPER_ADMIN live access; no role impersonation performed.
- CP forwards authenticated commands to Core, then returns Core body unchanged. New write path must stay dedicated; do not generalize `authenticatedGet`.
- **Important HTTP distinction:** live OpenAPI advertises **201 for all CP POSTs** (create, approve, deny, archive), **200 for PATCH**, and 200 for GET. Core controller itself returns 201 for create and 200 for other commands. Do not incorrectly require 200 for CP review POSTs. No write HTTP behavior was exercised here.
- Core successful bodies `{data: detail}`; CP doesn't add an extra `data`. Core create may produce a null detail if readback fails; future client must validate identity and shape, not infer success.
- CP rejects missing create scope/owner at 400 `E_VALIDATION`, invalid numeric path/helper scope at 400. Core requires active WL, matching owner, filled personal profile and canonical Company. Core business/validation failures typically 422; missing/ineligible review target 404. CP preserves most 4xx, maps Core auth and 5xx/transport failures to 502. CP validation error sanitization retains only safe `code/message/error`, not a guaranteed field-error bag.
- Correlation header and canonical session/version/401 behavior must be reused; no retries. Timeout, 5xx, invalid-success body or session replacement after dispatch cannot prove non-commit. Mutation retry must remain blocked until reconciliation; create needs a reliable identity recovery strategy, not resubmission based on an empty search.
- Audit is **best effort**, separate from persistence: `CREATE_OPPORTUNITY`, `UPDATE_OPPORTUNITY`, `APPROVE_OPPORTUNITY`, `DENY_OPPORTUNITY`, `ARCHIVE_OPPORTUNITY`. Do not repeat a command because Audit is missing.
- No optimistic concurrency token or atomic version check identified for Opportunity writes. `updatedAt` is not an `If-Match` contract.

### Create — required structure and side effects

`POST /opportunities`: explicit `whitelabelId`, `entrepreneurId`, plus Admin create payload. Core aliases owner to `entrepreneur_id`, validates, then checks tenant membership and active WL. Owner personal profile must be filled; canonical Company CNPJ required. If `company_cnpj` is supplied, it must match canonical Company; omission delegates canonical application to Core.

Required root fields: `is_private` boolean, `modality` (`equity|debt`), `warranty` boolean, `members` array, `monetary` object, `opportunity` object, `extra_images` array (0–3 integer IDs). Members can be empty; each supplied member requires existing `image_id`, `description`, `name` (≤256).

`monetary`: `max_goal` and `min_investment_value` numeric 100–99,999,999,999; `warranty_amount` numeric 0–99,999,999,999. Core stores values directly and derives quota quantity by floor(max/min). The validator does not enforce integer cent precision; do not change business rounding. Exact create UI BRL serialization still requires qualification against the Admin monetary convention before implementing it; no amount was serialized in this task.

`opportunity`: existing `image_id`, existing tenant/nondeleted `segment_id`, `about`, `description`, `name` and `business_name` (≤256), valid `cpf`, unique valid `spe_cnpj`, tenant `resource_utilization` code (trimmed ≤64), **required nullable** `promotional_video_url` (YouTube rule), optional canonical `company_cnpj`.

- Equity requires `equity.participation` numeric 0–99.9999. Finapop/`finapop-*` slugs reject new Equity (`E_FINAPOP_EQUITY_NOT_ALLOWED`); historical Equity remains readable.
- Debt requires `percentage_profitability` 0–100; `payment_frequency` one of `mensal,bimestral,trimestral,semestral,anual,unica`; `total_installments` 1–600. Optional basis `annual|monthly` (service defaults monthly), optional boolean `single_installment`, legacy grace 0–1200 integer months or structured nonnegative integer `{years,months,days}` (no business maximum on structured duration), optional/nullable `payment_start_at` `yyyy-MM-dd`.
- Optional address requires valid country ID and all street/city/state/number/district/ZIP fields; only complement nullable/optional. Optional bank object requires existing bank ID, agency/account/digit validators. Optional Pix resolves through Entrepreneur Pix rules and matching authoritative profile; missing address/bank/Pix is resolved from owner profile or rejected with `E_MISSING_PROFILE_*` / `E_PIX_TYPE_MISMATCH`. Do not fabricate profile completeness from `personalInformationFilled` alone.
- `warranties` nullable/optional but required when warranty true; existing warranty IDs. Private offers require `allowed_cpfs` array under conditional rule; do not infer access from public mode.
- Expected initial state `review`; creates persistent Opportunity, monetary, bank/Pix/address copies, Debt draft or Equity data, members/extra images, warranty/private allowlist relations; activates selected image. No approval/provider provisioning at create. Archive is not cleanup/deletion.

### PATCH — state matrix

| State | Core Admin allowlist |
| --- | --- |
| `review` | `about,promotional_video_url,description,name,business_name,resource_utilization,whatsapp_group,image_id,company_cnpj,spe_cnpj,cpf,segment_id,is_private` |
| `active` | Above **except `spe_cnpj,cpf`** |
| `finished`, `archived` | Nonempty edits rejected |

`name/business_name` max255 on PATCH (not create's 256). `resource_utilization` trimmed max64; image/segment must exist; scope/taxonomy rules remain authoritative. Only `promotional_video_url` and `whatsapp_group` explicitly allow null. Company CNPJ is confirmation-only; not a new competing source. `spe_cnpj/cpf` PATCH validator supplies length checks, not the create validator's full checksum/uniqueness contract. Do not silently reinterpret this asymmetry.

Nested monetary/address/bank/debt/Equity and identity/lifecycle changes are outside this PATCH. Owner, tenant, modality, ID and status cannot be edited. A frontend must reject unknown keys even where validator stripping could turn them into an empty no-op.

Losslessly readable edit subset today: `name,business_name,description,about,is_private`, plus existing segment/resource values. **This is not a claim that all editing is Backend-blocked.** Other allowed values cannot be reconstructed: `image_id,company_cnpj,spe_cnpj,cpf,promotional_video_url,whatsapp_group` are absent from current detail. Segment/resource alternatives require authoritative catalogs rather than treating historical/deleted row labels as current options. No defaults may replace omitted fields.

### Review actions

- Approve only `review`; required existing `contract_id`; optional existing `investor_profile_id`, fee0–99, date-only `opened_at/due_at` (due strictly after open), grace override with at least one positive component (Debt), penalties and complete optional Cashin/Cashout credential groups. **No credential UI or values added by this task.**
- Contract must belong to target tenant and its file must not already have an Opportunity Document. Current helper lists tenant Contracts without proving file availability/eligibility.
- Approval can call external providers **before** the DB transaction: Crenor supplied/env/minted credentials and Pix webhook, or BCodex EC/webhook path. Then Contract document linkage, quotas, active status/date/provider, frozen fee, optional grace/penalties and Debt `approved` are persisted. A transaction rollback does not establish that no external side effect happened. Omitted credentials do not mean no provider effects.
- Approve readback lacks Contract linkage, provider, monetary/fee, Debt state and credential-safe configuration metadata. Seeing `active` alone cannot prove these outcomes. Do not fabricate approval eligibility or verification from current helper/summary data.
- Deny and archive **both require `review`** and `reason` string min20; no max specified in validator. Both persist `archived`, reason and `endedAt=now`. There is no persistent `denied` status. CP audit intention distinguishes deny from archive. Their state/reason readback is available today; these operations are independently contract-qualified, not blocked by missing create catalogs.

## Gate A gaps and scope decision

1. **Create related-entity acquisition/qualification:** mandatory image and tenant segment/resource-use choices have no catalog/image-upload or eligibility GET in the inspected CP controller inventory or live OpenAPI. The three delivered helpers do not provide them. Existing Opportunity labels are not proof of a current/selectable/nondeleted catalog entry; image IDs must not be guessed or reused without authority. Optional address/bank/warranty entry has the same catalog issue if exposed. Need an existing supported CP path/contract or a scoped Backend delivery; do not borrow a different application's actor auth/API.
2. **Lossless full edit:** detail omits the fields listed above. A deliberately reduced edit scope is technically possible, but does not silently substitute for the requested complete atomic create/edit/review delivery.
3. **Approval qualification/readback:** helper has no unused-file flag; detail lacks linkage and provider/debt results. Need supported safe eligibility/readback evidence before claiming the requested approval cycle. No speculative approval to discover prerequisites, no provider test-charge, no credentials in logs.
4. **Live QA authority:** no target-specific authorization exists for the newly requested CP Opportunity command batch. Helper tenant6 and detail50 were **read-only samples**, not approved targets. No owner/Opportunity/Contract selected for mutation, no new related entities created. Prior historical Finapop authorizations must not be recycled across this CP batch.

**Decision:** preserve the atomic release boundary and stop before implementing guessed create fields or publishing a partial write UI. The independently known PATCH subset and deny/archive contracts are recorded for reuse; this checkpoint does not label them Backend-absent. A narrower delivery would require an explicit scope decision, not an unannounced reduction of the accepted complete feature. All existing read functionality remains untouched. The production readiness blocks for `operation-opportunity-new/edit` remain intact; no incomplete review buttons exposed.

## Next exact transition / resume instructions

1. Resolve Gate A only: identify supported authoritative image and active tenant taxonomy acquisition; clarify lossless detail/readback fields and Contract eligibility/approval outcomes. Backend/Core remain read-only here. Do not repeat source audits already captured unless refs/contracts change.
2. Resume genuine form/write-client implementation in this existing feature worktree after those contracts are qualified; reuse shared transport/session/dialog/unsaved-navigation components. No new flags or generic mutation client.
3. Synthetic contract/security/uncertain-write tests and production-built browser QA are still **not performed for a new write candidate**, because none was implemented. Do not count unchanged baseline checks as new write evidence.
4. Before any live POST/PATCH, present an exact plan and obtain explicit selected-target authority: tenant, owner, separate disposable Opportunity targets, scoped helper relations/unused Contract, transition, public/provider consequences, audit intention, indefinite retention and uncertain-result GET recovery. No account/tenant/Contract creation workaround.
5. Do not commit/promote/push/deploy a checkpoint-only or partial write release. Gates B–F remain pending, even if preserved baseline regressions pass.

## Validation and final evidence

Fresh checks against the unchanged approved canonical baseline: Opportunities/Companies Read **115 passed**; permanent homolog readiness **100 passed** (actual rendered DEV/production semantics); TypeScript passed; oxlint passed; production build passed; `git diff --check` passed. The existing >500 kB bundle advisory remains, with no new runtime changes. Baseline output remains `index-DZ9WE-OR.js` / `index-LEboSl9A.css` under the local build environment. This is not a new deployed bundle or a release of this checkpoint.

The complete 27-suite/3,811-check historical release evidence remains in the accepted Operators checkpoint. It was not unnecessarily rerun: no new runtime candidate exists, and no release is being attempted. New write-specific synthetic suites, create/edit/review responsive QA, accessibility checks, live persistence and post-publication smoke are **pending**, not passed by inference.

Usage rechecked live at `2026-10-23 11:05:46 UTC`: five-hour **44% used**, weekly **34% used**, ordinary usage allowed. Contract/verification gaps, not allowance exhaustion or browser availability, are the blocker.

No new feature commit; isolated feature HEAD remains `b1dc5f1b6b5f52fe83737790609441af730b463c`, with only this checkpoint uncommitted. No staging, promotion, push, deployment, provider call, financial operation or related-entity mutation. No live QA target authorization requested before its prerequisites are known.

Final fresh fetch/status at `2026-10-23 11:06:38 UTC`: canonical `dev/origin/dev`, `main/origin/main` and handoff local/remote remain at the exact SHAs above; canonical frontend and both inspected Backend/Core worktrees clean. Isolated branch contains only the untracked checkpoint; tracked diff empty; tracked and new-document whitespace checks passed. Built-in authenticated homolog tab preserved for handoff. Execution through final verification: **12 minutes 6 seconds** (`10:54:32–11:06:38 UTC`).
