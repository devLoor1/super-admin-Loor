import { useState, type ReactNode } from 'react'
import { Copy, ExternalLink, FileSearch, Filter, Info, Link2, Lock, UserRound } from 'lucide-react'
import { usePrototypeNotice } from '../../components/shell/prototypeNotice'
import { OutlineButton } from '../../components/ui/OutlineButton'
import outline from '../../components/ui/OutlineButton.module.css'
import { Tabs } from '../../components/ui/Tabs'
import fin from '../finance-gateways/sections/FinanceSections.module.css'
import { KeyValueList, TabPanel } from '../finance-core/shared/FinanceCoreUi'
import fc from '../finance-core/shared/FinanceCore.module.css'
import { BackLink, DomainNavCard, InfoNote, type DomainNavItem } from '../operation/shared/OperationUi'
import { formatDateTime } from '../operation/shared/operationModel'
import shared from '../operation/shared/Operation.module.css'
import { diffRows, formatAuditValue, sanitizedRaw } from './auditFormat'
import { AUDIT_ACTION_LABEL, AUDIT_MODULE_META, AUDIT_RESOURCE_LABEL, AUDIT_RESULT_META, actorById, auditEventHref, type AuditEvent, type AuditValue } from './auditModel'
import { auditListHref, copyIdentifier, resourceDestination, whitelabelLabel } from './auditRefs'
import { PROTOTYPE_AUDIT_EVENTS, auditEventById } from './prototypeAudit'
import { ActorCell, AuditEventNotFound, AuditShell, ChangesTag, EventWhitelabel, ModuleIcon, ModuleTag, ResultPill } from './AuditUi'
import styles from './Audit.module.css'

type Tab = 'overview' | 'changes' | 'context' | 'metadata'
const TAB_PREFIX = 'audit-detail'

/** `#/audit/:auditEventId` — one frozen, illustrative event. Read-only: no action changes it. */
export function AuditDetailPage({ auditEventId }: { auditEventId: string }) {
  const event = auditEventById(auditEventId)
  if (!event) return <AuditEventNotFound id={auditEventId} />
  return (
    <AuditShell trail={[`Evento ${event.id}`]}>
      <AuditEventContent event={event} />
    </AuditShell>
  )
}

