import { useId, useRef, useState, type KeyboardEvent } from 'react'
import { ChevronDown, X } from 'lucide-react'
import type { CatalogItem } from '../../finance-catalogs/catalogModel'
import dialogStyles from '../../whitelabel-settings/dialogs/SettingsDialogs.module.css'
import { resolveRefs } from './classification'
import styles from './Opportunities.module.css'

/**
 * Prototype multi-selection over ONE catalog (Segments or Resource Uses).
 * Disclosure button + checkbox list + removable chips: keyboard and screen
 * reader friendly without a custom combobox. Selecting here never changes
 * the other catalog's selection. Only active records are offered; records
 * that are already selected but inactive (or gone) stay visible and removable.
 */
export function CatalogPicker({
  catalog,
  label,
  singular,
  items,
  selected,
  onChange,
  disabledReason,
  hint,
}: {
  catalog: 'segment' | 'resource_use'
  /** Plural label ("Segmentos"). */
  label: string
  /** "segmento" / "uso do recurso". */
  singular: string
  items: readonly Readonly<CatalogItem>[]
  selected: string[]
  onChange: (ids: string[]) => void
  /** Shown instead of the options when the picker cannot be used (e.g. no Whitelabel yet). */
  disabledReason?: string
  hint: string
}) {
  const [open, setOpen] = useState(false)
  const toggleRef = useRef<HTMLButtonElement>(null)
  const chipButtons = useRef<(HTMLButtonElement | null)[]>([])
  const panelId = useId()
  const hintId = useId()
  const resolved = resolveRefs(selected, items)
  const options = items.filter((item) => item.status === 'active' || selected.includes(item.id))
  const empty = !disabledReason && options.length === 0
  const disabled = Boolean(disabledReason) || empty

  function toggle(id: string, checked: boolean) {
    onChange(checked ? [...selected, id] : selected.filter((item) => item !== id))
  }

  function remove(index: number) {
    const id = selected[index]
    onChange(selected.filter((item) => item !== id))
    // Keep focus in the group: next chip, previous chip, or the toggle.
    window.requestAnimationFrame(() => {
      const candidates = [chipButtons.current[index], chipButtons.current[index - 1], toggleRef.current]
      candidates.find((element) => element?.isConnected && !element.disabled)?.focus()
    })
  }

  function onPanelKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== 'Escape') return
    event.preventDefault()
    event.stopPropagation()
    setOpen(false)
    toggleRef.current?.focus()
  }

  const summary = selected.length
    ? `${selected.length} ${selected.length === 1 ? 'selecionado' : 'selecionados'}`
    : `Selecione um ou mais ${label.toLowerCase()}`

  return (
    <fieldset className={styles.fieldset} data-picker={catalog} aria-describedby={hintId}>
      <legend className={dialogStyles.label}>
        {label} <span className={dialogStyles.required}>(opcional)</span>
      </legend>
      <button
        ref={toggleRef}
        type="button"
        className={styles.pickerToggle}
        aria-expanded={open && !disabled}
        aria-controls={panelId}
        aria-label={`${label}: ${disabledReason ?? (empty ? `nenhum ${singular} ativo no catálogo` : summary)}`}
        disabled={disabled}
        onClick={() => setOpen((value) => !value)}
      >
        <span>{disabledReason ?? (empty ? `Nenhum ${singular} ativo no catálogo` : summary)}</span>
        <ChevronDown size={16} strokeWidth={1.8} aria-hidden="true" />
      </button>
      <div id={panelId} className={styles.pickerPanel} hidden={!open || disabled} onKeyDown={onPanelKeyDown}>
        {options.map((item) => (
          <label key={item.id} className={styles.pickerOption}>
            <input type="checkbox" checked={selected.includes(item.id)} onChange={(event) => toggle(item.id, event.target.checked)} />
            <span className={styles.pickerName}>
              {item.name}
              {item.status === 'inactive' ? ' — inativo no catálogo' : ''}
              {item.description ? <span className={styles.pickerDesc}>{item.description}</span> : null}
            </span>
          </label>
        ))}
      </div>
      {resolved.length ? (
        <ul className={styles.selected} aria-label={`${label} selecionados`}>
          {resolved.map((item, index) => (
            <li key={item.id} className={styles.selectedChip} data-catalog={catalog} data-state={item.state}>
              {item.state === 'missing' ? `${item.id} (fora do catálogo)` : item.name}
              {item.state === 'inactive' ? ' (inativo)' : ''}
              <button
                ref={(element) => {
                  chipButtons.current[index] = element
                }}
                type="button"
                onClick={() => remove(index)}
                aria-label={`Remover ${singular} ${item.state === 'missing' ? item.id : item.name}`}
              >
                <X size={14} strokeWidth={2} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <p id={hintId} className={dialogStyles.hint}>
        {hint}
      </p>
    </fieldset>
  )
}
