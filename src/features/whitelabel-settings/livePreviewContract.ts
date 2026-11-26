import type {
  EnvironmentCapability,
  FrontendEnvironment,
  ProvisioningDelivery,
  ProvisioningRecord,
} from '../whitelabel-provisioning/provisioningApi'

export type LivePreviewEnvironment = FrontendEnvironment

/** Platform web experience cells use the shared-FE live preview (never the editorial CSS mock). */
export function supportsLiveWhitelabelPreview(cell: string): boolean {
  // features.* and terminology use a representative live page (not a fake route).
  return !cell.startsWith('app_') && cell !== 'email_branding.config'
}

export type LivePreviewTarget = {
  environment: LivePreviewEnvironment
  label: string
  capability: EnvironmentCapability
  /** True when delivery.enabledEnvironments includes this capability (or no delivery list). */
  contracted: boolean
  /** Tenant-owned HTTPS URL suitable for preview, or null when unavailable/unsafe. */
  url: string | null
  source: 'delivery' | 'convention' | 'unavailable'
}

const ENVIRONMENTS: {
  environment: LivePreviewEnvironment
  label: string
  capability: EnvironmentCapability
  deliveryKey: 'investor' | 'entrepreneur' | 'admin'
  convention: (slug: string) => string
}[] = [
  {
    environment: 'investor',
    label: 'Investidor',
    capability: 'INVESTOR',
    deliveryKey: 'investor',
    convention: (slug) => `https://${slug}.loor.vc`,
  },
  {
    environment: 'entrepreneur',
    label: 'Empreendedor',
    capability: 'ENTREPRENEUR',
    deliveryKey: 'entrepreneur',
    convention: (slug) => `https://${slug}.empresa.loor.vc`,
  },
  {
    environment: 'admin',
    label: 'Admin',
    capability: 'ADMIN',
    deliveryKey: 'admin',
    convention: (slug) => `https://${slug}.admin.loor.vc`,
  },
]

export const LIVE_PREVIEW_ENVIRONMENTS = ENVIRONMENTS.map((row) => row.environment)

function normalizeSlug(raw: string | null | undefined): string | null {
  if (typeof raw !== 'string') return null
  const slug = raw.trim().toLowerCase()
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 64) return null
  return slug
}

/** Reject credentials, fragments, non-http(s), and hosts that do not belong to the tenant slug. */
export function isTenantOwnedPreviewUrl(raw: string, slug: string): boolean {
  try {
    const url = new URL(raw)
    if (!['https:', 'http:'].includes(url.protocol)) return false
    if (url.username || url.password) return false
    if (url.hash) return false
    const host = url.hostname.toLowerCase()
    const s = slug.toLowerCase()
    if (host === `${s}.loor.vc`) return true
    if (host === `${s}.empresa.loor.vc`) return true
    if (host === `${s}.admin.loor.vc`) return true
    // PATH-mode shared FE: host may be shared; require /w/{slug} prefix.
    if (url.pathname === `/w/${s}` || url.pathname.startsWith(`/w/${s}/`)) return true
    // Conservative HOSTNAME allowance: `{slug}.…`
    if (host === s || host.startsWith(`${s}.`)) return true
    return false
  } catch {
    return false
  }
}

function deliveryEnabled(delivery: ProvisioningDelivery | null | undefined): EnvironmentCapability[] | null {
  if (!delivery) return null
  const list = delivery.enabledEnvironments
  if (!Array.isArray(list) || list.length === 0) return null
  return list.filter((item): item is EnvironmentCapability =>
    item === 'INVESTOR' || item === 'ENTREPRENEUR' || item === 'ADMIN',
  )
}

function pickDeliveryUrl(
  delivery: ProvisioningDelivery | null | undefined,
  key: 'investor' | 'entrepreneur' | 'admin',
  slug: string,
): string | null {
  if (!delivery?.urls) return null
  const candidate =
    key === 'investor'
      ? delivery.urls.investor ?? delivery.urls.primary
      : delivery.urls[key]
  if (typeof candidate !== 'string' || !candidate.trim()) return null
  const trimmed = candidate.trim()
  return isTenantOwnedPreviewUrl(trimmed, slug) ? trimmed.replace(/\/$/, '') : null
}

/**
 * Resolve live preview targets for the current Whitelabel.
 * Prefer Nest delivery.urls; fall back to HOSTNAME convention from the tenant slug.
 * Never invent a URL for another tenant.
 */
export function resolveLivePreviewTargets(input: {
  whitelabelId: string
  slug: string | null | undefined
  provisioning: ProvisioningRecord | null
}): LivePreviewTarget[] {
  const slug = normalizeSlug(input.slug)
  const delivery = input.provisioning?.delivery ?? null
  const enabled = deliveryEnabled(delivery)

  // Isolation: ignore delivery bound to a different Core Whitelabel id.
  const deliveryTrusted =
    delivery &&
    input.provisioning &&
    (input.provisioning.whitelabelId === null ||
      String(input.provisioning.whitelabelId) === input.whitelabelId) &&
    (!delivery.whitelabelId || String(delivery.whitelabelId) === input.whitelabelId) &&
    (!delivery.slug || normalizeSlug(delivery.slug) === slug)

  return ENVIRONMENTS.map((row) => {
    const contracted = enabled ? enabled.includes(row.capability) : true
    if (!slug) {
      return {
        environment: row.environment,
        label: row.label,
        capability: row.capability,
        contracted,
        url: null,
        source: 'unavailable' as const,
      }
    }

    const fromDelivery = deliveryTrusted ? pickDeliveryUrl(delivery, row.deliveryKey, slug) : null
    if (fromDelivery) {
      return {
        environment: row.environment,
        label: row.label,
        capability: row.capability,
        contracted,
        url: fromDelivery,
        source: 'delivery' as const,
      }
    }

    const convention = row.convention(slug)
    if (!isTenantOwnedPreviewUrl(convention, slug)) {
      return {
        environment: row.environment,
        label: row.label,
        capability: row.capability,
        contracted,
        url: null,
        source: 'unavailable' as const,
      }
    }

    return {
      environment: row.environment,
      label: row.label,
      capability: row.capability,
      contracted,
      url: convention,
      source: 'convention' as const,
    }
  })
}

export function defaultLivePreviewEnvironment(targets: LivePreviewTarget[]): LivePreviewEnvironment {
  const first = targets.find((row) => row.contracted && row.url)
  return first?.environment ?? 'investor'
}
