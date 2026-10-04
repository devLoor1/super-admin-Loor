import { useRef, type KeyboardEvent } from 'react'
import { tabId, tabPanelId } from './tabIds'
import styles from './Tabs.module.css'

type TabsProps<T extends string> = {
  /** Prefix for tab / panel ids (see tabIds.ts). */
  idPrefix: string
  label: string
  tabs: { value: T; label: string }[]
  value: T
  onChange: (value: T) => void
  className?: string
}

/**
 * WAI-ARIA tablist with roving tabindex and automatic activation
 * (←/→, Home, End). The consumer renders the matching role="tabpanel".
 */
export function Tabs<T extends string>({ idPrefix, label, tabs, value, onChange, className }: TabsProps<T>) {
  const buttons = useRef<(HTMLButtonElement | null)[]>([])

  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const last = tabs.length - 1
    const next =
      event.key === 'ArrowRight' ? (index === last ? 0 : index + 1)
      : event.key === 'ArrowLeft' ? (index === 0 ? last : index - 1)
      : event.key === 'Home' ? 0
      : event.key === 'End' ? last
      : null
    if (next === null) return
    event.preventDefault()
    onChange(tabs[next].value)
    buttons.current[next]?.focus()
  }

  return (
    <div role="tablist" aria-label={label} className={[styles.tablist, className].filter(Boolean).join(' ')}>
      {tabs.map((tab, index) => {
        const selected = tab.value === value
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
            {tab.label}
          </button>
        )
      })}
    </div>
  )
}
