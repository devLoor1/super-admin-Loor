import { useEffect, useRef, useState, type DragEvent } from 'react'
import { ArrowUpDown, CircleAlert, Ellipsis, GripVertical, ImageOff, Images, Info, Pencil, Plus, Trash2 } from 'lucide-react'
import { Dialog } from '../../../components/ui/Dialog'
import { OutlineButton } from '../../../components/ui/OutlineButton'
import { PrimaryButton } from '../../../components/ui/PrimaryButton'
import { showcaseCardHref } from '../showcaseMapping'
import { copyForOwner, mediaUrl } from '../showcaseMedia'
import { createCardInstance, internalTitleChip, sourceLabel, type CardInstance, type CardSource, type SourceDefaults } from '../showcaseModel'
import { fieldIds, issuesForCard, type ShowcaseIssue } from '../showcaseValidation'
import { addCard, moveCardTo, removeCard } from '../showcaseStore'
import { SOURCE_STATUS_MESSAGES, useShowcaseActor, useSourceStates } from './editorHooks'
import { SourceLookupDialog } from './SourceLookupDialog'
import styles from './ShowcaseEditor.module.css'

const order = (index: number) => String(index + 1).padStart(2, '0')

function RowMenu({ index, total, label, disabled, onMove, onRemove }: { index: number; total: number; label: string; disabled: boolean; onMove: (to: number) => void; onRemove: () => void }) {
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const toggle = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    if (!open) return
    const outside = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false) }
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') { setOpen(false); toggle.current?.focus() } }
    document.addEventListener('pointerdown', outside)
    document.addEventListener('keydown', escape)
    return () => {
      document.removeEventListener('pointerdown', outside)
      document.removeEventListener('keydown', escape)
    }
  }, [open])
  const run = (action: () => void) => { setOpen(false); action(); toggle.current?.focus() }
  return (
    <div className={styles.menu} ref={root}>
      <button ref={toggle} type="button" className={styles.iconButton} aria-label={`Mais ações de ${label}`} aria-expanded={open} disabled={disabled} onClick={() => setOpen(value => !value)}><Ellipsis size={18} aria-hidden="true" /></button>
      {open && <div className={styles.menuList}>
        <button type="button" disabled={index === 0} onClick={() => run(() => onMove(index - 1))}>Mover para cima</button>
        <button type="button" disabled={index === total - 1} onClick={() => run(() => onMove(index + 1))}>Mover para baixo</button>
        <button type="button" className={styles.dangerItem} onClick={() => run(onRemove)}><Trash2 size={15} aria-hidden="true" />Remover card</button>
      </div>}
    </div>
  )
}

