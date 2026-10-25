import { useRef, useState, type CSSProperties, type Ref } from 'react'
import { AlertCircle, ImageUp, RotateCcw } from 'lucide-react'
import type { Whitelabel } from '../../whitelabels/prototypeWhitelabels'
import { SettingsSection } from '../SettingsSection'
import {
  DEFAULT_COLORS,
  HEX_COLOR,
  contrastRatio,
  type AssetRef,
  type IdentitySettings,
  type SectionKey,
  type SettingValue,
} from '../settingsModel'
import { useSectionEditor } from '../useSectionEditor'
import fields from './fields.module.css'
import styles from './IdentitySection.module.css'

type AssetKey = 'logo' | 'favicon'
type ColorKey = 'primaryColor' | 'accentColor'

const ASSET_RULES: Record<AssetKey, { label: string; maxBytes: number; maxLabel: string }> = {
  logo: { label: 'Logo da plataforma', maxBytes: 1024 * 1024, maxLabel: '1 MB' },
  favicon: { label: 'Favicon', maxBytes: 256 * 1024, maxLabel: '256 KB' },
}
const ACCEPTED = ['image/png', 'image/svg+xml', 'image/jpeg', 'image/webp']

const COLOR_RULES: Record<ColorKey, { label: string; fallback: string; hint: string }> = {
  primaryColor: { label: 'Cor principal', fallback: DEFAULT_COLORS.primary, hint: 'Botões e destaques principais.' },
  accentColor: { label: 'Cor de apoio', fallback: DEFAULT_COLORS.accent, hint: 'Elementos secundários e indicadores.' },
}

type Props = {
  whitelabel: Whitelabel
  saved: IdentitySettings
  publicName: string
  ctaLabel: string
  onCommit: (value: IdentitySettings) => void
  onDirtyChange: (section: SectionKey, dirty: boolean) => void
  notify: (message: string) => void
}

/**
 * Identidade — logo, favicon and the two brand colours with a live preview.
 * File selection is a frontend simulation: the image is previewed from a local
 * object URL and never uploaded.
 */
