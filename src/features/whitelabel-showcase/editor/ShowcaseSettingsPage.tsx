import { useCallback, useRef, useState } from 'react'
import { AlertTriangle, CircleAlert, ExternalLink, LoaderCircle, RotateCcw, Save } from 'lucide-react'
import { Dialog } from '../../../components/ui/Dialog'
import { OutlineButton } from '../../../components/ui/OutlineButton'
import { PrimaryButton } from '../../../components/ui/PrimaryButton'
import { Tabs } from '../../../components/ui/Tabs'
import { tabPanelId } from '../../../components/ui/tabIds'
import { showcaseCardHref, showcaseEditorHref } from '../showcaseMapping'
import { acknowledgeSaveMessage, discardDraft, draftIssues, isDraftDirty, saveDraft, reconcileDraft, useShowcaseState } from '../showcaseStore'
import { issuesForTab, type ShowcaseIssue, type ShowcaseTab } from '../showcaseValidation'
import { ShowcaseView } from '../public/ShowcaseView'
import { BannerTab } from './BannerTab'
import { SectionsTab, type LocalSectionEdit } from './SectionsTab'
import { showcaseCards } from '../showcaseModel'
import { SHOWCASE_V2_WRITES_ENABLED } from '../showcaseRelease'
import { useShowcaseActor } from './editorHooks'
import { PreviewFrame, PreviewPanel, type PreviewViewport } from './PreviewPanel'
import { showcaseCrumbs } from './showcaseCrumbs'
import { ScopeBar, ShowcaseFrame } from './ShowcaseFrame'
import { leavePrompt, logoutPrompt, SHOWCASE_TABS } from './showcaseNavigation'
import { useShowcaseLeaveGuard, type LeavePrompt } from './useShowcaseLeaveGuard'
import styles from './ShowcaseEditor.module.css'

export function LeaveDialog({ prompt, onStay, onConfirm, busy = false }: { prompt: LeavePrompt; onStay: () => void; onConfirm: () => void; busy?: boolean }) {
  const stay = useRef<HTMLButtonElement>(null)
  return (
    <Dialog title={prompt.title} description={prompt.description} icon={AlertTriangle} tone="warning" onClose={() => { if (!busy) onStay() }} initialFocusRef={stay}
      footer={<><OutlineButton ref={stay} disabled={busy} onClick={onStay}>Continuar editando</OutlineButton><PrimaryButton disabled={busy} onClick={onConfirm}>{busy ? 'Conferindo versão…' : prompt.confirmLabel}</PrimaryButton></>}>
      <p className={styles.dialogText}>A versão salva não é apagada por esta confirmação.</p>
    </Dialog>
  )
}

