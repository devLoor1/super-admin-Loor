import { useRef } from 'react'
import { Bold, Info, Italic, Link, List } from 'lucide-react'
import { parseShowcaseMarkdown } from '../showcaseMarkdown'
import styles from './ShowcaseEditor.module.css'

/** Plain textarea with a small syntax toolbar. No rich-text editor, no HTML. */
export function MarkdownField({ id, value, onChange, readOnly, invalid }: { id: string; value: string; onChange: (value: string) => void; readOnly: boolean; invalid: boolean }) {
  const area = useRef<HTMLTextAreaElement>(null)
  const issues = parseShowcaseMarkdown(value).issues

  function apply(kind: 'bold' | 'italic' | 'list' | 'link') {
    const element = area.current
    if (!element) return
    const { selectionStart: start, selectionEnd: end } = element
    const selected = value.slice(start, end)
    let insert: string
    let selectFrom: number
    let selectTo: number
    if (kind === 'bold' || kind === 'italic') {
      const marker = kind === 'bold' ? '**' : '*'
      const text = selected || (kind === 'bold' ? 'texto em negrito' : 'texto em itálico')
      insert = `${marker}${text}${marker}`
      selectFrom = start + marker.length
      selectTo = selectFrom + text.length
    } else if (kind === 'list') {
      const lines = (selected || 'Item da lista').split('\n')
      insert = lines.map(line => line.replace(/^\s*(?:[-*]|\d+[.)])\s+/, '')).map(line => `- ${line}`).join('\n')
      if (start > 0 && value[start - 1] !== '\n') insert = `\n${insert}`
      selectFrom = start
      selectTo = start + insert.length
    } else {
      const text = selected || 'texto do link'
      insert = `[${text}](https://)`
      selectFrom = start + text.length + 3
      selectTo = selectFrom + 8
    }
    onChange(value.slice(0, start) + insert + value.slice(end))
    window.requestAnimationFrame(() => {
      element.focus()
      element.setSelectionRange(selectFrom, selectTo)
    })
  }

  return (
    <div className={styles.markdown} data-invalid={invalid || undefined}>
      <div className={styles.markdownToolbar} role="toolbar" aria-label="Formatação Markdown" aria-controls={id}>
        <button type="button" aria-label="Negrito" title="Negrito" disabled={readOnly} onClick={() => apply('bold')}><Bold size={16} aria-hidden="true" /></button>
        <button type="button" aria-label="Itálico" title="Itálico" disabled={readOnly} onClick={() => apply('italic')}><Italic size={16} aria-hidden="true" /></button>
        <button type="button" aria-label="Lista simples" title="Lista simples" disabled={readOnly} onClick={() => apply('list')}><List size={16} aria-hidden="true" /></button>
        <button type="button" aria-label="Link HTTP(S)" title="Link HTTP(S)" disabled={readOnly} onClick={() => apply('link')}><Link size={16} aria-hidden="true" /></button>
      </div>
      <textarea id={id} ref={area} rows={7} value={value} readOnly={readOnly} aria-invalid={invalid || undefined} aria-describedby={`${id}-rules ${id}-issues`} onChange={event => onChange(event.target.value)} />
      <p id={`${id}-rules`} className={styles.hint}><Info size={14} aria-hidden="true" /> Parágrafos, **negrito**, *itálico*, listas simples e links http(s) com texto. Sem HTML, vídeos ou imagens incorporadas.</p>
      <ul id={`${id}-issues`} className={styles.issueList} aria-live="polite">
        {issues.map((issue, index) => <li key={`${issue.line}-${index}`}>Linha {issue.line}: {issue.message}</li>)}
      </ul>
    </div>
  )
}
