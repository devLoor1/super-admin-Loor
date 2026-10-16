import { useId, useRef } from 'react'
import { AlertTriangle, ArrowRight, CircleDot, Clock3, Eye, Lock, Save } from 'lucide-react'
import { Dialog } from '../../components/ui/Dialog'
import { OutlineButton } from '../../components/ui/OutlineButton'
import dialogStyles from '../whitelabel-settings/dialogs/SettingsDialogs.module.css'
import { menuEntry, menuLabelWithParent } from './menuRegistry'
import { buildUpdateCandidate } from './menuVisibilityUpdate'
import { effectConsequences, preferenceChanges, type VisibilityMap } from './visibilityModel'
import { PROTECTED_EXPLANATION, PROTECTED_MENU_IDS } from './visibilityPolicy'
import { resolveVisibility } from './visibilityResolver'
import styles from './MenuVisibility.module.css'

const word = (visible: boolean) => (visible ? 'Visível' : 'Oculto')

/**
 * Change review against the PERSISTED configuration. Lists stored-preference
 * changes, the effective sidebar consequences (parent / child), the protected
 * modules (rules 1, 2), the resulting sidebar and the complete candidate map a
 * future Stage B PUT would carry (`buildUpdateCandidate`). The final action is
 * `aria-disabled`: saving is not enabled and nothing is sent — no PUT, no
 * storage, no change to the real navigation, no local updatedAt / updatedBy,
 * no Audit. A candidate that hides a protected module is reported invalid.
 */
