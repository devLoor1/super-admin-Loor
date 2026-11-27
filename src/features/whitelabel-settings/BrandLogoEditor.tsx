import { useCallback, useEffect, useId, useRef, useState, useSyncExternalStore } from 'react'
import { ImagePlus, Trash2, Upload } from 'lucide-react'
import { Dialog } from '../../components/ui/Dialog'
import { OutlineButton } from '../../components/ui/OutlineButton'
import { PrimaryButton } from '../../components/ui/PrimaryButton'
import { useUnsavedChangesGuard } from '../../app/useUnsavedChangesGuard'
import { getSessionVersion, subscribeSession, useSessionOperator } from '../../lib/authSession'
import { ApiError, isAbortError } from '../../lib/api'
import { cloneJson, record, sameJson, type ConfigOrigin, type Json, type JsonObject } from './configurationContract'
import { CONFIG_MESSAGES, configurationLocked, getConfigurationAttempt, reconcileConfiguration, subscribeConfiguration, writeConfiguration } from './configurationClient'
import {
  assetAttempt,
  assetFileError,
  assetLocked,
  assetReference,
  getPlatformAsset,
  mutatePlatformAsset,
  previewLogoBackgroundRemoval,
  reconcilePlatformAsset,
  reprocessLogoBackground,
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
  const [processedUrl, setProcessedUrl] = useState<string | null>(null)
  const [removeBackground, setRemoveBackground] = useState(true)
  const [bgPhase, setBgPhase] = useState<'idle' | 'removing' | 'removed' | 'deferred' | 'failed'>('idle')
  const [loading, setLoading] = useState(false)
  const [working, setWorking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [confirmRemove, setConfirmRemove] = useState(false)
  const [discard, setDiscard] = useState(false)
  const [, update] = useState(0)
  const active = useRef(true)
  const fileInput = useRef<HTMLInputElement>(null)
  const previewAbort = useRef<AbortController | null>(null)
  const fileId = useId()

  const current = sourceValue(origin)
  const currentRef = logoAssetRefFrom(current)
  const externalUrl = logoUrlFrom(current)
  const attempt = assetAttempt(id, SLOT)
  const configAttempt = getConfigurationAttempt(id, CELL)
  const locked = assetLocked(id, SLOT) || configurationLocked(configAttempt)
  const dirty = !!file
  const savedPreview = asset?.url ?? (!currentRef ? externalUrl : null)
  const protectedDraft = dirty || attempt?.phase === 'uncertain' || bgPhase === 'removing'
  const busyState = working || bgPhase === 'removing' || attempt?.phase === 'sending' || configAttempt?.phase === 'checking' || configAttempt?.phase === 'sending'
  const guard = useUnsavedChangesGuard(!onState && (busyState || protectedDraft), () => { setFile(null) })
  const alive = useCallback(() => active.current && getSessionVersion() === session, [session])

  useEffect(() => { active.current = true; return () => { active.current = false; previewAbort.current?.abort() } }, [])
  useEffect(() => subscribeAssets(() => update(n => n + 1)), [])
  useEffect(() => subscribeConfiguration(() => update(n => n + 1)), [])
  const flushRef = useRef<() => Promise<boolean>>(async () => true)

  useEffect(() => {
    onState?.({
      dirty: protectedDraft,
      busy: busyState,
      flush: dirty ? () => flushRef.current() : undefined,
    })
    return () => onState?.({ dirty: false, busy: false })
  }, [onState, protectedDraft, busyState, dirty])

  useEffect(() => {
    if (!file) { setLocalUrl(null); return }
    const url = URL.createObjectURL(file)
    setLocalUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  useEffect(() => {
    return () => {
      if (processedUrl) URL.revokeObjectURL(processedUrl)
    }
  }, [processedUrl])

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

  function clearProcessed () {
    setProcessedUrl(prev => {
      if (prev) URL.revokeObjectURL(prev)
      return null
    })
    setBgPhase('idle')
  }

  function clearFile () {
    previewAbort.current?.abort()
    setFile(null)
    clearProcessed()
    if (fileInput.current) fileInput.current.value = ''
  }

  async function runBackgroundPreview (selected: File, enabled: boolean) {
    previewAbort.current?.abort()
    clearProcessed()
    if (!enabled || !writable) return
    const controller = new AbortController()
    previewAbort.current = controller
    setBgPhase('removing')
    setError(null)
    try {
      const preview = await previewLogoBackgroundRemoval(id, session, selected, controller.signal)
      if (controller.signal.aborted || !alive()) {
        URL.revokeObjectURL(preview.objectUrl)
        return
      }
      setProcessedUrl(preview.objectUrl)
      setBgPhase('removed')
      setNotice(preview.method === 'passthrough'
        ? 'A logo já tinha transparência. Nenhuma remoção adicional foi aplicada.'
        : 'Fundo removido')
    } catch (e) {
      if (controller.signal.aborted || isAbortError(e) || !alive()) return
      // Still allow save with remove_background — Core processes on upload.
      setBgPhase('deferred')
      setProcessedUrl(null)
      const detail = e instanceof ApiError
        ? (e.code ? `${e.message} (${e.code})` : e.message)
        : 'Não foi possível gerar a prévia'
      setError(null)
      setNotice(`Prévia indisponível: ${detail}. Ao salvar, o fundo será removido no servidor.`)
    }
  }

  async function refreshOrigin (): Promise<ConfigOrigin> {
    const fresh = (await getSettingsRead(id)).configuration[CELL]
    if (!fresh) throw new Error('origin')
    return fresh
  }

  async function persistRef (nextOrigin: ConfigOrigin, ref: string | null, extras: JsonObject = {}) {
    const value = brandingPayload(nextOrigin, {
      logo_asset_ref: ref,
      ...(ref ? {} : { logo_url: null }),
      ...extras,
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

  /**
   * Best-effort: never fail a successful logo upload because logo_on_dark
   * writeConfiguration no-ops (already set) or readback drifts.
   */
  async function persistLogoOnDark (nextOrigin: ConfigOrigin, onDark: boolean) {
    try {
      const value = brandingPayload(nextOrigin, {
        logo_asset_ref: logoAssetRefFrom(sourceValue(nextOrigin)),
        logo_on_dark: onDark,
      })
      // No-op when Core already persisted the flag during matte.
      if (nextOrigin.stored && sameJson(value, nextOrigin.storedValue)) {
        setOrigin(nextOrigin)
        return nextOrigin
      }
      await writeConfiguration(id, CELL, nextOrigin, value, session)
      const phase = getConfigurationAttempt(id, CELL)?.phase
      if (phase === 'confirmed') {
        const confirmed = await refreshOrigin()
        if (alive() && confirmed) setOrigin(confirmed)
        return confirmed
      }
      // rejected/stale/uncertain — asset write already won; refresh and move on
      try {
        const confirmed = await refreshOrigin()
        if (alive() && confirmed) setOrigin(confirmed)
        return confirmed
      } catch {
        if (alive()) setOrigin(nextOrigin)
        return nextOrigin
      }
    } catch {
      if (alive()) setOrigin(nextOrigin)
      return nextOrigin
    }
  }

  async function uploadOrReplace (forceWithoutBg = false): Promise<boolean> {
    if (!file || !writable || working || locked) return false
    if (bgPhase === 'removing') return false
    const applyBg = !forceWithoutBg && removeBackground && (bgPhase === 'removed' || bgPhase === 'deferred')
    if (!forceWithoutBg && removeBackground && bgPhase === 'failed') {
      setError('Não foi possível remover o fundo. Use “Salvar sem remover fundo” ou tente outro arquivo.')
      return false
    }
    setWorking(true)
    setError(null)
    setNotice(null)
    try {
      // Always rebase onto the latest email_branding.config. This cell is shared
      // with the color editor — a strict sameJson(origin) check blocked Salvar
      // whenever primary_color / logo_on_dark drifted since mount.
      const fresh = await refreshOrigin()
      if (!alive()) return false
      if (!sameJson(fresh, origin)) setOrigin(fresh)

      const existingRef = logoAssetRefFrom(sourceValue(fresh))
      const options = { removeBackground: applyBg }
      if (existingRef) {
        const replaced = await mutatePlatformAsset(id, 'replace', session, file, existingRef, CELL, SLOT, options)
        if (!alive() || !replaced) return false
        clearFile()
        // Bust signed-URL caches in the live iframe (same asset_ref, new bytes).
        setAsset({ ...replaced, url: replaced.url ? `${replaced.url}${replaced.url.includes('?') ? '&' : '?'}v=${Date.now()}` : replaced.url })
        if (applyBg) await persistLogoOnDark(fresh, true)
        else setOrigin(fresh)
        if (!alive()) return false
        setNotice(applyBg
          ? 'Logo atualizada (fundo removido)'
          : 'Logo atualizada')
        onReload()
        return true
      }

      const uploaded = await mutatePlatformAsset(id, 'upload', session, file, undefined, CELL, SLOT, options)
      if (!alive() || !uploaded) return false
      // Persist asset_ref first (required). logo_on_dark is secondary.
      const confirmed = await persistRef(fresh, uploaded.ref)
      if (!alive() || !confirmed) return false
      if (applyBg) await persistLogoOnDark(confirmed, true)
      clearFile()
      setAsset(uploaded)
      setNotice(applyBg ? 'Logo atualizada (fundo removido)' : 'Logo atualizada')
      onReload()
      return true
    } catch (e) {
      if (!alive()) return false
      if (e instanceof ApiError && (e.code === 'INVALID_IMAGE' || e.code === 'E_LOGO_BG_NOT_SOLID')) {
        setError(e.message || 'Arquivo inválido ou fundo não suportado.')
      } else if (e instanceof ApiError && e.message) {
        setError(e.message)
      } else {
        setError('O envio não foi concluído com confirmação. A logo anterior foi preservada.')
      }
      return false
    } finally {
      if (alive()) setWorking(false)
    }
  }

  flushRef.current = async () => {
    if (!file) return true
    if (bgPhase === 'removing') return false
    if (removeBackground && bgPhase === 'failed') return false
    const forceWithoutBg = !removeBackground || bgPhase === 'idle'
    return uploadOrReplace(forceWithoutBg)
  }

  async function reprocessCurrentLogo () {
    if (!writable || working || locked || !currentRef || file) return
    setWorking(true)
    setError(null)
    setNotice(null)
    try {
      const result = await reprocessLogoBackground(id, session, currentRef, CELL)
      if (!alive() || !result) return
      setAsset(result)
      try {
        const fresh = await refreshOrigin()
        await persistLogoOnDark(fresh, true)
      } catch {
        // Asset already matted; flag is best-effort for FE white-pill.
      }
      if (!alive()) return
      setNotice('Fundo removido. Pill branca do painel escuro desligada (logo_on_dark).')
      onReload()
    } catch (e) {
      if (!alive()) return
      setError(e instanceof ApiError
        ? (e.kind === 'http'
          ? `${e.message}${e.code ? ` (${e.code})` : ''}`
          : `${e.message}${e.status ? ` · HTTP ${e.status}` : ''}`)
        : 'Não foi possível remover o fundo da logo atual.')
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
      if (!alive()) return
      if (!sameJson(fresh, origin)) setOrigin(fresh)
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
  const canSaveWithBg = !!file && (bgPhase === 'removed' || bgPhase === 'deferred')
  const canSavePlain = !!file && bgPhase !== 'removing'

  return (
    <section className={styles.editor} aria-label="Logo principal" data-focus-path="logo_url">
      <p className={styles.caption}>
        Selecione o arquivo (prévia acima) e use o <strong>Salvar do rodapé</strong> — agora ele grava a logo também.
        Os botões desta seção fazem a mesma coisa. O checkbox sozinho não grava nada.
      </p>
      <div className={styles.status}>
        <span>
          {bgPhase === 'removing'
            ? 'Removendo fundo…'
            : uploading
              ? 'Enviando…'
              : bgPhase === 'removed'
                ? 'Fundo removido — pronto para salvar'
                : bgPhase === 'deferred'
                  ? 'Prévia indisponível — salve para remover o fundo no servidor'
                  : bgPhase === 'failed'
                    ? 'Não foi possível remover o fundo'
                    : file
                      ? 'Arquivo selecionado — salve para aplicar'
                    : currentRef
                      ? 'Logo por upload'
                      : externalUrl
                        ? 'Logo por URL externa'
                        : 'Sem logo configurada'}
        </span>
      </div>

      {!file && (
        <div className={styles.preview} aria-label="Logo atual">
          {savedPreview
            ? <img src={savedPreview} alt="Logo atual" referrerPolicy="no-referrer" style={{ objectFit: 'contain' }} onError={() => setError('A logo não carregou. Recarregue antes de confirmar visualmente.')} />
            : (
              <div>
                <ImagePlus size={32} />
                <p>{loading ? 'Lendo a logo…' : 'Nenhuma logo configurada'}</p>
              </div>
              )}
        </div>
      )}

      {file && (
        <div className={styles.actions} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className={styles.preview} aria-label="Prévia original" style={{ minHeight: 140 }}>
            {localUrl
              ? <img src={localUrl} alt="Prévia original" style={{ objectFit: 'contain' }} />
              : <div><p>Original</p></div>}
            <p className={styles.caption}>Original</p>
          </div>
          <div className={styles.preview} aria-label="Prévia sem fundo" style={{ minHeight: 140 }}>
            {removeBackground && processedUrl
              ? <img src={processedUrl} alt="Prévia sem fundo" style={{ objectFit: 'contain', background: 'repeating-conic-gradient(#808080 0% 25%, #c0c0c0 0% 50%) 50% / 16px 16px' }} />
              : (
                <div>
                  <p>{removeBackground
                    ? (bgPhase === 'removing'
                      ? 'Removendo fundo…'
                      : bgPhase === 'deferred'
                        ? 'Prévia falhou — remoção no salvar'
                        : bgPhase === 'failed'
                          ? 'Falha na remoção'
                          : 'Sem fundo')
                    : 'Remoção desativada'}
                  </p>
                </div>
                )}
            <p className={styles.caption}>Sem fundo</p>
          </div>
        </div>
      )}

      <p className={styles.caption}>
        PNG ou JPEG · até 20 MiB. Após remover o fundo, o arquivo salvo é PNG com transparência no storage oficial.
      </p>

      {writable
        ? (
          <fieldset className={styles.controls} disabled={working || locked || bgPhase === 'removing'}>
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
                  void runBackgroundPreview(selected, removeBackground)
                }}
              />
            </label>
            <label className={styles.toggle}>
              <input
                type="checkbox"
                checked={removeBackground}
                onChange={e => {
                  const enabled = e.target.checked
                  setRemoveBackground(enabled)
                  setError(null)
                  setNotice(null)
                  if (file) void runBackgroundPreview(file, enabled)
                  else clearProcessed()
                }}
              />
              Remover fundo automaticamente
            </label>
            {!file && (
              <p className={styles.caption} role="status">
                Selecione um arquivo acima para gerar a prévia e habilitar Salvar.
              </p>
            )}
            <div className={styles.actions}>
              {file && removeBackground && (bgPhase === 'removed' || bgPhase === 'deferred') && (
                <PrimaryButton disabled={!canSaveWithBg || working} onClick={() => { void uploadOrReplace(false) }}>
                  <Upload size={16} />
                  Salvar com fundo removido
                </PrimaryButton>
              )}
              {file && (!removeBackground || bgPhase === 'idle') && (
                <PrimaryButton disabled={!canSavePlain || working} onClick={() => { void uploadOrReplace(true) }}>
                  <Upload size={16} />
                  Salvar logo
                </PrimaryButton>
              )}
              {file && removeBackground && bgPhase === 'deferred' && (
                <OutlineButton disabled={working} onClick={() => { void runBackgroundPreview(file, true) }}>
                  Tentar prévia de novo
                </OutlineButton>
              )}
              {file && removeBackground && bgPhase === 'failed' && (
                <>
                  <OutlineButton disabled={working} onClick={() => { void runBackgroundPreview(file, true) }}>
                    Tentar remover fundo de novo
                  </OutlineButton>
                  <PrimaryButton disabled={!canSavePlain || working} onClick={() => { void uploadOrReplace(true) }}>
                    Salvar sem remover fundo
                  </PrimaryButton>
                </>
              )}
              {file && bgPhase === 'removing' && (
                <p className={styles.caption} role="status">Aguarde a remoção do fundo para salvar…</p>
              )}
              {file && <OutlineButton onClick={() => setDiscard(true)}>Descartar prévia</OutlineButton>}
              {currentRef && !file && (
                <PrimaryButton disabled={working || locked} onClick={() => { void reprocessCurrentLogo() }}>
                  Remover fundo da logo atual
                </PrimaryButton>
              )}
              {hasLogo && !file && (
                <OutlineButton onClick={() => setConfirmRemove(true)}>
                  <Trash2 size={15} />
                  Remover logo
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
        <p>A identidade estável é <code>logo_asset_ref</code>. Remoção de fundo roda no Core (edge matte); o objeto final é PNG.</p>
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
