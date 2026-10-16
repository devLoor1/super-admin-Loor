import { useMemo, useRef, useState, type ReactNode } from 'react'
import { CircleAlert, Clock3, DatabaseZap, Eye, Globe2, Info, RotateCcw, RotateCw, ServerOff, ShieldOff } from 'lucide-react'
import { useUnsavedChangesGuard } from '../../app/useUnsavedChangesGuard'
import { AppShell } from '../../components/shell/AppShell'
import { EmptyState } from '../../components/ui/EmptyState'
import { OutlineButton } from '../../components/ui/OutlineButton'
import { PrimaryButton } from '../../components/ui/PrimaryButton'
import fin from '../finance-gateways/sections/FinanceSections.module.css'
import { InfoNote, PageIntro } from '../operation/shared/OperationUi'
import shared from '../operation/shared/Operation.module.css'
import states from '../operation/shared/ReadStates.module.css'
import { DotMatrixBackground } from '../whitelabels/visuals/DotMatrixBackground'
import { menuEntry, type MenuId } from './menuRegistry'
import type { MenuVisibilityRead } from './menuVisibilityApi'
import { describeVisibilityError, formatPersistedAt, formatReadAt, MENU_VISIBILITY_CONTRACT } from './menuVisibilityContract'
import { parseVisibilityRoute } from './menuVisibilityRoute'
import { useMenuVisibilityConfig } from './useVisibilitySource'
import { VisibilityControls } from './VisibilityControls'
import { DiscardVisibilityDialog, VisibilityReviewDialog } from './VisibilityDialogs'
import { countEffectivelyHidden, preferenceChanges, setPreference } from './visibilityModel'
import { VisibilityPreview as Preview } from './VisibilityPreview'
import styles from './MenuVisibility.module.css'

/**
 * `#/settings/menu-visibility` — Configurações › Visibilidade dos módulos.
 *
 * MENU VISIBILITY INTEGRATION V1 — STAGE A.
 * AUTHORITATIVE CONFIGURATION READ: INTEGRATED. GLOBAL CONFIGURATION UPDATE:
 * NOT ENABLED. REAL NAVIGATION ENFORCEMENT: NOT ENABLED.
 *
 * The persisted configuration comes from `GET /api/homolog/menu-visibility`
 * (canonical authenticated client) and becomes the reference; the operator
 * edits an independent draft that lives only in this component's state (no
 * PUT, no browser storage, no context or singleton). The real sidebar,
 * shortcuts, routes and post-login landing keep reading `navigation.ts` and
 * ignore visibility. Visibility is presentation governance, not authorization.
 */
