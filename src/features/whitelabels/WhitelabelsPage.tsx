import { useMemo, useState } from 'react'
import { Box, Building, ChartNoAxesColumnIncreasing, Link, type LucideIcon } from 'lucide-react'
import { AppShell } from '../../components/shell/AppShell'
import { usePrototypeNotice } from '../../components/shell/prototypeNotice'
import type { Tone } from '../../components/ui/IconTile'
import { MetricCard } from '../../components/ui/MetricCard'
import { EmptyState } from '../../components/ui/EmptyState'
import { WhitelabelDetailPanel } from './WhitelabelDetailPanel'
import { WhitelabelListPanel, type SortKey, type StatusFilter } from './WhitelabelListPanel'
import { DotMatrixBackground } from './visuals/DotMatrixBackground'
import { DEFAULT_WHITELABEL_ACCENT } from './visuals/visualAccent'
import { PROTOTYPE_WHITELABELS, STATUS_META, type Whitelabel } from './prototypeWhitelabels'
import styles from './WhitelabelsPage.module.css'

/**
 * Whitelabels V1 — list + detail for the Plataformas domain.
 *
 * Frontend-only prototype: three illustrative rows, local search/filter/sort
 * and selection. Summary cards stay in the data-ready "—" state; nothing is
 * fetched, saved or authenticated.
 */
export function WhitelabelsPage({ accentColor = DEFAULT_WHITELABEL_ACCENT }: { accentColor?: string }) {
  return (
    <AppShell activeNav="plataformas" activeSubNav="whitelabels" title="Whitelabels" location="Whitelabels">
      <WhitelabelsContent accentColor={accentColor} />
    </AppShell>
  )
}

const SUMMARY: { id: string; label: string; icon: LucideIcon; tone: Tone }[] = [
  { id: 'total', label: 'Total de plataformas', icon: Building, tone: 'blue' },
  { id: 'active', label: 'Ativos', icon: ChartNoAxesColumnIncreasing, tone: 'teal' },
  { id: 'setup', label: 'Em configuração', icon: Box, tone: 'amber' },
  { id: 'integrations', label: 'Integrações', icon: Link, tone: 'violet' },
]

const MOBILE_QUERY = '(max-width: 767px)'

/** Lower-case, accent-free text for forgiving local search. */
const normalize = (value: string) =>
  value.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim()

function WhitelabelsContent({ accentColor = DEFAULT_WHITELABEL_ACCENT }: { accentColor?: string }) {
  const notify = usePrototypeNotice()
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<StatusFilter>('all')
  const [sort, setSort] = useState<{ key: SortKey; direction: 'ascending' | 'descending' } | null>(null)
  // One active row drives detail; there is no bulk-selection workflow.
  const [activeId, setActiveId] = useState('wl_proto_01')

  const rows = useMemo(() => {
    const needle = normalize(query)
    const filtered = PROTOTYPE_WHITELABELS.filter((row) => {
      const matchesStatus = status === 'all' || row.status === status
      const matchesQuery =
        !needle || [row.name, row.domain, row.slug].some((field) => normalize(field).includes(needle))
      return matchesStatus && matchesQuery
    })
    if (!sort) return filtered
    const value = (row: Whitelabel) =>
      sort.key === 'status' ? STATUS_META[row.status].label : sort.key === 'updatedAt' ? (row.updatedAt ?? '') : row[sort.key]
    const factor = sort.direction === 'ascending' ? 1 : -1
    return [...filtered].sort((a, b) => factor * value(a).localeCompare(value(b), 'pt-BR'))
  }, [query, status, sort])

  const active = rows.find((row) => row.id === activeId) ?? rows[0]

  function activate(id: string) {
    setActiveId(id)
    // Stacked phone layout: bring the detail panel into view after choosing a row.
    if (window.matchMedia(MOBILE_QUERY).matches) {
      const smooth = !window.matchMedia('(prefers-reduced-motion: reduce)').matches
      window.requestAnimationFrame(() => {
        const detail = document.getElementById('whitelabel-detail')
        detail?.focus({ preventScroll: true })
        detail?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'start' })
      })
    }
  }

  return (
    <div className={styles.page}>
      <DotMatrixBackground accentColor={accentColor} />
      <section aria-labelledby="wl-summary-heading">
        <h2 id="wl-summary-heading" className="visually-hidden">
          Resumo de whitelabels
        </h2>
        <ul className={styles.summary}>
          {SUMMARY.map((card) => (
            <li key={card.id} className={styles.summaryCell}>
              <MetricCard
                label={card.label}
                icon={card.icon}
                tone={card.tone}
                density="compact"
                onOpen={() =>
                  notify(`Protótipo visual: o detalhamento de "${card.label}" ficará disponível após a integração.`)
                }
              />
            </li>
          ))}
        </ul>
      </section>

      <div className={styles.split}>
        <WhitelabelListPanel
          rows={rows}
          total={PROTOTYPE_WHITELABELS.length}
          query={query}
          onQueryChange={setQuery}
          status={status}
          onStatusChange={setStatus}
          sort={sort}
          onSortChange={setSort}
          activeId={active?.id}
          onActivate={activate}
          accentColor={accentColor}
        />
        {active ? <WhitelabelDetailPanel whitelabel={active} /> : (
          <section className={styles.noSelection} aria-label="Detalhes do Whitelabel">
            <EmptyState icon={Building} title="Nenhum Whitelabel em exibição" description="Ajuste os filtros para consultar os detalhes de um resultado ilustrativo." />
          </section>
        )}
      </div>
      <p className="visually-hidden" role="status">
        {active ? `Detalhes de ${active.name} em exibição.` : 'Nenhum Whitelabel em exibição.'}
      </p>
    </div>
  )
}
