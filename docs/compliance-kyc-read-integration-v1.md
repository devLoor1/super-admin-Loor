# Compliance KYC Read V1 — execution checkpoint

2026-10-22. Feature `feature/sa-be-integration-map-kyc-read-v1`, baseline `6969a89d545f31edc84eaf95a013e1d8d99cd6e6`. Eight-capability map: [integration map](sa-be-001-008-fe-integration-map-v1.md).

## Authoritative contract gate — passed

Existing built-in homolog session: GET `/api/auth/me` 200 SUPER_ADMIN. GET `/api/compliance/kyc?page=1&perPage=20` 200, `{data,meta}`: page1/perPage20/total1547/lastPage78. Actual returned case 1547: GET `/api/compliance/kyc/1547` 200, `{data}` and matching ID. No personal payload exported. Correlations are in the integration map.

CP source `73ccb918ae4e22be1e16d3ab6ab12a215d3f2916`; Core source `9e26c7c7e68ca42c5aebc6188d3cc73005dbf362`. Health does not expose a release SHA; exact deployed Backend/Core hashes remain unproven. These GETs independently prove the necessary deployed behavior.

- Case = numeric FaceMatch ID. Population = FaceMatch-backed Investor cases, not all KYC, not Entrepreneurs. A misleading source comment mentions `bureau:` fallback, but neither list nor detail implements it.
- List fields: id/status/investorId/investorName/whitelabelId/faceMatchStatus/updatedAt. No account ID, participant type enum, tenant name, pending-issue count or global status counts. `meta.total` is the count of this case population only.
- Only page/perPage (1–100) qualified for V1. No local page-only search/status/tenant filtering, sorting or global status summaries. Core sorts by ID descending; generic CP sort/order DTO is not proof of other sorting/filter support.
- Detail fields: id/investor/whitelabel/status/personalDataValidation/document/ocr/bureau/faceMatch/manualReview/history. Nullable sections and fields remain unavailable, not approved. Investor/tenant relationships validated before navigation/render.
- Observed case: composite pending; Face Match approved; document submitted/validation approved; OCR not_available/ticket absent; bureau unknown; one FACE_MATCH_UPDATED history record. No invented decision, confidence or evidence-review action. This is **not** an eligibility assessment.
- Roles in source: SUPER_ADMIN, COMPLIANCE_ADMIN, READ_ONLY. Only SUPER_ADMIN exercised live; other-role behavior must be synthetic.
- Backend supplies documentMasked; both mask fields checked safe. No images/binaries/raw provider/OCR data/tickets/secrets exposed. Frontend projection must allowlist fields and never persist/log personal payloads.

## Implemented read boundary

- `kycReadApi.ts`: explicit validated projection, strict numeric domain IDs/envelopes/meta/completeness/duplicates/detail identity and tenant consistency. Unknown status is neutral, invalid dates unavailable, raw document values rejected rather than reconstructed. Email/provider/free-form OCR/manual-review/score/risk fields are discarded. Names redact embedded document/contact values.
- `useKycRead.ts`: canonical authenticatedGet/useRemote, session-version keys, cancellation/stale-response protection, bounded timeout, explicit retry only; no lastData/polling/storage/logging.
- Existing KycShell, navigation, Dot Matrix, table/cards, status pills, details and keyboard patterns retained. List uses server pagination and explicit narrow total; unsupported filters and global summaries removed. Detail has six metadata sections; decisions/evidence actions/pending issues/session history removed, not simulated. Unsupported decision/activity tabs are not retained as fake operational surfaces.
- Historical KYC model/store/dialog/fixture files remain isolated for maintained tests, not authoritative route sources. `kycLinks` no longer resolves through prototype records. Investor/Entrepreneur unresolved-case actions remain unavailable with corrected copy (not guessed deep links). Account views still have no case association. Dashboard KYC remains unchanged/unavailable.

## Focused validation before release

- KYC suite: **97** synthetic checks; all **23** maintained suites: **3,352** checks. Includes contracts/nullability/IDs/duplicate/incomplete pages/date/timezone/unknown states/privacy/GET-only/errors/abort/session/timeout and protected source checks.
- TypeScript, oxlint, production Vite build, whitespace/diff validation pass. No dependency changes. Inherited >500 kB chunk-size advisory remains non-blocking.
- Production-built synthetic browser at **1672/1440/900/390/320px**: list/detail no page-wide overflow, bounded keyboard-scrollable table, visible focus, long-name wrapping, null sections, no private sentinels/prototype rows or active KYC writes. Visible scroll guidance added after review. Reduced motion: zero running animations, content readable.
- Browser synthetic empty/403/404/500/502/network/malformed/401 states passed; 401 redirects to Login and clears synthetic session. Timeout after canonical 20s preserves session. Explicit retry: exactly one failed GET + one user-triggered GET, no automatic loop. Navigation cancels pending list; prototype case URL makes zero detail requests. Page 2 returns 3/23 rows, no client filtering. Browser Back restores list. READ_ONLY fixture retains read-only content; source-only roles must not be mistaken for live impersonation.
- Synthetic harness/build/captures are external to repository under the session visualization directory `kyc-read-2026-10-22`; only intentional regression script/fixtures are versioned. Harness has no upstream client, rejects every non-GET, uses synthetic credentials only, and is never deployed. No production/local auth bypass added to source.

