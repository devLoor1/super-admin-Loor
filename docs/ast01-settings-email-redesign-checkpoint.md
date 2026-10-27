# AST-01 · Settings & Email redesign — interruption-safe checkpoint

Started 2026-10-27 (America/Sao_Paulo). User directive: `C:/Users/User/Downloads/LOOR_AST01_Config_Email_Redesign_Codex_Account1.md`.

## Preserved baseline

Live frontend refs fetched: dev `fe7a9a839c5f5595825661c136aa1107c5071c6f`, mock `9c39d70e293231116eb94063bd2957cb6e10de7b`, main `c2235ac5d0d65408e9d39bf836a1a717da3d95ae`. All 24 frontend worktrees were clean. Existing feature history/checkpoints preserved; current work uses local `feature/ast01-settings-email-redesign-v1` in the existing Settings worktree. No remote implementation branch created.

SET-01/SMTP-01 is already live-accepted. Its completed four-write cycle must not be repeated. Final external evidence remains in `set01-smtp01-primary-2026-10-26/release-evidence.json`.

Current evidence directory: `C:/Users/User/.codex/visualizations/2026/08/28/01a047eb-4949-7663-bff7-5b0686497ccf/ast01-redesign-2026-10-27`.

## Actual comparison

Built-in browser works. Official Super Admin authenticated shell/Settings/SMTP inspected. Admin initially had expired data authentication; user manually signed in once and confirmed. Actual Finapop Admin Login, main-area image, App, templates and branding screens are now accessible and captured without writes.

Fresh Admin origin/dev is `7b1c792fa07b51cc40a978d85fe5f4495dcae543`. Historical `caed153` / `1464915` references alone omit its later Email identity editor. Current Admin has transport, templates and identity tabs. Do not carry forward the historical assertion that no branding editor exists.

Admin uses grouped page navigation and region/property controls beside a contextual preview; App has real editorial fields and a representative phone preview; templates have structured editorial fields with system-controlled variables and server rendering. Current Super Admin exposes long read-card sequences, one detached scalar editor, App read summaries and SMTP-only navigation. Existing operational transport must be preserved while replacing this presentation.

Admin entry preview frame DOM is populated, but the initial compositor screenshots paint the embedded frame blank; those captures prove surrounding editor composition, not full rendered consumer image. App and email preview screenshots are visually inspected and valid.

## Concrete contract gaps / work allocation

Fresh Core `eab5d3d64f15a1c6adf2338234e2deb614c1a709`; Nest `47c4bea3e1200fda27a68eed292e14df2b02f0d8`.

- AST routes already exist. Core operator Settings association lacks Admin's asset ownership/normalization: narrow correction required. All qualified composite provenance/reset routes already exist; do not invent new versions or atomicity.
- Email template engine/catalog/branding already exist in Core. Operator internal/Nest template bridge is missing; isolated patch reuses those services.
- Whitelabel 8 remains inactive. Public tenant resolution currently requires active tenant even for explicit slug; do not activate it. Control Plane persistence and own previews cannot be claimed as live public-consumer acceptance.
- Global PWA identity, legal reacceptance and event suppression remain specific policy/consumer gaps; no invented global model.

Parent owns operational frontend. Agents own isolated Backend AST safety, isolated email bridge, and offline mock visual composition. No Backend or frontend pushes/deployments yet.

## Live mutation ledger

None in this workstream. No upload, association, template save, send, business/financial action or Menu preference write. No uncertain outcome or restoration pending.

## Next unfinished actions — superseded checkpoint corrected

Implementation, comparison and local DEV/production-browser review are now complete for the candidate described below. Do not restart them. Complete the isolated Backend maintained validation, then hand the tested Core patch to Backend/Ops (the publication owner explicitly confirmed by the user). Verify compatible Core/Nest running contracts before the controlled live asset/template acceptance and dependent frontend publication. The inactive QA tenant's actual consumer remains a separate unresolved acceptance dependency. No local bridge endpoint is claimed as deployed.

## AST focused implementation checkpoint