export function MenuVisibilityPage({ previa }: { previa?: string }) {
  const { ignored } = useMemo(() => parseVisibilityRoute({ previa }), [previa])
  const source = useMenuVisibilityConfig()

  return (
    <SettingsShell>
      <PageIntro text="Defina quais módulos existentes aparecem na navegação do Super Admin. Mostrar ou ocultar não cria, remove, renomeia nem reordena itens do menu." />
      <div className={styles.notices}>
        <p className={styles.scope} data-visibility-scope>
          <span className={styles.scopeChip}>
            <Globe2 size={14} strokeWidth={1.9} aria-hidden="true" />
            Escopo global
          </span>
          Vale para todo o ambiente de homologação — não por Whitelabel, operador, perfil, sessão ou dispositivo.
        </p>
        <p className={styles.stage} data-visibility-stage={MENU_VISIBILITY_CONTRACT.stage}>
          <DatabaseZap size={15} strokeWidth={1.8} aria-hidden="true" />
          <span>
            <strong>Leitura integrada ao Control Plane — salvar e aplicar ainda não estão habilitados.</strong> As alterações ficam somente
            nesta tela, em memória, e são descartadas ao recarregar. O menu lateral real do Super Admin não é alterado.
          </span>
        </p>
        <dl className={styles.legend} aria-label="Origem das informações nesta tela" data-visibility-legend>
          <div className={styles.legendItem} data-source="persisted">
            <dt>Configuração persistida</dt>
            <dd>Valores lidos do Control Plane.</dd>
          </div>
          <div className={styles.legendItem} data-source="draft">
            <dt>Rascunho</dt>
            <dd>Alterações locais, não salvas.</dd>
          </div>
          <div className={styles.legendItem} data-source="preview">
            <dt>Prévia</dt>
            <dd>Visibilidade efetiva calculada a partir do rascunho.</dd>
          </div>
          <div className={styles.legendItem} data-source="enforcement">
            <dt>Aplicação real</dt>
            <dd>Pendente: menu lateral, atalhos e rotas ainda não usam esta configuração.</dd>
          </div>
        </dl>
        {ignored.length ? (
          <p className={states.ignoredNote} role="status" data-ignored-params>
            <Info size={14} strokeWidth={1.9} aria-hidden="true" />
            Parâmetro da URL não reconhecido e ignorado: {ignored.join(', ')}.
          </p>
        ) : null}
      </div>

      {source.state.status === 'success' ? (
        <VisibilityEditor reference={source.state.data} />
      ) : source.state.status === 'error' ? (
        <LoadError error={source.state.error} onRetry={source.reload} />
      ) : (
        <section className={`${fin.card} ${states.feedback}`} aria-busy="true" data-visibility-state="loading">
          <div className={states.heroSkeleton} aria-hidden="true">
            <span className={states.skeleton} />
            <span className={states.skeleton} />
            <span className={states.skeleton} />
          </div>
          <p className="visually-hidden" role="status">
            Carregando a configuração de visibilidade do Control Plane…
          </p>
        </section>
      )}
    </SettingsShell>
  )
}

/** Configurações page frame: existing `configuracoes` utility entry active, no new menu ID. */
function SettingsShell({ children }: { children: ReactNode }) {
  return (
    <AppShell
      activeNav="configuracoes"
      title="Visibilidade dos módulos"
      location="Configurações"
      breadcrumbs={[{ label: 'Configurações' }, { label: 'Visibilidade dos módulos' }]}
    >
      <div className={shared.page}>
        <DotMatrixBackground />
        <div className={shared.layout}>{children}</div>
      </div>
    </AppShell>
  )
}

