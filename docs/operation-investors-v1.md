# Operação › Investidores V1 — local implementation record

Part of Operation V1, implemented by Claude on 2026-10-07 from `ec86b47…`,
then reviewed and consolidated locally by Codex on
`feature/super-admin-operation-v1`. No push or deployment. Shared
architecture, QA evidence and regressions are recorded in
[operation-opportunities-v1.md](operation-opportunities-v1.md). Approved
composition reference:
[`reference/super-admin-operation-investors-approved.png`](reference/super-admin-operation-investors-approved.png)
(illustrative values only).

## Purpose

An **operational supervision** module: find → inspect → understand context →
navigate to the responsible domain. It is not another Accounts screen, not
Financeiro › Investimentos and not Compliance / KYC.

## Routes

| Route | Screen |
| --- | --- |
| `#/operation/investors` | Global list across Whitelabels. |
| `#/operation/investors/:investorId` | Read-only profile. Unknown ids → not-found state. |

No create route and no "Novo investidor" action.

## Module boundary

| Domain | Owns | In Investidores V1 |
| --- | --- | --- |
| Contas | identity, access state, account administration, account Whitelabel | read-only context + *Ver conta* link |
| Financeiro › Investimentos (Finance Core V1, read-only) | investment records and any financial operation | illustrative count-only associations + *Ver investimentos* link to the Finance list filtered by the investor |
| Compliance › KYC (Compliance › KYC V1) | KYC cases, evidences, pending issues and decisions | read-only summary + *Ver no Compliance* link (case, or list filtered by participant) |
| Operação › Oportunidades | Opportunities | names/modality/status read live for the associations |

## Local / mock state

- **Projection, not a copy.** `shared/participants.ts` builds one
  `InvestorProfile` per Accounts prototype investor (16: 12 Finapop, 4 Loor)
  holding a reference to the account record (name, e-mail, masked phone,
  access state, dates, Whitelabel) plus a KYC summary. No identity data is
  duplicated.
- **Operational id** = the account's prototype id (`inv_proto_001…`) in V1.
  Whether the Backend exposes a separate investor/profile id is open.
- **Tenant context.** Every record carries its Whitelabel; no cross-tenant
  identity is assumed (a person present in two Whitelabels would be two
  records).
- **Account status** shows the Accounts prototype access state (Ativa /
  Pausada). Accounts keeps pause/reactivate in its own page state; Operation
  never changes it. Operation projects the original seed, not live Accounts
  page edits. This explicitly retained prototype limitation needs an
  authoritative shared account/readback contract later; no broad Accounts
  refactor was made.
- **KYC summary.** The status is derived from the account's existing "KYC"
  dependency in Accounts (Verificado → Aprovado, Em análise → Em análise,
  Pendente / Não iniciado → Pendente), so both screens agree. Last update and
  process reference are illustrative seeds (`kyc_proto_…` or "—"); the
  reference is the participant's current Compliance › KYC case id
  (Compliance › KYC V1 aligned `inv_proto_007` → `kyc_proto_0007`). Local
  KYC session actions never update this summary. The summary
  names its source. States are restrained prototype values, not the official
  KYC workflow.
- **Investment associations** (`investors/prototypeInvestments.ts`): 13
  read-only illustrative entries `{ id, investorId, opportunityId,
  registeredAt }` for the 7 investors whose Accounts "Investimentos"
  dependency is "Vínculos existentes", pointing to non-draft Opportunities of
  the same Whitelabel. No amount, balance, return, yield, payment, cash flow,
  wallet or Pix. Modality and status are read live from the Opportunity. If an
  Opportunity is moved to another Whitelabel in the session, the row says so
  (the association is not migrated). Investors do not own Opportunities.

## List

- Summary cards derived locally: Total de investidores (16), Ativos (13 — 3
  paused), KYC não concluído (9 = 3 pendentes + 6 em análise), Com investimentos
  (7). No financial totals; the note says counts are prototype state.
- Search: name, e-mail or investor ID (case/accent-insensitive). Filters:
  Whitelabel, account status, KYC status, with/without investment
  associations; *Limpar filtros*.
- Columns: Investidor (name + ID), E-mail, Whitelabel, Status da conta, KYC,
  Investimentos (count only: "3 vínculos" / "Sem investimentos"), Última
  atividade (or "—"), Ações (*Abrir perfil* only). Sort: name, last activity.
  8 per page. Columns collapse by container width with their data moved under
  the name.

## Profile

- Header: initials, name, account-status pill, investor ID, Whitelabel, KYC
  badge; *Ver conta* and *Ver no Compliance*.
