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

Local implementation/review gates passed. Canonical origin/dev rechecked at `6969a89`; protected branches unchanged. Publication and authenticated deployed-browser acceptance are still pending at the feature commit boundary; do not interpret synthetic tests as live UI-to-API E2E. Starting official deployment remains `6ad97260e55af5fb2e344ef8` until verified below.

Mutation ledger: **zero KYC/business/compliance/financial writes**, zero case creation, no auth/config/Backend/Core changes. Other seven capabilities map-only.
