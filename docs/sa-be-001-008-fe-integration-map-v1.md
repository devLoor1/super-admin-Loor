# SA-BE-001–008 — frontend integration map V1

2026-10-22. Scope: reconcile exactly eight capabilities; implement **only SA-BE-006 read**. No business/compliance/financial write is authorized by this map.

## Baseline and evidence

- FE canonical `dev` / `origin/dev`: `6969a89d545f31edc84eaf95a013e1d8d99cd6e6`; all 12 existing FE worktrees clean before work. Isolated branch `feature/sa-be-integration-map-kyc-read-v1` starts here.
- Protected `main`: `c2235ac5d0d65408e9d39bf836a1a717da3d95ae`; handoff: `89a3b5058f52f981b3a1b06756d7f33a2a043f27`. Neither is modified.
- Control Plane (CP) fetched `origin/dev` / `origin/homolog`: `73ccb918ae4e22be1e16d3ab6ab12a215d3f2916`, following `d7818cd59c9091d11fe0a2881faf2a2c504a52c0`. Inspected via `git show`; old Backend worktree left at `9513cb3`, clean, unchanged.
- Core fetched `origin/dev`: `9e26c7c7e68ca42c5aebc6188d3cc73005dbf362`; checkout left at `fe054bb`, clean. No Backend/Core checkout, file, commit, infrastructure or configuration changes.
- Existing official homolog: `https://loor-super-admin.netlify.app`; API `https://backend-super-admin-loor.onrender.com/api`. Starting FE deployment `6ad97260e55af5fb2e344ef8`, JS `index-EF3BIJzN.js`, CSS `index-BEvkOyBO.css`.
- Source references: CP `docs/sa-be-specs-status-v1.md`, module controllers/services/DTOs at the SHA above; Core `app/Controllers/Http/Internal/SuperAdmin/*`, corresponding services, validators and `AccountPausedException`. CP health and Core health do not expose a release SHA: exact running Backend/Core SHA is **not independently proven**. Successful live contracts establish behavior, not binary provenance.

Evidence classes below: **S** inspected source; **R** Backend team's reported delivery/smoke (not our persisted-write proof); **G** direct authenticated homolog GET this execution; **F** implemented frontend; **U** browser-tested frontend; **M** verified persisted mutation. Historical read evidence remains in each module's existing integration document. No new M evidence is collected here.

Live KYC gate: existing built-in session, `GET /auth/me` 200 / SUPER_ADMIN (correlation `e1daa514-d3fc-423c-89a0-510c50e22d0e`); KYC list 200 (`aa2e34d1-9efc-4762-9420-6f47f7f57e37`), detail 200 (`c38a1c34-cba2-416d-8c7e-2cac7eae2dc7`). Structure/count/status-only evidence; no personal payload stored. See [KYC integration checkpoint](compliance-kyc-read-integration-v1.md) for implementation/release status.

## Eight-capability matrix

### SA-BE-001 — Opportunities Admin parity

- **FE route/component/state:** `#/operation/opportunities`, `/:id`; `operation/opportunities/{OpportunitiesPage,OpportunityDetailPage,opportunityApi}`. Authoritative list/detail **F, historical U**; writes disabled/unavailable, not Backend-absent. No change in this execution.
- **API/ownership (S,R):** CP `/api/opportunities`: GET list, GET `/:id`, POST create, PATCH `/:id`, POST `/:id/{approve,deny,archive}`. GET `/helpers/{entrepreneurs,contracts,investor-profiles}?whitelabelId=…`. Core owns Opportunity, lifecycle and validators; CP proxies, guards and audits. New writes/helpers not directly exercised here; no M.
- **Fields/identity/query:** numeric Core Opportunity ID; existing read projection includes name/businessName/status/modality/tenant/owner/taxonomy/lifecycle dates. List page/perPage≤100/search/whitelabelId/status/modality/sort/order. Create requires whitelabelId + entrepreneurId and Admin `StoreRequestValidator` nested opportunity/monetary/debt-or-equity/members/address/bank/PIX fields. PATCH uses the Core editable-field/state matrix, not a generic form dump. Approve uses contract_id, optional investor_profile_id/fee/dates/grace/penalties and optional complete PAG groups. Archive/deny require reason. Reconcile exact per-state fields before a write batch.
- **RBAC/context:** reads SUPER_ADMIN/SUPPORT_ADMIN/READ_ONLY; writes SUPER_ADMIN. Validate tenant, active WL and owner membership; contracts belong to tenant; investor-profile catalog is global despite tenant-validated helper access.
- **Reuse/isolation:** retain approved list/detail/shell/dialog patterns; never enable prototype create/edit/local success against real IDs. `deny` persists **archived**, CP intention `DENY_OPPORTUNITY`; no invented denied status.
- **Gap/risk/acceptance:** separate authorized write batch, high lifecycle/provider/public-exposure risk; dedicated disposable tenant/owner/contract, payload/readback/state matrix, duplicate prevention and per-action authorization. Acceptance: exact ID/context, persisted create/edit, review→active or archive-with-reason + audit without financial replay. Suggested batch **P2 Opportunity write parity**, after read integrations and explicit mutation authorization.

