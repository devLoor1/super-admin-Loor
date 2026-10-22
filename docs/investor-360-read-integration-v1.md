# Investor 360° Read V1 — SA-BE-004

## Accepted baseline and closure

INTEGRATION MAP V1 + KYC READ V1 — ACCEPTED AND CLOSED.
The eight-capability map and FaceMatch-backed Investor KYC read delivery are not reopened.
Baseline dev: `cf79cca5066771a2edd20ad404f1b0f59527ce29`; prior implementation `860d6fcdc6215bcadb2309b50de05685251693fa`.
Prior homolog publication `6ad985894737ddb5c6b85672`, assets `index-B4S_XwRK.js` / `index-Cgdh8dnd.css`.

## Independent contract qualification — 2026-10-22

- Authenticated built-in browser: `GET /api/auth/me` → 200, SUPER_ADMIN.
- Canonical Investor 4772 / Whitelabel 4 obtained from the real Investor list.
- `GET /api/investors/4772/overview` → 200, `{ data }`; correlation `0a307e83-b08c-4bab-a4d0-96d7bca727d4`.
- Control Plane source `73ccb918ae4e22be1e16d3ab6ab12a215d3f2916`, Investor controller/service; Core source `9e26c7c7e68ca42c5aebc6188d3cc73005dbf362`, `InvestorOverviewService` and `WalletQueryService`.
- Those are inspected source references, not an invented deployed Backend commit SHA.
- Roles in the controller: SUPER_ADMIN, SUPPORT_ADMIN, COMPLIANCE_ADMIN, READ_ONLY. Only SUPER_ADMIN was exercised live; 403/error behavior is tested synthetically.

## Mapping and ownership

| Source | Presentation / validation |
| --- | --- |
| investor.id / whitelabelId | Positive safe numeric Core identity; requested identity continuity; never a prototype/account/KYC ID |
| fullName, documentMasked, createdAt, status, personalInformationFilled | Safe name/document projection, date validation, registration state explicitly distinct from KYC |
| account | Access state and supplied timestamps; pause reason/date only for paused state; absent account remains unavailable; no controls |
| personalData | Investor type and completeness, no banking |
| kyc.status / bureau / faceMatch | Independent source statuses; summary never recalculated into a Compliance decision |
| faceMatch.id | Explicit positive numeric FaceMatch ID only → existing KYC case route; no case inferred from Investor ID |
| summary.investmentsCount / paymentsCount | Full-query counts; never recent-list lengths |
| summary.investedAmountCents | Integer centavos; sum for paid, processing_refund and refunded source investments; NOT current holdings or personal balance |
| recentInvestments / recentPayments | At most 10 each; explicit bounded-preview copy; only canonical Investment/Payment links |
| wallet | Whitelabel ledger only; Whitelabel/ownerId/ownerType/BRL checked; signed safe integer authoritativeBalanceCents; NOT Investor funds |
| wallet.recentMovements | At most 5, direction/BRL/positive integer amounts/date only; composite source IDs and counterparties are not exposed |

Money is BRL formatted from centavos exactly once. Null is “Não disponível”, not zero.
Unknown status tokens remain neutral source values, never an inferred approval.
Only already-masked identifier syntax is accepted. Unmasked identifiers, banking, provider/risk/raw payloads, unnecessary contact fields and manual-review placeholders are excluded from UI state.

The existing detail route, shell, hero, cards, keyboard tabs and list-return URL remain.
Overview is the single initial data request. Basic `GET /investors/:id` adds Terms acceptance/revision only on the Cadastro e Termos tab; identity/tenant continuity is checked again. No redundant Whitelabel or Company fan-out.

## Lifecycle / tests

Dedicated adapter → canonical `authenticatedGet` → session-version scoped `useRemote`.
Abort on changed request/unmount, late-session rejection, 20-second read timeout, explicit retry, central 401 handling and source-specific 403 states are preserved. No polling, persistent overview cache, prototype fallback or write client.

`scripts/check-overview-360.mjs` independently exercises both contracts, privacy, IDs, money, tenant ownership, caps, nulls, malformed responses, 401/403/404/5xx, timeout, cancellation and session replacement. Synthetic production-built browser checks cover all substantive tabs at 1672/1440/900/390/320, long names, large/signed values, nulls, visible keyboard focus and reduced motion. No horizontal overflow or private fixture sentinel surfaced.

Live fixture observed: account active; investment/payment totals zero; no FaceMatch case; Whitelabel Wallet present with five movements. Non-zero investments and linked FaceMatch scenarios are synthetic coverage, not claimed as real E2E.

## Release record

Independent contract gate: PASS. Coordinated release requires Entrepreneur and hygiene gates too.
This document ships in the one coordinated release commit. Actual post-publication SHA, deploy ID, asset hashes, GET/UI comparisons and final status are recorded in the external release evidence/final report, without a second canonical documentation publication.
External evidence directory: `C:/Users/User/.codex/visualizations/2026/08/28/01a047eb-4949-7663-bff7-5b0686497ccf/overview-360-2026-10-22/`.

No Backend/Core, environment, finance, account or compliance mutations are part of this unit.
