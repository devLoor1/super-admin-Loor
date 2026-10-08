# Financeiro › Investimentos V1 — local implementation record

Part of Finance Core V1, implemented by Claude and independently reviewed by
Codex on 2026-10-08 on `feature/super-admin-finance-core-v1`, from baseline
`400c1dce…`. Consolidated locally only. Shared architecture, safety
boundaries, separate QA evidence and open questions:
[finance-core-v1.md](finance-core-v1.md). Approved composition:
[`reference/super-admin-finance-core-investments-approved.png`](reference/super-admin-finance-core-investments-approved.png)
(illustrative values only).

## Purpose

Read-only financial supervision of investment records across Whitelabels:
find → inspect → see the explicitly referenced payment and wallet movements →
navigate to the responsible module. Not Operação › Investidores (people), not
Pagamentos / PIX (payments), not Wallet (balances / movements).

## Routes

| Route | Screen |
| --- | --- |
| `#/finance/investments` | Global list. Optional context: `?investidor=:investorId` (from Operação › Investidores) and/or `?wallet=:walletId` (investments a wallet's movements reference) — removable chips. Removing either updates the URL while preserving only the other context; reload cannot restore a removed filter. Clearing filters removes both. |
| `#/finance/investments/:investmentId` | Read-only detail. Unknown / malformed ids → "Investimento não encontrado". |

## Model and data

`Investment { investmentId, investorId, opportunityId, whitelabelId, modality,
amount, currency, status, paymentId?, createdAt?, updatedAt? }` — 13 frozen
seeds (INV-0001…INV-0013; 11 Finapop, 2 Loor; 8 Debt, 5 Equity; 6 Ativo, 4
Pendente, 3 Encerrado; INV-0007 has no payment). Investor and opportunity are
references to Operation records (names read live; never copied or mutated).
The investment keeps its own Whitelabel and modality; if the Operation
opportunity changes either during the session, the detail says so and nothing
is synchronised. Modality is Equity or Debt only.

States **Pendente / Ativo / Encerrado** are prototype states (no transitions,
no manual change); they are independent of the payment status (e.g. INV-0003
Pendente with PG-00047 Em processamento; INV-0008 Pendente with PG-00049
Falhou; INV-0001 Ativo with PG-00045 Pago).

## List

- Cards: **Total de investimentos (13) · Ativos (6) · Pendentes (4) ·
  Encerrados (3)** — counts only, no volume / value cards; note says they are
  prototype counts.
- Search: investment ID, investor name / id, opportunity name / id
  (accent-insensitive; opportunity names live).
- Filters: Whitelabel, status, modality (Equity / Debt), payment context
  (Sem pagamento vinculado / Pagamento: pendente, em processamento, pago,
  falhou), *Limpar filtros*.
- Sort: investor, opportunity, amount, status, updated date (column headers;
  an *Ordenar por* select appears when sortable columns collapse). Default:
  most recently updated first. Sorting returns to page 1.
- Columns: Investimento, Investidor, Oportunidade, Whitelabel, Modalidade,
  Valor, Status, Pagamento, Atualizado em, Ações (*Abrir* only). 8 rows per
  page. No create CTA, no row selection, no bulk action.

## Detail

- Header: "INV" monogram, **Investimento INV-…**, status, investor (+ id),
  opportunity (+ id), Whitelabel; *Ver investidor* and *Ver oportunidade*.
- **Visão geral:** Informações principais (ID, investor, opportunity,
  Whitelabel, modality, value, status, payment id + status, created, updated)
  and Navegação para domínios responsáveis — *Ver investidor*
  (`#/operation/investors/:id`), *Ver oportunidade*
  (`#/operation/opportunities/:id`), *Ver pagamento / PIX* (payment detail) and
  *Ver Wallet* (wallet of the explicitly related movements). Without a payment
  or a movement, those two answer with a notice and do not navigate.
- **Pagamento / PIX:** Resumo do pagamento (payment id, method, status,
  related amount, created, updated) + *Ver em Pagamentos / PIX*; movements
  that reference that payment + *Ver na Wallet*; note that investment and
  payment statuses are independent.
- **Wallet / Movimentações:** movements whose source is this investment or its
  payment (movement, nature, description, relation "Via pagamento …" /
  "Referência direta", value, status, date) linking to the wallet with that
  movement opened; no balance is computed.
- **Atividade da sessão.**

## Exact action boundary

Allowed: search, filter, sort, paginate, open, switch tabs, navigate. Not
present: new, edit, change status, cancel, confirm, settle, delete, refund,
cashout, wallet credit / debit.
