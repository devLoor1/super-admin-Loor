import { useCallback, useEffect, useState } from 'react'
import { ChevronDown, ExternalLink, RefreshCw } from 'lucide-react'
import { Dialog } from '../../components/ui/Dialog'
import { OutlineButton } from '../../components/ui/OutlineButton'
import { PrimaryButton } from '../../components/ui/PrimaryButton'
import { useUnsavedChangesGuard } from '../../app/useUnsavedChangesGuard'
import { CONFIG_DEFINITIONS, isConfigCell, type ConfigCell, type ConfigOrigin } from './configurationContract'
import { CompositeConfigurationEditor, ScalarConfigurationEditor, type EditorState } from './ConfigurationEditor'
import { PlatformAssetEditor } from './PlatformAssetEditor'
import { LiveWhitelabelPreview, type LivePreviewContext, type PreviewViewport } from './LiveWhitelabelPreview'
import { isSettingsField, settingsFieldLabel } from './settingsWriteContract'
import { APP_AUTH_GROUPS, APP_ENTRY_GROUPS } from './appContentRead'
import { configHref, type ConfigArea } from './configRoute'
import { resolveLivePreviewTargets, type LivePreviewTarget } from './livePreviewContract'
import { getWhitelabelProvisioning } from '../whitelabel-provisioning/provisioningApi'
import {
  getStudioMenu,
  joinPreviewUrl,
  resolveStudioSelection,
  STUDIO_ENVIRONMENT_MENUS,
  type StudioEnvironmentId,
  type StudioResource,
} from './studioExperienceCatalog'
import { sectionsForResource } from './studioPanelSections'
import type { SettingsRead } from './settingsReadApi'
import s from './ConfigurationStudio.module.css'

const appGroups = [
  { id: 'app_entry', title: 'Acesso e cadastro', cells: ['app_entry.content'] },
  { id: 'app_authenticated', title: 'Área autenticada', cells: ['app_authenticated.content'] },
  { id: 'terminology', title: 'Terminologia', cells: ['terminology.config'] },
]
const label = (cell: string) =>
  cell === 'quick_profile.appearance'
    ? 'Aparência herdada'
    : isConfigCell(cell)
      ? CONFIG_DEFINITIONS[cell].title
      : isSettingsField(cell)
        ? settingsFieldLabel(cell)
        : cell
const historicalCells = new Set([
  'register.entry_presentation',
  'register.main_area_image',
  'quick_profile.theme',
  'quick_profile.entry_presentation',
  'quick_profile.main_area_image',
])
function tabLabel(cell: string) {
  if (cell === 'quick_profile.theme') return 'Tema legado'
  if (cell.endsWith('.entry_presentation')) return historicalCells.has(cell) ? 'Aparência legada' : 'Aparência'
  if (cell.endsWith('.main_area_image')) return historicalCells.has(cell) ? 'Imagem legada' : 'Imagem'
  return label(cell)
}

function readText(field: { state: string; value?: unknown } | undefined): string | null {
  if (!field || field.state !== 'value' || typeof field.value !== 'string') return null
  return field.value
}

function AssetPane({
  id,
  cell,
  origin,
  onReload,
  onState,
}: {
  id: string
  cell: ConfigCell
  origin: ConfigOrigin
  onReload: () => void
  onState: (state: EditorState) => void
}) {
  return (
    <div className={s.panelEditor}>
      <PlatformAssetEditor id={id} cell={cell} baseline={origin} onReload={onReload} onState={onState} />
    </div>
  )
}

function PropertyEditor({
  id,
  data,
  cell,
  onReload,
  onState,
}: {
  id: string
  data: SettingsRead
  cell: string
  onReload: () => void
  onState: (state: EditorState) => void
}) {
  const origin = isConfigCell(cell) ? data.configuration[cell] : undefined
  if (cell === 'quick_profile.appearance') {
    return (
      <div className={s.panelNotice}>
        <p>
          A aparência desta tela na carteira Web segue o Login. Use a seção de Login para alterar a apresentação
          visual.
        </p>
        <a href={configHref(id, 'platform', 'login.entry_presentation', { env: 'investor', resource: 'login' })}>
          Abrir aparência do Login
        </a>
      </div>
    )
  }
  if (isSettingsField(cell)) {
    if (!data.provenance[cell]) {
      return <p className={s.panelNotice}>Proveniência não fornecida. Não é seguro editar este valor.</p>
    }
    return (
      <ScalarConfigurationEditor
        key={cell}
        id={id}
        data={data}
        field={cell}
        onReload={onReload}
        onState={onState}
        embedPreview={false}
      />
    )
  }
  if (isConfigCell(cell) && origin) {
    if (cell.endsWith('.main_area_image')) {
      return <AssetPane id={id} cell={cell} origin={origin} onReload={onReload} onState={onState} />
    }
    return (
      <CompositeConfigurationEditor
        key={cell}
        id={id}
        data={data}
        cell={cell}
        onReload={onReload}
        onState={onState}
        embedPreview={false}
      />
    )
  }
  return (
    <p className={s.panelNotice}>
      O servidor não retornou proveniência para esta configuração. Nenhum valor será inventado.
    </p>
  )
}

