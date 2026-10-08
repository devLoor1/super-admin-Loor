import { buildHash } from '../../app/routeQuery'
import { PROTOTYPE_ACCOUNTS } from '../whitelabel-accounts/prototypeAccounts'
import { PROTOTYPE_WHITELABELS } from '../whitelabels/prototypeWhitelabels'
import { AUDIT_LIST_PATH, AUDIT_RESOURCE_LABEL, type AuditEvent } from './auditModel'

/*
 * Destinations of an event's resource in the module that owns it. Navigation
 * only: following a link never changes the source record, and the Auditoria
 * event itself stays untouched. Resources without a screen in the prototype
 * answer with a controlled "destino ainda não implementado" notice.
 */

export type ResourceDestination =
  | { kind: 'link'; href: string; label: string; description: string }
  | { kind: 'unavailable'; label: string; description: string; message: string }

const ACCOUNT_TAB = { investor: 'investidores', entrepreneur: 'empreendedores', admin: 'administradores' } as const

export function resourceDestination(event: AuditEvent): ResourceDestination {
  const wl = event.whitelabelId
  const id = event.resourceId
  const unavailable = (what: string): ResourceDestination => ({
    kind: 'unavailable',
    label: 'Ir para recurso',
    description: `${AUDIT_RESOURCE_LABEL[event.resourceType]} — destino ainda não implementado`,
    message: `Destino ainda não implementado: ${what} não existe no protótipo. Nenhuma navegação foi feita.`,
  })
  const link = (href: string, description: string): ResourceDestination => ({ kind: 'link', href, label: 'Ir para recurso', description })

  switch (event.resourceType) {
    case 'session':
      return unavailable('a tela de sessões administrativas (Sistema)')
    case 'whitelabel':
      return link('#/whitelabels', 'Plataformas › Whitelabels (lista; sem link direto por Whitelabel)')
    case 'whitelabel_settings':
      return wl ? link(`#/whitelabels/${wl}/settings`, 'Plataformas › Config. do Whitelabel') : unavailable('o Whitelabel deste evento')
    case 'smtp':
      return wl ? link(`#/whitelabels/${wl}/emails?section=smtp`, 'Plataformas › E-mails (SMTP)') : unavailable('o Whitelabel deste evento')
    case 'account':
    case 'admin': {
      const account = id ? PROTOTYPE_ACCOUNTS.find((item) => item.id === id) : undefined
      if (!wl || !account) return unavailable('esta conta')
      return link(`#/whitelabels/${wl}/accounts?tipo=${ACCOUNT_TAB[account.type]}`, 'Plataformas › Contas do Whitelabel (sem link direto por conta)')
    }
    case 'gateway':
      return wl ? link(`#/whitelabels/${wl}/finance/gateways`, 'Financeiro › Gateways e contas do Whitelabel') : unavailable('este gateway')
    case 'opportunity':
      return id ? link(`#/operation/opportunities/${encodeURIComponent(id)}`, 'Operação › Oportunidades') : unavailable('esta oportunidade')
    case 'kyc_case':
      return id ? link(`#/compliance/kyc/${encodeURIComponent(id)}`, 'Compliance › KYC') : unavailable('este caso KYC')
  }
}

export const whitelabelLabel = (id: string | null) =>
  id ? PROTOTYPE_WHITELABELS.find((item) => item.id === id)?.name ?? 'Whitelabel não encontrado' : 'Global (sem Whitelabel)'

/** URL-backed Auditoria list context. */
export const auditListHref = (params: { resourceType?: string; resourceId?: string; whitelabel?: string; actor?: string; action?: string } = {}) =>
  buildHash(AUDIT_LIST_PATH, params)

/** Copies a non-sensitive identifier; the caller reports the outcome. */
export async function copyIdentifier(value: string) {
  try {
    if (!navigator.clipboard) return false
    await navigator.clipboard.writeText(value)
    return true
  } catch {
    return false
  }
}