### Exact historical guard amendments

1. Compliance/Audit: replace four prototype-index link assertions with list-only destination/unknown-count assertions; keep frozen fixtures and Audit boundary tests (404 total).
2. Menu operational: original Stage B scope check now compares its historical `c5ecb5a..91d6f98` publication, not all later Dashboard releases. Current unrelated source remains protected by Menu Stage A/B/C and the new KYC checks.
3. Menu global: explicit eight KYC file paths + Investor detail copy path; only kycReadApi gets canonical GET capability, all scanned for forbidden persistence/write capability. Planted unreviewed Investor path changed to investorApi; no whole-domain exemption.
4. Recent Audit: exactly two participant detail-copy paths allowed; KYC test reverses the two literal replacements per file and byte-compares to `6969a89`. No profile logic exception. Dashboard/Audit/auth/shared shell/dependencies remain unchanged.

## Release checkpoint

Feature commit `860d6fcdc6215bcadb2309b50de05685251693fa` reviewed, fast-forwarded from `6969a89` to canonical dev and normally pushed; feature preserved remotely. No merge/rebase/squash/force-push. Main and canonical handoff unchanged at the hashes recorded above. This follow-up changes evidence documentation only, not frontend source.

### Official homolog acceptance — verified

- Existing Git-connected Netlify site published deploy **`6ad983c56e8a93b1f318f1d3`**, bound to feature SHA `860d6fc`. Served index/JS HTTP200: **`index-B4S_XwRK.js`**, CSS **`index-Cgdh8dnd.css`**. JS SHA256 **`ffcf0770a0c5a93146dd41c64a20935abc575d70b7f8e30c20061dbfb78d2d1c`** exactly matches reviewed official-API production build; CSS SHA256 `92d65119b277e9974813a9ca3dc925c7bf6ff2c4e472951cd3225698a93576fb`.
- Actual built-in authenticated SUPER_ADMIN UI → deployed list GET200, 20 rows / 1547 cases / 78 pages. All displayed IDs, names, Investor/tenant relationships and observed status fields compared privately with the captured authoritative response; only comparison booleans/counts retained. Page2 20 rows starts at case1527, survives reload.
- List→case1547 detail GET200: case ID, actual Investor/tenant relationship, name, both safe document masks, composite pending vs FaceMatch approved, bureau unknown, OCR unavailable, one recorded FaceMatch update all match. No image/form/private payload or active write control. Detail reload successful. Direct link to actual returned case1546 successful. Browser Back restores page2 address. Prototype URL controlled invalid state with no detail request; numeric missing case returns proper 404. No case was created.
- Initial post-deploy reads reached canonical timeout with session retained; bounded auth/me GET200 SUPER_ADMIN (`c4c119c7-fd32-42f5-98b1-794b5ec51140`), then **one explicit UI retry** succeeded. No login workaround/automatic loop. Render/Core startup latency is compatible with observation, not a proven server root cause.
- Live regression: Dashboard KPIs 7 /4762 /78 /2116; Distribution/Daily/RecentAudit ready, preview8 rows, KYC KPI unchanged unavailable; Sidebar loaded. Audit list→selected detail loaded. Menu version5, saving-enabled build retained, draft0; Whitelabel Create/name-edit/Lifecycle controls still available. None submitted.
- Captured API request ledger: **zero non-GET/OPTIONS requests**, zero runtime exceptions. Zero business/compliance/financial writes. No config/env/flag/auth/session/Backend/Core/Render/AWS changes. Main/handoff preserved. Only GETs and normal frontend Git/CD publication.
- Privacy-safe evidence: session visualization directory `kyc-read-2026-10-22/{official-list.json,official-detail.json,official-release.json,published-deployment.png}`; no raw case responses, contact/biometric/document data or credentials written. Local synthetic tab closed and its exact task server PID stopped; official KYC and Netlify tabs retained.

**Result: INTEGRATION MAP V1 COMPLETE + KYC READ V1 VERIFIED IN OFFICIAL HOMOLOG.**

Remaining: seven map-only integrations; source-vs-running Backend/Core exact SHA observability; future Entrepreneur KYC coverage and Dashboard metric definition; conflicting overview/case KYC normalization; capped overview counts. These do not invalidate the directly verified read-only case contract. No wider read/write batch started.

Mutation ledger: **zero KYC/business/compliance/financial writes**, zero case creation, no auth/config/Backend/Core changes. Other seven capabilities map-only.
