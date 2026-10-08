import type { Investment, Payment, Wallet, WalletMovement } from './financeCoreModel'
import {
  PROTOTYPE_INVESTMENTS,
  PROTOTYPE_PAYMENTS,
  PROTOTYPE_WALLETS,
  PROTOTYPE_WALLET_MOVEMENTS,
} from './prototypeFinanceCore'

/*
 * Read-only access to the Finance Core prototype records plus the EXPLICIT
 * relationship lookups the screens need. Every helper only follows an id a
 * record carries; none infers a relationship (e.g. "same investor" or "same
 * amount"), computes a balance or changes a status. Records are frozen so
 * no screen can mutate them by accident.
 */

const freezeAll = <T extends object>(items: T[]): readonly Readonly<T>[] =>
  Object.freeze(items.map((item) => Object.freeze({ ...item })))

export const INVESTMENTS = freezeAll<Investment>(PROTOTYPE_INVESTMENTS)
export const PAYMENTS = freezeAll<Payment>(PROTOTYPE_PAYMENTS)
export const WALLETS = freezeAll<Wallet>(PROTOTYPE_WALLETS)
export const WALLET_MOVEMENTS = freezeAll<WalletMovement>(PROTOTYPE_WALLET_MOVEMENTS)

export const investmentById = (id: string | undefined) => (id ? INVESTMENTS.find((item) => item.investmentId === id) : undefined)
export const paymentById = (id: string | undefined) => (id ? PAYMENTS.find((item) => item.paymentId === id) : undefined)
export const walletById = (id: string | undefined) => (id ? WALLETS.find((item) => item.walletId === id) : undefined)

export const movementsOfWallet = (walletId: string) => WALLET_MOVEMENTS.filter((item) => item.walletId === walletId)

/** Movements whose explicit source is this payment. */
export const movementsForPayment = (paymentId: string) =>
  WALLET_MOVEMENTS.filter((item) => item.sourceType === 'payment' && item.sourceId === paymentId)

export type RelatedMovement = { movement: Readonly<WalletMovement>; via: 'investment' | 'payment' }

/**
 * Movements that explicitly reference this investment, plus the movements
 * that reference the payment the investment explicitly points to.
 */
export function movementsForInvestment(investment: Readonly<Investment>): RelatedMovement[] {
  return WALLET_MOVEMENTS.flatMap((movement): RelatedMovement[] => {
    if (movement.sourceType === 'investment' && movement.sourceId === investment.investmentId) return [{ movement, via: 'investment' }]
    if (investment.paymentId && movement.sourceType === 'payment' && movement.sourceId === investment.paymentId) {
      return [{ movement, via: 'payment' }]
    }
    return []
  })
}

/** Distinct wallet ids of the given movements, in order of appearance. */
export const walletIdsOf = (movements: readonly Readonly<WalletMovement>[]) => [...new Set(movements.map((item) => item.walletId))]

export type WalletPaymentRef = { paymentId: string; payment: Readonly<Payment> | undefined; movementIds: string[] }
export type WalletInvestmentRef = {
  investmentId: string
  investment: Readonly<Investment> | undefined
  /** How the relationship is explicit: a movement referencing it, or a referenced payment pointing to it. */
  via: { kind: 'movement' | 'payment'; id: string }[]
}
export type WalletTransferRef = { transferId: string; movementIds: string[] }

/** Payments, investments and transfers a wallet's movements explicitly reference. */
export function walletRelations(walletId: string) {
  const movements = movementsOfWallet(walletId)
  const payments = new Map<string, WalletPaymentRef>()
  const investments = new Map<string, WalletInvestmentRef>()
  const transfers = new Map<string, WalletTransferRef>()

  const addInvestment = (investmentId: string, via: WalletInvestmentRef['via'][number]) => {
    const current = investments.get(investmentId) ?? { investmentId, investment: investmentById(investmentId), via: [] }
    current.via.push(via)
    investments.set(investmentId, current)
  }

  for (const movement of movements) {
    if (!movement.sourceId) continue
    if (movement.sourceType === 'payment') {
      const current = payments.get(movement.sourceId) ?? { paymentId: movement.sourceId, payment: paymentById(movement.sourceId), movementIds: [] }
      current.movementIds.push(movement.movementId)
      payments.set(movement.sourceId, current)
    }
    if (movement.sourceType === 'investment') addInvestment(movement.sourceId, { kind: 'movement', id: movement.movementId })
    if (movement.sourceType === 'transfer') {
      const current = transfers.get(movement.sourceId) ?? { transferId: movement.sourceId, movementIds: [] }
      current.movementIds.push(movement.movementId)
      transfers.set(movement.sourceId, current)
    }
  }
  // Second explicit hop: a referenced payment that itself references an investment.
  for (const ref of payments.values()) {
    if (ref.payment?.investmentId) addInvestment(ref.payment.investmentId, { kind: 'payment', id: ref.paymentId })
  }

  return { movements, payments: [...payments.values()], investments: [...investments.values()], transfers: [...transfers.values()] }
}