function PlatformStudio({
  id,
  data,
  selectedEnv,
  selectedResource,
  selectedCell,
  onReload,
}: {
  id: string
  data: SettingsRead
  selectedEnv?: string
  selectedResource?: string
  selectedCell?: string
  onReload: () => void
}) {
  const selection = resolveStudioSelection({
    env: selectedEnv,
    resource: selectedResource,
    cell: selectedCell,
  })
  const { env, resource } = selection
  const cell = selection.cell
  const menu = getStudioMenu(env)
  const tenantName = readText(data.name) ?? `Whitelabel ${id}`
  const tenantSlug = readText(data.slug)

  const [targets, setTargets] = useState<LivePreviewTarget[]>(() =>
    resolveLivePreviewTargets({ whitelabelId: id, slug: tenantSlug, provisioning: null }),
  )
  useEffect(() => {
    const controller = new AbortController()
    void getWhitelabelProvisioning(id, controller.signal)
      .then((provisioning) => {
        if (controller.signal.aborted) return
        setTargets(
          resolveLivePreviewTargets({
            whitelabelId: id,
            slug: tenantSlug ?? provisioning.slug,
            provisioning,
          }),
        )
      })
      .catch(() => {
        if (controller.signal.aborted) return
        setTargets(resolveLivePreviewTargets({ whitelabelId: id, slug: tenantSlug, provisioning: null }))
      })
    return () => controller.abort()
  }, [id, tenantSlug])

  const envTarget = targets.find((t) => t.environment === env)
  const envContracted = envTarget?.contracted !== false
  const openLiveUrl =
    envTarget?.contracted && envTarget.url
      ? joinPreviewUrl(envTarget.url, resource.previewPath ?? '/') ?? envTarget.url
      : null

  const previewContext: LivePreviewContext = {
    environment: env,
    pagePath: resource.previewPath,
    requiresAuth: resource.requiresAuth,
    previewMode: resource.previewMode,
    resourceTitle: resource.title,
    notice: resource.notice,
    showEnvironmentSwitcher: false,
  }

  const [state, setState] = useState<EditorState>({ dirty: false, busy: false })
  const onState = useCallback(
    (next: EditorState) =>
      setState((current) =>
        current.dirty === next.dirty && current.busy === next.busy ? current : next,
      ),
    [],
  )
  const guard = useUnsavedChangesGuard(state.dirty || state.busy, () => setState({ dirty: false, busy: false }))
  const [viewport, setViewport] = useState<PreviewViewport>('desktop')
  const [previewMode, setPreviewMode] = useState<'draft' | 'saved'>('saved')
  const [refreshSignal, setRefreshSignal] = useState(0)
  const [mobilePane, setMobilePane] = useState<'config' | 'preview'>('config')
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({})

  const sections = sectionsForResource(resource.id, resource.cells)
  useEffect(() => {
    const next: Record<string, boolean> = {}
    for (const section of sectionsForResource(resource.id, resource.cells)) {
      next[section.id] = section.defaultOpen !== false
    }
    setOpenSections(next)
  }, [resource.id, resource.cells])

  const hrefFor = (nextEnv: StudioEnvironmentId, nextResource: StudioResource, nextCell?: string) =>
    configHref(id, 'platform', nextCell ?? nextResource.cells[0], {
      env: nextEnv,
      resource: nextResource.id,
    })

  const onEnvChange = (next: string) => {
    if (!isStudioEnv(next)) return
    const target = targets.find((t) => t.environment === next)
    if (target && !target.contracted) return
    window.location.hash = hrefFor(next, getStudioMenu(next).resources[0])
  }

  const onResourceChange = (nextId: string) => {
    const next = menu.resources.find((r) => r.id === nextId)
    if (!next) return
    window.location.hash = hrefFor(env, next)
  }

  const revision = `${id}:${env}:${resource.id}:${cell ?? 'none'}:${previewMode}`

  return (
    <section className={s.studioShell} aria-label="Studio Whitelabel">
      <header className={s.studioTopbar}>
        <div className={s.studioIdentity}>
          <div className={s.studioTenant}>
            <span className={s.studioEyebrow}>Studio</span>
            <strong title={tenantName}>{tenantName}</strong>
          </div>
          <label className={s.studioSelect}>
            <span>Ambiente</span>
            <span className={s.studioSelectWrap}>
              <select
                value={env}
                onChange={(e) => onEnvChange(e.target.value)}
                aria-label="Ambiente"
              >
                {STUDIO_ENVIRONMENT_MENUS.map((item) => {
                  const target = targets.find((t) => t.environment === item.id)
                  const contracted = target?.contracted !== false
                  return (
                    <option key={item.id} value={item.id} disabled={!contracted}>
                      {item.label}
                      {!contracted ? ' (não contratado)' : ''}
                    </option>
                  )
                })}
              </select>
              <ChevronDown size={14} aria-hidden="true" />
            </span>
          </label>
          <label className={s.studioSelect}>
            <span>Página / recurso</span>
            <span className={s.studioSelectWrap}>
              <select value={resource.id} onChange={(e) => onResourceChange(e.target.value)} aria-label="Página ou recurso">
                {menu.resources.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.title}
                    {item.kind === 'FEATURE' ? ' · recurso' : ''}
                  </option>
                ))}
              </select>
              <ChevronDown size={14} aria-hidden="true" />
            </span>
          </label>
          <p className={s.studioContextLine}>
            Editando: <strong>{menu.label}</strong> → <strong>{resource.title}</strong>
            {resource.previewPath != null ? <code>{resource.previewPath}</code> : <em>sem deep-link</em>}
          </p>
        </div>
        <div className={s.studioTopActions}>
          <span className={state.dirty ? s.draftBadge : s.savedBadge}>
            {state.dirty ? 'Alterações não salvas' : 'Salvo'}
          </span>
          <div className={s.previewMode} role="group" aria-label="Modo da prévia">
            <button type="button" aria-pressed={previewMode === 'draft'} onClick={() => setPreviewMode('draft')}>
              Rascunho
            </button>
            <button type="button" aria-pressed={previewMode === 'saved'} onClick={() => setPreviewMode('saved')}>
              Salvo
            </button>
          </div>
          <OutlineButton type="button" onClick={() => setRefreshSignal((n) => n + 1)}>
            <RefreshCw size={13} /> Recarregar
          </OutlineButton>
          {openLiveUrl ? (
            <a className={s.liveOpenLink} href={openLiveUrl} target="_blank" rel="noopener noreferrer">
              Abrir ao vivo <ExternalLink size={13} />
            </a>
          ) : null}
        </div>
      </header>

      <div className={s.studioMobileTabs} role="tablist" aria-label="Studio">
        <button type="button" role="tab" aria-selected={mobilePane === 'config'} onClick={() => setMobilePane('config')}>
          Configurar
        </button>
        <button type="button" role="tab" aria-selected={mobilePane === 'preview'} onClick={() => setMobilePane('preview')}>
          Prévia
        </button>
      </div>

      <div className={s.studioBody} data-pane={mobilePane}>
        <aside className={s.studioRail} aria-label="Painel de propriedades">
          {!envContracted ? (
            <div className={s.panelNotice} role="status">
              <strong>Ambiente não contratado</strong>
              <p>Prévia bloqueada. O menu permanece para contexto; habilite o ambiente no detalhe do Whitelabel.</p>
            </div>
          ) : null}

          {resource.kind === 'FEATURE' ? (
            <div className={s.panelBanner} role="status">
              Recurso (não é uma página). Prévia representativa
              {resource.previewPath === '/oportunidades' ? ': Ofertas' : resource.previewPath?.includes('wallet') ? ': Carteira' : ''}.
            </div>
          ) : null}

          {resource.editorMode !== 'cells' || resource.cells.length === 0 ? (
            <div className={s.panelNotice}>
              <h3>Identidade global</h3>
              <p>
                {resource.notice ??
                  'Esta experiência utiliza atualmente a identidade global do Whitelabel.'}
              </p>
              <p>
                Nenhum campo artificial de entrepreneur.* ou admin.* — branding/bootstrap em Identidade visual.
              </p>
            </div>
          ) : (
            <div className={s.propSections}>
              {sections.map((section) => {
                const open = openSections[section.id] !== false
                return (
                  <details
                    key={section.id}
                    className={s.propSection}
                    open={open}
                    onToggle={(e) => {
                      const el = e.currentTarget
                      setOpenSections((prev) => ({ ...prev, [section.id]: el.open }))
                    }}
                  >
                    <summary>{section.title}</summary>
                    <div className={s.propSectionBody}>
                      <div className={s.propCellNav} role="tablist" aria-label={section.title}>
                        {section.cells.map((item) => (
                          <a
                            key={item}
                            href={hrefFor(env, resource, item)}
                            aria-current={cell === item ? 'page' : undefined}
                          >
                            {tabLabel(item)}
                          </a>
                        ))}
                      </div>
                      {cell && section.cells.includes(cell) ? (
                        <PropertyEditor
                          id={id}
                          data={data}
                          cell={cell}
                          onReload={onReload}
                          onState={onState}
                        />
                      ) : (
                        <p className={s.panelHint}>Selecione uma propriedade acima.</p>
                      )}
                    </div>
                  </details>
                )
              })}
            </div>
          )}

          {(resource.id === 'register' || resource.id === 'quick_profile') && (
            <div className={s.panelHint}>
              A aparência visual desta tela na carteira Web segue o Login.
            </div>
          )}
        </aside>

        <main className={s.studioStage} aria-label="Prévia live">
          {!envContracted ? (
            <div className={s.liveFallback} role="status">
              <strong>Prévia bloqueada</strong>
              <p>Ambiente não contratado — nenhum iframe ativo.</p>
            </div>
          ) : (
            <LiveWhitelabelPreview
              whitelabelId={data.id}
              slug={tenantSlug}
              mode={previewMode}
              revision={revision}
              refreshSignal={refreshSignal}
              context={previewContext}
              chrome="stage"
              viewport={viewport}
              onViewportChange={setViewport}
              dirty={state.dirty || previewMode === 'draft'}
            />
          )}
        </main>
      </div>

      {guard.pending && (
        <Dialog
          title={state.busy ? 'Aguarde a solicitação' : 'Descartar rascunho?'}
          description="A navegação muda o contexto de edição."
          onClose={guard.stay}
          footer={
            <>
              <OutlineButton onClick={guard.stay}>Continuar aqui</OutlineButton>
              <PrimaryButton disabled={state.busy} onClick={guard.discardAndContinue}>
                Descartar e continuar
              </PrimaryButton>
            </>
          }
        >
          <p>
            {state.busy
              ? 'A gravação já começou. Aguarde o resultado para evitar perder o estado de recuperação.'
              : 'As alterações locais não salvas serão descartadas. Nenhuma configuração salva será alterada.'}
          </p>
        </Dialog>
      )}
    </section>
  )
}

