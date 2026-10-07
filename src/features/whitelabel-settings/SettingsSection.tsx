import { useEffect, useRef, type ReactNode, type Ref } from 'react'
import { AlertCircle, Check, Loader2, Pencil } from 'lucide-react'
import { OutlineButton } from '../../components/ui/OutlineButton'
import { PrimaryButton } from '../../components/ui/PrimaryButton'
import { StatusPill, type StatusTone } from '../../components/ui/StatusPill'
import { SECTION_STATUS_META, sectionStatus, type SectionPhase, type SectionStatus } from './settingsModel'
import styles from './SettingsSection.module.css'

type EditorState = {
  editing: boolean
  dirty: boolean
  phase: SectionPhase
  startEditing: () => void
  discard: () => void
  save: () => void
}

type SettingsSectionProps = {
  id: string
  title: string
  subtitle: string
  /** Resting status (Configurado, Usando padrão…); local edit states take precedence. Omit for no badge. */
  status?: SectionStatus | { label: string; tone: StatusTone }
  editor?: EditorState
  /** Sections whose controls are always live (no "Editar" button). */
  inlineEditing?: boolean
  editLabel?: string
  /** Label of the bar's save button (default "Salvar"). */
  saveLabel?: string
  headerAction?: ReactNode
  editButtonRef?: Ref<HTMLButtonElement>
  className?: string
  children: ReactNode
}

/**
 * Independent configuration card: heading, status, edit/save/discard and an
 * explicit "Alterações não salvas" bar. Each section saves on its own; there
 * is no page-wide save.
 */
export function SettingsSection({
  id,
  title,
  subtitle,
  status,
  editor,
  inlineEditing = false,
  editLabel = 'Editar',
  saveLabel = 'Salvar',
  headerAction,
  editButtonRef,
  className,
  children,
}: SettingsSectionProps) {
  // Other prototype domains may supply presentation metadata without extending
  // Settings' status catalog. Shared transient edit badges still take priority.
  const transientStatus = sectionStatus('readonly', editor)
  const meta = !status
    ? null
    : typeof status === 'string'
      ? SECTION_STATUS_META[sectionStatus(status, editor)]
      : transientStatus === 'readonly'
        ? status
        : SECTION_STATUS_META[transientStatus]
  const titleId = `${id}-title`
  const showBar = editor && (editor.editing && (!inlineEditing || editor.dirty || editor.phase === 'saving'))
  const sectionRef = useRef<HTMLElement>(null)
  const lastFocused = useRef<HTMLElement | null>(null)

  // Saving, discarding or cancelling removes the focused control (form field,
  // edit bar). Hand focus back to the section instead of dropping it to <body>.
  useEffect(() => {
    const active = document.activeElement
    if (active && active !== document.body) return
    if (!lastFocused.current || lastFocused.current.isConnected) return
    const section = sectionRef.current
    const target = section?.querySelector<HTMLElement>('[data-section-edit]') ?? section?.querySelector<HTMLElement>('h2')
    target?.focus({ preventScroll: true })
    lastFocused.current = target ?? null
  }, [editor?.editing, showBar])

  return (
    <section
      ref={sectionRef}
      id={id}
      className={[styles.section, className].filter(Boolean).join(' ')}
      aria-labelledby={titleId}
      data-detail-stage={id}
      onFocus={(event) => {
        lastFocused.current = event.target
      }}
    >
      <header className={styles.header}>
        <div className={styles.heading}>
          <div className={styles.titleRow}>
            <h2 id={titleId} className={styles.title} tabIndex={-1}>
              {title}
            </h2>
            {meta ? <StatusPill tone={meta.tone} label={meta.label} /> : null}
          </div>
          <p className={styles.subtitle}>{subtitle}</p>
        </div>
        {headerAction ??
          (editor && !inlineEditing && !editor.editing ? (
            <OutlineButton ref={editButtonRef} className={styles.editButton} onClick={editor.startEditing} data-section-edit>
              <Pencil size={14} strokeWidth={1.8} aria-hidden="true" />
              {editLabel}
              <span className="visually-hidden"> {title}</span>
            </OutlineButton>
          ) : null)}
      </header>

      <div className={styles.body}>{children}</div>

      {showBar ? (
        <div className={styles.bar} data-dirty={editor.dirty || undefined}>
          <p className={styles.barText}>
            {editor.phase === 'saving' ? (
              <>
                <Loader2 className={styles.spin} size={15} strokeWidth={2} aria-hidden="true" />
                Salvando localmente…
              </>
            ) : editor.phase === 'error' ? (
              <>
                <AlertCircle size={15} strokeWidth={2} aria-hidden="true" />
                Corrija os campos indicados para salvar.
              </>
            ) : editor.dirty ? (
              <>
                <span className={styles.dot} aria-hidden="true" />
                Alterações não salvas
              </>
            ) : (
              <>
                <Check size={15} strokeWidth={2} aria-hidden="true" />
                Nenhuma alteração
              </>
            )}
          </p>
          <div className={styles.barActions}>
            <OutlineButton className={styles.barButton} onClick={editor.discard} disabled={editor.phase === 'saving'}>
              {inlineEditing ? 'Descartar' : editor.dirty ? 'Descartar' : 'Cancelar'}
              <span className="visually-hidden"> alterações de {title}</span>
            </OutlineButton>
            <PrimaryButton
              className={styles.barButton}
              onClick={editor.save}
              disabled={!editor.dirty || editor.phase === 'saving'}
            >
              {saveLabel}
              <span className="visually-hidden"> {title}</span>
            </PrimaryButton>
          </div>
        </div>
      ) : null}
    </section>
  )
}
