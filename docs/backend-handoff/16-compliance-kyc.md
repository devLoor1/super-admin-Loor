# Compliance / KYC V1

## Baseline and purpose

Status: **FRONTEND PROTOTYPED / INTEGRATION PENDING / E2E VALIDATION PENDING** at `dev@d2a51753047d447983fe12145d53d9f42334e547`. Sources: [approved KYC module](https://github.com/devLoor1/super-admin-Loor/tree/d2a51753047d447983fe12145d53d9f42334e547/src/features/compliance-kyc), [model](https://github.com/devLoor1/super-admin-Loor/blob/d2a51753047d447983fe12145d53d9f42334e547/src/features/compliance-kyc/kycModel.ts), [local store](https://github.com/devLoor1/super-admin-Loor/blob/d2a51753047d447983fe12145d53d9f42334e547/src/features/compliance-kyc/kycStore.ts) and [frontend implementation/review record](https://github.com/devLoor1/super-admin-Loor/blob/d2a51753047d447983fe12145d53d9f42334e547/docs/compliance-audit-v1.md). These are frontend evidence, not a Backend contract, live KYC integration or legal compliance validation.

Purpose: global compliance-case supervision for Investors and Entrepreneurs across Whitelabels: find a case, inspect illustrative metadata/pending issues, exercise a local review/decision and navigate to the owning domains. There is no real persistence, real compliance decision, account/access effect or financial effect. Core remains authoritative for operational records; no duplicated participant/account persistence is proposed.

## Routes and current capabilities

Sidebar: top-level **Compliance** → **KYC**. Only KYC is implemented under Compliance; no monitoring, reporting or policy-management destination is implied.

| Frontend route | Current behavior |
| --- | --- |
| `#/compliance/kyc` | Global list; optional `?participant=:participantId`, `?whitelabel=:whitelabelId`, `?status=pending\|in_review\|approved\|rejected` |
| `#/compliance/kyc/:kycCaseId` | Case detail; unknown/malformed ID shows a controlled not-found state |

The list supports search, combined participant/type/tenant/status/open-issue filters, sorting, pagination and derived summary counts. Counts are computed from local prototype cases, including session decisions, not authoritative Compliance KPIs. Detail separates overview, evidence/pending issues, decision and session activity. Valid contextual URL filters survive reload; other view state is local. Invalid enum context is ignored with a visible notice; unknown participant context produces an empty list rather than a fabricated case. Client session guards do not prove server-side permission enforcement.

Current capabilities include metadata review, local add/resolve/reopen pending issue, prototype approval/rejection, session activity and navigation to Accounts, Investor, Entrepreneur and contextual Audit. There is no create/delete case, real document view/upload, provider request, OCR, biometrics, export, bulk action or business API call.

## Distinct domain ownership

**KYC ≠ AUDIT. NO AUTOMATIC KYC → AUDIT SYNCHRONIZATION EXISTS.**

| Domain | Ownership in the current frontend | Boundary |
| --- | --- | --- |
| Accounts | Identity, authentication, access state, account lifecycle and account-level tenant association | KYC does not pause/reactivate, edit identity, change tenant or activate/block an Account |
| Operation / Investors | Read-only operational Investor profile/context | KYC resolves references read-only; it does not alter the Investor |
| Operation / Entrepreneurs | Read-only operational Entrepreneur/Company context | KYC does not edit person/company/profile or validate a Company |
| Compliance / KYC | Its own in-memory prototype case, metadata review, pending issues and decision | No financial/eligibility effect and no canonical Audit ownership |
| Governance / Audit | Immutable illustrative event history | No KYC decision or source-record mutation; does not consume KYC session activity |

Participant name/email/account-access/company context is resolved read-only from the existing Operation/Accounts prototype references, not copied into a competing KYC identity model. A missing reference renders missing context safely. KYC decisions do not synchronize into Operation's seeded KYC summary or Accounts validation/access. Authoritative mapping/freshness remains a contract decision, not proof that those seeds are current.

## Case model and identifiers

Conceptual frontend fields: case ID, participant type/ID, Account reference, Whitelabel reference, prototype status, evidence metadata, pending issues, optional local decision and created/updated timestamps. This is **PROTOTYPE UX STATE MODEL**, not an API schema.

**FRONTEND PROTOTYPE REFERENCE STRATEGY:** current cases intentionally preserve existing `kyc_proto_*` references from participant summaries instead of adding a second competing scheme. Historical illustrative cases have separate references. These values are not Backend canonical IDs. Product/Backend must define authoritative case identifiers, Account ↔ participant mapping, tenant scope and history/cardinality.

## Prototype states and transitions

Current labels: **Pendente**, **Em análise**, **Aprovado**, **Reprovado** (`pending`, `in_review`, `approved`, `rejected`). They are **PROTOTYPE UX STATE MODEL**, not an official Core workflow, authoritative Product lifecycle or confirmed Backend contract.

There is no official transition graph. Reviewing evidence or resolving an issue does not automatically change case status. Local decision buttons change only the case's prototype status/decision. Repeating the same decision is not offered as an action; this UX does not define authoritative idempotency or re-review policy.

Product/Backend must settle official states/transitions, who may decide, whether manual approval/rejection exists, preconditions, re-review/reopening/history and effects on account/access or investment/fundraising eligibility. Nothing here silently chooses those effects. See [Q-KYC-01–05](open-questions.md#compliance-kyc).

## Evidence metadata

Representation: **METADATA ONLY / ILLUSTRATIVE FRONTEND DATA**. Evidence contains an illustrative ID/label/category, opaque safe reference, sent/reviewed dates and prototype state **Pendente / Recebida / Revisada**. These names are UX examples, not document-validation outcomes.

No real files, uploads, OCR, biometrics, external document provider, actual identity documents or actual CPF/CNPJ files are present. A safe reference is not a signed download URL or proof of storage/access. Marking Recebida as Revisada changes only its local metadata/review date and the case update timestamp.

Required authoritative decisions: evidence/document schema, required categories, PF/PJ and representative rules, provider/source, storage, validation/review semantics, access control, retention and minimization. AML/PEP/sanctions scope, if applicable, is unresolved; it is not inferred from this case UI. See [Q-KYC-06, Q-KYC-10](open-questions.md#compliance-kyc).

## Pending issues and local decisions

| Local action | Prototype effect | Explicitly absent |
| --- | --- | --- |
| Add pending issue | New in-memory issue in **Aberta** state; description and local timestamps | Participant notification, SLA or Backend record |
| Resolve / reopen | **Aberta ↔ Resolvida** and local resolution/update timestamps | Case-status transition or downstream effect |
| Review received evidence | **Recebida → Revisada**, local reviewed/update timestamps | Real document/provider validation |
| Registrar aprovação / Registrar reprovação | Own case status/decision, short required local note and non-authoritative operator display label | Real compliance decision, Account activation/blocking/access change, investment eligibility, payment/wallet mutation or Backend write |

All are **PROTOTYPE COMPLIANCE ACTION / PROTOTYPE UX RULE**. Description/note length checks and warnings about open issues/unreviewed evidence are local UX constraints, not official decision prerequisites. Only browser-memory KYC state and local activity change; Accounts, Operation, Finance and Audit remain unaffected. No real financial processing, document handling or provider operation occurs.

## Session activity is not Audit

KYC **Atividade da sessão** is local, ephemeral, in-memory, non-authoritative, survives in-app navigation only and is lost on reload. It is **not canonical Audit history**. Local actions create session entries, never events in [Governance / Audit V1](17-governance-audit.md).

Audit may already contain pre-seeded illustrative KYC decisions, but they are frozen examples, not generated by local KYC actions or proof of Backend emission. Future canonical emission must come from the authoritative Backend/Control Plane under an agreed ownership/correlation/durability policy, not a frontend bridge.

## Cross-domain navigation

| Entry/action | Current frontend destination | Contract limit |
| --- | --- | --- |
| Investor / Entrepreneur “Ver no Compliance” | Exactly one indexed case → its detail; none or multiple → `#/compliance/kyc?participant=:participantId` | **FRONTEND PROTOTYPED NAVIGATION**, not final case cardinality or a Backend deep-link contract |
| KYC “Ver conta” | `#/whitelabels/:whitelabelId/accounts?tipo=investidores\|empreendedores` | Existing tenant/type tab, not a per-account deep link |
| KYC “Ver investidor / Ver empreendedor” | Owning Operation detail route | Read-only context; no participant mutation grant |
| KYC “Ver na Auditoria” | `#/audit?resourceType=kyc_case&resourceId=:kycCaseId` | Contextual search of existing illustrative events; creates nothing |
| Dashboard KYC KPI | `#/compliance/kyc` | Navigation only; metric remains `Aguardando integração`/empty |

Case cardinality, authoritative IDs and destination read permissions remain unresolved. An absent case is an empty list, not automatically provisioned. Prototype navigation transfers neither domain ownership nor permission.

## Backend dependencies, permissions and completion

Retained [A-05/A-06](audit-findings.md#findings-and-implications) establish narrower scoped actor reads/route-specific validation gates, not a complete case/evidence/decision contract. Target support is **CORE SUPPORT TO VERIFY**. A-11 establishes limited other-domain best-effort audit only. No new Backend source/live endpoint was inspected for this handoff update.

Required contracts include authoritative case source/IDs/mapping, official workflow, safe evidence/document reads and provider/storage, decision authority/effects, case cardinality/history/versioning/concurrency, server query/readback, sanitized errors and canonical audit emission. **CONTROL PLANE EXPOSURE NEEDED / PRODUCT DECISION REQUIRED / INTEGRATION PENDING / E2E VALIDATION PENDING** remain explicit; **BACKEND IMPLEMENTATION NEEDED** applies to verified gaps, not invented absence. See [KYC dependencies](matrices/backend-dependencies.md#compliance-kyc-v1-dependencies) and [canonical questions](open-questions.md#compliance-kyc).

`KYC_VIEW`, `KYC_REVIEW`, `KYC_UPDATE_STATUS`, `KYC_DECIDE` are **SPECIFICATION LABELS ONLY — RBAC NOT IMPLEMENTED**. Final granularity/scope and decision permissions are Product/Backend decisions under Q-RB-01–04. View/review does not grant decision, Account/access or Finance commands. Possible future status/decision/issue/evidence events are separate from read-auditing policy; see [permissions](matrices/permissions.md#compliance-and-audit-permission-boundaries), [rules](matrices/business-rules.md#compliance-and-audit-rules) and [event policy](matrices/audit-events.md#compliance-and-audit-event-policy).

Frontend prototype coverage is complete for this planned V1 module. Integration completion still requires policy, authoritative contracts/support, server authorization/sanitization, durable readback/audit and E2E. UI approval is not production readiness, security certification or legal compliance validation.
