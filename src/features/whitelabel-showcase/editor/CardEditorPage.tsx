import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, CircleAlert, Info, LoaderCircle, RotateCcw, Save, Upload } from 'lucide-react'
import { Dialog } from '../../../components/ui/Dialog'
import { OutlineButton } from '../../../components/ui/OutlineButton'
import { PrimaryButton } from '../../../components/ui/PrimaryButton'
import { isShowcaseFamilyHash, showcaseEditorHref } from '../showcaseMapping'
import { copyForOwner, hasMedia, mediaUrl, releaseRefs, resolveMedia, retainRefs, UPLOAD_GUIDANCE } from '../showcaseMedia'
import {
  applyRestore,
  cloneDocument,
  DEFAULT_FIELD_LABELS,
  isHexColor,
  restorePlan,
  sameDocument,
  sourceLabel,
  type CardInstance,
  type DefaultField,
  type RestoreChange,
  type SourceDefaults,
} from '../showcaseModel'
import { readSource } from '../showcaseSourceLookup'
import { discardDraft, getShowcaseState, isDraftDirty, replaceCard, useShowcaseState } from '../showcaseStore'
import { cardWarnings, fieldIds, validateCard } from '../showcaseValidation'
import { ShowcaseView } from '../public/ShowcaseView'
import { SOURCE_STATUS_MESSAGES, useShowcaseActor, useSourceStates } from './editorHooks'
import { ImageListEditor } from './ImageListEditor'
import { MediaPickerDialog } from './MediaPickerDialog'
import { PreviewFrame, PreviewPanel, type PreviewViewport } from './PreviewPanel'
import { showcaseCrumbs } from './showcaseCrumbs'
import { ScopeBar, ShowcaseFrame } from './ShowcaseFrame'
import { LeaveDialog, SaveFeedback } from './ShowcaseSettingsPage'
import { cardLogoutPrompt } from './showcaseNavigation'
import { useShowcaseLeaveGuard, type LeavePrompt } from './useShowcaseLeaveGuard'
import styles from './ShowcaseEditor.module.css'

const order = (index: number) => String(index + 1).padStart(2, '0')

export function CardEditorPage({ tenantId, instanceId, focusField }: { tenantId: string; instanceId: string; focusField?: string }) {
  const state = useShowcaseState()
  const index = state.draft.cards.findIndex(card => card.instanceId === instanceId)
  const card = index >= 0 ? state.draft.cards[index] : null
  const listHref = showcaseEditorHref(tenantId, 'cards')
  return (
    <ShowcaseFrame
      tenantId={tenantId}
      title={card ? `Editar card · ${card.displayName || 'sem nome'}` : 'Editar card'}
      crumbs={showcaseCrumbs(tenantId, [{ label: 'Vitrine de White Labels', href: showcaseEditorHref(tenantId) }, { label: 'Cards', href: listHref }, { label: card ? `Instância ${order(index)}` : 'Instância' }])}
    >
      {card
        ? <CardEditor key={instanceId} tenantId={tenantId} draftCard={card} position={index} focusField={focusField} />
        : <div className={styles.blocked} role="alert"><CircleAlert size={24} aria-hidden="true" /><h2>Card não encontrado no rascunho</h2><p>Ele pode ter sido removido ou descartado. Nenhuma White Label de origem foi alterada.</p><a className={styles.inlineLink} href={listHref}>Voltar à lista de cards</a></div>}
    </ShowcaseFrame>
  )
}

