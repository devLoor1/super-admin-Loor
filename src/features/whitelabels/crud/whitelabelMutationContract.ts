import { ApiError } from '../../../lib/api'
import type { WhitelabelRecord } from '../whitelabelApi'
import { normalizeDraft, tidyName, type WhitelabelDraft } from './whitelabelForm'

/*
 * Whitelabel mutation contract — TYPES AND PRESENTATION ONLY.
 *
 * NO LIVE MUTATIONS ARE ENABLED. This module has no request code: it never
 * calls `fetch`, `apiRequest` or the authenticated client. The shapes below
 * mirror the DRAFT Control Plane source (`backend-super-admin-Loor`
 * `0177437`) that the Backend team is still validating:
 *
 *   POST  /whitelabels                { name, slug, baseUrl? }   (CreateWhitelabelDto)
 *   PATCH /whitelabels/:id            { name?, baseUrl? }        (UpdateWhitelabelDto)
 *   PATCH /whitelabels/:id/deactivate (and /activate)            no body
 *   DELETE /whitelabels/:id           — does not exist in the draft
 *
 * Enabling an action later means: confirm the contract, add the request in
 * the shared API layer, and flip that action's availability below.
 */

export type WhitelabelMutationAction = 'create' | 'update' | 'lifecycle'

/** Draft request body of `POST /whitelabels` (not sent). */
export type CreateWhitelabelRequest = { name: string; slug: string; baseUrl?: string }

/** Draft request body of `PATCH /whitelabels/:id` (not sent): only changed candidates. */
export type UpdateWhitelabelRequest = { name?: string; baseUrl?: string }

/**
 * Deactivation vs soft delete vs hard delete is not decided: the lifecycle
 * action has no request shape until the Backend defines it.
 */
export type WhitelabelLifecycleRequest = never

export type MutationAvailability = { available: false; pendingLabel: string; reason: string }

/** Every Whitelabel mutation is disabled until its Backend contract is validated. */
export const WHITELABEL_MUTATIONS: Record<WhitelabelMutationAction, MutationAvailability> = {
  create: {
    available: false,
    pendingLabel: 'Criação aguardando integração do Backend',
    reason: 'O contrato de criação de Whitelabel ainda está em validação pelo Backend.',
  },
  update: {
    available: false,
    pendingLabel: 'Edição aguardando integração do Backend',
    reason: 'O contrato de edição de Whitelabel ainda está em validação pelo Backend.',
  },
  lifecycle: {
    available: false,
    pendingLabel: 'Desativação ou remoção aguardando integração do Backend',
    reason: 'O Backend ainda não definiu se a ação será desativação, exclusão lógica ou exclusão definitiva.',
  },
}

/** What a future `POST /whitelabels` would carry — shown for review, never sent. */
export function createRequestPreview(draft: WhitelabelDraft): CreateWhitelabelRequest {
  const value = normalizeDraft(draft)
  return value.baseUrl ? { name: value.name, slug: value.slug, baseUrl: value.baseUrl } : { name: value.name, slug: value.slug }
}

/** What a future `PATCH /whitelabels/:id` would carry: changed candidates only — shown for review, never sent. */
export function updateRequestPreview(record: WhitelabelRecord, draft: WhitelabelDraft): UpdateWhitelabelRequest {
  const value = normalizeDraft(draft)
  const request: UpdateWhitelabelRequest = {}
  if (value.name !== tidyName(record.name)) request.name = value.name
  if (value.baseUrl && value.baseUrl !== (record.baseUrl ?? '')) request.baseUrl = value.baseUrl
  return request
}

/**
 * Domains the Backend may check before removing or deactivating a Whitelabel.
 * Listed for orientation only: the frontend never counts or evaluates them.
 */
export const DEPENDENCY_DOMAINS = ['Contas', 'Investidores', 'Empreendedores', 'Empresas', 'Oportunidades', 'Investimentos', 'Pagamentos', 'Wallets']

/* ---------- future error presentation (not bound to any request yet) ---------- */

export type MutationErrorKind = 'invalid' | 'session' | 'forbidden' | 'not-found' | 'conflict' | 'dependencies' | 'unavailable'

export type MutationErrorView = {
  kind: MutationErrorKind
  title: string
  description: string
  /** Whether trying again can plausibly succeed. */
  retryable: boolean
  correlationId?: string
}

const VERB: Record<WhitelabelMutationAction, string> = {
  create: 'criar o Whitelabel',
  update: 'salvar as alterações',
  lifecycle: 'desativar ou remover o Whitelabel',
}

/** No response (or 5xx) does not prove the operation did not happen: check before retrying. */
const UNCERTAIN: Record<WhitelabelMutationAction, string> = {
  create: 'O Whitelabel pode ou não ter sido criado: confira a lista antes de tentar novamente.',
  update: 'As alterações podem ou não ter sido aplicadas: confira o detalhe antes de tentar novamente.',
  lifecycle: 'O Whitelabel pode ou não ter sido alterado: confira a lista antes de tentar novamente.',
}

/**
 * Maps a future mutation failure to safe copy (never a raw Backend message).
 * 401 is handled centrally by the session layer; the view only names it.
 */
export function describeMutationError(error: unknown, action: WhitelabelMutationAction): MutationErrorView {
  const verb = VERB[action]
  const unavailable: MutationErrorView = {
    kind: 'unavailable',
    title: 'Não foi possível concluir a operação',
    description: `A tentativa de ${verb} não foi confirmada pelo Control Plane. ${UNCERTAIN[action]}`,
    retryable: true,
  }
  if (!(error instanceof ApiError)) return unavailable
  const correlationId = error.correlationId
  if (error.kind !== 'http' || error.status >= 500) return { ...unavailable, correlationId }
  if (error.status === 400 || error.status === 422) {
    return {
      kind: 'invalid',
      title: 'Dados recusados pelo Control Plane',
      description: 'Os dados informados não foram aceitos. Revise os campos e tente novamente.',
      retryable: false,
      correlationId,
    }
  }
  if (error.status === 401) {
    return { kind: 'session', title: 'Sessão encerrada', description: 'Sua sessão expirou. Entre novamente.', retryable: false, correlationId }
  }
  if (error.status === 403) {
    return {
      kind: 'forbidden',
      title: 'Ação não permitida',
      description: `Seu perfil de operador não tem permissão para ${verb}.`,
      retryable: false,
      correlationId,
    }
  }
  if (error.status === 404) {
    return {
      kind: 'not-found',
      title: 'Whitelabel não encontrado',
      description: 'Este Whitelabel não existe mais no Control Plane. Atualize a lista.',
      retryable: false,
      correlationId,
    }
  }
  if (error.status === 409) {
    return action === 'lifecycle'
      ? {
          kind: 'dependencies',
          title: 'Operação bloqueada pelo Backend',
          description:
            'Este Whitelabel possui dependências e não pode ser removido ou desativado agora. O Backend decide quais vínculos bloqueiam a operação.',
          retryable: false,
          correlationId,
        }
      : {
          kind: 'conflict',
          title: 'Conflito com um registro existente',
          description:
            action === 'create'
              ? 'O Control Plane recusou a criação por conflito, por exemplo um identificador (slug) já utilizado.'
              : 'O Control Plane recusou as alterações por conflito com outro registro.',
          retryable: false,
          correlationId,
        }
  }
  return {
    kind: 'invalid',
    title: 'Operação não aceita',
    description: `O Control Plane recusou a solicitação (HTTP ${error.status}).`,
    retryable: false,
    correlationId,
  }
}
