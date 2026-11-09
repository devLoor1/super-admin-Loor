import { useRef, useState, type FormEvent } from 'react'
import { CircleAlert, LoaderCircle, Plus, Search } from 'lucide-react'
import { Dialog } from '../../../components/ui/Dialog'
import { OutlineButton } from '../../../components/ui/OutlineButton'
import { PrimaryButton } from '../../../components/ui/PrimaryButton'
import { SHOWCASE_SIMULATION } from '../showcaseMapping'
import { availableDefaultFields, DEFAULT_FIELD_LABELS, sourceLabel, type CardSource, type DefaultField, type SourceDefaults } from '../showcaseModel'
import { editLookupInput, eligibleLookupSelection, initialLookupSession, lookupSourceBySlug, receiveLookup, startLookup } from '../showcaseSourceLookup'
import styles from './ShowcaseEditor.module.css'

const FIELDS: DefaultField[] = ['logo', 'colors', 'shortDescription']

/** Board 07 states: lookup in progress, exact slug not found, lookup failure (its own message), found. */
export function SourceLookupDialog({ existingSources, canEdit, onAdd, onClose }: {
  existingSources: readonly CardSource[]
  canEdit: boolean
  onAdd: (source: CardSource, defaults: SourceDefaults | null) => void
  onClose: () => void
}) {
  // One session: the result shown and the card that can be added always belong to the current slug.
  const [session, setSession] = useState(initialLookupSession)
  const input = useRef<HTMLInputElement>(null)

  async function search(event?: FormEvent) {
    event?.preventDefault()
    const started = startLookup(session)
    if (!started) return
    setSession(started.session)
    const result = await lookupSourceBySlug(started.query)
    // A response for a superseded attempt (slug edited or newer search) is ignored.
    setSession(current => receiveLookup(current, started.attempt, result))
  }

  const retry = () => {
    input.current?.focus()
    input.current?.select()
  }

  const result = session.phase === 'done' ? session.result : null
  const found = eligibleLookupSelection(session)
  const repeats = found ? existingSources.filter(source => source.whitelabelId === found.source.whitelabelId).length : 0
  const available = found ? availableDefaultFields(found.defaults) : []

  return (
    <Dialog
      title="Adicionar card"
      description="Busque a White Label de origem pelo slug exato. A origem fornece apenas valores iniciais; o novo card é independente e nunca altera a origem."
      icon={Plus}
      size="lg"
      initialFocusRef={input}
      onClose={onClose}
      footer={<>
        <OutlineButton onClick={onClose}>Cancelar</OutlineButton>
        <PrimaryButton disabled={!found || !canEdit} onClick={() => { const selection = eligibleLookupSelection(session); if (selection && canEdit) onAdd(selection.source, selection.defaults) }}><Plus size={16} aria-hidden="true" />Adicionar card</PrimaryButton>
      </>}
    >
      <form className={styles.lookupForm} onSubmit={event => void search(event)}>
        <label className={styles.field} htmlFor="vitrine-slug">Slug da White Label</label>
        <div className={styles.lookupRow}>
          <input id="vitrine-slug" ref={input} value={session.input} autoComplete="off" spellCheck={false} aria-describedby="vitrine-slug-hint vitrine-slug-status" onChange={event => { const value = event.target.value; setSession(current => editLookupInput(current, value)) }} />
          <OutlineButton type="submit" disabled={!session.input.trim() || session.phase === 'loading'}><Search size={15} aria-hidden="true" />Buscar</OutlineButton>
        </div>
        <p id="vitrine-slug-hint" className={styles.hint}>
          Slugs desta simulação: <code>{SHOWCASE_SIMULATION.logicalOwner.slug}</code> (proprietária, mapeada para a fixture mock #{SHOWCASE_SIMULATION.mockTenant.id}), <code>finapop-demo</code>, <code>loor-demo</code>, <code>nova-plataforma-demo</code>.
        </p>
      </form>

      <div id="vitrine-slug-status" className={styles.lookupResult} aria-live="polite">
        {session.phase === 'loading' && <p className={styles.loadingLine}><LoaderCircle size={18} className={styles.spin} aria-hidden="true" />Buscando White Label…</p>}
        {result?.status === 'invalid' && <p className={styles.errorText}><CircleAlert size={16} aria-hidden="true" />{result.message}</p>}
        {result?.status === 'not-found' && <div className={styles.lookupProblem}>
          <p className={styles.errorText}><CircleAlert size={16} aria-hidden="true" />Nenhuma White Label corresponde exatamente a este slug.</p>
          <p className={styles.hint}>Confira o endereço e tente outra busca. Nenhuma White Label foi criada e nenhuma origem semelhante foi escolhida.</p>
          <OutlineButton onClick={retry}>Buscar novamente</OutlineButton>
        </div>}
        {result?.status === 'error' && <div className={styles.lookupProblem}>
          <p className={styles.errorText}><CircleAlert size={16} aria-hidden="true" />Não foi possível concluir a consulta.</p>
          <p className={styles.hint}>{result.message} Isso não significa que a White Label não exista. Tente novamente.</p>
          <OutlineButton onClick={() => void search()}>Tentar novamente</OutlineButton>
        </div>}
        {result?.status === 'inconclusive' && <div className={styles.lookupProblem}>
          <p className={styles.errorText}><CircleAlert size={16} aria-hidden="true" />A busca não pôde ser concluída com segurança.</p>
          <p className={styles.hint}>{result.reason} Uma busca incompleta não comprova que o slug não exista.</p>
          <OutlineButton onClick={() => void search()}>Tentar novamente</OutlineButton>
        </div>}
        {result?.status === 'inactive' && <div className={styles.lookupProblem}>
          <p className={styles.errorText}><CircleAlert size={16} aria-hidden="true" />{result.source.name} ({sourceLabel(result.source)}) está inativa.</p>
          <p className={styles.hint}>Decisão deste protótipo, a alinhar com Produto e Backend: somente origens ativas podem ser adicionadas. Cards existentes de uma origem que ficou inativa são preservados.</p>
        </div>}
        {found && <div className={styles.sourceSummary}>
          <dl className={styles.facts}>
            <div><dt>Origem</dt><dd>{found.source.name}</dd></div>
            <div><dt>Slug</dt><dd><code>{sourceLabel(found.source)}</code></dd></div>
            <div><dt>Identificação</dt><dd>{found.source.logical ? `WL${found.source.logical.whitelabelId} lógico · fixture mock #${found.source.whitelabelId}` : `Fixture mock #${found.source.whitelabelId} (ID fictício)`}</dd></div>
            <div><dt>Situação</dt><dd>Ativa</dd></div>
          </dl>
          <h3 className={styles.pickerTitle}>Valores iniciais disponíveis</h3>
          <ul className={styles.defaultsList}>
            <li><span>Nome exibido e título interno</span><strong>Nome cadastrado da origem</strong></li>
            {FIELDS.map(field => <li key={field}><span>{DEFAULT_FIELD_LABELS[field]}</span>{available.includes(field) ? <strong>Padrão simulado (fixture)</strong> : <em>Não informado pela White Label</em>}</li>)}
          </ul>
          <p className={styles.hint}>Padrões simulados não são campos verificados do Backend. Campos ausentes ficam para preenchimento manual. Fotografias nunca são copiadas.</p>
          {repeats > 0 && <p className={styles.infoText}>Esta origem já aparece em {repeats} card{repeats > 1 ? 's' : ''}. Um novo card independente será criado.</p>}
          {!canEdit && <p className={styles.errorText}>Perfil somente leitura: a inclusão está indisponível nesta simulação.</p>}
        </div>}
      </div>
    </Dialog>
  )
}
