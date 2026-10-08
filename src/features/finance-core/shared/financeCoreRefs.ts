import { useCallback } from 'react'
import { ENVIRONMENT_LABEL, providerOf, type GatewayConfig } from '../../finance-gateways/financeModel'
import { useAllFinanceSettings } from '../../finance-gateways/financeStore'
import { formatDateTime, whitelabelName } from '../../operation/shared/operationModel'
import { investorById } from '../../operation/shared/participants'
import type { WalletOwner } from './financeCoreModel'

/*
 * Read-only resolution of references to OTHER domains (Operation investors,
 * Gateways e contas). Values are read live from those modules and never
 * copied into a Finance Core record.
 */

export const dateText = (iso: string | undefined) => formatDateTime(iso ?? null) ?? '—'

export function investorName(id: string | undefined) {
  if (!id) return undefined
  return investorById(id)?.account.name
}

/** Display name + reference of a wallet's (non-authoritative) owner / context. */
export function ownerLabel(owner: WalletOwner | undefined) {
  if (!owner) return { name: 'Titular não informado', reference: '—' }
  if (owner.kind === 'context') return { name: owner.label, reference: owner.reference }
  return { name: investorName(owner.investorId) ?? 'Investidor não encontrado', reference: owner.investorId }
}

export type ResolvedGateway = {
  id: string
  name: string
  whitelabelId: string
  environment: string
  active: boolean
}

/** Resolves gateway ids against the live Gateways e contas configuration (read-only). */
export function useGatewayResolver() {
  const settings = useAllFinanceSettings()
  return useCallback(
    (gatewayId: string): ResolvedGateway | undefined => {
      for (const tenant of Object.values(settings)) {
        const gateway: GatewayConfig | undefined = tenant.gateways.find((item) => item.id === gatewayId)
        if (gateway) {
          return {
            id: gateway.id,
            name: providerOf(gateway.providerId).name,
            whitelabelId: tenant.whitelabelId,
            environment: ENVIRONMENT_LABEL[gateway.environment],
            active: gateway.active,
          }
        }
      }
      return undefined
    },
    [settings],
  )
}

export const gatewayFilterLabel = (gateway: ResolvedGateway | undefined, gatewayId: string) =>
  gateway ? `${gateway.name} · ${whitelabelName(gateway.whitelabelId)}` : gatewayId
