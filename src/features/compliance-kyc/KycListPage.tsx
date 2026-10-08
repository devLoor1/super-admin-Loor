import { useMemo, useState, type CSSProperties } from 'react'
import { CircleCheck, Clock, Eye, FileText, FilterX, Info, Play, Search } from 'lucide-react'
import { replaceRouteKeepingScroll, useRestoreReplacedScroll } from '../../app/routeQuery'
import { OutlineButton } from '../../components/ui/OutlineButton'
import fin from '../finance-gateways/sections/FinanceSections.module.css'
import { ContextChip, DateStack, SortSelect, type SortOption } from '../finance-core/shared/FinanceCoreUi'
import fc from '../finance-core/shared/FinanceCore.module.css'
import { InfoNote, NoResults, PageIntro, Pagination, SortButton, SummaryCards, WhitelabelTag } from '../operation/shared/OperationUi'
import { PAGE_SIZE, compareDate, compareText, normalize, whitelabelName, type SortState } from '../operation/shared/operationModel'
import { entrepreneurById, investorById } from '../operation/shared/participants'
import shared from '../operation/shared/Operation.module.css'
import { PROTOTYPE_WHITELABELS } from '../whitelabels/prototypeWhitelabels'
import { kycListHref } from './kycLinks'
import {
  KYC_STATUSES,
  KYC_STATUS_META,
  PARTICIPANT_TYPES,
  PARTICIPANT_TYPE_LABEL,
  kycCaseHref,
  kycStatusFromParam,
  openIssueCount,
  type KycStatus,
  type ParticipantType,
} from './kycModel'
import { kycDateText, resolveParticipant } from './kycRefs'
import { useKycCases } from './kycStore'
import { KycShell, KycStatusPill, ParticipantCell, ParticipantTypeTag } from './KycUi'
import styles from './Kyc.module.css'

type SortKey = 'id' | 'participant' | 'type' | 'whitelabel' | 'status' | 'pending' | 'updatedAt'
type PendingFilter = 'all' | 'with' | 'without'

const STATUS_ORDER = Object.fromEntries(KYC_STATUSES.map((status, index) => [status, index])) as Record<KycStatus, number>

const SORT_OPTIONS: SortOption<SortKey>[] = [
  { key: 'id', label: 'Caso KYC', ascending: 'crescente', descending: 'decrescente' },
  { key: 'participant', label: 'Participante', ascending: 'A–Z', descending: 'Z–A' },
  { key: 'type', label: 'Tipo', ascending: 'Empreendedor primeiro', descending: 'Investidor primeiro' },
  { key: 'whitelabel', label: 'Whitelabel', ascending: 'A–Z', descending: 'Z–A' },
  { key: 'status', label: 'Status KYC', ascending: 'Pendente → Reprovado', descending: 'Reprovado → Pendente' },
  { key: 'pending', label: 'Pendências', ascending: 'menos primeiro', descending: 'mais primeiro' },
  { key: 'updatedAt', label: 'Atualizado em', ascending: 'mais antigo', descending: 'mais recente' },
]

const isKnownWhitelabel = (id: string | undefined) => Boolean(id && PROTOTYPE_WHITELABELS.some((item) => item.id === id))

/**
 * `#/compliance/kyc` — Compliance › KYC V1: global supervision of KYC cases of
 * investors and entrepreneurs. No create CTA, no bulk action; rows only open.
 * URL-backed context: `?participant=`, `?whitelabel=`, `?status=` (unknown
 * values are ignored with a visible note; an unknown participant shows an
 * empty list). Search, type, pending-issue filter, sort and page are local.
 */
