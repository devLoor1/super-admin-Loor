import { Database, History, Info, LayoutGrid, Link2Off, Workflow, type LucideIcon } from 'lucide-react'
import { IconTile, type Tone } from '../../../components/ui/IconTile'
import fin from '../../finance-gateways/sections/FinanceSections.module.css'
import { CATALOG_META, formatTime, type CatalogActivity, type ResourceUse, type Segment } from '../catalogModel'
import styles from './CatalogSections.module.css'

type Card = { label: string; value: string; detail: string; icon: LucideIcon; tone: Tone; empty?: boolean }

const split = (items: { status: string }[]) => {
  const active = items.filter((item) => item.status === 'active').length
  return `${active} ${active === 1 ? 'ativo' : 'ativos'} · ${items.length - active} ${items.length - active === 1 ? 'inativo' : 'inativos'}`
}

/**
 * Counts derived only from this Whitelabel's local prototype catalogs; the
 * conceptual cards say what is NOT known instead of showing a number.
 */
export function CatalogSummaryCards({ segments, resourceUses }: { segments: Segment[]; resourceUses: ResourceUse[] }) {
  const cards: Card[] = [
    { label: 'Segmentos', value: String(segments.length), detail: split(segments), icon: LayoutGrid, tone: 'violet' },
    { label: 'Usos dos recursos', value: String(resourceUses.length), detail: split(resourceUses), icon: Database, tone: 'teal' },
    {
      label: 'Catálogos independentes',
      value: '—',
      detail: 'Sem relacionamento automático',
      icon: Link2Off,
      tone: 'amber',
      empty: true,
    },
    {
      label: 'Uso em Oportunidades',
      value: '—',
      detail: 'Aguardando integração',
      icon: Workflow,
      tone: 'indigo',
      empty: true,
    },
  ]
  return (
    <section className={fin.summary} aria-labelledby="cat-summary-title" data-detail-stage>
      <h2 id="cat-summary-title" className="visually-hidden">
        Resumo dos catálogos locais
      </h2>
      {cards.map((card) => (
        <article key={card.label} className={fin.summaryCard}>
          <IconTile icon={card.icon} tone={card.tone} size="lg" />
          <div className={fin.summaryText}>
            <h3 className={fin.summaryLabel}>{card.label}</h3>
            <p className={fin.summaryValue}>
              {card.value}
              {card.empty ? <span className="visually-hidden"> (sem dados)</span> : null}
            </p>
            <p className={fin.summaryDetail}>{card.detail}</p>
          </div>
        </article>
      ))}
      <p className={fin.summaryNote}>Contagens dos catálogos locais deste protótipo — não são dados de produção.</p>
    </section>
  )
}

/** Observações importantes — scope and the decisions that remain open. */
export function CatalogNotes() {
  return (
    <section className={fin.card} aria-labelledby="cat-notes-title" data-detail-stage>
      <div className={styles.notes}>
        <span className={styles.notesIcon} aria-hidden="true">
          <Info size={17} strokeWidth={1.8} />
        </span>
        <div>
          <h2 id="cat-notes-title" className={fin.cardTitleSm}>
            Observações importantes
          </h2>
          <ul className={styles.notesList}>
            <li>
              Segmentos e usos dos recursos são catálogos independentes. Ter o mesmo nome nos dois (por exemplo, Capital de Giro)
              não cria nenhum relacionamento automático.
            </li>
            <li>
              Esses catálogos serão utilizados na criação de Oportunidades, mas este módulo não cria nem edita Oportunidades e não
              define quantos itens cada Oportunidade pode ter.
            </li>
            <li>Nesta versão, todas as alterações são locais no frontend (sessão do navegador). Não há integração com o Backend.</li>
            <li>
              Validações definitivas, efeito de inativar ou excluir itens já usados e o escopo (global ou por Whitelabel) serão
              definidos por Produto e Backend. Nenhum dos catálogos é uma modalidade.
            </li>
          </ul>
        </div>
      </div>
    </section>
  )
}

/** Session-only feedback for both catalogs (each entry names its catalog). */
export function CatalogActivityPanel({ entries }: { entries: CatalogActivity[] }) {
  const shown = entries.slice(0, 6)
  return (
    <section className={fin.card} aria-labelledby="cat-activity-title" data-detail-stage>
      <h2 id="cat-activity-title" className={fin.cardTitleSm}>
        Atividade da sessão
      </h2>
      <p className={fin.activityIntro}>Somente ações locais desta sessão do navegador — não é trilha de auditoria.</p>
      {shown.length ? (
        <ol className={fin.activityList}>
          {shown.map((entry) => (
            <li key={entry.id} className={fin.activityItem}>
              <div>
                <p className={fin.activityTitle}>
                  <span className={styles.catalogTag} data-catalog={entry.catalog}>
                    {CATALOG_META[entry.catalog].title}
                  </span>
                  {entry.title}
                </p>
                {entry.detail ? <p className={fin.activityDetail}>{entry.detail}</p> : null}
              </div>
              <time className={fin.activityTime} dateTime={entry.at}>
                {formatTime(entry.at)}
              </time>
            </li>
          ))}
        </ol>
      ) : (
        <p className={fin.activityEmpty}>
          <History size={15} strokeWidth={1.8} aria-hidden="true" />
          Nenhuma alteração local nesta sessão.
        </p>
      )}
    </section>
  )
}
