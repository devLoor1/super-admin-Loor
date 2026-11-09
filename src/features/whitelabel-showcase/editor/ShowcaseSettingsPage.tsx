import { useCallback, useRef, useState } from 'react'
import { AlertTriangle, CircleAlert, ExternalLink, LoaderCircle, RotateCcw, Save } from 'lucide-react'
import { Dialog } from '../../../components/ui/Dialog'
import { OutlineButton } from '../../../components/ui/OutlineButton'
import { PrimaryButton } from '../../../components/ui/PrimaryButton'
import { Tabs } from '../../../components/ui/Tabs'
import { tabPanelId } from '../../../components/ui/tabIds'
import { showcaseCardHref, showcaseEditorHref, showcasePublicHref } from '../showcaseMapping'
import { acknowledgeSaveMessage, discardDraft, draftIssues, isDraftDirty, saveDraft, useShowcaseState } from '../showcaseStore'
import { issuesForTab, type ShowcaseIssue, type ShowcaseTab } from '../showcaseValidation'
import { ShowcaseView } from '../public/ShowcaseView'
import { BannerTab } from './BannerTab'
import { CardsTab } from './CardsTab'
import { useShowcaseActor } from './editorHooks'
import { IntroTab } from './IntroTab'
import { PreviewFrame, PreviewPanel, type PreviewViewport } from './PreviewPanel'
import { showcaseCrumbs } from './showcaseCrumbs'
import { ScopeBar, ShowcaseFrame } from './ShowcaseFrame'
import { SimulationPanel } from './SimulationPanel'
import { leavePrompt, SHOWCASE_TABS } from './showcaseNavigation'
import { useShowcaseLeaveGuard, type LeavePrompt } from './useShowcaseLeaveGuard'
import styles from './ShowcaseEditor.module.css'

export function LeaveDialog({ prompt, onStay, onConfirm }: { prompt: LeavePrompt; onStay: () => void; onConfirm: () => void }) {
  const stay = useRef<HTMLButtonElement>(null)
  return (
    <Dialog title={prompt.title} description={prompt.description} icon={AlertTriangle} tone="warning" onClose={onStay} initialFocusRef={stay}
      footer={<><OutlineButton ref={stay} onClick={onStay}>Continuar editando</OutlineButton><PrimaryButton onClick={onConfirm}>{prompt.confirmLabel}</PrimaryButton></>}>
      <p className={styles.dialogText}>Nenhuma configuração salva será alterada por este descarte.</p>
    </Dialog>
  )
}

function IssuesSummary({ issues, onGo }: { issues: readonly ShowcaseIssue[]; onGo: (issue: ShowcaseIssue) => void }) {
  return (
    <section className={styles.issues} role="alert" aria-labelledby="vitrine-pendencias">
      <h2 id="vitrine-pendencias" tabIndex={-1}><CircleAlert size={18} aria-hidden="true" />Não é possível salvar ainda: {issues.length === 1 ? '1 pendência' : `${issues.length} pendências`}</h2>
      <p>O rascunho continua editável. A última configuração válida permanece salva na simulação.</p>
      <ul>{issues.map((issue, index) => <li key={`${issue.message}-${index}`}><button type="button" className={styles.linkButton} onClick={() => onGo(issue)}>{issue.message}</button></li>)}</ul>
    </section>
  )
}

export function ShowcaseSettingsPage({ tenantId, tab }: { tenantId: string; tab: ShowcaseTab }) {
  return (
    <ShowcaseFrame tenantId={tenantId} title="Vitrine de White Labels" crumbs={showcaseCrumbs(tenantId, [{ label: 'Vitrine de White Labels' }])}>
      <ShowcaseEditor tenantId={tenantId} tab={tab} />
    </ShowcaseFrame>
  )
}