- **Visão geral:** Informações principais (full name, ID, e-mail, phone,
  Whitelabel, account status, created at, last activity — all read-only) and
  **Navegação para domínios responsáveis** (Ver conta / Ver investimentos /
  Ver no Compliance); module note.
- **Investimentos:** count summary by Opportunity status and the associations
  table (Opportunity link + ID, modality, status, illustrative registration
  date); *Ver investimentos* (link to Financeiro › Investimentos, filtered by
  this investor).
- **Compliance / KYC:** status, last update, pending summary, process
  reference, source; ownership callout; *Ver no Compliance* (link to
  Compliance › KYC).
- **Atividade da sessão:** profile viewed, investments viewed, Compliance/KYC
  viewed, account / investments / Compliance navigation requested. Explicitly
  not audit; repeated identical entries within 1.5 s are ignored.

## Cross-domain navigation

- **Ver conta** → `#/whitelabels/:whitelabelId/accounts?tipo=investidores`.
  Accounts has no per-account deep link, so Operation uses the existing route
  with the investor type tab selected; no fragile route was invented and
  Accounts was not changed.
- **Ver investimentos** → `#/finance/investments?investidor=:investorId`
  (Financeiro › Investimentos, removable investor context chip). Updated in
  Finance Core V1 (2026-10-08): before that module existed this was a
  pending-module notice. The Operation associations stay illustrative and
  separate from the Finance investment records (no synchronisation); see
  [finance-core-v1.md](finance-core-v1.md).
- **Ver no Compliance** (hero, domain navigation and Compliance / KYC tab) →
  Compliance › KYC: the investor's case when exactly one exists
  (`#/compliance/kyc/:kycCaseId`), otherwise the KYC list filtered by the
  participant (`#/compliance/kyc?participant=:investorId`; e.g. Maria Silva
  has two cases, Larissa Torres none). Updated in Compliance › KYC V1
  (2026-10-08): before that module existed this was a pending-module notice.
  See [compliance-kyc-v1.md](compliance-kyc-v1.md).
- Opportunity names link to the Opportunity detail (existing module).

## Exact action boundary

Allowed: Abrir perfil, Ver conta, Ver investimentos, Ver no Compliance,
Voltar. Not present: create account, edit account, pause/reactivate, move
Whitelabel, approve/reject KYC, create/edit/cancel investment, wallet /
payment / Pix actions, delete.

## Conceptual permissions and future audit

`INVESTOR_VIEW` (specification label only). Navigation to other domains stays
governed by their own future permissions. A pure read event such as
`INVESTOR_VIEWED` is only a candidate; whether reads are audited is a Product
/ compliance decision. No RBAC and no audit exist.

## Open Product / Backend questions

1. Global vs tenant-specific investor identity (one person, several
   Whitelabels).
2. Source of the operational profile and whether it has its own id.
3. Authoritative KYC states and the summary fields Compliance will expose.
4. Source of the investment summary (Financeiro › Investimentos contract) and
   which fields Operation may show.
5. Deep-link contracts to Accounts (per account), Investimentos and
   Compliance.
6. Permissions for viewing investors and following each domain link.
7. Whether profile views are audited.

## Excluded scope

Account creation/editing/access changes, Whitelabel moves, KYC decisions or
document requests, risk classification, investment creation/editing/
cancellation, any amount or financial operation, a Finance or Compliance
placeholder module, real persistence, RBAC, audit.

## QA

See [operation-opportunities-v1.md › Claude-reported local QA](operation-opportunities-v1.md#claude-reported-local-qa-2026-10-07--whole-operation-v1-pass):
investor checks in the 120-check flow, 6 investor states per width in axe
(list, four profile tabs, pending notice — 0 violations), responsive sweep of
list and profile at all six widths.

### Independent Codex review (2026-10-07)

- Built-in browser only: list filters, ID search, empty result, clear filters,
  page 2, sorting/reset to page 1, all four profile tabs, reference-only
  investment relationships, pending Investment/Compliance notices, and the
  real existing Accounts route (correct tenant/type, Back).
- Lists and all detail tabs at 1672, 1440, 1280, 900, 390 and 320; detail
  actions/tabs also at 1440×600 and 900×600. No page horizontal overflow.
- Shared tabs: arrows, Home/End, roving focus and visible outline checked.
  KYC statuses remain text; the aggregate label now accurately includes both
  pending and in-review records without redefining either state.
- Accounts regression: local pause → reactivate, both participant tabs,
  detail and tenant navigation passed. No account action was added to Operation.
- No financial values/actions, no Backend requests. Fresh axe unavailable;
  Claude's earlier automated results are not claimed as an independent rerun.
- Full validation/evidence/limitations: the Codex review section in
  [operation-opportunities-v1.md](operation-opportunities-v1.md#independent-codex-review-2026-10-07).
