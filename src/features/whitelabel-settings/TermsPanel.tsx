import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { useUnsavedChangesGuard } from '../../app/useUnsavedChangesGuard'
import { Dialog } from '../../components/ui/Dialog'
import { OutlineButton } from '../../components/ui/OutlineButton'
import { PrimaryButton } from '../../components/ui/PrimaryButton'
import { useSessionOperator } from '../../lib/authSession'
import { describeApiError } from '../../lib/apiErrors'
import { ApiError } from '../../lib/api'
import { TermsMarkdown } from './TermsMarkdown'
import { canWriteSettings } from './settingsWriteContract'
import { matchesDraft, publishTerms, readTerms, type Revision, type TermsDocument, type TermsDraft } from './termsPublication'
import styles from './TermsPanel.module.css'

const fromRevision = (revision: Revision | null): TermsDraft => ({ title: revision?.title ?? '', markdown: revision?.markdown ?? '' })
function LegalRevision({ item }: { item: Revision }) {
  return <details><summary>Revisão {item.number} · {item.title}</summary>
    {item.publishedAt && <p>Publicada em <time dateTime={item.publishedAt}>{item.publishedAt}</time></p>}
    <TermsMarkdown source={item.markdown} />
    <details><summary>Consultar Markdown original</summary><pre>{item.markdown}</pre></details>
  </details>
}

