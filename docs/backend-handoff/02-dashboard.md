# Dashboard

## Current behavior

The [page](../../src/features/dashboard/DashboardPage.tsx) presents five KPI labels: Whitelabels, Investidores, Oportunidades, Pagamentos and KYC. Values are placeholders, not measured zeroes. The [activity panel](../../src/features/dashboard/ActivityPanel.tsx) derives date labels for a last-30-day window locally but has no series or functional period selector. The [distribution panel](../../src/features/dashboard/WhitelabelDistributionPanel.tsx) has no measured tenant shares.

[Operational status](../../src/features/dashboard/OperationalStatusPanel.tsx) lists Pagamentos, Wallet, Compliance, E-mail/SMTP and Gateways as `Aguardando integração`. Configuration presence and actual service health are distinct. [Recent events](../../src/features/dashboard/RecentEventsPanel.tsx) has empty rows with Evento, Whitelabel, Módulo, Usuário and Data e hora columns.

The header remains `Visão global`; selecting a tenant is not implemented. At current `dev@d2a51753047d447983fe12145d53d9f42334e547`, Whitelabel/Opportunity/Investor/Payment links retain their implemented destinations; KYC opens `#/compliance/kyc`, and Acessar Auditoria / Últimos eventos “Ver todos” open `#/audit`. Source: [current quick actions](https://github.com/devLoor1/super-admin-Loor/blob/d2a51753047d447983fe12145d53d9f42334e547/src/features/dashboard/QuickActionsPanel.tsx). These are **FRONTEND PROTOTYPED NAVIGATION** only: metrics/events remain empty/non-integrated, not live Operation/Finance/Compliance/Audit KPIs. Service states still say `Aguardando integração`. See distinct [KYC](16-compliance-kyc.md) and [Audit](17-governance-audit.md); opening them triggers no provider, decision or financial action. Other unimplemented destinations show notices. Header logout uses [session integration](01-current-frontend-scope.md#login-v1); a decorative title does not change scope.

## Expected data

Architecture section 7 proposes the following indicator families. These are candidate requirements, not approved formulas or a fixed response schema.

| Indicator family | Current presentation | Backend dependency |
| --- | --- | --- |
| Whitelabel totals and active/inactive counts | Whitelabel KPI and distribution slots | Registry aggregation; agreed lifecycle mapping |
| Investors and Entrepreneurs | Investor KPI; Entrepreneur metric not present as a separate card | Account population definitions and permitted tenant/global reads |
| Opportunities by status | Opportunity KPI | Authoritative lifecycle grouping |
| Investment count and volume | No dedicated current metric | Core financial aggregation with agreed inclusion/status/time basis |
| Confirmed/pending/failed payments | Payment KPI | Core payment-state and amount definitions |
| Wallet aggregates | Operational-status slot only | Explicit Core aggregate; no frontend/Control Plane financial arithmetic |
| KYC states | KYC KPI | Agreed validation-state mapping; do not mix account pause with KYC status |
| Activity, distribution and events | Empty panels | Defined series, tenant denominator and authoritative event feed |

Definitions, dates/time zone, units, rounding, freshness, denominator and incomplete-data behavior are collected in [Q-WL-04](open-questions.md#whitelabel). The five-card layout does not imply rejection or implementation of the architecture's additional metrics.

## Contract and integration requirements

Architecture section 7 recommends `GET /internal/super-admin/v1/dashboard` with optional `whitelabel_id`, `from` and `to`. This route was not found at the audited SHA. Core should own aggregation; Control Plane should authorize global versus tenant access and expose the frontend contract. It must not compose a financial metric from many unrelated actor requests.

The proposed contract needs scope, period and freshness metadata, meaningful empty/error/partial states, units and non-sensitive event/service data. A tenant ID is a requested filter, never a permission. Until integration exists, preserve honest empty states and do not turn missing data into zero, healthy status or invented activity.

Status: **FRONTEND PROTOTYPED / BACKEND IMPLEMENTATION NEEDED / CONTROL PLANE EXPOSURE NEEDED / INTEGRATION PENDING / E2E VALIDATION PENDING**. See [dependencies](matrices/backend-dependencies.md) and [audit findings](audit-findings.md).