Core worktree `C:/Users/User/Desktop/Loor/worktrees/backend-ast-settings-email-v1` retains the prior uncommitted `SettingsQueryService.ts` / `SettingsAllowlist.ts` correction. Typed v1 associations use `PlatformAssetService.assertAssetBelongsToWtlb` before create/update, including disabled references; unknown passive properties survive canonicalization. Explicit null stays distinct from deleting the override. Review aligned registration and Quick Profile text validation with their existing multiline Admin controls, removing invented Quick Profile length restrictions. `scripts/check-ast-settings-contract.cjs` passes **26 isolated scenarios**, including all three pages, foreign/absent assets, exact unknown-property preservation and stored-null/default/absence provenance. Its contract is `docs/ast-settings-composite-contract-v1.md` in Core. No database, HTTP, provider or mail operations occur in that suite.

Frontend `PlatformAssetEditor.tsx` / `.module.css`, `platformAssetClient.ts` and validation alignment in `configurationContract.ts` provide local previews with object-URL cleanup, separate upload/association, independent readback, retained pending references, enable/unlink/reset and dependency-reviewed replacement/deletion. The three page origins are rechecked before physical mutation; inherited image dependencies block it. `onState` delegates dirty/busy navigation protection to the parent. POST 201 followed by failed GET remains uncertain with the exact reference. Recovery performs GET only; signed-URL rotation is allowed by comparing durable metadata. Nullable URL/legacy metadata remain unavailable rather than fabricated. `scripts/check-platform-assets.mjs` passes **15 focused synthetic scenarios**; targeted oxlint for these three TypeScript files and `git diff --check` pass. Final full maintained checks, TypeScript/build and browser/live acceptance remain separate gates.

## External offline candidate QA harness

The previous SET-01/SMTP-01 harness is unchanged. The evidence directory contains adapted `local-qa-server.mjs` (**4431**, loopback API/static), `local-qa-vite.config.mjs` (**4432**, candidate DEV), and `ast-qa-fixtures.mjs`. All fixture mutations are memory-only, real tokens are rejected, and no Backend request is forwarded. Settings supply all 27 qualified origins (16 added cells plus 11 SET cells); assets support upload/read/replace/delete, ownership and reference clearing. Email supplies the actual 17-type catalog with synthetic persistence/rendering and actual pure validation/sanitization helpers. The visible synthetic banner applies to every screen; this is not hosted Core-renderer evidence.

External HTML waits for a loopback service worker before application startup. It serves `assets.example.invalid` from local fixture bytes and rejects other external origins; CSP restricts outbound requests. This lets the unchanged HTTPS-only asset client preview `synthetic-entry-image.png`. Browser confirmation of the worker/images and responsive candidate remains pending at this checkpoint.

`qa-smoke.mjs` passed the local asset cycle, restored the original synthetic Login association, removed the newly created asset, validated isolated preview, and received DEV/worker HTTP 200. Report: `qa-harness-smoke.json`. Removed synthetic asset: `73b97c3f-ec89-41aa-b1c1-c9ad99c134b1`. No live mutation was added to the ledger above.

Start `node local-qa-server.mjs` in the evidence directory. Start DEV from the frontend worktree with `node node_modules/vite/bin/vite.js --config C:/Users/User/.codex/visualizations/2026/08/28/01a047eb-4949-7663-bff7-5b0686497ccf/ast01-redesign-2026-10-27/local-qa-vite.config.mjs --configLoader native`. Loopback `/__qa` controls: `error` for GET, `mutationError` for writes, `prefix` to narrow routes, `reset=true` to reset controls; restarting resets all fixture data. `/__qa?ledger=true` lists local requests. Port 4431 serves the existing `dist`; it is not final production-candidate evidence until the coordinated build is verified.

## Email and mock implementation checkpoint — 2026-10-27

The parent inspected the rendered mock Settings and Email composition at 1440 px (captures `10`/`11` in the evidence directory) before operational presentation was implemented. This is local composition evidence, not deployed or live persistence acceptance. Current source changes below remain uncommitted; no source work was discarded during the disk-space interruption.

### Current Admin parity and qualified corrections