### SA-BE-002 — Whitelabel Admin lifecycle

- **FE route/component/state:** `#/whitelabels/:id/accounts?tipo=administradores`, `whitelabel-accounts/{WhitelabelAccountsPage,AccountListPanel,AccountDetailPanel,accountsApi}`. Authoritative tenant account reads **F, historical U**; Admin writes unavailable, not integrated. No new G/M.
- **API/ownership (S,R):** `/api/whitelabels/:whitelabelId/admins`: GET list/detail, POST create, PATCH `/:id` name/email, PATCH `/:id/activate`, PATCH `/:id/deactivate`. Core tenant Admin ≠ CP Operator; CP audit/authorization. Reset-password and resend-invite **not delivered**.
- **Fields/identity/query:** composite (tenant, admin ID); page/perPage/search/order on list. Body name/email whitelist, authoritative access/business/invitation states and timestamps from GET; do not equate activation with email verification/invitation.
- **RBAC/context:** reads SUPER_ADMIN/SUPPORT_ADMIN/READ_ONLY; writes SUPER_ADMIN, selected real tenant mandatory.
- **Reuse/isolation:** existing account detail/actions layout; remove local mutation/success paths only in the later authorized integration. Do not promise reset/invite or reinterpret CP operator roles.
- **Gap/risk/acceptance:** **P2 Accounts lifecycle**; explicit disposable Admin authorization + identity/tenant checks, before/after GET/reload, restore access safely, document audit. No real operator lockout or password handling. Product must distinguish activation from access pause; unsupported reset/invite remain unavailable. S/R is not M.

### SA-BE-003 — Real account pause/reactivation

- **FE route/component/state:** same tenant Accounts views, Investor/Entrepreneur profile access badges. Reads **partially integrated**; pause/reactivate controls are unavailable; a badge does not prove enforcement.
- **API/ownership (S,R):** POST `/api/whitelabels/:whitelabelId/accounts/:accountId/{pause,reactivate}?tipo=investidores|empreendedores|administradores`; pause `{reason}`. Core `SuperAdminAccountAccess` owns persisted access state; Core guard/login enforcement returns **403 ACCOUNT_PAUSED**, including existing protected sessions. CP guards/audits. No new G of paused access, no M or enforcement smoke here.
- **Fields/identity/query:** (tenant, actor type, numeric actor ID), accessState/reason/pausedAt/updatedAt; never infer shared identity from equal IDs. Use official tipo mapping; do not reuse unsupported access filtering as though globally applied.
- **RBAC/context:** command SUPER_ADMIN/SUPPORT_ADMIN; account GET also COMPLIANCE_ADMIN/READ_ONLY. Core enforcement applies investor/entrepreneur/admin, not CP Operator identity.
- **Reuse/isolation:** existing access badge and confirmation dialog; no local paused-state masquerading as persistence, no unrelated account/profile/Finance effects.
- **Gap/risk/acceptance:** **P2 paired with 002**, explicit disposable actor and independent authorized session required. Verify login + pre-existing token 403 and post-reactivation recovery; readback badge alone insufficient. No pausing during this task. Product reason/audit copy and recovery policy before broad rollout.

### SA-BE-004 — Investor 360°

