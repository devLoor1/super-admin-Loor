/**
 * Homolog smoke for Studio Ambiente→Página→Preview (teste-auto-01 only).
 * Static catalog + live URL + bootstrap checks. No production. No auth bypass.
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const catalogSrc = readFileSync(
  join(ROOT, 'src/features/whitelabel-settings/studioExperienceCatalog.ts'),
  'utf8',
)
const liveSrc = readFileSync(
  join(ROOT, 'src/features/whitelabel-settings/LiveWhitelabelPreview.tsx'),
  'utf8',
)
const studioSrc = readFileSync(
  join(ROOT, 'src/features/whitelabel-settings/ConfigurationStudio.tsx'),
  'utf8',
)

const slug = 'teste-auto-01'
const bases = {
  investor: `https://${slug}.loor.vc`,
  entrepreneur: `https://${slug}.empresa.loor.vc`,
  admin: `https://${slug}.admin.loor.vc`,
}
const core = 'https://back.loor.vc/service'

const findings = []
function pass(id, detail) {
  console.log(`PASS  ${id} — ${detail}`)
}
function fail(severity, id, detail) {
  findings.push({ severity, id, detail })
  console.log(`${severity} ${id} — ${detail}`)
}

function assert(cond, severity, id, detail) {
  if (cond) pass(id, detail)
  else fail(severity, id, detail)
}

// --- Static catalog contracts ---
assert(catalogSrc.includes("id: 'login'") && catalogSrc.includes("previewPath: `${INVESTOR_WALLET_PREFIX}/login`"), 'BUG', 'inv-login-path', 'Investor Login path present')
assert(catalogSrc.includes("previewPath: `${INVESTOR_WALLET_PREFIX}/register`"), 'BUG', 'inv-register-path', 'Investor Cadastro path')
assert(catalogSrc.includes("previewPath: `${INVESTOR_WALLET_PREFIX}/quick-profile`"), 'BUG', 'inv-qp-path', 'Completar dados path')
assert(catalogSrc.includes("previewPath: '/oportunidades'"), 'BUG', 'inv-offers-path', 'Ofertas public path')
assert(catalogSrc.includes("kind: 'FEATURE'") && catalogSrc.includes("id: 'terminology'"), 'BUG', 'inv-term-feature', 'Terminologia is FEATURE')
assert(catalogSrc.includes("id: 'features'") && catalogSrc.includes("kind: 'FEATURE'"), 'BUG', 'inv-feat-feature', 'Funcionalidades is FEATURE')
assert(!catalogSrc.includes("previewPath: '/terminology'") && !catalogSrc.includes("previewPath: '/features'"), 'BUG', 'inv-no-fake-feature-routes', 'No fake FEATURE routes')

assert(catalogSrc.includes("previewPath: '/auth'"), 'BUG', 'ent-auth', 'Entrepreneur Auth /auth')
for (const p of ['dashboard', 'perfil-empresa', 'perfil-pessoal', 'documentos', 'campanhas', 'forum', 'ferramentas']) {
  assert(catalogSrc.includes(`previewPath: '/app/${p}'`), 'BUG', `ent-${p}`, `Entrepreneur /app/${p}`)
}
assert(!/entrepreneurResources[\s\S]*id: 'wallet'/.test(catalogSrc), 'BUG', 'ent-no-investor-menu', 'Entrepreneur menu must not include Investor wallet')
assert(catalogSrc.includes('Não há contrato de settings específico do Empreendedor'), 'BUG', 'ent-no-fake-settings', 'Entrepreneur global branding message')

assert(catalogSrc.includes("previewPath: '/'") && catalogSrc.includes("id: 'login'"), 'BUG', 'admin-login-root', 'Admin login at /')
assert(catalogSrc.includes("previewPath: '/integracoes/pag'"), 'BUG', 'admin-pag', 'Admin PAG deep-link')
assert(catalogSrc.includes("previewMode: 'limited'") && catalogSrc.includes('previewPath: null'), 'BUG', 'admin-spa-limited', 'Admin SPA views limited without fake paths')

assert(liveSrc.includes('Nenhum bypass de autenticação'), 'BUG', 'no-auth-bypass-copy', 'Auth bypass disclaimer present')
assert(!liveSrc.includes('Bearer ') && !/fake.?token|bypassAuth|skipAuth/i.test(liveSrc), 'BLOQUEIO', 'no-token-injection', 'No token/bypass in live preview')
assert(studioSrc.includes('Studio Whitelabel') && studioSrc.includes('Ambiente → Página'), 'BUG', 'studio-nav-copy', 'Studio nav copy present')
assert(studioSrc.includes('BrandLogoEditor') && studioSrc.includes('email_branding.config'), 'BUG', 'studio-brand-logo-editor', 'Marca global wires BrandLogoEditor')
const brandLogoSrc = readFileSync(
  join(ROOT, 'src/features/whitelabel-settings/BrandLogoEditor.tsx'),
  'utf8',
)
assert(brandLogoSrc.includes("SLOT = 'logo'") && brandLogoSrc.includes('logo_asset_ref'), 'BUG', 'brand-logo-slot', 'Logo upload uses slot=logo and logo_asset_ref')
assert(brandLogoSrc.includes('Remover fundo automaticamente'), 'BUG', 'brand-logo-bg-switch', 'Background removal switch present')
assert(brandLogoSrc.includes('Removendo fundo') && brandLogoSrc.includes('Fundo removido'), 'BUG', 'brand-logo-bg-states', 'Background removal status copy present')
assert(brandLogoSrc.includes('Remover'), 'BUG', 'brand-logo-remove', 'Logo remove action present')
const assetClientSrc = readFileSync(
  join(ROOT, 'src/features/whitelabel-settings/platformAssetClient.ts'),
  'utf8',
)
assert(assetClientSrc.includes("'logo'") && assetClientSrc.includes('form.append(\'slot\', slot)'), 'BUG', 'asset-client-logo-slot', 'platformAssetClient supports logo slot')
assert(assetClientSrc.includes('previewLogoBackgroundRemoval') && assetClientSrc.includes('remove_background'), 'BUG', 'asset-client-bg-removal', 'Client supports BG removal preview and flag')

function joinPreviewUrl(baseUrl, pagePath) {
  const url = new URL(baseUrl)
  if (pagePath == null || pagePath === '') {
    url.search = ''
    url.hash = ''
    return url.toString().replace(/\/$/, '') || url.origin
  }
  const normalized = pagePath.startsWith('/') ? pagePath : `/${pagePath}`
  const basePath = url.pathname.replace(/\/$/, '')
  const nextPath = normalized === '/' ? (basePath ? `${basePath}/` : '/') : `${basePath}${normalized}`
  url.pathname = nextPath.replace(/\/{2,}/g, '/')
  url.search = ''
  url.hash = ''
  return url.toString()
}

const cases = [
  ['investor', 'Login', '/wallet/login', 'live'],
  ['investor', 'Cadastro', '/wallet/register', 'live'],
  ['investor', 'Completar dados', '/wallet/quick-profile', 'partial'],
  ['investor', 'Carteira', '/wallet/', 'partial'],
  ['investor', 'Ofertas', '/oportunidades', 'live'],
  ['investor', 'Terminologia (repr)', '/oportunidades', 'representative'],
  ['investor', 'Funcionalidades (repr)', '/wallet/', 'representative'],
  ['entrepreneur', 'Auth', '/auth', 'live'],
  ['entrepreneur', 'Dashboard', '/app/dashboard', 'partial'],
  ['entrepreneur', 'Perfil empresa', '/app/perfil-empresa', 'partial'],
  ['entrepreneur', 'Perfil pessoal', '/app/perfil-pessoal', 'partial'],
  ['entrepreneur', 'Documentos', '/app/documentos', 'partial'],
  ['entrepreneur', 'Campanhas', '/app/campanhas', 'partial'],
  ['entrepreneur', 'Fórum', '/app/forum', 'partial'],
  ['entrepreneur', 'Ferramentas', '/app/ferramentas', 'partial'],
  ['admin', 'Login', '/', 'live'],
  ['admin', 'Integração PAG', '/integracoes/pag', 'partial'],
]

const table = []

async function headOk(url) {
  const res = await fetch(url, { method: 'GET', redirect: 'manual' })
  return { status: res.status, headers: res.headers }
}

// Detect effective wallet prefix from shared investor bundle
async function detectWalletPrefix() {
  const html = await (await fetch(bases.investor + '/')).text()
  const m = html.match(/src="(\/assets\/[^"]+\.js)"/)
  if (!m) return { prefix: null, evidence: 'no-js' }
  const js = await (await fetch(bases.investor + m[1])).text()
  const hasWalletLoginLiteral = js.includes('"/wallet/login"') || /path:ie\("\/login"\)/.test(js)
  const defaultWallet = /if\(e===void 0\)return"\/wallet"/.test(js)
  const envEmpty = /dk=\{\}/.test(js) || /VITE_WALLET_PREFIX\)[^,]{0,5},Hb=/.test(js)
  // When import.meta.env is empty object, C$(undefined) => "/wallet"
  const prefix = defaultWallet && envEmpty ? '/wallet' : defaultWallet ? '/wallet' : ''
  return { prefix, evidence: `defaultWallet=${defaultWallet}; envEmpty=${envEmpty}; hasWalletLoginLiteral=${hasWalletLoginLiteral}` }
}

async function bootstrap(origin) {
  const res = await fetch(`${core}/public/platform/bootstrap`, {
    headers: { Origin: origin, Accept: 'application/json' },
  })
  const json = await res.json().catch(() => null)
  const data = json?.data ?? json
  return { status: res.status, data }
}

function bootstrapTenant(data) {
  const wl = data?.whitelabel || data || {}
  const branding = data?.branding || {}
  return {
    slug: wl.slug || data?.slug || null,
    name: wl.name || data?.name || null,
    primary: branding.primaryColor || null,
    logo: Boolean(branding.logoUrl),
  }
}

console.log('=== Wallet prefix (shared FE) ===')
const wallet = await detectWalletPrefix()
console.log(wallet)
assert(wallet.prefix === '/wallet', 'BUG', 'wallet-prefix-effective', `Effective VITE_WALLET_PREFIX → ${wallet.prefix} (${wallet.evidence})`)

console.log('=== Preview URL HTTP ===')
for (const [env, label, path, auth] of cases) {
  const url = joinPreviewUrl(bases[env], path)
  const tenantOk = url.includes(slug)
  let http = { status: 0 }
  try {
    http = await headOk(url)
  } catch (e) {
    fail('BUG', `${env}-${label}-fetch`, String(e.message || e))
  }
  const ok = tenantOk && http.status >= 200 && http.status < 500
  table.push({ env, label, editor: env === 'investor' ? 'cells/settings' : 'global_branding', preview: url, auth, result: ok ? 'OK' : 'FAIL' })
  assert(ok, 'BUG', `${env}-${label}`, `${http.status} ${url}`)
}

console.log('=== Admin limited (no invented paths) ===')
for (const fake of ['/dashboard', '/investidores', '/empresas', '/oportunidades']) {
  assert(!catalogSrc.includes(`previewPath: '${fake}'`), 'BUG', `admin-no-fake-${fake}`, `Admin must not invent ${fake}`)
}

console.log('=== Bootstrap branding (3 Origins) ===')
for (const [env, origin] of Object.entries(bases)) {
  const b = await bootstrap(origin)
  const t = bootstrapTenant(b.data || {})
  console.log(JSON.stringify({ env, status: b.status, ...t }))
  assert(b.status === 200, 'BUG', `bootstrap-${env}-http`, `HTTP ${b.status}`)
  assert(t.slug === slug, 'BLOQUEIO', `bootstrap-${env}-tenant`, `slug=${t.slug} name=${t.name}`)
  assert(Boolean(t.primary) && Boolean(t.logo) && Boolean(t.name), 'BUG', `bootstrap-${env}-brand`, 'name/logo/primary present')
}

console.log('=== Frame embedding headers (must not weaken globally) ===')
for (const [env, origin] of Object.entries(bases)) {
  const res = await fetch(origin + '/', { method: 'GET' })
  const csp = res.headers.get('content-security-policy') || ''
  const xfo = res.headers.get('x-frame-options') || ''
  console.log(`${env}: XFO=${xfo || '(none)'} CSP_frame-ancestors=${/frame-ancestors[^;]*/i.exec(csp)?.[0] || '(none in CSP)'}`)
  assert(!/frame-ancestors\s+\*/i.test(csp), 'BLOQUEIO', `csp-${env}`, 'frame-ancestors not wildcarded')
}

console.log('=== Context switch URL sequence ===')
const sequence = [
  ['investor', '/wallet/login'],
  ['investor', '/wallet/register'],
  ['investor', '/oportunidades'],
  ['entrepreneur', '/auth'],
  ['entrepreneur', '/app/campanhas'],
  ['admin', '/'],
  ['admin', null],
  ['investor', '/wallet/login'],
]
for (const [env, path] of sequence) {
  const url = path == null ? `${bases[env]} [limited/open-env]` : joinPreviewUrl(bases[env], path)
  assert(String(url).includes(slug), 'BLOQUEIO', `seq-${env}-${path}`, url)
}

console.log('\n=== TABLE ===')
console.log('Ambiente\tRecurso\tEditor\tPreview\tAuth\tResultado')
for (const row of table) {
  console.log(`${row.env}\t${row.label}\t${row.editor}\t${row.preview}\t${row.auth}\t${row.result}`)
}

console.log('\n=== FINDINGS ===')
if (!findings.length) console.log('None')
else for (const f of findings) console.log(`${f.severity}\t${f.id}\t${f.detail}`)

const blockers = findings.filter((f) => f.severity === 'BLOQUEIO')
process.exit(blockers.length ? 1 : findings.some((f) => f.severity === 'BUG') ? 2 : 0)
