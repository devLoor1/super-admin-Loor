# Account Creation & UX Evolution V1 — prepublication acceptance record

Date: 2026-10-26. **Prepublication acceptance complete:** local implementation, maintained checks and supported-browser DEV/production-build checks passed. This versioned record intentionally precedes publication. Exact destination SHAs, Netlify receipts, deployed authenticated checks and branch cleanup are recorded afterward in the external `account-creation/release-evidence.json` and `account-creation/final-delivery-report.md`, at the evidence root below. This avoids changing the reviewed code commit merely to record its own deployment identity.

The workstation was preserved before implementation. The independent `mock` candidate provides three coordinated account-creation experiences. The `dev` candidate contains only eight scoped shared presentation refinements and their tests/documentation; operational Investor/Entrepreneur creation remains unavailable until Backend qualifies a supported contract.

## 1. Workstation inventory and changes discovered

The actual frontend Git root is `C:/Users/Caio Loor/Documents/Loor/super-admin-Loor`, rather than the parent `Loor` directory. The initial frontend inventory found:

| Checkout | Initial branch / HEAD | Observed state |
| --- | --- | --- |
| `super-admin-Loor` | `dev`, `89872608bc965c584b33920df6bcbbea8e2b2ada`, tracking `origin/dev` | No staged, unstaged or untracked changes. |
| `super-admin-Loor-whitelabel-crud-operational-v1` | `feature/whitelabel-crud-operational-v1`, `c5ecb5addf6772bf9ca68c41099e0491ee953fe2` | Clean; ignored `node_modules/` and `dist/` excluded from preservation commits. |

Both frontend HEADs are ancestors of fetched remote `dev` `9f7f71e328440972dfd63588e9e981fbb2ced673`. No frontend commit required replay or recovery, and no frontend detached worktree was registered. Original branches/worktrees were left intact. Implementation used separate new checkouts: `super-admin-account-creation-mock` from current remote `mock`, and `super-admin-account-ux-dev` from current remote `dev`.

The external inventory also covers twelve other checkouts; shared-repository worktrees are listed individually rather than counted as independent repositories:

| Other checkout | Initial branch / short HEAD | Pre-existing work and treatment |
| --- | --- | --- |
| `admin-canvas` | `dev` / `ffd2e4f` | Two modified files and one untracked assertion file; private recovery patches/copy retained. |
| `frontend` | `dev` / `12fa494` | Seven modified files and one untracked assertion file; private recovery patches/copy retained. |
| `backend` | `dev` / `34c8876` | Clean source; ignored environment, local database, dependencies/cache retained in place. |
| `backend-readonly-current` | detached / `1e82531` | Clean read-only Core worktree; unchanged. |
| `backend-super-admin-contract-readonly` | `dev` / `88b7bf7` | 130 apparent staged deletions. Recovery inspection found no index/checked-out files, consistent with a no-checkout clone; exact observed deletion patch retained. No reset/restore or normalization performed. |
| `empreendedor-loor` | `main` / `729ded6` | Clean; read-only reference inspection. |
| `front-app` | `dev` / `d53559d` | Clean; unchanged. |
| `investor-cep-auto-address` | `feature/finapop-cep-auto-address-20260928` / `f3f17a1` | Clean Investor worktree; unchanged. |
| `investor-cep-financeiro-ready` | `wip/finapop-investor-cep-financeiro-20260928` / `4d63b68` | Clean Investor worktree; unchanged. |
| `investor-cep-portfolio-nav` | `feature/finapop-investor-cep-portfolio-nav` / `087abd0` | Clean Investor worktree; unchanged. |
| `loor-project-context` | `main` / `636a1bf` | One private/unclassified QA checkpoint left at its original recovery location; not copied or published. |
| `finapop-workstation-handoff-docs` | `wip/finapop-workstation-handoff-20260928` / `d45e972` | Clean, with one local-only documentation commit; verified incremental Git bundle retained privately. |

Full HEADs, branches, upstreams, worktrees, file scopes and ignored-path names are in the external `preservation-unrelated/inventory.json`. Inventory of the other repositories did not fetch or change their remote refs. `status-verification.json` records unchanged status for all twelve other checkouts.

## 2. Preservation branch, commits and reconciliation

