// Whitelabel CRUD Safe Preparation V1 — MOCK-ONLY TEST FIXTURES.
//
// Used only by scripts/check-whitelabel-crud*.mjs. Never imported by `src/`
// (a check enforces it), never bundled, never a production transport.
// Every value is synthetic. Mock responses are test fixtures: they mirror the
// Nest source (b414963 plus aea5392's 409 mapping) and are NOT proof of the
// real Core envelope, which has never been live-write-verified.

/* ---------- synthetic records (Control Plane read shape) ---------- */

export const RECORD_A = Object.freeze({
  id: '4', name: 'Synthetic Alpha', slug: 'synthetic-alpha', baseUrl: 'https://alpha.example.test', domain: 'alpha.example.test',
  status: 'active', admins: 2, applications: null, integrations: null, createdAt: '2026-01-10T12:00:00.000Z', updatedAt: '2026-10-01T12:00:00.000Z',
})
export const RECORD_B = Object.freeze({
  id: '7', name: 'Synthetic Beta', slug: 'synthetic-beta', baseUrl: 'http://beta.example.test:8080', domain: 'beta.example.test',
  status: 'active', admins: 0, applications: null, integrations: null, createdAt: '2026-02-11T12:00:00.000Z', updatedAt: '2026-09-02T12:00:00.000Z',
})

/** The Control Plane wire shape of a record (`GET /whitelabels/:id`, and `data` of a mapped mutation response). */
export function wire(record, overrides = {}) {
  return {
    id: Number(record.id), idKey: record.id, slug: record.slug, name: record.name, baseUrl: record.baseUrl, domain: record.domain,
    isActive: record.status === 'active', status: record.status, counts: {}, admins: record.admins, applications: null, integrations: null,
    createdAt: record.createdAt, updatedAt: record.updatedAt, ...overrides,
  }
}

/** A raw (unmapped) Core row — what `{ data: mapped ?? result.data }` returns when Core does not wrap in `data`. */
export function rawCoreRow(record) {
  return { id: Number(record.id), name: record.name, slug: record.slug, base_url: record.baseUrl, is_active: true }
}

/* ---------- Nest error bodies (AllExceptionsFilter shape) ---------- */

const cid = (n) => `cid-synthetic-${n}`
export const ERROR_BODIES = Object.freeze({
  validation: (messages) => ({ statusCode: 400, code: 'HTTP_ERROR', message: messages, correlationId: cid(400), details: { message: messages, error: 'Bad Request', statusCode: 400 } }),
  invalidId: () => ({ statusCode: 400, code: 'INVALID_WHITELABEL_ID', message: 'synthetic-private-backend-message', correlationId: cid('400id') }),
  unauthorized: () => ({ statusCode: 401, code: 'UNAUTHORIZED', message: 'synthetic-private-backend-message', correlationId: cid(401) }),
  forbidden: () => ({ statusCode: 403, code: 'FORBIDDEN', message: 'Insufficient role', correlationId: cid(403) }),
  notFound: () => ({ statusCode: 404, code: 'HTTP_ERROR', message: 'Whitelabel not found', correlationId: cid(404) }),
  coreUnprocessable: () => ({ statusCode: 422, code: 'CORE_HTTP_ERROR', message: 'synthetic-private-backend-message', correlationId: cid(422), details: { coreStatus: 422 } }),
  slugTaken: () => ({ statusCode: 422, code: 'E_SLUG_TAKEN', message: 'synthetic-private-backend-message', correlationId: cid('422slug'), details: { coreStatus: 422, coreBody: { code: 'E_SLUG_TAKEN' } } }),
  slugConflict: () => ({ statusCode: 409, code: 'E_SLUG_TAKEN', message: 'synthetic-private-backend-message', correlationId: cid('409slug') }),
  throttled: () => ({ statusCode: 429, code: 'HTTP_ERROR', message: 'ThrottlerException: Too Many Requests', correlationId: cid(429) }),
  /** Historical Nest / generic post-Core failure fixture. aea5392 catches Audit failures. */
  auditFailure: () => ({ statusCode: 500, code: 'INTERNAL_ERROR', message: 'Internal server error', correlationId: cid('500audit') }),
  coreUnavailable: () => ({ statusCode: 503, code: 'CORE_UNAVAILABLE', message: 'synthetic-private-backend-message', correlationId: cid(503) }),
})

/* ---------- validator.js 13.15.35 reference verdicts (class-validator 0.14.4) ---------- */