| Actual Admin reference/state | Prior Super Admin | Candidate editor/preview | Endpoint/service and persistence | Permission and remaining boundary |
| --- | --- | --- | --- | --- |
| Email transport tab, safe configuration controls | SMTP metadata read cards and preserved modal editor | Transport, sender-header presentation and optional provenance details; existing `SmtpMetadataEditor` and SMTP clients unchanged | Existing tenant SMTP GET/PATCH; no transport rewrite | Existing SUPER_ADMIN edit / READ_ONLY read; credential editing and test-send stay unavailable |
| Template type selection, structured editorial controls and rendered mail preview (`06-admin-templates.png`) | No operational template editor | Live catalog and tenant/default record selection, 17 structured types, explicit legacy conversion, Save/Discard/Remove, separate draft/saved preview | Narrow candidate `/api/whitelabels/:id/emails/templates` bridge delegates to existing Core `EmailTemplateService`; list/detail/preview/create/PATCH/delete with GET before and after writes | SUPER_ADMIN writes, SUPER_ADMIN/READ_ONLY reads and preview; global defaults cannot mutate. Bridge deployment is not yet verified |
| Email-specific identity tab (`EmailBrandingSettings.tsx` / `emailBranding.ts` at current Admin ref) | No contextual identity editor | Qualified composite `email_branding.config` editor alongside the existing Core email renderer | Existing Settings provenance/PUT/DELETE and `EmailBrandingService`; aliases preserved and only explicitly edited canonical properties added | Email identity does not represent platform/PWA branding. Remote logos are deliberately blocked in preview; persisted URL does not prove mail-consumer rendering |
| Admin Web/App grouped sections and editor/preview split (`05-admin-app.png`) | Long generic summaries | Task-oriented navigation and wide split / narrow Editor–Preview switching | Existing public/composite contracts; parent owns operational Settings editors | Admin iframe blank initial paint is not evidence of image-consumer acceptance; actual consumer remains a separate gate |

Current Admin source baseline is `7b1c792fa07b51cc40a978d85fe5f4495dcae543`. The following pure editorial source files were copied directly, without importing Admin transport or its authentication:

- `src/features/whitelabel-emails/editorial/emailConfirmationTemplateModel.ts` — SHA256 `E1A17177096769E3C1EF9E9F52D45A256342B29241D702ECBF52C8AE2C85F7DE`.
- `src/features/whitelabel-emails/editorial/investmentContractTemplateModel.ts` — SHA256 `DAC7501DCB999334DCAC4DD099F81D9C16DFB14F8AD61D9B1E252574C0F7CC9C`.
- `src/features/whitelabel-emails/editorial/linkedTemplateModel.ts` — SHA256 `C485CDFD1DF1DFAAEB7CC3BAE656F70C3C67D6AFE09094C136F7C0444A6364BA`.

`emailEditorialModel.ts` adapts those serializers; it is not a second email engine. Unknown future types remain readable without inventing an editor. Unrecognized stored HTML is preserved until the operator explicitly prepares a structured replacement. No fallback template is presented as an authoritative stored record.

### Operational Email files and safeguards

- New: `EmailTemplatesWorkspace.tsx`, `EmailTemplatesWorkspace.module.css`, `EmailBrandingWorkspace.tsx`, `emailBrandingDisplay.ts`, `emailEditorialModel.ts`, `emailTemplatesApi.ts`, `emailTemplateWrites.ts`, the three editorial files above and `scripts/check-email-templates.mjs`.
- Updated: `OperationalSmtpPage.tsx` for the three contextual areas; `ConfigurationEditor.tsx` only for an optional Core-preview slot and display-only branding alias projection. Parent separately owns routing, shared presentation and readiness integration.
- Final source review corrected display/preview to match existing Core `primary_color ?? primaryColor` / `logo_url ?? logoUrl`: null or absent canonical properties may render a legacy alias. Stored nulls remain null; merely displaying or previewing the effective alias does not mutate the raw object. Editing changes only the canonical property, retaining legacy aliases and unknown extensions. Core consumer behavior is unchanged.
- New template customizations start inactive. Activation has an explicit confirmation describing effects on future messages and other same-type custom templates. Save does not send mail or change dispatch/event policy.
- Each write has a fresh list/detail baseline check, one dispatch and authoritative readback. Versions remain informational. Uncertain responses lock further writes; reconciliation performs GET only. Defaults and cross-tenant records are rejected before dispatch.
- Preview sends only type, subject, structured HTML and allow-listed optional branding. Core supplies synthetic examples. Requests are debounced and aborted when obsolete; responses are bound to tenant/type/draft. A retained prior preview is explicitly marked previous while pending or failed.
- Returned HTML is sanitized in a detached inert `<template>` and displayed only in an empty-sandbox iframe with CSP `default-src 'none'`, `img-src 'none'`, `form-action 'none'`. Scripts, forms, navigation attributes, frames, SVG/MathML, external images and URL-bearing styles are removed. No arbitrary mail HTML enters the app shell. External image rendering is intentionally not claimed.

