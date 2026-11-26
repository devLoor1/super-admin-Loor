import { useCallback, useEffect, useState } from 'react'
import { Dialog } from '../../components/ui/Dialog'
import { OutlineButton } from '../../components/ui/OutlineButton'
import { PrimaryButton } from '../../components/ui/PrimaryButton'
import { useUnsavedChangesGuard } from '../../app/useUnsavedChangesGuard'
import { CONFIG_DEFINITIONS, isConfigCell, type ConfigCell, type ConfigOrigin } from './configurationContract'
import { CompositeConfigurationEditor, ScalarConfigurationEditor, type EditorState } from './ConfigurationEditor'
import { PlatformAssetEditor } from './PlatformAssetEditor'
import { ConfigurationPreview } from './ConfigurationPreview'
import { LiveWhitelabelPreview, type LivePreviewContext } from './LiveWhitelabelPreview'
import { isSettingsField, settingsFieldLabel } from './settingsWriteContract'
import { APP_AUTH_GROUPS, APP_ENTRY_GROUPS } from './appContentRead'
import { configHref, type ConfigArea } from './configRoute'
import { resolveLivePreviewTargets, type LivePreviewTarget } from './livePreviewContract'
import { getWhitelabelProvisioning } from '../whitelabel-provisioning/provisioningApi'
import {
  getStudioMenu,
  resolveStudioSelection,
  STUDIO_ENVIRONMENT_MENUS,
  type StudioEnvironmentId,
  type StudioResource,
} from './studioExperienceCatalog'
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

function kindBadge(kind: StudioResource['kind']) {
  if (kind === 'PAGE') return 'Página'
  if (kind === 'FEATURE') return 'Recurso'
  return 'Global'
}

function AssetPane({
  id,
  data,
  cell,
  origin,
  onReload,
  onState,
  dirty,
  previewContext,
}: {
  id: string
  data: SettingsRead
  cell: ConfigCell
  origin: ConfigOrigin
  onReload: () => void
  onState: (state: EditorState) => void
  dirty: boolean
  previewContext?: LivePreviewContext
}) {
  const [narrow, setNarrow] = useState<'edit' | 'preview'>('edit')
  const [imageDraft, setImageDraft] = useState<string | null | undefined>(undefined)
  const [previewSaved, setPreviewSaved] = useState(true)
  return (
    <>
      <div className={s.mobileSwitch}>
        <button aria-pressed={narrow === 'edit'} onClick={() => setNarrow('edit')}>
          Editor
        </button>
        <button aria-pressed={narrow === 'preview'} onClick={() => setNarrow('preview')}>
          Prévia
        </button>
      </div>
      <div className={s.split}>
        <div className={s.editor} data-active={narrow === 'edit'}>
          <PlatformAssetEditor
            id={id}
            cell={cell}
            baseline={origin}
            onReload={onReload}
            onState={onState}
            onPreview={setImageDraft}
          />
        </div>
        <div className={s.preview} data-active={narrow === 'preview'}>
          <div className={s.previewMode}>
            <button aria-pressed={!previewSaved} onClick={() => setPreviewSaved(false)}>
              Rascunho
            </button>
            <button aria-pressed={previewSaved} onClick={() => setPreviewSaved(true)}>
              Salvo
            </button>
          </div>
          <ConfigurationPreview
            data={data}
            cell={cell}
            saved={previewSaved}
            imageDraft={dirty ? imageDraft : undefined}
            draftPending={dirty}
            previewContext={previewContext}
          />
        </div>
      </div>
    </>
  )
}

