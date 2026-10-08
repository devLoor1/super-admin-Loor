# Financeiro › Pagamentos / PIX V1 — local implementation record

Part of Finance Core V1, implemented by Claude and independently reviewed by
Codex on 2026-10-08 on `feature/super-admin-finance-core-v1`, from baseline
`400c1dce…`. Consolidated locally only. Shared architecture, safety
boundaries, separate QA evidence and open questions:
[finance-core-v1.md](finance-core-v1.md). Approved composition:
[`reference/super-admin-finance-core-payments-pix-approved.png`](reference/super-admin-finance-core-payments-pix-approved.png)
(illustrative values only).

## Purpose

Read-only supervision of payment records across Whitelabels. Charge
generation, PIX creation, confirmation, settlement, cancellation, refund,
reversal and reprocessing stay outside this module; nothing calls a gateway
or a bank.

## Routes

| Route | Screen |
| --- | --- |
| `#/finance/payments` | Global list. Optional `?wallet=:walletId` context (payments a wallet's movements reference), removable chip. |
| `#/finance/payments/:paymentId` | Read-only detail. Unknown / malformed ids → "Pagamento não encontrado". |

## Model and data

`Payment { paymentId, whitelabelId, investmentId?, investorId?,
opportunityId?, gatewayId, method, amount, currency, status,
externalReference?, pixReference?, pixChargeId?, createdAt?, updatedAt?,
paidAt? }` — 16 frozen seeds (PG-00036…PG-00051): 9 Pago, 2 Pendente, 2 Em
processamento, 3 Falhou; 14 PIX, 1 Boleto, 1 TED (illustrative method list);
12 with an investment, 4 without (PG-00037 and PG-00039 reference only an
investor, PG-00042 an investor and an opportunity, PG-00043 nothing). A
payment may exist without an investment; no cardinality is final.
`gatewayId` references the seeded configurations of Gateways e contas
(`gw_finapop_alfa`, `gw_finapop_beta`, `gw_loor_alfa`), resolved live to the
fictitious provider name.

States **Pendente / Em processamento / Pago / Falhou** are prototype states;
no action changes them and they never change an investment or a wallet.

## List

- Cards: **Total de pagamentos (16, "3 com falha") · Pendentes (2) · Em
  processamento (2) · Pagos (9)** — counts only, no value totals.
- Search: payment ID, investment ID, investor name / id, opportunity name / id.
- Filters: Whitelabel, status, method, gateway ("Provedor Alfa · Finapop" …),
  com / sem investimento, *Limpar filtros*.
- Sort: ID, amount, status, gateway, updated date (headers + *Ordenar por*
  select when columns collapse). Default: most recently updated first.
- Columns: Pagamento, Investimento, Investidor, Oportunidade, Whitelabel,
  Método, Gateway, Valor, Status, Atualizado em, Ações (*Abrir* only). No
  create CTA, no bulk action.

## Detail

- Header: "PG" monogram, **Pagamento PG-…**, status, method, gateway,
  Whitelabel, investment; *Ver investimento* and *Ver gateway*.
- **Visão geral:** Informações principais (ID, investment, investor,
  opportunity, Whitelabel, gateway + id, method, value, status, external
  reference, created, updated, paid) and Navegação para domínios responsáveis
  — *Ver investimento*, *Ver gateway* (opens the payment Whitelabel's Gateways
  e contas screen: no per-gateway deep link exists, Gateways was not changed),
  *Ver oportunidade*, *Ver na Wallet*. Missing references answer with a notice.
- **PIX:** method, Identificador da cobrança (`COB-…`, fictitious), TxID /
  referência PIX (`TX-PIX-…`, fictitious), Status PIX (= payment status in V1),
  gateway, created, updated, paid; dashed placeholder **"QR Code não disponível
  no protótipo."**; *Ver gateway*. No expiration (not in the data). Non-PIX
  payments say there is no PIX data and show no placeholder. Never a payload,
  copy-and-paste code, key, payable QR or link.
- **Relações financeiras:** the referenced investment (investor, opportunity,
  investment status, *Ver investimento*) and the wallet movements whose source
  is this payment (links open the wallet with that movement), *Ver na Wallet*.
- **Atividade da sessão.**

## Exact action boundary

Allowed: search, filter, sort, paginate, open, switch tabs, navigate. Not
present: create charge, generate PIX, alter status, confirm, settle, cancel,
refund, reverse, reprocess, edit amount, credit / debit wallet, delete.
