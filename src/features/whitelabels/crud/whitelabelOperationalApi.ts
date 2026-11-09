import { getSessionVersion } from '../../../lib/authSession'
import { ApiError } from '../../../lib/api'
import { getWhitelabel, listWhitelabels, type WhitelabelRecord } from '../whitelabelApi'
import { authenticatedWhitelabelWrite } from '../../../lib/whitelabelWriteClient'
import { createWhitelabelMutationRunner } from './whitelabelMutationRunner'

/** Bounded complete search; partial/inconsistent pagination never proves absence. */
export async function findWhitelabelBySlug(slug: string) {
  const rows: WhitelabelRecord[] = []
  let total: number | undefined
  let lastPage: number | undefined
  for (let page = 1; page <= 20; page += 1) {
    const result = await listWhitelabels({ page, search: slug, status: 'all' })
    if (result.page !== page || (total !== undefined && (total !== result.total || lastPage !== result.lastPage))) {
      return { rows, complete: false }
    }
    total = result.total
    lastPage = result.lastPage
    if (result.rows.some(row => rows.some(prior => prior.id === row.id))) return { rows, complete: false }
    rows.push(...result.rows)
    if (page >= result.lastPage) return { rows, complete: rows.length === result.total }
  }
  return { rows, complete: false }
}

// Session-local coordinator survives dialog close and route changes. Uncertain attempts cannot
// disappear on ordinary navigation. Nothing is stored in the browser or sent automatically.
let coordinator: { version: number; runner: ReturnType<typeof createWhitelabelMutationRunner> } | undefined
export function getWhitelabelOperationalRunner() {
  const version = getSessionVersion()
  if (!coordinator || coordinator.version !== version) {
    coordinator?.runner.dispose()
    coordinator = { version, runner: createWhitelabelMutationRunner({
      transport: async command => {
        try { return { ok: true, body: await authenticatedWhitelabelWrite(command, version) } }
        catch (error) { return { ok: false, error } }
      },
      readback: { getWhitelabel: async id => {
        if (getSessionVersion() !== version) throw new ApiError(0, {}, { kind: 'network' })
        const record = await getWhitelabel(id)
        if (getSessionVersion() !== version) throw new ApiError(0, {}, { kind: 'network' })
        return record
      }, findBySlug: findWhitelabelBySlug },
    }) }
  }
  return coordinator.runner
}
