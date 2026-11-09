import { useState, useSyncExternalStore } from 'react'
import { FlaskConical } from 'lucide-react'
import { OutlineButton } from '../../../components/ui/OutlineButton'
import { simulateSourceBrandingChange } from '../fixtures/showcaseSourceDefaults'
import { ShowcasePermissionError } from '../showcaseAccess'
import { SIMULATED_ENVIRONMENT_LABELS } from '../showcaseMapping'
import { getStoredSnapshot, simulateConcurrentEdit, subscribeStoredShowcase } from '../showcaseRepository'
import {
  LOOKUP_OUTCOME_LABELS,
  SAVE_OUTCOME_LABELS,
  setNextOutcomes,
  UPLOAD_OUTCOME_LABELS,
  type LookupOutcome,
  type SaveOutcome,
  type UploadOutcome,
} from '../showcaseSimulation'
import { useShowcaseActor, useSimulation } from './editorHooks'
import styles from './ShowcaseEditor.module.css'

const BLOCKED = 'Ação recusada pela simulação: perfil sem permissão de edição. Nada foi alterado.'

/**
 * Mock-only controls that make failure, uncertainty and concurrency demonstrable.
 * Reading the saved revision is consultation; every command that changes the
 * simulation is refused without the edit profile by the called function itself
 * (the disabled controls are only the visible part of that rule).
 */
export function SimulationPanel() {
  const simulation = useSimulation()
  const { actor, canEdit } = useShowcaseActor()
  const stored = useSyncExternalStore(subscribeStoredShowcase, getStoredSnapshot, getStoredSnapshot)
  const [notice, setNotice] = useState('')

  function run(command: () => string) {
    try {
      setNotice(command())
    } catch (error) {
      if (!(error instanceof ShowcasePermissionError)) throw error
      setNotice(BLOCKED)
    }
  }

  return (
    <details className={styles.simulation}>
      <summary><FlaskConical size={16} aria-hidden="true" />Controles da simulação (somente mock)</summary>
      <div className={styles.simulationBody}>
        <p className={styles.hint}>Versão salva na simulação: revisão {stored.revision}. Ambiente: {SIMULATED_ENVIRONMENT_LABELS[simulation.environment]} (alterável na galeria MOCK). Recarregar a página restaura todos os exemplos e descarta o rascunho desta aba.</p>
        {!canEdit && <p className={styles.readOnly} role="note">Perfil somente leitura: os controles que alteram a simulação estão bloqueados, também nas funções chamadas por eles. A revisão salva continua disponível para consulta.</p>}
        <div className={styles.simulationGrid}>
          <label className={styles.field}>Próximo salvamento
            <select value={simulation.nextSave} disabled={!canEdit} onChange={event => run(() => { setNextOutcomes(actor, { nextSave: event.target.value as SaveOutcome }); return '' })}>
              {Object.entries(SAVE_OUTCOME_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          <label className={styles.field}>Próximo envio de arquivo
            <select value={simulation.nextUpload} disabled={!canEdit} onChange={event => run(() => { setNextOutcomes(actor, { nextUpload: event.target.value as UploadOutcome }); return '' })}>
              {Object.entries(UPLOAD_OUTCOME_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          <label className={styles.field}>Próxima busca por slug
            <select value={simulation.nextLookup} disabled={!canEdit} onChange={event => run(() => { setNextOutcomes(actor, { nextLookup: event.target.value as LookupOutcome }); return '' })}>
              {Object.entries(LOOKUP_OUTCOME_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
        </div>
        <div className={styles.simulationActions}>
          <OutlineButton disabled={!canEdit} onClick={() => run(() => `Outra sessão simulada salvou a revisão ${simulateConcurrentEdit(actor).revision}. O próximo salvamento deste rascunho entrará em conflito.`)}>Simular edição em outra sessão</OutlineButton>
          <OutlineButton disabled={!canEdit} onClick={() => run(() => {
            const next = simulateSourceBrandingChange(actor)
            return next ? `Branding simulado da origem nova-plataforma-demo mudou para a versão ${next.version}. Cards existentes não foram alterados.` : ''
          })}>Simular nova versão do branding de nova-plataforma-demo</OutlineButton>
        </div>
        <p className={styles.hint}>Para demonstrar uma origem inativa, use Plataformas → Whitelabels → ações do registro (comando local do mock, exclusivo do perfil de edição) e volte à vitrine.</p>
        <p className={styles.infoText} role="status">{notice}</p>
      </div>
    </details>
  )
}
