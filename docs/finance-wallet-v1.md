# Financeiro › Wallet V1 — local implementation record

Part of Finance Core V1, implemented by Claude and independently reviewed by
Codex on 2026-10-08 on `feature/super-admin-finance-core-v1`, from baseline
`400c1dce…`. Consolidated locally only. Shared architecture, safety
boundaries, separate QA evidence and open questions:
[finance-core-v1.md](finance-core-v1.md). Approved composition:
[`reference/super-admin-finance-core-wallet-approved.png`](reference/super-admin-finance-core-wallet-approved.png)
(illustrative values only).

## Purpose

Read-only supervision of wallets and their movements across Whitelabels.
The balance shown is a **prototype representation** — not withdrawable,
transferable or settled value, and not computed from the movements.

## Routes

| Route | Screen |
| --- | --- |
| `#/finance/wallets` | Global list. |
| `#/finance/wallets/:walletId` | Read-only detail. Optional `?movimento=:movementId` opens the Movimentações tab with that movement's inline detail (same route; closing it drops the parameter without leaving the page; a movement of another wallet → notice). Unknown / malformed ids → "Wallet não encontrada". |

## Model and data

`Wallet { walletId, whitelabelId, ownerReference?, currency,
representedBalance, status, createdAt?, updatedAt? }` and `WalletMovement {
movementId, walletId, direction, amount, currency, status, description,
sourceType?, sourceId?, createdAt?, updatedAt? }` — 9 wallets (WAL-0001…0009;
7 Ativa, 2 Bloqueada; 7 with movements) and 20 movements (MOV-0001…0020;
origins: payment, investment, transfer `TRF-0001`, other). `ownerReference`
is an Operation investor or an operational context (`Operações internas`,
`OPR-0001/0002`); it is **non-authoritative** (ownership model open).

Wallet states **Ativa / Bloqueada**; movement states **Pendente / Concluído /
Falhou**; nature **Crédito / Débito** (icon + text). All prototype states; no
block / unblock or any other change exists.

## List

- Cards: **Total de Wallets (9) · Ativas (7) · Bloqueadas (2) · Com
  movimentações (7)** — no global balance.
- Search: wallet ID, owner / context name or reference, related references
  (movement ids and their source ids, e.g. `TRF-0001`, `PG-00045`).
- Filters: Whitelabel, status, currency (BRL — as in the approved
  composition), com / sem movimentações, *Limpar filtros*.
- Sort: wallet, owner, **Saldo representado**, status, updated date (headers +
  *Ordenar por* select when columns collapse).
- Columns: Wallet, Titular / contexto, Whitelabel, Moeda, **Saldo
  representado**, Movimentações ("3 mov."), Status, Atualizada em, Ações
  (*Abrir* only). No create CTA, no bulk action.

## Detail

- Header: "W" monogram, **Wallet WAL-…**, status, currency, owner / context,
  Whitelabel; *Ver titular* (Operation investor profile, or a notice for an
  operational context) and *Ver investimentos* (`#/finance/investments?wallet=`).
- **Visão geral:** Informações principais (ID, owner / context, Whitelabel,
  currency, Saldo representado + "Representação do protótipo" tag, status,
  created, updated), domain navigation (*Ver titular*, *Ver Pagamentos / PIX*
  → `#/finance/payments?wallet=`, *Ver investimentos*, *Ver movimentações*)
  and the note "O saldo exibido é uma representação do protótipo — não é valor
  sacável, transferível ou liquidado, e não é calculado a partir das
  movimentações."
- **Movimentações:** Resumo da wallet (Saldo representado, status, number of
  movements, last movement, *Ver Pagamentos / PIX*) and the table **Movimento,
  Natureza, Descrição, Origem, Referência, Valor, Status, Data, Ação**. Rows
  are read-only; the row action (eye, `aria-expanded`) opens an **inline
  detail** beside the table (≥ 1080px panel) or below it: ID, wallet, nature,
  description, value, status, origin, reference, created, updated, plus *Ver
  pagamento* / *Ver investimento* links, the transfer notice
  ("Módulo Financeiro › Transferências ainda não implementado") or "Origem não
  detalhada no protótipo". Focus moves to the detail heading; Escape or ✕
  closes it and returns focus to the row action.
- Opening a movement updates `?movimento=` through the existing hash router.
  Reload restores that selection; Back to the base Wallet clears the inline
  detail, Forward restores it, and close removes the query without remounting
  the Wallet. Invalid/foreign movements never fall back to another record.
- **Relações financeiras:** Pagamentos relacionados (via which movements),
  Investimentos relacionados (via a movement or via a referenced payment) and
  **Transferências** as a pending state ("Módulo pendente", *Ver
  transferência* → notice). Only explicit relationships.
- **Atividade da sessão.**

## Exact action boundary

Allowed: search, filter, sort, paginate, open, switch tabs, open/close a
movement's detail, navigate. Not present: create, edit / adjust balance,
manual credit / debit, create / edit movement, change status, transfer,
cashout, withdraw, deposit, refund, reverse, reconcile, block / unblock,
delete.
