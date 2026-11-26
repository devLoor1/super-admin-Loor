import { useCallback, useEffect, useId, useRef, useState, useSyncExternalStore } from 'react'
import { ImagePlus, Trash2, Upload } from 'lucide-react'
import { Dialog } from '../../components/ui/Dialog'
import { OutlineButton } from '../../components/ui/OutlineButton'
import { PrimaryButton } from '../../components/ui/PrimaryButton'
import { useUnsavedChangesGuard } from '../../app/useUnsavedChangesGuard'
import { getSessionVersion, subscribeSession, useSessionOperator } from '../../lib/authSession'
import { ApiError } from '../../lib/api'
import { cloneJson, record, sameJson, type ConfigOrigin, type Json, type JsonObject } from './configurationContract'
import { CONFIG_MESSAGES, configurationLocked, getConfigurationAttempt, reconcileConfiguration, subscribeConfiguration, writeConfiguration } from './configurationClient'
import {
  assetAttempt,
  assetFileError,
  assetLocked,
  assetReference,
  getPlatformAsset,
  mutatePlatformAsset,
  reconcilePlatformAsset,
  subscribeAssets,
  type PlatformAsset,
} from './platformAssetClient'
import { getSettingsRead } from './settingsReadApi'
import styles from './PlatformAssetEditor.module.css'

const CELL = 'email_branding.config' as const
const SLOT = 'logo' as const

const sourceValue = (origin: ConfigOrigin) => origin.stored ? origin.storedValue : origin.effectiveValue

function logoAssetRefFrom (value: Json): string | null {
  if (!record(value)) return null
  const ref = value.logo_asset_ref ?? value.logoAssetRef
  return assetReference(ref) ? ref : null
}

function logoUrlFrom (value: Json): string | null {
  if (!record(value)) return null
  const url = value.logo_url ?? value.logoUrl
  if (typeof url !== 'string' || !url.trim()) return null
  try {
    const parsed = new URL(url)
    if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password) return null
    return parsed.toString()
  } catch {
    return null
  }
}

function brandingPayload (origin: ConfigOrigin, patch: JsonObject): JsonObject {
  const base = origin.stored && record(origin.storedValue)
    ? cloneJson(origin.storedValue) as JsonObject
    : record(sourceValue(origin))
      ? cloneJson(sourceValue(origin)) as JsonObject
      : {}
  return { ...base, ...patch }
}

export type BrandLogoEditorProps = {
  id: string
  baseline: ConfigOrigin
  onReload: () => void
  onState?: (state: { dirty: boolean; busy: boolean }) => void
}

export function BrandLogoEditor (props: BrandLogoEditorProps) {
  const session = useSyncExternalStore(subscribeSession, getSessionVersion, () => 0)
  const operator = useSessionOperator()
  if (!operator?.roles.some(role => role === 'SUPER_ADMIN' || role === 'READ_ONLY')) return null
  return (
    <LogoEditor
      key={`${props.id}:logo:${session}`}
      {...props}
      session={session}
      writable={!!operator.roles.includes('SUPER_ADMIN')}
    />
  )
}

