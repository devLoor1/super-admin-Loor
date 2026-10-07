import { Plus, Search, SearchX, Link2 } from 'lucide-react'
import { EmptyState } from '../../../components/ui/EmptyState'
import { OutlineButton } from '../../../components/ui/OutlineButton'
import { PrimaryButton } from '../../../components/ui/PrimaryButton'
import { StatusPill } from '../../../components/ui/StatusPill'
import {
  CREDENTIAL_FIELDS,
  DISPLAY_STATUS_META,
  ENVIRONMENT_LABEL,
  ROLE_LABEL,
  displayStatusOf,
  providerOf,
  type GatewayConfig,
  type GatewayDisplayStatus,
} from '../financeModel'
import styles from './FinanceSections.module.css'

export type StatusFilter = GatewayDisplayStatus | 'all'

type Props = {
  whitelabelName: string
  gateways: GatewayConfig[]
  rows: GatewayConfig[]
  selectedId: string | null
  /** Gateway whose detail has unsaved local drafts (shown as "Alterado localmente"). */
  editedId: string | null
  query: string
  onQueryChange: (value: string) => void
  status: StatusFilter
  onStatusChange: (value: StatusFilter) => void
  onSelect: (id: string) => void
  onCreate: () => void
}

/**
 * Gateways configurados — local, illustrative configurations of this
 * Whitelabel. Row selection drives the detail panel. No bulk actions.
 */
export function GatewayList({
  whitelabelName,
  gateways,
  rows,
  selectedId,
  editedId,
  query,
  onQueryChange,
  status,
  onStatusChange,
  onSelect,
  onCreate,
}: Props) {
  const filtersActive = Boolean(query) || status !== 'all'
  return (
    <section className={styles.card} aria-labelledby="fin-gateways-title" data-detail-stage>
      <header className={styles.cardHeader}>
        <div className={styles.cardHeading}>
          <h2 id="fin-gateways-title" className={styles.cardTitle}>
            Gateways configurados
          </h2>
          <p className={styles.cardSubtitle}>
            Provedores, ambientes e estado das credenciais de {whitelabelName}. Catálogo ilustrativo.
          </p>
        </div>
        <PrimaryButton className={styles.headerButton} onClick={onCreate} data-create-gateway>
          <Plus size={17} strokeWidth={2} aria-hidden="true" />
          Configurar gateway
        </PrimaryButton>
      </header>

      {gateways.length ? (
        <>
          <div className={styles.listControls}>
            <label className={styles.search}>
              <Search size={16} strokeWidth={1.8} aria-hidden="true" />
              <span className="visually-hidden">Buscar por provedor</span>
              <input
                type="search"
                value={query}
                onChange={(event) => onQueryChange(event.target.value)}
                placeholder="Buscar por provedor…"
              />
            </label>
            <label className={styles.filter}>
              <span className="visually-hidden">Filtrar por status</span>
              <select value={status} onChange={(event) => onStatusChange(event.target.value as StatusFilter)}>
                <option value="all">Todos os status</option>
                {(Object.keys(DISPLAY_STATUS_META) as GatewayDisplayStatus[]).map((key) => (
                  <option key={key} value={key}>
                    {DISPLAY_STATUS_META[key].label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className={styles.tableArea}>
            <table className={styles.table}>
              <caption className="visually-hidden">Gateways configurados de {whitelabelName}</caption>
              <thead>
                <tr>
                  <th scope="col">Provedor</th>
                  <th scope="col" className={styles.colRole}>
                    Papel
                  </th>
                  <th scope="col" className={styles.colEnv}>
                    Ambiente
                  </th>
                  <th scope="col" className={styles.colStatus}>
                    Status
                  </th>
                  <th scope="col" className={styles.colCreds}>
                    Credenciais
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((gateway) => {
                  const provider = providerOf(gateway.providerId)
                  const display = DISPLAY_STATUS_META[displayStatusOf(gateway)]
                  const selected = gateway.id === selectedId
                  const edited = gateway.id === editedId
                  const configured = CREDENTIAL_FIELDS.filter((field) => gateway.credentials[field.key].configured).length
                  return (
                    <tr key={gateway.id} className={styles.row} data-active={selected || undefined}>
                      <td>
                        <button
                          type="button"
                          className={styles.rowButton}
                          onClick={() => onSelect(gateway.id)}
                          aria-current={selected ? 'true' : undefined}
                          aria-controls="fin-gateway-detail"
                          data-gateway-row={gateway.id}
                        >
                          <span className={styles.avatar} data-tone={provider.tone} aria-hidden="true">
                            {provider.initial}
                          </span>
                          <span className={styles.rowName}>
                            {provider.name}
                            <span className={styles.rowMeta}>
                              {ROLE_LABEL[gateway.role]} · {ENVIRONMENT_LABEL[gateway.environment]}
                            </span>
                          </span>
                          <span className="visually-hidden">, ver detalhes</span>
                        </button>
                        <span className={styles.rowStatusInline}>
                          <span className={styles.statusStack}>
                            <StatusPill tone={display.tone} label={display.label} />
                            {edited ? <StatusPill tone="warning" label="Alterado localmente" /> : null}
                          </span>
                        </span>
                      </td>
                      <td className={styles.colRole}>
                        <span className={styles.roleTag} data-role={gateway.role}>
                          {ROLE_LABEL[gateway.role]}
                        </span>
                      </td>
                      <td className={styles.colEnv}>
                        <span className={styles.env} data-env={gateway.environment}>
                          <span className={styles.envDot} aria-hidden="true" />
                          {ENVIRONMENT_LABEL[gateway.environment]}
                        </span>
                      </td>
                      <td className={styles.colStatus}>
                        <span className={styles.statusStack}>
                          <StatusPill tone={display.tone} label={display.label} />
                          {edited ? <StatusPill tone="warning" label="Alterado localmente" /> : null}
                        </span>
                      </td>
                      <td className={styles.colCreds}>
                        <span className={styles.credsCell}>
                          <span className={styles.mask} aria-hidden="true">
                            ••••••••
                          </span>
                          {configured === CREDENTIAL_FIELDS.length ? 'Completas' : `${configured} de ${CREDENTIAL_FIELDS.length}`}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>

            {rows.length === 0 ? (
              <div className={styles.emptyBox}>
                <EmptyState icon={SearchX} title="Nenhum gateway encontrado" description="Ajuste a busca ou o filtro de status." />
                {filtersActive ? (
                  <OutlineButton
                    onClick={() => {
                      onQueryChange('')
                      onStatusChange('all')
                    }}
                  >
                    Limpar filtros
                  </OutlineButton>
                ) : null}
              </div>
            ) : null}
          </div>

          <p className={styles.listFooter} aria-live="polite">
            Mostrando {rows.length} de {gateways.length} · Configuração local do protótipo; provedores não confirmados
            pelo Backend.
          </p>
        </>
      ) : (
        <div className={styles.emptyBox}>
          <EmptyState
            icon={Link2}
            title="Nenhum gateway configurado"
            description={`${whitelabelName} ainda não tem gateways neste protótipo. Use “Configurar gateway” para adicionar uma configuração local.`}
          />
        </div>
      )}
    </section>
  )
}