### Focused verification and exact limitations

`node --max-old-space-size=256 scripts/check-email-templates.mjs` passed **55 focused synthetic checks**, including all 17 editorial roundtrips, immutable system variables, private-key rejection, strict scope/RBAC, inactive create, partial PATCH, own-template DELETE, stale baseline, uncertain outcomes/no retry, preview payload isolation and branding alias/null/unknown-property preservation. There were no live requests or sends. Operational `git diff --check` passed at this checkpoint. Parent owns final full suites, TypeScript/oxlint/build, direct-route and rendered operational browser acceptance; this checkpoint does not substitute for them.

The candidate Email bridge has not been verified as deployed. Positive live template persistence, applied consumer behavior, exact deployment assets and final homolog checks remain outstanding. SMTP's previously accepted live cycle must not be repeated merely to document the new presentation.

### Independent mock state and source review

Worktree: `C:/Users/User/Desktop/Loor/worktrees/super-admin-mock-settings-evolution-v1`, local branch `feature/mock-ast01-settings-email-redesign-v1`, baseline `9c39d70e293231116eb94063bd2957cb6e10de7b`. Old mock branch/history preserved; no permanent remote branch created.

New mock files: `MockConfigurationStudio.tsx` / `.module.css`. Integrated in existing Whitelabel Settings/Emails pages; legacy interactions remain under a disclosure. Changed page CSS, `emailModel.ts` and `settingsModel.ts` support the composition and independent dirty markers. The entry studio now uses `entryStudio`, separate from the legacy `experience` editor, so one cannot clear the other's unsaved protection. Tenant-keyed component remounts and memory maps retain separate local drafts/saved states.

Source review confirms no network API/browser-channel constructors in the new studio; `src/lib/api.ts` still calls only the in-memory `mockRequest`. Existing CSP `connect-src 'none'` / `frame-src 'none'`, disabled Vite HMR and Netlify fail-closed guard remain unchanged. Email preview is explicitly local, synthetic and noninteractive; it is not evidence of Core rendering. No operational client was copied into mock.

Local image object URLs are revoked when discarded/replaced/removed unless retained by a saved mock page. Replacing a saved image releases the superseded URL once no saved page retains it. This avoids breaking a saved page while switching local contexts and avoids abandoned draft URLs.

Responsive source uses `min-width:0`, wrapping controls, breakpoints at 1250/1000/600 px, desktop/mobile preview and narrow Editor–Preview selection. Visible focus and reduced-motion rules are present. This is source verification only: final responsive/browser checks after the small dirty-marker/object-URL corrections remain the parent's responsibility. Mock `git diff --check` passed with only existing CRLF normalization warnings.

### Narrow Email preview correction

Parent's `dev-email-preview-320.png` was inspected: the previous iframe used the available narrow panel width directly, so original Admin/Core horizontal padding caused the greeting to break inside a word. The mail body/serializer was not changed. `emailPreviewGeometry.ts` and the preview frame now retain a 600 px desktop or 360 px mobile viewport and scale the entire isolated document to available width. An aspect-ratio host reserves its dimensions; the absolute iframe cannot influence the observed host's geometry. A width-only ResizeObserver ignores hidden, unchanged, fractional-noise and unrelated measurements and disconnects on unmount, with a removable resize-listener fallback. No sandbox access or iframe content measurement was added.

