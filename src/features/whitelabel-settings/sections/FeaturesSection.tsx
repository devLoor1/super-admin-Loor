import { RotateCcw } from 'lucide-react'
import { Switch } from '../../../components/ui/Switch'
import { SettingsSection } from '../SettingsSection'
import { FEATURE_DEFAULTS, FEATURES, type FeatureKey, type FeatureSettings, type SectionKey } from '../settingsModel'
import { useSectionEditor } from '../useSectionEditor'
import fields from './fields.module.css'
import styles from './FeaturesSection.module.css'

type Props = {
  saved: FeatureSettings
  onCommit: (value: FeatureSettings) => void
  onDirtyChange: (section: SectionKey, dirty: boolean) => void
  notify: (message: string) => void
}

const onOff = (value: boolean) => (value ? 'Ativado' : 'Desativado')

/**
 * Funcionalidades — only capabilities already confirmed in the product. The
 * switches change a local draft; nothing takes effect until "Salvar", and
 * saving only updates this prototype.
 */
export function FeaturesSection({ saved, onCommit, onDirtyChange, notify }: Props) {
  const editor = useSectionEditor<FeatureSettings>({
    section: 'features',
    label: 'Funcionalidades',
    saved,
    onCommit,
    onDirtyChange,
    notify,
    alwaysEditing: true,
  })

  const configured = FEATURES.some((feature) => saved[feature.key].source === 'tenant')

  // A value equal to the global default is "using default"; anything else is an override.
  function setFeature(key: FeatureKey, value: boolean) {
    editor.update((draft) => ({
      ...draft,
      [key]: { value, source: value === FEATURE_DEFAULTS[key] ? 'default' : 'tenant' },
    }))
  }

  return (
    <SettingsSection
      id="settings-features"
      title="Funcionalidades"
      subtitle="Recursos já existentes no produto que podem ser ativados para este Whitelabel."
      status={configured ? 'configured' : 'default'}
      editor={editor}
      inlineEditing
    >
      <ul className={styles.list}>
        {FEATURES.map((feature) => {
          const setting = editor.draft[feature.key]
          const changed = setting.value !== saved[feature.key].value
          const labelId = `feature-${feature.key}-label`
          const descriptionId = `feature-${feature.key}-description`
          return (
            <li key={feature.key} className={styles.item} data-changed={changed || undefined}>
              <div className={styles.text}>
                <p id={labelId} className={styles.label}>
                  {feature.label}
                </p>
                <p id={descriptionId} className={styles.description}>
                  {feature.description}
                </p>
              </div>
              <div className={styles.control}>
                <span className={styles.state} data-on={setting.value || undefined} aria-hidden="true">
                  {onOff(setting.value)}
                </span>
                <Switch
                  id={`feature-${feature.key}-switch`}
                  checked={setting.value}
                  onCheckedChange={(value) => setFeature(feature.key, value)}
                  disabled={editor.phase === 'saving'}
                  aria-labelledby={labelId}
                  aria-describedby={descriptionId}
                />
              </div>
              <p className={styles.meta}>
                <span className={fields.source} data-source={setting.source}>
                  {setting.source === 'tenant' ? 'Personalizado' : 'Padrão global'}
                </span>
                <span>Padrão global: {onOff(FEATURE_DEFAULTS[feature.key])}</span>
                {setting.source === 'tenant' ? (
                  <button
                    type="button"
                    className={fields.textButton}
                    onClick={() => {
                      setFeature(feature.key, FEATURE_DEFAULTS[feature.key])
                      // The button disappears with the override; keep focus on the feature.
                      window.requestAnimationFrame(() => document.getElementById(`feature-${feature.key}-switch`)?.focus())
                    }}
                    disabled={editor.phase === 'saving'}
                  >
                    <RotateCcw size={13} strokeWidth={1.8} aria-hidden="true" />
                    Restaurar padrão
                    <span className="visually-hidden"> de {feature.label}</span>
                  </button>
                ) : null}
              </p>
              {changed ? (
                <span className={styles.changed}>
                  Alterado localmente
                  <span className="visually-hidden"> em {feature.label}: salve para aplicar</span>
                </span>
              ) : null}
            </li>
          )
        })}
      </ul>
      <p className={styles.footnote}>
        As alterações valem apenas neste protótipo. Outras funcionalidades serão listadas quando confirmadas pelo produto.
      </p>
    </SettingsSection>
  )
}
