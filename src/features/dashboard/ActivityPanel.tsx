import { CalendarDays, ChartNoAxesColumn, ChevronDown } from 'lucide-react'
import { Panel } from '../../components/ui/Panel'
import { EmptyState } from '../../components/ui/EmptyState'
import { OutlineButton } from '../../components/ui/OutlineButton'
import { usePrototypeNotice } from '../../components/shell/prototypeNotice'
import styles from './ActivityPanel.module.css'

const PERIOD_DAYS = 30
const TICK_OFFSETS = [0, 6, 12, 18, 24, 29] // day offsets inside the 30-day window
const Y_TICKS = 5

const dayMonth = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit' })

/** X-axis labels for the last 30 days, derived from today's date (no data involved). */
function periodTicks(today = new Date()) {
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate() - (PERIOD_DAYS - 1))
  return TICK_OFFSETS.map((offset) => {
    const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + offset)
    return { offset, label: dayMonth.format(date) }
  })
}

/**
 * Data-ready time-series container. Grid, axes and period control are in
 * place; no series is drawn because no integration provides data yet.
 */
export function ActivityPanel({ className }: { className?: string }) {
  const notify = usePrototypeNotice()
  const ticks = periodTicks()

  return (
    <Panel
      className={className}
      title="Atividade por período"
      subtitle="Visão consolidada da atividade em todas as whitelabels."
      actions={
        <OutlineButton
          onClick={() => notify('Protótipo visual: a seleção de período ficará disponível após a integração.')}
          aria-label="Período: últimos 30 dias"
        >
          <CalendarDays size={15} strokeWidth={1.7} aria-hidden="true" />
          Últimos 30 dias
          <ChevronDown size={15} strokeWidth={1.8} aria-hidden="true" />
        </OutlineButton>
      }
    >
      <figure className={styles.chart}>
        <figcaption className="visually-hidden">Gráfico de atividade dos últimos 30 dias — sem dados carregados.</figcaption>

        <div className={styles.yAxis} aria-hidden="true">
          {Array.from({ length: Y_TICKS }, (_, index) => (
            <span key={index}>—</span>
          ))}
          <span>0</span>
        </div>

        <div className={styles.plot}>
          <svg className={styles.grid} viewBox="0 0 456 154" preserveAspectRatio="none" aria-hidden="true" focusable="false">
            {Array.from({ length: Y_TICKS + 1 }, (_, index) => {
              const y = (154 / Y_TICKS) * index
              const isBaseline = index === Y_TICKS
              return (
                <line
                  key={`h${index}`}
                  className={isBaseline ? styles.baseline : undefined}
                  x1="0"
                  y1={y}
                  x2="456"
                  y2={y}
                  vectorEffect="non-scaling-stroke"
                />
              )
            })}
            {TICK_OFFSETS.map((offset) => {
              const x = (offset / (PERIOD_DAYS - 1)) * 442
              return (
                <line
                  key={`v${offset}`}
                  className={offset === 0 ? styles.axis : styles.vertical}
                  x1={x}
                  y1="0"
                  x2={x}
                  y2="154"
                  vectorEffect="non-scaling-stroke"
                />
              )
            })}
          </svg>

          <EmptyState
            className={styles.empty}
            icon={ChartNoAxesColumn}
            title="Nenhum dado carregado"
            description="Conecte suas plataformas para visualizar a atividade global neste período."
          />
        </div>

        <div className={styles.xAxis} aria-hidden="true">
          {ticks.map((tick) => (
            <span key={tick.offset} style={{ left: `${(tick.offset / (PERIOD_DAYS - 1)) * 96.9}%` }}>
              {tick.label}
            </span>
          ))}
        </div>
      </figure>
    </Panel>
  )
}
