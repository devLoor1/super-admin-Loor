import { useId, useRef } from 'react'
import { AlertTriangle, ArrowRight, CircleDot, Clock3, Eye, Save } from 'lucide-react'
import { Dialog } from '../../components/ui/Dialog'
import { OutlineButton } from '../../components/ui/OutlineButton'
import dialogStyles from '../whitelabel-settings/dialogs/SettingsDialogs.module.css'
import { menuEntry, menuLabelWithParent } from './menuRegistry'
import { putRequestPreview } from './menuVisibilityContract'
import { effectConsequences, preferenceChanges, type VisibilityMap } from './visibilityModel'
import styles from './MenuVisibility.module.css'

const word = (visible: boolean) => (visible ? 'Visível' : 'Oculto')

/**
 * Change review against the PERSISTED configuration. Lists stored-preference
 * changes, then effective consequences (parent/child), then the full map a
 * future Stage B PUT would carry. The final action is `aria-disabled`: saving
 * is not enabled in Stage A and nothing is sent — no PUT, no storage, no
 * change to the real navigation, no local updatedAt / updatedBy, no Audit.
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
  const changes = preferenceChanges(base, draft)
  const consequences = effectConsequences(base, draft)
  const warnings = [
    !draft.configuracoes && base.configuracoes
      ? 'Configurações oculto: o acesso a esta tela pelo menu também ficaria oculto. A regra para ocultar este item e recuperar o acesso não foi definida por Produto e Backend.'
      : null,
    !draft.dashboard && base.dashboard
      ? 'Dashboard oculto: o destino inicial após o login e o comportamento de rotas ocultas não foram definidos por Produto e Backend.'
      : null,
  ].filter((item): item is string => item !== null)

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
      <div className={styles.review} data-visibility-review>
        <section aria-labelledby={`${pendingId}-changes`}>
          <h3 id={`${pendingId}-changes`} className={styles.reviewTitle}>
            Preferências alteradas em relação à configuração persistida ({changes.length})
          </h3>
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
        </section>

        {consequences.length ? (
          <section aria-labelledby={`${pendingId}-effects`}>
            <h3 id={`${pendingId}-effects`} className={styles.reviewTitle}>
              Efeito no menu sem mudar a preferência ({consequences.length})
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

        {warnings.length ? (
          <div className={styles.warnings}>
            {warnings.map((warning) => (
              <p key={warning} className={styles.warning} data-review-warning>
                <AlertTriangle size={15} strokeWidth={1.8} aria-hidden="true" />
                <span>{warning}</span>
              </p>
            ))}
          </div>
        ) : null}

        <details className={styles.payload}>
          <summary>Mapa completo do rascunho (corpo previsto do PUT, não enviado)</summary>
          <pre data-put-preview>{JSON.stringify(putRequestPreview(draft), null, 2)}</pre>
        </details>

        <p id={pendingId} className={styles.pending} data-persistence-pending>
          <Clock3 size={15} strokeWidth={1.8} aria-hidden="true" />
          <span>
            <strong>Salvar ainda não está habilitado</strong>
            Leitura integrada. Aplicação e persistência aguardam validação das regras e autorização. Nenhuma requisição de alteração é enviada e o
            menu lateral real não muda; o rascunho continua nesta tela até ser descartado ou até a página ser recarregada.
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