function GlobalBrandingPane({
  data,
  resource,
  previewContext,
}: {
  data: SettingsRead
  resource: StudioResource
  previewContext: LivePreviewContext
}) {
  const [previewSaved, setPreviewSaved] = useState(true)
  const tenantSlug =
    typeof data.slug === 'object' && data.slug.state === 'value' && typeof data.slug.value === 'string'
      ? data.slug.value
      : null
  return (
    <div className={s.split}>
      <div className={s.editor} data-active="true">
        <div className={s.sectionLead}>
          <h4>Configurações globais do Whitelabel</h4>
          <p>
            {resource.notice ??
              'Esta página utiliza atualmente as configurações globais do Whitelabel (branding/bootstrap). Não há editor específico nesta etapa.'}
          </p>
        </div>
        <div className={s.systemNotice}>
          <p>
            <strong>Sem contrato local.</strong> Nenhum campo artificial de entrepreneur.* ou admin.* foi criado.
            Alterações de marca continuam em Identidade visual / bootstrap do tenant.
          </p>
        </div>
      </div>
      <div className={s.preview} data-active="true">
        <div className={s.previewMode}>
          <button aria-pressed={!previewSaved} onClick={() => setPreviewSaved(false)}>
            Rascunho
          </button>
          <button aria-pressed={previewSaved} onClick={() => setPreviewSaved(true)}>
            Salvo
          </button>
        </div>
        <div className={s.previewHead}>
          <div>
            <strong>Prévia ao vivo</strong>
            <p>{previewSaved ? 'Salvo · frontend compartilhado' : 'Rascunho · mesmo frontend real'}</p>
          </div>
        </div>
        <LiveWhitelabelPreview
          whitelabelId={data.id}
          slug={tenantSlug}
          mode={previewSaved ? 'saved' : 'draft'}
          revision={`${data.id}:${resource.id}:${previewContext.pagePath ?? 'limited'}`}
          context={previewContext}
        />
      </div>
    </div>
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

  const tenantSlug =
    typeof data.slug === 'object' && data.slug.state === 'value' && typeof data.slug.value === 'string'
      ? data.slug.value
      : null

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
  const origin = cell && isConfigCell(cell) ? data.configuration[cell] : undefined

  const hrefFor = (nextEnv: StudioEnvironmentId, nextResource: StudioResource, nextCell?: string) =>
    configHref(id, 'platform', nextCell ?? nextResource.cells[0], {
      env: nextEnv,
      resource: nextResource.id,
    })

  return (
    <section className={s.studio} aria-label="Studio Whitelabel">
      <header className={s.heading}>
        <div>
          <span className={s.eyebrow}>Studio Whitelabel</span>
          <h2>
            {menu.label} › {resource.title}
          </h2>
          <p>
            Ambiente → Página/Recurso → Editor → Preview. Menus distintos por frontend; a prévia usa a URL de delivery
            + rota real.
          </p>
        </div>
        <span className={state.dirty ? s.draftBadge : s.savedBadge}>
          {state.dirty ? 'Alterações não salvas' : 'Leitura do servidor'}
        </span>
      </header>

      <div className={s.envBar} role="tablist" aria-label="Ambiente">
        {STUDIO_ENVIRONMENT_MENUS.map((item) => {
          const target = targets.find((t) => t.environment === item.id)
          const contracted = target?.contracted !== false
          const disabled = !contracted
          if (disabled) {
            return (
              <span
                key={item.id}
                role="tab"
                aria-selected={env === item.id}
                aria-disabled="true"
                className={s.envTabDisabled}
                title="Ambiente não contratado"
              >
                {item.label}
                <span className={s.liveEnvHint}>não contratado</span>
              </span>
            )
          }
          return (
            <a
              key={item.id}
              role="tab"
              aria-selected={env === item.id}
              href={hrefFor(item.id, getStudioMenu(item.id).resources[0])}
              title={item.label}
            >
              {item.label}
            </a>
          )
        })}
      </div>

      {!envContracted ? (
        <div className={s.liveFallback} role="status" style={{ margin: '16px 24px' }}>
          <strong>Ambiente não contratado</strong>
          <p>
            Prévia ativa deste frontend não está disponível. Habilite o ambiente no detalhe do Whitelabel. O menu
            permanece visível apenas para contexto — sem iframe como se estivesse disponível.
          </p>
        </div>
      ) : null}

      <div className={s.workbench}>
        <nav className={s.areaNav} aria-label={`Páginas e recursos · ${menu.label}`}>
          <span>{menu.label.toUpperCase()}</span>
          {menu.resources.map((item) => (
            <a
              key={item.id}
              href={hrefFor(env, item)}
              aria-current={resource.id === item.id ? 'page' : undefined}
            >
              <span>
                {item.title}
                <small className={s.kindHint}>{kindBadge(item.kind)}</small>
              </span>
              <span aria-hidden="true">›</span>
            </a>
          ))}
          <p>
            Contexto: {menu.label} › {resource.title}
            {resource.authenticatedPreviewPath
              ? ` · Auth: ${resource.authenticatedPreviewPath}`
              : ''}
          </p>
        </nav>

        <div className={s.workspace}>
          <div className={s.workspaceTitle}>
            <div>
              <h3>{resource.title}</h3>
              <p>
                {kindBadge(resource.kind)}
                {resource.previewPath != null ? ` · ${resource.previewPath}` : ' · sem deep-link'}
                {cell ? ` · ${label(cell)}` : ''}
              </p>
            </div>
          </div>

          {resource.cells.length > 0 && cell ? (
            <nav className={s.contextTabs} aria-label={`Configurações de ${resource.title}`}>
              {resource.cells.map((item) => (
                <a
                  key={item}
                  href={hrefFor(env, resource, item)}
                  aria-current={cell === item ? 'page' : undefined}
                >
                  {tabLabel(item)}
                </a>
              ))}
            </nav>
          ) : null}

          {(resource.id === 'register' || resource.id === 'quick_profile') && cell ? (
            <div className={s.inherited}>
              <p>
                A aparência desta tela na carteira Web segue o Login.
                {historicalCells.has(cell) &&
                  ' O editor abaixo conserva a configuração legada. A prévia da carteira usa os valores do Login.'}
              </p>
              <a href={hrefFor(env, getStudioResourceLogin(), 'login.entry_presentation')}>
                Abrir aparência do Login
              </a>
            </div>
          ) : null}

          {(cell === 'login.layout_preset' || cell === 'login.brand_panel_text_color') && (
            <div className={s.inherited}>
              <p>
                Valor de compatibilidade usado quando a apresentação completa do Login estiver ausente ou
                incompatível.
              </p>
              <a href={hrefFor(env, getStudioResourceLogin(), 'login.entry_presentation')}>
                Consultar apresentação do Login
              </a>
            </div>
          )}

          {resource.notice && resource.kind !== 'PAGE' ? (
            <div className={s.inherited}>
              <p>{resource.notice}</p>
            </div>
          ) : null}

          {!envContracted ? (
            <div className={s.editor}>
              <h3>Prévia bloqueada</h3>
              <p>Ambiente não contratado — editor de settings permanece acessível quando houver células, sem iframe ativo.</p>
            </div>
          ) : resource.editorMode !== 'cells' || !cell ? (
            <GlobalBrandingPane data={data} resource={resource} previewContext={previewContext} />
          ) : cell === 'quick_profile.appearance' ? (
            <div className={s.inheritedPreview}>
              <ConfigurationPreview data={data} cell={cell} saved previewContext={previewContext} />
            </div>
          ) : isSettingsField(cell) ? (
            data.provenance[cell] ? (
              <ScalarConfigurationEditor
                key={`${env}:${resource.id}:${cell}`}
                id={id}
                data={data}
                field={cell}
                onReload={onReload}
                onState={onState}
                previewContext={previewContext}
              />
            ) : (
              <p className={s.editor}>Proveniência não fornecida. Não é seguro editar este valor.</p>
            )
          ) : isConfigCell(cell) && origin ? (
            cell.endsWith('.main_area_image') ? (
              <AssetPane
                key={`${env}:${resource.id}:${cell}`}
                id={id}
                data={data}
                cell={cell}
                origin={origin}
                onReload={onReload}
                onState={onState}
                dirty={state.dirty}
                previewContext={previewContext}
              />
            ) : (
              <CompositeConfigurationEditor
                key={`${env}:${resource.id}:${cell}`}
                id={id}
                data={data}
                cell={cell}
                onReload={onReload}
                onState={onState}
                previewContext={previewContext}
              />
            )
          ) : (
            <p className={s.editor}>
              O servidor não retornou proveniência para esta configuração. Nenhum valor será inventado.
            </p>
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

function getStudioResourceLogin(): StudioResource {
  return getStudioMenu('investor').resources.find((r) => r.id === 'login')!
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