export function KycListPage({
  participant,
  whitelabel,
  status,
  routeKey,
}: {
  participant?: string
  whitelabel?: string
  status?: string
  routeKey: string
}) {
  useRestoreReplacedScroll(routeKey)
  const cases = useKycCases()
  const [query, setQuery] = useState('')
  const [type, setType] = useState<'all' | ParticipantType>('all')
  const [pending, setPending] = useState<PendingFilter>('all')
  const [sort, setSort] = useState<SortState<SortKey>>({ key: 'updatedAt', direction: 'descending' })
  const [page, setPage] = useState(1)

  // URL-backed filters: valid values apply, unknown ones are ignored (and said so).
  const whitelabelFilter = isKnownWhitelabel(whitelabel) ? (whitelabel as string) : 'all'
  const statusFilter = kycStatusFromParam(status) ?? 'all'
  const ignored = [
    whitelabel && whitelabelFilter === 'all' ? `whitelabel “${whitelabel}”` : null,
    status && statusFilter === 'all' ? `status “${status}”` : null,
  ].filter(Boolean)
  const participantProfile = participant ? investorById(participant) ?? entrepreneurById(participant) : undefined

  function navigate(next: { participant?: string; whitelabel?: string; status?: string }) {
    setPage(1)
    replaceRouteKeepingScroll(kycListHref(next))
  }

  // Valid URL values only: an ignored value is dropped from the URL on the next change.
  const urlContext = {
    participant: participant || undefined,
    whitelabel: whitelabelFilter === 'all' ? undefined : whitelabelFilter,
    status: statusFilter === 'all' ? undefined : statusFilter,
  }

  const rows = useMemo(() => {
    const needle = normalize(query)
    const filtered = cases.filter((item) => {
      if (participant && item.participantId !== participant) return false
      if (whitelabelFilter !== 'all' && item.whitelabelId !== whitelabelFilter) return false
      if (statusFilter !== 'all' && item.status !== statusFilter) return false
      if (type !== 'all' && item.participantType !== type) return false
      if (pending !== 'all' && openIssueCount(item) > 0 !== (pending === 'with')) return false
      if (!needle) return true
      const person = resolveParticipant(item)
      return normalize([item.kycCaseId, item.participantId, item.accountId, person.name, person.email].join(' ')).includes(needle)
    })
    const direction = sort.direction === 'ascending' ? 1 : -1
    const nameOf = (item: (typeof filtered)[number]) => resolveParticipant(item).name
    return [...filtered].sort((a, b) => {
      const value =
        sort.key === 'updatedAt'
          ? compareDate(a.updatedAt, b.updatedAt)
          : sort.key === 'id'
            ? compareText(a.kycCaseId, b.kycCaseId)
            : sort.key === 'participant'
              ? compareText(nameOf(a), nameOf(b))
              : sort.key === 'type'
                ? compareText(PARTICIPANT_TYPE_LABEL[a.participantType], PARTICIPANT_TYPE_LABEL[b.participantType])
                : sort.key === 'whitelabel'
                  ? compareText(whitelabelName(a.whitelabelId), whitelabelName(b.whitelabelId))
                  : sort.key === 'status'
                    ? STATUS_ORDER[a.status] - STATUS_ORDER[b.status]
                    : openIssueCount(a) - openIssueCount(b)
      return direction * value || compareText(a.kycCaseId, b.kycCaseId)
    })
  }, [cases, query, participant, whitelabelFilter, statusFilter, type, pending, sort])

  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE))
  const current = Math.min(page, pageCount)
  const visible = rows.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE)
  const filtersActive =
    Boolean(query.trim()) || type !== 'all' || pending !== 'all' || Boolean(participant || whitelabel || status)

  const count = (key: KycStatus) => cases.filter((item) => item.status === key).length
  const withIssues = cases.filter((item) => openIssueCount(item) > 0).length

  function update<T>(setter: (value: T) => void) {
    return (value: T) => {
      setter(value)
      setPage(1)
    }
  }

  function clearFilters() {
    setQuery('')
    setType('all')
    setPending('all')
    setPage(1)
    if (participant || whitelabel || status) replaceRouteKeepingScroll(kycListHref())
  }

  function toggleSort(key: SortKey) {
    setPage(1)
    setSort((currentSort) =>
      currentSort.key !== key
        ? { key, direction: key === 'updatedAt' || key === 'pending' ? 'descending' : 'ascending' }
        : { key, direction: currentSort.direction === 'ascending' ? 'descending' : 'ascending' },
    )
  }

  const sortHeader = (key: SortKey, label: string) => (
    <SortButton label={label} sorted={sort.key === key} direction={sort.direction} onClick={() => toggleSort(key)} />
  )
  const ariaSort = (key: SortKey) => (sort.key === key ? sort.direction : undefined)

  return (
    <KycShell>
      <PageIntro text="Acompanhe casos de compliance de investidores e empreendedores em uma só visão global." />

      <SummaryCards
        title="Resumo dos casos KYC"
        note="Contagens do estado local deste protótipo (todos os Whitelabels, incluindo decisões registradas nesta sessão) — não são dados de produção."
        cards={[
          { label: 'Total de casos', value: cases.length, detail: `${withIssues} com pendências abertas`, icon: FileText, tone: 'blue' },
          { label: 'Pendentes', value: count('pending'), detail: 'Estado do protótipo', icon: Clock, tone: 'amber' },
          { label: 'Em análise', value: count('in_review'), detail: 'Estado do protótipo', icon: Play, tone: 'teal' },
          {
            label: 'Concluídos',
            value: count('approved') + count('rejected'),
            detail: `${count('approved')} aprovados · ${count('rejected')} reprovados`,
            icon: CircleCheck,
            tone: 'violet',
          },
        ]}
      />

      <section className={`${fin.card} ${shared.listCard}`} aria-labelledby="kyc-list-title">
        <h2 id="kyc-list-title" className="visually-hidden">
          Lista de casos KYC
        </h2>
        <div className={`${shared.filters} ${fc.filtersWide}`} style={{ '--filter-count': 4, '--search-fr': '1.7fr' } as CSSProperties}>
          <label className={fin.search}>
            <Search size={16} strokeWidth={1.8} aria-hidden="true" />
            <span className="visually-hidden">Buscar por participante, e-mail, ID do participante, ID da conta ou caso KYC</span>
            <input
              type="search"
              value={query}
              placeholder="Buscar por participante, e-mail, ID da conta ou caso KYC…"
              onChange={(event) => update(setQuery)(event.target.value)}
            />
          </label>
          <div className={shared.filterSelects}>
            <label className={fin.filter}>
              <span className="visually-hidden">Filtrar por Whitelabel</span>
              <select
                value={whitelabelFilter}
                onChange={(event) => navigate({ ...urlContext, whitelabel: event.target.value === 'all' ? undefined : event.target.value })}
                data-filter="whitelabel"
              >
                <option value="all">Todos os Whitelabels</option>
                {PROTOTYPE_WHITELABELS.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
            <label className={fin.filter}>
              <span className="visually-hidden">Filtrar por tipo de participante</span>
              <select value={type} onChange={(event) => update(setType)(event.target.value as 'all' | ParticipantType)} data-filter="type">
                <option value="all">Todos os tipos</option>
                {PARTICIPANT_TYPES.map((key) => (
                  <option key={key} value={key}>
                    {PARTICIPANT_TYPE_LABEL[key]}
                  </option>
                ))}
              </select>
            </label>
            <label className={fin.filter}>
              <span className="visually-hidden">Filtrar por status KYC</span>
              <select
                value={statusFilter}
                onChange={(event) => navigate({ ...urlContext, status: event.target.value === 'all' ? undefined : event.target.value })}
                data-filter="status"
              >
                <option value="all">Todos os status</option>
                {KYC_STATUSES.map((key) => (
                  <option key={key} value={key}>
                    {KYC_STATUS_META[key].label}
                  </option>
                ))}
              </select>
            </label>
            <label className={fin.filter}>
              <span className="visually-hidden">Filtrar por pendências abertas</span>
              <select value={pending} onChange={(event) => update(setPending)(event.target.value as PendingFilter)} data-filter="pending">
                <option value="all">Com e sem pendências</option>
                <option value="with">Com pendências abertas</option>
                <option value="without">Sem pendências abertas</option>
              </select>
            </label>
          </div>
          <OutlineButton className={shared.clearButton} onClick={clearFilters} disabled={!filtersActive}>
            <FilterX size={15} strokeWidth={1.8} aria-hidden="true" />
            Limpar filtros
          </OutlineButton>
        </div>

        {participant ? (
          <ContextChip
            dataName="participant"
            label={`Participante: ${participantProfile ? `${participantProfile.account.name} (${participant})` : `${participant} (não encontrado)`}`}
            removeLabel={`Remover filtro do participante ${participant}`}
            onRemove={() => navigate({ ...urlContext, participant: undefined })}
          />
        ) : null}

        {ignored.length ? (
          <p className={styles.ignoredNote} role="status" data-ignored-params>
            <Info size={14} strokeWidth={1.8} aria-hidden="true" />
            Filtro da URL não reconhecido e ignorado: {ignored.join(', ')}.
          </p>
        ) : null}

        <SortSelect
          className={styles.sortVisible}
          options={SORT_OPTIONS}
          sort={sort}
          onChange={(next) => {
            setSort(next)
            setPage(1)
          }}
        />

        <div className={fin.tableArea}>
          <table className={`${fin.table} ${shared.table} ${styles.table}`}>
            <caption className="visually-hidden">Casos KYC de todos os Whitelabels (protótipo)</caption>
            <thead>
              <tr>
                <th scope="col" className={styles.colId} aria-sort={ariaSort('id')}>
                  {sortHeader('id', 'Caso KYC')}
                </th>
                <th scope="col" className={styles.colParticipant} aria-sort={ariaSort('participant')}>
                  {sortHeader('participant', 'Participante')}
                </th>
                <th scope="col" className={styles.colType} aria-sort={ariaSort('type')}>
                  {sortHeader('type', 'Tipo')}
                </th>
                <th scope="col" className={styles.colWl} aria-sort={ariaSort('whitelabel')}>
                  {sortHeader('whitelabel', 'Whitelabel')}
                </th>
                <th scope="col" className={styles.colStatus} aria-sort={ariaSort('status')}>
                  {sortHeader('status', 'Status KYC')}
                </th>
                <th scope="col" className={styles.colPending} aria-sort={ariaSort('pending')}>
                  {sortHeader('pending', 'Pendências')}
                </th>
                <th scope="col" className={styles.colAccount}>
                  Conta / contexto
                </th>
                <th scope="col" className={styles.colUpdated} aria-sort={ariaSort('updatedAt')}>
                  {sortHeader('updatedAt', 'Atualizado em')}
                </th>
                <th scope="col" className={shared.colActions}>
                  Ações
                </th>
              </tr>
            </thead>
            <tbody>
              {visible.map((item) => {
                const href = kycCaseHref(item.kycCaseId)
                const person = resolveParticipant(item)
                const issues = openIssueCount(item)
                const issueText = issues === 0 ? 'Nenhuma aberta' : `${issues} ${issues === 1 ? 'aberta' : 'abertas'}`
                return (
                  <tr key={item.kycCaseId} className={fin.row} data-kyc-case={item.kycCaseId}>
                    <td className={styles.colId}>
                      <span className={shared.cellText}>
                        <a href={href} className={shared.rowLink}>
                          {item.kycCaseId}
                        </a>
                        <span className={styles.metaParticipant}>
                          {person.name} · {item.participantId}
                        </span>
                        <span className={styles.metaContext}>
                          {PARTICIPANT_TYPE_LABEL[item.participantType]} · {whitelabelName(item.whitelabelId)}
                        </span>
                        <span className={styles.metaAccount}>
                          Conta {item.accountId}
                          {person.accessLabel ? ` · ${person.accessLabel}` : ''}
                        </span>
                        <span className={styles.metaUpdated}>Atualizado em {kycDateText(item.updatedAt)}</span>
                        <span className={styles.metaStates}>
                          <KycStatusPill status={item.status} />
                          <span className={styles.issueCount} data-open={issues > 0 || undefined}>
                            Pendências: {issueText}
                          </span>
                        </span>
                      </span>
                    </td>
                    <td className={styles.colParticipant}>
                      <ParticipantCell participant={person} participantId={item.participantId} />
                    </td>
                    <td className={styles.colType}>
                      <ParticipantTypeTag type={item.participantType} />
                    </td>
                    <td className={styles.colWl}>
                      <WhitelabelTag whitelabelId={item.whitelabelId} />
                    </td>
                    <td className={styles.colStatus}>
                      <KycStatusPill status={item.status} />
                    </td>
                    <td className={styles.colPending}>
                      <span className={styles.issueCount} data-open={issues > 0 || undefined}>
                        {issues}
                        <span className="visually-hidden"> {issues === 1 ? 'pendência aberta' : 'pendências abertas'}</span>
                      </span>
                    </td>
                    <td className={styles.colAccount}>
                      <span className={shared.cellText}>
                        <span className={styles.accountId}>{item.accountId}</span>
                        <span className={shared.rowId}>{person.accessLabel ?? 'Conta não encontrada'}</span>
                      </span>
                    </td>
                    <td className={styles.colUpdated}>
                      <DateStack iso={item.updatedAt} />
                    </td>
                    <td className={shared.colActions}>
                      <a
                        href={href}
                        className={`${fin.iconButton} ${shared.actionLink}`}
                        aria-label={`Abrir caso KYC ${item.kycCaseId}`}
                        data-open-record={item.kycCaseId}
                      >
                        <Eye size={15} strokeWidth={1.8} aria-hidden="true" />
                      </a>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {visible.length === 0 ? (
            <NoResults
              title={participant && !participantProfile ? 'Participante não encontrado' : 'Nenhum caso KYC encontrado'}
              description={
                participant
                  ? 'Nenhum caso KYC do protótipo para este participante com os filtros atuais. Remova o contexto ou ajuste os filtros.'
                  : 'Ajuste a busca ou os filtros.'
              }
            />
          ) : null}
        </div>

        <div className={shared.footer}>
          <p className={shared.range} aria-live="polite">
            {rows.length
              ? `Mostrando ${(current - 1) * PAGE_SIZE + 1}–${Math.min(current * PAGE_SIZE, rows.length)} de ${rows.length} ${
                  rows.length === 1 ? 'caso' : 'casos'
                }`
              : 'Nenhum caso'}
            {filtersActive ? ` (filtrados de ${cases.length})` : ''}
          </p>
          <Pagination label="Paginação de casos KYC" page={current} pageCount={pageCount} onPage={setPage} />
        </div>
      </section>

      <InfoNote>
        <strong>KYC V1 é um módulo de supervisão de compliance do protótipo.</strong> Pendente, Em análise, Aprovado e Reprovado são
        estados ilustrativos, não o fluxo oficial de KYC. Nenhuma ação daqui altera contas, acessos, investidores, empreendedores,
        investimentos, oportunidades, pagamentos ou wallets, nem gera eventos na Auditoria.
      </InfoNote>
    </KycShell>
  )
}