function CardEditor({ tenantId, draftCard, position, focusField }: { tenantId: string; draftCard: CardInstance; position: number; focusField?: string }) {
  const { actor, canEdit } = useShowcaseActor()
  const [card, setCard] = useState<CardInstance>(() => cloneDocument(draftCard))
  const [viewport, setViewport] = useState<PreviewViewport>('desktop')
  const [logoPicker, setLogoPicker] = useState(false)
  const [logoWarnings, setLogoWarnings] = useState<string[]>([])
  const [applied, setApplied] = useState(false)
  const [restore, setRestore] = useState<{ phase: 'loading' } | { phase: 'ready'; defaults: SourceDefaults; plan: RestoreChange[] } | { phase: 'error'; message: string } | null>(null)
  const sourceState = useSourceStates([draftCard.source])(draftCard.source)
  const pageState = useShowcaseState()
  const cardDirty = !sameDocument(card, draftCard)
  const issues = validateCard(card, hasMedia)
  const warnings = cardWarnings(card)
  const listHref = showcaseEditorHref(tenantId, 'cards')
  const cardRef = useRef(card)
  useEffect(() => { cardRef.current = card })

  // Keep the local card in sync when the draft changes underneath (e.g. discard) and nothing is pending here.
  const [syncedFrom, setSyncedFrom] = useState(draftCard)
  if (syncedFrom !== draftCard) {
    setSyncedFrom(draftCard)
    if (sameDocument(card, syncedFrom)) setCard(cloneDocument(draftCard))
  }

  // Unapplied local media stay alive while this editor is open.
  useEffect(() => {
    retainRefs(`card-editor:${card.instanceId}`, [...card.images.map(image => image.assetRef), ...(card.logo ? [card.logo.assetRef] : [])])
  }, [card])
  useEffect(() => () => releaseRefs(`card-editor:${draftCard.instanceId}`), [draftCard.instanceId])

  useEffect(() => {
    if (focusField) window.setTimeout(() => document.getElementById(focusField)?.focus(), 150)
  }, [focusField])

  const assess = (hash: string): LeavePrompt | null => {
    // Without the edit profile nothing can be edited or discarded here: navigation keeps the tab memory as is.
    if (!canEdit) return null
    const pageDirty = isDraftDirty(getShowcaseState())
    const localDirty = !sameDocument(cardRef.current, draftCard)
    if (!isShowcaseFamilyHash(hash)) {
      if (!pageDirty && !localDirty) return null
      return { title: 'Descartar alterações não salvas?', description: 'Ao sair da Vitrine de White Labels, as alterações deste card e o rascunho da vitrine nesta aba serão descartados.', confirmLabel: 'Descartar e sair', onConfirm: () => discardDraft(actor) }
    }
    if (!localDirty) return null
    return { title: 'Descartar alterações deste card?', description: 'As alterações ainda não aplicadas ao rascunho serão perdidas. O rascunho da vitrine e os outros cards não mudam.', confirmLabel: 'Descartar alterações do card', onConfirm: () => setCard(cloneDocument(draftCard)) }
  }
  // Reload/close: the tab draft is protected by MockApp; this screen adds its own unapplied card fields.
  // Logout: asked before the session is cleared; only the unapplied fields would be lost (the tab draft stays).
  const guard = useShowcaseLeaveGuard(assess, cardDirty, () => cardLogoutPrompt(!sameDocument(cardRef.current, draftCard), () => setCard(cloneDocument(draftCard))))

  const update = (patch: Partial<CardInstance>) => {
    if (!canEdit) return
    setApplied(false)
    setCard(current => ({ ...current, ...patch }))
  }

  function apply() {
    if (!canEdit || !cardDirty) return
    if (replaceCard(actor, card)) setApplied(true)
  }

  async function openRestore() {
    if (!canEdit) return
    setRestore({ phase: 'loading' })
    const source = await readSource(card.source)
    if (source.status !== 'active' || !source.defaults) {
      setRestore({ phase: 'error', message: source.status === 'active' ? 'A origem não informa padrões para logotipo, cores ou descrição. Nenhum valor foi alterado.' : SOURCE_STATUS_MESSAGES[source.status] ?? 'Origem indisponível.' })
      return
    }
    setRestore({ phase: 'ready', defaults: source.defaults, plan: restorePlan(card, source.defaults) })
  }

  const sourceDefaultsAvailable = sourceState.status === 'active' && !!sourceState.defaults && (sourceState.defaults.logo || sourceState.defaults.colors || sourceState.defaults.shortDescription)
  const sourceWarning = sourceState.status !== 'loading' && sourceState.status !== 'active' ? SOURCE_STATUS_MESSAGES[sourceState.status] : undefined
  const logoUrl = mediaUrl(card.logo?.assetRef)
  const logoEntry = card.logo ? resolveMedia(card.logo.assetRef) : undefined
  const copied = card.copiedDefaults
  const invalid = (fieldId: string) => issues.some(issue => issue.fieldId === fieldId) || undefined

  return (
    <>
      <div className={styles.toolbar}>
        <ScopeBar />
        <div className={styles.actions}>
          <a className={styles.outlineLink} href={listHref}><ArrowLeft size={15} aria-hidden="true" />Voltar à lista</a>
          {canEdit && <div className={styles.applyGroup}>
            <PrimaryButton disabled={!cardDirty} onClick={apply}><Save size={16} aria-hidden="true" />Aplicar ao rascunho</PrimaryButton>
            <small>Alterações locais até salvar a vitrine</small>
          </div>}
        </div>
      </div>
      {!canEdit && <p className={styles.readOnly} role="note">Perfil somente leitura (simulação): este card pode ser consultado, mas não alterado. A autorização real dependerá do Backend.</p>}
      {applied && !cardDirty && <p className={styles.feedback} data-tone="success" role="status"><span>Alterações aplicadas ao rascunho da vitrine. Use “Salvar alterações” na vitrine para gravar na simulação.</span><a className={styles.inlineLink} href={listHref}>Ir para a vitrine</a></p>}
      {cardDirty && <p className={styles.blockedNote} role="status"><Info size={16} aria-hidden="true" />Este card tem alterações locais ainda não aplicadas ao rascunho.</p>}
      <SaveFeedback />

      <div className={styles.workspace}>
        <div className={styles.editorColumn}>
          <section className={styles.panel} aria-labelledby="card-origem-titulo">
            <header className={styles.panelHead}><h2 className={styles.panelTitle} id="card-origem-titulo">Origem e conteúdo</h2></header>
            <p className={styles.originLine}>
              <span>Origem:</span><span className={styles.chip}>{sourceLabel(card.source)}</span>
              <span aria-hidden="true">•</span><span>Esta instância é independente dos demais cards.</span>
            </p>
            {card.source.logical && <p className={styles.hint}>Origem lógica WL{card.source.logical.whitelabelId} · {card.source.logical.slug}, representada pela fixture mock #{card.source.whitelabelId} ({card.source.slug}).</p>}
            {sourceWarning && <p className={styles.warningBox} role="note"><CircleAlert size={16} aria-hidden="true" />{sourceWarning}</p>}
            <p className={styles.infoBox}>
              <Info size={16} aria-hidden="true" />
              {copied.fields.length === 0
                ? 'Logo, cores e descrição canônicos não informados. Conteúdo personalizado neste card.'
                : `Valores iniciais copiados de padrões simulados da origem (versão ${copied.sourceVersion}): ${copied.fields.map(field => DEFAULT_FIELD_LABELS[field]).join(', ')}.${copied.missing.length ? ` Não informados: ${copied.missing.map(field => DEFAULT_FIELD_LABELS[field]).join(', ')}.` : ''} Edições aqui não alteram a origem.`}
            </p>

            <div className={styles.form}>
              <label className={styles.field}>Título interno
                <input value={card.internalTitle} readOnly={!canEdit} onChange={event => update({ internalTitle: event.target.value })} />
                <small className={styles.hint}>Visível somente no Super Admin; diferencia cards da mesma origem.</small>
              </label>
              <label className={styles.field}>Nome exibido
                <input id={fieldIds.cardDisplayName} value={card.displayName} readOnly={!canEdit} aria-invalid={invalid(fieldIds.cardDisplayName)} onChange={event => update({ displayName: event.target.value })} />
                <small className={styles.hint}>Nome acessível do card e do botão “Conhecer plataforma”; sugestão para o texto alternativo do logotipo.</small>
              </label>
              <label className={styles.field}>Descrição curta
                <input id={fieldIds.cardDescription} value={card.shortDescription} readOnly={!canEdit} aria-invalid={invalid(fieldIds.cardDescription)} onChange={event => update({ shortDescription: event.target.value })} />
              </label>

              <div className={styles.brandRow}>
                <fieldset className={styles.colors} id={fieldIds.cardColors} tabIndex={-1}>
                  <legend>Cores da marca (editáveis)</legend>
                  {(['panel', 'divider'] as const).map(key => (
                    <div key={key} className={styles.colorField}>
                      <input type="color" aria-label={`${key === 'panel' ? 'Cor do painel' : 'Cor do divisor'} — seletor`} value={isHexColor(card.colors[key]) ? card.colors[key] : '#000000'} disabled={!canEdit} onChange={event => update({ colors: { ...card.colors, [key]: event.target.value.toUpperCase() } })} />
                      <label>{key === 'panel' ? 'Painel' : 'Divisor'}
                        <input value={card.colors[key]} readOnly={!canEdit} spellCheck={false} maxLength={7} aria-invalid={!isHexColor(card.colors[key]) || undefined} onChange={event => update({ colors: { ...card.colors, [key]: event.target.value.toUpperCase() } })} />
                      </label>
                    </div>
                  ))}
                  {warnings.map(warning => <p key={warning.message} className={styles.warningText}>{warning.message}</p>)}
                </fieldset>

                <div className={styles.logoField}>
                  <span className={styles.fieldLabel}>Logotipo</span>
                  <div className={styles.logoPreview} style={{ background: isHexColor(card.colors.panel) ? card.colors.panel : undefined }} id={fieldIds.cardLogo} tabIndex={-1}>
                    {logoUrl ? <img src={logoUrl} alt="" width={logoEntry?.width ?? undefined} height={logoEntry?.height ?? undefined} /> : <span>Sem logotipo</span>}
                  </div>
                  {canEdit && <OutlineButton onClick={() => setLogoPicker(true)}><Upload size={15} aria-hidden="true" />{card.logo ? 'Substituir logo' : 'Adicionar logo'}</OutlineButton>}
                  <small className={styles.hint}>{UPLOAD_GUIDANCE.logo.summary}</small>
                  {card.logo && <small className={styles.hint}>{card.logo.origin === 'copia-simulada-da-origem' ? `Cópia simulada para o proprietário (origem versão ${card.logo.copiedFrom?.version}); a referência da origem não é reutilizada.` : card.logo.origin === 'upload' ? 'Envio simulado nesta aba.' : 'Exemplo aprovado (mock).'} {card.logo.fileName}</small>}
                  {logoWarnings.length ? <ul className={styles.warningList}>{logoWarnings.map(text => <li key={text}>{text}</li>)}</ul> : null}
                </div>
              </div>

              {card.logo && <div className={styles.field}>
                <label htmlFor={fieldIds.cardLogoAlt}>Texto alternativo do logotipo</label>
                <div className={styles.lookupRow}>
                  <input id={fieldIds.cardLogoAlt} value={card.logo.alt} readOnly={!canEdit} aria-invalid={invalid(fieldIds.cardLogoAlt)} onChange={event => card.logo && update({ logo: { ...card.logo, alt: event.target.value } })} />
                  {canEdit && <OutlineButton disabled={!card.displayName.trim() || card.logo.alt === card.displayName} onClick={() => card.logo && update({ logo: { ...card.logo, alt: card.displayName } })}>Usar nome exibido</OutlineButton>}
                </div>
                <small className={styles.hint}>O logotipo identifica a plataforma; ajuste o texto se a marca exibir outras palavras.</small>
              </div>}

              <div className={styles.restoreRow}>
                <OutlineButton disabled={!canEdit || !sourceDefaultsAvailable} onClick={() => void openRestore()}><RotateCcw size={15} aria-hidden="true" />Restaurar padrões da origem</OutlineButton>
                <small className={styles.hint}>{sourceDefaultsAvailable ? 'Substitui somente campos com padrão disponível, apenas neste card, após confirmação.' : 'Disponível quando houver padrões canônicos.'}</small>
              </div>
            </div>
          </section>

          <section className={styles.panel} aria-labelledby="card-fotos-titulo">
            <header className={styles.panelHead}><h2 className={styles.panelTitle} id="card-fotos-titulo">Fotografias</h2></header>
            <ImageListEditor images={card.images} purpose="foto" listId={fieldIds.cardImages} readOnly={!canEdit} showErrors={issues.some(issue => issue.fieldId === fieldIds.cardImages)} onChange={images => update({ images })} />
          </section>

          {issues.length > 0 && <section className={styles.cardIssues} aria-labelledby="card-pendencias">
            <h2 id="card-pendencias"><CircleAlert size={17} aria-hidden="true" />Este card ainda não pode ser salvo.</h2>
            <ul>{issues.map((issue, index) => <li key={`${issue.message}-${index}`}><button type="button" className={styles.linkButton} onClick={() => document.getElementById(issue.fieldId ?? '')?.focus()}>{issue.message.replace(/^[^:]+:\s*/, '')}</button></li>)}</ul>
            <p className={styles.hint}>A última configuração válida permanece salva na simulação. O card pode ser aplicado ao rascunho incompleto e concluído depois.</p>
          </section>}
        </div>

        <PreviewPanel title="Prévia do card" subtitle={cardDirty ? 'Alterações locais deste card' : 'Igual ao rascunho da vitrine'} viewport={viewport} onViewport={setViewport} footer={<>
          <span>CTA demonstrativo preservado.</span>
          <span className={styles.infoBox}><Info size={16} aria-hidden="true" />Substituir afeta somente este card. Remover daqui não apaga imagens usadas em outros lugares.</span>
        </>}>
          <PreviewFrame viewport={viewport} label="Prévia do card">
            <ShowcaseView document={{ ...pageState.draft, cards: [card] }} sections={['portfolio']} idPrefix="previa-card" embedded headingOffset={2} portfolioHeading={false} portfolioNote={false} editorPlaceholders />
          </PreviewFrame>
        </PreviewPanel>
      </div>

      {logoPicker && <MediaPickerDialog purpose="logo" title={card.logo ? 'Substituir logotipo' : 'Adicionar logotipo'} onClose={() => setLogoPicker(false)} onPicked={media => {
        setLogoPicker(false)
        setLogoWarnings(media.warnings)
        const origin = resolveMedia(media.assetRef)?.origin === 'upload-simulado' ? 'upload' : 'exemplo-aprovado'
        update({ logo: { assetRef: media.assetRef, fileName: media.fileName, alt: card.logo?.alt || card.displayName, origin } })
        window.requestAnimationFrame(() => document.getElementById(fieldIds.cardLogoAlt)?.focus())
      }} />}

      {restore && <RestoreDialog
        state={restore}
        cardLabel={`Instância ${order(position)} · ${card.displayName || 'sem nome'}`}
        onClose={() => setRestore(null)}
        onConfirm={(fields) => {
          if (restore.phase !== 'ready' || !canEdit) return
          update(applyRestore(card, restore.defaults, fields, copyForOwner))
          setRestore(null)
        }}
      />}
      {guard.pending && <LeaveDialog prompt={guard.pending} onStay={guard.cancel} onConfirm={guard.confirm} />}
    </>
  )
}

function RestoreDialog({ state, cardLabel, onClose, onConfirm }: {
  state: { phase: 'loading' } | { phase: 'ready'; defaults: SourceDefaults; plan: RestoreChange[] } | { phase: 'error'; message: string }
  cardLabel: string
  onClose: () => void
  onConfirm: (fields: DefaultField[]) => void
}) {
  const [selected, setSelected] = useState<DefaultField[] | null>(null)
  const plan = state.phase === 'ready' ? state.plan : []
  const chosen = selected ?? plan.map(change => change.field)
  const unavailable = state.phase === 'ready' ? (['logo', 'colors', 'shortDescription'] as const).filter(field => !state.defaults[field]) : []
  return (
    <Dialog
      title="Restaurar padrões da origem?"
      description={`Somente ${cardLabel} será alterado, depois de “Aplicar ao rascunho”. Fotografias, ordem, nome exibido, título interno e CTA não são restaurados.`}
      icon={RotateCcw}
      tone="warning"
      size="lg"
      onClose={onClose}
      footer={<>
        <OutlineButton onClick={onClose}>Cancelar</OutlineButton>
        <PrimaryButton disabled={state.phase !== 'ready' || chosen.length === 0} onClick={() => onConfirm(chosen)}>Restaurar campos selecionados</PrimaryButton>
      </>}
    >
      {state.phase === 'loading' && <p className={styles.loadingLine}><LoaderCircle size={18} className={styles.spin} aria-hidden="true" />Consultando a origem novamente…</p>}
      {state.phase === 'error' && <p className={styles.errorText} role="alert">{state.message}</p>}
      {state.phase === 'ready' && <>
        {plan.length === 0
          ? <p className={styles.dialogText}>Os valores atuais já correspondem aos padrões disponíveis da origem (versão {state.defaults.version}). Nada será alterado.</p>
          : <ul className={styles.restoreList}>{plan.map(change => (
            <li key={change.field}>
              <label className={styles.checkField}>
                <input type="checkbox" checked={chosen.includes(change.field)} onChange={event => setSelected(event.target.checked ? [...chosen, change.field] : chosen.filter(field => field !== change.field))} />
                <strong>{change.label}</strong>
              </label>
              <span>Atual: {change.current}</span>
              <span>Padrão da origem: {change.next}</span>
            </li>
          ))}</ul>}
        {unavailable.length > 0 && <p className={styles.hint}>Sem padrão na origem (valor atual mantido): {unavailable.map(field => DEFAULT_FIELD_LABELS[field]).join(', ')}.</p>}
        <p className={styles.hint}>Padrões simulados (fixture, versão {state.defaults.version}); não são campos verificados do Backend. Logotipos são copiados para o proprietário como nova referência.</p>
      </>}
    </Dialog>
  )
}
