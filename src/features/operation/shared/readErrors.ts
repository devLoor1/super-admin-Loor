import { ApiError } from '../../../lib/api'
import { describeApiError, type ApiErrorView } from '../../../lib/apiErrors'

/*
 * Read-failure copy for the Opportunities / Companies reads, on top of the
 * shared `describeApiError` (401 is handled centrally by the session layer;
 * 403 keeps the session). Adds the rejections raised by the strict adapters
 * and the Backend's 400 / 429 semantics. A failure is never shown as an
 * empty result, and never as "no Company".
 */

const REJECTION_COPY: Record<string, { title: string; description: string }> = {
  SCOPE_MISMATCH: {
    title: 'Filtro não confirmado',
    description: 'O Control Plane retornou registros fora do filtro ou do Whitelabel solicitado; nada foi exibido para não misturar resultados.',
  },
  IDENTITY_MISMATCH: {
    title: 'Registro não confirmado',
    description: 'A resposta descreve um registro diferente do solicitado; nada foi exibido.',
  },
  PAGE_MISMATCH: {
    title: 'Página não confirmada',
    description: 'O Control Plane respondeu uma página diferente da solicitada; nada foi exibido para não mostrar registros sob o número de página errado.',
  },
  CARDINALITY_MISMATCH: {
    title: 'Vínculo não confirmado',
    description: 'A resposta contradiz o vínculo documentado (no máximo uma empresa por empreendedor); nada foi exibido.',
  },
}

export function operationReadErrorView(error: unknown, subject: string): ApiErrorView {
  const view = describeApiError(error, subject)
  if (!(error instanceof ApiError)) return view
  if (error.kind === 'malformed' && error.code && Object.hasOwn(REJECTION_COPY, error.code)) {
    return { ...view, ...REJECTION_COPY[error.code], retryable: true }
  }
  if (error.kind === 'http' && error.status === 400) {
    return {
      ...view,
      title: 'Consulta não aceita',
      description: `O Control Plane recusou um filtro ou parâmetro da consulta de ${subject}. Limpe os filtros e tente novamente.`,
      retryable: false,
    }
  }
  if (error.kind === 'http' && error.status === 429) {
    return { ...view, title: 'Muitas consultas', description: 'O Control Plane limitou as consultas por alguns instantes. Aguarde e tente novamente.', retryable: true }
  }
  return view
}
