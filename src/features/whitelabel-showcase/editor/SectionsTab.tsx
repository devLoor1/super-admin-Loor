import { useEffect, useRef, useState, type DragEvent } from 'react'
import { ArrowDown, ArrowUp, GripVertical, Image, Pencil, Plus, Trash2, Type } from 'lucide-react'
import { Dialog } from '../../../components/ui/Dialog'
import { OutlineButton } from '../../../components/ui/OutlineButton'
import { PrimaryButton } from '../../../components/ui/PrimaryButton'
import { cloneDocument, createCardInstance, createTextSection, MAX_SECTIONS, sameDocument, sourceLabel, type CardSource, type ShowcaseSection, type TextSection } from '../showcaseModel'
import { showcaseCardHref } from '../showcaseMapping'
import { addCard, addText, replaceText, moveSectionTo, removeSection } from '../showcaseStore'
import { fieldIds, validateText, type ShowcaseIssue } from '../showcaseValidation'
import { useShowcaseActor, useSourceStates, SOURCE_STATUS_MESSAGES } from './editorHooks'
import { MarkdownField } from './MarkdownField'
import { SourceLookupDialog } from './SourceLookupDialog'
import styles from './Sections.module.css'

export type LocalSectionEdit = { dirty: boolean; discard: () => void }
const titleOf = (section: ShowcaseSection) => section.type === 'text' ? section.title || 'Texto sem título' : section.internalTitle || section.displayName || 'Card sem nome'
type Editing = { base: TextSection; value: TextSection; fresh: boolean }

