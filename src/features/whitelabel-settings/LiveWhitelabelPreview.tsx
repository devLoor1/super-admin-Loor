import { useEffect, useMemo, useState } from 'react'
import { ExternalLink, RefreshCw } from 'lucide-react'
import { ApiError } from '../../lib/api'
import { OutlineButton } from '../../components/ui/OutlineButton'
import { getWhitelabelProvisioning } from '../whitelabel-provisioning/provisioningApi'
import {
  defaultLivePreviewEnvironment,
  resolveLivePreviewTargets,
  type LivePreviewEnvironment,
  type LivePreviewTarget,
} from './livePreviewContract'
import s from './ConfigurationStudio.module.css'

type Props = {
  whitelabelId: string
  slug: string | null
  /** Remount iframe when saved settings change (e.g. after successful save/reload). */
  revision?: string | number
}

type LoadState =
  | { status: 'loading' }
  | { status: 'ready'; targets: LivePreviewTarget[] }
  | { status: 'error'; message: string; targets: LivePreviewTarget[] }

function readSlug(value: { state: string; value?: unknown } | string | null | undefined): string | null {
  if (typeof value === 'string') return value
  if (value && typeof value === 'object' && value.state === 'value' && typeof value.value === 'string') {
    return value.value
  }
  return null
}

export function LiveWhitelabelPreview({ whitelabelId, slug, revision = 0 }: Props) {
  const normalizedSlug = readSlug(slug)
  const [load, setLoad] = useState<LoadState>({ status: 'loading' })
  const [environment, setEnvironment] = useState<LivePreviewEnvironment>('investor')
  const [frameBlocked, setFrameBlocked] = useState(false)
  const [frameNonce, setFrameNonce] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    setLoad({ status: 'loading' })
    void getWhitelabelProvisioning(whitelabelId, controller.signal)
      .then((provisioning) => {
        if (controller.signal.aborted) return
        const targets = resolveLivePreviewTargets({
          whitelabelId,
          slug: normalizedSlug ?? provisioning.slug,
          provisioning,
        })
        setLoad({ status: 'ready', targets })
        setEnvironment(defaultLivePreviewEnvironment(targets))
      })
      .catch((error) => {
        if (controller.signal.aborted) return
        const targets = resolveLivePreviewTargets({
          whitelabelId,
          slug: normalizedSlug,
          provisioning: null,
        })
        const missing =
          error instanceof ApiError && (error.status === 404 || error.code === 'E_PROVISIONING_NOT_FOUND')
        setLoad(
          missing
            ? { status: 'ready', targets }
            : {
                status: 'error',
                message:
                  'Não foi possível consultar o provisioning. URLs de convenção do slug serão usadas quando disponíveis.',
                targets,
              },
        )
        setEnvironment(defaultLivePreviewEnvironment(targets))
      })
    return () => controller.abort()
  }, [whitelabelId, normalizedSlug])

  const targets = load.status === 'loading' ? [] : load.targets
  const active = useMemo(
    () => targets.find((row) => row.environment === environment) ?? null,
    [targets, environment],
  )

  useEffect(() => {
    setFrameBlocked(false)
    setFrameNonce((n) => n + 1)
  }, [environment, revision, active?.url])

  const previewUrl = active?.contracted ? active.url : null
  const frameSrc =
    previewUrl && !frameBlocked
      ? `${previewUrl}${previewUrl.includes('?') ? '&' : '?'}saPreview=${encodeURIComponent(String(revision))}&n=${frameNonce}`
      : null

  return (
    <div className={s.livePreview} aria-label="Prévia ao vivo do Whitelabel">
      <div className={s.livePreviewToolbar}>
        <div className={s.liveEnvSegment} role="tablist" aria-label="Ambiente da prévia">
          {targets.map((row) => {
            const disabled = !row.contracted || !row.url
            return (
              <button
                key={row.environment}
                type="button"
                role="tab"
                aria-selected={environment === row.environment}
                aria-pressed={environment === row.environment}
                disabled={disabled}
                title={
                  !row.contracted
                    ? 'Ambiente não contratado'
                    : !row.url
                      ? 'URL indisponível para este tenant'
                      : row.url
                }
                onClick={() => {
                  if (!disabled) setEnvironment(row.environment)
                }}
              >
                {row.label}
                {!row.contracted ? <span className={s.liveEnvHint}>não contratado</span> : null}
              </button>
            )
          })}
        </div>
        <div className={s.livePreviewActions}>
          <OutlineButton
            type="button"
            disabled={!previewUrl}
            onClick={() => {
              setFrameBlocked(false)
              setFrameNonce((n) => n + 1)
            }}
          >
            <RefreshCw size={13} /> Atualizar
          </OutlineButton>
          {previewUrl ? (
            <a className={s.liveOpenLink} href={previewUrl} target="_blank" rel="noopener noreferrer">
              Abrir prévia ao vivo <ExternalLink size={13} />
            </a>
          ) : null}
        </div>
      </div>

      <p className={s.livePreviewNote}>
        A prévia ao vivo exibe apenas as configurações já salvas. Alterações em rascunho não aparecem no frontend real.
      </p>

      {load.status === 'loading' ? <p className={s.livePreviewStatus}>Consultando URLs do tenant…</p> : null}
      {load.status === 'error' && load.message ? (
        <p className={s.livePreviewStatus} role="status">
          {load.message}
        </p>
      ) : null}

      {!active?.contracted ? (
        <div className={s.liveFallback} role="status">
          <strong>Ambiente não contratado</strong>
          <p>Este frontend não faz parte do provisioning atual. Habilite o ambiente no detalhe do Whitelabel para pré-visualizá-lo.</p>
        </div>
      ) : !previewUrl ? (
        <div className={s.liveFallback} role="status">
          <strong>Prévia indisponível</strong>
          <p>Não há URL confiável deste Whitelabel para o ambiente selecionado.</p>
        </div>
      ) : frameBlocked ? (
        <div className={s.liveFallback} role="status">
          <strong>Incorporação bloqueada pelo frontend</strong>
          <p>
            O site recusou ser exibido em iframe (X-Frame-Options / CSP). A política de segurança não será enfraquecida
            aqui — abra a prévia em nova aba.
          </p>
          <a className={s.liveOpenLink} href={previewUrl} target="_blank" rel="noopener noreferrer">
            Abrir prévia ao vivo <ExternalLink size={13} />
          </a>
        </div>
      ) : (
        <div className={s.liveFrameShell}>
          <iframe
            key={`${frameSrc}:${frameNonce}`}
            className={s.liveFrame}
            title={`Prévia ao vivo · ${active.label}`}
            src={frameSrc ?? undefined}
            referrerPolicy="no-referrer"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
            onLoad={(event) => {
              // Same-origin blank/error pages can be inspected; cross-origin success throws — that is OK.
              try {
                const doc = event.currentTarget.contentDocument
                if (doc && doc.location.href === 'about:blank') setFrameBlocked(true)
              } catch {
                /* cross-origin: frame rendered successfully */
              }
            }}
            onError={() => setFrameBlocked(true)}
          />
        </div>
      )}

      {previewUrl ? (
        <p className={s.previewFoot}>
          Fonte: {active?.source === 'delivery' ? 'delivery do provisioning' : 'convenção do slug'} · {previewUrl}
        </p>
      ) : (
        <p className={s.previewFoot}>Prévia ao vivo restrita ao Whitelabel selecionado.</p>
      )}
    </div>
  )
}
