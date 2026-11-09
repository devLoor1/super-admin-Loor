import { useRemote } from '../../../lib/useRemoteResource'
import {
  getInvestment,
  getPayment,
  getWallet,
  listFinanceTenants,
  listInvestments,
  listPayments,
  listWalletInvestments,
  listWalletMovements,
  listWallets,
  type InvestmentDetail,
  type InvestmentQuery,
  type InvestmentRecord,
  type MovementQuery,
  type MovementRecord,
  type PagedResult,
  type PaymentDetail,
  type PaymentQuery,
  type PaymentRecord,
  type WalletDetail,
  type WalletInvestmentQuery,
  type WalletQuery,
  type WalletRecord,
} from './financeApi'

/*
 * Finance read hooks on the shared request model (`useRemote`): one request
 * per key, a newer key or unmount aborts the previous request, late responses
 * never overwrite current data, and nothing retries automatically.
 * Keys include every query value, so a filter / page / record change can never
 * show the previous result under the new context.
 */

export function useInvestmentList(params: InvestmentQuery | null) {
  return useRemote<PagedResult<InvestmentRecord>>(params ? `investments:${JSON.stringify(params)}` : null, (signal) => listInvestments(params!, signal))
}

export function useInvestmentDetail(id: string | null) {
  return useRemote<InvestmentDetail>(id ? `investment:${id}` : null, (signal) => getInvestment(id!, signal))
}

export function usePaymentList(params: PaymentQuery | null) {
  return useRemote<PagedResult<PaymentRecord>>(params ? `payments:${JSON.stringify(params)}` : null, (signal) => listPayments(params!, signal))
}

export function usePaymentDetail(id: string | null) {
  return useRemote<PaymentDetail>(id ? `payment:${id}` : null, (signal) => getPayment(id!, signal))
}

export function useWalletList(params: WalletQuery) {
  return useRemote<PagedResult<WalletRecord>>(`wallets:${JSON.stringify(params)}`, (signal) => listWallets(params, signal))
}

export function useWalletDetail(id: string | null) {
  return useRemote<WalletDetail>(id ? `wallet:${id}` : null, (signal) => getWallet(id!, signal))
}

export function useWalletMovements(walletId: string | null, params: MovementQuery) {
  return useRemote<PagedResult<MovementRecord>>(
    walletId ? `movements:${walletId}:${JSON.stringify(params)}` : null,
    (signal) => listWalletMovements(walletId!, params, signal),
  )
}

export function useWalletInvestments(walletId: string | null, params: WalletInvestmentQuery) {
  return useRemote<PagedResult<InvestmentRecord>>(
    walletId ? `wallet-investments:${walletId}:${JSON.stringify(params)}` : null,
    (signal) => listWalletInvestments(walletId!, params, signal),
  )
}

/** Whitelabel names for Finance rows / filters, from the wallet projection (`GET /wallets?perPage=100`). */
export function useFinanceTenants() {
  return useRemote<PagedResult<WalletRecord>>('finance-tenants', (signal) => listFinanceTenants(signal))
}
