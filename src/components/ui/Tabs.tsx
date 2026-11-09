import { useRef, type KeyboardEvent } from 'react'
import type { LucideIcon } from 'lucide-react'
import { tabId, tabPanelId } from './tabIds'
import styles from './Tabs.module.css'

type TabsProps<T extends string> = {
  /** Prefix for tab / panel ids (see tabIds.ts). */
  idPrefix: string
  label: string
  /** `icon` is rendered by the segmented variant only. */
  tabs: { value: T; label: string; icon?: LucideIcon }[]
  value: T
  onChange: (value: T) => void
  className?: string
  /** "underline" (default, detail panels) or "segmented" (page-level type switch). */
  variant?: 'underline' | 'segmented'
  orientation?: 'horizontal' | 'vertical'
}

/**
 * WAI-ARIA tablist with roving tabindex and automatic activation
 * (←/→, Home, End). The consumer renders the matching role="tabpanel".
 */
export function Tabs<T extends string>({
  idPrefix,
  label,
  tabs,
  value,
  onChange,
  className,
  variant = 'underline',
  orientation = 'horizontal',
}: TabsProps<T>) {
  const buttons = useRef<(HTMLButtonElement | null)[]>([])

  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const last = tabs.length - 1
    const forward = event.key === (orientation === 'vertical' ? 'ArrowDown' : 'ArrowRight')
    const backward = event.key === (orientation === 'vertical' ? 'ArrowUp' : 'ArrowLeft')
    const next =
      forward ? (index === last ? 0 : index + 1)
      : backward ? (index === 0 ? last : index - 1)
      : event.key === 'Home' ? 0
      : event.key === 'End' ? last
      : null
    if (next === null) return
    event.preventDefault()
    onChange(tabs[next].value)
    buttons.current[next]?.focus()
  }

  return (
    <div
      role="tablist"
      aria-label={label}
      aria-orientation={orientation}
      className={[styles.tablist, className].filter(Boolean).join(' ')}
      data-variant={variant === 'segmented' ? variant : undefined}
    >
      {tabs.map((tab, index) => {
        const selected = tab.value === value
        const Icon = variant === 'segmented' ? tab.icon : undefined
        return (
          <button
            key={tab.value}
            ref={(element) => {
              buttons.current[index] = element
            }}
            type="button"
            role="tab"
            id={tabId(idPrefix, tab.value)}
            aria-selected={selected}
            aria-controls={tabPanelId(idPrefix, tab.value)}
            tabIndex={selected ? 0 : -1}
            className={styles.tab}
            onClick={() => onChange(tab.value)}
            onFocus={(event) => event.currentTarget.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'auto' })}
            onKeyDown={(event) => onKeyDown(event, index)}
          >
            {Icon ? <Icon className={styles.icon} size={19} strokeWidth={1.7} aria-hidden="true" /> : null}
            {tab.label}
          </button>
        )
      })}
    </div>
  )
}