| Item | Verified record |
| --- | --- |
| Temporary authorized branch | `wip/account1-secondary-pc-20261026`, created from actual local HEAD `8987260`, not from `origin/dev`. |
| Remote preservation commit | `92da885cfb8cf2fc47426078b627e12698fea614`; `git ls-remote` matches the reviewed local preservation commit. |
| New preservation content | Only `docs/workstation-preservation-2026-10-26.md`; source changes were unnecessary because both existing frontend histories were already incorporated in remote `dev`. |
| Unrelated local-only commit | `d45e97293102dc498505285ad200ef13434edb6d`, preserved in `finapop-workstation-handoff-d45e972.bundle`, requiring base `636a1bf81730662b1ea16585e481c634cab9a1f8`; `git bundle verify` passed. It is not part of the Super Admin delivery. |
| Private recovery evidence | Staged/unstaged patches, safe untracked assertion copies, inventory, checksums, recovery instructions and unchanged-state verification. |
| Exclusions | Credentials/tokens, environment secrets, local databases, private QA content, dependencies, caches and build output were not committed or published. Sensitive excluded files remain at their original locations, recorded externally without their contents. |

The exclusions were also **not copied into the backup**: `backend/.env`, `backend/tmp/db.sqlite3` and `loor-project-context/docs/qa/active-business-cycle-checkpoint.md` remain intact only at their original locations, listed in external `RECOVERY.txt`. The last file was deliberately treated as private/unclassified QA content. Other relevant dirty source, the safe untracked assertion files and the local-only `d45e972` documentation commit received the separate patches/copies/bundle described above. Do not interpret the broad original checkpoint wording as a claim that the excluded private checkpoint was copied.

The preservation gate was satisfied before feature implementation. No destructive cleanup, hard reset, forced checkout/push or history rewrite was used. No complete `mock` branch was merged into `dev`.

| Classification | Disposition |
| --- | --- |
| Already incorporated | Both original frontend HEADs and their prior deliveries; no source replay. |
| Intended for `dev` | Eight independently scoped shared UX refinements, exact-source protection, focused tests and delivery/handoff documentation. |
| Intended for `mock` | Participant forms, drafts, synthetic creation/readback/onboarding, existing Administrator prototype UX and mock-only fixes. |
| Documentation/testing | Workstation checkpoint, Backend handoff, this record, operational boundary suite and mock regression suite. |
| Unrelated | Other repositories' unfinished business-cycle work, Investor worktrees and private context checkpoint; preserved outside the initiative. |

## 3. Registration contracts reused and Backend boundary

The full exact-field/authentication analysis is [Account Creation — Backend Handoff V1](account-creation-backend-handoff-v1.md), kept separate from Settings/SMTP.

| Existing implementation | Evidence-based behavior | Use in this initiative |
| --- | --- | --- |
| Core Investor self-registration | `POST /auth/investor/register`; name/email/phone/password, `type=pessoa_fisica|pessoa_juridica`, actual current terms acceptance/revision; initial validation `waiting`, email/profile pending. | Field meanings and onboarding separation inform the mock. No operator token calls this actor route. |
| Core Entrepreneur self-registration | `POST /auth/entrepreneur/register`; name/email/phone/password; email/profile pending. | Initial-contact form reference; no Company/banking/KYC required by this route. |
| Core Admin complete Entrepreneur | `POST /admin/entrepreneurs`, `auth:admin`; full personal/address/company information, generated credential delivery, deliberate email/profile completion. | Specialized Finapop reuse candidate for Backend; not imposed on lightweight SA initial registration. |
| Existing SA Whitelabel Administrator | `POST /api/whitelabels/:wl/admins`, `SUPER_ADMIN`, `{email,password}` only; separate supported name/email edit. | Existing form/client, password clearing, single dispatch, error handling and authoritative GET reconciliation reused. No invitation, role or reset flow invented. |
| Current CP Investor/Entrepreneur | Only GET list/detail/overview; tenant Accounts also has reads/access commands, not creation. | No operational participant-create action added to `dev`. |

Source qualifications: frontend `9f7f71e`; current CP `dev`/`homolog` `8d661ec581eff3b697136f7629b0331b70e531a6` read through GitHub; local Core source `1e8253192b29ddeed1011a99ef2be958ea7b259a`. Core remote `dev` was observed at newer `08d5ef0b6146a162e9f4c7d5c5e2e37652cda2fe`, whose file reads were unavailable through the connector. Core findings need requalification against Backend's deployed release.

