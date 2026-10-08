# Compliance › KYC V1 — local implementation record

Part of Compliance › KYC V1 + Auditoria V1, initially implemented by Claude
and independently reviewed by Codex on 2026-10-08, on
`feature/super-admin-compliance-audit-v1` from baseline
`9f8abc6d55410e63a2edaf6d8efeafcd217b7a30`. Consolidated locally; final user
review and promotion remain separate. Shared architecture, domain
boundaries, QA and open questions:
[compliance-audit-v1.md](compliance-audit-v1.md). Approved composition:
[`reference/super-admin-compliance-kyc-approved.png`](reference/super-admin-compliance-kyc-approved.png)
(visual reference only — not permission to invent domain behaviour; values in
the image are illustrative).

## Purpose

Global supervision of KYC cases of investors and entrepreneurs across
Whitelabels: find → inspect a case → review illustrative evidence metadata and
pending issues → register a **local, non-authoritative** prototype decision →
navigate to the account, the participant profile or Auditoria. KYC is **not**
an official workflow here and never affects an account, access, participant,
investment, opportunity, payment or wallet.

## Navigation and routes

Sidebar: **Compliance** (top-level, `#/compliance/kyc`) with exactly one
nested entry, **KYC**. Monitoramento, Relatórios and Políticas e regras (seen
in the approved image) are **not** destinations.

| Route | Screen |
| --- | --- |
| `#/compliance/kyc` | Global list. URL-backed context: `?participant=:participantId` (removable chip), `?whitelabel=:whitelabelId`, `?status=pending\|in_review\|approved\|rejected`. |
| `#/compliance/kyc/:kycCaseId` | Case detail. Unknown or malformed ids → "Caso KYC não encontrado" inside the shell. |

URL behaviour: changing or removing a URL-backed filter **replaces** the
current history entry with the new URL (no entry per filter change; the
scroll position is kept), so reload restores the valid context and Back
returns to the previous page. Unknown `whitelabel` / `status` values are
ignored with a visible note ("Filtro da URL não reconhecido e ignorado: …")
and dropped from the URL on the next change; an unknown participant shows the
chip "(não encontrado)" and an empty list; a participant without cases shows
an empty list. Search, type, pending-issue filter, sort and page are local
view state. All routes stay behind the existing session guard.

## Model (`kycModel.ts`)

`KycCase { kycCaseId, participantType (investor | entrepreneur),
participantId, accountId, whitelabelId, status, evidences[], pendingIssues[],
decision | null, createdAt, updatedAt }`.

- **Participant name / e-mail / account access / company** are *not stored*:
  they are resolved live and read-only from the Operation participant
  projection (`operation/shared/participants.ts`, which itself references the
  Accounts prototype record). A missing reference renders "Participante não
  encontrado", "—" and a notice instead of a link.
- `KycEvidence { evidenceId, label, category, status (Pendente / Recebida /
  Revisada), safeReference, submittedAt, reviewedAt }` — **metadata only**:
  opaque reference, no file, upload, image, camera, OCR, biometrics, document
  number or content.
- `KycPendingIssue { pendingIssueId, description, status (Aberta /
  Resolvida), createdAt, resolvedAt, origin (seed | session) }`.
- `KycDecision { status (approved | rejected), note, decidedAt, decidedBy
  (display label only), origin (seed | session) }`.
- **Prototype states:** Pendente (amber) · Em análise (neutral) · Aprovado
  (teal) · Reprovado (red — rejection only). Text + dot, never colour alone.
  There is **no transition graph** and no automatic transition (reviewing
  evidence or resolving issues never changes the case status).

## Seed data (`prototypeKyc.ts`, deeply frozen)

23 cases (17 Finapop, 6 Loor; 15 investor, 8 entrepreneur): 11 Aprovado,
8 Em análise, 2 Pendente, 2 Reprovado; 59 evidences (37 Revisada, 14 Recebida,
8 Pendente); 21 pending issues (18 Aberta, 3 Resolvida; 12 cases with open
issues); 13 seeded decisions by "Analista Compliance (ilustrativo)".

- The **current case** of each participant uses the Operation KYC summary's
  process reference as its id (`kyc_proto_0001…`, `kyc_proto_e001…`) and
  matches its status and last update. Operation's summary for
  `inv_proto_007` and `emp_proto_004` gained the references `kyc_proto_0007`
  / `kyc_proto_e004` (they were "—") so both modules agree; nothing else in
  Operation's data changed.
- Two participants also have an earlier, concluded case — Maria Silva
  (`kyc_proto_0102`, Reprovado) and Daniela Pires (`kyc_proto_e106`,
  Reprovado) — so "Ver no Compliance" can open the list filtered by
  participant.
