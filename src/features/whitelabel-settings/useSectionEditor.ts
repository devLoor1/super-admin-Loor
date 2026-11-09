import { useEffect, useRef, useState } from 'react'
import { sameValue, type SectionKey, type SectionPhase } from './settingsModel'

export type FieldErrors = Record<string, string>

type Options<T, K extends string> = {
  /** Section id reported to the page's unsaved-change tracking. */
  section: K
  label: string
  /** Last saved (local) value of the section. */
  saved: T
  onCommit: (value: T) => void
  validate?: (draft: T) => FieldErrors
  onDirtyChange: (section: K, dirty: boolean) => void
  notify: (message: string) => void
  /** Sections without an edit mode (e.g. feature switches) always hold a draft. */
  alwaysEditing?: boolean
}

const SAVE_DELAY = 650
const SAVED_VISIBLE = 2600

/**
 * Local edit lifecycle of one settings section: view → edit → (validate) →
 * saving → saved, plus discard. "Saving" is a short local simulation; nothing
 * is sent anywhere and nothing survives a reload.
 */
export function useSectionEditor<T, K extends string = SectionKey>({
  section,
  label,
  saved,
  onCommit,
  validate,
  onDirtyChange,
  notify,
  alwaysEditing = false,
}: Options<T, K>) {
  const [editing, setEditing] = useState(alwaysEditing)
  const [draft, setDraft] = useState<T>(saved)
  const [phase, setPhase] = useState<SectionPhase>('idle')
  const [errors, setErrors] = useState<FieldErrors>({})
  const timers = useRef<number[]>([])

  const dirty = editing && !sameValue(draft, saved)

  useEffect(() => {
    onDirtyChange(section, dirty)
  }, [dirty, onDirtyChange, section])

  // A section that unmounts (context switch / navigation) no longer holds edits.
  useEffect(() => () => onDirtyChange(section, false), [onDirtyChange, section])

  useEffect(() => () => timers.current.forEach((timer) => window.clearTimeout(timer)), [])

  function startEditing() {
    setDraft(saved)
    setErrors({})
    setPhase('idle')
    setEditing(true)
  }

  function discard() {
    setDraft(saved)
    setErrors({})
    setPhase('idle')
    setEditing(alwaysEditing)
  }

  function update(next: T | ((current: T) => T)) {
    setDraft(next)
    if (phase === 'error' || phase === 'saved') setPhase('idle')
  }

  function clearError(field: string) {
    if (!errors[field]) return
    setErrors((current) => {
      const next = { ...current }
      delete next[field]
      return next
    })
  }

  /** Returns false when validation fails (focus handling is up to the caller). */
  function save() {
    if (phase === 'saving') return false
    const nextErrors = validate?.(draft) ?? {}
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) {
      setPhase('error')
      notify(`Não foi possível salvar ${label}: revise os campos indicados.`)
      return false
    }
    setPhase('saving')
    const value = draft
    timers.current.push(
      window.setTimeout(() => {
        onCommit(value)
        // Drop the submitted draft outside always-on sections: it may hold
        // write-only input (e.g. a new SMTP password) that must not linger.
        setDraft(alwaysEditing ? value : saved)
        setEditing(alwaysEditing)
        setPhase('saved')
        notify(`${label}: alterações salvas localmente neste protótipo.`)
        timers.current.push(window.setTimeout(() => setPhase((current) => (current === 'saved' ? 'idle' : current)), SAVED_VISIBLE))
      }, SAVE_DELAY),
    )
    return true
  }

  return { editing, draft, update, dirty, phase, errors, clearError, startEditing, discard, save }
}
