import { useMemo, useRef, useState, type ReactNode } from 'react'
import { CircleAlert, Clock3, DatabaseZap, Eye, Globe2, Info, Lock, RotateCcw, RotateCw, ServerOff, ShieldCheck, ShieldOff, Wrench } from 'lucide-react'
import { useUnsavedChangesGuard } from '../../app/useUnsavedChangesGuard'
import { AppShell } from '../../components/shell/AppShell'
import { EmptyState } from '../../components/ui/EmptyState'
import { OutlineButton } from '../../components/ui/OutlineButton'
import { PrimaryButton } from '../../components/ui/PrimaryButton'
import { useSessionOperator } from '../../lib/authSession'
import { MENU_VISIBILITY_WRITES_ENABLED } from '../../lib/menuVisibilityWriteClient'
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
import { useVisibilitySave, useVisibilitySessionKey } from './useVisibilitySave'
import { VisibilitySaveFeedback } from './VisibilitySaveFeedback'
import { VisibilityControls } from './VisibilityControls'
import { DiscardVisibilityDialog, VisibilityReviewDialog } from './VisibilityDialogs'
import { preferenceChanges } from './visibilityModel'
import { expectedAccess, policyViolations, presentationMode, PROTECTED_EXPLANATION, restoreProtectedInDraft, setDraftPreference } from './visibilityPolicy'
import { VisibilityPreview as Preview } from './VisibilityPreview'
import { countSidebarHidden } from './visibilityResolver'
import styles from './MenuVisibility.module.css'

/**
 * `#/settings/menu-visibility` — Configurações › Visibilidade dos módulos.
 *
 * MENU VISIBILITY — version-aware read + guarded Stage B transport (default OFF).
 * REAL SIDEBAR ENFORCEMENT: NOT ENABLED.
 *
 * The persisted configuration comes from `GET /api/homolog/menu-visibility`
 * (canonical authenticated client) and becomes the reference. A SUPER_ADMIN
 * edits an independent draft that lives only in this component's state; the
 * approved Product rules (visibilityPolicy.ts) lock Dashboard and
 * Configurações, and the isolated preview uses the pure resolver
 * (visibilityResolver.ts). SUPPORT_ADMIN / READ_ONLY see the configuration
 * read-only; FINANCIAL_ADMIN / COMPLIANCE_ADMIN get the Backend's 403. Writes use
 * an identity-bound in-memory attempt ledger, never browser storage. The real sidebar, shortcuts,
 * routes and post-login landing keep reading `navigation.ts` and ignore
 * visibility. Visibility is sidebar presentation, not authorization.
 */
