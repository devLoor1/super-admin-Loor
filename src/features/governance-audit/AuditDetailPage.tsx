import { useState, type ReactNode } from 'react'
import { ArrowLeft, Copy, FileSearch, Info, Link2, Lock, Search } from 'lucide-react'
import { useNotice } from '../../components/shell/notice'
import { EmptyState } from '../../components/ui/EmptyState'
import { OutlineButton } from '../../components/ui/OutlineButton'
import { Tabs } from '../../components/ui/Tabs'
import fin from '../finance-gateways/sections/FinanceSections.module.css'
import { KeyValueList, TabPanel } from '../finance-core/shared/FinanceCoreUi'
import fc from '../finance-core/shared/FinanceCore.module.css'
import { BackLink, DomainNavCard, InfoNote, type DomainNavItem } from '../operation/shared/OperationUi'
import { formatDateTime } from '../operation/shared/operationModel'
import shared from '../operation/shared/Operation.module.css'
import { loadedAuditRecord, type AuditRecord } from './auditApi'
import { actionLabel, actorEmail, actorName, hasRecordedData, resourceText, safeAuditText, sanitizeAuditData, sanitizedJson, type SanitizedNode } from './auditPresent'
import { copyIdentifier } from './auditRefs'
import { auditListHref, auditListReturnHash } from './auditRoute'
import { ActorCell, AuditShell, EventIcon, EventWhitelabel, ResultPill } from './AuditUi'
import styles from './Audit.module.css'

type Tab = 'overview' | 'data' | 'metadata'
const TAB_PREFIX = 'audit-detail'

/**
 * `#/audit/:auditEventId` — one Control Plane audit row, READ-ONLY.
 *
 * The Control Plane has NO detail endpoint (no `GET /audit/:id`). The list
 * returns the complete stored row, so this screen presents a row this session
 * loaded from the list — labelled as such. A direct link or a reload (row not
 * in memory) shows an explicit "detalhe indisponível" state: nothing is
 * fetched by id, guessed, or taken from the old illustrative dataset.
 */
export function AuditDetailPage({ auditEventId, returnTo }: { auditEventId: string; returnTo?: string }) {
  const listHref = auditListReturnHash(returnTo)
  const record = loadedAuditRecord(auditEventId)
  if (!record) return <AuditDetailUnavailable id={auditEventId} listHref={listHref} />
  return (
    <AuditShell trail={[`Evento ${record.id}`]}>
      <AuditEventContent record={record} listHref={listHref} />
    </AuditShell>
  )
}

function AuditDetailUnavailable({ id, listHref }: { id: string; listHref: string }) {
  const prototypeId = /^AUD-\d+$/i.test(id) || /_proto_/.test(id)
  return (
    <AuditShell trail={['Detalhe indisponível']}>
      <div className={shared.notFound} data-audit-detail-state="unavailable">
        <EmptyState
          icon={FileSearch}
          title="Detalhe do evento indisponível"
          description={
            <>
              {prototypeId
                ? `“${id}” é um ID do protótipo de Auditoria (eventos ilustrativos que não existem no Control Plane). `
                : `O Control Plane não oferece consulta de um evento por ID, e o evento “${id}” não foi carregado pela lista nesta sessão. `}
              Abra o evento a partir da lista de Auditoria.{' '}
              <a href={listHref} className={shared.inlineLink}>
                Voltar para Auditoria
              </a>
            </>
          }
        />
      </div>
    </AuditShell>
  )
}