function IssuesSummary({ issues, onGo }: { issues: readonly ShowcaseIssue[]; onGo: (issue: ShowcaseIssue) => void }) {
  return (
    <section className={styles.issues} role="alert" aria-labelledby="vitrine-pendencias">
      <h2 id="vitrine-pendencias" tabIndex={-1}><CircleAlert size={18} aria-hidden="true" />Não é possível salvar ainda: {issues.length === 1 ? '1 pendência' : `${issues.length} pendências`}</h2>
      <p>O rascunho continua editável. A configuração salva não é alterada enquanto houver pendências.</p>
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
  const [fullPreview, setFullPreview] = useState(false)
  const [viewport, setViewport] = useState<PreviewViewport>('desktop')
  const busy = state.phase === 'saving' || state.phase === 'reconciling'
  const localEdit = useRef<LocalSectionEdit | null>(null)
  const [localDirty, setLocalDirty] = useState(false)
  const onLocalEdit = useCallback((edit: LocalSectionEdit | null) => { localEdit.current = edit; setLocalDirty(!!edit?.dirty) }, [])
  const assessLeave = (hash: string): LeavePrompt | null => {
    const outer = leavePrompt(hash, actor)
    if (!localEdit.current?.dirty) return outer
    return {
      title: outer?.title ?? 'Descartar a edição deste texto?',
      description: outer ? `${outer.description} Os campos de texto ainda não aplicados também serão descartados.` : 'Os campos ainda não aplicados serão descartados. O rascunho já aplicado à lista permanece nesta aba.',
      confirmLabel: outer?.confirmLabel ?? 'Descartar edição e sair',
      onConfirm: async () => { const result = await outer?.onConfirm(); if (result === false) return false; localEdit.current?.discard(); return true },
    }
  }
  // The session draft is also protected by the global unload guard.
  const guard = useShowcaseLeaveGuard(assessLeave, localDirty, () => logoutPrompt(actor, !!localEdit.current?.dirty))
  const navigate = useCallback((hash: string) => guard.request(hash), [guard])

  function goToIssue(issue: ShowcaseIssue) {
    if (issue.instanceId && issue.tab === 'cards' && showcaseCards(state.draft).some(card => card.instanceId === issue.instanceId)) {
      navigate(`${showcaseCardHref(tenantId, issue.instanceId)}${issue.fieldId ? `?campo=${issue.fieldId}` : ''}`)
      return
    }
    if (issue.tab !== tab) navigate(showcaseEditorHref(tenantId, issue.tab))
    if (issue.instanceId) window.setTimeout(() => document.getElementById(`section-edit-${issue.instanceId}`)?.click(), 60)
    window.setTimeout(() => document.getElementById(issue.fieldId ?? '')?.focus(), 120)
  }

  async function save() {
    if (!canEdit || busy || localDirty || !dirty || state.phase === 'uncertain' || state.phase === 'conflict') return
    if (issues.length) {
      setShowErrors(true)
      window.requestAnimationFrame(() => document.getElementById('vitrine-pendencias')?.focus())
      return
    }
    setShowErrors(false)
    await saveDraft(actor)
  }

  const statusLabel = !canEdit ? 'Somente leitura' : busy ? (state.phase === 'reconciling' ? 'Conferindo…' : 'Salvando…') : state.phase === 'conflict' ? 'Conflito de versão' : state.phase === 'uncertain' ? 'Salvamento sem confirmação' : dirty ? 'Alterações não salvas' : state.stored.configured ? `Salvo · revisão ${state.stored.revision}` : 'Ainda não configurada'
  const saveBlocked = !dirty || busy || localDirty || state.phase === 'conflict' || state.phase === 'uncertain'

  const preview = (() => {
    if (tab === 'banner') return {
      title: 'Prévia do banner',
      subtitle: dirty ? 'Rascunho · alterações ainda não salvas' : 'Conteúdo atual do editor',
      footer: 'No celular, foto e controles ficam ocultos; o texto permanece.',
      body: <>
        <PreviewFrame viewport={viewport} label="Prévia do banner"><ShowcaseView document={state.draft} sections={['header', 'hero']} idPrefix="previa-banner" embedded headingOffset={2} editorPlaceholders /></PreviewFrame>
        {state.draft.banner.images.length > 1 && <div className={styles.secondaryPreview}>
          <h3 className={styles.previewCaption}>Com 1 imagem: sem controles de carrossel.</h3>
          <PreviewFrame viewport={viewport} label="Exemplo do banner com uma imagem"><ShowcaseView document={{ ...state.draft, banner: { images: state.draft.banner.images.slice(0, 1) } }} sections={['hero']} idPrefix="previa-banner-uma" embedded headingOffset={2} /></PreviewFrame>
        </div>}
      </>,
    }
    return {
      title: 'Prévia da vitrine',
      subtitle: `${dirty ? 'Rascunho' : 'Versão salva'} · ${state.draft.sections.length} elementos`,
      footer: 'A mesma ordem da lista, em Desktop e Mobile.',
      body: state.draft.sections.length
        ? <PreviewFrame viewport={viewport} label="Prévia do conteúdo"><ShowcaseView document={state.draft} sections={['intro', 'portfolio']} idPrefix="previa-conteudo" embedded headingOffset={2} portfolioHeading={false} portfolioNote={false} editorPlaceholders /></PreviewFrame>
        : <p className={styles.hint}>Sem elementos no rascunho. A versão salva permanece preservada.</p>,
    }
  })()

  return (
    <>
      <div className={styles.toolbar}>
        <ScopeBar />
        <div className={styles.actions}>
          <span className={styles.statusPill} data-tone={state.phase === 'conflict' ? 'danger' : dirty ? 'warning' : 'neutral'} role="status">{busy ? <LoaderCircle size={14} className={styles.spin} aria-hidden="true" /> : <span className={styles.dot} aria-hidden="true" />}{statusLabel}</span>
          <OutlineButton onClick={() => setFullPreview(true)}><ExternalLink size={15} aria-hidden="true" />Prévia completa</OutlineButton>
          {canEdit && <OutlineButton disabled={!dirty || busy || state.phase === 'uncertain'} onClick={() => setConfirmDiscard(true)}><RotateCcw size={15} aria-hidden="true" />Descartar</OutlineButton>}
          {canEdit && <PrimaryButton aria-disabled={!saveBlocked && issues.length > 0 ? true : undefined} disabled={saveBlocked} data-blocked={issues.length > 0 || undefined} className={styles.saveButton} onClick={() => void save()}><Save size={16} aria-hidden="true" />Salvar alterações</PrimaryButton>}
        </div>
      </div>

      {!SHOWCASE_V2_WRITES_ENABLED ? <p className={styles.readOnly} role="note">Atualização de compatibilidade: consulta e prévias disponíveis. A edição será liberada após a verificação dos leitores publicados.</p> : !canEdit && <p className={styles.readOnly} role="note">Perfil somente leitura: campos, inclusão, ordenação, uploads e salvamento estão bloqueados.</p>}
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
        <fieldset className={styles.editorColumn} disabled={busy || state.phase === 'uncertain'} style={{ margin: 0, padding: 0, border: 0, minWidth: 0 }} aria-label="Conteúdo da configuração">
          {tab === 'banner' && <BannerTab images={state.draft.banner.images} showErrors={showErrors} />}
          {tab !== 'banner' && <SectionsTab sections={state.draft.sections} issues={issues} tenantId={tenantId} onNavigate={navigate} onLocalEdit={onLocalEdit} />}
        </fieldset>
        <PreviewPanel title={preview.title} subtitle={preview.subtitle} viewport={viewport} onViewport={setViewport} footer={preview.footer}>
          {preview.body}
        </PreviewPanel>
      </div>

      {fullPreview && <Dialog title="Prévia completa da vitrine" description={dirty ? 'Rascunho com alterações ainda não salvas.' : 'Prévia da configuração carregada.'} size="lg" onClose={() => setFullPreview(false)} footer={<OutlineButton onClick={() => setFullPreview(false)}>Fechar prévia</OutlineButton>}>
        <PreviewPanel title="Vitrine" viewport={viewport} onViewport={setViewport} footer="Os botões comerciais desta prévia são demonstrativos.">
          <PreviewFrame viewport={viewport} label="Prévia completa"><ShowcaseView document={state.draft} idPrefix="previa-completa" embedded headingOffset={2} editorPlaceholders portfolioNote={false} /></PreviewFrame>
        </PreviewPanel>
      </Dialog>}

      {confirmDiscard && <Dialog title="Descartar alterações?" description={state.stored.configured ? `O editor volta para a versão salva (revisão ${state.stored.revision}).` : 'O editor volta para a configuração inicial vazia.'} icon={RotateCcw} tone="warning" onClose={() => setConfirmDiscard(false)}
        footer={<><OutlineButton onClick={() => setConfirmDiscard(false)}>Continuar editando</OutlineButton><PrimaryButton onClick={() => { if (canEdit) discardDraft(actor); setShowErrors(false); setConfirmDiscard(false) }}>Descartar alterações</PrimaryButton></>}>
        <p className={styles.dialogText}>Cards, imagens e textos não salvos serão perdidos. Nada é removido da origem nem de arquivos.</p>
      </Dialog>}
      {guard.pending && <LeaveDialog prompt={guard.pending} onStay={guard.cancel} onConfirm={guard.confirm} busy={guard.confirming} />}
    </>
  )
}

/** Only confirmed Backend results can be presented as saved. */
export function SaveFeedback() {
  const state = useShowcaseState()
  const { actor, canEdit } = useShowcaseActor()
  if (state.phase === 'idle') return null
  if (state.phase === 'uncertain') return <section className={styles.conflict} role="alert"><h2>Salvamento sem confirmação</h2><p>{state.message}</p><p>O rascunho foi preservado. Confira a versão no servidor antes de tentar salvar novamente.</p><OutlineButton onClick={() => void reconcileDraft(actor)}>Conferir versão salva</OutlineButton></section>
  if (state.phase === 'conflict') {
    return (
      <section className={styles.conflict} role="alert" aria-labelledby="vitrine-conflito">
        <h2 id="vitrine-conflito"><AlertTriangle size={18} aria-hidden="true" />Conflito de versão</h2>
        <p>{state.message}</p>
        <p className={styles.hint}>Sem sobrescrita forçada: revise o rascunho (a prévia continua disponível) e recarregue a versão atual para reaplicar as mudanças.</p>
        <div className={styles.inlineActions}>
          <OutlineButton disabled={!canEdit} onClick={() => discardDraft(actor)}>Descartar meu rascunho e carregar a versão atual</OutlineButton>
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
