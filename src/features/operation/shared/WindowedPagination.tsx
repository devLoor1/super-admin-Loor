import { ChevronLeft, ChevronRight } from 'lucide-react'
import shared from './Operation.module.css'
import states from './ReadStates.module.css'

const COUNT_FORMAT = new Intl.NumberFormat('pt-BR')

/** 1 … (current − 1) current (current + 1) … last; every page when there are ≤ 7. */
function pageItems(current: number, last: number): (number | 'gap')[] {
  if (last <= 7) return Array.from({ length: last }, (_, index) => index + 1)
  const middle = [current - 1, current, current + 1].filter((value) => value > 1 && value < last)
  const items: (number | 'gap')[] = [1]
  if (middle[0] > 2) items.push('gap')
  items.push(...middle)
  if (middle[middle.length - 1] < last - 1) items.push('gap')
  items.push(last)
  return items
}

/**
 * Server-paginated pager in the Operation pager language (Backend `meta`).
 * Same behaviour as the Investidores pager, which keeps its local copy until
 * a later consolidation.
 */
export function WindowedPagination({
  label,
  current,
  last,
  disabled,
  onChange,
}: {
  label: string
  current: number
  last: number
  disabled: boolean
  onChange: (page: number) => void
}) {
  return (
    <nav className={shared.pagination} aria-label={label}>
      <button
        type="button"
        className={shared.pageButton}
        disabled={disabled || current <= 1}
        onClick={() => onChange(current - 1)}
        aria-label="Página anterior"
      >
        <ChevronLeft size={16} strokeWidth={1.8} aria-hidden="true" />
      </button>
      {pageItems(Math.min(current, last), last).map((item, index) =>
        item === 'gap' ? (
          <span key={`gap-${index}`} className={states.pageGap} aria-hidden="true">
            …
          </span>
        ) : (
          <button
            key={item}
            type="button"
            className={shared.pageButton}
            disabled={disabled}
            aria-current={item === current ? 'page' : undefined}
            aria-label={`Página ${item}`}
            onClick={() => (item === current ? undefined : onChange(item))}
          >
            {COUNT_FORMAT.format(item)}
          </button>
        ),
      )}
      <button
        type="button"
        className={shared.pageButton}
        disabled={disabled || current >= last}
        onClick={() => onChange(current + 1)}
        aria-label="Próxima página"
      >
        <ChevronRight size={16} strokeWidth={1.8} aria-hidden="true" />
      </button>
    </nav>
  )
}
