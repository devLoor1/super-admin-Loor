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
import { joinPreviewUrl, type StudioPreviewMode } from './studioExperienceCatalog'
import s from './ConfigurationStudio.module.css'

export type LivePreviewContext = {
  environment: LivePreviewEnvironment
  /** Path relative to env base; null = limited (no deep link). */
  pagePath: string | null
  requiresAuth?: boolean
  previewMode?: StudioPreviewMode
  resourceTitle?: string
  notice?: string
  /** When false, env tabs are hidden (Studio already selected the environment). */
  showEnvironmentSwitcher?: boolean
  onEnvironmentChange?: (environment: LivePreviewEnvironment) => void
}

type Props = {
  whitelabelId: string
  slug: string | null
  /** Comparison mode from the editor toggle — both use the real shared FE. */
  mode?: 'draft' | 'saved'
  /** Remount iframe when saved settings change (e.g. after successful save/reload). */
  revision?: string | number
  context?: LivePreviewContext
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

export function LiveWhitelabelPreview({
  whitelabelId,
  slug,
  mode = 'saved',
  revision = 0,
  context,
}: Props) {
  const normalizedSlug = readSlug(slug)
  const [load, setLoad] = useState<LoadState>({ status: 'loading' })
  const [internalEnv, setInternalEnv] = useState<LivePreviewEnvironment>(
    context?.environment ?? 'investor',
  )
  const [frameBlocked, setFrameBlocked] = useState(false)
  const [frameNonce, setFrameNonce] = useState(0)

  const environment = context?.environment ?? internalEnv
  // Studio drives Ambiente → Página; only show the env tabs when explicitly requested
  // or when used as a standalone preview without Studio context.
  const showSwitcher = context ? context.showEnvironmentSwitcher === true : true

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
        if (!context?.environment) {
          setInternalEnv(defaultLivePreviewEnvironment(targets))
        }
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
        if (!context?.environment) {
          setInternalEnv(defaultLivePreviewEnvironment(targets))
        }
      })
    return () => controller.abort()
  }, [whitelabelId, normalizedSlug, context?.environment])

  const targets = load.status === 'loading' ? [] : load.targets
  const active = useMemo(
    () => targets.find((row) => row.environment === environment) ?? null,
    [targets, environment],
  )

  const pagePath = context?.pagePath ?? null
  const previewMode = context?.previewMode ?? 'live'
  const limited = previewMode === 'limited' || pagePath === null
  const pageUrl =
    active?.contracted && active.url && !limited ? joinPreviewUrl(active.url, pagePath ?? '/') : null
  const openEnvUrl = active?.contracted && active.url ? active.url : null
  const previewUrl = limited ? null : pageUrl

  useEffect(() => {
    setFrameBlocked(false)
    setFrameNonce((n) => n + 1)
  }, [environment, revision, previewUrl, pagePath])

  const frameSrc =
    previewUrl && !frameBlocked
      ? `${previewUrl}${previewUrl.includes('?') ? '&' : '?'}saPreview=${encodeURIComponent(String(revision))}&n=${frameNonce}`
      : null

  const selectEnvironment = (next: LivePreviewEnvironment) => {
    if (context?.onEnvironmentChange) context.onEnvironmentChange(next)
    else setInternalEnv(next)
  }

  return (
    <div className={s.livePreview} aria-label="Prévia ao vivo do Whitelabel">
      {showSwitcher ? (
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
                    if (!disabled) selectEnvironment(row.environment)
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
              disabled={!previewUrl && !openEnvUrl}
              onClick={() => {
                setFrameBlocked(false)
                setFrameNonce((n) => n + 1)
              }}
            >
              <RefreshCw size={13} /> Atualizar
            </OutlineButton>
            {(previewUrl || openEnvUrl) && (
              <a
                className={s.liveOpenLink}
                href={previewUrl ?? openEnvUrl!}
                target="_blank"
                rel="noopener noreferrer"
              >
                Abrir prévia ao vivo <ExternalLink size={13} />
              </a>
            )}
          </div>
        </div>
      ) : (
        <div className={s.livePreviewToolbar}>
          <p className={s.livePreviewContext}>
            {active?.label ?? environment}
            {context?.resourceTitle ? ` › ${context.resourceTitle}` : ''}
          </p>
          <div className={s.livePreviewActions}>
            <OutlineButton
              type="button"
              disabled={!previewUrl && !openEnvUrl}
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
            ) : openEnvUrl ? (
              <a className={s.liveOpenLink} href={openEnvUrl} target="_blank" rel="noopener noreferrer">
                Abrir ambiente {active?.label ?? 'Admin'} <ExternalLink size={13} />
              </a>
            ) : null}
          </div>
        </div>
      )}

      <p className={s.livePreviewNote}>
        {mode === 'draft'
          ? 'Modo rascunho: o front real só reflete o que já foi gravado. Salve e atualize para conferir a mudança.'
          : 'Modo salvo: frontend compartilhado com a configuração persistida deste Whitelabel.'}
      </p>

      {context?.notice ? (
        <p className={s.livePreviewStatus} role="status">
          {context.notice}
        </p>
      ) : null}

      {context?.requiresAuth || previewMode === 'partial' ? (
        <p className={s.liveAuthNote} role="status">
          Prévia requer autenticação. Sem sessão válida o frontend pode redirecionar para o login — comportamento
          esperado. Nenhum bypass de autenticação é aplicado.
        </p>
      ) : null}

      {previewMode === 'representative' ? (
        <p className={s.livePreviewStatus} role="status">
          Prévia representativa: esta configuração não possui rota própria; a página aberta demonstra onde o efeito
          aparece.
        </p>
      ) : null}

      {load.status === 'loading' ? <p className={s.livePreviewStatus}>Consultando URLs do tenant…</p> : null}
      {load.status === 'error' && load.message ? (
        <p className={s.livePreviewStatus} role="status">
          {load.message}
        </p>
      ) : null}

      {!active?.contracted ? (
        <div className={s.liveFallback} role="status">
          <strong>Ambiente não contratado</strong>
          <p>
            Este frontend não faz parte do provisioning atual. Habilite o ambiente no detalhe do Whitelabel para
            pré-visualizá-lo.
          </p>
        </div>
      ) : limited ? (
        <div className={s.liveFallback} role="status">
          <strong>Prévia live limitada</strong>
          <p>
            Esta view do Admin não possui URL deep-linkável. Use Abrir ambiente ao vivo após autenticação — paths
            inventados não serão criados.
          </p>
          {openEnvUrl ? (
            <a className={s.liveOpenLink} href={openEnvUrl} target="_blank" rel="noopener noreferrer">
              Abrir ambiente {active.label} <ExternalLink size={13} />
            </a>
          ) : null}
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
            title={`Prévia ao vivo · ${active.label}${context?.resourceTitle ? ` · ${context.resourceTitle}` : ''}`}
            src={frameSrc ?? undefined}
            referrerPolicy="no-referrer"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
            onLoad={(event) => {
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
      ) : openEnvUrl && limited ? (
        <p className={s.previewFoot}>Ambiente: {openEnvUrl} · sem path de página (SPA por estado)</p>
      ) : (
        <p className={s.previewFoot}>Prévia ao vivo restrita ao Whitelabel selecionado.</p>
      )}
    </div>
  )
}