The focused Email suite now passes **58 checks**, including fixed viewport/no upscaling, observer deduplication/cleanup and the fallback. Debounce, cancellation, tenant/draft binding, previous-preview labels and safe HTML boundary remain intact. Root must inspect the corrected 320 px render before freezing the candidate. The visible skip-link in the original full-page capture is consistent with its focus-visible fixed-position behavior; no shared shell change was made without a reproduced defect.

### Final legacy branding correction and independent mock validation

Final independent review found that valid saved colors such as six digits without # or eight-digit alpha syntax could disable the draft preview during an unrelated logo edit. `emailBrandingPreviewDraft` now computes the effective color/logo using the existing Core nullish alias semantics, then normalizes only the render command exactly like `EmailBrandingService.normalizeHex`: trim, optional #, six/eight hex digits, lowercase first six, alpha discarded. Saved/draft raw values, explicit nulls, aliases and unknown extensions are unchanged. No Backend semantic change or DTO broadening is required.

The final focused Email suite passed **60 synthetic checks**, adding logo-only edit coverage across canonical/legacy six/eight-digit colors, actual preview-command validation, null/alias resolution and immutable saved snapshots. No live request or mail occurred. Parent confirmed the corrected production-style 320 px preview after an actual reload: fixed 360 px document scaled to available width, readable and without overflow.

Independent mock validation completed sequentially with bounded Node heaps: TypeScript passed; oxlint passed; Vite production build passed (only inherited chunk-size advisory); the isolation suite passed **66 protocol reads plus static network, independent Finance, local mutation and session rejection checks** without invoking network. Built assets: `index-B15zlGI_.css`, `index-CJ0pEaEz.js`. Mock diff check passed with only line-ending normalization warnings. The account-creation helper's completion output was not recovered across interruption, so no new pass is claimed for that separate helper. Preview was started at `http://127.0.0.1:4430/`; the parent owns final browser availability/responsive verification.

## Final frontend validation and browser review — 2026-10-27

The runtime candidate is frozen in `scripts/ast-settings-reviewed-files.json`: 27 exact reviewed files, baseline before-hashes and candidate after-hashes, `finalized:true`. Finalization records source review, not release or live acceptance. Historical manifests remain unchanged; focused adapters validate both sides of each scoped replacement. No blanket path or role exemption was added.

The full sequential maintained run started at 13:19:25 UTC and ended at 13:26:40 UTC (7m15s). It ran every maintained `scripts/check-*.mjs` (45 suites), TypeScript, oxlint, production Vite build and diff check. The initial result was 46/49 jobs passing. Three obsolete presentation assertions were reviewed and corrected without runtime changes, then individually passed: configuration evolution **90**, Settings read **66**, Whitelabel CRUD **69**. Final aggregate: **45/45 maintained suites pass**, TypeScript passes, oxlint passes with two inherited set-state-in-effect warnings in unchanged legacy editors, production build passes with the inherited large-chunk advisory, diff check passes. Initial failures remain recorded rather than overwritten. Evidence: `final-validation.json`, `final-*.log`, and `final-maintained-rechecks.json` in the external evidence directory.

The three test corrections now exercise physical Settings/Studio/SMTP component rendering across all 11 previously released SET cells, missing provenance, SUPER_ADMIN/READ_ONLY, qualified App editing and legal restrictions; require tenant+area and session remount keys; and exclude only the exact reviewed `safeSmtpCorrelation` import from an old SMTP-path regex, preserving the remaining forbidden paths.

Final production-mode local assets: `index-d6fLS3j-.js` and `index-B6aEwQH9.css`. They were built with loopback QA `VITE_API_BASE_URL=/api`; this is production-mode candidate evidence, **not the official Netlify release bundle**. Browser resource inspection confirmed these exact assets. The external harness supplies only synthetic memory data/session and rejects real tokens; its service worker resolves the explicit `assets.example.invalid` fixture locally and blocks other outbound origins. No fixture or test session is imported into candidate source.

