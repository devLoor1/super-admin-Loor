# Operação › Empreendedores V1 — local implementation record

Part of Operation V1, implemented by Claude on 2026-10-07 from `ec86b47…`,
then reviewed and consolidated locally by Codex on
`feature/super-admin-operation-v1`. No push or deployment. Shared
architecture, QA evidence and regressions are recorded in
[operation-opportunities-v1.md](operation-opportunities-v1.md). Approved
composition reference:
[`reference/super-admin-operation-entrepreneurs-approved.png`](reference/super-admin-operation-entrepreneurs-approved.png)
(illustrative values only).

## Purpose

The operational consolidated view of the Opportunity originator /
representative: find → inspect → understand account and KYC context → inspect
linked Opportunities → navigate to the responsible domain. It does not
duplicate Accounts or Opportunities mutations.

## Routes

| Route | Screen |
| --- | --- |
| `#/operation/entrepreneurs` | Global list across Whitelabels. |
| `#/operation/entrepreneurs/:entrepreneurId` | Read-only profile. Unknown ids → not-found state. |

No create route and no "Novo empreendedor" action.

## Module boundary

| Domain | Owns | In Empreendedores V1 |
| --- | --- | --- |
| Contas | identity, access, company registration data | read-only context + *Ver conta* link |
| Operação › Oportunidades | Opportunities (create/edit/status) | live read-only relationship + *Ver oportunidades* link |
| Compliance › KYC (Compliance › KYC V1) | KYC cases, evidences, pending issues and decisions | read-only summary + *Ver no Compliance* link (case, or list filtered by participant) |

## Local / mock state

- **Projection over Accounts.** `shared/participants.ts` builds one
  `EntrepreneurProfile` per Accounts prototype entrepreneur (7: 5 Finapop,
  2 Loor) referencing the account record; nothing is copied.
- **Operational id** = the account prototype id (`emp_proto_001…`) in V1;
  Opportunities reference it as `entrepreneurId`.
- **Tenant context** on every record; no cross-tenant identity assumed.
- **Account projection limitation:** access/tenant edits made inside Accounts
  do not synchronize with Operation's seed projection. Explicitly retained
  for this prototype; Accounts remains the owner. Real identity/readback and
  synchronization require a future contract, not inferred global IDs.
- **Company:** the profile shows only what Accounts already holds — company
  name and its validation badge ("Empresa (cadastro em Contas)"). No corporate
  structure, bank details, legal representatives, corporate documents or
  ownership structure were invented.
- **KYC summary:** Accounts has no KYC dependency for entrepreneurs, so the
  prototype status (Pendente / Em análise / Aprovado), last update and process
  reference are illustrative Operation seeds, labelled "Resumo ilustrativo de
  Operação (protótipo)". Not the official KYC workflow. The reference is the
  entrepreneur's current Compliance › KYC case id (Compliance › KYC V1
  aligned `emp_proto_004` → `kyc_proto_e004`); local KYC session actions never
  update this summary.
- **Live relationship.** The Opportunities count, list and summary are read
  from the Opportunities store through `useOpportunities()` (references only).
  Opportunities created, edited or re-assigned during the session appear here
  immediately; nothing in this module writes to that store.

## List

- Summary cards derived locally: Total de empreendedores (7), Ativos (6 — 1
  paused), KYC não concluído (3 = 1 pendente + 2 em análise), Com oportunidades
  (4 with the seeds; live).
- Search: name, e-mail or entrepreneur ID. Filters: Whitelabel, account
  status, KYC status, with/without Opportunities; *Limpar filtros*.
- Columns: Empreendedor (name + ID), E-mail, Whitelabel, Status da conta, KYC,
  Oportunidades (count: "3 oportunidades" / "Sem oportunidades"), Última
  atividade, Ações (*Abrir perfil* only). Same sort, pagination and
  responsive behaviour as Investidores.

## Profile

- Header: initials, name, account status, entrepreneur ID, Whitelabel, KYC
  badge; *Ver conta*, *Ver no Compliance*.
- **Visão geral:** Informações principais (name, ID, e-mail, phone,
  Whitelabel, account status, created at, last activity, company from
  Accounts) and **Navegação para domínios responsáveis** (Ver conta / Ver
  oportunidades / Ver no Compliance).
