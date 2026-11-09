// Opportunities + Companies Read V1 — synthetic fixtures for scripts/check-opportunities-companies-read.mjs
// and scripts/check-companies-frontend.mjs. Field names and types mirror the Control Plane contract
// (Backend `docs/opportunities-read-contract-v1.md` and `docs/arthur-demands-backend-v1.md`, checked live
// on 2026-10-18). Every value is invented: no real company, CNPJ, person, contact or Whitelabel. CNPJs use
// the root 00.000.000 with INVALID check digits, so none is a valid (issuable) CNPJ — the hygiene check in
// scripts/check-companies-frontend.mjs proves it. Test infrastructure only — never imported
// by application code.

export const meta = (overrides = {}) => ({ page: 1, perPage: 20, total: 1, lastPage: 1, ...overrides })

export const CARDINALITY = Object.freeze({
  entrepreneurToCompany: '0..1',
  companyToEntrepreneur: '1',
  note: 'Synthetic cardinality note.',
})

export const opportunityRow = Object.freeze({
  id: 701,
  whitelabelId: 4,
  entrepreneurId: 41,
  name: 'Synthetic Expansion',
  businessName: 'Synthetic Business Ltda',
  modality: 'debt',
  status: 'active',
  fundraisingCompletion: null,
  isPrivate: false,
  segment: { id: 3, name: 'Capital de Giro' },
  resourceUse: { code: 'working_capital', name: 'Capital de giro' },
  dueAt: '2026-12-01T00:00:00.000-03:00',
  openedAt: '2026-01-01T00:00:00.000-03:00',
  endedAt: null,
  createdAt: '2026-01-01T00:00:00.000-03:00',
  updatedAt: '2026-01-02T00:00:00.000-03:00',
})

export const opportunityDetail = Object.freeze({
  ...opportunityRow,
  description: 'Synthetic description.',
  about: null,
  quotaQuantity: 100,
  reasonForArchiving: null,
})

export const companyRow = Object.freeze({
  id: 9,
  entrepreneurId: 41,
  whitelabelId: 4,
  legalName: 'Synthetic Legal Name Ltda',
  tradeName: 'Synthetic Trade',
  cnpj: '00000000000100',
  status: 'pending',
  createdAt: '2026-02-01T12:00:00.000Z',
  updatedAt: '2026-02-02T12:00:00.000Z',
})

export const companyRowB = Object.freeze({ ...companyRow, id: 10, entrepreneurId: 42, legalName: 'Synthetic Second Ltda', tradeName: null, cnpj: '00000000000200', status: 'validated' })

export const companyDetail = Object.freeze({
  ...companyRow,
  phone: '11900000041',
  email: 'company@example.invalid',
  validationSource: null,
  validatedAt: null,
})

export const page = (rows, metaOverrides = {}, extra = {}) => ({ data: rows, meta: meta({ total: rows.length, ...metaOverrides }), ...extra })
/** Companies list page at the screen's page size (perPage 10), with the documented cardinality. */
export const companyPage = (rows, metaOverrides = {}) => page(rows, { perPage: 10, ...metaOverrides }, { cardinality: CARDINALITY })
export const detail = (data, extra = {}) => ({ data, ...extra })