The proposed CP/internal-Core initial-creation bridge remains a proposal. Credential provisioning, participant-performed email confirmation and revision-bound terms consent require explicit Backend/Product decisions. The handoff covers route/method, required/optional data, canonical tenant identity, initial state, onboarding/company separation, duplicate handling, RBAC, audit, idempotency, uncertain-response recovery, authoritative GET, errors and acceptance criteria. No pending account is represented as verified, legally accepted or externally provisioned.

## 4. Account-creation prototype behavior

| Account type | Implemented mock journey | Truthful initial result |
| --- | --- | --- |
| Investor | Select Whitelabel; PF/PJ; name/email/phone; grouped details and review; edit/keep/discard draft; confirm; synthetic receipt; open scoped account/domain detail; explore onboarding stages. | `waiting`; unverified email; no legal acceptance; profile/credentials pending; no fabricated KYC, wallet, payment or investment. |
| Entrepreneur | Same coordinated contact/review pattern with account-specific guidance; no PF/PJ selector; Company/onboarding left separate. | Incomplete profile; no company/CNPJ/bank account/opportunity created; verification/legal/credentials remain pending. |
| Whitelabel Administrator | Existing compact email/password dialog, existing command and authoritative-shaped synthetic readback; credential input cleared after dispatch. | Synthetic Administrator only; no password retained or externally provisioned; no invented invitation acceptance or Control Plane role grant. |

Participant drafts are immutable tab-memory records scoped by exact tenant and kind. Explicit discard clears only that draft; successful creation clears the submitted draft; “Restaurar dados” reloads and clears all synthetic records/drafts. A mock-scope session watcher now clears participant drafts on session replacement even when the creation form is unmounted. Participant duplicate identities are tenant/kind-scoped, following inspected Core scope; existing Administrator uniqueness remains global.

Participant commands use the explicitly synthetic `/mock/account-creation/...` namespace. The existing hardwired mock transport has no real Backend fallback, and the mock CSP retains `connect-src 'none'`. All writes in these journeys are in-memory simulations. Full behavior and limitations are documented in mock's `docs/mock-account-creation-v1.md`.

## 5. Screenshot evidence and reference limits

Screenshots are private external evidence, not tracked image assets or application data. Their root is:

```text
C:/Users/Caio Loor/.codex/visualizations/2026/10/26/01a1792c-17b1-7cc2-b7d9-6b90efe5d085/account-creation/screenshots/
```

| Captures | Actual rendered scope |
| --- | --- |
| `01-before-dashboard-1440.jpg` | Existing Super Admin Dashboard before refinement. |
| `02-before-whitelabels-1440.jpg` | Whitelabel list/context. |
| `03-before-accounts-1440.jpg`, `04-before-admin-dialog-1440.jpg` | Accounts and existing Administrator creation. |
| `05-before-settings-1440.jpg`, `06-before-platform-app-1440.jpg` | Settings and Platform App. |
| `07-before-opportunities-1440.jpg`, `08-before-investors-1440.jpg`, `09-before-entrepreneurs-1440.jpg` | Operational management views. |
| `10-before-finance-1440.jpg`, `11-before-compliance-1440.jpg`, `12-before-audit-1440.jpg` | Finance, Compliance and Audit. |
| `13-admin-reference-entry.jpg` | Public Admin login only; no authenticated Admin flow claimed. |
| `14-investor-reference-entry.jpg`, `15-investor-reference-register.jpg` | Public Investor entry/registration. Terms were unconfigured and registration unavailable; no account or acceptance action executed. |
| `16-entrepreneur-reference-register.jpg` | Actual local Entrepreneur registration reference; not a deployed authenticated creation test. |
| `17-mock-polish-dashboard-1440.jpg`, `18-mock-polish-admin-dialog-1440.jpg`, `19-mock-admin-dialog-320.jpg` | Shared polish rendered in the local offline mock. |
| `20-mock-investor-review-1440.jpg` | Investor review stage. |
| `21-mock-entrepreneur-form-1440.jpg` | Intermediate form contrast evidence. Other `21` sizes were rejected after detecting a viewport-target mismatch and are not responsive acceptance evidence; the exact final matrix is `24`. |
| `22-operational-local-dashboard-{1672,1440,900,390,320}.jpg` | Operational candidate rendered against the external local synthetic QA API. |
| `23-mock-entrepreneur-review-320.jpg` | Narrow-screen review composition. |
| `24-mock-investor-final-{1672,1440,900,390,320}.jpg` | Accepted final mock form captures with actual viewport sizes independently measured for each tab. |
| `25-operational-built-admin-{1672,1440,900,390,320}.jpg` | Accepted operational production-build Administrator dialog; external synthetic read-only QA API, no business submission. |
| `26-mock-built-accounts-1440.jpg` | Final production-built mock Accounts and synthetic record; no live identity or Backend activity. |