- **Oportunidades:** summary (total, ativas, rascunho, pausadas, última
  atualização) and linked Opportunities (name + ID link, Whitelabel,
  Segment / Resource Use summary, modality, status); *Ver oportunidades*.
  The latest update is derived only from dated Opportunities; null dates
  cannot displace a known latest date. If no dated record exists, show "—".
  Callout: Opportunities are managed in their own module; one entrepreneur
  reference per Opportunity is the V1 composition, not final cardinality.
- **Compliance / KYC:** read-only summary + ownership callout + *Ver no
  Compliance* (link to Compliance › KYC).
- **Atividade da sessão:** profile viewed, opportunities viewed, Compliance/KYC
  viewed, account / opportunities / Compliance navigation requested. Not audit.

## Cross-domain navigation

- **Ver conta** → `#/whitelabels/:whitelabelId/accounts?tipo=empreendedores`
  (existing route; no per-account deep link exists, Accounts unchanged).
- **Ver oportunidades** → `#/operation/opportunities?empreendedor=:id`: the
  Opportunities list opens filtered by this entrepreneur with a removable
  context chip.
- **Ver no Compliance** → Compliance › KYC: the entrepreneur's case when
  exactly one exists (`#/compliance/kyc/:kycCaseId`), otherwise the KYC list
  filtered by the participant (`#/compliance/kyc?participant=:id`; Daniela
  Pires has two cases). Updated in Compliance › KYC V1 (2026-10-08): before
  that module existed this was a pending-module notice. See
  [compliance-kyc-v1.md](compliance-kyc-v1.md).

## Exact action boundary

Allowed: Abrir perfil, Ver conta, Ver oportunidades, Ver no Compliance,
Voltar. Not present: create entrepreneur, edit or pause/reactivate account,
change Whitelabel, create/edit/publish Opportunities, approve/reject KYC,
financial actions, delete.

## Relationship cardinality (kept open)

The frontend represents one optional entrepreneur reference per Opportunity
for V1 usability. Not authoritative. Open: one vs many entrepreneurs per
Opportunity; natural person vs legal entity; representative vs company
relationship; several entities per entrepreneur; cross-tenant identity.

## Conceptual permissions and future audit

`ENTREPRENEUR_VIEW` (specification label only). Reads such as
`ENTREPRENEUR_VIEWED` are candidates only. No RBAC, no audit.

## Open Product / Backend questions

1. Global vs tenant-specific entrepreneur identity.
2. Person vs company modeling and representative relationships.
3. Opportunity cardinality (and whether an Opportunity may exist without an
   entrepreneur, as two seeds do).
4. Authoritative KYC states for entrepreneurs (and how company validation in
   Accounts relates to KYC).
5. Deep-link contracts to Accounts (per account) and Compliance.
6. Permissions for viewing entrepreneurs and following each link.

## Excluded scope

Entrepreneur creation, account edits or access changes, Whitelabel moves,
Opportunity creation/editing/publication from this module, KYC decisions,
corporate/bank/document data, financial actions, real persistence, RBAC,
audit.

## QA

See [operation-opportunities-v1.md › Claude-reported local QA](operation-opportunities-v1.md#claude-reported-local-qa-2026-10-07--whole-operation-v1-pass):
live relationship (a new Opportunity linked to Camila Ribeiro appears in her
count, profile and filtered list), axe 0 violations for list and three tabs
at three widths, responsive sweep of list and profile at all six widths.

### Independent Codex review (2026-10-07)

- Built-in browser only: relationship filter, accent-insensitive search,
  all four profile tabs, explicit illustrative KYC source, Accounts
  tenant/type navigation and Opportunity contextual navigation passed.
- Local creation of `opp_local_1` for `emp_proto_002` appeared immediately in
  Camila's count/profile and linked Opportunity list (0 → 1); no copied
  Opportunity state or mutation was introduced in this module. A later reload
  restored the seed state, as designed.
- Removing `?empreendedor=` now also removes the URL parameter. Back restores
  the contextual filter, Forward removes it, refresh does not resurrect a
  cleared filter. Unknown IDs fail safely.
- Six requested widths plus 1440×600 / 900×600: no horizontal overflow and
  tabs/actions remain reachable. KYC is illustrative, not a Backend readback.
- Minimal source correction: ignore null dates before finding the latest
  linked Opportunity update. Combined KYC card renamed "KYC não concluído".
- No account, KYC or financial mutation. Fresh axe unavailable; previous
  Claude evidence remains separately attributed. See the full Codex record in
  [operation-opportunities-v1.md](operation-opportunities-v1.md#independent-codex-review-2026-10-07).
