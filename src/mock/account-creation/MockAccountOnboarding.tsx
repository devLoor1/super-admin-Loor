import { useState } from 'react'
import { CircleCheck, CircleDashed, ChevronRight } from 'lucide-react'
import type { AccountDetail } from '../../features/whitelabel-accounts/accountsApi'
import { authenticatedGet } from '../../lib/apiClient'
import { useRemote } from '../../lib/useRemoteResource'
import type { ParticipantKind } from './accountCreationModel'
import css from './MockAccountCreation.module.css'

/** A read-only explanation of pending onboarding. Exploring a stage never accepts terms or completes verification. */
export function MockAccountOnboarding({ detail, tenantId }: { detail: AccountDetail; tenantId: string }) {
  if (detail.kind === 'admin') return null
  return <ParticipantOnboarding key={`${tenantId}:${detail.kind}:${detail.record.id}`} tenantId={tenantId} kind={detail.kind} id={detail.record.id} />
}
function ParticipantOnboarding({ tenantId, kind, id }: { tenantId: string; kind: ParticipantKind; id: string }) {
  const remote = useRemote(`mock-onboarding:${tenantId}:${kind}:${id}`, signal => authenticatedGet<{ data: { mockCreated?: boolean } | null; mockOnly: boolean }>(`/mock/account-creation/whitelabels/${tenantId}/${kind}/${id}`, { signal }))
  const [selected, setSelected] = useState('registration')
  if (remote.state.status !== 'success' || remote.state.data.mockOnly !== true || !remote.state.data.data?.mockCreated) return null
  const stages = [
    { id: 'registration', label: 'Cadastro inicial', state: 'Criado localmente', text: 'Nome e contato registrados somente nesta demonstração. O acesso ativo é um estado simulado; nenhuma credencial foi provisionada.', complete: true },
    { id: 'email', label: 'E-mail e credenciais', state: 'Pendente', text: 'O titular ainda precisa verificar o e-mail e definir as credenciais pelo fluxo que o Backend qualificar. Este protótipo não envia mensagens ou links.', complete: false },
    { id: 'terms', label: 'Termos de uso', state: 'Sem aceite', text: 'Somente o titular pode aceitar a revisão vigente dos termos do Whitelabel. Criar ou explorar a conta não registra um aceite.', complete: false },
    { id: 'profile', label: kind === 'investor' ? 'Perfil do investidor' : 'Perfil e empresa', state: 'Incompleto', text: kind === 'investor' ? 'Dados pessoais ou da pessoa jurídica e questionário de perfil serão preenchidos posteriormente. Nenhuma aprovação de cadastro ou KYC foi simulada.' : 'A conclusão do perfil e a empresa são etapas posteriores e separadas. Nenhuma empresa, CNPJ, conta bancária ou oportunidade foi criada.', complete: false },
    { id: 'verification', label: 'Validação e serviços', state: 'Não iniciados', text: 'KYC, documentos e serviços financeiros seguem suas próprias regras e autorizações. Este cadastro não cria wallet, pagamento ou investimento.', complete: false },
  ]
  const active = stages.find(item => item.id === selected)!
  return <section className={css.onboarding} aria-labelledby="mock-onboarding-title" data-mock-onboarding>
    <header><p className={css.eyebrow}>Jornada simulada</p><h3 id="mock-onboarding-title">Próximas etapas da conta</h3><p>Explore o que vem depois do cadastro inicial.</p></header>
    <div className={css.stageList}>{stages.map(stage => <button type="button" key={stage.id} onClick={() => setSelected(stage.id)} aria-pressed={selected === stage.id} aria-controls="mock-onboarding-description"><span className={css.stageIcon} aria-hidden="true">{stage.complete ? <CircleCheck size={18} /> : <CircleDashed size={18} />}</span><span><strong>{stage.label}</strong><small>{stage.state}</small></span><ChevronRight size={15} aria-hidden="true" /></button>)}</div>
    <div id="mock-onboarding-description" className={css.stageDescription} role="status"><h4>{active.label}</h4><p>{active.text}</p></div>
  </section>
}
