# Current Frontend Scope

Baseline: `dev@d2a51753047d447983fe12145d53d9f42334e547`. It retains all earlier modules, authentication/session/logout, complete Operation and Complete Finance Core, and adds separate Compliance / KYC and Governance / Audit. Business modules are **FRONTEND PROTOTYPED / INTEGRATION PENDING / E2E VALIDATION PENDING**; frontend authentication integration is distinguished below. Approval is visual/prototype approval, not operational readiness. Earlier phase source links retain their historical commits; current routing and the new modules are pinned to the current approved SHA. Frontend implementation is not merged into this documentation branch.

**FRONTEND FUNCTIONAL COVERAGE: COMPLETE FOR CURRENT V1 PLANNED BLOCKS** — Dashboard, Plataformas, Operação, Financeiro, Compliance / KYC and Auditoria. This is frontend prototype coverage only, not Backend/integration/E2E completeness, production readiness, security validation, legal compliance validation or financial-processing validation. Ancillary future/unimplemented actions below are not silently marked delivered.

## Login V1

Sources at the current baseline: [LoginForm](https://github.com/devLoor1/super-admin-Loor/blob/d2a51753047d447983fe12145d53d9f42334e547/src/features/login/LoginForm.tsx), [session integration](https://github.com/devLoor1/super-admin-Loor/blob/d2a51753047d447983fe12145d53d9f42334e547/src/lib/authSession.ts), [route guards/authentication refresh](https://github.com/devLoor1/super-admin-Loor/blob/d2a51753047d447983fe12145d53d9f42334e547/src/app/App.tsx), [header/logout](https://github.com/devLoor1/super-admin-Loor/blob/d2a51753047d447983fe12145d53d9f42334e547/src/components/shell/TopHeader.tsx).

Purpose: operator entry into Super Admin. Email/password validation, first-invalid focus, visibility, loading/error states and recovery feedback remain. The frontend now calls Control Plane `POST /auth/login` relative to its configured API base, stores the returned access token/operator in `sessionStorage`, and opens the Dashboard. It does not persist the entered password. Recovery remains feedback, not a recovery API integration.

Shell routes are guarded by client token presence. Header logout clears client session and returns to Login; authentication refresh is independent of an unsaved draft accepting navigation. These are implemented frontend behaviors, not server token validity/expiry enforcement, revocation, delivered RBAC or live Backend authentication E2E evidence. Independent operator provisioning/recovery, permissions, authorized scope and server session semantics remain governed by [Q-AC-01](open-questions.md#accounts) and [RBAC questions](open-questions.md#rbac). Existing Core actor login must not be substituted; this update adds no new authentication specification.

## Dashboard V1

Sources: [DashboardPage.tsx](../../src/features/dashboard/DashboardPage.tsx), [AppShell.tsx](../../src/components/shell/AppShell.tsx), [TopHeader.tsx](../../src/components/shell/TopHeader.tsx).

Purpose: global supervision and entry to modules. Five KPI cards, overview, activity, distribution, operational status and recent events remain data-ready empty states. Whitelabel and Opportunity/Investor KPI links and Abrir Operação navigate to existing modules; Payments KPI/quick action open `#/finance/payments`, KYC opens `#/compliance/kyc`, and Acessar Auditoria / events Ver todos open `#/audit`. These are navigation-only, not live financial/Compliance/Audit KPI integration. Other unimplemented controls still show feedback; header operator/logout uses the session integration above. There are no real health probes, events or authoritative aggregate values; operational status remains `Aguardando integração`.

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

Settings saves survive in-app navigation only and reset on reload; selected assets are local object URLs, never uploads. Account Control reads the current Terms revision from the same in-memory Settings store, preserving the illustrative Investor's accepted revision/date. No authoritative legal publication, reacceptance, business API or durable audit occurs in Settings. Shell authentication is the separate integration described above.

The current [SMTP summary](https://github.com/devLoor1/super-admin-Loor/blob/5f438035dbac1ec49df68fc3d9799c3fb5078c4a/src/features/whitelabel-settings/sections/SmtpSummary.tsx) reads the Emails store and links to `#/whitelabels/:whitelabelId/emails?section=smtp`. Settings owns only this safe status/shortcut, not a duplicate SMTP configuration.

## Whitelabel Emails V1

Source: `src/features/whitelabel-emails/` ([approved module](https://github.com/devLoor1/super-admin-Loor/tree/5f438035dbac1ec49df68fc3d9799c3fb5078c4a/src/features/whitelabel-emails)); route: `#/whitelabels/:whitelabelId/emails`, optionally `?section=smtp|envios|templates`. See the [Emails handoff](06-whitelabel-emails.md) and [frontend review record](https://github.com/devLoor1/super-admin-Loor/blob/5f438035dbac1ec49df68fc3d9799c3fb5078c4a/docs/whitelabel-emails-v1.md).

SMTP prototypes host, port, TLS mode, username, write-only password, sender email/display name, configured/unconfigured views, local edit/save/discard and a simulated test. Existing passwords are never readable; only configured metadata/fixed masks are shown. New input exists only in the edit draft and is dropped on save/discard, not retained in the shared store or activity. No real SMTP connection, secret storage, API write or email delivery occurs.

Automatic email events have per-Whitelabel draft switches and explicit local save/discard. Investment confirmed — Equity and Investment confirmed — Debt are independent Product requirements; registration completed, password recovery, account approved and Terms updated are illustrative, not confirmed Backend-configurable flags. Templates is a summary of illustrative platform defaults/categories, the local SMTP sender and a Settings identity link; its manage action remains a notice, not an editor/versioning capability.

Tenant-specific saved values and activity survive in-app navigation only and reset on reload. Unsaved-change protection covers links, tenant switching, Back/Forward and native document-exit/reload warnings; session feedback is not durable audit. Decorative Orbit borders do not change event support or delivery state. Integration still needs authorized scoped SMTP/event/template contracts, secure secrets, real test semantics, sanitized errors, RBAC and durable audit.

## Finance / Gateways V1

Source: `src/features/finance-gateways/` ([approved module](https://github.com/devLoor1/super-admin-Loor/tree/4098158b1aa8f58ea20692f0e9bb177b36a49e97/src/features/finance-gateways)); route: `#/whitelabels/:whitelabelId/finance/gateways`. See [Finance / Gateways handoff](07-whitelabel-finance-gateways.md).

The tenant-scoped page prototypes gateway configuration, write-only credential status, simulated connection validation, local activation/deactivation, masked bank-account management, a conceptual modality summary and session-only activity. Save/discard and unsaved-change protection are local; state resets on reload. Providers, accounts and configuration are illustrative.

This module is configuration/governance only. It performs no provider request, banking integration, Investment/Payment/wallet mutation, Pix generation, refund, cashout, transfer or reconciliation. Provider catalogs, secret contracts, banking ownership, modality relationships, RBAC and audit remain Backend/Product work.

## Modalities / Rules V1

Source: `src/features/finance-modalities/` ([approved module](https://github.com/devLoor1/super-admin-Loor/tree/4098158b1aa8f58ea20692f0e9bb177b36a49e97/src/features/finance-modalities)); route: `#/whitelabels/:whitelabelId/finance/modalities`. See [Modalities / Rules handoff](08-whitelabel-finance-modalities-rules.md) and the [frontend review record](https://github.com/devLoor1/super-admin-Loor/blob/4098158b1aa8f58ea20692f0e9bb177b36a49e97/docs/whitelabel-finance-modalities-rules-v1.md).

The tenant-scoped catalog contains Equity and Debt only. Local enable/disable uses the shared Finance store; explicit disabled and never-configured states remain distinct. Detail shows overview, dependencies, rules and session activity. Search/filter and derived summary counts are illustrative, not operational aggregates. Enabled count includes locally enabled modalities whose gateway dependency is pending.

Rules are a **GENERIC STRUCTURAL PROTOTYPE**: six categories, two editable examples (manual approval and Opportunity-level configuration), derived availability and pending eligibility/document/limit concepts. Per-modality local save/discard and shared unsaved-change guards cover modality/tenant/navigation/Back/Forward/document exit. Regras gerais is read-only; it links to the sole modality-specific editor. Platform default → tenant override is conceptual, with no real default or inheritance resolver.

Any active local mapped gateway, including Sandbox, can satisfy the demo dependency; bank relationship remains **Relação não definida**. Rule choices/activity have a separate in-memory store; both stores reset on reload. This module has no business API, durable audit, operational cascade, Opportunity editor or financial mutation. Operation's separate Opportunity editor does not enforce these generic rule examples. Capital de Giro is not a modality; Segments and Resource Uses have a separate combined screen, without entering modality logic. Modality catalog, enablement effects, rules, inheritance and dependency contracts remain Product/Backend decisions.

## Segments / Resource Uses V1

Source: `src/features/finance-catalogs/` ([approved module](https://github.com/devLoor1/super-admin-Loor/tree/ec86b475e0126667e2fbece490730bdecc271584/src/features/finance-catalogs)); route: `#/whitelabels/:whitelabelId/finance/segments-resource-uses`. See [catalog handoff](09-whitelabel-finance-segments-resource-uses.md) and [frontend review record](https://github.com/devLoor1/super-admin-Loor/blob/ec86b475e0126667e2fbece490730bdecc271584/docs/whitelabel-finance-segments-resource-uses-v1.md).

One tenant-context screen presents two independent domains: Segments and Resource Uses. Each has its own records/IDs, create, list/read, update, delete, active/inactive state, search, status filter, sorting and local pagination. Collections/actions and drafts are separate within the in-memory catalog store; deleting a record removes it locally, while inactive retains it. Same-name records across catalogs are allowed; Capital de Giro exists independently in both illustrative catalogs without aliasing, synchronization or a mapping.

Same-catalog duplicate checks normalize case, accents and extra spaces. Name 2–60 characters and description up to 160 characters are **PROTOTYPE UX RULE** constraints, not authoritative Product/Backend validation. Tenant grouping does not settle domain ownership: global, per-Whitelabel, global plus overrides and global plus per-tenant enablement remain open. Deletion/usage protection, inactive meaning, reactivation, official seeds and final validation need contracts.

Changes/activity are local/session-only, survive in-app navigation and reset on reload. Operation Opportunities now consumes independent catalog references via the shared read snapshot. The catalog administration module still has no Opportunity CRUD/migration/assignment or authoritative reverse usage/count integration (displayed as `—`). Final consumption/retention semantics and single-versus-multiple cardinality remain unresolved despite prototype multi-select. Equity and Debt remain the only prototype modalities; no financial operation occurs.

## Operation V1

Three logically independent siblings share presentation/navigation, not mutation ownership:

| Module | Current frontend behavior | Canonical handoff |
| --- | --- | --- |
| Opportunities | Global list/search/filter/sort/page; local create/detail/edit/status/classification; tenant and Entrepreneur references; catalog consumption; session activity | [Chapter 10](10-operation-opportunities.md) |
| Investors | Global list and read-only profile; Accounts context, contextual KYC, illustrative amount-free Investment references/counts and navigation to Finance Investments filtered by Investor | [Chapter 11](11-operation-investors.md) |
| Entrepreneurs | Global list and read-only profile; Accounts/Company context, illustrative KYC, live local Opportunity relationship and cross-domain navigation | [Chapter 12](12-operation-entrepreneurs.md) |

All are **FRONTEND PROTOTYPED / INTEGRATION PENDING / E2E VALIDATION PENDING**. Their in-memory state/activity is non-persistent, non-authoritative and not audit. Accounts state changes do not automatically synchronize into Operation's seed projections. Accounts retains identity/access/account mutations, Compliance KYC decisions, and Finance financial operations. Official lifecycle, cardinalities, identity mappings and validation remain unresolved; no live business API integration is claimed.

## Complete Finance Core V1

Source: [approved Finance Core module](https://github.com/devLoor1/super-admin-Loor/tree/9f8abc6d55410e63a2edaf6d8efeafcd217b7a30/src/features/finance-core), [independent models](https://github.com/devLoor1/super-admin-Loor/blob/9f8abc6d55410e63a2edaf6d8efeafcd217b7a30/src/features/finance-core/shared/financeCoreModel.ts) and [frontend review record](https://github.com/devLoor1/super-admin-Loor/blob/9f8abc6d55410e63a2edaf6d8efeafcd217b7a30/docs/finance-core-v1.md). Status: **FRONTEND PROTOTYPED / READ-ONLY / SUPERVISORY PROTOTYPE / INTEGRATION PENDING / E2E VALIDATION PENDING**.

| Module | Current frontend scope | Canonical handoff |
| --- | --- | --- |
| Investments | Cross-Whitelabel list/search/filter/sort/pagination; read-only detail; explicit Investor/Opportunity/Payment/Wallet/movement references; session activity | [Chapter 13](13-finance-investments.md) |
| Payments / PIX | Global list/search/filter/sort/pagination; read-only detail; explicit Investment/Investor/Opportunity/Gateway/movement references; illustrative PIX traceability; session activity | [Chapter 14](14-finance-payments-pix.md) |
| Wallet | Global list/search/filter/sort/pagination; read-only detail; REPRESENTED BALANCE; separate movement records and contextual detail; Payment/Investment links; pending Transfer context; session activity | [Chapter 15](15-finance-wallet.md) |

Investment ≠ Payment ≠ WalletMovement ≠ Wallet balance. Frozen illustrative records remain independent; explicit references support navigation, not automatic synchronization. Investment Pendente/Ativo/Encerrado, Payment Pendente/Em processamento/Pago/Falhou, Wallet Ativa/Bloqueada, and movement Pendente/Concluído/Falhou with Crédito/Débito are **PROTOTYPE UX STATE MODEL / PROTOTYPE UX RULE**, not official workflows. `representedBalance` is not computed from displayed movements, not available/withdrawable or necessarily settled balance, and not a ledger guarantee. Wallet ownership/currency/cardinalities remain unresolved.

No payment execution, real PIX/QR/copy-and-paste/key, settlement, refund, reversal, transfer, cashout, deposit, withdrawal, balance adjustment, manual credit/debit, movement creation, reconciliation or real Gateway call exists. Session activity is local/non-persistent/non-authoritative, not audit. Operation owns participant/Opportunity context; Accounts owns account/access mutations; Compliance owns KYC; Gateways e contas owns credentials/provider configuration. Cross-domain read references do not transfer command ownership or authorization. Backend/Product lifecycles, synchronization, ledger, permissions, errors, concurrency and audit remain explicit [dependencies](matrices/backend-dependencies.md#finance-core-v1-dependencies) and [questions](open-questions.md#finance-core-cross-cutting).

## Navigation and management boundary

[App.tsx](https://github.com/devLoor1/super-admin-Loor/blob/d2a51753047d447983fe12145d53d9f42334e547/src/app/App.tsx) selects `#/dashboard`, `#/whitelabels`, Account Control/Settings/Emails, three tenant-scoped Finance configuration routes, Finance Core list/detail routes (chapters 13–15), Operation routes (chapters 10–12), and separate KYC/Audit list/detail routes (chapters 16–17); other hashes show Login. These routes retain the client session guard, not server-side authorization. [navigation.ts](https://github.com/devLoor1/super-admin-Loor/blob/d2a51753047d447983fe12145d53d9f42334e547/src/components/shell/navigation.ts) preserves the approved shell: Compliance → KYC, Auditoria top-level, tenant-preserving Finance configuration and global Operation/Finance Core destinations. Tenant Settings remains distinct from the unimplemented global utility Configurações. Unimplemented destinations, including Transfers, remain controlled notices.

Finance navigation comprises Gateways e contas, Modalidades e regras and Segmentos e usos dos recursos (configuration/governance), then Investimentos, Pagamentos / PIX and Wallet (financial supervision). Equity and Debt remain the only current modalities; Capital de Giro remains independently valid in Segment and Resource Use, never a modality.

Account Control, Settings, Emails, Finance configuration, Operation, Finance Core, KYC and Audit are business prototypes, not Backend-integrated. KYC supervision/local decisions and read-only Audit consultation now exist; real KYC decisions/documents/providers, authoritative audit infrastructure, Audit mutation/export, financial execution, Transfers, questionnaire editing, classification governance, generic entitlements and full email-template editing remain outside implemented scope. Investor profile display is read-only and global in the audited Core; the Settings capability switch is not a per-Whitelabel catalog/classification editor. No visual-library implementation details change these boundaries.

## Compliance / KYC V1

Source: [approved KYC module](https://github.com/devLoor1/super-admin-Loor/tree/d2a51753047d447983fe12145d53d9f42334e547/src/features/compliance-kyc). Status: **FRONTEND PROTOTYPED**. Routes: `#/compliance/kyc`, `#/compliance/kyc/:kycCaseId`; list context may use participant, Whitelabel and status. Global search/filter/sort/page/counts, case detail, metadata-only evidence review, local pending-issue add/resolve/reopen, local approval/rejection and ephemeral session activity are implemented. Prototype cases/states/IDs are not official contracts; no real document, persistence, decision or Account/access/financial effect exists.

Accounts retains identity/authentication/access/lifecycle; Operation retains participant projections. Investor/Entrepreneur Ver no Compliance opens a unique case or the participant-filtered list for none/multiple: frontend navigation, not authoritative cardinality. `kyc_proto_*` preserves existing prototype references only. Session actions do not change Accounts, Operation summaries, Finance or Audit. See the distinct [KYC chapter](16-compliance-kyc.md) and [decisions](open-questions.md#compliance-kyc).

## Governance / Audit V1

Source: [approved Audit module](https://github.com/devLoor1/super-admin-Loor/tree/d2a51753047d447983fe12145d53d9f42334e547/src/features/governance-audit). Status: **FRONTEND PROTOTYPED / READ-ONLY / IMMUTABLE FRONTEND PROTOTYPE**. Routes: `#/audit`, `#/audit/:auditEventId`, with optional resource/Whitelabel/actor/action context. Immutable illustrative list/filter/period/sort/page, actor/resource/tenant/result/time/correlation metadata, sanitized Campo/Antes/Depois, safe copy and source-resource navigation are implemented. No event append/edit/delete, source-domain write, rollback/restore/replay/reprocess or V1 export exists.

**KYC ≠ AUDIT. NO AUTOMATIC KYC → AUDIT SYNCHRONIZATION EXISTS.** Pre-seeded Audit KYC examples are not produced by local KYC decisions. KYC activity is lost on reload, not canonical Audit. Backend canonical source/emission, actor/taxonomy/time/diff/redaction, immutability/retention/query/RBAC and read-auditing policy remain unresolved. Gateways/Modalities contextual Audit links and Dashboard shortcuts are navigation only; live KPIs remain `Aguardando integração`. See the separate [Audit chapter](17-governance-audit.md) and [questions](open-questions.md#audit).
