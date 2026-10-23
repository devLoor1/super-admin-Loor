import { useState, type FormEvent } from 'react'
import { OutlineButton } from '../../components/ui/OutlineButton'
import { auditDayBoundary, auditLocalDate, AUDIT_TIME_ZONE } from './auditDates'
import { AUDIT_FILTER_LABELS, parseAuditRoute, updateAuditQuery, type AuditFilterKey, type AuditRouteState } from './auditRoute'
import styles from './Audit.module.css'

const textFields = ['action', 'operatorId', 'resourceType', 'resourceId', 'whitelabelId'] as const
export function AuditFilters({ route, rawQuery, apply }: { route: AuditRouteState; rawQuery: string; apply: (hash: string) => void }) {
  const [error, setError] = useState('')
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const patch: Partial<Record<AuditFilterKey, string | number | undefined>> = { page: 1 }
    for (const key of [...textFields, 'result'] as const) patch[key] = String(data.get(key) ?? '').trim()
    for (const key of ['from', 'to'] as const) {
      const day = String(data.get(key) ?? '')
      // Exact instants from a direct URL survive applying unrelated fields.
      try { patch[key] = !day ? '' : route[key] && day === auditLocalDate(route[key]) ? route[key] : auditDayBoundary(day, key === 'to') }
      catch { setError('Informe datas válidas. Nenhuma consulta foi enviada.'); return }
    }
    const next = updateAuditQuery(rawQuery, patch)
    const parsed = parseAuditRoute({ rawQuery: next.split('?')[1] ?? '' })
    if (!parsed.valid) { setError(parsed.issues.map(i => i.message).join(' ')); return }
    setError('')
    apply(next)
  }
  return (
    <form onSubmit={submit} className={styles.advancedForm} aria-label="Filtros avançados de auditoria">
      <p id="audit-filter-help" className={styles.filterHelp}>Valores exatos registrados pelo Control Plane. IDs não são nomes, e-mails ou documentos pessoais. Todos os filtros são combinados.</p>
      <div className={styles.filterGrid}>
        {textFields.map(key => <label key={key} className={styles.filterField}>
          <span>{AUDIT_FILTER_LABELS[key]}</span>
          <input name={key} defaultValue={route[key] ?? ''} maxLength={key === 'resourceId' ? 128 : key === 'whitelabelId' ? 15 : 80} inputMode={key === 'whitelabelId' ? 'numeric' : 'text'} autoComplete="off" spellCheck={false} aria-describedby="audit-filter-help" />
        </label>)}
        <label className={styles.filterField}><span>Resultado</span><select name="result" defaultValue={route.result ?? ''}><option value="">Todos</option><option value="success">Sucesso</option><option value="failed">Falha</option></select></label>
        {(['from', 'to'] as const).map(key => <label key={key} className={styles.filterField}><span>{AUDIT_FILTER_LABELS[key]}</span><input type="date" name={key} min="1000-01-01" max="9998-12-31" defaultValue={route[key] ? auditLocalDate(route[key]) : ''} aria-describedby="audit-date-help" /></label>)}
      </div>
      <p id="audit-date-help" className={styles.filterHelp}>Datas em {AUDIT_TIME_ZONE} (Brasília). Inclui todo o dia final, respeitando o fuso histórico. Instantes específicos da URL são preservados até alterar a respectiva data.</p>
      {error ? <p role="alert" className={styles.ignoredNote}>{error}</p> : null}
      <OutlineButton type="submit">Aplicar filtros</OutlineButton>
    </form>
  )
}
