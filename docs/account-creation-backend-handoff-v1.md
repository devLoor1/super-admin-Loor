# Account Creation — Backend Handoff V1

Date: 2026-10-26. Scope: Investor and Entrepreneur creation initiated by a Super Admin, plus preservation of the existing Whitelabel Administrator contract.

This is a frontend initiative and a Backend qualification handoff. It does not implement or authorize changes to Backend/Core, enable operational Investor/Entrepreneur creation, or extend the Settings/SMTP handoff. The account-creation experiments belong to the offline `mock` branch. Operational `dev` continues to use authoritative reads and the already qualified Administrator integration.

## 1. Evidence and qualification limits

| Repository / source | Inspected reference | Evidence and limitation |
| --- | --- | --- |
| Super Admin frontend | `dev` `9f7f71e328440972dfd63588e9e981fbb2ced673` | Current baseline; existing Administrator lifecycle source and maintained delivery documentation inspected. |
| Super Admin prototype | `mock` `e59a14bbe0150243d15cbf30fb1f9cac129344ea` before this initiative | Independent offline application, not an operational creation contract. |
| Nest Control Plane | remote `dev` and `homolog` `8d661ec581eff3b697136f7629b0331b70e531a6` | Current remote files read through the GitHub connector. Investor, Entrepreneur, Accounts, Administrator controllers and the outbound Core client inspected. This qualifies source, not parity with a running deployment. |
| Core / Adonis | local read-only source `1e8253192b29ddeed1011a99ef2be958ea7b259a` | Registration, validators, tenant resolution, models, terms, Admin Entrepreneur creation and onboarding inspected. Remote `dev` was observed at newer `08d5ef0b6146a162e9f4c7d5c5e2e37652cda2fe`; its file reads were unavailable through the connector. These Core findings must be rechecked against the Backend team's release before implementation. |
| Existing Administrator qualification | [Whitelabel Administrator Lifecycle V1](whitelabel-admin-lifecycle-v1.md) | Preserve its later correction/delivery findings as well as its historical qualification notes. Its accepted live QA must not be replayed for this initiative. |

The user-supplied earlier Control Plane reference `7b97004df17bf5167d1d3051c230e6e39d1134f4` is historical. The current source above was checked rather than assuming that reference remained current. No credential, token, real account record, private QA export or request secret belongs in this document.

Supported-browser reference inspection on 2026-10-26 also reached the public Investor registration at `https://homolog.loor.vc/wallet/register`: its visible password checklist specifies minimum six, uppercase, lowercase, digit and symbol, while a Terms card states that Terms have not been published and registration is unavailable. This is rendered UX evidence, not a successful registration or proof of current Core validation. It differs from the inspected Core's effective minimum eight and lack of an uppercase requirement. No account was created and no terms acceptance was performed. The actual local Entrepreneur `/auth` registration showed name, email, phone, password and static implied-terms text. Admin reference inspection reached the public login only, with no authenticated session. Screenshot references are recorded in this initiative's external UX evidence (Investor/Entrepreneur reference captures 15/16); no private export is included here.

### Source evidence

Control Plane, pinned to the inspected remote revision:

- [Investor controller](https://github.com/devLoor1/backend-super-admin-Loor/blob/8d661ec581eff3b697136f7629b0331b70e531a6/src/modules/investor/investor.controller.ts): GET list, detail and overview; no creation route.
- [Entrepreneur controller](https://github.com/devLoor1/backend-super-admin-Loor/blob/8d661ec581eff3b697136f7629b0331b70e531a6/src/modules/entrepreneur/entrepreneur.controller.ts): GET list, detail and overview; no creation route.
- [Accounts controller](https://github.com/devLoor1/backend-super-admin-Loor/blob/8d661ec581eff3b697136f7629b0331b70e531a6/src/modules/accounts/accounts.controller.ts): tenant GET list/detail and access pause/reactivate; no creation route.
- [Administrator controller](https://github.com/devLoor1/backend-super-admin-Loor/blob/8d661ec581eff3b697136f7629b0331b70e531a6/src/modules/administrator/administrator.controller.ts) and [service](https://github.com/devLoor1/backend-super-admin-Loor/blob/8d661ec581eff3b697136f7629b0331b70e531a6/src/modules/administrator/administrator.service.ts): existing dedicated Administrator commands, roles, Core forwarding and safe audit.
- [LoorCoreClient](https://github.com/devLoor1/backend-super-admin-Loor/blob/8d661ec581eff3b697136f7629b0331b70e531a6/src/integrations/loor-core/loor-core.client.ts): service-authenticated outbound transport, correlation IDs and error mapping.
- `src/common/guards/{jwt-auth,roles}.guard.ts`, `src/main.ts`: operator authentication, role authorization and `/api` global prefix.

Core paths below refer to the inspected local Core revision, not an independently qualified current remote file:

- `start/routes/auth/{index,investor,entrepreneur,admin}.ts`.
- `app/Controllers/Http/{Investor,Entrepreneur}/AuthController.ts`.
- `app/Validators/{Investor,Entrepreneur}/RegisterValidator.ts`, `start/validator.ts`.
- `app/Models/{Investor,Entrepreneur,Admin}.ts` and profile/email-verification migrations.
- `app/Services/Whitelabel/ResolveWhitelabelService.ts`.
- `app/Services/Legal/TermsOfUseService.ts`, `app/Models/WhitelabelTermsOfUseRevision.ts`.
- `app/Services/TokenService.ts`, `app/Helpers/MailSenderHelper.ts`, `app/Controllers/Http/Public/AuthController.ts`.
- `start/routes/admin/index.ts`, `app/Controllers/Http/Admin/EntrepreneurController.ts`.
- `app/Validators/Admin/Entrepreneur/StoreRequestValidator.ts`.
- `app/Services/Admin/Entrepreneur/CreateService.ts`, `app/Services/Admin/AdminWhitelabelService.ts`.
- `app/Services/Entrepreneur/CompanyInformationService.ts`, `app/Middleware/ConfirmedMail.ts`.
- `start/routes/app/index.ts`, `start/routes/investor/shared.ts`, `start/routes/entrepreneur/index.ts`.

Frontend reuse references:

- Super Admin: `src/features/whitelabel-accounts/admin/{AdminLifecycleActions,adminLifecycleContract,adminLifecycleClient}` and existing account parsers/routes.
- Admin: `admin-canvas/src/services/api.ts` (`createAdminEntrepreneur`, tenant scope and stripping one-time `temporary_password`) and `src/components/admin/companies/CompaniesPage.tsx`.
- Investor: `frontend/artifacts/loor/src/pages/investor/InvestorRegister.tsx`, `src/services/loorApi.ts`. This local frontend snapshot does not send the legal fields required by inspected Core; it is a UX reference, not payload authority.
- Entrepreneur: `empreendedor-loor/src/pages/auth.tsx`, `src/services/api.ts`. The separate `src/routes/auth.tsx` uses a mock store and is not the operational contract.

## 2. Existing contracts — confirmed source behavior

### 2.1 Investor self-registration

`POST /auth/investor/register` is a public Core registration entry point, not a CP Super Admin command. Mobile `POST /app/onboarding/register` reuses the same controller and additionally belongs to the mobile client-platform route group.

| Field | Existing Core validation / meaning |
| --- | --- |
| `email` | Required email; unique among non-deleted Investors of the resolved Whitelabel. |
| `password` | Required; nominal validator min 6/max 60, but the custom password rule effectively requires at least 8 characters, a lowercase letter, a digit and one character from `[#@$!%*?&.ç;]`. The resulting usable range is 8–60. Uppercase is not required by this Core rule. |
| `full_name` | Required string, maximum 256 characters. |
| `phone` | Required; Core custom rule accepts optional leading `+` followed by 5–18 digits. |
| `type` | Required exact enum `pessoa_fisica` or `pessoa_juridica`; this is not suitability classification. |
| `platform_slug` | Optional tenant-resolution input; not persisted as an account field. |
| `terms_accepted` | Required boolean and explicitly checked to be literal `true`. This represents the registering person's acceptance. |
| `terms_revision_id` | Required unsigned revision ID; must match the current revision of the resolved Whitelabel. |

The controller creates an Investor in `account_validation_status='waiting'`, stores the actual terms revision/acceptance time and a confirmation token within a transaction, then sends confirmation mail. Password hashing is the model's existing before-save behavior. Email starts unverified; the profile-completion database default is false. Company, address, banking, KYC and suitability completion are separate work.

The response is HTTP 201 with an Investor authentication token, configured for eight hours. It is an actor token for self-registration, not an artifact to return to a CP operator. Login rejects unverified email; protected business routes also apply confirmation/onboarding middleware.

Existing terms errors include `E_TERMS_OF_USE_NOT_ACCEPTED`, `E_TERMS_OF_USE_NOT_CONFIGURED` and `E_TERMS_OF_USE_REVISION_STALE`, all 422. A stale or missing revision is not permission to invent acceptance.

### 2.2 Entrepreneur self-registration

`POST /auth/entrepreneur/register` is also public Core self-registration. Required fields are `email`, `password`, `full_name`, `phone`; optional `platform_slug` resolves the tenant. Name, password and phone validation follow the same relevant rules above. Email uniqueness is scoped to the resolved Whitelabel.

The controller creates the Entrepreneur, sends confirmation mail, records its confirmation token and returns HTTP 201 with an Entrepreneur token configured for eight hours. Email verification remains pending and profile completion defaults to false. No Company, bank account, KYC approval or completed documents are created by this initial route.

The inspected Entrepreneur validator/controller does not record Investor-style legal acceptance fields. Portal copy that says registration implies agreement is not evidence of a revision-bound acceptance record. Backend must define the applicable policy for the new SA path.

### 2.3 Existing Admin-created complete Entrepreneur

`POST /admin/entrepreneurs` is protected by Core `auth:admin`. `AdminWhitelabelService.resolveForAdmin` treats the authenticated Admin as tenant authority: a non-super Admin cannot switch tenant with a slug/header; a Core Admin with `isSuperAdmin=true` may resolve another tenant. A CP operator token is not this identity.

The current tenant-aware validator requires:

- `email`, `full_name` (3–256), `phone`.
- `personal_information`: `cpf`, `rg`, `issuing_entity`, `gender`, `marital_status`, `birth_date`.
- `address`: `country_id`, `city`, `district`, `number`, `state`, `street_name`, `zip_code`; `complement` is optional/nullable.
- `company_information`: `cnpj`, `name`; optional/nullable `fantasy_name`, `phone`, `email`, and optional `validate`.

This is the Finapop complete-company workflow intended to avoid dependence on an Entrepreneur portal. `CreateService` generates a secure temporary password, marks email verified and personal information complete, creates profile/address, then upserts the canonical company information. It sends the existing set-password/recovery mail and returns `temporary_password` once plus `credentials_delivery.method='temporary_password_and_set_password_email'` and `set_password_email_sent`.

The Admin frontend strips the one-time temporary password at its API boundary; it does not persist it in the component model. Its detail read is `GET /admin/entrepreneurs/:id`, with authenticated tenant checks.

Do not copy this workflow wholesale into initial SA registration. Its full profile requirements and explicit verification bypass are different business rules. Company upsert occurs after the initial transaction commits; failures can therefore leave partial creation. A new bridge must qualify atomicity and recovery instead of assuming this service is an atomic account+company command.

### 2.4 Existing Whitelabel Administrator from Super Admin

Preserve and refine the existing integration rather than introducing another Administrator creation system:

| Operation | Existing CP contract |
| --- | --- |
| Create | `POST /api/whitelabels/:whitelabelId/admins`, `{email,password}`, HTTP 201, `SUPER_ADMIN`. |
| Read | `GET /api/whitelabels/:whitelabelId/admins` and `GET /:id`; `SUPER_ADMIN`, `SUPPORT_ADMIN`, `READ_ONLY`. |
| Edit | `PATCH /api/whitelabels/:whitelabelId/admins/:id`, changed `name?` / `email?` only, `SUPER_ADMIN`. |
| Access | Dedicated `PATCH /:id/activate` and `/deactivate`, `SUPER_ADMIN`; not an invitation state transition. |

Create accepts email/password only; name is supplied later through supported edit. The existing frontend normalizes and validates email and requires an 8–60-character password compatible with Admin login. The qualified Core create implementation explicitly checks minimum length 8 but does not enforce all frontend email/max-length restrictions. Admin email uniqueness is global, unlike Investor/Entrepreneur tenant-scoped validation. Core creates `isSuperAdmin=false`, tenant-scoped, with initially effective active access and hashed, non-serialized password.

There is no invitation, generated password, mail dispatch, role assignment or password-reset command in this creation contract. A projected `invitation='accepted'` value is not evidence of a delivered or accepted invitation and must not be shown as one. Do not fabricate Investor-style verification or terms fields for an Administrator.

Dedicated GETs retain an extra transport envelope: detail `{data:{data:Admin},status:200,correlationId}`; list `{data:{data:Admin[],meta},status:200,correlationId}`. Commands return unwrapped `{data:Admin}`. Tenant Accounts reads use their existing distinct envelopes. Preserve the narrow parsers and the later qualified name readback correction documented in the lifecycle delivery.

Existing create errors include missing tenant 404 `E_WHITELABEL_NOT_FOUND`, duplicate global Admin email 422 `E_EMAIL_TAKEN`, and invalid required values 422 `E_VALIDATION`. Operator authentication/role 401/403 differs from CP mapping of Core dependency errors to 502. These existing meanings are not replaced by the proposed error vocabulary below.

Passwords remain outside storage, logs, audit payloads, drafts and recovery ledgers. The current UI clears its password DOM ref on dispatch. Preserve one-shot dispatch, session/version checks, uncertain-result locking and authoritative GET reconciliation.

## 3. Missing supported bridge

Current CP Investor/Entrepreneur controllers expose only list/detail/overview. Tenant Accounts exposes reads and access commands, not account creation. No supported CP creation route was found at the current inspected remote revision.

Neither calling a public self-registration route with operator credentials nor calling an `auth:admin` route with a CP `SUPER_ADMIN` JWT is a supported substitute. The CP uses `LoorCoreClient` to mint its own service credential for `/internal/super-admin/v1`; keep this boundary and existing authenticated integrations intact.

Reuse candidates are the existing model hashing, tenant lookup, validators, token/mail helpers and legal revision service. General Investor/Entrepreneur registration currently lives in the auth controllers, so Backend may need to extract shared domain logic. Keep actor session creation and actual participant consent at the self-registration edge; do not duplicate account systems or reuse controllers by fabricating an actor request.

## 4. Proposed initial-creation contract — requires Backend decisions

Everything in this section is a proposal. It is not an implemented endpoint, an approved credential policy, or an operational frontend capability.

### 4.1 Route shape and payload

| Proposed CP route | Proposed internal Core route |
| --- | --- |
| `POST /api/whitelabels/:whitelabelId/investors` | `POST /internal/super-admin/v1/whitelabels/:whitelabelId/investors` |
| `POST /api/whitelabels/:whitelabelId/entrepreneurs` | `POST /internal/super-admin/v1/whitelabels/:whitelabelId/entrepreneurs` |

Both would require authenticated CP `SUPER_ADMIN` and the existing CP-to-Core service boundary. Explicit DTOs must reject unknown fields; a broad `Record<string,unknown>` must not accidentally permit verification, legal acceptance, role or tenant overrides.

Proposed initial request:

```json
{
  "fullName": "Pessoa de demonstração",
  "email": "pessoa@example.com",
  "phone": "11999999999",
  "type": "pessoa_fisica"
}
```

`fullName`, `email`, `phone` are required. `type` is required only for Investor (`pessoa_fisica|pessoa_juridica`); it is absent and rejected for Entrepreneur. The bridge maps to Core's existing `full_name`/`type` semantics. These are logical fields for initial registration, not an assertion that the current model can create a passwordless account.

No optional company/banking/KYC fields are proposed in this first command. Optional onboarding information belongs to separately qualified stages; introducing it later must not make it silently mandatory. The path tenant is canonical; do not add a competing body slug/Whitelabel ID. If an API convention requires a slug, Backend must resolve it to the same canonical tenant and reject mismatches rather than choose a fallback.

Names/email/phone need server-side validation and documented normalization. Reuse existing enum rules, but reconcile the Core/portal phone and password discrepancies before publishing a common specification. Preserve intentional name characters; do not normalize identity fields using assumptions from visual presentation.

### 4.2 Credentials, verification and terms — release blockers

Backend/Product must explicitly choose and document the initial credential strategy. Current self-registration expects a password; the existing complete Admin Entrepreneur flow generates credentials and bypasses verification. Neither provides an automatically approved lightweight SA policy.

Until qualified, the prototype records credentials as **not provisioned**, email verification as **pending**, and legal acceptance as **pending**, with no claims of sent mail or external credentials. It does not call a recovery endpoint, create an invitation, display a password-reset flow, or collect consent on another person's behalf.

The chosen production design must specify:

1. Whether a pending enrollment record or an actual restricted account is created, and how existing non-null password/model requirements are satisfied safely.
2. How the participant establishes credentials through a qualified existing mechanism; who may see any one-time credential; hashing, lifetime and log/readback exclusion.
3. How email is confirmed by the participant, with a tenant-bound token and canonical participant frontend origin. Do not reuse the Admin complete-company verification bypass implicitly.
4. How the actual participant accepts the current tenant Terms revision and how the server records that evidence. Investor self-registration cannot be reused with invented `terms_accepted=true`.
5. What access remains blocked until credentials, verification, legal and business onboarding prerequisites are met. Existing email-only login checks are not proof of legal enforcement for a newly introduced pending flow.
6. How mail/token delivery failure differs from account persistence failure, and how pending work is recovered without duplicating accounts.

Do not return Investor/Entrepreneur actor session tokens to a Super Admin. No UI or DTO may set `emailVerifiedAt`, `termsAcceptedAt`, `termsRevisionId`, `personalInformationFilled`, KYC approval or business-access approval as completed initial state.

### 4.3 Initial state and onboarding separation

Existing Investor self-registration uses business state `waiting`; both participant types start with email/profile pending. A new bridge should preserve those meanings where supported and expose pending legal/credential requirements explicitly. Exact wire status fields/enums require Backend agreement; the frontend must not invent a new authoritative `registration_pending` enum or equate pending with a paused account.

Registration establishes identity and tenant. Profile details, Investor PF/PJ company details, Entrepreneur company creation, address, suitability, KYC, documents, banking and opportunity eligibility remain separate qualified stages. The Finapop full-company Admin command can remain a distinct workflow where its actual business rules apply.

Every onboarding status in a readback must identify its source and authoritative meaning. Synthetic stage exploration in `mock` must remain visibly simulated and must not report real compliance approval, external provisioning or accepted terms.

## 5. Identity, authorization, duplicates and audit

- Resolve `whitelabelId` server-side to the canonical tenant record. Decide/document eligibility for inactive tenants; do not silently claim this restriction already exists in Administrator creation.
- Enforce CP role checks and Core internal service authentication independently. SUPPORT_ADMIN, COMPLIANCE_ADMIN and READ_ONLY do not gain creation rights from visible buttons, readiness flags or Menu Visibility.
- Scope every identity as `(tenant, account kind, account id)`. Investor, Entrepreneur and Administrator numeric IDs are separate spaces. Equal IDs do not establish the same account.
- Define duplicate email handling per kind and tenant, soft-deleted record policy and cross-kind identities. Preserve existing global Administrator uniqueness unless a separately authorized migration changes it.
- Enforce duplicate protection atomically; validation queries alone do not prevent races. Return a stable conflict without reattaching an existing identity or exposing another tenant's details.
- Audit creation attempt and result with operator ID, canonical tenant, kind, resulting ID, correlation/operation ID and safe field summaries. Do not audit passwords, tokens or complete personal payloads.
- The existing Administrator service uses best-effort audit after Core; absent/failed audit is not proof the account was not created. For new flows, document cross-service consistency and recoverable audit failures without replaying the business write.
- Keep existing access, Settings/SMTP, Menu Visibility, financial and compliance permissions untouched.

## 6. Idempotency and uncertain-response recovery

New participant creation needs a server-enforced idempotency contract; the existing Administrator frontend's exact-email reconciliation is not an idempotency service.

Propose an `Idempotency-Key` header scoped to authenticated operator, canonical tenant and account kind. The same key and canonical payload must return the original operation/result; the same key with a changed payload must conflict. Document retention/expiry, concurrent requests and whether an expired key can be reused. Never include credentials or raw personal data in a readable key.

Persist the operation/identity relationship atomically enough to recover after a dropped response, CP timeout, Core 5xx or mail/audit failure. A no-response or 502 may mean creation committed. Never automatically retry a POST or generate another key just because the UI timed out.

Backend must expose authoritative lookup by operation/key, or an equivalent qualified mechanism. A possible route is `GET /api/whitelabels/:whitelabelId/account-creation-operations/:operationId`; this route is also proposed and must be agreed before a client depends on it. Its result should distinguish pending, committed, rejected and unresolved without leaking secrets.

Without a qualified operation receipt, an exact normalized email search over all required, stable tenant/type pages followed by exact detail can identify a matching account. It does not prove that the attempted command created it. Present “readback matches; origin unconfirmed” and keep retry blocked. An empty page, substring result, stale list or missing audit record does not establish safe non-creation.

On session replacement, tenant/type change, cancel or navigation, preserve only safe operation identity needed to recover. Abort of a client request does not roll back Core. Scope late responses to their originating session/tenant and prevent success from appearing in another context.

## 7. Authoritative response and GET readback

A successful proposed POST should return a stable receipt plus the supported account identity, not an optimistic echo. Agree exact envelopes with existing parsers; no arbitrary recursive unwrapping.

Required response semantics: account kind/id, canonical Whitelabel ID, safe identity fields, actual initial state, onboarding prerequisites, operation/correlation identifiers and creation origin where supported. Credential values, hashes and actor tokens are excluded. Status fields must truthfully distinguish pending verification/legal/setup from completed actions.

Reuse the existing tenant Accounts read boundary after Backend qualification:

- `GET /api/whitelabels/:whitelabelId/accounts/:accountId?tipo=investidores`
- `GET /api/whitelabels/:whitelabelId/accounts/:accountId?tipo=empreendedores`
- Existing `GET /api/investors/:id` and `/api/entrepreneurs/:id`, and their overview routes, supply domain detail when the bridge supports that relationship.

After accepted creation, verify exact kind/id/tenant and relevant fields/states through authoritative GET before presenting confirmed persistence or navigating to a created record. Missing, wrong-kind, wrong-tenant, malformed, stale or unsupported state responses remain unconfirmed. A syntactically valid 201 or changed timestamp alone is insufficient.

Creation-origin proof should come from the idempotency/operation relationship, not merely email coincidence. Cross-tenant detail must fail closed. Lists/overview must become consistent with the created identity without mock fallback.

## 8. Proposed validation and error vocabulary

These are requirements for the new routes, not existing verified error codes. Backend should publish exact machine codes and safe messages before frontend integration.

| Condition | Proposed behavior |
| --- | --- |
| Missing/invalid operator session | 401; existing central session handling. |
| Authenticated operator lacks creation role | 403; no mutation. |
| Missing or inaccessible tenant | 404; no alternate-tenant fallback. |
| Tenant policy rejects initial creation | Explicit stable 409/422 decision and code. |
| Invalid name/email/phone/type, unknown field | 422 or agreed DTO 400 with safe field errors; no mutation. |
| Duplicate identity / concurrent uniqueness conflict | Stable 409 and account-kind/tenant-safe message; do not expose unrelated records. |
| Idempotency key reused with changed input | 409; preserve original operation. |
| Credential/legal enrollment policy unavailable | Explicit blocked result; do not create a deceptively usable account. |
| Committed identity but mail/audit delayed/failed | Persisted receipt with pending delivery/audit recovery; do not misreport safe-to-retry non-creation. |
| Dependency timeout/network/5xx or malformed success | Uncertain until operation/GET reconciliation; preserve correlation/operation identity and block blind retry. |

Map current Core dependency errors through the CP transport deliberately. Core 401/403 currently maps to CP 502; that must not be confused with the operator's own CP authorization denial. Return safe field/code/correlation metadata without raw Core payloads or secrets.

## 9. Acceptance criteria before operational promotion

1. Backend confirms current Core/CP source and deployed revisions, OpenAPI, canonical routes, DTOs, envelopes and field/state meanings. Existing versus proposed behavior is unambiguous.
2. Investor and Entrepreneur creation use supported CP/internal-Core routes and shared domain logic. No CP token reaches public actor/Admin registration, no actor token reaches the operator, and no duplicate account system is introduced.
3. Required/optional fields match agreed initial-registration rules. PF/PJ is the canonical Investor enum. Full company/profile/banking/KYC data is not forced by reusing the specialized Finapop command.
4. Credential, participant verification and legal policies are approved and enforced by Backend. Initial records never claim completed verification, participant consent or compliance unless the actual authorized participant action occurred.
5. SUPER_ADMIN succeeds; denied roles and missing/expired sessions fail. Tenant mismatch, wrong kind, equal IDs across domains, stale-session responses and cross-tenant reads fail closed.
6. Email normalization/uniqueness, soft-delete policy and concurrent duplicate races have deterministic, tenant-safe outcomes. Existing global Administrator duplicate semantics remain intact.
7. Same-key retries and concurrent dispatch create one identity; changed payload conflicts. Applied-but-response-lost, timeout, malformed 2xx and late responses recover without another account.
8. Company/mail/token/audit failure and partial-commit cases have documented persisted state and recovery. Client cancellation and transport abort are not presented as rollback.
9. Exact authoritative GET confirms identity, tenant, kind, fields and actual initial states. List/detail/overview agree; no invented readback, mock data, recursive envelope guessing or false success.
10. Passwords/tokens are absent from logs, audit, browser persistence, telemetry, drafts, QA exports and ordinary readback. Any approved one-time credential delivery is narrowly qualified and tested separately.
11. Existing Administrator UI/client, credential clearing, single-dispatch locks and uncertain reconciliation are reused. No invitations, roles, reset-password functionality or verification/terms assertions are added to that contract.
12. Offline mock QA proves all three synthetic flows, cancel/discard, tenant isolation, validation, reset and synthetic readback without Backend calls. Operational gates and focused authenticated browser QA pass before enabling participant creation in `dev`.

Frontend completion of the mock does not satisfy these Backend gates. Until the new contracts are qualified, operational Investor/Entrepreneur creation remains unavailable; the accepted Administrator integration continues under its existing contract.
