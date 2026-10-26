import { MENU_VISIBILITY_IDS } from '../features/menu-visibility/menuRegistry'
import { CARDINALITY, initialMockDatabase, MONEY, MOCK_SESSION, operator, OPERATOR_ID, STAMP, type MockRow } from './mockFixtures'
import { validateAccountCreation, type ParticipantKind } from './account-creation/accountCreationModel'

/** Dedicated mock protocol. There is deliberately no network client, URL base or fallback. */
const database = initialMockDatabase()
type Bag = Record<string, unknown>
const asBag = (value: unknown): Bag => value && typeof value === 'object' && !Array.isArray(value) ? value as Bag : {}
const mockMenu: Bag = { scope: 'global', version: 1, visibility: Object.fromEntries(MENU_VISIBILITY_IDS.map(id => [id, true])), updatedAt: null, updatedBy: null }
let sequence = 1000
const nextId = () => ++sequence
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'X-Correlation-ID': 'offline-mock-only' } })
const error = (status: number, code = 'MOCK_NOT_IMPLEMENTED') => json({ statusCode: status, code, message: 'Resposta da demonstração offline; nenhum serviço externo foi consultado.' }, status)
const envelope = (data: unknown, extra: Bag = {}) => ({ data, ...extra })
const detail = (row: unknown, extra: Bag = {}) => row ? json(envelope(row, extra)) : error(404, 'MOCK_NOT_FOUND')
const text = (v: unknown) => v == null ? '' : String(v)
const number = (v: unknown, fallback: number) => Number.isSafeInteger(Number(v)) && Number(v) > 0 ? Number(v) : fallback

function list<T extends object>(all: T[], query: URLSearchParams, extra: Bag = {}) {
  let rows = [...all] as Bag[]
  const search = (query.get('search') ?? '').toLocaleLowerCase('pt-BR')
  if (search) rows = rows.filter(row => JSON.stringify(row).toLocaleLowerCase('pt-BR').includes(search))
  for (const key of ['whitelabelId', 'status', 'modality', 'investorId', 'opportunityId', 'entrepreneurId', 'result', 'resourceType', 'resourceId', 'paymentMethod', 'provider', 'kind', 'category']) {
    const wanted = query.get(key)
    if (wanted !== null) rows = rows.filter(row => text(row[key]) === wanted)
  }
  if (query.has('active')) rows = rows.filter(row => row.isActive === (query.get('active') === 'true'))
  if (query.has('action')) rows = rows.filter(row => row.action === query.get('action'))
  if (query.has('operatorId')) rows = rows.filter(row => row.superAdminId === query.get('operatorId'))
  const dateKey = query.has('dateField') ? query.get('dateField')! : 'createdAt'
  if (query.has('from')) rows = rows.filter(row => text(row[dateKey]) >= query.get('from')!)
  if (query.has('to')) rows = rows.filter(row => text(row[dateKey]) <= query.get('to')!)
  const sort = query.get('sort') ?? 'createdAt', direction = query.get('order') === 'asc' ? 1 : -1
  rows.sort((a, b) => (typeof a[sort] === 'number' && typeof b[sort] === 'number' ? Number(a[sort]) - Number(b[sort]) : text(a[sort]).localeCompare(text(b[sort]), 'pt-BR')) * direction || text(a.id).localeCompare(text(b.id)))
  const page = number(query.get('page'), 1), perPage = Math.min(100, number(query.get('perPage'), 20)), total = rows.length
  return envelope(rows.slice((page - 1) * perPage, page * perPage), { meta: { page, perPage, total, lastPage: Math.max(1, Math.ceil(total / perPage)) }, ...extra })
}