- **FE route/component/state:** `#/operation/investors/:id`, `operation/investors/{InvestorDetailPage,investorApi}`. Authoritative basic detail **F/historical U**, overview adapter **missing**; relationships currently unavailable, not real 360 integration.
- **API/ownership (S,R):** GET `/api/investors/:id/overview` → Core `InvestorOverviewService`; CP proxy. No direct G for overview here, no M.
- **Fields/identity/query:** numeric Investor ID; `{data:{investor,account,personalData,banking,kyc,summary,wallet,recentInvestments,recentPayments}}`. Summary investment/payment counts, investedAmountCents; recent lists capped 10, not complete ledgers. KYC includes `faceMatch.id` (possible future explicit case link). Banking omitted. Wallet is **WL ledger**, never personal Investor balance.
- **RBAC/context:** SUPER_ADMIN/SUPPORT_ADMIN/COMPLIANCE_ADMIN/READ_ONLY; tenant attached to Investor and Wallet must stay explicit.
- **Reuse/isolation:** retain tabs/cards; replace unintegrated relationship panels only from validated overview data; no participant fixtures to enrich gaps, no automatic domain synchronization.
- **Gap/risk/acceptance:** **P1 360 read batch** with 005. Clarify conflicting KYC aggregate definitions: overview currently accepts either approved provider; KYC case composite requires both. Do not overwrite authoritative case status. Verify money units/nulls/caps, masked identity, WL Wallet disclaimer, case-ID relationship, network/roles and real reload. Read-only QA only.

### SA-BE-005 — Entrepreneur 360°

- **FE route/component/state:** `#/operation/entrepreneurs/:id`, `operation/entrepreneurs/{EntrepreneurDetailPage,entrepreneurApi}`, Company read panel. Authoritative basic profile/Company read **F/historical U**; overview adapter missing/relationships partial.
- **API/ownership (S,R):** GET `/api/entrepreneurs/:id/overview` → Core `EntrepreneurOverviewService`, no new direct G/M.
- **Fields/identity/query:** `{data:{entrepreneur,account,company,banking,tools,summary,opportunities,documents},cardinality}`. **1 Entrepreneur→0..1 Company**; company:null valid, no manufactured Company. Numeric domain IDs; opportunities capped 50; summary.byStatus derives that capped list, while opportunitiesCount/activeOpportunities are full queries. totalRaisedCents:null is unavailable, not zero. Empty documents/tools modules do not prove a complete document inventory/disabled entitlement.
- **RBAC/context:** SUPER_ADMIN/SUPPORT_ADMIN/READ_ONLY; preserve owner/tenant/cardinality and independent Opportunity lifecycle.
- **Reuse/isolation:** approved profile/Company/Opportunity cards; no prototype Company or opportunities, no inferred banking/tool flags.
- **Gap/risk/acceptance:** **P1 with 004**. Clarify complete-vs-capped byStatus and document/tool availability before global counts. Validate both Company present/null, safe masked CNPJ, counts/caps, readback and no writes. All source contracts exist; remaining FE work is not Backend absence.

### SA-BE-006 — Detailed KYC read (this execution)

- **FE route/component/state:** `#/compliance/kyc`, `/:id`; `compliance-kyc/{KycListPage,KycDetailPage,KycUi,kycModel,kycRefs,kycLinks,kycStore,prototypeKyc}`. Baseline **prototype/mock** list/detail and in-memory review/issues/decisions; migration gated and in progress. Dashboard KYC KPI remains unavailable, unchanged.
- **API/ownership (S,R,G):** GET `/api/compliance/kyc?page=1&perPage=20`, GET `/:id`, CP proxy to Core KycQueryService. Both 200 this execution. **Numeric FaceMatch ID**, not Investor/Account ID or `kyc_proto_*`. List = FaceMatch-backed Investor cases, not Entrepreneur/all possible KYC checks. Source comment's `bureau:{investorId}` fallback is not implemented by query/detail; do not support it.
- **Fields/query:** `{data:[id,status,investorId,investorName,whitelabelId,faceMatchStatus,updatedAt],meta:{page,perPage,total,lastPage}}`; live 20/1547/78. Detail `{data:{id,investor,whitelabel,status,personalDataValidation,document,ocr,bureau,faceMatch,manualReview,history}}`. Only page/perPage sent for V1; Core source search exists but not independently live-qualified. Core tenant filter is not in CP generic pagination DTO; do not expose it. sort/order accepted generically but Core forces ID-desc; no invented control.
- **RBAC/context:** source SUPER_ADMIN/COMPLIANCE_ADMIN/READ_ONLY; direct G only SUPER_ADMIN. Other roles synthetic; no impersonation.
- **Reuse/isolation:** preserve shell/Dot Matrix/list/detail composition. Dedicated validated adapter + session-scoped reads; remove operational prototype actions/history, unsupported filters/global summaries. Never enrich identities from fixtures; cross-module unresolved case links go truthfully to list/unavailable.
- **Gap/risk/acceptance:** **P0 current batch**, GET-only; privacy allowlist, masked IDs, no raw OCR/images/provider payload/score/manual decisions. Full field/null/identity/pagination/privacy/session tests + built production browser + actual case detail/reload/navigation + official deployment evidence. No case creation/decisions. Exact running BE SHA still unproven; meaningful list/detail contract itself directly proven. See separate KYC document for final status.

