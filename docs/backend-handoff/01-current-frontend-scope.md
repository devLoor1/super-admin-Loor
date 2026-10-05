# Current Frontend Scope

Baseline: `f903f98357ee7d44516c67475a498fc609ca772f`. The approved screens are **FRONTEND PROTOTYPED**, with **INTEGRATION PENDING** and **E2E VALIDATION PENDING**. Approval is visual/prototype approval, not operational readiness.

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

Only the overview tab contains detail. Administradores, Aplicações and Integrações are placeholders. Create/edit/overflow actions and configuration/indicator shortcuts do not persist or open implemented management screens. Terms is mapped future scope, not a current tab or editor.

Expected integration is a real tenant list/detail, agreed status vocabulary, authorized actions, server-side filtering/pagination and tenant-specific administrative/configuration reads. See [Whitelabels](03-whitelabels.md).

## Navigation and account control boundary

[App.tsx](../../src/app/App.tsx) selects `#/dashboard` and `#/whitelabels`; other hashes show Login. Direct hash navigation is explicitly not an authentication guard. [navigation.ts](../../src/components/shell/navigation.ts) connects Plataformas to Whitelabels; unimplemented destinations remain notices rather than fabricated screens.

Account control, questionnaire editing, classification governance, feature entitlement management and audit management have no designed/implemented screens. The [planned account module](04-whitelabel-account-control.md) must not be reported as completed frontend work. No visual-library implementation details change these functional boundaries.