function accountRows(kind: string | null) { return kind === 'empreendedores' ? database.entrepreneurs : kind === 'administradores' || kind === 'admins' ? database.admins : database.investors }
function accountOverview(row: MockRow) { return { accessState: row.accessState, reason: row.reason ?? null, pausedAt: row.pausedAt ?? null, emailVerifiedAt: row.emailVerifiedAt ?? null, createdAt: row.createdAt, updatedAt: row.updatedAt, lastLoginAt: row.mockCreated ? null : STAMP } }
function overview(row: MockRow, investor: boolean) {
  const related = database.opportunities.filter(o => o.entrepreneurId === row.id && o.whitelabelId === row.whitelabelId)
  if (!investor) {
    const company = database.companies.find(c => c.entrepreneurId === row.id && c.whitelabelId === row.whitelabelId)
    return envelope({ entrepreneur: row, account: accountOverview(row), company: company ? { companyId: company.id, legalName: company.legalName, tradeName: company.tradeName, cnpj: company.cnpj, status: company.status } : null,
      summary: { opportunitiesCount: related.length, activeOpportunities: related.filter(o => o.status === 'active').length, totalRaisedCents: null,
        byStatus: Object.fromEntries(['review', 'active', 'finished', 'archived'].map(status => [status, related.filter(o => o.status === status).length])) }, opportunities: related }, { cardinality: CARDINALITY })
  }
  const investments = database.investments.filter(i => i.investorId === row.id), payments = database.payments.filter(p => p.investorId === row.id)
  const wallet = !row.mockCreated && database.wallets.find(w => w.id === row.whitelabelId)
  return envelope({ investor: row, account: accountOverview(row), personalData: { investorType: row.investorType, personalInformationFilled: row.personalInformationFilled },
    kyc: row.mockCreated ? null : { status: 'approved', bureau: { status: 'approved', verifiedAt: STAMP }, faceMatch: { id: 100 + row.id, status: 'approved', submittedAt: STAMP, processedAt: STAMP } },
    summary: { investmentsCount: investments.length, investedAmountCents: row.mockCreated ? 0 : 123450, paymentsCount: payments.length },
    recentInvestments: investments.slice(0, 10).map(i => ({ ...i, opportunityName: database.opportunities.find(o => o.id === i.opportunityId)?.name ?? null })), recentPayments: payments.slice(0, 10),
    wallet: wallet ? { whitelabelId: row.whitelabelId, balance: wallet, recentMovements: [] } : null })
}

function settings(row: MockRow) {
  const terms = { configured: true, revision_id: 1, revision: 1, title: 'Termos de demonstração', content_markdown: '# Demonstração offline\n\nConteúdo sintético sem validade jurídica.', published_at: STAMP, updated_at: STAMP }
  return envelope({ whitelabel: row, settings: { quick_profile: { theme: { primaryColor: '#8982ef', backgroundColor: '#14161d', textColor: '#f1f0f8', sideTitle: 'Ecossistema de demonstração', sideSubtitle: 'Dados integralmente sintéticos' } },
    login: { title: 'Bem-vindo ao ambiente Demo', subtitle: 'Exemplo local', bullets: ['Dados sintéticos', 'Sem serviços externos', 'Sem operações financeiras'] },
    features: { investor_profile_enabled: true, anonymous_invest_default: false, wallet_visible: true, opportunity_show_entrepreneur: true, opportunity_show_whatsapp: false, opportunity_show_total_investors: true, opportunity_show_investor_profile: true, opportunity_show_warranty_amount: false },
    terminology: { config: { capabilityId: 'platform.terminology', version: 1, locale: 'pt-BR', values: { 'investmentPortfolio.label.singular': 'Carteira', 'investmentPortfolio.label.plural': 'Carteiras', 'investmentOffering.label.singular': 'Oportunidade', 'investmentOffering.label.plural': 'Oportunidades', 'investorRole.label.singular': 'Investidor', 'investorRole.label.plural': 'Investidores' } } } }, terms: { current: terms, history: [terms] } })
}

