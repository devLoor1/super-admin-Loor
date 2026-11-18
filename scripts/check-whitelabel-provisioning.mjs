import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import ts from 'typescript'
import { readFile } from 'node:fs/promises'

/**
 * Whitelabel Provisioning MVP — synthetic contract checks (no network).
 * Covers parse/build/flags/gates/delivery scrubbing against the Nest present() shape.
 */
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(pathToFileURL(resolve(root, 'package.json')))
const modules = new Map()

async function moduleUrl(path, env = {}) {
  if (modules.has(path + JSON.stringify(env))) return modules.get(path + JSON.stringify(env))
  let code = ts.transpileModule(await readFile(path, 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
  }).outputText
  const envLiteral = JSON.stringify({
    VITE_API_BASE_URL: 'https://control-plane.example.invalid/api',
    VITE_WHITELABEL_WRITES_ENABLED: 'true',
    VITE_WHITELABEL_LIFECYCLE_ENABLED: 'false',
    ...env,
  })
  code = code.replaceAll('import.meta.env', `(${envLiteral})`)
  for (const match of [...code.matchAll(/from\s+(['"])([^'"]+)\1/g)]) {
    const specifier = match[2]
    const url = specifier.startsWith('.')
      ? await moduleUrl(resolve(dirname(path), `${specifier}.ts`), env)
      : pathToFileURL(require.resolve(specifier)).href
    code = code.replace(match[0], `from ${JSON.stringify(url)}`)
  }
  const url = `data:text/javascript;base64,${Buffer.from(code).toString('base64')}`
  modules.set(path + JSON.stringify(env), url)
  return url
}

const load = async (rel, env) => import(await moduleUrl(resolve(root, rel), env))

let failed = 0
async function check(name, fn) {
  try {
    await fn()
    console.log(`ok  ${name}`)
  } catch (error) {
    failed += 1
    console.error(`FAIL ${name}`)
    console.error(error)
  }
}

const sample = {
  data: {
    id: 'cmwlak1jg0003b03lxeyagzce',
    whitelabelId: 10,
    name: 'SA Prov Smoke',
    slug: 'sa-prov-smoke',
    baseUrl: 'https://sa-prov-smoke.example.invalid',
    status: 'COMPLETED',
    currentStep: null,
    requestedBy: 'op-1',
    correlationId: 'corr-1',
    templateFromWhitelabelId: null,
    errorCode: null,
    errorMessage: null,
    progress: { completed: 11, total: 11, percentage: 100 },
    steps: [
      { key: 'CREATE_TENANT', status: 'SUCCESS', attempts: 1, payload: null, result: { id: 10 }, lastErrorCode: null, lastErrorMessage: null, startedAt: '2026-11-17T22:00:00.000Z', completedAt: '2026-11-17T22:00:01.000Z' },
      { key: 'APPLY_SETTINGS_TEMPLATE', status: 'SKIPPED', attempts: 0, payload: null, result: null, lastErrorCode: null, lastErrorMessage: null, startedAt: null, completedAt: null },
      { key: 'UPLOAD_BRAND', status: 'SKIPPED', attempts: 0, payload: null, result: null, lastErrorCode: null, lastErrorMessage: null, startedAt: null, completedAt: null },
      { key: 'INITIAL_ADMIN', status: 'SUCCESS', attempts: 1, payload: { email: 'a@example.invalid', name: 'Ana' }, result: {}, lastErrorCode: null, lastErrorMessage: null, startedAt: '2026-11-17T22:00:02.000Z', completedAt: '2026-11-17T22:00:03.000Z' },
      { key: 'TERMS', status: 'SUCCESS', attempts: 1, payload: null, result: {}, lastErrorCode: null, lastErrorMessage: null, startedAt: null, completedAt: null },
      { key: 'SMTP', status: 'SKIPPED', attempts: 0, payload: null, result: null, lastErrorCode: null, lastErrorMessage: null, startedAt: null, completedAt: null },
      { key: 'GATEWAY_CONFIG', status: 'SKIPPED', attempts: 0, payload: null, result: null, lastErrorCode: null, lastErrorMessage: null, startedAt: null, completedAt: null },
      { key: 'FE_DEPLOY_CHECK', status: 'SKIPPED', attempts: 0, payload: null, result: null, lastErrorCode: null, lastErrorMessage: null, startedAt: null, completedAt: null },
      { key: 'DNS_CHECK', status: 'SKIPPED', attempts: 0, payload: null, result: null, lastErrorCode: null, lastErrorMessage: null, startedAt: null, completedAt: null },
      { key: 'VALIDATE', status: 'SUCCESS', attempts: 1, payload: null, result: {}, lastErrorCode: null, lastErrorMessage: null, startedAt: null, completedAt: null },
      { key: 'DELIVER', status: 'SUCCESS', attempts: 1, payload: null, result: { delivered: true }, lastErrorCode: null, lastErrorMessage: null, startedAt: null, completedAt: null },
    ],
    delivery: {
      name: 'SA Prov Smoke',
      slug: 'sa-prov-smoke',
      baseUrl: 'https://sa-prov-smoke.example.invalid',
      whitelabelId: 10,
      admin: { email: 'a@example.invalid', name: 'Ana' },
      urls: {
        primary: 'https://sa-prov-smoke.example.invalid',
        investor: 'https://sa-prov-smoke.investor.loor.vc',
        entrepreneur: 'https://sa-prov-smoke.empresa.loor.vc',
        admin: 'https://sa-prov-smoke.admin.loor.vc',
      },
      suggestedUrls: {
        investor: 'https://sa-prov-smoke.investor.loor.vc',
        entrepreneur: 'https://sa-prov-smoke.empresa.loor.vc',
        admin: 'https://sa-prov-smoke.admin.loor.vc',
        note: 'Homolog convention only',
      },
      credentialsNote: 'The temporary admin password is never stored',
      generatedAt: '2026-11-17T22:00:10.000Z',
      correlationId: 'corr-1',
    },
    startedAt: '2026-11-17T22:00:00.000Z',
    completedAt: '2026-11-17T22:00:10.000Z',
    createdAt: '2026-11-17T22:00:00.000Z',
    updatedAt: '2026-11-17T22:00:10.000Z',
  },
}

const api = await load('src/features/whitelabel-provisioning/provisioningApi.ts')
const form = await load('src/features/whitelabel-provisioning/provisioningForm.ts')
const route = await load('src/features/whitelabel-provisioning/provisioningRoute.ts')
const labels = await load('src/features/whitelabel-provisioning/provisioningLabels.ts')
const contractOff = await load('src/features/whitelabels/crud/whitelabelMutationContract.ts', {
  VITE_WHITELABEL_WRITES_ENABLED: 'false',
})

await check('parses COMPLETED provisioning with delivery', () => {
  const row = api.parseProvisioning(sample)
  assert.equal(row.status, 'COMPLETED')
  assert.equal(row.progress.percentage, 100)
  assert.equal(row.steps.length, 11)
  assert.equal(row.delivery.admin.email, 'a@example.invalid')
  assert.equal(row.steps.find((s) => s.key === 'CREATE_TENANT').status, 'SUCCESS')
  assert.equal(row.steps.find((s) => s.key === 'UPLOAD_BRAND').status, 'SKIPPED')
})

await check('rejects secret-like keys in delivery', () => {
  assert.throws(() => api.parseProvisioning({
    data: {
      ...sample.data,
      delivery: { ...sample.data.delivery, password: 'x' },
    },
  }))
})

await check('FAILED step shape + terminal helpers', () => {
  const failed = api.parseProvisioning({
    data: {
      ...sample.data,
      status: 'FAILED',
      currentStep: 'SMTP',
      delivery: null,
      progress: { completed: 3, total: 11, percentage: 27 },
      steps: sample.data.steps.map((s) => s.key === 'SMTP'
        ? { ...s, status: 'FAILED', attempts: 2, lastErrorCode: 'E_SMTP', lastErrorMessage: 'smtp down' }
        : s),
    },
  })
  assert.equal(failed.status, 'FAILED')
  assert.equal(failed.steps.find((s) => s.key === 'SMTP').status, 'FAILED')
  assert.equal(api.isTerminalProvisioningStatus('FAILED'), true)
  assert.equal(api.isTerminalProvisioningStatus('RUNNING'), false)
  assert.equal(api.isTerminalProvisioningStatus('WAITING_MANUAL_ACTION'), true)
})

await check('manual gates are automatic on Control Plane (isManualGate always false)', () => {
  assert.equal(api.isManualGate('FE_DEPLOY_CHECK'), false)
  assert.equal(api.isManualGate('DNS_CHECK'), false)
  assert.equal(api.isManualGate('CREATE_TENANT'), false)
  assert.deepEqual([...api.MANUAL_GATE_KEYS], ['FE_DEPLOY_CHECK', 'DNS_CHECK'])
})

await check('suggestedFrontendUrls homolog convention', () => {
  assert.deepEqual(api.suggestedFrontendUrls('Wl-Hml-Test', 'PATH'), {
    investor: 'https://homolog.loor.vc/w/wl-hml-test',
    entrepreneur: 'https://homolog.empresa.loor.vc/w/wl-hml-test',
    admin: 'https://homolog.admin.loor.vc/w/wl-hml-test',
  })
  assert.deepEqual(api.suggestedFrontendUrls('Wl-Hml-Test', 'HOSTNAME'), {
    investor: 'https://wl-hml-test.investor.loor.vc',
    entrepreneur: 'https://wl-hml-test.empresa.loor.vc',
    admin: 'https://wl-hml-test.admin.loor.vc',
  })
  assert.equal(api.isHttpsOrigin('https://wl-hml-test.investor.loor.vc'), true)
  assert.equal(api.isHttpsOrigin('http://wl-hml-test.investor.loor.vc'), false)
})

await check('parses delivery with null confirmed urls when gates skipped', () => {
  const row = api.parseProvisioning({
    data: {
      ...sample.data,
      delivery: {
        ...sample.data.delivery,
        urls: {
          primary: 'https://sa-prov-smoke.example.invalid',
          investor: null,
          entrepreneur: null,
          admin: null,
        },
      },
    },
  })
  assert.equal(row.delivery.urls.investor, null)
  assert.equal(row.delivery.suggestedUrls.investor, 'https://sa-prov-smoke.investor.loor.vc')
})

await check('wizard buildCreateBody posts Nest DTO fields only', () => {
  const body = form.buildCreateBody({
    ...form.EMPTY_PROVISIONING_DRAFT,
    name: 'Acme Capital',
    slug: 'acme-capital',
    baseUrl: 'https://acme.example.invalid',
    envInvestor: true,
    envAdmin: true,
    templateFromWhitelabelId: '6',
    adminEnabled: true,
    adminName: 'Ana',
    adminEmail: 'ana@cliente.example',
    adminTemporaryPassword: 'TempPass#123',
    termsEnabled: true,
    termsTitle: 'Termos',
    termsMarkdown: '# Olá',
    smtpEnabled: true,
    smtpHost: 'smtp.example.invalid',
    smtpPort: '587',
    smtpSecure: true,
    smtpUsername: 'user',
    smtpPassword: 'secret-smtp',
    smtpFromEmail: 'noreply@example.invalid',
    smtpFromName: 'Acme',
    skipFeDeployCheck: true,
    skipDnsCheck: false,
  })
  assert.deepEqual(Object.keys(body).sort(), [
    'baseUrl', 'enabledEnvironments', 'initialAdmin', 'name', 'skipDnsCheck', 'skipFeDeployCheck', 'slug', 'smtp', 'templateFromWhitelabelId', 'terms', 'urlMode',
  ].sort())
  assert.deepEqual(body.enabledEnvironments, ['INVESTOR', 'ADMIN'])
  assert.equal(body.initialAdmin.temporaryPassword, 'TempPass#123')
  assert.equal(body.smtp.password, 'secret-smtp')
  assert.equal(body.urlMode, 'PATH')
  assert.equal(body.skipDnsCheck, true)
  const scrubbed = form.scrubBodyForReview(body)
  assert.equal(scrubbed.initialAdmin.temporaryPassword, '••••••••')
  assert.equal(scrubbed.smtp.password, '••••••••')
})

await check('environments step requires at least one', () => {
  assert.ok(form.validateEnvironments(form.EMPTY_PROVISIONING_DRAFT).envInvestor)
  assert.deepEqual(
    form.selectedEnvironments({ ...form.EMPTY_PROVISIONING_DRAFT, envInvestor: true, envAdmin: true }),
    ['INVESTOR', 'ADMIN'],
  )
})

const pngFile = (size = 12) => new File([new Uint8Array(size)], 'brand.png', { type: 'image/png' })
const brandDraft = (extra = {}) => ({
  ...form.EMPTY_PROVISIONING_DRAFT,
  name: 'Acme Capital',
  slug: 'acme-capital',
  baseUrl: 'https://acme.example.invalid',
  adminEnabled: false,
  brandingEnabled: true,
  ...extra,
})

await check('branding off (or empty) leaves the body without `branding` and no file', () => {
  const off = form.buildCreateBody({ ...brandDraft(), brandingEnabled: false, brandEmailPrimaryColor: '#112233', brandMainAreaFile: pngFile() })
  assert.equal(off.branding, undefined)
  assert.equal(form.buildMainAreaFile({ ...brandDraft(), brandingEnabled: false, brandMainAreaFile: pngFile() }), null)
  assert.equal(form.buildCreateBody(brandDraft()).branding, undefined)
  assert.equal(Object.keys(form.validateOptional(brandDraft())).length, 0)
})

await check('branding payload build: email, login color, main_area pages (File never in JSON)', () => {
  const file = pngFile(2048)
  const draft = brandDraft({
    brandEmailPrimaryColor: '#AABBCC',
    brandEmailLogoUrl: 'https://cdn.example.invalid/logo.png',
    brandLoginTextColor: '#FFFFFF',
    brandMainAreaFile: file,
    brandMainAreaPages: ['quick_profile', 'login'],
  })
  assert.equal(Object.keys(form.validateOptional(draft)).length, 0)
  const body = form.buildCreateBody(draft)
  assert.deepEqual(body.branding, {
    email: { primary_color: '#aabbcc', logo_url: 'https://cdn.example.invalid/logo.png' },
    loginBrandPanelTextColor: '#ffffff',
    mainArea: { pages: ['login', 'quick_profile'] },
  })
  const json = JSON.stringify(body)
  assert.ok(!json.includes('brand.png'), 'file name must not be in the JSON body')
  assert.equal(form.buildMainAreaFile(draft), file)

  const data = api.buildProvisioningFormData(body, file)
  assert.deepEqual([...data.keys()].sort(), ['mainAreaImage', 'payload'])
  assert.equal(data.get('mainAreaImage').name, 'brand.png')
  assert.deepEqual(JSON.parse(data.get('payload')).branding.mainArea.pages, ['login', 'quick_profile'])
  assert.ok(!String(data.get('payload')).includes('brand.png'))
})

await check('branding validation: hex colors, http(s) logo url without credentials, image type/size, pages', () => {
  const errors = form.validateOptional(brandDraft({
    brandEmailPrimaryColor: 'red',
    brandEmailLogoUrl: 'https://user:pw@cdn.example.invalid/logo.png',
    brandLoginTextColor: '#abc',
    brandMainAreaFile: new File([new Uint8Array(4)], 'x.gif', { type: 'image/gif' }),
  }))
  assert.ok(errors.brandEmailPrimaryColor)
  assert.ok(errors.brandEmailLogoUrl)
  assert.ok(errors.brandLoginTextColor)
  assert.ok(errors.brandMainAreaFile)
  assert.ok(form.validateOptional(brandDraft({ brandEmailLogoUrl: 'ftp://x.example/a.png' })).brandEmailLogoUrl)
  assert.ok(form.validateOptional(brandDraft({ brandMainAreaFile: pngFile(21 * 1024 * 1024) })).brandMainAreaFile)
  assert.ok(form.validateOptional(brandDraft({ brandMainAreaFile: pngFile(), brandMainAreaPages: [] })).brandMainAreaPages)
})

await check('review scrub shows colors/urls/file name only — never bytes or passwords', () => {
  const draft = brandDraft({
    adminEnabled: true,
    adminEmail: 'ana@cliente.example',
    adminTemporaryPassword: 'TempPass#123',
    brandEmailPrimaryColor: '#112233',
    brandMainAreaFile: new File([new Uint8Array([80, 78, 71, 1, 2, 3])], 'brand.png', { type: 'image/png' }),
  })
  const body = form.buildCreateBody(draft)
  const scrubbed = form.scrubBodyForReview(body, form.buildMainAreaFile(draft))
  const text = JSON.stringify(scrubbed)
  assert.equal(scrubbed.branding.email.primary_color, '#112233')
  assert.match(scrubbed.branding.mainArea.file, /^brand\.png \(6 B\)$/)
  assert.ok(!text.includes('TempPass#123'))
  assert.ok(!text.includes('"buffer"') && !text.includes('base64'))
  assert.equal(scrubbed.initialAdmin.temporaryPassword, '••••••••')
})

await check('skip flags still work together with branding (and without it)', () => {
  const withBranding = form.buildCreateBody(brandDraft({ brandLoginTextColor: '#000000', skipFeDeployCheck: true, skipDnsCheck: true }))
  assert.equal(withBranding.skipFeDeployCheck, true)
  assert.equal(withBranding.skipDnsCheck, true)
  assert.equal(withBranding.branding.loginBrandPanelTextColor, '#000000')
  const without = form.buildCreateBody({ ...brandDraft(), brandingEnabled: false, skipFeDeployCheck: true })
  assert.equal(without.skipFeDeployCheck, true)
  // PATH mode always sends skipDnsCheck=true (DNS per tenant is not required).
  assert.equal(without.skipDnsCheck, true)
  assert.equal(without.branding, undefined)
})

await check('delivery branding summary parses; missing branding → null; secret keys rejected', () => {
  assert.equal(api.parseProvisioning(sample).delivery.branding, null)
  const withSummary = api.parseProvisioning({
    data: { ...sample.data, delivery: { ...sample.data.delivery, branding: { email: true, mainAreaAssetRef: '3f6c1c52-8a1e-4d0e-9f4b-0a5d2f3a9b11' } } },
  })
  assert.deepEqual(withSummary.delivery.branding, { email: true, mainAreaAssetRef: '3f6c1c52-8a1e-4d0e-9f4b-0a5d2f3a9b11' })
  assert.throws(() => api.parseProvisioning({
    data: { ...sample.data, delivery: { ...sample.data.delivery, branding: { email: true, token: 'x' } } },
  }))
})

await check('client validation mirrors create DTO', () => {
  const errors = form.validateClient({ ...form.EMPTY_PROVISIONING_DRAFT, name: 'A', slug: 'Bad', baseUrl: 'ftp://x' })
  assert.ok(errors.name)
  assert.ok(errors.slug)
  assert.ok(errors.baseUrl)
  assert.equal(Object.keys(form.validateClient({
    ...form.EMPTY_PROVISIONING_DRAFT,
    name: 'Acme',
    slug: 'acme',
    baseUrl: 'https://acme.example.invalid',
  })).length, 0)
})

await check('admin password required by Nest contract', () => {
  const errors = form.validateAdmin({
    ...form.EMPTY_PROVISIONING_DRAFT,
    adminEnabled: true,
    adminEmail: 'a@b.co',
    adminTemporaryPassword: '',
  })
  assert.ok(errors.adminTemporaryPassword)
})

await check('feature flag blocks start when writes disabled', async () => {
  const apiOff = await load('src/features/whitelabel-provisioning/provisioningApi.ts', {
    VITE_WHITELABEL_WRITES_ENABLED: 'false',
  })
  assert.equal(apiOff.PROVISIONING_WRITES_ENABLED, false)
  assert.equal(apiOff.canStartProvisioning(['SUPER_ADMIN']), false)
  assert.equal(api.canStartProvisioning(['SUPER_ADMIN']), true)
  assert.equal(api.canStartProvisioning(['READ_ONLY']), false)
  assert.equal(api.canReadProvisioning(['READ_ONLY']), true)
  assert.equal(contractOff.WHITELABEL_WRITES_ENABLED, false)
})

await check('routes follow hash convention', () => {
  assert.equal(route.provisioningNewHref(), '#/whitelabel-provisionings/new')
  assert.equal(route.provisioningHref('cmwlak1jg0003b03lxeyagzce'), '#/whitelabel-provisionings/cmwlak1jg0003b03lxeyagzce')
  assert.equal(route.isProvisioningId('cmwlak1jg0003b03lxeyagzce'), true)
  assert.equal(route.isProvisioningId('../evil'), false)
})

await check('step labels cover Nest STEP_ORDER', () => {
  for (const key of api.PROVISIONING_STEP_KEYS) {
    assert.ok(labels.STEP_LABELS[key])
    assert.ok(labels.STEP_STATUS_GLYPH.SUCCESS)
  }
  assert.equal(labels.STEP_STATUS_GLYPH.FAILED, '✕')
  assert.equal(labels.STEP_STATUS_GLYPH.WAITING_MANUAL_ACTION, '!')
})

await check('WAITING_MANUAL_ACTION parse for FE gate', () => {
  const waiting = api.parseProvisioning({
    data: {
      ...sample.data,
      status: 'WAITING_MANUAL_ACTION',
      currentStep: 'FE_DEPLOY_CHECK',
      delivery: null,
      progress: { completed: 7, total: 11, percentage: 64 },
      steps: sample.data.steps.map((s) => {
        if (s.key === 'FE_DEPLOY_CHECK') return { ...s, status: 'WAITING_MANUAL_ACTION', attempts: 1 }
        if (['DNS_CHECK', 'VALIDATE', 'DELIVER'].includes(s.key)) return { ...s, status: 'PENDING' }
        if (s.key === 'SMTP' || s.key === 'GATEWAY_CONFIG' || s.key === 'UPLOAD_BRAND' || s.key === 'APPLY_SETTINGS_TEMPLATE') return s
        return { ...s, status: 'SUCCESS', attempts: 1 }
      }),
    },
  })
  assert.equal(waiting.status, 'WAITING_MANUAL_ACTION')
  assert.equal(waiting.currentStep, 'FE_DEPLOY_CHECK')
  assert.equal(api.isManualGate(waiting.currentStep), false)
  assert.ok(api.MANUAL_GATE_KEYS.includes(waiting.currentStep))
})

await check('PATH slug change auto-fills Investor baseUrl unless manually edited', () => {
  assert.equal(
    api.nextBaseUrlAfterSlugChange({
      slug: 'shared-fe-demo-aurora',
      previousSlug: '',
      baseUrl: '',
      urlMode: 'PATH',
    }),
    'https://homolog.loor.vc/w/shared-fe-demo-aurora',
  )
  assert.equal(
    api.nextBaseUrlAfterSlugChange({
      slug: 'shared-fe-demo-b',
      previousSlug: 'shared-fe-demo-a',
      baseUrl: 'https://homolog.loor.vc/w/shared-fe-demo-a',
      urlMode: 'PATH',
    }),
    'https://homolog.loor.vc/w/shared-fe-demo-b',
  )
  assert.equal(
    api.nextBaseUrlAfterSlugChange({
      slug: 'shared-fe-demo-b',
      previousSlug: 'shared-fe-demo-a',
      baseUrl: 'https://custom.example/path',
      urlMode: 'PATH',
    }),
    'https://custom.example/path',
  )
  assert.equal(
    api.nextBaseUrlAfterSlugChange({
      slug: 'acme',
      previousSlug: '',
      baseUrl: '',
      urlMode: 'HOSTNAME',
    }),
    '',
  )
})

console.log(failed ? `\nWhitelabel provisioning: ${failed} failed.` : '\nWhitelabel provisioning: all focused synthetic checks passed. No live requests.')
process.exit(failed ? 1 : 0)
