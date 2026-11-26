/**
 * Homolog smoke for Studio preview URL mapping (teste-auto-01).
 * Does not hit production. Validates that delivery bases + catalog paths respond.
 */
const slug = 'teste-auto-01'
const bases = {
  investor: `https://${slug}.loor.vc`,
  entrepreneur: `https://${slug}.empresa.loor.vc`,
  admin: `https://${slug}.admin.loor.vc`,
}

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
  ['investor', 'Login', '/wallet/login'],
  ['investor', 'Cadastro', '/wallet/register'],
  ['investor', 'Completar dados', '/wallet/quick-profile'],
  ['investor', 'Carteira', '/wallet/'],
  ['investor', 'Ofertas', '/oportunidades'],
  ['entrepreneur', 'Auth', '/auth'],
  ['entrepreneur', 'Dashboard', '/app/dashboard'],
  ['entrepreneur', 'Campanhas', '/app/campanhas'],
  ['admin', 'Login', '/'],
  ['admin', 'Integração PAG', '/integracoes/pag'],
]

const featureNoFake = [
  { name: 'Terminologia', kind: 'FEATURE', representative: '/oportunidades' },
  { name: 'Funcionalidades', kind: 'FEATURE', representative: '/wallet/' },
]

console.log('joinPreviewUrl samples:')
for (const [env, label, path] of cases) {
  console.log(`  ${env} · ${label} → ${joinPreviewUrl(bases[env], path)}`)
}
console.log('FEATURE (no fake route):', featureNoFake.map((f) => f.name).join(', '))

let failed = 0
for (const [env, label, path] of cases) {
  const url = joinPreviewUrl(bases[env], path)
  try {
    const res = await fetch(url, { method: 'GET', redirect: 'manual' })
    const ok = res.status >= 200 && res.status < 500
    console.log(`${ok ? 'OK' : 'FAIL'} ${res.status} ${label} ${url}`)
    if (!ok) failed += 1
  } catch (error) {
    console.log(`FAIL ${label} ${url} ${error.message}`)
    failed += 1
  }
}

if (failed) {
  console.error(`Validation failed: ${failed} case(s)`)
  process.exit(1)
}
console.log('Validation passed for teste-auto-01 preview path mapping.')
