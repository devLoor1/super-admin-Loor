import { useEffect, useRef, useState, type FormEvent } from 'react'
import { CircleAlert, LoaderCircle, Plus, Search } from 'lucide-react'
import { Dialog } from '../../../components/ui/Dialog'
import { OutlineButton } from '../../../components/ui/OutlineButton'
import { PrimaryButton } from '../../../components/ui/PrimaryButton'
import type { WhitelabelRecord } from '../../whitelabels/whitelabelApi'
import { sourceLabel, type CardSource } from '../showcaseModel'
import { lookupSourceById, searchSourceOptions, type LookupResult } from '../showcaseSourceLookup'
import styles from './ShowcaseEditor.module.css'

/** Paged active options, followed by an authoritative direct-ID read of the selection. */
export function SourceLookupDialog({ existingSources, canEdit, onAdd, onClose }: {
  existingSources: readonly CardSource[]
  canEdit: boolean
  onAdd: (source: CardSource) => void
  onClose: () => void
}) {
  const input = useRef<HTMLInputElement>(null)
  const optionsAttempt = useRef(0)
  const selectionAttempt = useRef(0)
  const [search, setSearch] = useState('')
  const [request, setRequest] = useState<{ query: string; page: number; attempt: number } | null>({ query: '', page: 1, attempt: 0 })
  const [options, setOptions] = useState<{ rows: WhitelabelRecord[]; phase: 'idle' | 'loading' | 'ready' | 'error'; page: number; lastPage: number; message: string }>({ rows: [], phase: 'loading', page: 1, lastPage: 1, message: '' })
  const [selection, setSelection] = useState<{ id: string; attempt: number } | null>(null)
  const [result, setResult] = useState<LookupResult | null>(null)
  const [selecting, setSelecting] = useState(false)

  useEffect(() => {
    if (!request) return
    const controller = new AbortController()
    void searchSourceOptions(request.query, request.page, controller.signal).then(page => {
      if (controller.signal.aborted || request.attempt !== optionsAttempt.current) return
      setOptions(current => ({ rows: request.page === 1 ? page.rows : [...new Map([...current.rows, ...page.rows].map(row => [row.id, row])).values()], phase: 'ready', page: page.page, lastPage: page.lastPage, message: '' }))
    }).catch(() => {
      if (!controller.signal.aborted && request.attempt === optionsAttempt.current) setOptions(current => ({ ...current, phase: 'error', message: 'Não foi possível consultar as White Labels. Tente novamente.' }))
    })
    return () => controller.abort()
  }, [request])

  useEffect(() => {
    if (!selection) return
    const controller = new AbortController()
    void lookupSourceById(selection.id, controller.signal).then(value => {
      if (!controller.signal.aborted && selection.attempt === selectionAttempt.current) { setResult(value); setSelecting(false) }
    }).catch(() => {
      if (!controller.signal.aborted && selection.attempt === selectionAttempt.current) { setResult({ status: 'error', slug: '', message: 'Não foi possível confirmar a origem selecionada.' }); setSelecting(false) }
    })
    return () => controller.abort()
  }, [selection])

  function runSearch(event?: FormEvent) {
    event?.preventDefault()
    selectionAttempt.current++
    setResult(null); setSelection(null); setSelecting(false)
    setOptions({ rows: [], phase: 'loading', page: 1, lastPage: 1, message: '' })
    setRequest({ query: search.trim(), page: 1, attempt: ++optionsAttempt.current })
  }

  const found = result?.status === 'found' ? result.source : null
  const repeats = found ? existingSources.filter(source => source.whitelabelId === found.whitelabelId).length : 0
  const busy = options.phase === 'loading' || selecting

  return <Dialog title="Adicionar card" description="Selecione uma White Label ativa. Cada card tem conteúdo próprio e não altera a origem."
    icon={Plus} size="lg" initialFocusRef={input} onClose={onClose}
    footer={<><OutlineButton onClick={onClose}>Cancelar</OutlineButton><PrimaryButton disabled={!found || !canEdit || busy} onClick={() => { if (found && canEdit && !busy) onAdd(found) }}><Plus size={16} aria-hidden="true" />Adicionar card</PrimaryButton></>}>
    <form className={styles.lookupForm} onSubmit={runSearch}>
      <label className={styles.field} htmlFor="vitrine-origem-search">Nome ou slug da White Label</label>
      <div className={styles.lookupRow}>
        <input id="vitrine-origem-search" ref={input} value={search} autoComplete="off" aria-describedby="vitrine-origem-status" onChange={event => {
          optionsAttempt.current++; selectionAttempt.current++
          setSearch(event.target.value); setRequest(null); setSelection(null); setResult(null); setSelecting(false)
          setOptions({ rows: [], phase: 'idle', page: 1, lastPage: 1, message: '' })
        }} />
        <OutlineButton type="submit"><Search size={15} aria-hidden="true" />Buscar</OutlineButton>
      </div>
    </form>
    <div id="vitrine-origem-status" className={styles.lookupResult} aria-live="polite">
      {options.phase === 'idle' && <p className={styles.hint}>Use Buscar para consultar as origens ativas.</p>}
      {options.phase === 'loading' && <p className={styles.loadingLine}><LoaderCircle size={18} className={styles.spin} aria-hidden="true" />Carregando White Labels…</p>}
      {options.phase === 'error' && <div className={styles.lookupProblem}><p className={styles.errorText}><CircleAlert size={16} aria-hidden="true" />{options.message}</p><OutlineButton onClick={() => {
        setOptions(current => ({ ...current, phase: 'loading', message: '' })); setRequest({ query: request?.query ?? search.trim(), page: request?.page ?? 1, attempt: ++optionsAttempt.current })
      }}>Tentar novamente</OutlineButton></div>}
      {options.phase === 'ready' && options.rows.length === 0 && <p>Nenhuma White Label ativa corresponde à busca.</p>}
      {options.rows.length > 0 && <div role="group" aria-label="White Labels ativas" className={styles.sourceOptions}>{options.rows.map(row => <button
        key={row.id} type="button" className={styles.sourceOption} aria-pressed={selection?.id === row.id} disabled={options.phase === 'loading'} onClick={() => {
          setResult(null); setSelecting(true); setSelection({ id: row.id, attempt: ++selectionAttempt.current })
        }}><strong>{row.name}</strong><span>{row.slug} · WL{row.id}</span></button>)}</div>}
      {options.rows.length > 0 && <p className={styles.hint}>Carregados {options.rows.length} resultados · página {options.page} de {options.lastPage}.{options.page < options.lastPage || options.phase === 'error' ? ' A lista está parcial; carregue as páginas restantes para ampliar a consulta.' : ''}</p>}
      {options.phase === 'ready' && options.page < options.lastPage && <OutlineButton onClick={() => {
        setOptions(current => ({ ...current, phase: 'loading' })); setRequest({ query: search.trim(), page: options.page + 1, attempt: ++optionsAttempt.current })
      }}>Carregar mais</OutlineButton>}
      {selecting && <p className={styles.loadingLine}><LoaderCircle size={18} className={styles.spin} aria-hidden="true" />Confirmando origem…</p>}
      {result && result.status !== 'found' && <p className={styles.errorText}><CircleAlert size={16} aria-hidden="true" />{result.status === 'inactive' ? 'Esta origem ficou inativa. Selecione outra White Label.' : result.status === 'not-found' ? 'A origem selecionada não foi encontrada.' : result.status === 'error' || result.status === 'invalid' ? result.message : 'Não foi possível confirmar a origem. Selecione novamente.'}</p>}
      {found && <div className={styles.sourceSummary}>
        <dl className={styles.facts}><div><dt>Origem</dt><dd>{found.name}</dd></div><div><dt>Slug</dt><dd>{sourceLabel(found)}</dd></div><div><dt>Identificação</dt><dd>WL{found.whitelabelId}</dd></div><div><dt>Situação</dt><dd>Ativa</dd></div></dl>
        <p className={styles.hint}>Nome exibido e título interno começam com o nome cadastrado. Logo, descrição e fotografias são preenchidos no card. As cores iniciais são editoriais e editáveis.</p>
        {repeats > 0 && <p className={styles.infoText}>Esta origem já aparece em {repeats} card{repeats > 1 ? 's' : ''}. Um novo card independente será criado.</p>}
      </div>}
    </div>
  </Dialog>
}
