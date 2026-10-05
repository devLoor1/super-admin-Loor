# Context and Architecture

## Sources and authority

This handoff reconciles the completed read-only account-control audit, the approved frontend at `f903f98357ee7d44516c67475a498fc609ca772f`, and the supplied `Arquitetura_Super_Admin_LOOR_V1.docx` (V1 Fundação, 2026-09-14). The DOCX is an external architecture reference, not copied into this Git package. Its proposed paths, models, and scaffold are not evidence of implemented APIs. Exact Core references and evidence limits are in [audit findings](audit-findings.md).

Existing [Dashboard review](../dashboard-v1-review.md), [Whitelabels review](../whitelabels-v1-review.md), and [design QA](../../design-qa.md) contain historical phase results. Current source and the approved baseline take precedence over earlier statements that an integration or shortcut had not yet been added.

## Responsibility boundary

```text
Super Admin frontend
  → backend-super-admin-Loor (Control Plane)
    → authenticated internal Core API
      → existing Core domain services and operational database
```

| Layer | Owns | Must not own |
| --- | --- | --- |
| Frontend | Presentation, input, requested scope, permission-aware navigation and error states | Service credentials, domain calculations, implicit tenant authorization |
| Control Plane | Independent operator authentication, RBAC, orchestration, correlation, safe responses and audit | Duplicate Investor, Entrepreneur, Opportunity, Investment, Payment or Wallet records; direct operational DB access |
| Core | Operational entities, tenant configuration, business rules, financial lineage and authoritative persistence | Trust in frontend filters as authorization |

Architecture sections 2–5 and 39 define these boundaries. The proposed Control Plane database contains operators, roles/permissions and audit records, not a second operational platform. Core `Admin.isSuperAdmin` is a legacy actor attribute and must not be equated with an independently authenticated Control Plane operator.

## Required foundation not yet evidenced

At audit time the named [Control Plane repository](https://github.com/devLoor1/backend-super-admin-Loor) was empty. No versioned internal Super Admin API or service-auth middleware was found in the inspected Core source. This establishes an implementation gap in the audited repositories, not proof that no external service exists.

Architecture sections 21–25, 29–30 and 34–35 propose:

- Independent operator sessions, permissions and inactive-operator checks.
- One `CoreApiClient` for service credentials, timeouts, correlation IDs and safe error normalization.
- A versioned `/internal/super-admin/v1` API accepting service authentication, not ordinary Admin/Investor/Entrepreneur tokens.
- Resource ownership validation, explicit tenant filters and Core-side pagination.
- Separate OpenAPI contracts for frontend-facing Control Plane and internal Core APIs.
- Safe secret metadata, auditable commands and bounded retries only when semantics permit them.

The architecture recommends short-lived service JWTs; exact provisioning, rotation and operator/RBAC policies remain [RBAC decisions](open-questions.md#rbac). Proposed internal routes in this handoff are design references, not callable current contracts. Frontend-facing route shapes still need agreement.

## Scope and acceptance

This package covers current screens and mapped account/configuration dependencies. It does not add screens, auth, Backend code or deployments. The broader architecture includes operational/financial consultation, but that is not evidence that those screens exist today. No generic wallet balance edit or parallel financial rule implementation is permitted.

Read integration requires authoritative scoped records, pagination/error/empty states, safe fields and permission enforcement. Write integration additionally requires agreed transition semantics, readback, audit and ambiguous-response handling. New pause/reactivate intent is recorded separately from existing validation and deletion behaviors. Product-dependent work remains pending until the [canonical questions](open-questions.md) are answered.
