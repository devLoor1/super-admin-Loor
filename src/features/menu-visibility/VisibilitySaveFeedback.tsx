import { OutlineButton } from '../../components/ui/OutlineButton'
import { menuLabelWithParent, MENU_VISIBILITY_IDS } from './menuRegistry'
import { describeVisibilityError } from './menuVisibilityContract'
import type { VisibilitySaveState } from './visibilitySaveCoordinator'
import styles from './MenuVisibility.module.css'

const titles = { applied: 'APLICADO — confirmação por resposta e leitura', 'not-confirmed': 'NÃO CONFIRMADO — não reenviar automaticamente', diverged: 'DIVERGENTE — revisão obrigatória', conflicted: 'CONFLITO — a solicitação pode ter persistido' }
export function VisibilitySaveFeedback({ state, onReadback, onReview }: { state: VisibilitySaveState; onReadback: () => void; onReview: () => void }) {
  const pending = state.phase === 'saving' || state.phase === 'reading'
  const view = state.result && state.result.state !== 'acknowledged' ? state.result.view : null
  return <section className={`${styles.violation} ${styles.saveFeedback}`} role="status" aria-live="polite" aria-busy={pending} data-save-phase={state.phase} data-save-decision={state.decision}>
    <div>
      <h2 className={styles.violationTitle}>{pending ? state.phase === 'saving' ? 'Salvando configuração global…' : 'Confirmando por leitura autoritativa…' : titles[state.decision ?? 'not-confirmed']}</h2>
      <p>{pending ? 'Uma única tentativa está em andamento. Sair da página não cancela nem reenvia a gravação.' : state.decision === 'applied' ? 'Resposta do PUT e GET subsequente coincidem em mapa, versão e metadados. O menu lateral real permanece inalterado.' : 'O rascunho e sua versão original foram preservados. Mapas iguais, sozinhos, não provam que esta tentativa causou a atualização.'}</p>
      {view ? <p>{view.title}. {view.description}{view.correlationId ? ` Diagnóstico: ${view.correlationId}` : ''}</p> : null}
      {state.readError ? <p role="alert">Leitura de confirmação indisponível. {describeVisibilityError(state.readError, 'load').title}. Repetir a leitura não repete o PUT.</p> : null}
      {state.readback ? <>
        <p>Versão original: {state.reference?.version} · Versão atual global: <strong data-current-version>{state.readback.version}</strong></p>
        <details><summary>Configuração global atual (GET) — separada do rascunho</summary><ul>{MENU_VISIBILITY_IDS.map(id => <li key={id}>{menuLabelWithParent(id)}: {state.readback!.map[id] ? 'Visível' : 'Oculto'}</li>)}</ul></details>
      </> : null}
      {!pending ? <div className={styles.barActions}>
        <OutlineButton className={styles.barButton} onClick={onReadback}>Repetir somente leitura</OutlineButton>
        {state.readback ? <OutlineButton className={styles.barButton} onClick={onReview}>{state.decision === 'applied' ? 'Continuar editando' : 'Usar leitura atual e revisar rascunho'}</OutlineButton> : null}
      </div> : null}
    </div>
  </section>
}
