# Branding / entry assets handoff — current delta and preserved proposals

The original 25 October audit is preserved below. Its proposed-route and missing-editor statements are historical, superseded by the 27 October qualification in this section. No shared tenant mutation, mail send or deployment is established by this document.

## Current qualification — 27 October 2026

Current source references: Admin `7b1c792fa07b51cc40a978d85fe5f4495dcae543`, Core `eab5d3d64f15a1c6adf2338234e2deb614c1a709`, Nest `47c4bea3e1200fda27a68eed292e14df2b02f0d8`. These identify inspected baselines, not deployed candidate patches. Actual Admin Login/image/App/Email/identity interfaces were inspected; [the checkpoint](ast01-settings-email-redesign-checkpoint.md) records captures and scope.

- **B1 / AST-01:** tenant Platform asset GET/upload/replace/delete routes already exist. No new asset service or route family is required. The local Core correction makes operator Settings association validate the referenced asset against the exact tenant before persistence, matching the existing Admin service. The canonical association is `platform.main_area_image@1` with `enabled` and `assetRef`; passive unknown properties survive normalization. Fit/position are not invented stored fields: the current consumer supplies its own cover/center/inset presentation. Frontend controls keep upload and association distinct, retain an uploaded reference on uncertain follow-up, inspect dependencies before replacement/deletion, and reconcile through GET only. Exact candidate normalization and the 26-case isolated suite are recorded in `C:/Users/User/Desktop/Loor/worktrees/backend-ast-settings-email-v1/docs/ast-settings-composite-contract-v1.md`. The historical response/route proposals below must not be used as the current API specification.
- **B2/B3 / BRD-01:** global Public/App/PWA identity and logo/favicon asset slots remain separate consumer/policy gaps. Entry `main_area` support does not authorize those slots or prove runtime manifest/service-worker branding. No invented global write model is introduced.
- **B4 / APP-01:** typed composite provenance and override deletion are available. The local frontend editor preserves stored unknown fields and only changes explicitly edited canonical paths. Generic PUT still replaces a complete page/key value; parser/default output must not be serialized as if every effective fallback were stored. Unsupported versions fail closed. App/Public reload and cache behavior must still be accepted against the intended active tenant.
- **B5 / EML-01:** the current Admin has 17 structured template types and an Email identity editor. The local Core/Nest bridge reuses EmailTemplateService and EmailBrandingService, with catalog/list/detail, no-send preview, inactive create, partial PATCH and own-custom-template DELETE. It does not expose Admin JWT endpoints or create another engine. The candidate route contract is `C:/Users/User/Desktop/Loor/worktrees/backend-ast-settings-email-nest-v1/docs/email-template-operator-contract-v1.md`; PATCH supersedes the historical proposed operator PUT. No bridge deployment or live template lifecycle is verified yet.
- **EMB-01:** existing `email_branding/config` Settings provenance/PUT/override deletion and the existing EmailBrandingService are reused. Display/preview follow the authoritative existing `canonical ?? alias` behavior: null or absent canonical properties can render the legacy alias. Stored null, alias and unknown fields are preserved; editing adds only the explicit canonical change. Preview-only color normalization matches Core (trim, optional #, six/eight hex digits, lowercase first six, alpha discarded). Stored absence, explicit null and deletion remain distinct even when rendered appearance resolves to an alias. No Core consumer behavior is changed. Current Admin does have the corresponding identity editor; the historical absence finding was limited to old refs.

Safe Email preview is a no-send Core operation with synthetic server samples. Returned HTML is sanitized and displayed only inside an empty-sandbox iframe with restrictive CSP; the app never injects it into its own shell. Scripts, actions, links and external images are blocked. Email-specific color/structure can be reviewed without fetching an external logo, but this deliberately cannot establish remote-logo or actual delivery rendering. The editor labels this limitation. Raw credential-bearing URLs, SMTP credentials and recipient samples are not accepted.

### Release and consumer evidence still required

1. Complete maintained checks and review the isolated Core/Nest patches; publish them only through their supported owner-controlled delivery flows. Core AWS deployment access/procedure and exact deployed revision must be established; Nest homolog is deployed from its established `homolog` flow, not inferred from a `dev` push.
2. Verify actual operator authentication/RBAC, current catalog/DTOs, default immutability and tenant ownership against the deployed bridge before dependent frontend publication.
3. Use bounded reversible QA for the new image/composite/template scope, with GET reconciliation and restoration. No mail send, legal publication, tenant activation or business/financial mutation is implied. Whitelabel 8 is inactive, so its public slug cannot currently establish active-consumer acceptance; do not activate it merely to manufacture that evidence.
4. Record intended consumer refresh separately from Control Plane persistence and local previews. Previously accepted SET-01/SMTP-01 evidence remains valid and must not be replayed solely for the redesign.

The remaining B2/B3 global-branding, legal lifecycle and automatic-event proposals below are still proposals. For implemented local AST/Email capabilities, this dated section and the candidate contracts replace the old missing-route assumptions.

## Historical source proposal — 25 October 2026

At that audit checkpoint, Core/Admin already had a dedicated entry-image pipeline; the recommendation was to reuse it rather than invent an unrelated upload service. No Backend code was changed during that historical audit.

Current Core `351c7926163d35d6bc984fd3958ccc6cee2e04c3` also already supports **email-specific** identity through `email_branding/config` (primary_color/logo_url and compatible camelCase read aliases). `EmailBrandingService` applies color/logo to transactional templates at preview/send time, including Edge fallback. This does not satisfy global Public/App/PWA branding. Reuse this existing email capability rather than requesting it anew; no matching Admin editor was found in the inspected Admin refs. For a safe read, allowlist color and nonsecret URL metadata; never render returned HTML, fetch a logo, or display URL credentials/query/fragment. Core's HTTP(S) normalization alone does not enforce those privacy restrictions.

## B1 · P1 · Bridge existing entry-image capability

- Objective: tenant entry-page main-area image management matching Admin.
- Existing Core: POST `/admin/platform/assets`, PUT/DELETE `/admin/platform/assets/:assetRef`, `PlatformAssetService`, WTLB association, `slot=main_area` and page `main_area_image` setting normalization.
- **Proposed Nest mapping**: POST `/api/whitelabels/:id/platform/assets`; PUT/DELETE `/api/whitelabels/:id/platform/assets/:assetRef`. Keep the shared service, not Admin JWT exposure. Canonical numeric WTLB ID is authoritative; require that asset tenant matches URL tenant. Slug returned for identity only.
- Multipart `image`: JPG/JPEG/PNG, nonempty, ≤20MiB, MIME/extension match. Current Core slot is main_area only. No SVG/WebP/logo support implied.
- Response `{data:{asset_ref,slot,wtlb_id,mime,original_name,size_bytes,url,created_at,updated_at}}`; delete204. Allowlist metadata, never storage credentials/internal paths.
- SUPER_ADMIN upload/replace/delete, SUPER_ADMIN/READ_ONLY read as existing policy allows; other roles403. Authenticate normally; no cross-tenant reference.
- Associate with `{login|register|quick_profile}/main_area_image` using capability `platform.main_area_image@1` and `{enabled,assetRef}`; Core resolves/enriches url. Use exact row semantics; retain unrelated page/key rows.
- Current delete clears referencing settings. Define replacement cache URL/version and pending-file cleanup. If upload succeeds but association fails, show orphan ID and permit supported cleanup; no blind second upload after uncertainty.
- Audit uploaded/replaced/deleted/attached tenant+assetRef+page, actor/correlation, outcome, safe metadata only. Errors include401/403/404 mismatch,413 size,415 format,422 validation/invalidref,409 concurrentchange,5xx uncertainty.
- Acceptance: upload once; GET asset+Settings proves exact tenant association; public consumer resolves image on intended page after refresh; replace invalidates old cached URL; unrelated settings retained; delete clears supported references. Do not use Opportunity images as substitutes.
- Owner/order: Core confirms current service contracts → Nest bridge/RBAC/sanitization → frontend typed controls → isolated QA acceptance. No shared-tenant visual change for discovery.

## B2 · P1 · Runtime platform-wide identity contract

- Objective: existing mock logo/favicon/primary/accent design as runtime tenant override, distinct from Quick Profile colors and current build-time PWA presets.
- **Proposed read** GET `/api/whitelabels/:id/branding`; **proposed write** PUT same. Prefer typed schema behind existing Settings route only if Core publishes canonical consumed page/key semantics; do not store arbitrary mock field names.
- Proposed versioned body `{version:1,baseVersion:<opaque>,overrides:{logoAssetRef:<id|null>,faviconAssetRef:<id|null>,primaryColor:<#RRGGBB|null>,accentColor:<#RRGGBB|null>}}`. Null means explicit inherit; absent means preserve current override. This is a proposed contract decision, not current Core behavior. Reject unknown write fields and cross-tenant assets; preserve server-owned fields.
- Proposed safe read `{data:{whitelabel:{id,slug},version,overrides,effective:{logo:{asset_ref,url}|null,favicon:{asset_ref,url}|null,primaryColor,accentColor},sources:{…},updated_at}}`; distinguish effective inherited value, explicit tenant override and missing configuration. Empty strings invalid. Default reset should not silently copy today's default into a permanent override.
- SUPER_ADMIN writes; SUPER_ADMIN/READ_ONLY reads. Audit tenant/actor/version/changed field names+safeassetrefs; no inline dataURI or storage secrets.
- Core must define which actual Public/App/email consumers apply each color/logo; frontend cannot infer that all consumers use `quick_profile.theme`. Publish cache invalidation/version semantics and resolution by verified WTLB slug/host. PWA manifest/icon/service-worker handling requires explicit migration; compiled VITE_PWA presets currently remain a separate consumer.
- Errors401/403/404,409 versionconflict,422 invalidformat/contrast/assetassociation,413/415 upload; restore using latest authoritative version after conflict. Never auto-overwrite concurrent changes.
- Acceptance: tenant A write visible through authoritative GET + intended actual consumer; tenant B/default unchanged; resettoinherit works; slug resolves to same numeric tenant; oldassetcache handled; preview never claims persistence; fallback accessible.
- Owner/order: Product scope of global/entry/App/PWA/email identity and contrast policy → Core typed persisted schema+consumer resolver → Nest mapping/allowlist/RBAC → frontend → isolated reversible QA.

## B3 · P2 · Logo/favicon asset slots (proposed extension)

- Extend existing platform asset ownership pipeline with explicitly supported `logo` and `favicon` slots. Current `main_area` support is not proof these slots work.
- Proposed multipart includes supported slot; logo PNG/JPEG/WebP≤1MiB and favicon PNG/ICO≤256KiB are recommendations pending Product/Core image policy, not existing limits. Existing mock accepts SVG only as local preview; SVG upload must require sanitization/rasterization or be rejected. No unsafe SVG interpretation in public consumers.
- Return durable immutable/versioned assetRef+URL, normalized dimensions/MIME; replacement changes URL/version; original safe-name metadata optional. Specify file cleanup and reference checks before deleting an asset used elsewhere.
- Same tenant/RBAC/audit/readback/recovery rules as B1. Define whether delete is blocked while referenced or explicitly resets references. Client object URLs never substitute for authoritative IDs.

## B4 · P1 · Platform App write preservation

- Reuse existing Settings GET/PUT rather than requesting another generic endpoint. Existing page/key values `app_entry/content` and `app_authenticated/content` already pass the generic route and are consumed by App.
- Core/Nest need a documented typed v1 contract matching the 20+13 known fields in `admin-parity-matrix.md`, exact normalization/limits, unknown-property preservation and concurrency/readback behavior. PUT replaces an entire value row; frontend must not send a sparse `screens` fragment.
- Current Admin serializes unknown root/screen/field properties. Read-safe rendering must not render arbitrary unknown values. Unsupported root versions block edits, effective fallback values must not be mistaken for persistence.
- Acceptance needs no legal/financial action: isolated QA textchange → authoritative GET → intended App refresh → restore; unrelated rows and unknown properties unchanged. Such QA is not performed by this mock.

## B5 · P1 · Terms and email downstream gaps

- Terms publication should bridge existing Core `/admin/terms-of-use` with `{title,content_markdown}` through a dedicated tenant-scoped Nest operation, not generic Settings PUT. Clarify immutable revision/history, stalecurrentconflict, currentrevisionGET and registration-acceptance consequences. Server drafts/re-acceptance remain Product decisions; local mock drafts do not establish support.
- Email templates should bridge existing Core types/list/create/update/preview for the four qualified types; preserve system-controlled links/attachments/variables and sanitized preview. No actual send in preview. No new Core template engine is necessary.
- Event preferences need explicit semantics, not inferred setting keys: trigger ownership, mandatory security events, alloweddisablepolicy, per-WTLB overrides, queue snapshot timing/retry/idempotency, audit and safe GET. A preference edit must not itself send an email.
- SMTP contract safety/allowlisted reads/password replacement/test-send restrictions are handled in the coordinated SMTP qualification; no credentials belong in these documents.