function kycRows() { return database.investors.filter(i => !i.mockCreated).map((i, index) => ({ id: 100 + i.id, status: index % 3 === 0 ? 'pending' : 'approved', investorId: i.id, investorName: i.fullName, whitelabelId: i.whitelabelId, faceMatchStatus: 'approved', updatedAt: STAMP })) }
function kycDetail(id: number) {
  const row = kycRows().find(r => r.id === id), investor = row && database.investors.find(i => i.id === row.investorId)
  return row && investor ? envelope({ id, status: row.status, investor, whitelabel: { id: investor.whitelabelId }, personalDataValidation: { status: 'approved' },
    document: { type: 'identity', status: 'submitted', validation: 'approved', submittedAt: STAMP }, ocr: { status: 'processed', ticketPresent: true },
    bureau: { status: 'approved', result: 'approved', documentMasked: '***.***.***-00', consultedAt: STAMP }, faceMatch: { status: 'approved', ticketPresent: true, submittedAt: STAMP, processedAt: STAMP },
    history: [{ event: 'FACE_MATCH_UPDATED', status: 'approved', createdAt: STAMP }] }) : null
}

function helper(kind: string, tenantId: number) {
  if (kind === 'entrepreneurs') return database.entrepreneurs.filter(e => e.whitelabelId === tenantId)
  if (kind === 'segments') return [{ id: 1, name: 'Tecnologia', whitelabelId: tenantId }, { id: 2, name: 'Capital de Giro', whitelabelId: tenantId }]
  if (kind === 'resource-utilizations') return [{ id: 1, code: 'expansao', name: 'Expansão', whitelabelId: tenantId }, { id: 2, code: 'capital_giro', name: 'Capital de Giro', whitelabelId: tenantId }]
  if (kind === 'contracts') return [{ id: 1, name: 'Contrato ilustrativo', whitelabelId: tenantId }]
  if (kind === 'investor-profiles') return [{ id: 1, title: 'Moderado', whitelabelId: tenantId }]
  return null
}

function mutateOpportunity(body: Bag, id?: number, action?: string) {
  if (!id) {
    const fields = asBag(body.opportunity), tenantId = Number(body.whitelabelId), entrepreneurId = Number(body.entrepreneurId)
    if (!database.entrepreneurs.some(e => e.id === entrepreneurId && e.whitelabelId === tenantId)) return error(422, 'MOCK_TENANT_MISMATCH')
    const row: MockRow = { id: nextId(), ...fields, whitelabelId: tenantId, entrepreneurId, modality: body.modality, isPrivate: body.is_private, status: 'review', createdAt: STAMP, updatedAt: STAMP }
    row.businessName = fields.business_name
    row.is_private = body.is_private
    database.opportunities.push(row)
    return json(envelope(row), 201)
  }
  const row = database.opportunities.find(o => o.id === id)
  if (!row) return error(404, 'MOCK_NOT_FOUND')
  if (!action) {
    const aliases: Record<string, string> = { business_name: 'businessName', image_id: 'imageId', is_private: 'isPrivate', promotional_video_url: 'promotionalVideoUrl', whatsapp_group: 'whatsappGroup', company_cnpj: 'companyCnpj', spe_cnpj: 'speCnpj' }
    Object.assign(row, body, { updatedAt: STAMP })
    for (const [key, alias] of Object.entries(aliases)) if (Object.hasOwn(body, key)) row[alias] = body[key]
    return json(envelope(row))
  }
  if (action === 'approve') row.status = 'active'
  else if (action === 'archive' || action === 'deny') { row.status = 'archived'; row.reasonForArchiving = body.reason }
  else return error(405)
  return json(envelope(row), 201)
}