/** Approved Card/Texto interaction, bound only to the operational draft and real source lookup. */
export function SectionsTab({ sections, tenantId, onNavigate, onLocalEdit, issues }: {
  sections: readonly ShowcaseSection[]; tenantId: string; onNavigate: (hash: string) => void
  onLocalEdit: (edit: LocalSectionEdit | null) => void; issues: readonly ShowcaseIssue[]
}) {
  const { actor, canEdit } = useShowcaseActor()
  const [adding, setAdding] = useState(false)
  const [lookup, setLookup] = useState(false)
  const [editing, setEditing] = useState<Editing | null>(null)
  const [confirmClose, setConfirmClose] = useState(false)
  const [removing, setRemoving] = useState<ShowcaseSection | null>(null)
  const [errors, setErrors] = useState<string[]>([])
  const [announcement, setAnnouncement] = useState('')
  const dragging = useRef<string | null>(null)
  const title = useRef<HTMLInputElement>(null)
  const cards = sections.filter(section => section.type === 'card')
  const sourceState = useSourceStates(cards.map(card => card.source))
  const dirty = !!editing && !sameDocument(editing.base, editing.value)
  useEffect(() => { onLocalEdit({ dirty, discard: () => { setEditing(null); setConfirmClose(false) } }) }, [dirty, onLocalEdit])
  useEffect(() => () => onLocalEdit(null), [onLocalEdit])

  function edit(value: TextSection, fresh = false) { setAdding(false); setErrors([]); setEditing({ base: cloneDocument(value), value: cloneDocument(value), fresh }) }
  function close() { if (dirty) setConfirmClose(true); else setEditing(null) }
  function apply() {
    if (!canEdit || !editing) return
    const problems = validateText(editing.value).map(issue => issue.message)
    setErrors(problems)
    if (!problems.length && (editing.fresh ? addText(actor, editing.value) : replaceText(actor, editing.value))) setEditing(null)
  }
  function change(field: 'title' | 'subtitle' | 'bodyMarkdown', value: string) {
    if (canEdit) setEditing(current => current ? { ...current, value: { ...current.value, [field]: value } } : current)
  }
  function addSource(source: CardSource) {
    if (!canEdit || sections.length >= MAX_SECTIONS) return
    const card = createCardInstance({ source })
    if (addCard(actor, card)) { setLookup(false); onNavigate(showcaseCardHref(tenantId, card.instanceId)) }
  }
  function move(id: string, index: number) {
    if (canEdit && index >= 0 && index < sections.length && moveSectionTo(actor, id, index)) setAnnouncement(`Elemento movido para a posição ${index + 1} de ${sections.length}.`)
  }
  function drop(event: DragEvent, index: number) { event.preventDefault(); if (canEdit && dragging.current) move(dragging.current, index); dragging.current = null }

  return <section aria-label="Lista de elementos">
    <header className={styles.listHeader}><div><h2>Conteúdo da vitrine</h2><p>A ordem aqui é a ordem na página.</p></div><PrimaryButton disabled={!canEdit || sections.length >= MAX_SECTIONS} onClick={() => setAdding(true)}><Plus size={16} />Adicionar elemento</PrimaryButton></header>
    <p className={styles.listHint}>Arraste pela alça ou use as setas. Os campos aparecem ao editar.</p>
    {sections.length ? <ol id={fieldIds.sectionsList} tabIndex={-1} className={styles.list} aria-label="Elementos ordenados da vitrine">
      {sections.map((section, index) => {
        const sectionIssues = issues.filter(issue => issue.instanceId === section.instanceId)
        const warning = section.type === 'card' ? SOURCE_STATUS_MESSAGES[sourceState(section.source).status as keyof typeof SOURCE_STATUS_MESSAGES] : null
        return <li key={section.instanceId} className={styles.row} data-element-id={section.instanceId} onDragOver={event => { if (canEdit && dragging.current) event.preventDefault() }} onDrop={event => drop(event, index)}>
          <button type="button" className={styles.grip} disabled={!canEdit} draggable={canEdit} aria-label={`Arrastar ${titleOf(section)}; Alt e setas para mover`}
            onDragStart={event => { if (!canEdit) { event.preventDefault(); return }; dragging.current = section.instanceId; event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setData('text/plain', section.instanceId) }} onDragEnd={() => { dragging.current = null }}
            onKeyDown={event => { if (canEdit && event.altKey && ['ArrowUp', 'ArrowDown'].includes(event.key)) { event.preventDefault(); move(section.instanceId, index + (event.key === 'ArrowUp' ? -1 : 1)) } }}><GripVertical size={18} /></button>
          <div className={styles.rowCopy}><span className={styles.typeBadge} data-type={section.type}>{section.type === 'text' ? <Type size={13} /> : <Image size={13} />}{section.type === 'text' ? 'Texto' : 'Card'}</span><h3>{titleOf(section)}</h3><p>{section.type === 'text' ? section.subtitle || section.bodyMarkdown : section.shortDescription}</p>{section.type === 'card' && <small>Origem: {sourceLabel(section.source)}</small>}{warning && <small>{warning}</small>}{sectionIssues.length > 0 && <small>{sectionIssues.length} pendência(s) impedem salvar.</small>}</div>
          <div className={styles.rowActions}>
            <button type="button" disabled={!canEdit || index === 0} aria-label={`Mover ${titleOf(section)} para cima`} onClick={() => move(section.instanceId, index - 1)}><ArrowUp size={15} /></button>
            <button type="button" disabled={!canEdit || index === sections.length - 1} aria-label={`Mover ${titleOf(section)} para baixo`} onClick={() => move(section.instanceId, index + 1)}><ArrowDown size={15} /></button>
            <button id={`section-edit-${section.instanceId}`} type="button" aria-label={`${canEdit ? 'Editar' : 'Consultar'} ${titleOf(section)}`} onClick={() => section.type === 'text' ? edit(section) : onNavigate(showcaseCardHref(tenantId, section.instanceId))}><Pencil size={15} /></button>
            <button type="button" disabled={!canEdit} aria-label={`Remover ${titleOf(section)}`} onClick={() => setRemoving(section)}><Trash2 size={15} /></button>
          </div>
        </li>
      })}
    </ol> : <p className={styles.listHint}>Nenhum elemento adicionado. Inclua pelo menos um card antes de salvar.</p>}
    <p className={styles.listFoot}>{sections.length} de {MAX_SECTIONS} seções · limite técnico do contrato. Cada card mantém sua origem e identidade próprias.</p>
    <p className="visually-hidden" aria-live="polite">{announcement}</p>
    {adding && <Dialog title="Adicionar elemento" description="Escolha o conteúdo. A posição poderá ser alterada depois." onClose={() => setAdding(false)} footer={<OutlineButton onClick={() => setAdding(false)}>Cancelar</OutlineButton>}><div className={styles.typeChoices}><button disabled={!canEdit} type="button" onClick={() => edit(createTextSection(), true)}><Type size={26} /><strong>Texto</strong><span>Título, subtítulo opcional e Markdown.</span></button><button disabled={!canEdit} type="button" onClick={() => { setAdding(false); setLookup(true) }}><Image size={26} /><strong>Card</strong><span>Escolha a origem real por slug. Personalizações são independentes.</span></button></div></Dialog>}
    {lookup && <SourceLookupDialog existingSources={cards.map(card => card.source)} canEdit={canEdit} onAdd={addSource} onClose={() => setLookup(false)} />}
    {editing && <Dialog title={`${canEdit ? editing.fresh ? 'Adicionar' : 'Editar' : 'Consultar'} texto`} description="A prévia muda depois de aplicar à lista. Salvar a vitrine grava a configuração." initialFocusRef={title} size="lg" onClose={close} footer={<><OutlineButton onClick={close}>{canEdit ? 'Cancelar edição' : 'Fechar consulta'}</OutlineButton>{canEdit && <PrimaryButton onClick={apply}>Aplicar à lista</PrimaryButton>}</>}>
      <div className={styles.form}><label>Título *<input id={fieldIds.textTitle} ref={title} value={editing.value.title} readOnly={!canEdit} aria-required="true" onChange={event => change('title', event.target.value)} /><small>{editing.value.title.length}/240 caracteres</small></label><label>Subtítulo <small>opcional</small><input id={fieldIds.textSubtitle} value={editing.value.subtitle} readOnly={!canEdit} onChange={event => change('subtitle', event.target.value)} /><small>{editing.value.subtitle.length}/500 caracteres</small></label><label htmlFor={fieldIds.textBody}>Conteúdo *</label><MarkdownField id={fieldIds.textBody} value={editing.value.bodyMarkdown} readOnly={!canEdit} invalid={errors.length > 0} onChange={value => change('bodyMarkdown', value)} /><p>{editing.value.bodyMarkdown.length}/20000 caracteres</p>{errors.length > 0 && <ul role="alert" className={styles.errors}>{errors.map((error, index) => <li key={index}>{error}</li>)}</ul>}</div>
    </Dialog>}
    {confirmClose && <Dialog title="Descartar edição local?" description="Os campos ainda não aplicados serão descartados. A composição já aplicada à lista permanece neste rascunho." onClose={() => setConfirmClose(false)} footer={<><OutlineButton onClick={() => setConfirmClose(false)}>Continuar editando</OutlineButton><PrimaryButton onClick={() => { setEditing(null); setConfirmClose(false) }}>Descartar edição</PrimaryButton></>}><p>A configuração salva no servidor permanece.</p></Dialog>}
    {removing && <Dialog title="Remover este elemento?" description={titleOf(removing)} tone="warning" onClose={() => setRemoving(null)} footer={<><OutlineButton onClick={() => setRemoving(null)}>Cancelar</OutlineButton><PrimaryButton disabled={!canEdit} onClick={() => { if (canEdit) removeSection(actor, removing.instanceId); setRemoving(null) }}>Remover da lista</PrimaryButton></>}><p>Remove somente este elemento do rascunho. Origem e arquivos não são apagados. A alteração depende de salvar a vitrine.</p></Dialog>}
  </section>
}