function AuditEventContent({ event }: { event: AuditEvent }) {
  const notify = usePrototypeNotice()
  const [tab, setTab] = useState<Tab>('overview')
  const actor = actorById(event.actorId)
  const destination = resourceDestination(event)
  const rows = diffRows(event)
  const related = PROTOTYPE_AUDIT_EVENTS.filter((item) => item.correlationId === event.correlationId && item.id !== event.id)

  async function copy(label: string, value: string) {
    const copied = await copyIdentifier(value)
    notify(copied ? `${label} copiado: ${value}` : `Não foi possível copiar automaticamente. ${label}: ${value}`)
  }

  const goToResource = () => {
    if (destination.kind === 'unavailable') notify(destination.message)
  }

  const navItems: DomainNavItem[] = [
    destination.kind === 'link'
      ? { key: 'resource', label: destination.label, description: destination.description, icon: ExternalLink, href: destination.href }
      : { key: 'resource', label: destination.label, description: destination.description, icon: ExternalLink, onSelect: goToResource, pending: true },
    ...(event.resourceId
      ? [
          {
            key: 'filter-resource',
            label: 'Filtrar por este recurso',
            description: `Outros eventos de ${AUDIT_RESOURCE_LABEL[event.resourceType].toLowerCase()} ${event.resourceId}`,
            icon: Filter,
            href: auditListHref({ resourceType: event.resourceType, resourceId: event.resourceId }),
          },
        ]
      : []),
    ...(event.actorId
      ? [
          {
            key: 'filter-actor',
            label: 'Filtrar por este ator',
            description: `Ver outros eventos de ${actor?.name ?? event.actorId}`,
            icon: UserRound,
            href: auditListHref({ actor: event.actorId }),
          },
        ]
      : []),
    {
      key: 'copy-event',
      label: 'Copiar ID do evento',
      description: event.id,
      icon: Copy,
      onSelect: () => void copy('ID do evento', event.id),
    },
    {
      key: 'copy-correlation',
      label: 'Copiar Correlation ID',
      description: event.correlationId,
      icon: Link2,
      onSelect: () => void copy('Correlation ID', event.correlationId),
    },
  ]

  const tabs: { value: Tab; label: string }[] = [
    { value: 'overview', label: 'Visão geral' },
    { value: 'changes', label: 'Alterações' },
    { value: 'context', label: 'Contexto' },
    { value: 'metadata', label: 'Metadados' },
  ]

  return (
    <>
      <div>
        <BackLink href="#/audit" label="Voltar para Auditoria" />
      </div>

      <section className={`${fc.heroCard} ${shared.hero}`} aria-labelledby="audit-event-title">
        <ModuleIcon module={event.module} size="lg" />
        <div className={shared.heroHeading}>
          <div className={shared.heroTitleRow}>
            <h2 id="audit-event-title" className={shared.heroTitle}>
              Evento {event.id}
            </h2>
            <ResultPill result={event.result} />
            <ChangesTag changed={rows.length > 0} />
          </div>
          <p className={shared.heroId}>{AUDIT_ACTION_LABEL[event.action]}</p>
          <div className={shared.heroMeta}>
            <HeroMeta label="Módulo" value={<ModuleTag module={event.module} />} />
            <HeroMeta label="Recurso" value={event.resourceLabel} />
            <HeroMeta label="Whitelabel" value={<EventWhitelabel whitelabelId={event.whitelabelId} />} />
          </div>
        </div>
        <div className={shared.heroActions}>
          {destination.kind === 'link' ? (
            <a href={destination.href} className={`${outline.button} ${shared.secondaryButton}`} data-hero-resource>
              Ir para recurso
              <ExternalLink size={15} strokeWidth={1.8} aria-hidden="true" />
            </a>
          ) : (
            <OutlineButton className={shared.secondaryButton} onClick={goToResource} data-hero-resource>
              Ir para recurso
            </OutlineButton>
          )}
          <OutlineButton className={shared.secondaryButton} onClick={() => void copy('ID do evento', event.id)} data-copy-event>
            <Copy size={15} strokeWidth={1.8} aria-hidden="true" />
            Copiar ID do evento
          </OutlineButton>
        </div>
      </section>

      <div className={`${fin.card} ${shared.tabsCard}`}>
        <Tabs idPrefix={TAB_PREFIX} label={`Seções do evento ${event.id}`} tabs={tabs} value={tab} onChange={setTab} />
      </div>

      <TabPanel prefix={TAB_PREFIX} tab="overview" current={tab}>
        <div className={shared.panelGrid}>
          <section className={fin.card} aria-labelledby="audit-info-title">
            <h2 id="audit-info-title" className={fin.cardTitleSm}>
              Informações principais
            </h2>
            <KeyValueList
              rows={[
                { label: 'ID do evento', value: event.id },
                { label: 'Evento', value: AUDIT_ACTION_LABEL[event.action] },
                { label: 'Código da ação', value: <code className={styles.code}>{event.action}</code> },
                { label: 'Módulo', value: <ModuleTag module={event.module} /> },
                { label: 'Recurso', value: `${AUDIT_RESOURCE_LABEL[event.resourceType]} · ${event.resourceLabel}` },
                { label: 'ID do recurso', value: event.resourceId ?? '—' },
                { label: 'Whitelabel', value: <EventWhitelabel whitelabelId={event.whitelabelId} /> },
                { label: 'Ator', value: actor?.name ?? 'Não autenticado' },
                { label: 'ID do ator', value: event.actorId ?? '—' },
                { label: 'Resultado', value: <ResultPill result={event.result} /> },
                { label: 'Data e hora', value: formatDateTime(event.createdAt) ?? '—' },
                { label: 'Resumo', value: event.summary },
              ]}
            />
          </section>
          <DomainNavCard
            title="Ações e navegação"
            intro="Consulte conteúdos relacionados a este evento. Nenhuma ação altera o evento ou o recurso de origem."
            items={navItems}
          />
        </div>
        <InfoNote>
          <strong>Auditoria V1 é um módulo de consulta somente leitura.</strong> Não permite editar, excluir, alterar antes / depois,
          restaurar estado, reverter ou reprocessar eventos.
        </InfoNote>
      </TabPanel>

      <TabPanel prefix={TAB_PREFIX} tab="changes" current={tab}>
        <div className={styles.changesGrid}>
          <section className={fin.card} aria-labelledby="audit-diff-title">
            <h2 id="audit-diff-title" className={fin.cardTitleSm}>
              Alterações registradas
            </h2>
            <p className={fin.cardSubtitle}>
              {rows.length === 0
                ? 'Este evento não registra alterações de campos.'
                : event.oldValue === null
                  ? 'Evento de criação: não há valores anteriores.'
                  : 'Somente os campos registrados pelo evento, antes e depois.'}
            </p>
            {rows.length ? (
              <div className={fc.tableWrap}>
                <table className={`${shared.miniTable} ${styles.diffTable}`} data-diff-table>
                  <caption className="visually-hidden">Campos alterados no evento {event.id}</caption>
                  <thead>
                    <tr>
                      <th scope="col">Campo</th>
                      <th scope="col">Antes</th>
                      <th scope="col">Depois</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => (
                      <tr key={row.key} data-diff-field={row.key} data-sensitive={row.sensitive || undefined}>
                        <th scope="row" className={styles.diffField}>
                          {row.label}
                        </th>
                        <td>
                          <DiffValue field={row.key} value={row.before} />
                        </td>
                        <td>
                          <DiffValue field={row.key} value={row.after} highlight />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className={fc.emptyLine}>
                <Info size={15} strokeWidth={1.8} aria-hidden="true" />
                Eventos como login, logout e testes de envio registram apenas o fato e o resultado.
              </p>
            )}
            <details className={styles.raw} data-raw-view>
              <summary>Ver registro bruto sanitizado</summary>
              <p className={styles.rawNote}>Visão técnica secundária. Valores sensíveis aparecem como “[redacted]”.</p>
              <pre className={styles.rawPre} tabIndex={0} aria-label={`Registro bruto sanitizado do evento ${event.id}`}>
                {sanitizedRaw(event)}
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
                Senhas, tokens de acesso, cabeçalhos de autorização, chaves de API, segredos de gateway e de webhook, senha SMTP, cookies,
                credenciais, documentos de identificação e payloads de KYC <strong>nunca são exibidos</strong>: aparecem como “••••••••”
                ou “[redacted]”, ou são omitidos.
              </span>
            </p>
            <p className={`${shared.callout} ${styles.calloutSpaced}`}>
              <Info size={15} strokeWidth={1.8} aria-hidden="true" />
              <span>Antes e depois são somente leitura: não existe ação para alterar, restaurar ou reverter estes valores.</span>
            </p>
          </section>
        </div>
      </TabPanel>

      <TabPanel prefix={TAB_PREFIX} tab="context" current={tab}>
        <div className={shared.panelGrid}>
          <section className={fin.card} aria-labelledby="audit-context-title">
            <h2 id="audit-context-title" className={fin.cardTitleSm}>
              Contexto do evento
            </h2>
            <KeyValueList
              rows={[
                { label: 'Whitelabel', value: whitelabelLabel(event.whitelabelId) },
                { label: 'Módulo', value: AUDIT_MODULE_META[event.module].label },
                { label: 'Tipo de recurso', value: AUDIT_RESOURCE_LABEL[event.resourceType] },
                { label: 'Recurso (no evento)', value: event.resourceLabel },
                { label: 'ID do recurso', value: event.resourceId ?? '—' },
                { label: 'Ator', value: <ActorCell actorId={event.actorId} /> },
                { label: 'Perfil do ator', value: actor?.role ?? '—' },
              ]}
            />
            <p className={`${shared.callout} ${styles.calloutSpaced}`}>
              <Info size={15} strokeWidth={1.8} aria-hidden="true" />
              <span>O rótulo do recurso é o registrado no momento do evento; o estado atual fica no módulo responsável.</span>
            </p>
          </section>
          <section className={fin.card} aria-labelledby="audit-related-title">
            <h2 id="audit-related-title" className={fin.cardTitleSm}>
              Eventos com o mesmo Correlation ID
            </h2>
            <p className={fin.cardSubtitle}>
              <code className={styles.code}>{event.correlationId}</code>
            </p>
            {related.length ? (
              <ul className={styles.relatedList}>
                {related.map((item) => (
                  <li key={item.id}>
                    <a href={auditEventHref(item.id)} className={shared.navItem} data-related-event={item.id}>
                      <span className={shared.navIcon} aria-hidden="true">
                        <FileSearch size={17} strokeWidth={1.7} />
                      </span>
                      <span className={shared.navText}>
                        {AUDIT_ACTION_LABEL[item.action]}
                        <span className={shared.navMeta}>
                          {item.id} · {formatDateTime(item.createdAt)} · {AUDIT_RESULT_META[item.result].label}
                        </span>
                      </span>
                      <ExternalLink size={15} strokeWidth={1.8} aria-hidden="true" />
                    </a>
                  </li>
                ))}
              </ul>
            ) : (
              <p className={fc.emptyLine}>
                <Info size={15} strokeWidth={1.8} aria-hidden="true" />
                Nenhum outro evento ilustrativo compartilha este Correlation ID.
              </p>
            )}
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
                  value: (
                    <>
                      <code className={styles.code}>{event.correlationId}</code>
                      <button
                        type="button"
                        className={styles.copyButton}
                        onClick={() => void copy('Correlation ID', event.correlationId)}
                        aria-label={`Copiar Correlation ID ${event.correlationId}`}
                        data-copy-correlation
                      >
                        <Copy size={13} strokeWidth={1.9} aria-hidden="true" />
                        Copiar
                      </button>
                    </>
                  ),
                },
                { label: 'IP de origem', value: <code className={styles.code}>{event.ip}</code> },
                { label: 'User agent', value: <span className={styles.userAgent}>{event.userAgent}</span> },
                { label: 'Timestamp (ISO 8601)', value: <code className={styles.code}>{event.createdAt}</code> },
                { label: 'Data e hora (Brasília)', value: formatDateTime(event.createdAt) ?? '—' },
                { label: 'Código da ação', value: <code className={styles.code}>{event.action}</code> },
                { label: 'Resultado', value: AUDIT_RESULT_META[event.result].label },
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
                Evento <strong>ilustrativo</strong> do protótipo, congelado no código. Não foi emitido pelo Backend e não representa uma
                integração existente. IP (faixas de documentação RFC 5737), user agent e Correlation ID são fictícios.
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

/** One side of a diff row: "—" for null / absent, masked for sensitive values. */
function DiffValue({ field, value, highlight = false }: { field: string; value: AuditValue | undefined; highlight?: boolean }) {
  const formatted = formatAuditValue(field, value)
  if (formatted.sensitive) {
    return (
      <span className={styles.masked} data-masked>
        <Lock size={12} strokeWidth={2} aria-hidden="true" />
        <span aria-hidden="true">{formatted.text}</span>
        <span className="visually-hidden">Valor sensível oculto</span>
      </span>
    )
  }
  if (formatted.empty) return <span className={shared.muted}>—</span>
  return (
    <span className={styles.diffValue} data-after={highlight || undefined}>
      {formatted.text}
    </span>
  )
}
