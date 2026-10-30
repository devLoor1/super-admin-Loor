import { useEffect, useState, useSyncExternalStore } from 'react'
import { participantCreationAvailable } from '../../../app/presentationAvailability'
import { OutlineButton } from '../../../components/ui/OutlineButton'
import { getSessionVersion, subscribeSession, useSessionOperator } from '../../../lib/authSession'
import type { AccountDetail } from '../accountsApi'
import { deliveryState, resendLocked, resendParticipant, subscribeParticipants } from './participantCreationClient'
import css from './ParticipantCreation.module.css'

export function ParticipantAccessDelivery({ detail, activeTenant, current }: { detail: Exclude<AccountDetail, { kind: 'admin' }>; activeTenant: boolean; current: boolean }) {
  const operator = useSessionOperator(), version = useSyncExternalStore(subscribeSession, getSessionVersion, () => -1)
  const scope = { tenant: detail.record.whitelabelId, kind: detail.kind }, id = detail.record.id
  const state = useSyncExternalStore(subscribeParticipants, () => deliveryState(scope, id), () => null)
  const [now, setNow] = useState(() => Date.now()), [error, setError] = useState('')
  useEffect(() => { if (!state?.until) return; const timer = window.setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(timer) }, [state?.until])
  if (!participantCreationAvailable(detail.kind, operator?.roles ?? [])) return null
  const verified = !!detail.record.emailVerifiedAt || state?.phase === 'verified', remaining = state?.until ? Math.max(0, Math.ceil((state.until - now) / 1000)) : 0
  return <section className={css.delivery} aria-label="Mensagem de acesso" data-participant-delivery>
    <h3>Mensagem de acesso</h3>
    <p role="status">{verified ? 'E-mail já confirmado. Senha, termos e perfil têm etapas próprias; não são presumidos concluídos.' : state?.phase === 'reported' ? state.sent ? 'Envio informado pelo servidor. Recebimento e conclusão do acesso não são comprovados por este retorno.' : 'Envio não confirmado pelo servidor. A conta existente permanece registrada.' : state?.phase === 'sending' ? 'Conferindo conta e solicitando um envio…' : state?.phase === 'limited' ? state.until === undefined ? 'Limite de envio atingido. O servidor não informou o prazo; novo envio bloqueado nesta tela, sem contagem estimada.' : 'Limite de envio atingido. Aguarde o prazo informado pelo servidor.' : state?.phase === 'uncertain' ? 'Resultado do envio incerto. Não repetir automaticamente; confirme o recebimento com o participante.' : state?.phase === 'rejected' ? 'Envio recusado ou pré-condição não confirmada. A conta não foi recriada.' : 'Estado do envio desconhecido nesta sessão. A consulta da conta não informa entrega de mensagem.'}</p>
    {!verified && <>
      {remaining > 0 && <p>{state?.phase === 'limited' ? `Novo envio disponível em ${remaining} s.` : 'Aguarde a janela mínima de cinco minutos entre solicitações de acesso.'}</p>}
      <OutlineButton disabled={!current || !activeTenant || detail.record.accessState !== 'active' || resendLocked(state, now)} onClick={() => { setError(''); void resendParticipant(scope, id, version).catch(() => setError('A sessão não autoriza o envio. Nenhum sucesso foi presumido.')) }}>Reenviar acesso</OutlineButton>
      {detail.record.accessState !== 'active' && <p>Reenvio indisponível enquanto o acesso está pausado ou não confirmado.</p>}
    </>}
    {state?.correlationId && <p>Diagnóstico: {state.correlationId}</p>}{error && <p role="alert">{error}</p>}
  </section>
}
