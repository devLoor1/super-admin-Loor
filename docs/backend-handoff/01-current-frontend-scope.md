# Current Frontend Scope

Baseline: `dev@6b46d570262dc5f6a66737bd88eb1cedb7b6a8d9`. Login V1, Dashboard V1, Whitelabels V1, Whitelabel Account Control V1, Whitelabel Settings V1, Whitelabel Emails V1 and Finance / Gateways V1 are **FRONTEND PROTOTYPED**, with **INTEGRATION PENDING** and **E2E VALIDATION PENDING**. Approval is visual/prototype approval, not operational readiness. Earlier phase links retain their historical commits; Finance and current navigation use the current approved commit. Frontend implementation is not merged into this documentation branch.

## Login V1

Sources: [LoginPage.tsx](../../src/features/login/LoginPage.tsx), [LoginForm.tsx](../../src/features/login/LoginForm.tsx), [PasswordField.tsx](../../src/components/form/PasswordField.tsx).

Purpose: operator entry into Super Admin. Current interactions are email/password input, required/email-format validation, first-invalid focus, password visibility and recovery feedback. Successful local validation shows an honest prototype notice; it does not authenticate, persist credentials, call recovery or enter the Dashboard.

Expected integration is independent Control Plane login/session/recovery with safe operator identity, permissions, authorized scope, session expiry and error states. Existing Core actor login must not be substituted for this contract. No new authentication behavior is specified by this handoff; [Q-AC-01](open-questions.md#accounts) and [RBAC questions](open-questions.md#rbac) govern it.

## Dashboard V1

Sources: [DashboardPage.tsx](../../src/features/dashboard/DashboardPage.tsx), [AppShell.tsx](../../src/components/shell/AppShell.tsx), [TopHeader.tsx](../../src/components/shell/TopHeader.tsx).

Purpose: global supervision and entry to modules. Five KPI cards, overview, activity, distribution, operational status and recent events are data-ready empty states. Whitelabel KPI/shortcut navigate locally; remaining module buttons, global search, notifications, context selector and operator controls show prototype feedback. There are no real health probes, events or aggregate values.

Expected Backend data consists of Core-authoritative aggregates, explicit global/tenant scope, periods/freshness, permitted navigation and safe event/service metadata. See [Dashboard](02-dashboard.md); formulas and metric definitions remain unresolved.

## Whitelabels V1

Sources: [WhitelabelsPage.tsx](../../src/features/whitelabels/WhitelabelsPage.tsx), [WhitelabelListPanel.tsx](../../src/features/whitelabels/WhitelabelListPanel.tsx), [WhitelabelDetailPanel.tsx](../../src/features/whitelabels/WhitelabelDetailPanel.tsx), [prototypeWhitelabels.ts](../../src/features/whitelabels/prototypeWhitelabels.ts).

Purpose: tenant discovery and selected-tenant detail. Local behavior includes accent/case/trim-safe name/domain/slug search, status filtering, sort, single-row selection, empty/reset states, tab navigation and clipboard copying. Three illustrative records drive the UI; counts/dates are null. Pagination is a one-page placeholder with previous/next disabled.

Only the overview tab contains detail. Administradores, Aplicações and Integrações remain placeholder detail tabs. The Contas quick action opens the selected tenant's account-control prototype; the Administradores quick action opens the same route with `?tipo=administradores`. Configurações now opens the selected tenant's Settings prototype. Create/edit/overflow actions and indicator shortcuts remain notices without persistence. Terms is a Settings section, not an additional Whitelabel detail tab.

Expected integration is a real tenant list/detail, agreed status vocabulary, authorized actions, server-side filtering/pagination and tenant-specific administrative/configuration reads. See [Whitelabels](03-whitelabels.md).

## Whitelabel Account Control V1

Sources: `src/features/whitelabel-accounts/` ([approved module](https://github.com/devLoor1/super-admin-Loor/tree/cc28f3c26e6a9ec0e905ca04c4a1f49c468e0d7a/src/features/whitelabel-accounts)), including [page](https://github.com/devLoor1/super-admin-Loor/blob/cc28f3c26e6a9ec0e905ca04c4a1f49c468e0d7a/src/features/whitelabel-accounts/WhitelabelAccountsPage.tsx), [detail](https://github.com/devLoor1/super-admin-Loor/blob/cc28f3c26e6a9ec0e905ca04c4a1f49c468e0d7a/src/features/whitelabel-accounts/AccountDetailPanel.tsx) and [prototype model](https://github.com/devLoor1/super-admin-Loor/blob/cc28f3c26e6a9ec0e905ca04c4a1f49c468e0d7a/src/features/whitelabel-accounts/accountModel.ts).

Route: `#/whitelabels/:whitelabelId/accounts`. Optional type query: `?tipo=investidores`, `?tipo=empreendedores` or `?tipo=administradores`.

Current local behavior includes Whitelabel context, the three account types, search, access/business filters, sorting/paging, visible-row selection, account detail, account-specific states, dependency summaries and local history/feedback. Investor detail displays accepted/current Terms revision and current classification/questionnaire state. Admin permissions are conceptual **A definir** labels, not effective grants.

Pause requires a reason and changes only local access state to Pausada. Reactivation restores local access without changing validation/business state. Change Whitelabel demonstrates destination, dependency impact/warning and reason/confirmation, then records a simulated request; it does not move the account or related records. New Admin demonstrates name/email, fixed tenant, conceptual function, invitation/access state and local duplicate validation; it sends no invitation and creates no credentials or Backend record.

Illustrative records and action feedback live in frontend memory and reset on reload; prototype IDs, state labels and dependency summaries are not authoritative API fields. Responsive layouts, keyboard/focus/dialog behavior, reduced motion and no-WebGL fallback were independently reviewed at 1672, 1440, 1280, 900, 390 and 320px. See the [frontend review evidence](https://github.com/devLoor1/super-admin-Loor/blob/cc28f3c26e6a9ec0e905ca04c4a1f49c468e0d7a/docs/whitelabel-account-control-v1.md); these checks do not close cross-system E2E.

Expected integration remains authorized Core-backed reads and commands through Control Plane, with durable audit/readback and explicit Product policy. See [account control](04-whitelabel-account-control.md).

## Whitelabel Settings V1

Source: `src/features/whitelabel-settings/` ([approved module](https://github.com/devLoor1/super-admin-Loor/tree/df87de8e5d3ded2da3915c5de602620c282ab5ba/src/features/whitelabel-settings)); route: `#/whitelabels/:whitelabelId/settings`. See [Settings handoff](05-whitelabel-settings.md) and the [frontend review record](https://github.com/devLoor1/super-admin-Loor/blob/df87de8e5d3ded2da3915c5de602620c282ab5ba/docs/whitelabel-settings-v1.md) for phase evidence, not a Backend contract or a deployment claim.

General tenant context is read-only. Identity offers simulated logo/favicon selection, primary/accent colors and a local preview. Experience offers structured text/default-versus-override display. Features offers only four existing capability concepts, not plans/entitlements. Terms offers current/history/local publication; SMTP is summary/shortcut only. Each editable section has local drafts, validation, save/discard and unsaved-change protection, including in-app Back/Forward and native beforeunload behavior.

Settings saves survive in-app navigation only and reset on reload; selected assets are local object URLs, never uploads. Account Control reads the current Terms revision from the same in-memory Settings store, preserving the illustrative Investor's accepted revision/date. No authoritative legal publication, reacceptance, business API, authentication or durable audit occurs.

The current [SMTP summary](https://github.com/devLoor1/super-admin-Loor/blob/5f438035dbac1ec49df68fc3d9799c3fb5078c4a/src/features/whitelabel-settings/sections/SmtpSummary.tsx) reads the Emails store and links to `#/whitelabels/:whitelabelId/emails?section=smtp`. Settings owns only this safe status/shortcut, not a duplicate SMTP configuration.

## Whitelabel Emails V1

Source: `src/features/whitelabel-emails/` ([approved module](https://github.com/devLoor1/super-admin-Loor/tree/5f438035dbac1ec49df68fc3d9799c3fb5078c4a/src/features/whitelabel-emails)); route: `#/whitelabels/:whitelabelId/emails`, optionally `?section=smtp|envios|templates`. See the [Emails handoff](06-whitelabel-emails.md) and [frontend review record](https://github.com/devLoor1/super-admin-Loor/blob/5f438035dbac1ec49df68fc3d9799c3fb5078c4a/docs/whitelabel-emails-v1.md).

SMTP prototypes host, port, TLS mode, username, write-only password, sender email/display name, configured/unconfigured views, local edit/save/discard and a simulated test. Existing passwords are never readable; only configured metadata/fixed masks are shown. New input exists only in the edit draft and is dropped on save/discard, not retained in the shared store or activity. No real SMTP connection, secret storage, API write or email delivery occurs.

Automatic email events have per-Whitelabel draft switches and explicit local save/discard. Investment confirmed — Equity and Investment confirmed — Debt are independent Product requirements; registration completed, password recovery, account approved and Terms updated are illustrative, not confirmed Backend-configurable flags. Templates is a summary of illustrative platform defaults/categories, the local SMTP sender and a Settings identity link; its manage action remains a notice, not an editor/versioning capability.

Tenant-specific saved values and activity survive in-app navigation only and reset on reload. Unsaved-change protection covers links, tenant switching, Back/Forward and native document-exit/reload warnings; session feedback is not durable audit. Decorative Orbit borders do not change event support or delivery state. Integration still needs authorized scoped SMTP/event/template contracts, secure secrets, real test semantics, sanitized errors, RBAC and durable audit.

## Finance / Gateways V1

Source: `src/features/finance-gateways/` ([approved module](https://github.com/devLoor1/super-admin-Loor/tree/6b46d570262dc5f6a66737bd88eb1cedb7b6a8d9/src/features/finance-gateways)); route: `#/whitelabels/:whitelabelId/finance/gateways`. See [Finance / Gateways handoff](07-whitelabel-finance-gateways.md).

The tenant-scoped page prototypes gateway configuration, write-only credential status, simulated connection validation, local activation/deactivation, masked bank-account management, a conceptual modality summary and session-only activity. Save/discard and unsaved-change protection are local; state resets on reload. Providers, accounts and configuration are illustrative.

This module is configuration/governance only. It performs no provider request, banking integration, Investment/Payment/wallet mutation, Pix generation, refund, cashout, transfer or reconciliation. Provider catalogs, secret contracts, banking ownership, modality relationships, RBAC and audit remain Backend/Product work.

## Navigation and management boundary

[App.tsx](https://github.com/devLoor1/super-admin-Loor/blob/5f438035dbac1ec49df68fc3d9799c3fb5078c4a/src/app/App.tsx) selects `#/dashboard`, `#/whitelabels` and the Account Control/Settings/Emails routes above; other hashes show Login. Direct hash navigation is explicitly not an authentication guard. [navigation.ts](https://github.com/devLoor1/super-admin-Loor/blob/5f438035dbac1ec49df68fc3d9799c3fb5078c4a/src/components/shell/navigation.ts) preserves the approved top-level shell, including Auditoria, and adds Whitelabels / Contas / Config. do Whitelabel / E-mails under Plataformas. The tenant Settings destination is distinct from the global utility Configurações, which remains unimplemented. Context-specific links retain the displayed tenant; unimplemented destinations remain notices.

Account Control, Settings and Emails are prototyped, not Backend-integrated. Questionnaire editing, classification governance, generic feature entitlement management, full email-template editing and audit management still have no implemented management screens. Investor profile display is read-only and global in the audited Core; the Settings capability switch is not a per-Whitelabel catalog/classification editor. No visual-library implementation details change these functional boundaries.