function isStudioEnv(value: string): value is StudioEnvironmentId {
  return value === 'investor' || value === 'entrepreneur' || value === 'admin'
}

function AppStudio({
  id,
  data,
  selectedCell,
  onReload,
}: {
  id: string
  data: SettingsRead
  selectedCell?: string
  onReload: () => void
}) {
  const available = appGroups
  const defaultCell = 'app_entry.content'
  const cell = selectedCell ?? defaultCell
  const group = available.find((g) => g.cells.includes(cell))
  const [state, setState] = useState<EditorState>({ dirty: false, busy: false })
  const [screen, setScreen] = useState('')
  const onState = useCallback(
    (next: EditorState) =>
      setState((current) =>
        current.dirty === next.dirty && current.busy === next.busy ? current : next,
      ),
    [],
  )
  const guard = useUnsavedChangesGuard(state.dirty || state.busy, () => setState({ dirty: false, busy: false }))
  const appScreens =
    cell === 'app_entry.content' ? APP_ENTRY_GROUPS : cell === 'app_authenticated.content' ? APP_AUTH_GROUPS : []
  const currentScreen = appScreens.find((item) => item.id === screen)?.id ?? appScreens[0]?.id
  const origin = isConfigCell(cell) ? data.configuration[cell] : undefined

  return (
    <section className={s.studio} aria-label="Editor do Platform App">
      <header className={s.heading}>
        <div>
          <span className={s.eyebrow}>Platform App</span>
          <h2>Conteúdo do aplicativo</h2>
          <p>Edite no contexto da página e compare o rascunho com a configuração salva.</p>
        </div>
        <span className={state.dirty ? s.draftBadge : s.savedBadge}>
          {state.dirty ? 'Alterações não salvas' : 'Leitura do servidor'}
        </span>
      </header>
      <div className={s.workbench}>
        <nav className={s.areaNav} aria-label="Áreas do aplicativo">
          <span>ÁREAS DO APLICATIVO</span>
          {available.map((item) => (
            <a
              key={item.id}
              href={configHref(id, 'app', item.cells[0])}
              aria-current={group?.id === item.id ? 'page' : undefined}
            >
              {item.title}
              <span aria-hidden="true">›</span>
            </a>
          ))}
          <p>O Whitelabel permanece identificado na navegação.</p>
        </nav>
        <div className={s.workspace}>
          {!group ? (
            <div role="alert" className={s.editor}>
              <h3>Configuração não disponível nesta área</h3>
              <p>Escolha uma das páginas ao lado.</p>
            </div>
          ) : (
            <>
              <div className={s.workspaceTitle}>
                <div>
                  <h3>{group.title}</h3>
                  <p>{label(cell)}</p>
                </div>
              </div>
              <nav className={s.contextTabs} aria-label={`Configurações de ${group.title}`}>
                {group.cells.map((item) => (
                  <a
                    key={item}
                    href={configHref(id, 'app', item)}
                    aria-current={cell === item ? 'page' : undefined}
                  >
                    {tabLabel(item)}
                  </a>
                ))}
              </nav>
              {appScreens.length > 0 && (
                <label className={`${s.field} ${s.screenSelector}`}>
                  Tela do aplicativo
                  <select value={currentScreen} onChange={(e) => setScreen(e.target.value)}>
                    {appScreens.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                  <small>A alteração de tela mantém o rascunho da mesma configuração.</small>
                </label>
              )}
              {isSettingsField(cell) ? (
                data.provenance[cell] ? (
                  <ScalarConfigurationEditor
                    key={cell}
                    id={id}
                    data={data}
                    field={cell}
                    onReload={onReload}
                    onState={onState}
                  />
                ) : (
                  <p className={s.editor}>Proveniência não fornecida. Não é seguro editar este valor.</p>
                )
              ) : isConfigCell(cell) && origin ? (
                <CompositeConfigurationEditor
                  key={cell}
                  id={id}
                  data={data}
                  cell={cell}
                  screen={currentScreen}
                  onReload={onReload}
                  onState={onState}
                />
              ) : (
                <p className={s.editor}>
                  O servidor não retornou proveniência para esta configuração. Nenhum valor será inventado.
                </p>
              )}
            </>
          )}
        </div>
      </div>
      {guard.pending && (
        <Dialog
          title={state.busy ? 'Aguarde a solicitação' : 'Descartar rascunho?'}
          description="A navegação muda o contexto de edição."
          onClose={guard.stay}
          footer={
            <>
              <OutlineButton onClick={guard.stay}>Continuar aqui</OutlineButton>
              <PrimaryButton disabled={state.busy} onClick={guard.discardAndContinue}>
                Descartar e continuar
              </PrimaryButton>
            </>
          }
        >
          <p>
            {state.busy
              ? 'A gravação já começou. Aguarde o resultado para evitar perder o estado de recuperação.'
              : 'As alterações locais não salvas serão descartadas. Nenhuma configuração salva será alterada.'}
          </p>
        </Dialog>
      )}
    </section>
  )
}

export function ConfigurationStudio({
  id,
  data,
  area,
  selectedCell,
  selectedEnv,
  selectedResource,
  onReload,
}: {
  id: string
  data: SettingsRead
  area: ConfigArea
  selectedCell?: string
  selectedEnv?: string
  selectedResource?: string
  onReload: () => void
}) {
  if (area === 'app') {
    return <AppStudio id={id} data={data} selectedCell={selectedCell} onReload={onReload} />
  }
  return (
    <PlatformStudio
      id={id}
      data={data}
      selectedEnv={selectedEnv}
      selectedResource={selectedResource}
      selectedCell={selectedCell}
      onReload={onReload}
    />
  )
}
