import { API_BASE } from '../../lib/api'

/** Closed until the canonical homolog build explicitly enables this capability. */
export const SHOWCASE_ENABLED = import.meta.env.VITE_SHOWCASE_ENABLED === 'true'
  && API_BASE === 'https://backend-super-admin-loor.onrender.com/api'
export type ShowcaseEnvironment = 'homolog' | 'outro'
export const showcaseEnvironment = (): ShowcaseEnvironment => SHOWCASE_ENABLED ? 'homolog' : 'outro'
export const showcaseOwnerSettingsHref = (tenantId: string) => `#/whitelabels/${encodeURIComponent(tenantId)}/settings`
export const showcaseEditorHref = (tenantId: string, tab?: string) =>
  `#/whitelabels/${encodeURIComponent(tenantId)}/settings/plataforma/vitrine${tab ? `?aba=${tab}` : ''}`
export const showcaseCardHref = (tenantId: string, instanceId: string) =>
  `#/whitelabels/${encodeURIComponent(tenantId)}/settings/plataforma/vitrine/cards/${encodeURIComponent(instanceId)}`
/** Authenticated preview is separate from the public application's route. */
export const showcasePublicHref = (tenantId: string, draft = false) =>
  `#/whitelabels/${encodeURIComponent(tenantId)}/settings/plataforma/vitrine/preview${draft ? '?versao=rascunho' : ''}`
export function isShowcaseFamilyHash(hash: string) {
  return /^whitelabels\/6\/settings\/plataforma\/vitrine(?:\/cards\/[^/]+|\/preview)?$/.test(hash.replace(/^#\/?/, '').split('?')[0])
}
