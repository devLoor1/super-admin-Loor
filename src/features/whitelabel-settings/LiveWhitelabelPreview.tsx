import { useEffect, useMemo, useState } from 'react'
import { ExternalLink, Monitor, RefreshCw, Smartphone, Tablet } from 'lucide-react'
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

export type PreviewViewport = 'desktop' | 'tablet' | 'mobile'

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
  /** Studio stage: viewport width only (does not change frontend). */
  viewport?: PreviewViewport
  onViewportChange?: (viewport: PreviewViewport) => void
  /** Hide redundant chrome when Studio topbar owns actions. */
  chrome?: 'full' | 'stage'
  dirty?: boolean
  /** External refresh trigger from Studio header. */
  refreshSignal?: number
}

type LoadState =
  | { status: 'loading' }
  | { status: 'ready'; targets: LivePreviewTarget[] }
  | { status: 'error'; message: string; targets: LivePreviewTarget[] }

const VIEWPORT_WIDTH: Record<PreviewViewport, number | null> = {
  desktop: null,
  tablet: 768,
  mobile: 390,
}

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
  viewport = 'desktop',
  onViewportChange,
  chrome = 'full',
  dirty = false,
  refreshSignal = 0,
}: Props) {
  const normalizedSlug = readSlug(slug)
  const [load, setLoad] = useState<LoadState>({ status: 'loading' })
  const [internalEnv, setInternalEnv] = useState<LivePreviewEnvironment>(
    context?.environment ?? 'investor',
  )
  const [frameBlocked, setFrameBlocked] = useState(false)
  const [frameNonce, setFrameNonce] = useState(0)

  const environment = context?.environment ?? internalEnv
  const showSwitcher = context ? context.showEnvironmentSwitcher === true : true
  const stage = chrome === 'stage'

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
  }, [environment, revision, previewUrl, pagePath, refreshSignal])

  const frameSrc =
    previewUrl && !frameBlocked
      ? `${previewUrl}${previewUrl.includes('?') ? '&' : '?'}saPreview=${encodeURIComponent(String(revision))}&n=${frameNonce}`
      : null

  const selectEnvironment = (next: LivePreviewEnvironment) => {
    if (context?.onEnvironmentChange) context.onEnvironmentChange(next)
    else setInternalEnv(next)
  }

  const reload = () => {
    setFrameBlocked(false)
    setFrameNonce((n) => n + 1)
  }

  const width = VIEWPORT_WIDTH[viewport]
  const representativeLabel =
    previewMode === 'representative' && context?.pagePath
      ? context.pagePath === '/oportunidades'
        ? 'Ofertas'
        : context.pagePath.includes('wallet')
          ? 'Carteira'
          : context.pagePath
      : null

  const viewportControls = onViewportChange ? (
    <div className={s.viewportSegment} role="group" aria-label="Tamanho da prévia">
      {(
        [
          ['desktop', Monitor, 'Desktop'],
          ['tablet', Tablet, 'Tablet'],
          ['mobile', Smartphone, 'Mobile'],
        ] as const
      ).map(([id, Icon, label]) => (
        <button
          key={id}
          type="button"
          aria-pressed={viewport === id}
          title={label}
          onClick={() => onViewportChange(id)}
        >
          <Icon size={14} />
          <span>{label}</span>
        </button>
      ))}
    </div>
  ) : null

  const statusStrip = (
    <>
      {dirty ? (
        <p className={s.liveDirtyNote} role="status">
          Alterações não salvas — o iframe live ainda mostra o estado persistido. Salve e recarregue para conferir.
        </p>
      ) : null}
      {mode === 'draft' && !dirty ? (
        <p className={s.livePreviewNote}>
          Comparação Rascunho: o front real só reflete o que já foi gravado.
        </p>
      ) : null}
      {context?.requiresAuth || previewMode === 'partial' ? (
        <p className={s.liveAuthNote} role="status">
          Esta página requer autenticação para prévia completa.
          {openEnvUrl ? (
            <>
              {' '}
              <a className={s.liveOpenLink} href={openEnvUrl} target="_blank" rel="noopener noreferrer">
                Abrir ambiente <ExternalLink size={12} />
              </a>
            </>
          ) : null}
        </p>
      ) : null}
      {previewMode === 'representative' ? (
        <p className={s.livePreviewStatus} role="status">
          Prévia representativa{representativeLabel ? `: ${representativeLabel}` : ''}. Esta configuração afeta várias
          páginas — não é uma tela isolada.
        </p>
      ) : null}
      {context?.notice && previewMode !== 'representative' && !context.requiresAuth ? (
        <p className={s.livePreviewStatus} role="status">
          {context.notice}
        </p>
      ) : null}
    </>
  )

  const frameBlock = !active?.contracted ? (
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
    <div className={s.viewportCanvas}>
      <div
        className={s.viewportFrame}
        data-size={viewport}
        style={width ? { width: `${width}px` } : undefined}
      >
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
    </div>
  )

  if (stage) {
    return (
      <div className={`${s.livePreview} ${s.livePreviewStage}`} aria-label="Prévia ao vivo do Whitelabel">
        <div className={s.stageToolbar}>
          <div className={s.stageMeta}>
            <span className={mode === 'saved' && !dirty ? s.savedBadge : s.draftBadge}>
              {dirty ? 'Alterações não salvas' : mode === 'draft' ? 'Rascunho' : 'Salvo'}
            </span>
            {viewportControls}
          </div>
          <div className={s.livePreviewActions}>
            <OutlineButton type="button" disabled={!previewUrl && !openEnvUrl} onClick={reload}>
              <RefreshCw size={13} /> Recarregar
            </OutlineButton>
            {(previewUrl || openEnvUrl) && (
              <a
                className={s.liveOpenLink}
                href={previewUrl ?? openEnvUrl!}
                target="_blank"
                rel="noopener noreferrer"
              >
                Abrir ao vivo <ExternalLink size={13} />
              </a>
            )}
          </div>
        </div>
        {statusStrip}
        {load.status === 'loading' ? <p className={s.livePreviewStatus}>Consultando URLs do tenant…</p> : null}
        {load.status === 'error' && load.message ? (
          <p className={s.livePreviewStatus} role="status">
            {load.message}
          </p>
        ) : null}
        {frameBlock}
        {previewUrl ? (
          <p className={s.previewFoot}>
            {active?.source === 'delivery' ? 'delivery' : 'convenção'} · {previewUrl}
          </p>
        ) : null}
      </div>
    )
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
            {viewportControls}
            <OutlineButton type="button" disabled={!previewUrl && !openEnvUrl} onClick={reload}>
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
            {viewportControls}
            <OutlineButton type="button" disabled={!previewUrl && !openEnvUrl} onClick={reload}>
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
      {statusStrip}
      {load.status === 'loading' ? <p className={s.livePreviewStatus}>Consultando URLs do tenant…</p> : null}
      {load.status === 'error' && load.message ? (
        <p className={s.livePreviewStatus} role="status">
          {load.message}
        </p>
      ) : null}
      {frameBlock}
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
