import { Fragment, useRef } from 'react'
import { AlertCircle, RotateCcw } from 'lucide-react'
import { SettingsSection } from '../SettingsSection'
import {
  EXPERIENCE_DEFAULTS,
  EXPERIENCE_FIELDS,
  type ExperienceKey,
  type ExperienceSettings,
  type SectionKey,
} from '../settingsModel'
import { useSectionEditor } from '../useSectionEditor'
import fields from './fields.module.css'

type Props = {
  whitelabelName: string
  saved: ExperienceSettings
  onCommit: (value: ExperienceSettings) => void
  onDirtyChange: (section: SectionKey, dirty: boolean) => void
  notify: (message: string) => void
}

const GROUP_TITLE = { texts: null, terminology: 'Terminologia' } as const

/**
 * Experiência — structured, tenant-facing copy and terminology. Each value
 * shows whether it is the global default or a Whitelabel override. Not a CMS.
 */
export function ExperienceSection({ whitelabelName, saved, onCommit, onDirtyChange, notify }: Props) {
  const editButtonRef = useRef<HTMLButtonElement>(null)
  const defaults: Record<ExperienceKey, string> = { ...EXPERIENCE_DEFAULTS, publicName: whitelabelName }

  const editor = useSectionEditor<ExperienceSettings>({
    section: 'experience',
    label: 'Experiência',
    saved,
    onDirtyChange,
    notify,
    // A value equal to its default is stored as "using default".
    onCommit: (draft) => {
      const normalized = { ...draft }
      for (const field of EXPERIENCE_FIELDS) {
        const value = draft[field.key].value.trim()
        normalized[field.key] = value === defaults[field.key] ? { value: defaults[field.key], source: 'default' } : { value, source: draft[field.key].source }
      }
      onCommit(normalized)
    },
    validate: (draft) => {
      const errors: Record<string, string> = {}
      for (const field of EXPERIENCE_FIELDS) {
        const value = draft[field.key].value.trim()
        if (field.required && !value) errors[field.key] = 'Campo obrigatório. Informe um texto ou use o padrão.'
        else if (value.length > field.maxLength) errors[field.key] = `Use no máximo ${field.maxLength} caracteres.`
      }
      return errors
    },
  })

  const current = editor.editing ? editor.draft : saved
  const configured = EXPERIENCE_FIELDS.some((field) => saved[field.key].source === 'tenant')

  function setField(key: ExperienceKey, value: string, source: 'default' | 'tenant' = 'tenant') {
    editor.update((draft) => ({ ...draft, [key]: { value, source } }))
    editor.clearError(key)
  }

  function startEditing() {
    editor.startEditing()
    window.requestAnimationFrame(() => document.getElementById('experience-publicName')?.focus())
  }

  function discard() {
    editor.discard()
    window.requestAnimationFrame(() => editButtonRef.current?.focus())
  }

  function save() {
    if (!editor.save()) {
      window.requestAnimationFrame(() =>
        document.querySelector<HTMLElement>('#settings-experience [aria-invalid="true"]')?.focus(),
      )
    }
  }

  return (
    <SettingsSection
      id="settings-experience"
      title="Experiência"
      subtitle="Textos e terminologia exibidos aos usuários deste Whitelabel."
      status={configured ? 'configured' : 'default'}
      editButtonRef={editButtonRef}
      editLabel="Editar textos"
      editor={{ ...editor, startEditing, discard, save }}
    >
      {editor.editing ? (
        <div className={fields.fieldList}>
          {EXPERIENCE_FIELDS.map((field, index) => {
            const setting = current[field.key]
            const id = `experience-${field.key}`
            const error = editor.errors[field.key]
            const length = setting.value.length
            const previousGroup = EXPERIENCE_FIELDS[index - 1]?.group
            const Control = field.multiline ? 'textarea' : 'input'
            return (
              <Fragment key={field.key}>
                {GROUP_TITLE[field.group] && previousGroup !== field.group ? (
                  <p className={fields.groupTitle}>{GROUP_TITLE[field.group]}</p>
                ) : null}
                <div className={fields.field}>
                  <div className={fields.fieldHead}>
                    <label htmlFor={id} className={fields.label}>
                      {field.label}
                      {field.required ? <span className="visually-hidden"> (obrigatório)</span> : null}
                    </label>
                    <span className={fields.labelMeta}>
                      <SourceTag source={setting.source} />
                      {setting.source === 'tenant' ? (
                        <button
                          type="button"
                          className={fields.textButton}
                          onClick={() => {
                            setField(field.key, defaults[field.key], 'default')
                            window.requestAnimationFrame(() => document.getElementById(id)?.focus())
                          }}
                          disabled={editor.phase === 'saving'}
                        >
                          <RotateCcw size={13} strokeWidth={1.8} aria-hidden="true" />
                          Usar padrão
                          <span className="visually-hidden"> em {field.label}</span>
                        </button>
                      ) : null}
                    </span>
                  </div>
                  <Control
                    id={id}
                    className={field.multiline ? fields.textarea : fields.input}
                    value={setting.value}
                    onChange={(event) => setField(field.key, event.target.value)}
                    disabled={editor.phase === 'saving'}
                    aria-invalid={error ? true : undefined}
                    aria-describedby={`${id}-hint${error ? ` ${id}-error` : ''}`}
                    {...(field.multiline ? { rows: 2 } : {})}
                  />
                  <div className={fields.fieldFoot}>
                    <span id={`${id}-hint`}>
                      {field.hint}{' '}
                      {defaults[field.key] ? `Padrão global: “${defaults[field.key]}”.` : 'Sem texto padrão.'}
                    </span>
                    <span className={fields.counter} data-over={length > field.maxLength || undefined} aria-hidden="true">
                      {length}/{field.maxLength}
                    </span>
                  </div>
                  {error ? (
                    <p id={`${id}-error`} className={fields.error}>
                      <AlertCircle size={14} strokeWidth={2} aria-hidden="true" />
                      {error}
                    </p>
                  ) : null}
                </div>
              </Fragment>
            )
          })}
        </div>
      ) : (
        <dl className={fields.rows}>
          {EXPERIENCE_FIELDS.map((field, index) => {
            const setting = current[field.key]
            const previousGroup = EXPERIENCE_FIELDS[index - 1]?.group
            return (
              <Fragment key={field.key}>
                {GROUP_TITLE[field.group] && previousGroup !== field.group ? (
                  <div className={fields.row}>
                    <dt className={fields.groupTitle} style={{ border: 0, marginTop: 0, paddingTop: 6 }}>
                      {GROUP_TITLE[field.group]}
                    </dt>
                    <dd />
                  </div>
                ) : null}
                <div className={fields.row}>
                  <dt>{field.label}</dt>
                  <dd>
                    {setting.value ? (
                      <span className={fields.value}>{setting.value}</span>
                    ) : (
                      <span className={fields.empty}>Não configurado</span>
                    )}
                    <SourceTag source={setting.source} />
                  </dd>
                </div>
              </Fragment>
            )
          })}
        </dl>
      )}
    </SettingsSection>
  )
}

function SourceTag({ source }: { source: 'default' | 'tenant' }) {
  return (
    <span className={fields.source} data-source={source}>
      {source === 'tenant' ? 'Personalizado' : 'Padrão global'}
    </span>
  )
}