export function TermsPanel({ id, fallback }: { id: string; fallback: ReactNode }) {
  const writable = canWriteSettings(useSessionOperator()?.roles)
  const [document, setDocument] = useState<TermsDocument | null>(null)
  const [draft, setDraft] = useState<TermsDraft>({ title: '', markdown: '' })
  const [baseline, setBaseline] = useState<Revision | null>(null)
  const [error, setError] = useState(''), [notice, setNotice] = useState('')
  const [readFallback, setReadFallback] = useState(false)
  const [busy, setBusy] = useState(true), [locked, setLocked] = useState(false)
  const [reviewed, setReviewed] = useState(false)
  const operation = useRef<AbortController | null>(null)

  const adopt = useCallback((value: TermsDocument) => {
    setDocument(value)
    setDraft(fromRevision(value.current))
    setBaseline(value.current)
    setLocked(false)
    setReviewed(false)
  }, [])
  const reload = useCallback((keepDraft: boolean) => {
    operation.current?.abort()
    const run = new AbortController()
    operation.current = run
    void readTerms(id, run.signal).then(value => {
      if (run.signal.aborted) return
      setError('')
      setReadFallback(false)
      if (keepDraft) {
        setDocument(value)
        setLocked(true)
        setReviewed(true)
        setNotice('Compare seu texto com a revisão vigente antes de continuar.')
      } else {
        adopt(value)
      }
    }).catch((cause: unknown) => {
      if (!run.signal.aborted) {
        setError(describeApiError(cause, 'os Termos de Uso').description)
        setReadFallback(cause instanceof ApiError && [404, 405].includes(cause.status))
      }
    }).finally(() => {
      if (operation.current === run) { operation.current = null; setBusy(false) }
    })
  }, [id, adopt])
  function requestRead(keepDraft: boolean) {
    if (operation.current) return
    setBusy(true)
    setError('')
    setReadFallback(false)
    reload(keepDraft)
  }
  useEffect(() => {
    reload(false)
    return () => { operation.current?.abort(); operation.current = null }
  }, [reload])

  const dirty = draft.title !== (baseline?.title ?? '') || draft.markdown !== (baseline?.markdown ?? '')
  const guard = useUnsavedChangesGuard(writable && (dirty || busy && !!document), () => {})
  async function publish() {
    if (!writable || operation.current || !document || locked || !dirty) return
    if (!draft.title.trim() || !draft.markdown.trim()) { setError('Informe o título e o conteúdo dos Termos.'); return }
    if (!window.confirm('Publicar uma nova revisão dos Termos de Uso deste Whitelabel agora?')) return
    const run = new AbortController()
    operation.current = run
    setBusy(true); setError(''); setNotice('')
    try {
      const result = await publishTerms(id, baseline?.id ?? null, draft, run.signal)
      if (run.signal.aborted) return
      if (result.outcome === 'confirmed' || result.outcome === 'matching') {
        adopt(result.document)
        setNotice(result.outcome === 'confirmed' ? 'Nova revisão publicada e conferida por leitura.' : 'A leitura encontrou o conteúdo na nova revisão. O recibo da publicação não foi confirmado.')
      } else {
        if (result.document) setDocument(result.document)
        setLocked(true)
        setReviewed(result.outcome === 'stale' && !!result.document)
        setError(result.outcome === 'stale' ? 'A revisão vigente mudou. Seu texto permanece no editor.' : 'Resultado da publicação incerto. Confira a revisão vigente antes de preparar outra publicação.')
      }
    } catch (cause) {
      if (!run.signal.aborted) setError(describeApiError(cause, 'a revisão dos Termos de Uso').description)
    } finally {
      if (operation.current === run) { operation.current = null; setBusy(false) }
    }
  }

  if (!document) return <>{error ? <><p role="alert">{error}</p><OutlineButton onClick={() => requestRead(false)}>Consultar novamente</OutlineButton>{readFallback && fallback}</> : <p role="status">Consultando Termos de Uso…</p>}</>
  return <section className={styles.panel} aria-labelledby="terms-heading">
    <h2 id="terms-heading">Termos de Uso</h2>
    {document.current ? <div><h3>Revisão vigente</h3><LegalRevision item={document.current} /></div> : <p>Nenhuma revisão publicada neste Whitelabel.</p>}
    <details><summary>Histórico de revisões ({document.history.length})</summary>
      {document.history.length ? document.history.map(item => <LegalRevision key={item.id} item={item} />) : <p>Nenhuma revisão no histórico.</p>}
    </details>
    {writable && <>
      <label htmlFor="terms-title">Título</label>
      <input id="terms-title" value={draft.title} maxLength={256} disabled={busy} onChange={e => setDraft({ ...draft, title: e.target.value })} />
      <label htmlFor="terms-source">Conteúdo em Markdown</label>
      <textarea id="terms-source" rows={18} value={draft.markdown} disabled={busy} onChange={e => setDraft({ ...draft, markdown: e.target.value })} />
      <section aria-label="Prévia do documento"><h3>Prévia</h3><TermsMarkdown source={draft.markdown} /></section>
      <p>A publicação cria uma revisão vigente imediatamente.</p>
      {(draft.title !== draft.title.trim() || draft.markdown !== draft.markdown.trim()) && <p>Ao publicar, o serviço remove espaços e quebras de linha nas extremidades do título e do conteúdo.</p>}
      {locked ? <div className={styles.actions}><OutlineButton disabled={busy} onClick={() => requestRead(true)}>Consultar revisão vigente</OutlineButton>
        {reviewed && <OutlineButton disabled={busy} onClick={() => { setBaseline(document.current); setLocked(false); setReviewed(false); setNotice('Seu texto foi mantido sobre a revisão conferida.'); setError('') }}>Usar a revisão conferida como base</OutlineButton>}
      </div> : <div><PrimaryButton disabled={busy || !dirty || matchesDraft(document.current, draft)} onClick={() => void publish()}>Publicar nova revisão</PrimaryButton></div>}
    </>}
    {notice && <p role="status">{notice}</p>}{error && <p role="alert">{error}</p>}
    {guard.pending && <Dialog title="Sair da edição dos Termos?" description={busy ? 'Aguarde a conclusão da consulta ou publicação.' : 'O texto não publicado será descartado.'} onClose={guard.stay} footer={<><OutlineButton onClick={guard.stay}>Continuar aqui</OutlineButton><PrimaryButton disabled={busy} onClick={guard.discardAndContinue}>Sair da edição</PrimaryButton></>}><span /></Dialog>}
  </section>
}
