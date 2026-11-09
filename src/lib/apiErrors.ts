import { ApiError } from './api'

export type ApiErrorView = {
  /** Short heading for the error state. */
  title: string
  /** Safe, user-facing explanation (never a raw server message or stack). */
  description: string
  /** Correlation id to quote to support, when one exists. */
  correlationId?: string
  /** Whether "Tentar novamente" can plausibly succeed. */
  retryable: boolean
  /** The resource does not exist (404, or an id the API would reject). */
  notFound: boolean
}

/**
 * Maps any failure of a Control Plane read to a safe message. `subject` is
 * the plural noun of what was being loaded (e.g. "os Whitelabels").
 */
export function describeApiError(error: unknown, subject: string): ApiErrorView {
  if (!(error instanceof ApiError)) {
    return {
      title: 'Não foi possível exibir os dados',
      description: `Ocorreu um erro inesperado ao exibir ${subject}. Tente novamente.`,
      retryable: true,
      notFound: false,
    }
  }
  const base = { correlationId: error.correlationId, notFound: false }
  if (error.kind === 'network') {
    return {
      ...base,
      title: 'Sem conexão com o Control Plane',
      description: `Não foi possível carregar ${subject}. Verifique sua conexão e tente novamente.`,
      retryable: true,
    }
  }
  if (error.kind === 'timeout') {
    return {
      ...base,
      title: 'O Control Plane demorou a responder',
      description: 'O serviço pode estar iniciando. Aguarde alguns instantes e tente novamente.',
      retryable: true,
    }
  }
  if (error.kind === 'malformed') {
    return {
      ...base,
      title: 'Resposta inesperada do Control Plane',
      description: `Os dados recebidos não estão no formato esperado; nada foi exibido para não mostrar informações incorretas sobre ${subject}.`,
      retryable: true,
    }
  }
  if (error.status === 401) {
    return {
      ...base,
      title: 'Sessão encerrada',
      description: 'Sua sessão expirou ou não é mais válida. Entre novamente.',
      retryable: false,
    }
  }
  if (error.status === 403) {
    return {
      ...base,
      title: 'Acesso não permitido',
      description: `Seu perfil de operador não tem permissão para consultar ${subject}.`,
      retryable: false,
    }
  }
  if (error.status === 404 || error.code === 'INVALID_WHITELABEL_ID') {
    return { ...base, title: 'Registro não encontrado', description: 'O registro solicitado não existe.', retryable: false, notFound: true }
  }
  if (error.status >= 500) {
    return {
      ...base,
      title: 'Control Plane indisponível',
      description: `Não foi possível carregar ${subject} agora. Tente novamente em instantes.`,
      retryable: true,
    }
  }
  return {
    ...base,
    title: 'Consulta não aceita',
    description: `O Control Plane recusou a consulta de ${subject} (HTTP ${error.status}).`,
    retryable: true,
  }
}