export function IdentitySection({ whitelabel, saved, publicName, ctaLabel, onCommit, onDirtyChange, notify }: Props) {
  const [assetErrors, setAssetErrors] = useState<Partial<Record<AssetKey, string>>>({})
  const editButtonRef = useRef<HTMLButtonElement>(null)
  const firstControlRef = useRef<HTMLButtonElement>(null)
  const editor = useSectionEditor<IdentitySettings>({
    section: 'identity',
    label: 'Identidade',
    saved,
    onCommit,
    onDirtyChange,
    notify,
    validate: (draft) => {
      const errors: Record<string, string> = {}
      for (const key of ['primaryColor', 'accentColor'] as ColorKey[]) {
        if (!HEX_COLOR.test(draft[key].value)) errors[key] = 'Use o formato hexadecimal #RRGGBB.'
      }
      return errors
    },
  })
  const current = editor.editing ? editor.draft : saved
  const configured = Object.values(saved).some((setting) => setting.source === 'tenant')

  function setValue<K extends keyof IdentitySettings>(key: K, value: IdentitySettings[K]) {
    editor.update((draft) => ({ ...draft, [key]: value }))
    editor.clearError(key)
  }

  function chooseFile(key: AssetKey, file: File | undefined) {
    if (!file) return
    const rule = ASSET_RULES[key]
    let error: string | undefined
    if (!ACCEPTED.includes(file.type)) error = 'Formato não suportado. Use PNG, SVG, JPG ou WebP.'
    else if (file.size > rule.maxBytes) error = `Arquivo maior que ${rule.maxLabel}.`
    setAssetErrors((errors) => ({ ...errors, [key]: error }))
    if (error) return
    setValue(key, { value: { url: URL.createObjectURL(file), name: file.name, local: true }, source: 'tenant' })
  }

  function startEditing() {
    setAssetErrors({})
    editor.startEditing()
    window.requestAnimationFrame(() => firstControlRef.current?.focus())
  }

  function finish(action: 'save' | 'discard') {
    if (action === 'discard') {
      setAssetErrors({})
      editor.discard()
      window.requestAnimationFrame(() => editButtonRef.current?.focus())
      return
    }
    if (!editor.save()) {
      window.requestAnimationFrame(() =>
        document.querySelector<HTMLElement>('#settings-identity [aria-invalid="true"]')?.focus(),
      )
    }
  }

  return (
    <SettingsSection
      id="settings-identity"
      title="Identidade"
      subtitle="Logo, favicon e cores aplicados à plataforma deste Whitelabel."
      status={configured ? 'configured' : 'default'}
      editButtonRef={editButtonRef}
      editor={{ ...editor, startEditing, discard: () => finish('discard'), save: () => finish('save') }}
    >
      <div className={styles.grid}>
        {(['logo', 'favicon'] as AssetKey[]).map((key, index) => (
          <AssetTile
            key={key}
            assetKey={key}
            setting={current[key]}
            initial={whitelabel.initial ?? whitelabel.name.charAt(0)}
            color={current.primaryColor.value}
            editing={editor.editing}
            disabled={editor.phase === 'saving'}
            error={assetErrors[key]}
            replaceRef={index === 0 ? firstControlRef : undefined}
            onFile={(file) => chooseFile(key, file)}
            onUseDefault={() => {
              setAssetErrors((errors) => ({ ...errors, [key]: undefined }))
              setValue(key, { value: null, source: 'default' })
            }}
          />
        ))}
        {(['primaryColor', 'accentColor'] as ColorKey[]).map((key) => (
          <ColorTile
            key={key}
            colorKey={key}
            setting={current[key]}
            editing={editor.editing}
            disabled={editor.phase === 'saving'}
            error={editor.errors[key]}
            onChange={(value) =>
              // A value equal to the global default counts as "using default".
              setValue(key, {
                value,
                source: value.toLowerCase() === COLOR_RULES[key].fallback.toLowerCase() ? 'default' : 'tenant',
              })
            }
            onUseDefault={() => setValue(key, { value: COLOR_RULES[key].fallback, source: 'default' })}
          />
        ))}
      </div>

      <IdentityPreview identity={current} publicName={publicName} ctaLabel={ctaLabel} initial={whitelabel.initial ?? whitelabel.name.charAt(0)} />
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

function AssetTile({
  assetKey,
  setting,
  initial,
  color,
  editing,
  disabled,
  error,
  replaceRef,
  onFile,
  onUseDefault,
}: {
  assetKey: AssetKey
  setting: SettingValue<AssetRef | null>
  initial: string
  color: string
  editing: boolean
  disabled: boolean
  error?: string
  replaceRef?: Ref<HTMLButtonElement>
  onFile: (file: File | undefined) => void
  onUseDefault: () => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const rule = ASSET_RULES[assetKey]
  const errorId = `identity-${assetKey}-error`
  const asset = setting.value
  return (
    <div className={styles.tile} data-kind={assetKey}>
      <div className={fields.fieldHead}>
        <span className={fields.label} id={`identity-${assetKey}-label`}>
          {rule.label}
        </span>
        <SourceTag source={setting.source} />
      </div>
      <div className={styles.assetPreview} data-kind={assetKey}>
        {asset ? (
          <img src={asset.url} alt={`${rule.label} atual`} className={styles.assetImage} />
        ) : (
          <span className={styles.monogram} style={{ '--mono': HEX_COLOR.test(color) ? color : DEFAULT_COLORS.primary } as CSSProperties} role="img" aria-label={`${rule.label} padrão (inicial ${initial})`}>
            {initial}
          </span>
        )}
      </div>
      <p className={styles.assetMeta}>
        {asset ? (asset.local ? `${asset.name} · arquivo local, não enviado` : asset.name) : 'Monograma padrão'}
      </p>
      {editing ? (
        <div className={styles.tileActions}>
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPTED.join(',')}
            className="visually-hidden"
            tabIndex={-1}
            aria-hidden="true"
            onChange={(event) => {
              onFile(event.target.files?.[0])
              event.target.value = ''
            }}
          />
          <button
            ref={replaceRef}
            id={`identity-${assetKey}-replace`}
            type="button"
            className={fields.textButton}
            onClick={() => inputRef.current?.click()}
            disabled={disabled}
            aria-describedby={error ? errorId : `identity-${assetKey}-hint`}
          >
            <ImageUp size={14} strokeWidth={1.8} aria-hidden="true" />
            Substituir {assetKey === 'logo' ? 'logo' : 'favicon'}
          </button>
          {setting.source === 'tenant' ? (
            <button
              type="button"
              className={fields.textButton}
              onClick={() => {
                onUseDefault()
                // The button disappears with the override; keep focus in the tile.
                window.requestAnimationFrame(() => document.getElementById(`identity-${assetKey}-replace`)?.focus())
              }}
              disabled={disabled}
            >
              <RotateCcw size={13} strokeWidth={1.8} aria-hidden="true" />
              Usar padrão
              <span className="visually-hidden"> em {rule.label}</span>
            </button>
          ) : null}
          <span id={`identity-${assetKey}-hint`} className="visually-hidden">
            PNG, SVG, JPG ou WebP até {rule.maxLabel}. Simulação local: nada é enviado.
          </span>
        </div>
      ) : null}
      {error ? (
        <p id={errorId} className={fields.error} role="alert">
          <AlertCircle size={14} strokeWidth={2} aria-hidden="true" />
          {error}
        </p>
      ) : null}
    </div>
  )
}

function ColorTile({
  colorKey,
  setting,
  editing,
  disabled,
  error,
  onChange,
  onUseDefault,
}: {
  colorKey: ColorKey
  setting: SettingValue<string>
  editing: boolean
  disabled: boolean
  error?: string
  onChange: (value: string) => void
  onUseDefault: () => void
}) {
  const rule = COLOR_RULES[colorKey]
  const valid = HEX_COLOR.test(setting.value)
  const inputId = `identity-${colorKey}`
  const ratio = valid ? contrastRatio(setting.value, '#ffffff') : null
  return (
    <div className={styles.tile}>
      <div className={fields.fieldHead}>
        <label className={fields.label} htmlFor={editing ? inputId : undefined}>
          {rule.label}
        </label>
        <SourceTag source={setting.source} />
      </div>
      <div className={styles.colorRow}>
        {editing ? (
          <input
            type="color"
            className={styles.colorPicker}
            value={valid ? setting.value.toLowerCase() : rule.fallback.toLowerCase()}
            onChange={(event) => onChange(event.target.value.toUpperCase())}
            disabled={disabled}
            aria-label={`${rule.label}: seletor de cor`}
          />
        ) : (
          <span className={styles.swatch} style={{ background: valid ? setting.value : 'transparent' }} aria-hidden="true" />
        )}
        {editing ? (
          <input
            id={inputId}
            className={`${fields.input} ${styles.hexInput}`}
            value={setting.value}
            onChange={(event) => onChange(event.target.value.trim())}
            maxLength={7}
            spellCheck={false}
            disabled={disabled}
            aria-invalid={error ? true : undefined}
            aria-describedby={`${inputId}-hint${error ? ` ${inputId}-error` : ''}`}
          />
        ) : (
          <span className={`${fields.value} ${styles.hex}`}>{setting.value.toUpperCase()}</span>
        )}
      </div>
      <p id={`${inputId}-hint`} className={styles.assetMeta}>
        {rule.hint}
        {colorKey === 'primaryColor' && ratio ? ` Contraste com texto branco: ${(Math.floor(ratio * 10) / 10).toFixed(1)}:1${ratio >= 4.5 ? ' (AA)' : ' (abaixo de AA)'}.` : ''}
      </p>
      {editing && setting.source === 'tenant' ? (
        <div className={styles.tileActions}>
          <button
            type="button"
            className={fields.textButton}
            onClick={() => {
              onUseDefault()
              window.requestAnimationFrame(() => document.getElementById(inputId)?.focus())
            }}
            disabled={disabled}
          >
            <RotateCcw size={13} strokeWidth={1.8} aria-hidden="true" />
            Usar padrão ({rule.fallback})
            <span className="visually-hidden"> em {rule.label}</span>
          </button>
        </div>
      ) : null}
      {error ? (
        <p id={`${inputId}-error`} className={fields.error}>
          <AlertCircle size={14} strokeWidth={2} aria-hidden="true" />
          {error}
        </p>
      ) : null}
    </div>
  )
}

function IdentityPreview({
  identity,
  publicName,
  ctaLabel,
  initial,
}: {
  identity: IdentitySettings
  publicName: string
  ctaLabel: string
  initial: string
}) {
  const primary = HEX_COLOR.test(identity.primaryColor.value) ? identity.primaryColor.value : DEFAULT_COLORS.primary
  const accent = HEX_COLOR.test(identity.accentColor.value) ? identity.accentColor.value : DEFAULT_COLORS.accent
  const lightText = contrastRatio(primary, '#ffffff') >= contrastRatio(primary, '#111318')
  return (
    <figure className={styles.preview} style={{ '--p-primary': primary, '--p-accent': accent, '--p-on-primary': lightText ? '#ffffff' : '#111318' } as CSSProperties}>
      <figcaption className={styles.previewCaption}>
        Pré-visualização ilustrativa
        <span className="visually-hidden">
          : {publicName}, {identity.logo.value ? 'com logo' : 'sem logo (inicial)'}, cor principal {primary}, cor de apoio{' '}
          {accent}, botão “{ctaLabel}”.
        </span>
      </figcaption>
      <div className={styles.previewFrame} aria-hidden="true">
        <div className={styles.previewTab}>
          {identity.favicon.value ? (
            <img src={identity.favicon.value.url} alt="" className={styles.previewFavicon} />
          ) : (
            <span className={styles.previewFaviconMono}>{initial}</span>
          )}
          <span className={styles.previewTabTitle}>{publicName}</span>
        </div>
        <div className={styles.previewBar}>
          {identity.logo.value ? (
            <img src={identity.logo.value.url} alt="" className={styles.previewLogo} />
          ) : (
            <span className={styles.previewLogoMono}>
              <span>{initial}</span>
              {publicName}
            </span>
          )}
          <span className={styles.previewNav}>
            <span />
            <span />
            <span />
          </span>
        </div>
        <div className={styles.previewHero}>
          <span className={styles.previewBadge}>Novo</span>
          <span className={styles.previewLine} />
          <span className={styles.previewLineShort} />
          <span className={styles.previewCta}>{ctaLabel}</span>
        </div>
      </div>
    </figure>
  )
}