function LogoEditor ({
  id,
  baseline,
  onReload,
  onState,
  session,
  writable,
}: BrandLogoEditorProps & { session: number; writable: boolean }) {
  const [origin, setOrigin] = useState(baseline)
  const [asset, setAsset] = useState<PlatformAsset | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [localUrl, setLocalUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [working, setWorking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [confirmRemove, setConfirmRemove] = useState(false)
  const [discard, setDiscard] = useState(false)
  const [, update] = useState(0)
  const active = useRef(true)
  const fileInput = useRef<HTMLInputElement>(null)
  const fileId = useId()

  const current = sourceValue(origin)
  const currentRef = logoAssetRefFrom(current)
  const externalUrl = logoUrlFrom(current)
  const attempt = assetAttempt(id, SLOT)
  const configAttempt = getConfigurationAttempt(id, CELL)
  const locked = assetLocked(id, SLOT) || configurationLocked(configAttempt)
  const dirty = !!file
  const previewUrl = file ? localUrl : asset?.url ?? (!currentRef ? externalUrl : null)
  const protectedDraft = dirty || attempt?.phase === 'uncertain'
  const busyState = working || attempt?.phase === 'sending' || configAttempt?.phase === 'checking' || configAttempt?.phase === 'sending'
  const guard = useUnsavedChangesGuard(!onState && (busyState || protectedDraft), () => { setFile(null) })
  const alive = useCallback(() => active.current && getSessionVersion() === session, [session])

  useEffect(() => { active.current = true; return () => { active.current = false } }, [])
  useEffect(() => subscribeAssets(() => update(n => n + 1)), [])
  useEffect(() => subscribeConfiguration(() => update(n => n + 1)), [])
  useEffect(() => { onState?.({ dirty: protectedDraft, busy: busyState }) }, [onState, protectedDraft, busyState])
  useEffect(() => {
    if (!file) { setLocalUrl(null); return }
    const url = URL.createObjectURL(file)
    setLocalUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  useEffect(() => {
    const controller = new AbortController()
    setAsset(null)
    if (!currentRef) return () => controller.abort()
    setLoading(true)
    getPlatformAsset(id, currentRef, controller.signal, SLOT)
      .then(result => { if (!controller.signal.aborted && alive()) setAsset(result) })
      .catch(() => {
        if (!controller.signal.aborted && alive()) {
          setError('Não foi possível ler a logo associada. Atualize a leitura antes de alterar o arquivo.')
        }
      })
      .finally(() => { if (!controller.signal.aborted && alive()) setLoading(false) })
    return () => controller.abort()
  }, [id, currentRef, alive])

  function clearFile () {
    setFile(null)
    if (fileInput.current) fileInput.current.value = ''
  }

  async function refreshOrigin (): Promise<ConfigOrigin> {
    const fresh = (await getSettingsRead(id)).configuration[CELL]
    if (!fresh) throw new Error('origin')
    return fresh
  }

  async function persistRef (nextOrigin: ConfigOrigin, ref: string | null) {
    const value = brandingPayload(nextOrigin, {
      logo_asset_ref: ref,
      ...(ref ? {} : { logo_url: null }),
    })
    await writeConfiguration(id, CELL, nextOrigin, value, session)
    if (getConfigurationAttempt(id, CELL)?.phase !== 'confirmed') {
      throw new Error('config uncertain')
    }
    const confirmed = await refreshOrigin()
    if (!alive()) return null
    setOrigin(confirmed)
    return confirmed
  }

  async function uploadOrReplace () {
    if (!file || !writable || working || locked) return
    setWorking(true)
    setError(null)
    setNotice(null)
    try {
      const fresh = await refreshOrigin()
      if (!sameJson(fresh, origin)) throw new ApiError(409, { code: 'BASELINE_CHANGED' })
      if (!alive()) return

      const existingRef = logoAssetRefFrom(sourceValue(fresh))
      if (existingRef) {
        const replaced = await mutatePlatformAsset(id, 'replace', session, file, existingRef, CELL, SLOT)
        if (!alive() || !replaced) return
        clearFile()
        setAsset(replaced)
        setOrigin(fresh)
        setNotice('Logo atualizada')
        onReload()
        return
      }

      const uploaded = await mutatePlatformAsset(id, 'upload', session, file, undefined, CELL, SLOT)
      if (!alive() || !uploaded) return
      const confirmed = await persistRef(fresh, uploaded.ref)
      if (!alive() || !confirmed) return
      clearFile()
      setAsset(uploaded)
      setNotice('Logo atualizada')
      onReload()
    } catch (e) {
      if (!alive()) return
      if (e instanceof ApiError && e.code === 'BASELINE_CHANGED') {
        setError('A configuração mudou. Atualize a leitura antes de enviar.')
      } else if (e instanceof ApiError && e.code === 'INVALID_IMAGE') {
        setError('Arquivo inválido. Use PNG ou JPEG de até 20 MiB.')
      } else {
        setError('O envio não foi concluído com confirmação. A logo anterior foi preservada.')
      }
    } finally {
      if (alive()) setWorking(false)
    }
  }

  async function removeLogo () {
    if (!writable || working || locked) return
    setWorking(true)
    setError(null)
    setNotice(null)
    setConfirmRemove(false)
    const previousRef = currentRef
    try {
      const fresh = await refreshOrigin()
      if (!sameJson(fresh, origin)) throw new ApiError(409, { code: 'BASELINE_CHANGED' })
      if (!alive()) return
      await persistRef(fresh, null)
      if (!alive()) return
      setAsset(null)
      if (previousRef) {
        try {
          await mutatePlatformAsset(id, 'delete', session, undefined, previousRef, CELL, SLOT)
        } catch {
          // Branding already cleared; orphan file can be cleaned later.
        }
      }
      if (!alive()) return
      setNotice('Logo removida. Os fronts usam o fallback oficial do bootstrap.')
      onReload()
    } catch {
      if (alive()) setError('Não foi possível remover a logo. Nenhuma alteração parcial foi confirmada na configuração.')
    } finally {
      if (alive()) setWorking(false)
    }
  }

  async function reconcile () {
    if (!writable || working) return
    setWorking(true)
    setError(null)
    try {
      if (attempt?.phase === 'uncertain') {
        const image = await reconcilePlatformAsset(id, session, SLOT)
        if (!alive()) return
        if (image) setAsset(image)
      }
      if (configurationLocked(configAttempt)) await reconcileConfiguration(id, CELL, session)
      if (alive()) setNotice('Consulta concluída sem repetir a gravação.')
    } catch {
      if (alive()) setError('O resultado continua incerto. Não faça novo envio até consultar o estado.')
    } finally {
      if (alive()) setWorking(false)
    }
  }

  const hasLogo = !!currentRef || !!externalUrl || !!asset
  const uploading = attempt?.phase === 'sending' || (working && !!file)

  return (
    <section className={styles.editor} aria-label="Logo principal" data-focus-path="logo_url">
      <div className={styles.status}>
        <span>
          {uploading
            ? 'Enviando…'
            : file
              ? 'Prévia local'
              : currentRef
                ? 'Logo por upload'
                : externalUrl
                  ? 'Logo por URL externa'
                  : 'Sem logo configurada'}
        </span>
      </div>
      <div className={styles.preview} aria-label="Prévia da logo principal">
        {previewUrl
          ? <img src={previewUrl} alt="Logo principal" referrerPolicy="no-referrer" style={{ objectFit: 'contain' }} onError={() => setError('A logo não carregou. Recarregue antes de confirmar visualmente.')} />
          : (
            <div>
              <ImagePlus size={32} />
              <p>{loading ? 'Lendo a logo…' : 'Nenhuma logo configurada'}</p>
            </div>
            )}
      </div>
      <p className={styles.caption}>
        PNG ou JPEG · até 20 MiB. O arquivo vai para o storage oficial do tenant; a URL assinada não é editada manualmente.
      </p>
      {writable
        ? (
          <fieldset className={styles.controls} disabled={working || locked}>
            <legend>Logo principal</legend>
            <label className={styles.file} htmlFor={fileId}>
              <Upload size={18} />
              <span>
                {file ? file.name : hasLogo ? 'Selecionar arquivo para substituir' : 'Selecionar arquivo'}
                <small>Prévia local antes do envio · MIME validado no servidor</small>
              </span>
              <input
                ref={fileInput}
                id={fileId}
                type="file"
                accept="image/png,image/jpeg,.png,.jpg,.jpeg"
                onChange={e => {
                  const selected = e.target.files?.[0]
                  setError(null)
                  setNotice(null)
                  if (!selected) return
                  const invalid = assetFileError(selected)
                  if (invalid) {
                    setError(invalid)
                    e.target.value = ''
                    return
                  }
                  setFile(selected)
                }}
              />
            </label>
            <div className={styles.actions}>
              {file && (
                <PrimaryButton onClick={() => { void uploadOrReplace() }}>
                  <Upload size={16} />
                  {currentRef ? 'Substituir logo' : 'Enviar logo'}
                </PrimaryButton>
              )}
              {file && <OutlineButton onClick={() => setDiscard(true)}>Descartar prévia</OutlineButton>}
              {hasLogo && !file && (
                <OutlineButton onClick={() => setConfirmRemove(true)}>
                  <Trash2 size={15} />
                  Remover
                </OutlineButton>
              )}
            </div>
          </fieldset>
          )
        : <p>Seu perfil permite consultar a logo.</p>}
      {attempt?.phase === 'uncertain' && (
        <div className={styles.notice} role="status">
          <p>Resultado do arquivo incerto. Não repita o envio automaticamente.</p>
          {attempt.ref && <code>{attempt.ref}</code>}
          {writable && <OutlineButton disabled={working || !attempt.ref} onClick={() => { void reconcile() }}>Consultar resultado por GET</OutlineButton>}
        </div>
      )}
      {configAttempt && <p role="status">{CONFIG_MESSAGES[configAttempt.phase]}</p>}
      {configAttempt && ['uncertain', 'readback_matches'].includes(configAttempt.phase) && writable && (
        <OutlineButton disabled={working} onClick={() => { void reconcile() }}>Consultar associação por GET</OutlineButton>
      )}
      {notice && <p role="status" className={styles.notice}>{notice}</p>}
      {error && <p role="alert" className={styles.error}>{error}</p>}
      <details className={styles.details}>
        <summary>Avançado · referência técnica</summary>
        <p>A identidade estável é <code>logo_asset_ref</code> (object key via platform asset). URLs assinadas são geradas no bootstrap/e-mail.</p>
        {currentRef && <p>Arquivo: <code>{currentRef}</code></p>}
        {externalUrl && !currentRef && <p>URL externa legada: <code>{externalUrl}</code></p>}
      </details>
      {confirmRemove && (
        <Dialog
          title="Remover logo principal?"
          description="Limpa a referência de branding. Os fronts passam a usar o fallback oficial do bootstrap."
          tone="warning"
          onClose={() => setConfirmRemove(false)}
          footer={(
            <>
              <OutlineButton onClick={() => setConfirmRemove(false)}>Cancelar</OutlineButton>
              <PrimaryButton disabled={working} onClick={() => { void removeLogo() }}>Remover logo</PrimaryButton>
            </>
          )}
        >
          <p>Logo e banner de login são conceitos diferentes. Remover a logo não altera a imagem da área principal.</p>
        </Dialog>
      )}
      {(discard || guard.pending) && (
        <Dialog
          title="Descartar prévia local?"
          description="O arquivo ainda não foi enviado."
          tone="warning"
          onClose={() => { setDiscard(false); guard.stay() }}
          footer={(
            <>
              <OutlineButton onClick={() => { setDiscard(false); guard.stay() }}>Continuar</OutlineButton>
              <PrimaryButton disabled={busyState} onClick={() => { if (busyState) return; clearFile(); setDiscard(false); if (guard.pending) guard.discardAndContinue() }}>Descartar</PrimaryButton>
            </>
          )}
        >
          <p>Descartar a prévia não apaga logos já persistidas.</p>
        </Dialog>
      )}
    </section>
  )
}