- Larissa Torres and Aline Rocha (Accounts KYC "Não iniciado") have **no**
  case.

## List

- Subtitle: "Acompanhe casos de compliance de investidores e empreendedores em
  uma só visão global."
- Cards (counts of the local prototype state, including session decisions):
  **Total de casos** (+ "N com pendências abertas"), **Pendentes**, **Em
  análise**, **Concluídos** (= Aprovados + Reprovados, detail "N aprovados ·
  N reprovados").
- Search: participant name, e-mail, participant id, account id, case id
  (accent-insensitive).
- Filters: Whitelabel, Tipo, Status KYC, Com / sem pendências abertas,
  *Limpar filtros* (all combine).
- Sort (column headers + *Ordenar por* select when columns collapse): case,
  participant, type, Whitelabel, status, pending issues, updated date (default
  newest first). Sorting returns to page 1. Pagination: existing pattern,
  8 rows per page.
- Columns: Caso KYC, Participante, Tipo, Whitelabel, Status KYC, Pendências
  (open count), Conta / contexto (account id + live access state), Atualizado
  em, Ações (*Abrir* only). No create CTA, no row selection, no bulk action,
  no kebab menu.
- Note: "KYC V1 é um módulo de supervisão de compliance do protótipo …
  estados ilustrativos, não o fluxo oficial de KYC …".

## Detail

Header: participant monogram, **Caso KYC :id**, status, Tipo, Participante,
Whitelabel; *Ver conta* and *Ver investidor* / *Ver empreendedor*.

| Tab | Content |
| --- | --- |
| Visão geral | Informações principais (case id, participant, e-mail, participant id, type, company for entrepreneurs, related account + access, Whitelabel, status, open issues, evidence summary, created, updated); Navegação para domínios responsáveis — *Ver conta* (`#/whitelabels/:wl/accounts?tipo=investidores\|empreendedores`, correct tenant and type; no per-account deep link exists), *Ver investidor / Ver empreendedor* (Operation profile), *Ver na Auditoria* (`#/audit?resourceType=kyc_case&resourceId=:id` — navigation only; no event is created); note "KYC V1 é um módulo de supervisão de compliance … não alteram conta, acesso ou operações reais". |
| Evidências e pendências | Evidências e documentos (label, id, category, safe reference, sent / reviewed dates, status; *Marcar como revisada* on Recebida only, "Aguardando envio" on Pendente) and Pendências (description, id, origin, dates, status; *Adicionar pendência*, *Resolver* / *Reabrir*). Note on metadata only. |
| Decisão | Decisão do protótipo (status, registered decision, observation, local timestamp, author — `<operator> · sessão local (não autoritativo)` for session decisions, origin); *Registrar aprovação* / *Registrar reprovação*; Contexto e efeitos (open issues, unreviewed evidences, explicit "no side effects / no Auditoria event" copy, open rule question). |
| Atividade da sessão | Local browser-session entries (newest first). Copy: "Não é a Auditoria: as ações abaixo não geram eventos de governança", plus a pointer to Auditoria filtered by the case. |

## Local actions (all in-memory, `kycStore.ts`)

| Action | Dialog | Changes | Never changes |
| --- | --- | --- | --- |
| Marcar como revisada | confirmation | that evidence: Recebida → Revisada, reviewedAt = now, "(local)"; case updatedAt | case status, documents (none exist), anything outside KYC |
| Adicionar pendência | form (description required, 5–160 chars, validation + error text) | new issue `PI-…-L<n>`, Aberta, origin session; case updatedAt | case status |
| Resolver / Reabrir | confirmation | issue status + resolvedAt; case updatedAt | case status |
| Registrar aprovação / reprovação | form (observation required, 5–280 chars); warns when open issues / unreviewed evidences exist (rule not defined) | case status + decision (origin session, non-authoritative author); case updatedAt | account, access, investor / entrepreneur, Operation KYC summary, investments, opportunities, payments, wallets, Auditoria |

Registering the decision equal to the current status is not offered (the
button stays focusable with `aria-disabled` and answers with a notice). Every
action adds a session-activity entry and a polite notice. State survives
in-app navigation and is lost on reload. No request is sent anywhere.

## Exact action boundary

Allowed: search, filter, sort, paginate, open, switch tabs, the four local
actions above, navigate. Not present: create / delete case, upload or view a
document, request documents from the participant, risk scoring, block /
pause / activate an account, change access, edit a participant, any
financial action, export, bulk action, writing to Auditoria.
