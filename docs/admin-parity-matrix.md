# Admin → Super Admin configuration parity

Source qualification, 25 October 2026. This document concerns repository contracts, not an assertion of live runtime acceptance. The four Admin menu categories alone did not establish their fields. No Backend or shared tenant was changed during this audit.

## Source references

- **A**: `C:/Users/User/Desktop/Loor/admin-canvas`, clean `caed1532f52becc48346234897667f2b1d8f3213`; `src/components/admin/platform/` and `platform-app/`.
- **T**: preserved `C:/Users/User/Desktop/Loor/worktrees/finapop-terms-admin`, clean `1464915f23f15a78b6143e787852fd68be940475`; the same Platform/App controls plus `src/components/admin/terms/` and `email/`. This is a source reference, not the operational Super Admin build.
- **C**: `C:/Users/User/Desktop/Loor/backend/app/Services/Platform/PlatformSettingService.ts`, `PlatformAssetService.ts`, `app/Controllers/Http/Admin/PlatformController.ts`, `PlatformAssetController.ts`, and `types/platformSettings.ts`.
- **P**: `C:/Users/User/Desktop/Loor/frontend/artifacts/loor/src/services/publicApi.ts`, `features/platform-settings/usePublicPlatformSettings.ts`, `features/pwa/pwaConfig.ts`.
- **M**: `C:/Users/User/Desktop/Loor/front-app/src/features/platform-app/platformSettings.ts` and `PlatformSettingsProvider.tsx`.
- **E**: exact current Core commit `351c7926163d35d6bc984fd3958ccc6cee2e04c3`, inspected with `git show` without altering its local checkout: `app/Services/EmailBrandingService.ts`, `app/Helpers/PlatformMailHelper.ts`, `app/Controllers/Http/Admin/EmailTemplateController.ts`, `app/Services/Platform/PlatformSettingService.ts`, `types/platformSettings.ts`. Current exact source keeps the generic page/key storage, changes the default wallet_visible to true (local historical checkout has false), and adds email-specific branding. Frontend readers must copy neither local nor remote default values.

Paths below are relative to their identified source repository. Admin JWT endpoints are evidence of existing Core capability only; the Super Admin must use the Nest Control Plane and its own SUPER_ADMIN/READ_ONLY authorization.

## Capability matrix

