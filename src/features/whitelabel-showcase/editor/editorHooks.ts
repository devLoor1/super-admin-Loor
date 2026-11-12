import { showcaseEnvironment } from '../showcaseMapping'
import { useEffect, useMemo, useState } from 'react'
import { getSessionVersion, useSessionOperator } from '../../../lib/authSession'
import { canEditShowcase, canViewShowcase, showcaseSettingsEntryHref, type ShowcaseActor } from '../showcaseAccess'
import type { CardSource } from '../showcaseModel'
import { readSource, type SourceStatus } from '../showcaseSourceLookup'
import { SHOWCASE_V2_WRITES_ENABLED } from '../showcaseRelease'

/** Presentation permissions; Backend authorization remains authoritative. */
export function useShowcaseActor(): { actor: ShowcaseActor; canEdit: boolean; canView: boolean } {
  const operator = useSessionOperator()
  const roles = operator?.roles
  const sessionVersion = getSessionVersion()
  return useMemo(() => ({ actor: { roles, sessionVersion }, canEdit: SHOWCASE_V2_WRITES_ENABLED && canEditShowcase(roles), canView: canViewShowcase(roles) }), [roles, sessionVersion])
}

export function useShowcaseSettingsEntry(record: { id: string; slug: string }) {
  const { actor } = useShowcaseActor()
  return showcaseSettingsEntryHref({ tenantId: record.id, tenantSlug: record.slug, environment: showcaseEnvironment(), roles: actor.roles })
}

export type SourceState = { status: SourceStatus | 'loading' }

/** Re-read each distinct source directly by ID; do not enumerate all tenants. */
export function useSourceStates(sources: readonly CardSource[]) {
  const [states, setStates] = useState<Record<string, SourceState>>({})
  const { actor } = useShowcaseActor()
  const key = JSON.stringify([...new Map(sources.map(source => [source.whitelabelId, source])).values()].map(source => ({ whitelabelId: source.whitelabelId, slug: source.slug, name: source.name, logical: null })))
  useEffect(() => {
    const controller = new AbortController()
    const unique = JSON.parse(key) as CardSource[]
    void Promise.all(unique.map(async source => {
      try { return [source.whitelabelId, await readSource(source, controller.signal)] as const }
      catch { return [source.whitelabelId, { status: 'error' as const }] as const }
    })).then(entries => {
      if (!controller.signal.aborted) setStates(Object.fromEntries(entries))
    })
    return () => controller.abort()
  }, [key, actor.sessionVersion])
  return (source: CardSource): SourceState => states[source.whitelabelId] ?? { status: 'loading' }
}

export const SOURCE_STATUS_MESSAGES: Partial<Record<SourceStatus, string>> = {
  inactive: 'Origem inativa: o conteúdo personalizado deste card foi preservado. Revise a origem antes de salvar.',
  missing: 'Origem não encontrada: o conteúdo personalizado foi preservado. Revise a origem antes de salvar.',
  changed: 'O slug da origem mudou desde a criação do card. O conteúdo personalizado foi preservado.',
  error: 'Não foi possível verificar a origem agora. O conteúdo personalizado não foi alterado.',
}