### SA-BE-007 — Control Plane Operators

- **FE route/component/state:** no dedicated Operator CRUD route/component in current navigation; shell operator menu only identifies current session. **Missing UI**, not tenant Administrators or a new Accounts tab by assumption.
- **API/ownership (S,R):** CP/Prisma `/api/operators`: GET list, GET `/:id`, POST create, PATCH `/:id`, PATCH `/:id/{activate,deactivate}`, PUT `/:id/roles`. No Core owner; no new direct G/M.
- **Fields/identity/query:** CP CUID ID; name/email/status/roles/roleDetails/lastLoginAt/createdAt/updatedAt; page/perPage/search/order. Create name/email/password/roles (Argon2 server-side); update name/email; roles explicit whitelist. Self-deactivation/last active SUPER_ADMIN guards exist in source, not concurrency-proof evidence.
- **RBAC/context:** SUPER_ADMIN only, global CP, no tenant context substitution.
- **Reuse/isolation:** shared list/dialog/status patterns only after Product approves route/placement. Never reuse Core Admin IDs, credentials or role store; never log passwords.
- **Gap/risk/acceptance:** **P3 privileged security administration**, explicit Product/RBAC/credential handoff and isolated synthetic Operator authorization required. Verify guards/roles/audit and recovery without locking out last operator. No role/access mutation in current task.

### SA-BE-008 — Advanced Audit filters

- **FE route/component/state:** `#/audit`, `/:id`, `governance-audit/{AuditListPage,AuditDetailPage,auditApi,auditRoute}` and Dashboard Recent Audit preview. Authoritative list **F/historical U**; detail only uses the selected authoritative list record, direct/reloaded detail honestly unavailable (no detail endpoint). Advanced query filters **partially integrated/missing**, not absent Backend.
- **API/ownership (S,R):** GET `/api/audit`, CP Prisma canonical governance history; no Core mutation, no authoritative GET `/:id`. Current FE sends page/perPage/search/order. New DTO accepts operatorId/action/resourceType/resourceId/whitelabelId/result/from/to; result success|failed; date validation and server ordering. No new direct filter G/M here; historical Audit/preview G retained.
- **Fields/identity/RBAC:** CP event CUID; action/resourceType/resourceId/operator/tenant/result/createdAt; metadata sanitized. Read SUPER_ADMIN/COMPLIANCE_ADMIN/READ_ONLY (controller source; SUPPORT_ADMIN is not included). Tenant nullable = global event, not failed lookup. Identity filters require actual domain ID, not prototype refs.
- **Reuse/isolation:** retain list/detail unavailable semantics and Dashboard preview; extend URL/query parsing in separate batch, remove stale 'Backend unsupported' descriptions only when adapters are delivered. No per-page filter presented as global and no prototype history substitution.
- **Gap/risk/acceptance:** **P1 advanced read filters**, explicit supported fields/timezone/empty/403/meta tests + direct GET evidence. No business actions/rollback/delete from Audit. Keep null actor/tenant honest and sensitive metadata minimized. No write authorization required for GET, but additional integration is outside this execution.

## Cross-module sequence and boundaries

1. Current KYC read, then 004+005 overview read (independent models/adapters), then 008 advanced Audit reads. Case IDs must be proven via explicit relationship, not coincident numbers. No KYC→Audit synthesized events.
2. Separate approved Accounts batch 002+003: account access belongs to Accounts/Core authentication, KYC cannot pause/activate. Separate Opportunity write parity 001; Finance remains supervisory and no approval/provider action is implied by read integration.
3. Operator 007 is distinct CP security administration; Product decides route and privileged workflow before implementation. Never merge it into tenant Admin ownership.
4. Clarifications: KYC Investor-only population/Entrepreneur coverage/future Dashboard KPI; overview-vs-case KYC normalization; capped Entrepreneur byStatus; unsupported document/tool completeness; exact Backend/Core deployed SHA observability; broad concurrent lifecycle safety and safe recovery. None is permission to invent states or modify Backend.

## Checkpoint

Stage A source mapping complete; KYC Stage B list/detail gate passed (200, masks verified, actual case ID). No non-idempotent QA action occurred. Only KYC read implementation/tests/release may follow. Implementation/release outcome is maintained in the companion KYC document; other seven remain map-only.