The live Investor form's checklist says minimum six characters plus uppercase/lowercase/digit/symbol, while inspected Core effectively requires eight and does not require uppercase. Its unpublished-Terms card blocked registration. This discrepancy is recorded for Backend/portal qualification; this initiative did not change the portal or bypass Terms.

The local Entrepreneur reference has contact/password fields and static implied-terms text. That copy does not establish an authoritative revision-bound acceptance record. Reference captures support visual comparison within those limits; they do not prove Backend E2E or authenticated Admin parity.

## 6. Concrete UX audit findings and disposition

Impact describes practical effect; confidence reflects rendered/source/behavior evidence; effort describes the scoped correction rather than a wider redesign.

| Finding and evidence | Impact | Confidence | Effort | Implemented disposition |
| --- | --- | --- | --- | --- |
| Rotating Dashboard H1 changes the visible page identity during a routine task (`01`, compared with `17`/`22`). | Medium: orientation and visual stability. | High. | Small. | Stable actual page title in mock and dev; no rotating title import in candidate header. |
| Decorative dot field competes with repeated dense content (`02`–`12`, compared with local candidate). | Medium: hierarchy across multiple screens. | High. | Small. | Lower shared field opacity from 0.50 to 0.16; pointer behavior unchanged. |
| Administrator dialog close target is 34×34 (`04`), smaller than the refined 44×44 target (`18`/`19`). | Medium: reliable pointer/touch dismissal. | High. | Small. | Shared close target 44×44, wrapping heading, existing focus behavior preserved. |
| Detail changes use a longer spring with 55 ms stagger, amplifying motion in frequent list/detail navigation. | Medium: perceived delay and distraction. | High: rendered transition plus actual source. | Small. | Restrained 90 ms exit/180 ms entrance, 12 ms stagger, shorter travel, no spring. |
| Participant form labels inherited a palette with weak hierarchy on the new dark form (candidate `21`, refined `24`). | Medium: form readability. | High. | Small. | Mock-only contextual label color correction; shared FormField behavior not broadly restyled. |
| Mock draft clearing depended on a mounted form, permitting draft carryover across a session replacement elsewhere. | High: session privacy/context integrity within the prototype. | High: state lifecycle review and focused regression. | Small. | Mock-only watcher moved to persistent MockApp scope; not an operational auth change. |
| Reduced-motion A→B updates left old animation state that could reappear when the preference was switched off. | Medium: stale context and orientation. | High: actual effect regression. | Small. | Synchronize displayed identity in the reduced-motion branch; independently exercised by focused dev tests. |

No sweeping redesign of Dashboard tables, Finance, Compliance, Audit, Settings or approved identity was performed. Repeated shared issues and the new account flows were prioritized.

## 7. Hierarchy, motion, accessibility and performance

The eight promoted shared paths are `TopHeader.tsx`, `DetailTransition.tsx`, `Dialog.module.css`, `OutlineButton.module.css`, `PrimaryButton.module.css`, `AdminLifecycle.module.css`, `DotMatrixBackground.module.css` and `styles/tokens.css` (their full exact paths are in `scripts/account-ux-reviewed-files.json`). The operational header keeps its existing hygiene; prototype-only search/context/notification controls were not copied from mock.