export function MenuVisibilityPage({ previa }: { previa?: string }) {
  const { ignored } = useMemo(() => parseVisibilityRoute({ previa }), [previa])
  const sessionKey = useVisibilitySessionKey()
  const source = useMenuVisibilityConfig(sessionKey)
  // Canonical session operator (login / `GET /auth/me`): presentation only — the Backend stays the authority.
  const operator = useSessionOperator()
  const access = expectedAccess(operator?.roles)
  const mode = presentationMode(operator?.roles)

  return (
    <SettingsShell>
      <PageIntro text="Defina quais módulos existentes aparecem no menu lateral do Super Admin. Mostrar ou ocultar não cria, remove, renomeia nem reordena itens do menu." />
      <div className={styles.notices}>
        <p className={styles.scope} data-visibility-scope>
          <span className={styles.scopeChip}>
            <Globe2 size={14} strokeWidth={1.9} aria-hidden="true" />
            Escopo global
          </span>
          Vale para todo o ambiente de homologação — não por Whitelabel, operador, perfil, sessão ou dispositivo.
        </p>
        <p className={styles.stage} data-visibility-stage={MENU_VISIBILITY_CONTRACT.stage} data-stage-b="prepared">
          <DatabaseZap size={15} strokeWidth={1.8} aria-hidden="true" />
          <span>
            <strong>Leitura integrada ao Control Plane; regras de Produto da Etapa B aplicadas nesta tela.</strong>{' '}
            {MENU_VISIBILITY_WRITES_ENABLED ? 'Gravação global habilitada neste build; exige revisão e leitura de confirmação. ' : 'Salvar está desativado neste build: o rascunho fica em memória. '}
            A aplicação ao menu lateral real não está habilitada.
          </span>
        </p>
        <p className={styles.access} data-access-mode={mode} data-expected-access={access}>
          {access === 'edit' ? (
            <ShieldCheck size={15} strokeWidth={1.8} aria-hidden="true" />
          ) : access === 'read' ? (
            <Eye size={15} strokeWidth={1.8} aria-hidden="true" />
          ) : (
            <ShieldOff size={15} strokeWidth={1.8} aria-hidden="true" />
          )}
          <span>
            {access === 'edit' ? (
              <>
                <strong>Perfil com edição (SUPER_ADMIN).</strong> Você pode preparar um rascunho;{MENU_VISIBILITY_WRITES_ENABLED ? ' salvar exige revisão explícita.' : ' salvar continua indisponível até autorização e ativação da Etapa B.'}
              </>
            ) : access === 'read' ? (
              <>
                <strong>Somente leitura.</strong> Seu perfil pode consultar a configuração, mas apenas SUPER_ADMIN prepara alterações.
              </>
            ) : (
              <>
                <strong>Sem acesso previsto para o seu perfil.</strong> Pela regra aprovada, apenas SUPER_ADMIN, SUPPORT_ADMIN e READ_ONLY consultam a
                visibilidade dos módulos. O Control Plane decide: se permitir a leitura, ela aparece somente para consulta.
              </>
            )}
          </span>
        </p>
        <dl className={styles.legend} aria-label="Origem das informações nesta tela" data-visibility-legend>
          <div className={styles.legendItem} data-source="persisted">
            <dt>Configuração persistida</dt>
            <dd>Valores lidos do Control Plane.</dd>
          </div>
          <div className={styles.legendItem} data-source="draft">
            <dt>Rascunho</dt>
            <dd>{mode === 'edit' ? 'Alterações locais, não salvas.' : 'Indisponível no seu perfil (somente leitura).'}</dd>
          </div>
          <div className={styles.legendItem} data-source="preview">
            <dt>Prévia</dt>
            <dd>Menu lateral resultante, calculado pelas regras aprovadas.</dd>
          </div>
          <div className={styles.legendItem} data-source="enforcement">
            <dt>Aplicação real</dt>
            <dd>Pendente. Quando habilitada, afetará só o menu lateral: rotas diretas, atalhos e links internos continuam.</dd>
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
        <VisibilityEditor key={`${sessionKey}:${mode}`} reference={source.state.data} mode={mode} />
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

function VisibilityEditor({ reference: loaded, mode }: { reference: MenuVisibilityRead; mode: 'edit' | 'read' }) {
  // Identity/role/session changes remount: no draft or dialog can migrate to another operator.
  // The authoritative reference is captured once per mount: no later answer can replace it under a draft.
  const { coordinator, state: save } = useVisibilitySave()
  const [localReference, setReference] = useState(() => save.reference ?? loaded)
  const reference = save.decision === 'applied' && save.readback ? save.readback : localReference
  const base = reference.map
  // The draft is an independent map: edits never touch the reference (both maps are frozen).
  const [draft, setDraft] = useState(() => save.candidate?.body.visibility ?? base)
  const [reviewing, setReviewing] = useState(false)
  const [confirmDiscard, setConfirmDiscard] = useState(false)
  const [announcement, setAnnouncement] = useState('')
  const panelTitleRef = useRef<HTMLHeadingElement>(null)
  const readOnly = mode === 'read'
  const blocked = save.phase !== 'idle'
  const pending = save.phase === 'saving' || save.phase === 'reading'
  // Read-only operators never hold a draft: whatever they see is the persisted reference.
  const shown = readOnly || save.decision === 'applied' ? base : draft

  const changes = useMemo(() => preferenceChanges(base, shown), [base, shown])
  const hiddenCount = useMemo(() => countSidebarHidden(shown), [shown])
  const persistedHidden = useMemo(() => countSidebarHidden(base), [base])
  // Rules 1 / 2 broken by the SERVER value: reported, never silently rewritten.
  const serverViolations = useMemo(() => policyViolations(base), [base])
  const draftViolations = useMemo(() => policyViolations(shown), [shown])
  const dirty = !readOnly && changes.length > 0
  const guard = useUnsavedChangesGuard(dirty || pending, () => setDraft(base))

  function change(id: MenuId, visible: boolean) {
    if (readOnly || blocked) return
    setDraft((current) => setDraftPreference(current, id, visible))
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

  function lockedAttempt(id: MenuId) {
    const explanation = id === 'dashboard' || id === 'configuracoes' ? PROTECTED_EXPLANATION[id] : ''
    setAnnouncement(`${menuEntry(id).label} não pode ser ocultado. ${explanation}`)
  }

  function restoreProtected() {
    if (readOnly || blocked) return
    setDraft((current) => restoreProtectedInDraft(current))
    setAnnouncement('Módulos protegidos marcados como visíveis no rascunho. A configuração persistida não foi alterada.')
  }

  function discard() {
    setConfirmDiscard(false)
    setDraft(base)
    setAnnouncement('Alterações não salvas descartadas: o rascunho voltou à configuração persistida.')
  }

  function saveReviewed() {
    if (readOnly || blocked || !MENU_VISIBILITY_WRITES_ENABLED) return
    setReviewing(false)
    void coordinator.submit(reference, draft)
  }

  function reviewCurrent() {
    const current = save.readback
    const intended = save.candidate?.body.visibility
    if (!current || !coordinator.acknowledge()) return
    setReference(current)
    setDraft(save.decision === 'applied' ? current.map : intended ?? current.map)
    setAnnouncement('Leitura atual adotada explicitamente. Revise novamente as diferenças antes de qualquer novo salvamento.')
  }

  return (
    <>
      {save.phase !== 'idle' ? <VisibilitySaveFeedback state={save} onReadback={() => { void coordinator.retryReadback() }} onReview={reviewCurrent} /> : null}
      {serverViolations.length ? (
        <section className={styles.violation} aria-labelledby="mv-violation-title" data-policy-violation={serverViolations.map((item) => item.id).join(' ')}>
          <Lock size={16} strokeWidth={1.9} aria-hidden="true" />
          <div>
            <h2 id="mv-violation-title" className={styles.violationTitle}>
              Inconsistência na configuração persistida
            </h2>
            <p>
              {serverViolations.map((item) => menuEntry(item.id).label).join(' e ')} {serverViolations.length === 1 ? 'está salvo' : 'estão salvos'} como
              oculto no Control Plane, mas a regra de Produto exige que {serverViolations.length === 1 ? 'fique' : 'fiquem'} sempre visível. O valor
              do servidor é exibido como está e não foi alterado; nenhuma gravação é feita por esta tela. É necessária correção no servidor.
            </p>
            {!readOnly && draftViolations.length ? (
              <OutlineButton onClick={restoreProtected} data-restore-protected>
                <Wrench size={14} strokeWidth={1.8} aria-hidden="true" />
                Corrigir no rascunho
              </OutlineButton>
            ) : null}
            {!readOnly && !draftViolations.length ? (
              <p className={styles.violationFixed} data-restore-applied>
                Corrigido no rascunho (não salvo). O servidor continua com o valor anterior.
              </p>
            ) : null}
          </div>
        </section>
      ) : null}

      <div className={styles.workspaceWrap}>
        <div className={styles.workspace}>
          <VisibilityControls base={base} draft={shown} onChange={change} onLockedAttempt={lockedAttempt} readOnly={readOnly || blocked} />

          <div className={styles.side}>
            <section className={fin.card} aria-labelledby="mv-persisted-title" data-visibility-persisted data-saved={reference.saved}>
              <h2 id="mv-persisted-title" className={`${fin.cardTitleSm} ${styles.panelTitle}`}>
                Configuração persistida
              </h2>
              <p className={fin.cardSubtitle}>Lida do Control Plane.{readOnly ? '' : ' É o ponto de partida do rascunho.'}</p>
              <dl className={styles.facts}>
                <div className={styles.fact}><dt>Versão de referência</dt><dd data-reference-version={reference.version}>{reference.version}</dd></div>
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
                  <dt>Fora do menu lateral</dt>
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
                    A configuração persistida tira {persistedHidden} {persistedHidden === 1 ? 'módulo' : 'módulos'} do menu lateral, mas o menu lateral
                    real ainda não aplica esta configuração.
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

            {readOnly ? (
              <section className={fin.card} aria-labelledby="mv-readonly-title" data-visibility-read-only>
                <h2 id="mv-readonly-title" className={`${fin.cardTitleSm} ${styles.panelTitle}`}>
                  Somente leitura
                </h2>
                <p className={styles.pending} data-persistence-pending>
                  <Eye size={15} strokeWidth={1.8} aria-hidden="true" />
                  <span>
                    <strong>Consulta sem rascunho</strong>
                    Seu perfil pode ver a configuração persistida e a prévia do menu lateral. Somente SUPER_ADMIN prepara alterações, e salvar
                    exige autorização do build e do Backend.
                  </span>
                </p>
              </section>
            ) : (
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
                    <dt>Fora do menu na prévia</dt>
                    <dd>{hiddenCount === 0 ? 'Nenhum módulo' : `${hiddenCount} ${hiddenCount === 1 ? 'módulo' : 'módulos'}`}</dd>
                  </div>
                  <div className={styles.fact}>
                    <dt>Módulos protegidos</dt>
                    <dd data-draft-protected={draftViolations.length ? 'conflict' : 'ok'}>
                      {draftViolations.length ? 'Conflito: módulo protegido oculto' : 'Dashboard e Configurações visíveis'}
                    </dd>
                  </div>
                </dl>
                <p className={styles.pending} data-persistence-pending>
                  <Clock3 size={15} strokeWidth={1.8} aria-hidden="true" />
                  <span>
                    <strong>{MENU_VISIBILITY_WRITES_ENABLED ? `Rascunho da versão ${reference.version}` : 'Salvar ainda não está habilitado'}</strong>
                    {MENU_VISIBILITY_WRITES_ENABLED ? 'Salvar exige revisão. O resultado só é confirmado após GET; nunca há reenvio automático.' : 'Gravações desativadas neste build. Nada é enviado.'} Aplicação ao menu real permanece desativada.
                  </span>
                </p>
              </section>
            )}

            <Preview draft={shown} subject={readOnly ? 'configuração persistida' : 'rascunho'} />
          </div>
        </div>
      </div>

      <InfoNote>
        <strong>Visibilidade não é permissão.</strong> Ocultar um módulo apenas o retira do menu lateral: o acesso pela URL direta, os atalhos do
        Dashboard e os links internos continuam funcionando, e o Backend continua aplicando suas próprias verificações de acesso (RBAC). Dashboard e
        Configurações ficam sempre visíveis. Nesta etapa, nem a configuração persistida nem o rascunho são aplicados ao menu lateral real.
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
              · {hiddenCount} {hiddenCount === 1 ? 'módulo fora do menu' : 'módulos fora do menu'} na prévia
            </span>{' '}
            · não salvo
          </p>
          <div className={styles.barActions}>
            <OutlineButton className={styles.barButton} disabled={blocked} onClick={() => setConfirmDiscard(true)} data-discard>
              <RotateCcw size={14} strokeWidth={1.8} aria-hidden="true" />
              Descartar alterações não salvas
            </OutlineButton>
            <PrimaryButton className={styles.barButton} disabled={blocked} onClick={() => setReviewing(true)} data-review>
              <Eye size={15} strokeWidth={1.8} aria-hidden="true" />
              Revisar alterações
            </PrimaryButton>
          </div>
        </section>
      ) : null}

      {reviewing ? <VisibilityReviewDialog base={base} reference={reference} draft={draft} canSave={!readOnly && !blocked && MENU_VISIBILITY_WRITES_ENABLED} onSave={saveReviewed} onClose={() => setReviewing(false)} /> : null}
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
          attempted={blocked}
          onStay={guard.stay}
          onDiscard={guard.discardAndContinue}
        />
      ) : null}
    </>
  )
}
