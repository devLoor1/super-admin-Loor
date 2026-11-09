import { CalendarDays } from 'lucide-react'
import { Panel } from '../../components/ui/Panel'
import { OutlineButton } from '../../components/ui/OutlineButton'
import { freshnessLabel } from './dashboardApi'
import { DAILY_PLOT, DAILY_TICK_OFFSETS, DAILY_WINDOW, OPPORTUNITY_TIMEZONE, dailyFullDateLabel, dailyOpportunityGeometry, dailyOpportunityView, type DailyOpportunityView } from './dailyOpportunities'
import { useDailyOpportunities } from './useDailyOpportunities'
import styles from './ActivityPanel.module.css'

/** Pure presentation for maintained SSR/geometry tests; the text table is the accessible series. */
export function DailyOpportunityContent({ view, onRetry }: { view: DailyOpportunityView; onRetry: () => void }) {
  const geometry = view.status === 'ready' ? dailyOpportunityGeometry(view.buckets) : null
  return (
    <div className={styles.content} data-daily-opportunities={view.status} aria-busy={view.status === 'loading'}>
      <figure className={styles.chart}>
        <figcaption className="visually-hidden">Novas oportunidades por dia: contagem de registros atualmente cadastrados, em todas as Whitelabels.</figcaption>
        <div className={styles.yAxis} aria-hidden="true">
          {Array.from({ length: DAILY_PLOT.intervals + 1 }, (_, index) => <span key={index}>{geometry?.ticks[index] ?? '—'}</span>)}
        </div>
        <div className={styles.plot}>
          <svg className={styles.grid} viewBox="0 0 456 154" preserveAspectRatio="none" aria-hidden="true" focusable="false">
            {Array.from({ length: DAILY_PLOT.intervals + 1 }, (_, index) => {
              const y = (DAILY_PLOT.height / DAILY_PLOT.intervals) * index
              return (
                <line key={`h${index}`} className={index === DAILY_PLOT.intervals ? styles.baseline : undefined}
                  x1="0" y1={y} x2="456" y2={y} vectorEffect="non-scaling-stroke" />
              )
            })}
            {DAILY_TICK_OFFSETS.map((offset) => {
              const x = offset / (DAILY_WINDOW - 1) * DAILY_PLOT.lastX
              return (
                <line key={`v${offset}`} className={offset === 0 ? styles.axis : styles.vertical}
                  x1={x} y1="0" x2={x} y2="154" vectorEffect="non-scaling-stroke" />
              )
            })}
            {geometry ? <path className={styles.series} d={geometry.path} data-daily-series vectorEffect="non-scaling-stroke" /> : null}
          </svg>
          {view.status === 'loading' ? <p className={styles.message} role="status">Consultando as oportunidades…</p>
            : view.status === 'unavailable' ? <div className={styles.message} role="status">
              <strong>{view.title}</strong><p>{view.description}</p>
              {view.correlationId ? <p>Código de diagnóstico: <code>{view.correlationId}</code></p> : null}
              {view.retryable ? <OutlineButton onClick={onRetry} aria-label="Tentar novamente: novas oportunidades por dia">Tentar novamente</OutlineButton> : null}
            </div> : view.periodTotal === 0 ? <p className={styles.message}>Nenhuma oportunidade cadastrada neste período.</p> : null}
        </div>
        <div className={styles.xAxis} aria-hidden="true">
          {DAILY_TICK_OFFSETS.map((offset) => (
            <span key={offset} style={{ left: `${offset / (DAILY_WINDOW - 1) * DAILY_PLOT.lastX / DAILY_PLOT.width * 100}%` }}>
              {view.status === 'ready' ? view.buckets[offset].label : '—'}
            </span>
          ))}
        </div>
      </figure>
      {view.status === 'ready' ? <>
        <p className={styles.caption}>
          {dailyFullDateLabel(view.start)}–{dailyFullDateLabel(view.end)} · {OPPORTUNITY_TIMEZONE}. Total no período: {view.periodTotal}.
          {' '}{freshnessLabel(view.consultedAt).replace('Atualizado', 'Consultado')}. Registros atualmente cadastrados; sem atualização contínua.
        </p>
        <details className={styles.dailyData}>
          <summary>Ver dados diários (30 dias)</summary>
          <div className={styles.tableViewport} role="region" aria-label="Contagem diária completa de oportunidades" tabIndex={0}>
            <table>
              <caption>Contagem por dia em {OPPORTUNITY_TIMEZONE}</caption>
              <thead><tr><th scope="col">Data</th><th scope="col">Oportunidades</th></tr></thead>
              <tbody>{view.buckets.map((bucket) => <tr key={bucket.date} data-daily-date={bucket.date}>
                <th scope="row">{dailyFullDateLabel(bucket.date)}</th><td>{bucket.count}</td>
              </tr>)}</tbody>
            </table>
          </div>
        </details>
      </> : <p className={styles.caption}>Contagens exibidas somente após validar a lista global completa e todas as datas de criação.</p>}
    </div>
  )
}

export function ActivityPanel({ className }: { className?: string }) {
  const resource = useDailyOpportunities()
  return (
    <Panel className={className} title="Novas oportunidades por dia"
      subtitle="Oportunidades cadastradas por dia em todas as Whitelabels nos últimos 30 dias."
      actions={<span className={styles.period}><CalendarDays size={15} strokeWidth={1.7} aria-hidden="true" />Últimos 30 dias</span>}>
      <DailyOpportunityContent view={dailyOpportunityView(resource.state)} onRetry={resource.reload} />
    </Panel>
  )
}