| Refinement | Candidate behavior |
| --- | --- |
| Shared motion vocabulary | Micro 150 ms; panel 210 ms; easing `cubic-bezier(0.2,0.7,0.2,1)`. |
| Dialog opening | 210 ms opacity/4 px transform with minimal scale; no additional motion dependency. |
| Detail transition | Exit 90 ms/−2 px; enter 180 ms/4 px; stagger 12 ms; no spring/overshoot; same-ID data refresh does not replay the entrance. |
| Reduced motion | Existing global CSS minimizes nonessential animation/transition to 0.01 ms; detail JS uses zero duration and synchronizes the current identity. |
| Buttons | Disabled states do not acquire active/hover feedback; visible focus retained; coarse-pointer targets at least 44 px with wrapping labels. |
| Administrator form | Shared gap 18 px, inputs at least 46 px, retained focus indication and credential lifecycle. |
| Dialog composition | Close target 44 px, wrapping title, viewport-bounded scrollable body and stacked narrow-screen footer. |

Browser geometry is saved externally in `mock-responsive-form.json` and `operational-local-responsive.json`. At widths 1672/1440/900/390/320, mock dialog widths were 660/660/660/358/288 px, with internal scroll width matching dialog width and close target 44 px. Root's final mock captures `24` passed responsive geometry at all five widths with the label correction in place. The operational local DEV dashboard (`22`) also passed all five widths, retaining the stable title, no mock badge, and page scroll widths below the requested viewport widths. The local synthetic READ_ONLY profile hid Administrator creation, and operational participant creation remained unavailable. The operational production-built Administrator dialog also passed all five widths (`25`); its widths were 560/560/560/358/288 px with matching internal widths and a 44 px close target. These are local browser results against a separate synthetic read-only QA API; deployed acceptance is recorded separately.

The focused suite checks actual candidate SSR accessibility semantics, a single detail region, inert outgoing identity, callback/cancellation behavior, native dialog labels, focus styles and reduced-motion preference changes. Native browser checks confirmed initial field focus, review-heading focus, Edit returning focus to the name field, success-heading focus, Escape/discard protection, Back protection, and Administrator cancellation returning focus to its opener. Reduced-motion emulation yielded dialog animation duration `1e-05s`; detail preference switching is also covered by the actual effect regression. Five-width geometry passed without page/dialog horizontal overflow. No claim of full accessibility compliance or assistive-technology certification is made.

Production build succeeds with `index-74xoyOQb.js` (1,037.32 kB; gzip 300.40 kB) and `index-RBQIqtlY.css` (208.58 kB; gzip 37.51 kB). The existing large-chunk advisory remains. No dependencies/build settings changed and no new layout-animation framework was introduced. No FPS, Core Web Vitals or full performance profiling result is claimed.

## 8. QA evidence and source boundaries

| Gate | Current result / evidence |
| --- | --- |
| Operational maintained checks | **39/39 passed**, executed serially; includes Homolog readiness, every maintained `scripts/check-*.mjs`, Administrator lifecycle, tenant/RBAC, transport, Menu Visibility, Settings/SMTP and regression suites. |
| Focused shared UX | **36 passed** in `check-account-ux.mjs`: actual current candidate SSR/effect/CSS checks plus exact-pin and adversarial boundary tests. |
| Operational TypeScript / Oxlint / build / diff | Passed; external logs retained. |
| Mock protocol and focused tests | Passed: `check:mock` runs the maintained 66-read boundary and account-creation suite, including role/tenant/session/draft/duplicate/cancellation/reset, real overview parsers and zero-network sentinels. Latest PJ label assertion also passed. |
| Mock TypeScript / lint / build / diff | Passed on final source, including session/focus/contrast and PJ label fixes. Assets: `index-Bu7Tuwm1.js`, `index-oXEcS2Pu.css`. |
| Local DEV browser | Passed all five widths; stable title/no mock badge/no participant creation; READ_ONLY hides Admin creation; explicit 403 and 500 show denied/unavailable states with no seeded fallback or false zero total. |
| Final mock responsive browser | Passed final `24` captures at all five widths; corrected labels, 44 px close target, validation/review/edit/keep/discard/Back, three synthetic creations and domain-profile readback, pending onboarding and restore. |
| Production-built browser | Passed: final mock assets loaded; Investor PJ, Entrepreneur and existing Admin creation/readback; password field removed after Admin submission; tenant isolation, saved-draft Back guard, session reset away from Accounts. Captured zero Network requests during participant creation and `connect-src none`. Operational built dialog passed all five widths, reduced motion and opener focus. |
| Remote publication / authenticated deployment | Receipt emitted after publication in external `release-evidence.json`; local synthetic QA is never presented as deployed Backend E2E. The mock is published to its Git branch and retained as independent local preview, never to official homolog. |

