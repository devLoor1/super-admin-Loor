import { useEffect, useMemo, useState } from 'react'
import { ApiError } from '../../../lib/api'
import { COMPANY_CONTRACT, type CompanyListResultCandidate } from './companyContract'
import { viewFromPrototype, type CompanyProvenance, type CompanyView } from './companyPresent'
import type { CompanyPreview } from './companyRoute'
import { PROTOTYPE_COMPANY_WHITELABELS, prototypeCompanyById, queryPrototypeCompanies, type PrototypeRef } from './prototypeCompanies'

/*
 * Companies data source boundary. While `COMPANY_CONTRACT.integrated` is
 * false the ONLY source is the isolated illustrative module: nothing here
 * performs a request (no `fetch`, no authenticated client, no Entrepreneur or
 * Whitelabel API). The returned states are the ones a future `GET /companies`
 * integration must produce, so the screens do not change when it lands.
 */

export type CompanySourceState<T> =
  | { status: 'loading' }
  /** The Companies contract is not available (prototype preview of the future state). */
  | { status: 'unavailable' }
  | { status: 'error'; error: unknown }
  | { status: 'success'; data: T }

export type CompanyListData = CompanyListResultCandidate<CompanyView> & {
  provenance: CompanyProvenance
  /** The `whitelabel` filter matches no known scope. */
  scopeMissing: boolean
}

/** Retry feedback of the prototype source: a short loading phase, then the same (local) answer. */
const RETRY_FEEDBACK_MS = 350

function useRetry() {
  const [retrying, setRetrying] = useState(false)
  useEffect(() => {
    if (!retrying) return
    const timer = window.setTimeout(() => setRetrying(false), RETRY_FEEDBACK_MS)
    return () => window.clearTimeout(timer)
  }, [retrying])
  return { retrying, reload: () => setRetrying(true) }
}

/** What a failed read would look like (prototype preview): HTTP 503 → "Control Plane indisponível". */
const previewError = () => new ApiError(503, {}, {})

export function useCompanyList(query: { page: number; perPage: number; search: string; whitelabel?: string; preview?: CompanyPreview }) {
  const { retrying, reload } = useRetry()
  const { page, perPage, search, whitelabel } = query
  // Preview pins can never override a future integrated source, even if passed directly.
  const preview = COMPANY_CONTRACT.integrated ? undefined : query.preview
  const state = useMemo((): CompanySourceState<CompanyListData> => {
    if (retrying || preview === 'loading') return { status: 'loading' }
    if (preview === 'unavailable') return { status: 'unavailable' }
    if (preview === 'error') return { status: 'error', error: previewError() }
    if (preview === 'empty') {
      return { status: 'success', data: { rows: [], page: 1, perPage, total: 0, lastPage: 1, provenance: 'prototype', scopeMissing: false } }
    }
    const result = queryPrototypeCompanies({ page, perPage, search, whitelabel })
    return { status: 'success', data: { ...result, rows: result.rows.map(viewFromPrototype), provenance: 'prototype' } }
  }, [retrying, preview, page, perPage, search, whitelabel])

  return {
    state,
    reload,
    integrated: COMPANY_CONTRACT.integrated,
    /** Whitelabel filter options of the active source (illustrative refs while in prototype). */
    whitelabelOptions: PROTOTYPE_COMPANY_WHITELABELS as readonly PrototypeRef[],
  }
}

export function useCompanyDetail(companyId: string, requestedPreview?: CompanyPreview) {
  const { retrying, reload } = useRetry()
  const preview = COMPANY_CONTRACT.integrated ? undefined : requestedPreview
  const state = useMemo((): CompanySourceState<CompanyView> => {
    if (retrying || preview === 'loading') return { status: 'loading' }
    if (preview === 'unavailable') return { status: 'unavailable' }
    if (preview === 'error') return { status: 'error', error: previewError() }
    const record = prototypeCompanyById(companyId)
    // Same shape as a future 404, so the not-found state is shared.
    return record ? { status: 'success', data: viewFromPrototype(record) } : { status: 'error', error: new ApiError(404, {}, {}) }
  }, [retrying, preview, companyId])
  return { state, reload, integrated: COMPANY_CONTRACT.integrated }
}
