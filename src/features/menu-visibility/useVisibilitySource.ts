import { useEffect, useMemo, useState } from 'react'
import { ApiError } from '../../lib/api'
import { MENU_VISIBILITY_CONTRACT } from './menuVisibilityContract'
import type { VisibilityPreview } from './menuVisibilityRoute'
import { prototypeInitialMap } from './prototypeVisibility'
import type { VisibilityMap } from './visibilityModel'

/*
 * Menu Visibility source boundary. While `MENU_VISIBILITY_CONTRACT.integrated`
 * is false the ONLY source is the prototype default: nothing here performs a
 * request (no fetch, no authenticated client) and nothing is stored. The
 * states are the ones a future `GET /api/homolog/menu-visibility` must
 * produce, so the screen does not change when it lands.
 */

export type VisibilitySourceData = {
  /** Initial map the draft starts from (prototype default today). */
  map: VisibilityMap
  provenance: 'prototype' | 'backend'
  /** Future response metadata — never invented while in prototype. */
  updatedAt: string | null
  updatedBy: string | null
}

export type VisibilitySourceState =
  | { status: 'loading' }
  | { status: 'error'; error: unknown }
  | { status: 'success'; data: VisibilitySourceData }

/** Retry feedback of the prototype source: a short loading phase, then the same local answer. */
const RETRY_FEEDBACK_MS = 350

const PREVIEW_ERRORS: Partial<Record<VisibilityPreview, () => ApiError>> = {
  unavailable: () => new ApiError(503, {}, {}),
  forbidden: () => new ApiError(403, {}, {}),
  error: () => new ApiError(200, {}, { kind: 'malformed' }),
}

export function useVisibilitySource(requestedPreview?: VisibilityPreview) {
  // A preview can never override a future integrated source.
  const preview = MENU_VISIBILITY_CONTRACT.integrated ? undefined : requestedPreview
  const [retrying, setRetrying] = useState(false)
  useEffect(() => {
    if (!retrying) return
    const timer = window.setTimeout(() => setRetrying(false), RETRY_FEEDBACK_MS)
    return () => window.clearTimeout(timer)
  }, [retrying])

  const state = useMemo((): VisibilitySourceState => {
    if (retrying || preview === 'loading') return { status: 'loading' }
    const previewError = preview ? PREVIEW_ERRORS[preview] : undefined
    if (previewError) return { status: 'error', error: previewError() }
    return { status: 'success', data: { map: prototypeInitialMap(), provenance: 'prototype', updatedAt: null, updatedBy: null } }
  }, [retrying, preview])

  return { state, reload: () => setRetrying(true), integrated: MENU_VISIBILITY_CONTRACT.integrated }
}

/** What a failed save would look like (prototype preview only): timeout → uncertain outcome. */
export function previewSaveError() {
  return new ApiError(0, {}, { kind: 'timeout' })
}