Built-in browser review passed at **1672, 1440, 900, 390 and 320 px** for Platform, Platform App and Email (15 measured states, no horizontal page overflow). Captures `prod-*-final.png` and `prod-responsive-final.json` are preserved. Wide editor/preview splits, narrow switching, readable 360 px mail viewport scaled to mobile, App hierarchy and saved/null image states were inspected. Whole-page screenshot stitching can move fixed sidebar/skip-link/banner pixels; viewport/DOM evidence did not reproduce a shell regression, and no speculative shared-shell edit was made.

Additional production-mode checks: READ_ONLY has no email create/edit/save controls and disabled App fields; explicit null image displays “Área principal sem imagem”; injected 502 shows Control Plane unavailable with no prototype fallback; Tab receives a visible solid outline; reduced motion yields zero document animations. Email remains in an empty-sandbox iframe. Script diagnostic syntax/locator mistakes during automation were corrected; they were not application failures. Runtime console had no application errors before intentionally injected HTTP failures. See `prod-browser-final.json`, `prod-browser-diagnostics.json` and the exact loopback-only `local-browser-ledger-final.json`.

The existing DEV evidence is retained: scalar/composite save/readback, image upload followed by separate association, null/reset/dependency dialog, 422 error retention, uncertain-write safeguards, tenant draft discard, role denial, email inactive save/readback and five-width captures. The final held-editor correction was verified by **31 focused configuration tests**, including actual React components and handlers. No second complete synthetic cycle was run merely to relabel evidence.

Independent mock browser review also passed five widths for Settings and Email. Local title/subject saves were visibly labeled memory-only; switching Finapop to Loor did not leak the saved subject. A dirty template blocked tenant switching, focused “Continuar editando”, retained the draft on Escape, and supported explicit discard. Reduced motion produced zero animations; performance resources showed no external requests; console errors were empty. `mock-responsive-final.json`, `mock-email-responsive-final.json`, `mock-browser-final.json` and captures preserve this evidence. Mock is still separate, offline, and cannot deploy the official site.

The previously missing `check-mock-account-creation.mjs` result was resolved by running only that unfinished helper: it passed participant validation, immutable tenant/type drafts, three local creation/readback variants, pending-onboarding truthfulness, duplicate/role isolation, existing Admin behavior, independent reset and frozen Finance. No network was invoked. Together with the already-passed 66-check boundary script this completes the two components of `check:mock`; the completed boundary suite was not repeated.

Mock consolidation is now local commit **`fdaa86c611aebced17215691cd7de9b7097d4bb4`** on `feature/mock-ast01-settings-email-redesign-v1`, exactly eight reviewed files. Its worktree is clean. It was not pushed or merged. Fresh remote verification still showed `origin/mock=9c39d70e293231116eb94063bd2957cb6e10de7b`, `origin/dev=fe7a9a839c5f5595825661c136aa1107c5071c6f`, `origin/main=c2235ac5d0d65408e9d39bf836a1a717da3d95ae`. The separate existing local `mock` branch at `e59a14bbe0150243d15cbf30fb1f9cac129344ea` and all unrelated worktrees remain untouched; do not reset that branch to publish this candidate.

### Release boundaries and immediate resumption

No live upload, Settings change, SMTP change, template mutation, email send, Menu Visibility write or business/financial operation occurred. There is no uncertain live operation or cleanup debt. Previously accepted SET/SMTP and Menu Visibility v5/23 evidence is preserved, not replayed or represented as a fresh live read.

The user explicitly assigned **Core publication to Backend/Ops**. Full Nest validation is being resumed with an official portable Node 22 runtime after a fresh read showed about 9.3 GiB free; no cache reset, permission change, TLS bypass or further dependency deletion was performed. Final Backend outcomes and precise handoff must be appended after that process finishes. Do not promote a frontend requiring an unpublished bridge.

Remaining acceptance: compatible Core/Nest deployed and verified; positive isolated AST upload/association/replacement/restoration/deletion and inactive-template create/edit/delete/readback; actual tenant consumer evidence (Whitelabel 8 remains inactive and must not be activated for convenience); then normal dev/Netlify release verification. Shared tenants 6/7 must not have branding changed. Global PWA identity, legal reacceptance and event suppression remain specific policy/consumer gaps. This work is a local implemented redesign, **not full AST-01 or redesign live acceptance**.
