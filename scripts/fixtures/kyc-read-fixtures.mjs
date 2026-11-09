// Synthetic, no real identities. Never imported by application code.
export const row = (i = 0, overrides = {}) => ({ id: 100 - i, status: 'pending', investorId: 900 - i,
  investorName: `Pessoa QA Sintética ${i}`, whitelabelId: 6, faceMatchStatus: 'approved', updatedAt: '2026-10-22T03:00:00Z', ...overrides })
export const page = (p = 1, total = 23, overrides = {}) => ({ data: Array.from({ length: Math.min(20, Math.max(0, total - (p - 1) * 20)) }, (_, i) => row(i + (p - 1) * 20)),
  meta: { page: p, perPage: 20, total, lastPage: Math.max(1, Math.ceil(total / 20)) }, ...overrides })
export const detail = (overrides = {}) => ({ data: { id: 100, status: 'pending',
  investor: { id: 900, fullName: 'Pessoa QA Sintética', whitelabelId: 6, email: 'PRIVATE_EMAIL', documentMasked: '***.***.***-00' }, whitelabel: { id: 6 },
  personalDataValidation: { status: 'unknown', nameFromBureau: 'PRIVATE_BUREAU_NAME' },
  document: { type: 'identity', status: 'submitted', validation: 'approved', submittedAt: '2026-10-22T03:00:00Z', binary: 'PRIVATE_BINARY' },
  ocr: { status: 'not_available', ticketPresent: false, result: 'PRIVATE_OCR_TEXT', comparedFields: ['PRIVATE_FIELD'] },
  bureau: { status: 'unknown', result: 'unknown', documentMasked: '***.***.***-00', consultedAt: null, financialRiskLevel: 'PRIVATE_RISK' },
  faceMatch: { status: 'approved', ticketPresent: true, submittedAt: '2026-10-22T03:00:00Z', processedAt: null, score: 99, raw: 'PRIVATE_BIOMETRIC', ticket: 'PRIVATE_TICKET' },
  manualReview: { status: 'approved', required: false, reason: 'PRIVATE_REASON', reviewedBy: 'PRIVATE_REVIEWER' },
  history: [{ event: 'FACE_MATCH_UPDATED', status: 'approved', createdAt: '2026-10-22T03:00:00Z', raw: 'PRIVATE_HISTORY' }], ...overrides } })