function AuditEventContent({ record, listHref }: { record: AuditRecord; listHref: string }) {
  const notify = useNotice()
  const [tab, setTab] = useState<Tab>('overview')
  const before = sanitizeAuditData(record.beforeData)
  const after = sanitizeAuditData(record.afterData)
  const hasData = hasRecordedData(before) || hasRecordedData(after)
  const resource = resourceText(record)
  const when = formatDateTime(record.createdAt) ?? '—'
  const correlation = safeAuditText(record.correlationId)
  const copyableCorrelation = correlation !== null && correlation === record.correlationId && /^[A-Za-z0-9_-]{1,64}$/.test(correlation) ? correlation : null

  async function copy(label: string, value: string) {
    const copied = await copyIdentifier(value)
    notify(copied ? `${label} copiado: ${value}` : `Não foi possível copiar automaticamente. ${label}: ${value}`)
  }

  const navItems: DomainNavItem[] = [
    {
      key: 'search-action',
      label: 'Buscar eventos com este código de ação',
      description: `Código exato registrado: “${record.action}”`,
      icon: Search,
      href: auditListHref({ action: record.action }),
    },
    { key: 'copy-event', label: 'Copiar ID do evento', description: record.id, icon: Copy, onSelect: () => void copy('ID do evento', record.id) },
    ...(copyableCorrelation
      ? [
          {
            key: 'copy-correlation',
            label: 'Copiar Correlation ID',
            description: copyableCorrelation,
            icon: Link2,
            onSelect: () => void copy('Correlation ID', copyableCorrelation),
          },
        ]
      : []),
    { key: 'back', label: 'Voltar para a lista', description: 'Mesma busca, ordem e página', icon: ArrowLeft, href: listHref },
  ]

  const tabs: { value: Tab; label: string }[] = [
    { value: 'overview', label: 'Visão geral' },
    { value: 'data', label: 'Dados registrados' },
    { value: 'metadata', label: 'Metadados' },
  ]

  return (
    <>
      <div>
        <BackLink href={listHref} label="Voltar para Auditoria" />
      </div>

      <section className={`${fc.heroCard} ${shared.hero}`} aria-labelledby="audit-event-title" data-audit-detail-state="loaded">
        <EventIcon size="lg" />
        <div className={shared.heroHeading}>
          <div className={shared.heroTitleRow}>
            <h2 id="audit-event-title" className={shared.heroTitle}>
              {actionLabel(record.action)}
            </h2>
            <ResultPill result={record.result} />
          </div>
          <p className={shared.heroId}>Evento {record.id}</p>
          <div className={shared.heroMeta}>
            <HeroMeta label="Código da ação" value={<code className={styles.code}>{record.action}</code>} />
            <HeroMeta label="Ator" value={actorName(record)} />
            <HeroMeta label="Data e hora" value={when} />
          </div>
        </div>
        <div className={shared.heroActions}>
          <OutlineButton className={shared.secondaryButton} onClick={() => void copy('ID do evento', record.id)} data-copy-event>
            <Copy size={15} strokeWidth={1.8} aria-hidden="true" />
            Copiar ID do evento
          </OutlineButton>
        </div>
      </section>

      <InfoNote>
        <strong>Registro da listagem.</strong> Este registro foi retornado pela lista de Auditoria nesta sessão; não houve consulta individual por ID.
        Ao recarregar a página, abra o evento novamente pela lista.
      </InfoNote>

      <div className={`${fin.card} ${shared.tabsCard}`}>
        <Tabs idPrefix={TAB_PREFIX} label={`Seções do evento ${record.id}`} tabs={tabs} value={tab} onChange={setTab} />
      </div>

      <TabPanel prefix={TAB_PREFIX} tab="overview" current={tab}>
        <div className={shared.panelGrid}>
          <section className={fin.card} aria-labelledby="audit-info-title">
            <h2 id="audit-info-title" className={fin.cardTitleSm}>
              Informações principais
            </h2>
            <KeyValueList
              rows={[
                { label: 'ID do evento', value: <code className={styles.code}>{record.id}</code> },
                { label: 'Evento', value: actionLabel(record.action) },
                { label: 'Código da ação', value: <code className={styles.code}>{record.action}</code> },
                { label: 'Resultado', value: <ResultPill result={record.result} /> },
                { label: 'Data e hora', value: when },
                { label: 'Ator', value: <ActorCell record={record} /> },
                { label: 'E-mail do ator', value: actorEmail(record) ?? '—' },
                { label: 'Recurso', value: resource ?? 'Sem recurso registrado' },
                { label: 'Whitelabel', value: <EventWhitelabel whitelabelId={record.whitelabelId} /> },
              ]}
            />
          </section>
          <DomainNavCard
            title="Ações e navegação"
            intro="Somente consulta: nenhuma ação altera o evento ou o recurso citado."
            items={navItems}
          />
        </div>
      </TabPanel>

      <TabPanel prefix={TAB_PREFIX} tab="data" current={tab}>
        <div className={styles.changesGrid}>
          <section className={fin.card} aria-labelledby="audit-data-title" data-recorded-data>
            <h2 id="audit-data-title" className={fin.cardTitleSm}>
              Dados registrados
            </h2>
            <p className={fin.cardSubtitle}>
              {hasData ? 'Valores registrados pelo Control Plane antes e depois da ação, com dados sensíveis ocultos.' : 'Este evento não registrou dados antes / depois.'}
            </p>
            {hasData ? (
              <div className={styles.dataSides}>
                <DataSide title="Antes" node={before} />
                <DataSide title="Depois" node={after} />
              </div>
            ) : (
              <p className={fc.emptyLine}>
                <Info size={15} strokeWidth={1.8} aria-hidden="true" />
                Eventos de login registram apenas o fato, o resultado e o contexto técnico.
              </p>
            )}
            <details className={styles.raw} data-raw-view>
              <summary>Ver registro sanitizado (JSON)</summary>
              <p className={styles.rawNote}>Visão técnica secundária. Valores sensíveis aparecem como “[oculto]”; campos de e-mail válidos são exibidos como registrados.</p>
              <pre className={styles.rawPre} tabIndex={0} aria-label={`Registro sanitizado do evento ${record.id}`}>
                {JSON.stringify({ beforeData: sanitizedJson(before), afterData: sanitizedJson(after) }, null, 2)}
              </pre>
            </details>
          </section>
          <section className={fin.card} aria-labelledby="audit-privacy-title">
            <h2 id="audit-privacy-title" className={fin.cardTitleSm}>
              Proteção de dados
            </h2>
            <p className={`${shared.callout} ${styles.calloutSpaced}`}>
              <Lock size={15} strokeWidth={1.8} aria-hidden="true" />
              <span>
                Senhas, tokens, chaves, segredos, credenciais, cabeçalhos de autorização, dados de cartão e conta, documentos e payloads
                <strong> reconhecidos como sensíveis são ocultos</strong>; valores que o Control Plane já ocultou aparecem como “[redacted]”. Campos de e-mail válidos aparecem
                como registrados; contatos em texto livre continuam protegidos. Esta proteção é adicional: o Control Plane continua responsável pelo armazenamento e pela redação na origem.
              </span>
            </p>
            <p className={`${shared.callout} ${styles.calloutSpaced}`}>
              <Info size={15} strokeWidth={1.8} aria-hidden="true" />
              <span>Antes e depois são somente leitura: não existe ação para alterar, restaurar ou reverter estes valores.</span>
            </p>
          </section>
        </div>
      </TabPanel>

      <TabPanel prefix={TAB_PREFIX} tab="metadata" current={tab}>
        <div className={shared.panelGrid}>
          <section className={fin.card} aria-labelledby="audit-meta-title">
            <h2 id="audit-meta-title" className={fin.cardTitleSm}>
              Metadados técnicos
            </h2>
            <KeyValueList
              rows={[
                {
                  label: 'Correlation ID',
                  value: correlation ? (
                    <>
                      <code className={styles.code}>{correlation}</code>
                      {copyableCorrelation ? (
                        <button
                          type="button"
                          className={styles.copyButton}
                          onClick={() => void copy('Correlation ID', copyableCorrelation)}
                          aria-label={`Copiar Correlation ID ${copyableCorrelation}`}
                          data-copy-correlation
                        >
                          <Copy size={13} strokeWidth={1.9} aria-hidden="true" />
                          Copiar
                        </button>
                      ) : null}
                    </>
                  ) : (
                    '—'
                  ),
                },
                { label: 'IP de origem', value: record.ip ? <code className={styles.code}>{safeAuditText(record.ip)}</code> : '—' },
                { label: 'User agent', value: record.userAgent ? <span className={styles.userAgent}>{safeAuditText(record.userAgent)}</span> : '—' },
                { label: 'Timestamp (ISO 8601)', value: <code className={styles.code}>{record.createdAt}</code> },
                { label: 'Data e hora (Brasília)', value: when },
                { label: 'ID do operador', value: record.actorId ? <code className={styles.code}>{record.actorId}</code> : '—' },
              ]}
            />
          </section>
          <section className={fin.card} aria-labelledby="audit-origin-title">
            <h2 id="audit-origin-title" className={fin.cardTitleSm}>
              Origem do registro
            </h2>
            <p className={`${shared.callout} ${styles.calloutSpaced}`}>
              <Info size={15} strokeWidth={1.8} aria-hidden="true" />
              <span>
                Evento do registro de auditoria do Control Plane (<code className={styles.code}>GET /audit</code>), gravado pelo próprio
                Control Plane. Não é atividade operacional e não comprova a integração de outros módulos.
              </span>
            </p>
          </section>
        </div>
      </TabPanel>
    </>
  )
}

