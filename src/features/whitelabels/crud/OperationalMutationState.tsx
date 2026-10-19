import { OutlineButton } from '../../../components/ui/OutlineButton'
import { useEffect, useRef } from 'react'
import type { WhitelabelRecord } from '../whitelabelApi'
import type { WhitelabelMutation } from './useWhitelabelMutation'
import { MutationOutcomeNotice } from './MutationStates'
import { whitelabelsHref } from '../whitelabelRoute'
import styles from './WhitelabelCrud.module.css'

/** Safe next actions only: a retry always returns to a fresh, explicit review. */
export function OperationalMutationState({ mutation, onReview, onInspectRecord }: { mutation: WhitelabelMutation; onReview: () => void; onInspectRecord?: (record: WhitelabelRecord) => void }) {
  const { state, outcome, readback } = mutation
  const uncertain = 'outcome' in state && state.outcome.state === 'uncertain'
  const canVerify = uncertain && (state.phase !== 'verified' || state.readback === 'inconclusive')
  const resultRef = useRef<HTMLDivElement>(null)
  useEffect(() => { if (!mutation.busy) resultRef.current?.focus() }, [state.phase, mutation.busy])
  return <div ref={resultRef} tabIndex={-1} aria-label="Resultado da solicitação" aria-live="polite" aria-busy={mutation.busy} data-mutation-phase={state.phase}>
    {mutation.busy ? <p role="status">{state.phase === 'pending' ? 'Enviando solicitação… Não feche esta janela.' : 'Conferindo dados no Control Plane…'}</p> : null}
    {outcome && state.phase !== 'verified' ? <MutationOutcomeNotice view={outcome} /> : null}
    {state.phase === 'check-failed' ? <p role="alert">Não foi possível conferir o registro atual. Nenhuma alteração foi enviada. Revise novamente para tentar a conferência.</p> : null}
    {state.phase === 'verify-failed' ? <p role="alert">Não foi possível concluir a conferência. O resultado continua incerto; não reenvie a alteração.</p> : null}
    {readback ? <div className={styles.outcome} data-tone={readback.tone} role="status"><div>
      <p className={styles.outcomeTitle}>{readback.title}</p><p>{readback.description}</p>
    </div></div> : null}
    {state.phase === 'verified' && state.record ? <p>ID encontrado: <strong>{state.record.id}</strong> · {state.record.slug}
      {' '}<a href={whitelabelsHref({ id: state.record.id })} onClick={event => {
        if (onInspectRecord && state.record) { event.preventDefault(); onInspectRecord(state.record) }
      }}>Consultar este Whitelabel</a></p> : null}
    {canVerify && !mutation.busy ? <OutlineButton onClick={() => void mutation.verify()}>Conferir no Control Plane</OutlineButton> : null}
    {mutation.retryReview ? <OutlineButton onClick={onReview}>Revisar novamente</OutlineButton> : null}
  </div>
}