// isURL(value, { require_tld: false }) — recorded with the exact version in the
// Backend lockfile; the frontend rule must accept a subset of these.
// ['GEN_LABEL', n] = 'https://' + 'a' * n + '.test'; ['GEN_PATH', n] = 'https://x.test/' + 'p' * n.
export const IS_URL_REFERENCE = Object.freeze([
  ['finapop.com.br', true], ['http://localhost:3000', true], ['https://a_b.example.com', false], ['http://host.', false], ['http://a', true],
  ['ftp://x.test', true], ['https://user:pw@x.test', true], ['http://[::1]:3000', true], ['http://999.1.1.1', false], ['http://host:0', false],
  ['https://ação.com.br', true], ['http://-a.com', false], ['HTTPS://X.TEST', true], ['https://plataforma.com.br', true], ['http://localhost', true],
  ['https://a.example.test/path?x=1#y', true], ['http://1.2.3.4', true], ['http://1.2.3', false], ['http://01.1.1.1', false], ['http://256.1.1.1', false],
  ['http://a.1b', true], ['https://x.test:65535', true], ['https://x.test:65536', false], ['https://x.test:', true], ['https://x.test:abc', false],
  ['https://', false], ['http:///x', false], ['https://x..test', false], ['https://x.test/<script>', false], ['https:// x.test', false],
  ['javascript:alert(1)', false], ['mailto:a@b.test', false], ['//x.test', false], ['http://x.test\\evil', false], ['https://x.test?', true],
  ['https://x.test#', true], ['https://x-.test', false], [['GEN_LABEL', 63], true], [['GEN_LABEL', 64], false], [['GEN_PATH', 2060], true],
  [['GEN_PATH', 2080], false], ['http://x.test:080', true], ['http://x.test:00001', true], ['https://xn--ao-ula.com.br', true], ['https://x.test/çã', true],
  ['https://x.test/%zz', true], ['https://x.test/a b', false], ['http://127.0.0.1:8080', true], ['http://0.0.0.0', true], ['http://a.b.c.d.e', true],
  ['https://X_Y.test', false], ['https://x.test:1', true], ['https://x.test/@user', true], ['https://@x.test', false], ['https://:@x.test', false],
  ['HTTP://LOCALHOST:1', true], ['http://192.168.0.1/', true], ['https://finapop.com.br/', true], ['https://x.123', false], ['https://123', false],
  ['https://x.test.:80', false],
].map(([value, accepted]) => Object.freeze([
  Array.isArray(value) ? (value[0] === 'GEN_LABEL' ? `https://${'a'.repeat(value[1])}.test` : `https://x.test/${'p'.repeat(value[1])}`) : value,
  accepted,
])))

/** Values IsUrl accepts that the frontend refuses on purpose (documented, stricter subset). */
export const STRICTER_THAN_IS_URL = Object.freeze(['finapop.com.br', 'ftp://x.test', 'https://user:pw@x.test', 'http://[::1]:3000', 'https://ação.com.br', 'https://x.test:'])

// isLength(value, { min: 2 }) / isLength(value, { min: 0, max: 120 }) — MinLength(2) / MaxLength(120).
export const IS_LENGTH_REFERENCE = Object.freeze([
  ['A', false, true], ['Ab', true, true], ['\u{1F600}', false, true], ['\u{1F600}\u{1F600}', true, true], ['é', false, true],
  ['é', true, true], ['❤️', false, true], ['❤️❤️', true, true], ['a️', false, true], ['️', false, true],
  ['️️', true, true], ['x'.repeat(120), true, true], ['x'.repeat(121), true, false], ['\u{1F600}'.repeat(60), true, true],
  ['\u{1F600}'.repeat(61), true, true], ['\u{1F600}'.repeat(120), true, true], ['\u{1F600}'.repeat(121), true, false],
].map((row) => Object.freeze(row)))

/* ---------- mock-only transport and read-back ---------- */

/**
 * A controllable fake of a FUTURE transport. `respond` decides each answer
 * from the command (no network). With `hold: true` every call waits until
 * `release(index, answer?)`, to observe pending / duplicate / stale cases.
 * The answer mirrors what the shared client would hand back: `{ ok: true,
 * body }` for 2xx, `{ ok: false, error: ApiError }` otherwise.
 */
export function createMockTransport({ ApiError, respond, hold = false }) {
  const calls = []
  const waiting = []
  const answer = (spec) => {
    if (spec.kind === 'timeout' || spec.kind === 'network') return { ok: false, error: new ApiError(0, {}, { kind: spec.kind, correlationId: 'cid-synthetic-client' }) }
    if (spec.kind === 'malformed') return { ok: false, error: new ApiError(200, {}, { kind: 'malformed', correlationId: 'cid-synthetic-client' }) }
    if (spec.status >= 200 && spec.status < 300) return { ok: true, body: spec.body }
    return { ok: false, error: new ApiError(spec.status, spec.body ?? {}, { correlationId: 'cid-synthetic-header' }) }
  }
  const transport = (command) => {
    calls.push(structuredClone({ operation: command.operation, targetId: command.targetId, route: command.route, body: command.body }))
    if (!hold) return Promise.resolve(answer(respond(command)))
    return new Promise((resolve) => waiting.push({ command, resolve }))
  }
  return {
    transport,
    calls,
    pendingCount: () => waiting.filter((entry) => !entry.done).length,
    release(index = 0, spec) {
      const entry = waiting[index]
      entry.done = true
      entry.resolve(answer(spec ?? respond(entry.command)))
    },
  }
}

/** Fake authoritative reads (`GET /whitelabels/:id`, `GET /whitelabels?search=`). Optional holds per call. */
export function createMockReadback({ ApiError, records, hold = false }) {
  const store = new Map(records.map((record) => [record.id, { ...record }]))
  const calls = []
  const waiting = []
  const settle = (fn) => (hold ? new Promise((resolve, reject) => waiting.push({ run: () => { try { resolve(fn()) } catch (error) { reject(error) } } })) : Promise.resolve().then(fn))
  return {
    store,
    calls,
    port: {
      getWhitelabel: (id) => {
        calls.push(['get', id])
        return settle(() => {
          const record = store.get(id)
          if (!record) throw new ApiError(404, ERROR_BODIES.notFound())
          return { ...record }
        })
      },
      findBySlug: (slug) => {
        calls.push(['search', slug])
        return settle(() => ({ rows: [...store.values()].filter((record) => record.slug.includes(slug)).map((record) => ({ ...record })), complete: true }))
      },
    },
    release(index) {
      waiting[index].run()
    },
  }
}
