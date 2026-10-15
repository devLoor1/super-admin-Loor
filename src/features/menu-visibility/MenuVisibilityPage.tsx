import { useMemo, useRef, useState, type ReactNode } from 'react'
import { CircleAlert, Clock3, Eye, FlaskConical, Globe2, Info, RotateCcw, RotateCw, ShieldOff } from 'lucide-react'
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
import { describeVisibilityError } from './menuVisibilityContract'
import { menuVisibilityHref, parseVisibilityRoute, PREVIEW_LABEL, type VisibilityPreview } from './menuVisibilityRoute'
import { PROTOTYPE_INITIAL_SOURCE } from './prototypeVisibility'
import { previewSaveError, useVisibilitySource, type VisibilitySourceData } from './useVisibilitySource'
import { VisibilityControls } from './VisibilityControls'
import { DiscardVisibilityDialog, VisibilityReviewDialog } from './VisibilityDialogs'
import { countEffectivelyHidden, preferenceChanges, setPreference } from './visibilityModel'
import { VisibilityPreview as Preview } from './VisibilityPreview'
import styles from './MenuVisibility.module.css'

/**
 * `#/settings/menu-visibility` — Configurações › Visibilidade dos módulos.
 *
 * MENU VISIBILITY FRONTEND V1 IS A NON-PERSISTING PROTOTYPE. THE REAL
 * APPLICATION NAVIGATION IS NOT MODIFIED BY PROTOTYPE TOGGLES.
 *
 * The draft lives only in this component's state: no request (no GET / PUT
 * menu-visibility), no browser storage, no context or module singleton, and
 * the real sidebar keeps reading `navigation.ts`. Reloading starts again from
 * the prototype default. Visibility is presentation governance, not
 * authorization.
 */