function ShowcaseEditor({ tenantId, tab }: { tenantId: string; tab: ShowcaseTab }) {
  const state = useShowcaseState()
  const { actor, canEdit } = useShowcaseActor()
  const dirty = isDraftDirty(state)
  const issues = draftIssues(state)
  const [showErrors, setShowErrors] = useState(false)
  const [confirmDiscard, setConfirmDiscard] = useState(false)
  const [viewport, setViewport] = useState<PreviewViewport>('desktop')
  const busy = state.phase === 'saving' || state.phase === 'reconciling'
  // The tab draft is protected on reload/close by MockApp (installDraftUnloadProtection); nothing local here.
  const guard = useShowcaseLeaveGuard(hash => leavePrompt(hash, actor), false)
  const navigate = useCallback((hash: string) => guard.request(hash), [guard])

  function goToIssue(issue: ShowcaseIssue) {
    if (issue.instanceId && issue.tab === 'cards' && state.draft.cards.some(card => card.instanceId === issue.instanceId)) {
      navigate(`${showcaseCardHref(tenantId, issue.instanceId)}${issue.fieldId ? `?campo=${issue.fieldId}` : ''}`)
      return
    }
    if (issue.tab !== tab) navigate(showcaseEditorHref(tenantId, issue.tab))
    window.setTimeout(() => document.getElementById(issue.fieldId ?? '')?.focus(), 120)
  }

  async function save() {
    if (!canEdit || busy || !dirty) return
    if (issues.length) {
      setShowErrors(true)
      window.requestAnimationFrame(() => document.getElementById('vitrine-pendencias')?.focus())
      return
    }
    setShowErrors(false)
    await saveDraft(actor)
  }

  const statusLabel = !canEdit ? 'Somente leitura' : busy ? 'Salvando…' : state.phase === 'conflict' ? 'Conflito de versão' : dirty ? 'Alterações não salvas' : `Salvo · revisão ${state.stored.revision}`
  const saveBlocked = !dirty || busy || state.phase === 'conflict'

  const preview = (() => {
    if (tab === 'banner') return {
      title: 'Prévia do banner',
      subtitle: dirty ? 'Rascunho · alterações ainda não salvas' : 'Igual à versão salva na simulação',
      footer: 'No celular, foto e controles ficam ocultos; o texto permanece.',
      body: <>
        <PreviewFrame viewport={viewport} label="Prévia do banner"><ShowcaseView document={state.draft} sections={['header', 'hero']} idPrefix="previa-banner" embedded headingOffset={2} editorPlaceholders /></PreviewFrame>
        {state.draft.banner.images.length > 1 && <div className={styles.secondaryPreview}>
          <h3 className={styles.previewCaption}>Com 1 imagem: sem controles de carrossel.</h3>
          <PreviewFrame viewport={viewport} label="Exemplo do banner com uma imagem"><ShowcaseView document={{ ...state.draft, banner: { images: state.draft.banner.images.slice(0, 1) } }} sections={['hero']} idPrefix="previa-banner-uma" embedded headingOffset={2} /></PreviewFrame>
        </div>}
      </>,
    }
    if (tab === 'introducao') return {
      title: 'Prévia da seção',
      subtitle: dirty ? 'Rascunho · alterações ainda não salvas' : 'Igual à versão salva na simulação',
      footer: state.draft.introduction ? 'Entre o banner principal e os cards.' : 'Seção removida · banner seguido diretamente pelos cards.',
      body: state.draft.introduction
        ? <PreviewFrame viewport={viewport} label="Prévia da seção introdutória"><ShowcaseView document={state.draft} sections={['intro']} idPrefix="previa-intro" embedded headingOffset={1} /></PreviewFrame>
        : <PreviewFrame viewport={viewport} label="Prévia sem seção introdutória"><ShowcaseView document={{ ...state.draft, cards: state.draft.cards.slice(0, 1) }} sections={['hero', 'portfolio']} idPrefix="previa-sem-intro" embedded headingOffset={2} portfolioNote={false} editorPlaceholders /></PreviewFrame>,
    }
    return {
      title: 'Prévia da vitrine',
      subtitle: `${dirty ? 'Rascunho' : 'Versão salva'} · ${state.draft.cards.length === 1 ? '1 card na lista' : `${state.draft.cards.length} cards na lista`}`,
      footer: 'Marcas e conteúdo ilustrativos nesta proposta.',
      body: state.draft.cards.length
        ? <PreviewFrame viewport={viewport} label="Prévia dos cards"><ShowcaseView document={state.draft} sections={['portfolio']} idPrefix="previa-cards" embedded headingOffset={2} portfolioHeading={false} portfolioNote={false} editorPlaceholders /></PreviewFrame>
        : <p className={styles.hint}>Sem cards no rascunho. A versão salva continua com {state.stored.document.cards.length} card(s).</p>,
    }
  })()

  return (
    <>
      <div className={styles.toolbar}>
        <ScopeBar />
        <div className={styles.actions}>
          <span className={styles.statusPill} data-tone={state.phase === 'conflict' ? 'danger' : dirty ? 'warning' : 'neutral'} role="status">{busy ? <LoaderCircle size={14} className={styles.spin} aria-hidden="true" /> : <span className={styles.dot} aria-hidden="true" />}{statusLabel}</span>
          <a className={styles.outlineLink} href={showcasePublicHref(tenantId, dirty)}><ExternalLink size={15} aria-hidden="true" />{dirty ? 'Página completa (rascunho)' : 'Página pública simulada'}</a>
          {canEdit && <OutlineButton disabled={!dirty || busy} onClick={() => setConfirmDiscard(true)}><RotateCcw size={15} aria-hidden="true" />Descartar</OutlineButton>}
          {canEdit && <PrimaryButton aria-disabled={!saveBlocked && issues.length > 0 ? true : undefined} disabled={saveBlocked} data-blocked={issues.length > 0 || undefined} className={styles.saveButton} onClick={() => void save()}><Save size={16} aria-hidden="true" />Salvar alterações</PrimaryButton>}
        </div>
      </div>

      {!canEdit && <p className={styles.readOnly} role="note">Perfil somente leitura (simulação): campos, inclusão, ordenação, uploads e salvamento estão bloqueados, inclusive nas ações internas. A autorização real dependerá do Backend.</p>}
      {canEdit && dirty && issues.length > 0 && !showErrors && <p className={styles.blockedNote}><CircleAlert size={16} aria-hidden="true" />{issues.length === 1 ? '1 pendência impede' : `${issues.length} pendências impedem`} o salvamento. <button type="button" className={styles.linkButton} onClick={() => { setShowErrors(true); window.requestAnimationFrame(() => document.getElementById('vitrine-pendencias')?.focus()) }}>Ver pendências</button></p>}
      {showErrors && issues.length > 0 && <IssuesSummary issues={issues} onGo={goToIssue} />}
      <SaveFeedback />

      <Tabs
        idPrefix="vitrine"
        label="Seções da vitrine"
        tabs={SHOWCASE_TABS.map(item => {
          const count = issuesForTab(issues, item.value).length
          return { value: item.value, label: count && (showErrors || dirty) ? `${item.label} (${count})` : item.label }
        })}
        value={tab}
        onChange={next => navigate(showcaseEditorHref(tenantId, next))}
        className={styles.tabs}
      />
      <div role="tabpanel" id={tabPanelId('vitrine', tab)} aria-labelledby={`vitrine-tab-${tab}`} className={styles.workspace}>
        <div className={styles.editorColumn}>
          {tab === 'banner' && <BannerTab images={state.draft.banner.images} showErrors={showErrors} />}
          {tab === 'introducao' && <IntroTab introduction={state.draft.introduction} issues={issues} showErrors={showErrors} />}
          {tab === 'cards' && <CardsTab cards={state.draft.cards} issues={issues} tenantId={tenantId} onNavigate={navigate} showErrors={showErrors} />}
        </div>
        <PreviewPanel title={preview.title} subtitle={preview.subtitle} viewport={viewport} onViewport={setViewport} footer={preview.footer}>
          {preview.body}
        </PreviewPanel>
      </div>

      <SimulationPanel />

      {confirmDiscard && <Dialog title="Descartar alterações?" description={`O editor volta para a versão salva na simulação (revisão ${state.stored.revision}).`} icon={RotateCcw} tone="warning" onClose={() => setConfirmDiscard(false)}
        footer={<><OutlineButton onClick={() => setConfirmDiscard(false)}>Continuar editando</OutlineButton><PrimaryButton onClick={() => { if (canEdit) discardDraft(actor); setShowErrors(false); setConfirmDiscard(false) }}>Descartar alterações</PrimaryButton></>}>
        <p className={styles.dialogText}>Cards, imagens e textos não salvos serão perdidos. Nada é removido da origem nem de arquivos.</p>
      </Dialog>}
      {guard.pending && <LeaveDialog prompt={guard.pending} onStay={guard.cancel} onConfirm={guard.confirm} />}
    </>
  )
}

