import { useEffect, useSyncExternalStore } from 'react'
import { isAuthenticated, subscribeSession } from '../../../lib/authSession'
import { showcaseAvailableFor } from '../showcaseAccess'
import { SHOWCASE_SIMULATION, showcaseEditorHref, showcasePublicHref } from '../showcaseMapping'
import { getStoredSnapshot, subscribeStoredShowcase } from '../showcaseRepository'
import { isDraftDirty, useShowcaseState } from '../showcaseStore'
import { useShowcaseActor, useSimulation } from '../editor/editorHooks'
import { leavePrompt } from '../editor/showcaseNavigation'
import { LeaveDialog } from '../editor/ShowcaseSettingsPage'
import { useShowcaseLeaveGuard } from '../editor/useShowcaseLeaveGuard'
import { ShowcaseView } from './ShowcaseView'
import '../fixtures/seedAssets'
import './PublicShowcasePage.css'

/**
 * Simulated PUBLIC projection of the Vitrine (mock route `#/mock/vitrine-publica/:tenant`).
 * It reads only the last saved version of the simulated repository, never the
 * administrative draft (except the explicit `?versao=rascunho` preview, which
 * requires a Super Admin session). It is not the operational public site
 * (`giallanzah/loor-capital-suite`), which still needs its own allowlisted
 * projection and owner/environment resolution on the server.
 */
export function PublicShowcasePage({ tenantId, draft }: { tenantId: string; draft: boolean }) {
  const stored = useSyncExternalStore(subscribeStoredShowcase, getStoredSnapshot, getStoredSnapshot)
  const { environment } = useSimulation()
  const authed = useSyncExternalStore(subscribeSession, isAuthenticated, isAuthenticated)
  const { actor, canView } = useShowcaseActor()
  const state = useShowcaseState()
  const available = showcaseAvailableFor({ tenantId, environment })
  const showDraft = draft && authed && canView
  const pendingDraft = authed && canView && isDraftDirty(state)
  // Leaving the family asks while a draft exists, whichever projection is shown (saved or draft).
  // Reload/close of the draft is protected by MockApp for every screen of this tab.
  const guard = useShowcaseLeaveGuard(hash => leavePrompt(hash, actor), false)

  useEffect(() => {
    document.title = draft ? 'Vitrine de White Labels · prévia do rascunho (simulação)' : 'White Labels · LOØR — vitrine pública simulada'
    document.documentElement.dataset.view = 'mock-showcase-public'
  }, [draft])

  if (!available) {
    return (
      <div className="wl-public-shell">
        <p className="wl-public-bar" role="note">Simulação da projeção pública · somente mock</p>
        <main className="wl-public-unavailable">
          <h1>Nenhuma vitrine configurada para este contexto</h1>
          <p>A vitrine simulada existe somente para {SHOWCASE_SIMULATION.logicalOwner.label} (WL{SHOWCASE_SIMULATION.logicalOwner.whitelabelId} · {SHOWCASE_SIMULATION.logicalOwner.slug}) no ambiente de homologação. Nenhum dado de outro proprietário é exibido como alternativa.</p>
        </main>
      </div>
    )
  }
  if (draft && !showDraft) {
    return (
      <div className="wl-public-shell">
        <p className="wl-public-bar" role="note">Simulação da projeção pública · somente mock</p>
        <main className="wl-public-unavailable">
          <h1>Prévia do rascunho indisponível</h1>
          <p>O rascunho pertence à sessão administrativa desta aba. <a href="#/login">Entrar no Super Admin de demonstração</a> ou abrir a <a href={`#/mock/vitrine-publica/${encodeURIComponent(tenantId)}`}>versão salva simulada</a>.</p>
        </main>
      </div>
    )
  }

  const shown = showDraft ? state.draft : stored.document
  return (
    <div className="wl-public-shell">
      <p className="wl-public-bar" role="note">
        {showDraft
          ? <>Prévia do <strong>rascunho</strong>{isDraftDirty(state) ? ' com alterações não salvas' : ''} · não é a versão salva · </>
          : <>Vitrine pública <strong>simulada</strong> · revisão {stored.revision} salva nesta aba · não é o site publicado · </>}
        <a href={showcaseEditorHref(tenantId)}>Voltar ao editor</a>
      </p>
      {!showDraft && pendingDraft && <p className="wl-public-bar wl-public-bar--draft" role="status">
        Há um <strong>rascunho com alterações não salvas</strong> nesta aba; ele não aparece nesta versão salva. Recarregar ou fechar a aba o descarta. <a href={showcasePublicHref(tenantId, true)}>Ver prévia do rascunho</a>
      </p>}
      <ShowcaseView document={shown} idPrefix={showDraft ? 'vitrine-rascunho' : 'vitrine-publica'} editorPlaceholders={showDraft} />
      {guard.pending && <LeaveDialog prompt={guard.pending} onStay={guard.cancel} onConfirm={guard.confirm} />}
    </div>
  )
}
