# Dashboard Data Recovery V1 — Opportunities and Payments

Frontend-only batch based on `cd598874ac98daa5da6c92d9ed5afab83853d140`.
No Backend/Core changes, new dependencies, feature-flag changes or business writes.

## Metrics and reads

- **Oportunidades:** global number of registered Opportunity records, all statuses.
- **Pagamentos:** global number of investment PIX-charge records, all statuses;
  not paid Investments, settled money, monetary volume or Wallet movements/balance.
- Existing `listOpportunities` / `listPayments` validate the envelopes and server
  `meta.total`. Both use page 1, perPage 1, no search/tenant/status/entity filters,
  with documented `createdAt` descending ordering. No pagination or row-count fallback.
- Dashboard keeps only total + client consultation timestamp, not the returned record.

## Independent lifecycle and permissions

Separate `useRemote` instances from each other and the existing `/dashboard` read:
one GET per Dashboard mount/return or explicit source-specific retry, no polling,
automatic retry, shared failure or global store. Canonical correlation IDs,
20-second timeout, session-version protection, cancellation and central 401 handling
are reused unchanged. A 403 affects only its source and offers no retry.

Whitelabels/Investors retain the Backend aggregate freshness. New counts say
**Consultado às … (Brasília)** using the time their own validated read completes;
this is not business-record freshness or continuously live data. Zero remains 0;
invalid metadata fails closed, never becoming zero or a prototype value.

RBAC is unchanged: Opportunities permits SUPER_ADMIN/READ_ONLY/SUPPORT_ADMIN;
Payments permits SUPER_ADMIN/READ_ONLY/FINANCIAL_ADMIN. Dashboard permission does
not imply either permission. KYC, both charts, events, operational status, five-card
layout, shared MetricCard, navigation, styling and operational flags are unchanged.

## Focused release gates

Maintained Dashboard contracts now cover the two exact GETs, validated totals,
zero/missing/invalid metadata, status-independent populations, independent failures,
403/401/network/timeout/5xx, cancellation and stale-session responses. Existing
overview/card assertions remain; the former single-source import boundary is
narrowly extended to the two specifically authorized read adapters, not removed.

Menu Visibility suites retain their historical Dashboard exclusion against the
completed Menu Visibility release history, and separately enforce an exact current
Recovery V1 file allowlist. Their behavioral, auth, routing and shell checks remain
intact; a blanket historical no-Dashboard-change assertion cannot prohibit this
later authorized integration.

Required before publication: relevant maintained suites, TypeScript, oxlint,
production build, diff review, mock-only browser states and representative desktop/
mobile layout. Homolog smoke must compare served cards against contemporaneous
unfiltered totals, verify navigation/Back/reload and confirm no unintended writes.

Actual publication/live observations must be recorded after execution, never
predicted here. Execution ledger:

`C:/Users/User/.codex/visualizations/2026/08/28/01a047eb-4949-7663-bff7-5b0686497ccf/dashboard-data-recovery-2026-10-21/checkpoint.md`

Activity metric/timezone/complete buckets, distribution “volume” semantics,
authoritative KYC and service-health/event contracts remain separate dependencies.
