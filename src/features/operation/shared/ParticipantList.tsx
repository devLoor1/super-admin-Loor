import { useMemo, useState, type CSSProperties } from 'react'
import { Eye, FilterX, Mail, Search, type LucideIcon } from 'lucide-react'
import { StatusPill } from '../../../components/ui/StatusPill'
import { OutlineButton } from '../../../components/ui/OutlineButton'
import { AccountAvatar, BusinessBadge } from '../../whitelabel-accounts/AccountBadges'
import { ACCESS_META, type AccessState } from '../../whitelabel-accounts/accountModel'
import fin from '../../finance-gateways/sections/FinanceSections.module.css'
import { PROTOTYPE_WHITELABELS } from '../../whitelabels/prototypeWhitelabels'
import {
  KYC_META,
  PAGE_SIZE,
  compareDate,
  compareText,
  formatDateTime,
  initials,
  normalize,
  whitelabelName,
  type KycStatus,
  type SortState,
} from './operationModel'
import type { ParticipantProfile } from './participants'
import { NoResults, Pagination, SortButton, SummaryCards, WhitelabelTag, type SummaryCard } from './OperationUi'
import shared from './Operation.module.css'
import styles from './Participants.module.css'

export type ParticipantListConfig = {
  /** "investidor" / "empreendedor". */
  singular: string
  plural: string
  detailHref: (id: string) => string
  /** Relationship shown as a count only (never an amount). */
  relation: {
    column: string
    filterLabel: string
    anyLabel: string
    withLabel: string
    withoutLabel: string
    count: (profile: ParticipantProfile) => number
    format: (count: number) => string
    summaryLabel: string
    summaryIcon: LucideIcon
  }
  summaryIcons: { total: LucideIcon; active: LucideIcon; kyc: LucideIcon }
}

type SortKey = 'name' | 'activity'
type RelationFilter = 'all' | 'with' | 'without'

/**
 * Global, read-only participant list (Investidores / Empreendedores):
 * search, filters, sort, pagination and "Abrir perfil". No create, no edit,
 * no account / KYC / financial action — those belong to other domains.
 */
