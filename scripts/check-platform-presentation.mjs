import assert from 'node:assert/strict'
import { moduleLoader, reactUrl, renderUrl } from './operators-test-harness.mjs'

const load = moduleLoader(), { readPlatformPresentation } = await load('src/features/whitelabel-settings/platformPresentationRead.ts')
const { PlatformPresentationRead } = await load('src/features/whitelabel-settings/PlatformPresentationCards.tsx')
const { createElement: h } = await import(reactUrl), { renderToStaticMarkup: render } = await import(renderUrl)
let checks = 0
const check = (label, run) => { try { run(); checks++ } catch (cause) { throw Error(label, { cause }) } }
const entry = page => ({ capabilityId: 'platform.entry-journey.presentation', version: 1, page, regions: { brand: { backgroundColor: '#112233', textColor: '#ffffff', layoutPreset: 'side' }, main: { backgroundColor: '#ffffff', textColor: '#000000', formSurface: { enabled: false, color: '#ffffff', opacity: 0.65, radius: 0, padding: 12, shadow: false } } } })
const fixture = () => ({ login: { layout_preset: 'top', brand_panel_text_color: '#abcdef', entry_presentation: entry('login') }, register: { content: { capabilityId: 'platform.entry-journey.registration-content', version: 1, values: { title: 'Cadastro sintético', introduction: 'Texto sintético de introdução', auxiliaryText: 'Texto auxiliar sintético', submitLabel: 'Continuar' } }, entry_presentation: entry('register') }, quick_profile: { entry_presentation: entry('quick_profile') }, dashboard: { components: { version: 1, components: [{ id: 'wallet-kpis', visible: false, order: 0 }, { id: 'wallet-opportunities', visible: true, order: 20 }] } }, offers: { presentation: { capabilityId: 'platform.offers.presentation', version: 1, catalogue: { cardDensity: 'compact' }, cover: { fit: 'contain', position: 'top' }, detail: { headerLayout: { public: 'overlay', wallet: 'stacked' } } } }, email_branding: { config: { primary_color: '#116f03', logo_url: 'https://qa.example.invalid/synthetic-logo.png' } } })
const get = (settings, id) => readPlatformPresentation(settings).find(capability => capability.id === id)
const html = settings => render(h(PlatformPresentationRead, { capabilities: readPlatformPresentation(settings) }))