Operational logs and `maintained-checks.json` are outside Git at:

```text
C:/Users/Caio Loor/Documents/Loor/handoff/account-creation-ux-20261026/operational-qa/
```

The new review manifest pins exactly eight before/after source files against baseline `9f7f71e`. The previous consolidation and Settings evolution manifests remain byte-for-byte intact. Historical assertions reverse only the individually verified later UX delta; native two-tree comparisons remain native, and actual behavior loaders read the physical candidate. Unknown files or extra bytes are rejected. There is no directory-wide exemption, automatic re-pinning, runtime fixture import or weakened business-write test.

The external loopback `qa-harness.mjs` serves synthetic API responses for local operational presentation QA. It is outside the repository/runtime graph and does not call Core. Its evidence is clearly separate from deployed authenticated Backend verification. No auth bypass, mock fallback, test fixture or synthetic account command was added to operational dev.

## 9. Publication receipts and temporary-branch disposition

This is the accepted prepublication record. The immutable code commits cannot contain their own resulting SHA or a later Netlify deployment ID. The final external `release-evidence.json` records exact mock/dev remote SHAs, remote reachability, Netlify deployment/asset receipts, authenticated runtime, Menu Visibility comparison, original-workstation status and temporary-branch disposition. Its companion `final-delivery-report.md` completes all sixteen requested final-report topics with those observed receipts.

The temporary preservation branch is retained at this checkpoint until the versioned recovery record is present in both destination commits, remote contents are verified and no active checkout requires it. The original recovery document is copied byte-for-byte into both candidates. Cleanup must retain unresolved unrelated source/history in the private recovery artifacts; it must never delete another initiative's branches or worktree.

Publication order is mock validation and Git publication first, then independently accepted operational UX through Git-connected Netlify. The mock preview is `http://127.0.0.1:4177/`; it requires no Backend, genuine credentials or external service. Existing branch-only Netlify refusal stays intact. `main` is not a delivery target; no force push or history rewrite is used. The final intended remote branch set is `main`, `dev`, `mock` when safe cleanup is verified.

## 10. Preservation of prior deliveries and Menu Visibility

Pre-publication remote checks still show `main` at `c2235ac5d0d65408e9d39bf836a1a717da3d95ae`, `dev` at `9f7f71e328440972dfd63588e9e981fbb2ced673` and `mock` at `e59a14bbe0150243d15cbf30fb1f9cac129344ea`. No `main`, Backend/Core, archive-tag, RBAC, Settings/SMTP integration or existing business-rule write was made for this initiative. Prior SA-BE deliveries and Whitelabel Settings Evolution remain in the baseline; maintained checks reuse and preserve their accepted behavior.

The authoritative pre-change Menu Visibility UI baseline is saved externally as `menu-visibility-before.json`: **version 5, all 23 persisted preferences visible**. No preference-save action or configuration write was executed. Native source checks confirm the registry, visibility policy/resolver/API and authentication unchanged. The final deployed version/map comparison is recorded in the external release evidence after publication; this pre-change capture is not presented as an after-deployment check.

No live account, company, opportunity, financial, compliance or provider business mutation was performed. The mock exercises synthetic records only; operational local QA uses an external synthetic fixture. Existing live business-mutation evidence from previous deliveries was not replayed.

Private preservation evidence root:

```text
C:/Users/Caio Loor/.codex/visualizations/2026/10/26/01a1792c-17b1-7cc2-b7d9-6b90efe5d085/account-creation/preservation-unrelated/
```

This report covers the requested workstation inventory, discovered changes, WIP recovery SHA, preserved history/work, contract reuse, three prototype behaviors, screenshot-backed audit, hierarchy/motion/accessibility/performance, Backend requirements, QA, destination commits, deployment, cleanup and prior-delivery invariants. **The final external release evidence and report complete the later publication/cleanup receipts; the preceding acceptance results are complete.**

External final-report evidence root: `C:/Users/Caio Loor/.codex/visualizations/2026/10/26/01a1792c-17b1-7cc2-b7d9-6b90efe5d085/account-creation/`. Private screenshots and source backups are deliberately not committed.