| Admin section | Actual functionality | Existing Core/Admin endpoint | Entity / page + key | Super Admin destination | Frontend state / decision |
| --- | --- | --- | --- | --- | --- |
| Plataforma | Login title, subtitle, 3 bullets | GET/POST `/admin/platform`, PUT `/admin/platform/:id` | WtlbPlatformSetting: `login/title`, `login/subtitle`, `login/bullets` | Existing tenant Settings → Plataforma | Existing Settings read; generic Nest Settings PUT can reuse one scalar row at a time after validation/readback. Existing API; qualified field semantics required. |
| Plataforma | Login placement/text contrast | Same settings endpoints | `login/layout_preset` = side/top/hidden; `login/brand_panel_text_color` = #RRGGBB | Plataforma → login presentation | Typed operational read implemented; writes held pending field validation and reversible acceptance. Not global branding. |
| Plataforma | Registration editorial content | Same | `register/content`, capability `platform.entry-journey.registration-content@1` | Plataforma → registration | Typed operational read implemented; composite writes held pending unknown-data preservation and runtime acceptance. |
| Plataforma | Entry layout, colors, form surface | Same | `{login,register,quick_profile}/entry_presentation`, `platform.entry-journey.presentation@1` | Plataforma → each entry page | Typed operational read implemented; composite writes held pending preservation/version qualification and runtime acceptance. `regions.brand` + `regions.main` only; not platform-wide palette. |
| Plataforma | Quick Profile title/subtitle/three colors | Same | `quick_profile/theme`: sideTitle, sideSubtitle, primaryColor, backgroundColor, textColor | Plataforma → initial investor profile | Existing Settings read; Core default may mask absent persisted row. Existing API; no claim of global branding. |
| Plataforma | Wallet composition | Same | `dashboard/components`: version1, canonical component id/visible/order | Plataforma → investment dashboard presentation | Typed operational read implemented for known component IDs/visibility/order; writes held pending validated composition and runtime acceptance. Never financial data or balances. |
| Plataforma | Six shared vocabulary tokens | Same | `terminology/config`, `platform.terminology@1`, pt-BR | One Plataforma terminology editor | Existing Settings read; App displays its actual consumer usage instead of duplicating controls. Preserve unknown tokens. |
| Plataforma | Offer card density/image presentation/detail headers | Same | `offers/presentation`, `platform.offers.presentation@1` | Plataforma → offer presentation | Typed operational read implemented; writes held pending typed preservation and runtime acceptance. Affects existing image presentation, not Opportunity data. |
| Plataforma | Main-region image upload/replace/delete | POST `/admin/platform/assets`; PUT/DELETE `/admin/platform/assets/:assetRef` | Platform asset `slot=main_area`; `{page}/main_area_image` | Plataforma → entry-page image | Existing Core API, Nest capability missing/unqualified. Reuse/bridge this pipeline; do not reuse Opportunity upload. |
| Platform App | 20 entry/post-registration editorial strings | Same generic Platform settings routes | `app_entry/content`, `platform.app.entry-content@1`, pt-BR | Settings → Platform App | Existing generic Settings GET can expose it. Typed operational read added in this workstream; writes require whole-row preservation and runtime acceptance. Interactive mock uses actual Admin fields. |
| Platform App | 13 authenticated editorial strings | Same | `app_authenticated/content`, `platform.app.authenticated-content@1`, pt-BR | Settings → Platform App | Same qualification. This is text configuration, not wallet/payment execution or app feature provisioning. |
| Platform App | Terminology consumer summary | No second write surface | Reads same `terminology/config` | Platform App → shared terminology guidance | Already configurable in Plataforma; no duplicate editor. App uses four of six tokens. |
| E-mail | SMTP server/remitter configuration | GET/PUT `/admin/my-email-config` | Per-WTLB email configuration, secret separate | Existing E-mails destination | Safe operational Nest GET `/api/whitelabels/:id/emails/smtp` implemented and source/live-qualified for configured and absent states. Editing remains held for credential-preserving update, Audit privacy and restoration semantics. |
| E-mail | Actual test send | POST `/admin/my-email-config/test` `{to}` | Sends email using effective SMTP | E-mails → test | Nest route exists; actual send is a side effect, not discovery. Mock only simulates. Recipient/rate/error semantics need qualification before live UI release. |
| E-mail | Four templates | GET `/admin/email-templates/types`; GET `/admin/email-templates?type=…`; POST `/admin/email-templates`; PUT `/admin/email-templates/:id`; POST `/admin/email-templates/preview` | `email_confirmation`, `investment_contract`, `welcome_approved`, `terms_and_privacy_policy` | E-mails → templates | Existing Core capability; Control Plane mapping/preview safety missing. Do not request a new Core template system. Current mock summary is conceptual; no operational template editor asserted. |
| E-mail | Transactional-email visual identity (Core capability; no control found in inspected Admin A/T refs) | Existing generic Platform Settings GET/PUT | `email_branding/config`: primary_color/logo_url (consumer accepts primaryColor/logoUrl aliases) | E-mails or Settings → email-specific identity | Safe operational read implemented for canonical color and validated constant logo-presence metadata; raw logo URLs are neither retained nor loaded. Not platform-wide branding. Editing/asset workflow remains held for qualification and runtime acceptance. |
| E-mail | Per-event enable switches | No verified Admin/Core preference endpoint found | Mock events are concepts, not proven feature keys | E-mails → automatic events | Backend capability / Product decision required. Mock switches stay local and cannot promise actual delivery suppression. |
| Termos de Uso | Read and publish a new current revision | GET/PUT `/admin/terms-of-use`, body `{title,content_markdown}` | Tenant Terms current revision + immutable history | Existing tenant Settings → Termos | Operational Settings read preserved; dedicated Nest publication route is missing/unqualified. Generic Settings PUT is not legal publication. No legal text published for QA. |
| Termos de Uso | Save/edit/delete draft | No server draft contract proved | Proposed draft distinct from published revision | Termos → draft | Backend capability/Product lifecycle decision required. Mock simulates local draft/resume/discard and publication without acceptance effects. |
| Identity | Logo/favicon/global colors/live preview | No verified runtime global branding API | Current public PWA branding selected by build env/presets | Settings → Identidade visual | Existing design retained as explicit proposal in mock. Not a `quick_profile.theme` integration and not proven persisted branding. |
| Tenant context | Slug/domain display and consumer resolution | Public `/investor/platform?platform_slug=…`; host fallback | Whitelabel numeric id + slug | Existing tenant selector/context | Numeric canonical API ID mandatory; slug is identity/resolution metadata. No slug edit added and no tenant inferred by alias. |

## Exact Platform App fields and limits