/** In-memory HTTP-shaped boundary, used in DEV and production-built mock previews alike. */
export async function mockRequest(path: string, options: RequestInit = {}): Promise<Response> {
  if (options.signal?.aborted) throw new DOMException('Cancelled', 'AbortError')
  // A short bounded asynchronous tick lets loading/disabled states remain demonstrable.
  await new Promise(resolve => setTimeout(resolve, 40))
  if (options.signal?.aborted) throw new DOMException('Cancelled', 'AbortError')
  if (!path.startsWith('/') || path.startsWith('//') || /[\\\r\n]/.test(path)) return error(400, 'MOCK_EXTERNAL_PATH_REFUSED')
  const url = new URL(path, 'https://offline.example.invalid'), p = url.pathname, q = url.searchParams, method = options.method ?? 'GET'
  let body: Bag = {}
  if (typeof options.body === 'string') { try { body = asBag(JSON.parse(options.body)) } catch { return error(400) } }
  if (p === '/auth/login' && method === 'POST') {
    if (!text(body.email).endsWith('@example.invalid') || body.password !== 'demo') return error(401, 'MOCK_USE_DEMO_VALUES')
    const role = text(body.email).startsWith('readonly') ? 'READ_ONLY' : text(body.email).startsWith('support') ? 'SUPPORT_ADMIN' : 'SUPER_ADMIN'
    return json({ accessToken: MOCK_SESSION + ':' + role, tokenType: 'Bearer', operator: { ...operator, roles: [role] } })
  }
  const authorization = new Headers(options.headers).get('Authorization') ?? ''
  const role = authorization.replace('Bearer ' + MOCK_SESSION + ':', '')
  if (!authorization.startsWith('Bearer ' + MOCK_SESSION + ':') || !['SUPER_ADMIN', 'SUPPORT_ADMIN', 'READ_ONLY'].includes(role)) return error(401, 'MOCK_NO_SESSION')
  if (p === '/auth/me' && method === 'GET') return json({ ...operator, roles: [role] })
  if (method !== 'GET' && role !== 'SUPER_ADMIN' && !(role === 'SUPPORT_ADMIN' && /\/accounts\/\d+\/(pause|reactivate)$/.test(p))) return error(403, 'MOCK_READ_ONLY')

  // Explicitly synthetic namespace. No operational creation route or Core actor token is introduced.
  const creation = /^\/mock\/account-creation\/whitelabels\/([1-9]\d*)\/(investor|entrepreneur)(?:\/([1-9]\d*))?$/.exec(p)
  if (creation) {
    const tenantId = Number(creation[1]), kind = creation[2] as ParticipantKind
    if (!Number.isSafeInteger(tenantId) || !database.whitelabels.some(w => w.id === tenantId)) return error(404, 'MOCK_NOT_FOUND')
    const rows = kind === 'investor' ? database.investors : database.entrepreneurs
    if (method === 'GET' && creation[3]) {
      const row = rows.find(item => item.id === Number(creation[3]) && item.whitelabelId === tenantId)
      return row ? json(envelope(row.mockCreated ? row : null, { mockOnly: true })) : error(404, 'MOCK_NOT_FOUND')
    }
    if (method !== 'POST' || creation[3]) return error(405)
    const { values, errors } = validateAccountCreation(kind, body)
    if (Object.keys(errors).length) return error(422, 'MOCK_ACCOUNT_INPUT_INVALID')
    if (rows.some(item => item.whitelabelId === tenantId && text(item.email).trim().toLowerCase() === values.email)) return error(409, 'MOCK_EMAIL_TAKEN')
    const row: MockRow = { id: nextId(), type: kind, whitelabelId: tenantId, fullName: values.full_name, name: values.full_name, email: values.email, phone: values.phone,
      accessState: 'active', businessState: kind === 'investor' ? 'waiting' : 'incomplete', status: 'pending',
      emailVerifiedAt: null, termsAcceptedAt: null, termsRevisionId: null, personalInformationFilled: false,
      credentialsProvisioned: false, mockCreated: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      ...(kind === 'investor' ? { investorType: values.investor_type } : {}) }
    rows.push(row)
    if (kind === 'investor') {
      const tenant = database.whitelabels.find(w => w.id === tenantId)!
      tenant.counts = { ...asBag(tenant.counts), investors: rows.filter(item => item.whitelabelId === tenantId).length }
    }
    return json(envelope(row, { mockOnly: true }), 201)
  }

  if (p === '/homolog/menu-visibility') {
    if (method === 'GET') return json(envelope(mockMenu))
    if (method === 'PUT') {
      if (body.version !== mockMenu.version) return error(409, 'VERSION_CONFLICT')
      const map = asBag(body.visibility)
      if (Object.keys(map).length !== MENU_VISIBILITY_IDS.length || MENU_VISIBILITY_IDS.some(id => typeof map[id] !== 'boolean')) return error(422)
      Object.assign(mockMenu, { version: Number(mockMenu.version) + 1, visibility: map, updatedAt: STAMP, updatedBy: OPERATOR_ID })
      return json(envelope(mockMenu))
    }
    return error(405)
  }
  if (p === '/dashboard' && method === 'GET') return json(envelope({ scope: 'global', freshness: STAMP, kpis: { whitelabels: database.whitelabels.length, investors: database.investors.length } }))
  const tenantMatch = /^\/whitelabels\/(\d+)(?:\/(.*))?$/.exec(p)
  if (p === '/whitelabels') {
    if (method === 'GET') return json(list(database.whitelabels, q))
    if (method !== 'POST') return error(405)
    if (database.whitelabels.some(w => w.slug === body.slug)) return error(409, 'E_SLUG_TAKEN')
    const row: MockRow = { id: nextId(), name: text(body.name), slug: text(body.slug), baseUrl: text(body.baseUrl), domain: null, status: 'active', isActive: true, admins: 0, counts: { investors: 0 }, createdAt: STAMP, updatedAt: STAMP }
    database.whitelabels.push(row)
    return json(envelope(row), 201)
  }
  if (tenantMatch) {
    const tenantId = Number(tenantMatch[1]), tail = tenantMatch[2], tenantRow = database.whitelabels.find(w => w.id === tenantId)
    if (!tenantRow) return error(404, 'MOCK_NOT_FOUND')
    if (!tail && method === 'GET') return json(tenantRow)
    if ((!tail || tail === 'activate' || tail === 'deactivate') && ['PATCH', 'DELETE'].includes(method)) {
      if (!tail && method === 'PATCH') tenantRow.name = body.name
      else { tenantRow.isActive = tail === 'activate'; tenantRow.status = tenantRow.isActive ? 'active' : 'inactive' }
      tenantRow.updatedAt = STAMP
      return json(envelope(tenantRow))
    }
    if (tail === 'settings' && method === 'GET') return json(settings(tenantRow))
    const account = /^(accounts|admins)(?:\/(\d+))?(?:\/(pause|reactivate|activate|deactivate))?$/.exec(tail ?? '')
    if (account) {
      const dedicated = account[1] === 'admins', rows = dedicated ? database.admins : accountRows(q.get('tipo')), id = account[2] ? Number(account[2]) : null, action = account[3]
      const row = rows.find(a => a.id === id && a.whitelabelId === tenantId)
      if (method === 'GET') {
        const result = id ? envelope(row) : list(rows.filter(a => a.whitelabelId === tenantId), q)
        return id && !row ? error(404) : json(dedicated ? { status: 200, data: result } : result)
      }
      if (!id && dedicated && method === 'POST') {
        const email = text(body.email).trim().toLowerCase()
        if (Object.keys(body).some(key => !['email', 'password'].includes(key)) || email.length > 256 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || typeof body.password !== 'string' || body.password.length < 8 || body.password.length > 60) return error(422, 'ADMIN_INPUT_INVALID')
        if (database.admins.some(a => text(a.email).trim().toLowerCase() === email)) return error(422, 'E_EMAIL_TAKEN')
        const created: MockRow = { id: nextId(), whitelabelId: tenantId, type: 'admin', name: null, fullName: null, email, accessState: 'active', businessState: 'active', invitation: null, isSuperAdmin: false, emailVerifiedAt: null, credentialsProvisioned: false, createdAt: STAMP, updatedAt: STAMP }
        database.admins.push(created)
        tenantRow.admins = database.admins.filter(item => item.whitelabelId === tenantId).length
        return json(envelope(created), 201)
      }
      if (!row) return error(404)
      if (dedicated && method === 'PATCH') {
        if (action) { row.accessState = action === 'activate' ? 'active' : 'paused'; row.businessState = action === 'activate' ? 'active' : 'disabled' }
        else { if (body.name !== undefined) row.name = row.fullName = body.name; if (body.email !== undefined) row.email = body.email }
        row.updatedAt = STAMP
        return json(envelope(row))
      }
      if (!dedicated && method === 'POST' && (action === 'pause' || action === 'reactivate')) {
        row.accessState = action === 'pause' ? 'paused' : 'active'; row.reason = action === 'pause' ? body.reason : null; row.pausedAt = action === 'pause' ? STAMP : null
        return json(envelope({ accountId: row.id, whitelabelId: tenantId, accountType: row.type, accessState: row.accessState }), 201)
      }
      return error(405)
    }
  }

  const participant = /^\/(investors|entrepreneurs)(?:\/(\d+))?(?:\/(overview|company))?$/.exec(p)
  if (participant && method === 'GET') {
    const rows = participant[1] === 'investors' ? database.investors : database.entrepreneurs, id = Number(participant[2]), row = rows.find(r => r.id === id)
    if (!participant[2]) return json(list(rows, q))
    if (!row) return error(404)
    if (participant[3] === 'overview') return json(overview(row, participant[1] === 'investors'))
    if (participant[3] === 'company') return json(envelope(database.companies.find(c => c.entrepreneurId === id) ?? null, { cardinality: CARDINALITY }))
    return detail(row)
  }
  if (p.startsWith('/opportunities/helpers/')) {
    const kind = p.slice('/opportunities/helpers/'.length)
    if (kind === 'images' && method === 'POST') return json(envelope({ id: nextId() }), 201)
    const rows = helper(kind, number(q.get('whitelabelId'), 1))
    return method === 'GET' && rows ? json(envelope(rows)) : error(405)
  }
  const opportunity = /^\/opportunities(?:\/(\d+))?(?:\/(archive|deny|approve))?$/.exec(p)
  if (opportunity) {
    if (method === 'GET') return opportunity[1] ? detail(database.opportunities.find(o => o.id === Number(opportunity[1]))) : json(list(database.opportunities, q))
    if ((method === 'POST' && (!opportunity[1] || opportunity[2])) || method === 'PATCH' && opportunity[1] && !opportunity[2]) return mutateOpportunity(body, opportunity[1] ? Number(opportunity[1]) : undefined, opportunity[2])
    return error(405)
  }
  const company = /^\/companies(?:\/(\d+))?$/.exec(p)
  if (company && method === 'GET') return company[1] ? detail(database.companies.find(c => c.id === Number(company[1])), { cardinality: CARDINALITY }) : json(list(database.companies, q, { cardinality: CARDINALITY }))
  const finance = /^\/(investments|payments|wallets)(?:\/(\d+))?(?:\/(movements|investments))?$/.exec(p)
  if (finance && method === 'GET') {
    const rows = database[finance[1] as 'investments' | 'payments' | 'wallets'], id = Number(finance[2])
    if (!finance[2]) return json(list(rows, q, { money: MONEY }))
    if (finance[3] === 'investments') return json(list(database.investments.filter(i => i.whitelabelId === id), q, { money: MONEY }))
    if (finance[3] === 'movements') {
      const movements = database.movements.filter(m => m.whitelabelId === id)
      return json(list(movements, q, { money: MONEY }))
    }
    return detail(rows.find(r => r.id === id), { money: MONEY })
  }
  if (p === '/audit' && method === 'GET') return json(list(database.audit, q))
  const kyc = /^\/compliance\/kyc(?:\/(\d+))?$/.exec(p)
  if (kyc && method === 'GET') return kyc[1] ? (kycDetail(Number(kyc[1])) ? json(kycDetail(Number(kyc[1]))) : error(404)) : json(list(kycRows(), q))
  const operators = /^\/operators(?:\/(c[a-z0-9]{24}))?$/.exec(p)
  if (operators && method === 'GET') {
    if (role !== 'SUPER_ADMIN') return error(403, 'MOCK_FORBIDDEN')
    const row = { ...operator, roleDetails: [{ slug: 'SUPER_ADMIN', name: 'Super Admin' }], status: 'active', lastLoginAt: STAMP, createdAt: STAMP, updatedAt: STAMP }
    return operators[1] ? (operators[1] === OPERATOR_ID ? detail(row) : error(404)) : json(list([row], q))
  }
  // Includes all financial writes, external provisioning and unknown endpoints.
  return error(405, 'MOCK_OPERATION_UNAVAILABLE')
}