/** Save results: simulated success is never presented as Backend persistence. */
export function SaveFeedback() {
  const state = useShowcaseState()
  const { actor, canEdit } = useShowcaseActor()
  if (state.phase === 'idle') return null
  if (state.phase === 'conflict') {
    return (
      <section className={styles.conflict} role="alert" aria-labelledby="vitrine-conflito">
        <h2 id="vitrine-conflito"><AlertTriangle size={18} aria-hidden="true" />Conflito de versão</h2>
        <p>{state.message}</p>
        <p className={styles.hint}>Sem sobrescrita forçada nesta V1: revise o rascunho (a prévia continua disponível) e recarregue a versão atual para reaplicar as mudanças.</p>
        <div className={styles.inlineActions}>
          <OutlineButton disabled={!canEdit} onClick={() => discardDraft(actor)}>Descartar meu rascunho e carregar a revisão {state.conflictRevision}</OutlineButton>
        </div>
      </section>
    )
  }
  const tone = state.phase === 'saved' ? 'success' : state.phase === 'failed' || state.phase === 'rejected' ? 'danger' : 'neutral'
  return (
    <p className={styles.feedback} data-tone={tone} role={tone === 'danger' ? 'alert' : 'status'}>
      {state.phase === 'saving' || state.phase === 'reconciling' ? <LoaderCircle size={16} className={styles.spin} aria-hidden="true" /> : null}
      <span>{state.message}</span>
      {state.phase !== 'saving' && state.phase !== 'reconciling' && <button type="button" className={styles.linkButton} onClick={acknowledgeSaveMessage}>Fechar aviso</button>}
    </p>
  )
}
