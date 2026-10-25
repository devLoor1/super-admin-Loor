import { useRef, useState, useSyncExternalStore } from 'react'
import { RotateCcw, Smartphone } from 'lucide-react'
import { SettingsSection } from '../SettingsSection'
import type { SectionKey } from '../settingsModel'
import { useSectionEditor } from '../useSectionEditor'
import { PLATFORM_APP_ENTRY_DEFAULTS, PLATFORM_APP_ENTRY_SCREENS } from './entryContract'
import { PLATFORM_APP_AUTHENTICATED_AREAS, PLATFORM_APP_AUTHENTICATED_DEFAULTS } from './authenticatedContract'
import fields from '../sections/fields.module.css'
import styles from './PlatformAppSection.module.css'

// Field definitions/defaults copied from the actual Admin V1 contracts. This
// memory-only editor demonstrates the interface; it is not a Core write client.
type Content = Record<string, Record<string, string>>
type AppDraft = { entry: Content; authenticated: Content }
const DEFAULTS: AppDraft = { entry: PLATFORM_APP_ENTRY_DEFAULTS, authenticated: PLATFORM_APP_AUTHENTICATED_DEFAULTS }
const GROUPS = [
  { key: 'entry', label: 'Entrada e pós-cadastro', page: 'app_entry', screens: PLATFORM_APP_ENTRY_SCREENS },
  { key: 'authenticated', label: 'Experiência autenticada', page: 'app_authenticated', screens: PLATFORM_APP_AUTHENTICATED_AREAS },
] as const
const appState: Record<string, AppDraft> = {}
let snapshot = 0
const listeners = new Set<() => void>()
const subscribe = (listener: () => void) => { listeners.add(listener); return () => listeners.delete(listener) }
const getSnapshot = () => snapshot
const normalizeAppText = (value: string) => value.normalize('NFC').trim().replace(/\s+/g, ' ')
const validAppText = (value: string, limit: number) => Boolean(value.trim()) && value.length <= limit && !/[\r\n<>\p{Cc}\p{Cf}]/u.test(value) && !/\{\{|\$\{|%\w+%/.test(value)

export function PlatformAppSection({ whitelabelId, onDirtyChange, notify }: {
  whitelabelId: string
  onDirtyChange: (section: SectionKey, dirty: boolean) => void
  notify: (message: string) => void
}) {
  useSyncExternalStore(subscribe, getSnapshot)
  const saved = appState[whitelabelId] ?? DEFAULTS
  const [groupKey, setGroupKey] = useState<'entry' | 'authenticated'>('entry')
  const [screenId, setScreenId] = useState('login')
  const button = useRef<HTMLButtonElement>(null)
  const editor = useSectionEditor<AppDraft>({
    section: 'app', label: 'Platform App', saved, onDirtyChange, notify,
    onCommit: (draft) => {
      const normalized = (content: Content): Content => Object.fromEntries(Object.entries(content).map(([screen, values]) => [screen, Object.fromEntries(Object.entries(values).map(([key, text]) => [key, normalizeAppText(text)]))]))
      appState[whitelabelId] = { entry: normalized(draft.entry), authenticated: normalized(draft.authenticated) }
      snapshot++
      listeners.forEach(listener => listener())
    },
    validate: draft => {
      const errors: Record<string, string> = {}
      for (const group of GROUPS) for (const screen of group.screens) for (const field of screen.fields) {
        if (!validAppText(draft[group.key][screen.id][field.key], field.maxLength)) errors[`${group.key}.${screen.id}.${field.key}`] = `Use texto simples em uma linha, entre 1 e ${field.maxLength} caracteres; sem HTML ou variáveis.`
      }
      return errors
    },
  })
  const value = editor.editing ? editor.draft : saved
  const group = GROUPS.find(item => item.key === groupKey)!
  const screen = group.screens.find(item => item.id === screenId) ?? group.screens[0]
  function selectGroup(key: typeof groupKey) {
    setGroupKey(key)
    setScreenId(GROUPS.find(item => item.key === key)!.screens[0].id)
  }
  function save() {
    if (!editor.save()) {
      const [path] = Object.keys(editor.draft).flatMap(key => {
        const definition = GROUPS.find(item => item.key === key)!
        return definition.screens.flatMap(area => area.fields.filter(field => !validAppText(editor.draft[definition.key][area.id][field.key], field.maxLength)).map(field => [definition.key, area.id, field.key]))
      })
      if (path) { selectGroup(path[0] as typeof groupKey); setScreenId(path[1]); window.requestAnimationFrame(() => document.getElementById(`app-${path.join('-')}`)?.focus()) }
    }
  }
  return <SettingsSection id="settings-app" title="Platform App" subtitle="33 textos editoriais do App: 20 de entrada e pós-cadastro, 13 da experiência autenticada." status={appState[whitelabelId] ? 'configured' : 'default'} editButtonRef={button} editLabel="Editar textos do App" editor={{ ...editor, save }}>
    <div className={styles.groups} aria-label="Áreas do Platform App">{GROUPS.map(item => <button key={item.key} type="button" aria-pressed={groupKey === item.key} onClick={() => selectGroup(item.key)}>{item.label}<span>{item.key === 'entry' ? '20 campos' : '13 campos'}</span></button>)}</div>
    <label className={fields.field} htmlFor="app-screen"><span className={fields.label}>Tela do App</span><select id="app-screen" className={fields.input} value={screen.id} onChange={event => setScreenId(event.target.value)}>{group.screens.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
    <p className={styles.description}>{screen.description}</p>
    <div className={styles.layout}>
      <div className={fields.fieldList}>{screen.fields.map(field => {
        const path = `${group.key}.${screen.id}.${field.key}`
        const id = `app-${group.key}-${screen.id}-${field.key}`
        const text = value[group.key][screen.id][field.key]
        const fallback = DEFAULTS[group.key][screen.id][field.key]
        const error = editor.errors[path]
        return <div key={path} className={fields.field}>
          <div className={fields.fieldHead}><label htmlFor={editor.editing ? id : undefined} className={fields.label}>{field.label}</label><span className={fields.source} data-source={text === fallback ? 'default' : 'tenant'}>{text === fallback ? 'Padrão' : 'Personalizado'}</span></div>
          {editor.editing ? <><input id={id} className={fields.input} value={text} disabled={editor.phase === 'saving'} aria-invalid={error ? true : undefined} aria-describedby={`${id}-hint${error ? ` ${id}-error` : ''}`} onChange={event => { const next = event.target.value; editor.update(draft => ({ ...draft, [group.key]: { ...draft[group.key], [screen.id]: { ...draft[group.key][screen.id], [field.key]: next } } })); editor.clearError(path) }} />
            <div className={fields.fieldFoot}><span id={`${id}-hint`}>Uma linha · máximo {field.maxLength} caracteres</span><button className={fields.textButton} type="button" disabled={editor.phase === 'saving' || text === fallback} onClick={() => editor.update(draft => ({ ...draft, [group.key]: { ...draft[group.key], [screen.id]: { ...draft[group.key][screen.id], [field.key]: fallback } } }))}><RotateCcw size={12} aria-hidden="true" />Usar padrão<span className="visually-hidden">: {field.label}</span></button></div>{error ? <p id={`${id}-error`} className={fields.error}>{error}</p> : null}</> : <p className={fields.value}>{text}</p>}
        </div>
      })}</div>
      <aside className={styles.preview} aria-label={`Prévia editorial: ${screen.label}`}><Smartphone size={21} aria-hidden="true" /><strong>{screen.label}</strong><span>Prévia textual · sem executar autenticação ou operação financeira</span>{screen.fields.map(field => <p key={field.key}>{value[group.key][screen.id][field.key]}</p>)}</aside>
    </div>
    <p className={fields.note}>Terminologia é compartilhada com Plataforma; não há um segundo editor no App. Esses campos não alteram validações, segurança, navegação ou operações financeiras. {group.page}/content · v1 · pt-BR. Salvar é somente uma simulação local.</p>
  </SettingsSection>
}
