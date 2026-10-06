# Super Admin Backend Handoff V1

Start here for Backend review of the approved frontend and the capabilities needed to integrate it. This is a documentation handoff, not authorization to implement every proposed capability.

Approved frontend baseline: `dev@cc28f3c26e6a9ec0e905ca04c4a1f49c468e0d7a` (Login V1, Dashboard V1, Whitelabels V1, Whitelabel Account Control V1). All four are **FRONTEND PROTOTYPED**, without business API integration or authentication. Core audit baseline remains `eb12e282c52230114553bf5e8722542adc9efe78`. Documentation prepared on 2026-10-05; account-control status updated on 2026-10-06.

The [approved source tree](https://github.com/devLoor1/super-admin-Loor/tree/cc28f3c26e6a9ec0e905ca04c4a1f49c468e0d7a) is reference-only: frontend code is not merged into this documentation branch. The original architecture/audit evidence retains its historical frontend baseline; this README and [current frontend scope](01-current-frontend-scope.md) identify the current approved scope. Prototype approval does not resolve Backend/Product decisions or prove authoritative persistence.

The architecture boundary is **Super Admin frontend → Control Plane → Core**. Operational entities and rules remain authoritative in Core; the frontend receives neither Core service credentials nor direct database access.

## Read order

1. [Context and architecture](00-context-and-architecture.md) and [current frontend scope](01-current-frontend-scope.md).
2. [Dashboard](02-dashboard.md), [Whitelabels](03-whitelabels.md), and [Whitelabel Account Control V1](04-whitelabel-account-control.md).
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

Pause/reactivate is now **FRONTEND PROTOTYPED / BACKEND IMPLEMENTATION NEEDED / INTEGRATION PENDING / E2E VALIDATION PENDING**. Product policy remains **PARTIALLY DEFINED**, with unresolved decisions explicit in [account control](04-whitelabel-account-control.md) and [open questions](open-questions.md#pause-reactivate). Local access-state changes are not Backend enforcement.

Backend review should first confirm the foundation and read contracts, then resolve Product-dependent writes. An existing Core table or actor endpoint does not by itself constitute a Super Admin capability.