export function ParticipantList({ profiles, config }: { profiles: ParticipantProfile[]; config: ParticipantListConfig }) {
  const [query, setQuery] = useState('')
  const [whitelabel, setWhitelabel] = useState('all')
  const [access, setAccess] = useState<'all' | AccessState>('all')
  const [kyc, setKyc] = useState<'all' | KycStatus>('all')
  const [relation, setRelation] = useState<RelationFilter>('all')
  const [sort, setSort] = useState<SortState<SortKey>>({ key: 'name', direction: 'ascending' })
  const [page, setPage] = useState(1)
  const { relation: rel } = config

  const filtered = useMemo(() => {
    const needle = normalize(query)
    const rows = profiles.filter((profile) => {
      if (whitelabel !== 'all' && profile.whitelabelId !== whitelabel) return false
      if (access !== 'all' && profile.account.accessState !== access) return false
      if (kyc !== 'all' && profile.kyc.status !== kyc) return false
      if (relation !== 'all' && (rel.count(profile) > 0) !== (relation === 'with')) return false
      return !needle || normalize(`${profile.account.name} ${profile.account.email} ${profile.id}`).includes(needle)
    })
    const direction = sort.direction === 'ascending' ? 1 : -1
    return [...rows].sort((a, b) => {
      if (sort.key === 'activity') {
        const [x, y] = [a.account.lastActivityAt, b.account.lastActivityAt]
        if (!x || !y) return compareDate(x, y)
        return direction * compareDate(x, y)
      }
      return direction * compareText(a.account.name, b.account.name)
    })
  }, [profiles, query, whitelabel, access, kyc, relation, rel, sort])

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const current = Math.min(page, pageCount)
  const rows = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE)
  const filtersActive = Boolean(query.trim()) || whitelabel !== 'all' || access !== 'all' || kyc !== 'all' || relation !== 'all'

  const activeCount = profiles.filter((profile) => profile.account.accessState === 'active').length
  const pendingKyc = profiles.filter((profile) => profile.kyc.status === 'pending').length
  const reviewKyc = profiles.filter((profile) => profile.kyc.status === 'in_review').length
  const withRelation = profiles.filter((profile) => rel.count(profile) > 0).length

  const cards: SummaryCard[] = [
    {
      label: `Total de ${config.plural}`,
      value: profiles.length,
      detail: 'Todos os Whitelabels',
      icon: config.summaryIcons.total,
      tone: 'blue',
    },
    {
      label: 'Ativos',
      value: activeCount,
      detail: `Conta ativa · ${profiles.length - activeCount} pausada${profiles.length - activeCount === 1 ? '' : 's'}`,
      icon: config.summaryIcons.active,
      tone: 'teal',
    },
    {
      label: 'KYC não concluído',
      value: pendingKyc + reviewKyc,
      detail: `${pendingKyc} pendente${pendingKyc === 1 ? '' : 's'} · ${reviewKyc} em análise`,
      icon: config.summaryIcons.kyc,
      tone: 'amber',
    },
    {
      label: rel.summaryLabel,
      value: withRelation,
      detail: `de ${profiles.length} ${config.plural}`,
      icon: rel.summaryIcon,
      tone: 'violet',
    },
  ]

  function update<T>(setter: (value: T) => void) {
    return (value: T) => {
      setter(value)
      setPage(1)
    }
  }

  function clearFilters() {
    setQuery('')
    setWhitelabel('all')
    setAccess('all')
    setKyc('all')
    setRelation('all')
    setPage(1)
  }

  function toggleSort(key: SortKey) {
    setSort((currentSort) =>
      currentSort.key !== key
        ? { key, direction: key === 'activity' ? 'descending' : 'ascending' }
        : { key, direction: currentSort.direction === 'ascending' ? 'descending' : 'ascending' },
    )
  }

  return (
    <>
      <SummaryCards
        title={`Resumo de ${config.plural}`}
        cards={cards}
        note="Contagens do estado local deste protótipo (todos os Whitelabels) — não são dados de produção. KYC é um resumo de Compliance; vínculos são ilustrativos."
      />

      <section className={`${fin.card} ${shared.listCard}`} aria-labelledby="participant-list-title">
        <h2 id="participant-list-title" className="visually-hidden">
          Lista de {config.plural}
        </h2>
        <div className={shared.filters} style={{ '--filter-count': 4 } as CSSProperties}>
          <label className={fin.search}>
            <Search size={16} strokeWidth={1.8} aria-hidden="true" />
            <span className="visually-hidden">Buscar por nome, e-mail ou ID do {config.singular}</span>
            <input
              type="search"
              value={query}
              placeholder={`Buscar por nome, e-mail ou ID do ${config.singular}…`}
              onChange={(event) => update(setQuery)(event.target.value)}
            />
          </label>
          <div className={shared.filterSelects}>
            <label className={fin.filter}>
              <span className="visually-hidden">Filtrar por Whitelabel</span>
              <select value={whitelabel} onChange={(event) => update(setWhitelabel)(event.target.value)}>
                <option value="all">Todos os Whitelabels</option>
                {PROTOTYPE_WHITELABELS.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
            <label className={fin.filter}>
              <span className="visually-hidden">Filtrar por status da conta</span>
              <select value={access} onChange={(event) => update(setAccess)(event.target.value as 'all' | AccessState)}>
                <option value="all">Todos os status da conta</option>
                <option value="active">Conta ativa</option>
                <option value="paused">Conta pausada</option>
              </select>
            </label>
            <label className={fin.filter}>
              <span className="visually-hidden">Filtrar por status de KYC</span>
              <select value={kyc} onChange={(event) => update(setKyc)(event.target.value as 'all' | KycStatus)}>
                <option value="all">Todos os status de KYC</option>
                {(Object.keys(KYC_META) as KycStatus[]).map((key) => (
                  <option key={key} value={key}>
                    KYC {KYC_META[key].label.toLowerCase()}
                  </option>
                ))}
              </select>
            </label>
            <label className={fin.filter}>
              <span className="visually-hidden">{rel.filterLabel}</span>
              <select value={relation} onChange={(event) => update(setRelation)(event.target.value as RelationFilter)}>
                <option value="all">{rel.anyLabel}</option>
                <option value="with">{rel.withLabel}</option>
                <option value="without">{rel.withoutLabel}</option>
              </select>
            </label>
          </div>
          <OutlineButton className={shared.clearButton} onClick={clearFilters} disabled={!filtersActive}>
            <FilterX size={15} strokeWidth={1.8} aria-hidden="true" />
            Limpar filtros
          </OutlineButton>
        </div>

        <div className={fin.tableArea}>
          <table className={`${fin.table} ${shared.table} ${styles.table}`}>
            <caption className="visually-hidden">
              {config.plural.charAt(0).toUpperCase() + config.plural.slice(1)} de todos os Whitelabels (visão operacional,
              somente leitura)
            </caption>
            <thead>
              <tr>
                <th scope="col" className={styles.colName} aria-sort={sort.key === 'name' ? sort.direction : undefined}>
                  <SortButton
                    label={config.singular.charAt(0).toUpperCase() + config.singular.slice(1)}
                    sorted={sort.key === 'name'}
                    direction={sort.direction}
                    onClick={() => toggleSort('name')}
                  />
                </th>
                <th scope="col" className={styles.colEmail}>
                  E-mail
                </th>
                <th scope="col" className={styles.colWl}>
                  Whitelabel
                </th>
                <th scope="col" className={styles.colStatus}>
                  Status da conta
                </th>
                <th scope="col" className={styles.colKyc}>
                  KYC
                </th>
                <th scope="col" className={styles.colRelation}>
                  {rel.column}
                </th>
                <th scope="col" className={styles.colActivity} aria-sort={sort.key === 'activity' ? sort.direction : undefined}>
                  <SortButton label="Última atividade" sorted={sort.key === 'activity'} direction={sort.direction} onClick={() => toggleSort('activity')} />
                </th>
                <th scope="col" className={shared.colActions}>
                  Ações
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((profile) => {
                const accessMeta = ACCESS_META[profile.account.accessState]
                const kycMeta = KYC_META[profile.kyc.status]
                const count = rel.count(profile)
                const activity = formatDateTime(profile.account.lastActivityAt)
                const href = config.detailHref(profile.id)
                return (
                  <tr key={profile.id} className={fin.row} data-participant={profile.id}>
                    <td className={styles.colName}>
                      <span className={shared.cellMain}>
                        <span className={styles.avatar}>
                          <AccountAvatar initials={initials(profile.account.name)} />
                        </span>
                        <span className={shared.cellText}>
                          <a href={href} className={shared.rowLink}>
                            {profile.account.name}
                          </a>
                          <span className={shared.rowId}>{profile.id}</span>
                          <span className={styles.metaEmail}>{profile.account.email}</span>
                          <span className={styles.metaContext}>
                            {whitelabelName(profile.whitelabelId)} · {rel.column}: {rel.format(count)}
                          </span>
                          <span className={styles.metaActivity}>Última atividade: {activity ?? '—'}</span>
                          <span className={styles.metaStates}>
                            <StatusPill tone={accessMeta.tone} label={`Conta ${accessMeta.label.toLowerCase()}`} />
                            <BusinessBadge tone={kycMeta.tone} label={`KYC ${kycMeta.label.toLowerCase()}`} />
                          </span>
                        </span>
                      </span>
                    </td>
                    <td className={styles.colEmail}>
                      <span className={styles.email}>
                        <Mail size={14} strokeWidth={1.8} aria-hidden="true" />
                        {profile.account.email}
                      </span>
                    </td>
                    <td className={styles.colWl}>
                      <WhitelabelTag whitelabelId={profile.whitelabelId} />
                    </td>
                    <td className={styles.colStatus}>
                      <StatusPill tone={accessMeta.tone} label={accessMeta.label} />
                    </td>
                    <td className={styles.colKyc}>
                      <BusinessBadge tone={kycMeta.tone} label={kycMeta.label} />
                    </td>
                    <td className={styles.colRelation}>
                      <span className={shared.countTag} data-empty={count === 0 || undefined}>
                        {rel.format(count)}
                      </span>
                    </td>
                    <td className={`${styles.colActivity} ${shared.dateCell}`}>{activity ?? '—'}</td>
                    <td className={shared.colActions}>
                      <a
                        href={href}
                        className={`${fin.iconButton} ${shared.actionLink}`}
                        aria-label={`Abrir perfil de ${profile.account.name}`}
                        data-open-profile={profile.id}
                      >
                        <Eye size={15} strokeWidth={1.8} aria-hidden="true" />
                      </a>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {rows.length === 0 ? (
            <NoResults title={`Nenhum ${config.singular} encontrado`} description="Ajuste a busca ou os filtros." />
          ) : null}
        </div>

        <div className={shared.footer}>
          <p className={shared.range} aria-live="polite">
            {filtered.length
              ? `Mostrando ${(current - 1) * PAGE_SIZE + 1}–${Math.min(current * PAGE_SIZE, filtered.length)} de ${filtered.length} ${
                  filtered.length === 1 ? config.singular : config.plural
                }`
              : `Nenhum ${config.singular}`}
            {filtersActive ? ` (filtrados de ${profiles.length})` : ''}
          </p>
          <Pagination label={`Paginação de ${config.plural}`} page={current} pageCount={pageCount} onPage={setPage} />
        </div>
      </section>
    </>
  )
}