export function MenuVisibilityPage({ previa }: { previa?: string }) {
  const { preview, ignored } = useMemo(() => parseVisibilityRoute({ previa }), [previa])
  const source = useVisibilitySource(preview)

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
        <p className={styles.prototype} data-visibility-prototype>
          <FlaskConical size={15} strokeWidth={1.8} aria-hidden="true" />
          <span>
            <strong>Protótipo sem persistência — integração com o Backend pendente.</strong> As alterações ficam somente nesta tela, em
            memória, e são descartadas ao recarregar. O menu lateral real do Super Admin não é alterado.
          </span>
        </p>
        {preview ? (
          <p className={styles.preview} role="status" data-visibility-preview-state={preview}>
            <Eye size={15} strokeWidth={1.8} aria-hidden="true" />
            <span>
              Prévia de estado do protótipo: <strong>{PREVIEW_LABEL[preview]}</strong>. Nenhuma requisição é feita.{' '}
              <a href={menuVisibilityHref()} className={shared.inlineLink} data-exit-preview>
                Sair da prévia
              </a>
            </span>
          </p>
        ) : null}
        {ignored.length ? (
          <p className={states.ignoredNote} role="status" data-ignored-params>
            <Info size={14} strokeWidth={1.9} aria-hidden="true" />
            Parâmetro da URL não reconhecido e ignorado: {ignored.join(', ')}.
          </p>
        ) : null}
      </div>

      {source.state.status === 'loading' ? (
        <section className={`${fin.card} ${states.feedback}`} aria-busy="true" data-visibility-state="loading">
          <div className={states.heroSkeleton} aria-hidden="true">
            <span className={states.skeleton} />
            <span className={states.skeleton} />
            <span className={states.skeleton} />
          </div>
          <p className="visually-hidden" role="status">
            Carregando a visibilidade dos módulos…
          </p>
        </section>
      ) : source.state.status === 'error' ? (
        <LoadError error={source.state.error} onRetry={source.reload} />
      ) : (
        <VisibilityEditor data={source.state.data} preview={preview} />
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
  return (
    <section className={`${fin.card} ${states.feedback}`} role="alert" data-visibility-state={view.kind === 'forbidden' ? 'forbidden' : 'error'}>
      <EmptyState icon={view.kind === 'forbidden' ? ShieldOff : CircleAlert} title={view.title} description={view.description} />
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

function VisibilityEditor({ data, preview }: { data: VisibilitySourceData; preview?: VisibilityPreview }) {
  // Both maps live only in this component: unmounting (leaving or reloading) drops the draft.
  const [base] = useState(data.map)
  const [draft, setDraft] = useState(data.map)
  const [reviewing, setReviewing] = useState(false)
  const [confirmDiscard, setConfirmDiscard] = useState(false)
  const [announcement, setAnnouncement] = useState('')
  const panelTitleRef = useRef<HTMLHeadingElement>(null)

  const changes = useMemo(() => preferenceChanges(base, draft), [base, draft])
  const hiddenCount = useMemo(() => countEffectivelyHidden(draft), [draft])
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
    setAnnouncement('Rascunho descartado: prévia inicial restaurada.')
  }

  const provenance = data.provenance === 'prototype'

  return (
    <>
      <div className={styles.workspaceWrap}>
        <div className={styles.workspace}>
          <VisibilityControls base={base} draft={draft} onChange={change} />

          <div className={styles.side}>
            <section className={fin.card} aria-labelledby="mv-draft-title" data-visibility-draft>
              <h2 id="mv-draft-title" ref={panelTitleRef} tabIndex={-1} className={`${fin.cardTitleSm} ${styles.panelTitle}`}>
                Rascunho em memória
              </h2>
              <dl className={styles.facts}>
                <div className={styles.fact}>
                  <dt>Estado inicial</dt>
                  <dd>{provenance ? `${PROTOTYPE_INITIAL_SOURCE.label} — não carregado do Backend` : 'Configuração do Control Plane'}</dd>
                </div>
                <div className={styles.fact}>
                  <dt>Alterações</dt>
                  <dd data-draft-count={changes.length}>
                    {dirty ? `${changes.length} ${changes.length === 1 ? 'preferência alterada' : 'preferências alteradas'}` : 'Nenhuma alteração'}
                  </dd>
                </div>
                <div className={styles.fact}>
                  <dt>Ocultos no resultado</dt>
                  <dd>{hiddenCount === 0 ? 'Nenhum módulo' : `${hiddenCount} ${hiddenCount === 1 ? 'módulo' : 'módulos'}`}</dd>
                </div>
                <div className={styles.fact}>
                  <dt>Última atualização</dt>
                  <dd className={styles.pendingValue} data-updated-at>
                    {data.updatedAt ?? 'Aguardando integração'}
                  </dd>
                </div>
                <div className={styles.fact}>
                  <dt>Atualizado por</dt>
                  <dd className={styles.pendingValue} data-updated-by>
                    {data.updatedBy ?? 'Aguardando integração'}
                  </dd>
                </div>
              </dl>
              <p className={styles.pending} data-persistence-pending>
                <Clock3 size={15} strokeWidth={1.8} aria-hidden="true" />
                <span>
                  <strong>Persistência aguardando integração do Backend</strong>
                  A revisão das alterações está disponível; salvar ainda não. Nada é enviado.
                </span>
              </p>
            </section>

            <Preview draft={draft} />
          </div>
        </div>
      </div>

      <InfoNote>
        <strong>Visibilidade não é permissão.</strong> Ocultar um módulo apenas o retira da navegação: não altera papéis, permissões ou
        autorização de rotas, e o Backend continua aplicando suas próprias verificações de acesso. Nesta versão, ocultar também não bloqueia
        o acesso direto pela URL; na integração futura, sidebar, atalhos e rotas diretas deverão usar a mesma regra de visibilidade.
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
              · {hiddenCount} {hiddenCount === 1 ? 'módulo oculto' : 'módulos ocultos'} no resultado
            </span>{' '}
            · não salvo
          </p>
          <div className={styles.barActions}>
            <OutlineButton className={styles.barButton} onClick={() => setConfirmDiscard(true)} data-discard>
              <RotateCcw size={14} strokeWidth={1.8} aria-hidden="true" />
              Descartar alterações
            </OutlineButton>
            <PrimaryButton className={styles.barButton} onClick={() => setReviewing(true)} data-review>
              <Eye size={15} strokeWidth={1.8} aria-hidden="true" />
              Revisar alterações
            </PrimaryButton>
          </div>
        </section>
      ) : null}

      {reviewing ? (
        <VisibilityReviewDialog
          base={base}
          draft={draft}
          onClose={() => setReviewing(false)}
          saveErrorPreview={preview === 'save-failed' ? previewSaveError() : undefined}
        />
      ) : null}
      {confirmDiscard ? (
        <DiscardVisibilityDialog
          base={base}
          draft={draft}
          destination="descartar o rascunho"
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
