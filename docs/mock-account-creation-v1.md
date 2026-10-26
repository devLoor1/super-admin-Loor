# Account creation demonstration V1

This document describes only the permanent offline `mock` branch. The demonstration does not qualify a Backend creation contract, perform account provisioning, send email, accept terms, complete KYC, create a Company, or execute a financial operation. Backend requirements belong to the separate account-creation handoff.

## Entry and scope

Open numeric tenant Accounts, for example `#/whitelabels/1/accounts`, and select the desired Whitelabel and account type. The existing Accounts tabs, tenant lookup, synthetic transport and current detail parsers remain in use. The older independent gallery at `#/mock/accounts/wl_proto_01` remains available with its previous behavior.

Investors and Entrepreneurs use coordinated creation forms scoped to the selected numeric Whitelabel. Administrators reuse the existing credential-based creation implementation and its documented payload; no parallel invitation, role-assignment or password-reset flow is introduced.

## Participant form and review

1. Select the Whitelabel and account type.
2. Enter full name, email and phone. Investor additionally selects Pessoa física or Pessoa jurídica.
3. Review the initial registration and its pending onboarding responsibilities. Return to the form to edit the draft before creation.
4. Confirm synthetic creation. The receipt identifies the selected Whitelabel and newly assigned synthetic record.
5. Open the created account through the existing scoped Accounts detail, or inspect its existing Investor/Entrepreneur domain view.

Banking, Company, documents and KYC are not required during this initial registration. The form does not ask the operator to impersonate the participant's legal acceptance or email verification. Exploring onboarding explanations does not complete those stages.

## Draft, cancellation and reset

Participant drafts live only in JavaScript memory and are keyed by both tenant and account kind. Investor tenant 1, Investor tenant 2 and Entrepreneur tenant 1 have independent drafts. Partial edits preserve the other draft fields. Store writes and reads protect against external object mutation; subscribers are notified when state changes.

Closing, returning and navigating away use the existing unsaved-changes protection. Keeping a draft permits it to be resumed in the same loaded tab; explicit discard clears only that tenant/kind draft. Successful creation clears the submitted draft. The existing MOCK “Restaurar dados” action reloads the tab and resets newly created records and all in-memory drafts. No participant draft or password is written to local/session storage.

## Synthetic protocol

The following branch-only command is handled directly by the hardwired in-memory transport:

```text
POST /mock/account-creation/whitelabels/:tenantId/:kind
kind = investor | entrepreneur
```

Request fields:

| Field | Rules |
| --- | --- |
| `full_name` | Required, 3–256 characters after trimming. |
| `email` | Required valid email, at most 254 characters, trimmed and normalized to lowercase. |
| `phone` | Required, 5–18 digits after permitted phone formatting is removed, following the inspected Core registration range. |
| `investor_type` | Required only for Investor: `pessoa_fisica` or `pessoa_juridica`; rejected for Entrepreneur. |

Unsupported fields are rejected. The response is `{ data: record, mockOnly: true }` with HTTP 201. Duplicate normalized email within the same tenant and participant kind returns HTTP 409 / `MOCK_EMAIL_TAKEN`. The same email may belong to distinct participant identities in another tenant, or in the other participant domain, following the inspected Core registration scope. Investor uniqueness also excludes deleted records in the real Core. Administrator uniqueness remains global in its existing implementation. Invalid fields return HTTP 422 / `MOCK_ACCOUNT_INPUT_INVALID`; unknown tenants return 404. Mock `READ_ONLY` and `SUPPORT_ADMIN` sessions cannot create participants. The simulation does not claim Backend authorization enforcement.

Readback uses the current presentation contracts:

```text
GET /whitelabels/:tenantId/accounts/:recordId?tipo=investidores|empreendedores
GET /investors/:recordId
GET /entrepreneurs/:recordId
GET /investors/:recordId/overview
GET /entrepreneurs/:recordId/overview
```

A different tenant cannot read the record through scoped Accounts. Global domain detail retains its existing global Super Admin supervisory meaning.

The branch-only `GET /mock/account-creation/whitelabels/:tenantId/:kind/:recordId` returns a newly created record with `mockOnly: true`. An original seed returns `data: null` so it is not relabelled as a new creation. Unknown or different-tenant identities return 404.

New participant records retain truthful initial state:

- `emailVerifiedAt`, `termsAcceptedAt`, `termsRevisionId` and last login are null.
- `credentialsProvisioned` and `personalInformationFilled` are false.
- Investor registration validation is `waiting`; Entrepreneur profile completeness is `incomplete`.
- No accepted terms, approved KYC, external credentials, Company, investment, payment or wallet is fabricated.

These are demonstration choices, not a finalized operational initial-state contract.

## Existing Administrator reuse

Administrator creation continues through `POST /whitelabels/:tenantId/admins` with the existing email/password form, payload validation and synthetic authoritative readback. Password length remains 8–60 characters. Only the synthetic result is retained; the password is not exposed in the receipt or stored in the in-memory record. The demonstration does not invent a completed invitation acceptance. Existing edit, access pause/reactivate and supported dedicated read routes remain intact.

## Isolation and verification

The transport still refuses external URLs, unknown operations and financial writes. HTML CSP retains `connect-src 'none'`; mock session keys, login identity and visible MOCK context are unchanged. No real API URL or network fallback is introduced.

Run the focused behavioral regression together with the maintained mock gate:

```powershell
node scripts/check-mock-account-creation.mjs
npm run check:mock
npm run typecheck
npm run lint
npm run build
git diff --check
```

The focused script exercises PF/PJ Investor and Entrepreneur creation; malformed/unsupported fields and failure atomicity; cancellation before completion; immutable drafts, notifications, partial edit, discard and tenant/kind separation; duplicate refusal within a tenant/domain and distinct identities for the same email across tenants; role/session refusal; existing Admin credential validation and scoped readback; pending detail/overview state; frozen Finance; and an independent module realm representing tab reset. Network entry points are replaced with throwing sentinels and the script requires zero attempts. Existing Accounts, domain detail and 360° overview parsers validate the synthetic readbacks.

Focused regression execution on 2026-10-26 passed. The maintained `check:mock` gate also passed its 66 protocol reads, static network boundary, local mutation and session-rejection checks. These results cover the model, draft store and transport; they are not rendered interaction acceptance.

Browser focus, keyboard, validation presentation, draft prompts, tenant navigation and responsive visual behavior require separate rendered QA. Script results are offline prototype evidence and do not establish real Backend E2E, email delivery or legal acceptance.
