import { buildHash } from '../../app/routeQuery'

/** `#/whitelabel-provisionings/new` — implantation wizard. */
export function provisioningNewHref() {
  return buildHash('whitelabel-provisionings/new', {})
}

/** `#/whitelabel-provisionings/:id` — progress / gates / delivery. */
export function provisioningHref(id: string) {
  return buildHash(`whitelabel-provisionings/${encodeURIComponent(id)}`, {})
}

export function isProvisioningId(value: string) {
  return /^[a-z0-9_-]{8,64}$/i.test(value)
}
