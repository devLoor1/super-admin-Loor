# Branding / entry assets handoff — proposed gaps

This is a scoped source-derived proposal. Paths identified as proposed do not exist in the qualified Control Plane contract. Core/Admin already has a dedicated entry-image pipeline; extend/bridge it rather than inventing an unrelated upload service. No Backend code was changed.

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
