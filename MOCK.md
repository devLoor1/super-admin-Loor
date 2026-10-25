# Permanent offline mock

This branch is the independent, synthetic Super Admin demonstration. `dev` remains the operational application. **Never merge this branch into `dev` or `main`, attach it to the official Netlify project, or use it as evidence of real Backend authentication/persistence.**

## Independent startup

```powershell
git clone --branch mock https://github.com/devLoor1/super-admin-Loor.git super-admin-demo
cd super-admin-demo
npm ci
npm run dev -- --port 5173
```

Open `http://127.0.0.1:5173/`. Node must satisfy `package.json` (`^20.19.0` or `>=22.12.0`). No `.env`, Backend, database, genuine identity, API token, or external account is needed. The lockfile/dependencies are unchanged.

The login is prefilled with **`demo@example.invalid` / `demo`**. These are public demonstration strings, not credentials. `readonly@example.invalid` and `support@example.invalid` demonstrate the other existing roles with the same `demo` string. Never enter real credentials. Logout remains usable. Mock session storage uses separate `loor_sa_mock_*` keys and cannot read a real session.

For an independently built preview:

```powershell
npm run check:mock
npm run typecheck
npm run lint
npm run build
npm run preview -- --port 4173
```

Prototype pages remain enabled in this branch's production build. The persistent **MOCK · dados sintéticos · telas** control opens a complete navigation gallery, including tenant configuration prototypes. It is present on Login and every screen. “Restaurar dados” reloads the tab: simulated business changes, local activities, SMTP tests and prototype stores reset. Session login remains tab-scoped.

## Isolation

- `src/lib/api.ts` always calls `src/mock/mockBackend.ts`. No `fetch`, network fallback, real API URL, proxy, environment override or real token exists in this path. `VITE_API_BASE_URL` is ignored, even if a developer already has an operational `.env` file.
- The HTML CSP uses `connect-src 'none'`, `form-action 'none'`, `frame-src 'none'`, same-origin/blob/data images only, and no objects. Vite HMR is disabled so the development server does not require a WebSocket exception.
- Branch-only `netlify.toml` skips normal Git-connected builds (`ignore = "exit 0"`); its deliberately failing build command also refuses publication when a manual build bypasses `ignore`. `npm run build` / `npm run preview` remain normal independent local commands. No site is linked and no project/environment setting is changed.
- A capture-phase external-link guard refuses navigation away from the demonstration origin. Mock fixture website/email addresses use reserved example domains; retained original prototype display names/domains are illustrative only.
- Supported Whitelabel, tenant-Admin, access-state, Opportunity and visibility commands mutate only a private in-memory database. Uploaded images receive synthetic IDs; no file is uploaded or retained.
- Finance remains supervisory. Investments, payments, wallet balances and movements are separate frozen seed concepts: no synchronization, balance calculation, refund, charge, transfer, settlement, cashout or real PIX execution. Every unsupported/financial write returns a synthetic 405; unknown endpoints never escape to a service.
- This is deliberately a protocol simulator, not a Backend emulator or a claim about server enforcement/concurrency. It supplies the envelope shapes expected by the current frontend parsers; Backend validation is neither bypassed nor exercised because no Backend is contacted.

## What is preserved

The baseline is complete `dev@450b9d5a5a1eabb6f986222bf2e08e0b18a71464`: Login, shell, Dashboard, Whitelabels, Accounts, Settings, E-mails, Finance configuration, Opportunities, Investors, Entrepreneurs, Companies, Finance Core, KYC reads, Audit reads, Operators and Menu Visibility. Shared styling, OriginKit-derived visuals, responsive structure, reduced motion, no-WebGL fallback, dialogs and form controls remain those of this baseline.

The existing full Settings, SMTP, gateway, modality and independent Segment/Resource Use stores remain accessible by their `wl_proto_*` gallery links. Current numeric contract routes show the protocol-backed read presentation. Numeric IDs in the simulation are new mock IDs, never homolog identities.

The editable Settings prototype groups Plataforma, Platform App, E-mail and Termos de Uso within the existing tenant context. Platform App uses the actual Admin's 20 entry/post-registration and 13 authenticated editorial fields, with per-field limits, a text preview and local save/discard. Terminology remains shared with Plataforma. E-mail opens the retained SMTP/event simulation; it never sends. Terms can save/resume/discard a tenant-local draft and publish a new immutable local revision; existing user acceptances are unchanged. The global Identity preview is explicitly a proposal, separate from the actual entry-stage `quick_profile.theme` capability and compiled PWA branding. No prototype save proves a supported Backend contract. See `docs/admin-parity-matrix.md` and `docs/branding-contract-handoff.md` for source qualification and proposed gaps.

Settings Evolution recovery QA (2026-10-25): 66 protocol reads plus isolation/rejection checks, TypeScript, clean oxlint, build and diff passed. Production-built browser checks passed at 1672/1440/900/390/320 with no horizontal overflow. Local App save/preview/readback/discard, tenant isolation, acknowledged unsaved Back protection, dialog keyboard focus, Terms draft/resume/discard and simulated immutable revision history were exercised. One SMTP simulation produced a local “no e-mail sent” receipt and no API request. These are offline prototype results, not homolog authentication, delivery or persistence acceptance.

Previously deleted Opportunity, Finance Core and Audit seeds were recovered exactly from the last complete prototype baseline `d2a51753047d447983fe12145d53d9f42334e547` into `src/mock/fixtures/legacy-*.json` and feed current presentation adapters. Historical Finance amounts convert reais into integer centavos. Historical investor-wallet identities are retained in the recovered fixture but **not** mislabeled as current Whitelabel-wallet ownership; current demonstration wallets are explicit independent seeds. Historical movements remain independent records, not generated from payment status or used to compute a balance.

The current payment read contract requires explicit Investment, Investor and Opportunity IDs. Historical orphan payments remain preserved in `legacy-finance.json`; the current payment presentation uses only records already carrying those three references, without fabricating associations.

The original local KYC review pages from that same commit are restored as `MockKycListPage.tsx` / `MockKycDetailPage.tsx` at `#/mock/kyc`. Their evidence/issue/decision simulations remain separate from current `#/compliance/kyc` reads and from immutable Audit events. They never mutate Accounts or Finance.

The full original Account Control prototype is recovered independently under `src/mock/legacy-accounts/` at `#/mock/accounts/wl_proto_01`. Its local pause/reactivate, new-Admin dialog, tenant-transfer review, original tabs and dependency summaries are preserved. They mutate only that gallery page's local state, never current numeric mock Accounts or any API. The current protocol-backed Account Control UI remains separately available at `#/whitelabels/1/accounts`. This explicit split preserves earlier exploratory interactions without claiming that an Account-transfer Backend contract exists.

## Limits

Audit detail follows the current frontend contract: open a loaded list row; direct-link/reload detail without that row is unavailable. Read-only pages remain read-only even though their examples are synthetic. The simulator does not claim to reproduce every Backend error, validation rule, race or provider. Account transfer is a legacy local simulation only; external provider onboarding, real KYC documents/biometrics and financial execution remain unavailable. Historical source/checkpoint documentation below is preserved as history; its live deployment/authentication claims describe operational `dev`, not this branch.

`npm run check:mock` verifies source isolation, CSP and session separation, validates representative synthetic responses with the real current parsers, tests independent financial reads, rejects financial/unknown/external paths, and exercises local create/edit/access operations. Operational canonical suites remain in history for `dev`; they are not substituted for real API evidence by this mock.