export function VisibilityReviewDialog({
  base,
  draft,
  onClose,
}: {
  /** Persisted configuration read from the Control Plane. */
  base: VisibilityMap
  draft: VisibilityMap
  onClose: () => void
}) {
  const backRef = useRef<HTMLButtonElement>(null)
  const pendingId = useId()
  const candidate = buildUpdateCandidate(base, draft, 'edit')
  const changes = candidate.changes
  const consequences = effectConsequences(base, draft)
  const resolution = resolveVisibility(draft)
  const protectedIssues = candidate.issues.filter((issue) => issue.kind === 'protected-hidden')
  const visibleCount = resolution.entries.length - resolution.hidden.length

  return (
    <Dialog
      title="Revisar alterações de visibilidade"
      description="Configuração global do ambiente de homologação · rascunho comparado à configuração persistida, não salvo"
      icon={Eye}
      onClose={onClose}
      initialFocusRef={backRef}
      size="lg"
      footer={
        <>
          <OutlineButton ref={backRef} className={dialogStyles.footerButton} onClick={onClose}>
            Voltar ao rascunho
          </OutlineButton>
          <button
            type="button"
            className={styles.pendingAction}
            aria-disabled="true"
            aria-describedby={pendingId}
            onClick={(event) => event.preventDefault()}
            data-pending-save
          >
            <Save size={15} strokeWidth={1.8} aria-hidden="true" />
            Salvar visibilidade
          </button>
        </>
      }
    >
      <div className={styles.review} data-visibility-review data-candidate-valid={candidate.valid || undefined}>
        <section aria-labelledby={`${pendingId}-changes`}>
          <h3 id={`${pendingId}-changes`} className={styles.reviewTitle}>
            Preferências alteradas em relação à configuração persistida ({changes.length})
          </h3>
          {changes.length ? (
            <ul className={styles.changes}>
              {changes.map((change) => (
                <li key={change.id} className={styles.change} data-review-change={change.id}>
                  <span className={styles.changeLabel}>{menuLabelWithParent(change.id)}</span>
                  <span className={styles.changeValues}>
                    <span className={styles.before}>{word(change.from)}</span>
                    <ArrowRight size={13} strokeWidth={2} aria-hidden="true" />
                    <span className="visually-hidden">para</span>
                    <span className={styles.after}>{word(change.to)}</span>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className={styles.previewEmpty}>Nenhuma preferência difere da configuração persistida.</p>
          )}
        </section>

        {consequences.length ? (
          <section aria-labelledby={`${pendingId}-effects`}>
            <h3 id={`${pendingId}-effects`} className={styles.reviewTitle}>
              Efeito no menu lateral sem mudar a preferência ({consequences.length})
            </h3>
            <ul className={styles.changes}>
              {consequences.map((item) => (
                <li key={item.id} className={styles.change} data-review-effect={item.id}>
                  <span className={styles.changeLabel}>{menuLabelWithParent(item.id)}</span>
                  <span className={styles.consequence}>
                    Preferência mantida: {word(item.preference)} ·{' '}
                    {item.to
                      ? 'volta a aparecer porque o item pai voltou a ficar visível'
                      : `fica oculto porque ${menuEntry(item.hiddenBy ?? item.id).label} está oculto`}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <section aria-labelledby={`${pendingId}-protected`} data-review-protected>
          <h3 id={`${pendingId}-protected`} className={styles.reviewTitle}>
            Módulos protegidos
          </h3>
          <ul className={styles.changes}>
            {PROTECTED_MENU_IDS.map((id) => (
              <li key={id} className={styles.change} data-review-protected-id={id} data-ok={draft[id] || undefined}>
                <span className={styles.changeLabel}>
                  <Lock size={12} strokeWidth={2} aria-hidden="true" className={styles.noteIcon} />
                  {menuEntry(id).label}
                </span>
                <span className={styles.consequence}>
                  {PROTECTED_EXPLANATION[id]} No mapa candidato: {draft[id] ? 'visível' : 'oculto — viola a regra'}.
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby={`${pendingId}-sidebar`} data-review-sidebar>
          <h3 id={`${pendingId}-sidebar`} className={styles.reviewTitle}>
            Resultado no menu lateral
          </h3>
          <p className={styles.consequence} data-review-sidebar-count={visibleCount}>
            {visibleCount} de {resolution.entries.length} módulos apareceriam no menu lateral
            {resolution.hidden.length
              ? `; fora dele: ${resolution.hidden.map((entry) => menuLabelWithParent(entry.id)).join(', ')}.`
              : '.'}{' '}
            Somente o menu lateral seria afetado: rotas diretas, atalhos do Dashboard e links internos continuam disponíveis.
          </p>
        </section>

        {protectedIssues.length ? (
          <div className={styles.warnings}>
            <p className={styles.warning} data-review-invalid>
              <AlertTriangle size={15} strokeWidth={1.8} aria-hidden="true" />
              <span>
                Mapa candidato inválido: {protectedIssues.map((issue) => (issue.kind === 'protected-hidden' ? menuEntry(issue.violation.id).label : '')).join(' e ')}{' '}
                {protectedIssues.length === 1 ? 'precisa' : 'precisam'} permanecer visível. O valor vem da configuração persistida e não foi
                alterado automaticamente; use “Corrigir no rascunho” e solicite a correção no servidor.
              </span>
            </p>
          </div>
        ) : null}

        <details className={styles.payload}>
          <summary>Mapa completo do rascunho (corpo previsto do PUT, não enviado)</summary>
          <pre data-put-preview>{JSON.stringify(candidate.body, null, 2)}</pre>
        </details>

        <p id={pendingId} className={styles.pending} data-persistence-pending>
          <Clock3 size={15} strokeWidth={1.8} aria-hidden="true" />
          <span>
            <strong>Salvar ainda não está habilitado</strong>
            Leitura integrada. Aplicação e persistência aguardam validação das regras e autorização. Nenhuma requisição de alteração é enviada e o
            menu lateral real não muda; o rascunho continua nesta tela até ser descartado ou até a página ser recarregada.
            {protectedIssues.length ? ' Além disso, este mapa candidato não poderia ser salvo enquanto houver módulo protegido oculto.' : ''}
          </span>
        </p>
      </div>
    </Dialog>
  )
}

/** Confirmation before dropping the draft (button or leaving the page). "Continuar editando" is the default. */
export function DiscardVisibilityDialog({
  base,
  draft,
  destination,
  onStay,
  onDiscard,
  fallbackFocus,
}: {
  base: VisibilityMap
  draft: VisibilityMap
  /** e.g. "descartar o rascunho", "sair desta página". */
  destination: string
  onStay: () => void
  onDiscard: () => void
  fallbackFocus?: () => HTMLElement | null
}) {
  const stayRef = useRef<HTMLButtonElement>(null)
  const changes = preferenceChanges(base, draft)
  return (
    <Dialog
      title="Descartar alterações de visibilidade?"
      description={`Ao ${destination}, o rascunho volta à configuração persistida lida do Control Plane. Nada foi salvo.`}
      icon={AlertTriangle}
      tone="warning"
      onClose={onStay}
      initialFocusRef={stayRef}
      fallbackFocus={fallbackFocus}
      footer={
        <>
          <OutlineButton ref={stayRef} className={dialogStyles.footerButton} onClick={onStay}>
            Continuar editando
          </OutlineButton>
          <button type="button" className={dialogStyles.confirmWarning} onClick={onDiscard} data-confirm-discard>
            Descartar alterações
          </button>
        </>
      }
    >
      <p className={dialogStyles.text}>Preferências alteradas no rascunho:</p>
      <ul className={dialogStyles.list}>
        {changes.map((change) => (
          <li key={change.id}>
            <CircleDot size={15} strokeWidth={2} aria-hidden="true" />
            {menuLabelWithParent(change.id)}: {word(change.from)} → {word(change.to)}
          </li>
        ))}
      </ul>
    </Dialog>
  )
}