function LoadError({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  const view = describeVisibilityError(error, 'load')
  const icon = view.kind === 'forbidden' ? ShieldOff : view.kind === 'unsupported' ? ServerOff : CircleAlert
  return (
    <section className={`${fin.card} ${states.feedback}`} role="alert" data-visibility-state={view.kind === 'forbidden' ? 'forbidden' : 'error'} data-error-kind={view.kind}>
      <EmptyState icon={icon} title={view.title} description={view.description} />
      {view.correlationId ? (
        <p className={states.diagnostic}>
          Código de diagnóstico: <code className={states.code}>{view.correlationId}</code>
        </p>
      ) : null}
      {view.retryable ? (
        <OutlineButton onClick={onRetry} data-retry>
          <RotateCw size={14} strokeWidth={1.8} aria-hidden="true" />
          Tentar novamente
        </OutlineButton>
      ) : null}
    </section>
  )
}

function VisibilityEditor({ reference: loaded }: { reference: MenuVisibilityRead }) {
  // The authoritative reference is captured once per mount: no later answer can replace it under a draft.
  const [reference] = useState(loaded)
  const base = reference.map
  // The draft is an independent map: edits never touch the reference (both maps are frozen).
  const [draft, setDraft] = useState(base)
  const [reviewing, setReviewing] = useState(false)
  const [confirmDiscard, setConfirmDiscard] = useState(false)
  const [announcement, setAnnouncement] = useState('')
  const panelTitleRef = useRef<HTMLHeadingElement>(null)

  const changes = useMemo(() => preferenceChanges(base, draft), [base, draft])
  const hiddenCount = useMemo(() => countEffectivelyHidden(draft), [draft])
  const persistedHidden = useMemo(() => countEffectivelyHidden(base), [base])
  const dirty = changes.length > 0
  const guard = useUnsavedChangesGuard(dirty, () => setDraft(base))

  function change(id: MenuId, visible: boolean) {
    setDraft((current) => setPreference(current, id, visible))
    const entry = menuEntry(id)
    const affected = entry.children.filter((child) => draft[child.id]).length
    setAnnouncement(
      entry.children.length && affected
        ? visible
          ? `${affected === 1 ? '1 tela de' : `${affected} telas de`} ${entry.label} voltam a aparecer na prévia.`
          : `${affected === 1 ? '1 tela de' : `${affected} telas de`} ${entry.label} ficam ocultas na prévia; as preferências das telas são mantidas.`
        : '',
    )
  }

  function discard() {
    setConfirmDiscard(false)
    setDraft(base)
    setAnnouncement('Alterações não salvas descartadas: o rascunho voltou à configuração persistida.')
  }

  return (
    <>
      <div className={styles.workspaceWrap}>
        <div className={styles.workspace}>
          <VisibilityControls base={base} draft={draft} onChange={change} />

          <div className={styles.side}>
            <section className={fin.card} aria-labelledby="mv-persisted-title" data-visibility-persisted data-saved={reference.saved}>
              <h2 id="mv-persisted-title" className={`${fin.cardTitleSm} ${styles.panelTitle}`}>
                Configuração persistida
              </h2>
              <p className={fin.cardSubtitle}>Lida do Control Plane. É o ponto de partida do rascunho.</p>
              <dl className={styles.facts}>
                <div className={styles.fact}>
                  <dt>Situação</dt>
                  <dd data-persisted-status>
                    {reference.saved ? 'Salva no Control Plane' : 'Nunca salva — valores padrão informados pelo Control Plane'}
                  </dd>
                </div>
                <div className={styles.fact}>
                  <dt>Última atualização</dt>
                  <dd className={reference.updatedAt ? undefined : styles.pendingValue} data-updated-at>
                    {reference.updatedAt ? (
                      <time dateTime={reference.updatedAt}>{formatPersistedAt(reference.updatedAt)} (Brasília)</time>
                    ) : (
                      'Nunca salva'
                    )}
                  </dd>
                </div>
                <div className={styles.fact}>
                  <dt>Atualizado por</dt>
                  <dd className={reference.updatedBy ? undefined : styles.pendingValue} data-updated-by>
                    {reference.updatedBy ? (
                      <>
                        <code className={styles.operatorId}>{reference.updatedBy}</code>
                        <span className={styles.factHint}>ID do operador no Control Plane</span>
                      </>
                    ) : reference.saved ? (
                      'Não informado pelo Control Plane'
                    ) : (
                      '—'
                    )}
                  </dd>
                </div>
                <div className={styles.fact}>
                  <dt>Ocultos na configuração</dt>
                  <dd data-persisted-hidden={persistedHidden}>
                    {persistedHidden === 0 ? 'Nenhum módulo' : `${persistedHidden} ${persistedHidden === 1 ? 'módulo' : 'módulos'}`}
                  </dd>
                </div>
                <div className={styles.fact}>
                  <dt>Lida em</dt>
                  <dd data-read-at>
                    <time dateTime={reference.readAt}>{formatReadAt(reference.readAt)} (Brasília)</time>
                  </dd>
                </div>
              </dl>
              {persistedHidden > 0 ? (
                <p className={styles.panelNote} data-tone="warning" data-persisted-not-applied>
                  <Info size={14} strokeWidth={1.9} aria-hidden="true" />
                  <span>
                    A configuração persistida oculta {persistedHidden} {persistedHidden === 1 ? 'módulo' : 'módulos'}, mas o menu lateral real ainda
                    não aplica esta configuração.
                  </span>
                </p>
              ) : null}
              {reference.unknownIds.length ? (
                <p className={styles.panelNote} data-tone="warning" data-unknown-ids={reference.unknownIds.length}>
                  <CircleAlert size={14} strokeWidth={1.9} aria-hidden="true" />
                  <span>
                    O Control Plane também retornou {reference.unknownIds.length === 1 ? '1 ID' : `${reference.unknownIds.length} IDs`} fora do registro
                    aprovado ({reference.unknownIds.join(', ')}): {reference.unknownIds.length === 1 ? 'ignorado e não exibido' : 'ignorados e não exibidos'}.
                    Divergência de contrato a corrigir.
                  </span>
                </p>
              ) : null}
            </section>

            <section className={fin.card} aria-labelledby="mv-draft-title" data-visibility-draft>
              <h2 id="mv-draft-title" ref={panelTitleRef} tabIndex={-1} className={`${fin.cardTitleSm} ${styles.panelTitle}`}>
                Rascunho
              </h2>
              <p className={fin.cardSubtitle}>Alterações locais, em memória, comparadas à configuração persistida.</p>
              <dl className={styles.facts}>
                <div className={styles.fact}>
                  <dt>Alterações</dt>
                  <dd data-draft-count={changes.length}>
                    {dirty ? `${changes.length} ${changes.length === 1 ? 'preferência alterada' : 'preferências alteradas'}` : 'Nenhuma alteração'}
                  </dd>
                </div>
                <div className={styles.fact}>
                  <dt>Ocultos na prévia</dt>
                  <dd>{hiddenCount === 0 ? 'Nenhum módulo' : `${hiddenCount} ${hiddenCount === 1 ? 'módulo' : 'módulos'}`}</dd>
                </div>
              </dl>
              <p className={styles.pending} data-persistence-pending>
                <Clock3 size={15} strokeWidth={1.8} aria-hidden="true" />
                <span>
                  <strong>Salvar e aplicar ainda não estão habilitados</strong>
                  Leitura integrada. Aplicação e persistência aguardam validação das regras e autorização. Nada é enviado.
                </span>
              </p>
            </section>

            <Preview draft={draft} />
          </div>
        </div>
      </div>

      <InfoNote>
        <strong>Visibilidade não é permissão.</strong> Ocultar um módulo apenas o retira da navegação: não altera papéis, permissões ou
        autorização de rotas, e o Backend continua aplicando suas próprias verificações de acesso. Nesta etapa, nem a configuração persistida
        nem o rascunho são aplicados ao menu lateral, aos atalhos ou às rotas diretas; quando isso for habilitado, todos deverão usar a mesma
        regra de visibilidade.
      </InfoNote>

      <p className="visually-hidden" aria-live="polite" data-visibility-announcement>
        {announcement}
      </p>

      {dirty ? (
        <section className={styles.bar} aria-label="Ações do rascunho" data-draft-bar>
          <p className={styles.barText}>
            <strong>
              {changes.length} {changes.length === 1 ? 'alteração' : 'alterações'}
            </strong>{' '}
            no rascunho
            <span className={styles.barDetail}>
              {' '}
              · {hiddenCount} {hiddenCount === 1 ? 'módulo oculto' : 'módulos ocultos'} na prévia
            </span>{' '}
            · não salvo
          </p>
          <div className={styles.barActions}>
            <OutlineButton className={styles.barButton} onClick={() => setConfirmDiscard(true)} data-discard>
              <RotateCcw size={14} strokeWidth={1.8} aria-hidden="true" />
              Descartar alterações não salvas
            </OutlineButton>
            <PrimaryButton className={styles.barButton} onClick={() => setReviewing(true)} data-review>
              <Eye size={15} strokeWidth={1.8} aria-hidden="true" />
              Revisar alterações
            </PrimaryButton>
          </div>
        </section>
      ) : null}

      {reviewing ? <VisibilityReviewDialog base={base} draft={draft} onClose={() => setReviewing(false)} /> : null}
      {confirmDiscard ? (
        <DiscardVisibilityDialog
          base={base}
          draft={draft}
          destination="descartar as alterações não salvas"
          onStay={() => setConfirmDiscard(false)}
          onDiscard={discard}
          fallbackFocus={() => panelTitleRef.current}
        />
      ) : null}
      {guard.pending ? (
        <DiscardVisibilityDialog
          base={base}
          draft={draft}
          destination={guard.pending.destination}
          onStay={guard.stay}
          onDiscard={guard.discardAndContinue}
        />
      ) : null}
    </>
  )
}