Source **A/T** `platform-app/platformAppEntryContract.ts` and `platformAppAuthenticatedContract.ts`; model companions implement compatibility, normalization and unknown-data preservation. These contract files are copied unchanged only on the separate `mock` branch at `src/features/whitelabel-settings/platform-app/{entryContract,authenticatedContract}.ts`. Operational `dev` uses its allowlisted read projection rather than importing those mock editors or defaults.

`app_entry/content` root: `{capabilityId:"platform.app.entry-content",version:1,locale:"pt-BR",screens:{…}}`.

| Screen | Fields: maximum characters |
| --- | --- |
| login | submitLabel60; recoverPasswordLabel80; registrationPrompt100; registrationActionLabel60 |
| registration | detailsTitle80; fullNameHelper160; detailsContinueLabel60; passwordTitle80; passwordDescription320; passwordContinueLabel60 |
| passwordRecovery | title80; description320; continueLabel60; backToLoginLabel80 |
| completeRegistration | personalDataTitle80; issuingEntityHelper120; nationalityHelper120; annualIncomeHelper100; addressTitle80; bankDataTitle80 |

`app_authenticated/content` root: `{capabilityId:"platform.app.authenticated-content",version:1,locale:"pt-BR",screens:{…}}`.

| Screen | Fields: maximum characters |
| --- | --- |
| wallet | investedOpportunitiesTitle100; availableOpportunitiesTitle100; availableOpportunitiesMoreLabel60; availableOpportunitiesInfoTitle100; availableOpportunitiesInfoDescription280 |
| opportunities | searchPlaceholder80; emptyStateHelper180; detailProgressTitle80; detailResourcesLabel100; detailProfileLabel80; detailTeamTitle80 |
| investments | searchPlaceholder80; emptyStateHelper180 |

All are nonempty single-line plain text; normalize NFC, trim/collapse whitespace, reject CR/LF, Cc/Cf controls, `<`/`>`, `{{…}}`, `${…}`, `%token%`. An incompatible root/capability/version/locale is not a writable v1. Missing/bad individual text may use effective consumer defaults but must be identified as fallback, not claimed persisted data. Existing serializers retain unknown root properties, unknown screens and unknown properties within known screens. Core replaces a whole page/key value, not nested fields. Reconcile the authoritative row and preserve unknown data before a future composite write.

## Consumer evidence and limits

- **P** public frontend resolves slug from the configured platform/environment/host and uses GET `/investor/platform`; `usePublicPlatformSettings.ts` uses tenant-keyed cache, stale60s, gc30min, refetchOnMount always, no focus refetch/retry. Consumer reload must be part of actual eventual write acceptance; saving Core alone is insufficient.
- **M** App consumes `app_entry` and `app_authenticated`, normalizes typed known strings with defaults, and queries through `PlatformSettingsProvider.tsx` (stale5min, retry1, explicit refresh). No arbitrary generic mock identity field is proved consumed.
- **P** `features/pwa/pwaConfig.ts` resolves platform-wide PWA names, logos, icon paths, theme/background colors from `VITE_PWA_*`, `VITE_APP_THEME_COLOR`, platform slug and bundled brand presets. Runtime `quick_profile.theme` controls only its initial entry stage. Updating an arbitrary generic setting does not replace compiled favicon, manifest, service-worker or icon assets.
- Shared terminology has six token IDs. App currently consumes portfolio singular, offering singular/plural and investorRole plural; it does not invent usage of the other two.
- **E** `EmailBrandingService.resolve` reads the exact WTLB's `email_branding/config`. `PlatformMailHelper.sendTemplated` applies it to custom, default and Edge fallback email HTML at send time; `EmailTemplateController.preview` applies the same per-WTLB identity to preview HTML. It is not a Public/App/PWA branding resolver. Color normalization accepts optional #, six hex digits and optional alpha (alpha discarded). Logo normalization accepts any syntactically valid HTTP(S) URL and does not exclude credentials/query/fragment; a Super Admin read must independently forbid those sensitive forms and must not load the URL merely for discovery. No corresponding branding control was found in Admin caed153 or cached Admin dev1464915; no claim is made about a later Admin revision.

## Mock acceptance boundaries

Existing Settings/Identity/Email visual components, Dot Matrix, tenant selector, page URLs, save/discard, focus restoration and browser Back protection are retained. App drafts are tenant-indexed memory only. Saved Terms drafts are separate from published immutable local revisions; publishing changes no account acceptance. SMTP test/activity/event preferences are local simulation only. Reload intentionally resets synthetic data. No live API, token, network fallback or financial execution is introduced. The 23-ID registry and no-network CSP/Netlify publication refusal are unchanged.