export function CardsTab({ cards, issues, tenantId, onNavigate, showErrors }: {
  cards: readonly CardInstance[]
  issues: readonly ShowcaseIssue[]
  tenantId: string
  onNavigate: (hash: string) => void
  showErrors: boolean
}) {
  const { actor, canEdit } = useShowcaseActor()
  const sourceState = useSourceStates(cards.map(card => card.source))
  const [lookupOpen, setLookupOpen] = useState(false)
  const [removing, setRemoving] = useState<CardInstance | null>(null)
  const [dragging, setDragging] = useState<number | null>(null)
  const [announcement, setAnnouncement] = useState('')

  function move(from: number, to: number) {
    if (to < 0 || to >= cards.length || !moveCardTo(actor, from, to)) return
    setAnnouncement(`${cards[from].displayName} movido para a posição ${to + 1} de ${cards.length}.`)
  }

  function add(source: CardSource, defaults: SourceDefaults | null) {
    // Checked before the instance (and its owner-scoped logo copy) is created; addCard checks again.
    if (!canEdit) return
    const card = createCardInstance({ source, defaults, copyLogo: copyForOwner })
    if (!addCard(actor, card)) return
    setLookupOpen(false)
    onNavigate(showcaseCardHref(tenantId, card.instanceId))
  }

  const onDrop = (event: DragEvent, to: number) => {
    event.preventDefault()
    if (dragging !== null) move(dragging, to)
    setDragging(null)
  }

  return (
    <section className={styles.panel} aria-labelledby="vitrine-cards-titulo">
      <header className={styles.panelHead}>
        <div>
          <h2 className={styles.panelTitle} id="vitrine-cards-titulo">Cards da vitrine</h2>
          <p className={styles.panelSubtitle}>Cada card é independente, mesmo quando a origem se repete.</p>
        </div>
        {canEdit && cards.length > 0 && <OutlineButton onClick={() => setLookupOpen(true)}><Plus size={16} aria-hidden="true" />Adicionar card</OutlineButton>}
      </header>

      {cards.length === 0 ? (
        <div className={styles.emptyState} id={fieldIds.cardsList} tabIndex={-1}>
          <Images size={40} strokeWidth={1.4} aria-hidden="true" />
          <h3>Nenhum card adicionado</h3>
          <p>Adicione uma White Label para começar.</p>
          {canEdit && <PrimaryButton onClick={() => setLookupOpen(true)}><Plus size={16} aria-hidden="true" />Adicionar card</PrimaryButton>}
          <p className={styles.hint}><Info size={14} aria-hidden="true" /> A mesma origem pode aparecer em mais de um card.</p>
          {showErrors && <p className={styles.errorText}>Uma vitrine salva precisa de ao menos um card válido. A lista vazia continua editável.</p>}
        </div>
      ) : (
        <ol className={styles.cardRows} id={fieldIds.cardsList} tabIndex={-1}>
          {cards.map((card, index) => {
            const cardIssues = issuesForCard(issues, card.instanceId)
            const thumb = card.images[0] ? mediaUrl(card.images[0].assetRef) : null
            const status = sourceState(card.source).status
            const warning = status !== 'loading' && status !== 'active' ? SOURCE_STATUS_MESSAGES[status] : undefined
            const chip = internalTitleChip(card)
            return (
              <li
                key={card.instanceId}
                className={styles.cardRow}
                data-dragging={dragging === index || undefined}
                onDragOver={event => { if (dragging !== null) event.preventDefault() }}
                onDrop={event => onDrop(event, index)}
              >
                <span
                  className={styles.handle}
                  aria-hidden="true"
                  draggable={canEdit}
                  onDragStart={event => {
                    setDragging(index)
                    event.dataTransfer.effectAllowed = 'move'
                    event.dataTransfer.setData('text/plain', card.instanceId)
                    const row = event.currentTarget.closest('li')
                    if (row) event.dataTransfer.setDragImage(row, 24, 24)
                  }}
                  onDragEnd={() => setDragging(null)}
                ><GripVertical size={18} /></span>
                <span className={styles.order} aria-hidden="true">{order(index)}</span>
                <span className={styles.cardThumb}>{thumb ? <img src={thumb} alt="" /> : <ImageOff size={20} aria-hidden="true" />}</span>
                <span className={styles.cardText}>
                  <strong><span className="visually-hidden">Card {order(index)}: </span>{card.displayName || 'Sem nome exibido'}</strong>
                  {chip && chip !== card.displayName ? <span className={styles.chip}>{chip}</span> : null}
                  <span className={styles.origin}>Origem: {sourceLabel(card.source)}</span>
                  {warning ? <span className={styles.warningText}><CircleAlert size={14} aria-hidden="true" />{warning}</span> : null}
                  {cardIssues.length ? <span className={styles.errorText}><CircleAlert size={14} aria-hidden="true" />{cardIssues.length === 1 ? '1 pendência impede salvar' : `${cardIssues.length} pendências impedem salvar`}</span> : null}
                </span>
                <span className={styles.cardActions}>
                  <a className={styles.outlineLink} href={showcaseCardHref(tenantId, card.instanceId)}><Pencil size={15} aria-hidden="true" />{canEdit ? 'Editar' : 'Consultar'}<span className="visually-hidden"> {card.displayName} ({chip})</span></a>
                  <RowMenu index={index} total={cards.length} label={`${card.displayName} (${chip})`} disabled={!canEdit} onMove={to => move(index, to)} onRemove={() => setRemoving(card)} />
                </span>
              </li>
            )
          })}
        </ol>
      )}
      {cards.length > 1 && <p className={styles.panelFoot}><ArrowUpDown size={16} aria-hidden="true" />Reordenar também pelo menu de cada card</p>}
      <p className="visually-hidden" aria-live="polite" aria-atomic="true">{announcement}</p>

      {lookupOpen && <SourceLookupDialog existingSources={cards.map(card => card.source)} canEdit={canEdit} onAdd={add} onClose={() => setLookupOpen(false)} />}
      {removing && <Dialog
        title={`Remover o card ${removing.displayName || 'sem nome'}?`}
        description="Remove somente esta instância do rascunho."
        icon={Trash2}
        tone="warning"
        onClose={() => setRemoving(null)}
        footer={<>
          <OutlineButton onClick={() => setRemoving(null)}>Cancelar</OutlineButton>
          <PrimaryButton onClick={() => { const label = removing.displayName; if (removeCard(actor, removing.instanceId)) setAnnouncement(`Card ${label} removido do rascunho.`); setRemoving(null) }}>Remover card</PrimaryButton>
        </>}
      >
        <p className={styles.dialogText}>A White Label de origem ({sourceLabel(removing.source)}), seus arquivos e os demais cards não são alterados. A remoção só vale depois de “Salvar alterações”; antes disso, “Descartar” recupera o card.</p>
      </Dialog>}
    </section>
  )
}