check('actual read-only fields render without defaults or controls', () => {
  const data = fixture(), projected = readPlatformPresentation(data), output = html(data)
  assert.equal(projected.length, 9)
  assert.ok(projected.every(item => item.state === 'value'))
  for (const text of ['Cadastro sintético', 'Superior', 'Compacta', 'Indicadores da carteira', '#abcdef', 'Não']) assert.ok(output.includes(text), text)
  assert.doesNotMatch(output, /<(?:input|textarea|button|form)\b|Salvar|Padrão global|Usando padrão|PUBLICADO|https?:/)
  assert.equal(get(data, 'dashboard-composition').fields.find(field => field.key === 'wallet-kpis.order').reading.value, 0)
  assert.equal(get(data, 'dashboard-composition').fields.find(field => field.key === 'wallet-recent-investments.visible').reading.state, 'missing')
})
for (const value of [undefined, null, {}, [], 'wrong']) check('missing/null/malformed roots remain unavailable independently', () => {
  const projected = readPlatformPresentation(value)
  assert.ok(projected.every(item => item.state === (value === null ? 'null' : value === undefined || value && !Array.isArray(value) && typeof value === 'object' ? 'missing' : 'incompatible')))
  assert.doesNotMatch(html(value), /Cadastro sintético|#ffffff|Confortável|Confirmar dados/)
})
for (const [id, mutate] of [
  ['registration-content', data => data.register.content.version = 2],
  ['entry-login', data => data.login.entry_presentation.page = 'register'],
  ['entry-register', data => data.register.entry_presentation.regions.main.formSurface = []],
  ['dashboard-composition', data => data.dashboard.components.version = 2],
  ['offer-presentation', data => data.offers.presentation.capabilityId = 'other'],
]) check(`incompatible capability is isolated: ${id}`, () => {
  const data = fixture(); mutate(data)
  assert.equal(get(data, id).state, 'incompatible')
  assert.equal(get(data, 'login-contrast').state, 'value')
  assert.ok(html(data).includes('Outras seções permanecem disponíveis'))
})
for (const [key, value] of [['opacity', 0.64], ['opacity', Infinity], ['radius', -1], ['padding', 37], ['shadow', 'true'], ['color', 'url(javascript:bad)']]) check(`entry field is bounded: ${key} ${value}`, () => {
  const data = fixture(); data.login.entry_presentation.regions.main.formSurface[key] = value
  assert.equal(get(data, 'entry-login').fields.find(field => field.key === `surface.${key}`).reading.state, 'incompatible')
})
for (const value of ['<img src=x onerror=alert(1)>', 'Bearer private-token', '-----BEGIN PRIVATE KEY-----', '\u0000', 'x'.repeat(61)]) check('registration plaintext rejects unsafe/oversized strings', () => {
  const data = fixture(); data.register.content.values.title = value
  assert.equal(get(data, 'registration-content').fields[0].reading.state, 'incompatible')
  assert.ok(!JSON.stringify(readPlatformPresentation(data)).includes(value))
})
check('unknown/raw credentials/assets and unknown widgets cannot enter projection', () => {
  const data = fixture(), sentinel = 'PRIVATE_RAW_SENTINEL'
  data.smtp = { password: sentinel }; data.login.main_area_image = { url: `https://bad.invalid/${sentinel}`, assetRef: sentinel }
  data.offers.presentation.unknown = { secret: sentinel }; data.offers.presentation.cover.token = sentinel
  data.dashboard.components.components.push({ id: sentinel, visible: true, order: 30, password: sentinel })
  const projected = readPlatformPresentation(data)
  assert.ok(!JSON.stringify(projected).includes(sentinel)); assert.ok(!html(data).includes(sentinel))
})
check('enumerated offers fields do not fabricate consumer fallback', () => {
  const data = fixture(); delete data.offers.presentation.cover.fit; data.offers.presentation.catalogue.cardDensity = 'enormous'; data.offers.presentation.detail.headerLayout.wallet = null
  const fields = get(data, 'offer-presentation').fields
  assert.equal(fields[0].reading.state, 'incompatible'); assert.equal(fields[1].reading.state, 'missing'); assert.equal(fields[4].reading.state, 'null')
})
for (const component of [{ id: 'wallet-kpis', visible: true, order: 40 }, { id: 'wallet-recent-investments', visible: true, order: 20 }, { id: 'wallet-recent-investments', visible: 1, order: 30 }]) check('duplicate/invalid known dashboard rows cannot become normalized success', () => {
  const data = fixture(); data.dashboard.components.components.push(component)
  assert.equal(get(data, 'dashboard-composition').state, 'incompatible')
})
check('accessors and inherited keys are never executed or displayed', () => {
  let invoked = 0
  const data = fixture(); Object.defineProperty(data.login, 'layout_preset', { get() { invoked++; throw Error('must not run') } })
  assert.equal(get(data, 'login-layout').state, 'missing'); assert.equal(invoked, 0)
  assert.equal(readPlatformPresentation(Object.create(fixture()))[0].state, 'incompatible')
})
check('email-specific branding exposes color and constant logo presence only', () => {
  const data = fixture(), projected = readPlatformPresentation(data), output = html(data)
  assert.equal(get(data, 'email-branding').fields[0].reading.value, '#116f03')
  assert.ok(output.includes('Referência HTTP(S) informada; conteúdo não carregado'))
  assert.ok(!JSON.stringify(projected).includes('synthetic-logo.png'))
  assert.doesNotMatch(output, /<img\b|qa\.example\.invalid|synthetic-logo\.png/)
})
for (const url of ['https://user:PRIVATE_SENTINEL@qa.example.invalid/logo.png', 'https://qa.example.invalid/logo.png?token=PRIVATE_SENTINEL', 'https://qa.example.invalid/logo.png#PRIVATE_SENTINEL', 'javascript:PRIVATE_SENTINEL', 'data:image/svg+xml,PRIVATE_SENTINEL', '//qa.example.invalid/PRIVATE_SENTINEL', 'https://qa.example.invalid/PRIVATE_SENTINEL\n.png']) check('email logo rejects unsafe URL without retention or loading', () => {
  const data = fixture(); data.email_branding.config.logo_url = url
  assert.equal(get(data, 'email-branding').fields[1].reading.state, 'incompatible')
  assert.ok(!JSON.stringify(readPlatformPresentation(data)).includes('PRIVATE_SENTINEL')); assert.ok(!html(data).includes('PRIVATE_SENTINEL'))
})
for (const value of ['116f03', '#116f03ff', '<style>secret</style>', 'Bearer PRIVATE_SENTINEL', '']) check('email color does not infer consumer normalization for noncanonical values', () => {
  const data = fixture(); data.email_branding.config.primary_color = value
  assert.equal(get(data, 'email-branding').fields[0].reading.state, 'incompatible')
})
check('email aliases/unknown values are not copied or presented as persisted canonical fields', () => {
  const data = fixture(); data.email_branding.config = { primaryColor: '#abcdef', logoUrl: 'https://qa.example.invalid/PRIVATE_SENTINEL', secret: 'PRIVATE_SENTINEL' }
  const projected = get(data, 'email-branding')
  assert.ok(projected.fields.every(field => field.reading.state === 'missing'))
  assert.ok(!JSON.stringify(readPlatformPresentation(data)).includes('PRIVATE_SENTINEL'))
})
console.log(`Platform presentation: ${checks} checks passed (curated actual rendered GET projection; no requests or mutations)`)