function HeroMeta({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className={shared.heroMetaItem}>
      <span className={shared.heroMetaLabel}>{label}</span>
      <span className={shared.heroMetaValue}>{value}</span>
    </div>
  )
}

function DataSide({ title, node }: { title: string; node: SanitizedNode }) {
  return (
    <div className={styles.dataSide} data-data-side={title}>
      <h3 className={styles.dataSideTitle}>{title}</h3>
      {hasRecordedData(node) ? <DataNode node={node} /> : <span className={shared.muted}>Nada registrado</span>}
    </div>
  )
}

/** Structure-preserving, sanitized view of recorded JSON. */
function DataNode({ node }: { node: SanitizedNode }) {
  switch (node.kind) {
    case 'empty':
      return <span className={shared.muted}>—</span>
    case 'text':
      return (
        <span className={styles.diffValue}>
          {node.text}
          {node.truncated ? <span className="visually-hidden"> (texto truncado)</span> : null}
        </span>
      )
    case 'masked':
      return (
        <span className={styles.masked} data-masked={node.reason}>
          <Lock size={12} strokeWidth={2} aria-hidden="true" />
          <span aria-hidden={node.reason === 'email' ? undefined : 'true'}>{node.text}</span>
          {node.reason === 'email' ? (
            <span className="visually-hidden"> (contato protegido)</span>
          ) : (
            <span className="visually-hidden">
              {node.reason === 'redacted-by-backend' ? 'Valor ocultado pelo Control Plane' : 'Valor sensível oculto'}
            </span>
          )}
        </span>
      )
    case 'too-deep':
      return <span className={shared.muted}>Estrutura muito profunda — omitida</span>
    case 'array':
      return (
        <ol className={styles.dataList}>
          {node.items.map((item, index) => (
            <li key={index}>
              <DataNode node={item} />
            </li>
          ))}
          {node.omitted ? <li className={shared.muted}>+{node.omitted} itens omitidos</li> : null}
        </ol>
      )
    case 'object':
      return (
        <dl className={styles.dataTree}>
          {node.entries.map(({ key, node: child }, index) => (
            <div key={`${index}:${key}`} className={styles.dataRow} data-data-key={key}>
              <dt>{key}</dt>
              <dd>
                <DataNode node={child} />
              </dd>
            </div>
          ))}
          {node.omitted ? (
            <div className={styles.dataRow}>
              <dt>…</dt>
              <dd className={shared.muted}>+{node.omitted} campos omitidos</dd>
            </div>
          ) : null}
        </dl>
      )
  }
}
