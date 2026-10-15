/*
 * Companies (Empresas) — FUTURE Backend contract, CANDIDATE TYPES ONLY.
 *
 * COMPANIES FRONTEND V1 IS A PROTOTYPE. NO AUTHORITATIVE COMPANY BACKEND
 * CONTRACT IS CURRENTLY INTEGRATED. This module has no request code: it never
 * calls `fetch`, `apiRequest` or the authenticated client, and nothing here
 * is sent anywhere. The shapes below are *candidates* for a contract that
 * does not exist yet:
 *
 *   GET /companies?page=&perPage=&search=&whitelabelId=   (candidate, not available)
 *   GET /companies/:companyId                              (candidate, not available)
 *
 * Every field name, type and nullability is provisional until the Backend
 * publishes the contract. Integrating it later means: confirm the contract,
 * add a strict parser + GET client in a Companies API module (never in the
 * Entrepreneur adapter), replace the prototype source, and flip
 * `COMPANY_CONTRACT.integrated`.
 *
 * Open domain questions (not decided here; see docs/companies-frontend-v1.md):
 * - Entrepreneur ↔ Company cardinality (0..1 or N companies per entrepreneur);
 * - official status vocabulary and lifecycle;
 * - tax identifier (CNPJ) format, validation and uniqueness rules;
 * - Company CRUD (none in this version).
 */

/** Candidate Company record from a future `GET /companies/:companyId` (not available). */
export type CompanyRecordCandidate = {
  /** Independent Company identity. Numeric values may coincide with an Entrepreneur id without identifying the same entity. */
  id: string
  /**
   * Core Entrepreneur id this Company is linked to — the future authoritative
   * relationship. Its cardinality (one Company or several per Entrepreneur)
   * is an open question; `null` covers a Company with no linked Entrepreneur.
   */
  entrepreneurId: string | null
  /** Core Whitelabel id (tenant scope). */
  whitelabelId: string | null
  /** Razão social. */
  legalName: string | null
  /** Nome fantasia. */
  tradeName: string | null
  /** Tax identifier (CNPJ) as returned by the Backend; displayed masked, never validated here. */
  taxId: string | null
  /** Official status — raw Backend value; its vocabulary is not defined yet. */
  officialStatus: string | null
  createdAt: string | null
  updatedAt: string | null
}

/** Candidate list query of a future `GET /companies` (not sent). */
export type CompanyListQueryCandidate = {
  page: number
  perPage: number
  search?: string
  whitelabelId?: string
}

/** Candidate list result (`data` + pagination `meta`, as the other Control Plane lists). */
export type CompanyListResultCandidate<Row> = {
  rows: Row[]
  page: number
  perPage: number
  total: number
  lastPage: number
}

/** Integration status of the Companies contract. Nothing is requested while `integrated` is false. */
export const COMPANY_CONTRACT = {
  integrated: false,
  listEndpoint: 'GET /companies',
  detailEndpoint: 'GET /companies/:companyId',
  /** Server-side capabilities the list UI is ready for once confirmed. */
  serverFeatures: {
    pagination: 'pending',
    search: 'pending',
    whitelabelFilter: 'pending',
    /** Not rendered: shown only if the Backend exposes a status filter and its vocabulary. */
    statusFilter: 'not-supported',
  },
} as const
