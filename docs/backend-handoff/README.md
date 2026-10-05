# Super Admin Backend Handoff V1

Start here for Backend review of the approved frontend and the capabilities needed to integrate it. This is a documentation handoff, not authorization to implement every proposed capability.

Approved frontend baseline: `dev@f903f98357ee7d44516c67475a498fc609ca772f` (Login V1, Dashboard V1, Whitelabels V1). All three are frontend prototypes without business API integration or authentication. Core audit baseline: `eb12e282c52230114553bf5e8722542adc9efe78`. Documentation prepared on 2026-10-05.

The architecture boundary is **Super Admin frontend → Control Plane → Core**. Operational entities and rules remain authoritative in Core; the frontend receives neither Core service credentials nor direct database access.

## Read order

1. [Context and architecture](00-context-and-architecture.md) and [current frontend scope](01-current-frontend-scope.md).
2. [Dashboard](02-dashboard.md), [Whitelabels](03-whitelabels.md), and [planned account control](04-whitelabel-account-control.md).
3. [Backend dependencies](matrices/backend-dependencies.md), [permissions](matrices/permissions.md), [business rules](matrices/business-rules.md), and [audit events](matrices/audit-events.md).
4. [Audit findings and source references](audit-findings.md), then [canonical open questions](open-questions.md).

Open questions have stable IDs in one file. Other documents reference those IDs rather than maintain competing decision lists.

## Status legend

| Label | Meaning |
| --- | --- |
| DEFINED | A documented requirement or boundary; not proof of implementation. |
| FRONTEND PROTOTYPED | Approved local UI behavior, without authoritative persistence. |
| CORE EXISTS | Relevant implementation found at the audited Core SHA; not a Production or runtime guarantee. |
| CONTROL PLANE EXPOSURE NEEDED | Core capability needs a scoped internal API and a frontend-facing Control Plane contract. |
| BACKEND IMPLEMENTATION NEEDED | Required capability was not found in the audited implementation. |
| PRODUCT DECISION REQUIRED | Behavior cannot be finalized from current evidence. |
| INTEGRATION PENDING | Frontend is not connected to the required authoritative API. |
| E2E VALIDATION PENDING | The intended cross-system flow has not been validated. |

For pause/reactivate, the additional planning labels are **TO BE PROTOTYPED / IMPLEMENTATION NEEDED / PARTIALLY DEFINED / PENDING**. See [account control](04-whitelabel-account-control.md).

Backend review should first confirm the foundation and read contracts, then resolve Product-dependent writes. An existing Core table or actor endpoint does not by itself constitute a Super Admin capability.
