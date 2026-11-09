import { useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import { useSessionOperator } from '../../../lib/authSession'
import { canEditShowcase, canViewShowcase, showcaseSettingsEntryHref, type ShowcaseActor } from '../showcaseAccess'
import type { CardSource, SourceDefaults } from '../showcaseModel'
import { getSimulation, subscribeSimulation } from '../showcaseSimulation'
import { readSource, type SourceStatus } from '../showcaseSourceLookup'
import { subscribeSourceDefaults } from '../fixtures/showcaseSourceDefaults'

/** Current session roles → simulated presentation permissions (not Backend authorization). */
export function useShowcaseActor(): { actor: ShowcaseActor; canEdit: boolean; canView: boolean } {
  const operator = useSessionOperator()
  const roles = operator?.roles
  return useMemo(() => ({ actor: { roles }, canEdit: canEditShowcase(roles), canView: canViewShowcase(roles) }), [roles])
}

export function useSimulation() {
  return useSyncExternalStore(subscribeSimulation, getSimulation, getSimulation)
}

/** Settings destination for a Whitelabels-list record, or null when this session/context is not eligible. */
export function useShowcaseSettingsEntry(record: { id: string; slug: string }) {
  const { actor } = useShowcaseActor()
  const { environment } = useSimulation()
  return showcaseSettingsEntryHref({ tenantId: record.id, tenantSlug: record.slug, environment, roles: actor.roles })
}

export type SourceState = { status: SourceStatus | 'loading'; defaults: SourceDefaults | null }

/**
 * Re-reads each distinct source through the existing record contract (mock
 * transport) so the editor can warn about inactive/missing sources. Read only.
 */
export function useSourceStates(sources: readonly CardSource[]) {
  const [states, setStates] = useState<Record<string, SourceState>>({})
  const [revision, setRevision] = useState(0)
  const key = [...new Set(sources.map(source => `${source.whitelabelId}|${source.slug}`))].sort().join(',')
  useEffect(() => subscribeSourceDefaults(() => setRevision(value => value + 1)), [])
  useEffect(() => {
    if (!key) return
    const controller = new AbortController()
    const unique = key.split(',').map(item => {
      const [whitelabelId, slug] = item.split('|')
      return { whitelabelId, slug, name: '', logical: null } satisfies CardSource
    })
    void Promise.all(unique.map(async source => {
      try {
        return [`${source.whitelabelId}|${source.slug}`, await readSource(source, controller.signal)] as const
      } catch {
        return null
      }
    })).then(entries => {
      if (controller.signal.aborted) return
      setStates(Object.fromEntries(entries.filter(entry => entry !== null)))
    })
    return () => controller.abort()
  }, [key, revision])
  return (source: CardSource): SourceState => states[`${source.whitelabelId}|${source.slug}`] ?? { status: 'loading', defaults: null }
}

export const SOURCE_STATUS_MESSAGES: Partial<Record<SourceStatus, string>> = {
  inactive: 'Origem inativa: as personalizações deste card foram preservadas; restaurar padrões fica indisponível.',
  missing: 'Origem não encontrada no cadastro: as personalizações foram preservadas; restaurar padrões fica indisponível.',
  changed: 'O slug da origem mudou desde a criação do card: as personalizações foram preservadas; revise a origem antes de restaurar padrões.',
  error: 'Não foi possível verificar a origem agora. As personalizações não foram alteradas.',
}
