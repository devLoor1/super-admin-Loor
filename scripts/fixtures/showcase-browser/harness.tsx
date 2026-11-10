/** Test-only UI harness. No real token, participant data, or business network. */
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/inter'
import '../../../src/styles/tokens.css'
import '../../../src/styles/global.css'
import hero from '../../../src/features/whitelabel-showcase/assets/hero-team.png'
import logo from '../../../src/features/whitelabel-showcase/assets/conecta-logo.png'
import smallLogo from '../../../src/features/whitelabel-showcase/assets/loor-logo.png'
import photo from '../../../src/features/whitelabel-showcase/assets/cards/conecta-community.webp'
import photo2 from '../../../src/features/whitelabel-showcase/assets/cards/conecta-square.webp'

const uuid = (n: number) => `10000000-0000-4000-8000-${String(n).padStart(12, '0')}`
const assets = new Map([[uuid(1), hero], [uuid(2), logo], [uuid(3), photo], [uuid(4), photo2]])
const image = (n: number) => ({ associationId: uuid(n + 10), assetRef: uuid(n), alt: `Imagem QA ${n}`, decorative: false })
let stored: Record<string, unknown> = {
  configured: true, revision: 1, schemaVersion: 1, owner: { whitelabelId: 6, slug: 'homologacao' },
  document: { schemaVersion: 1, banner: { images: [image(1)] }, intro: null, cards: [{
    instanceId: uuid(20), source: { whitelabelId: 41, slug: 'origem-qa-41' },
    internalTitle: 'Card QA', displayName: 'Origem QA', shortDescription: 'Conteúdo sintético exclusivo do teste local.',
    colors: { panel: '#0A1E85', divider: '#87DBBE' }, logo: { assetRef: uuid(2), alt: 'Logo QA' }, images: [image(3), image(4)],
  }] },
}
const role = new URLSearchParams(location.search).get('role') === 'READ_ONLY' ? 'READ_ONLY' : 'SUPER_ADMIN'
const operator = { id: 'synthetic-browser-check', name: 'Operador sintético de teste', email: 'qa@example.invalid', roles: [role] }
sessionStorage.setItem('loor_sa_access_token', 'synthetic-browser-check-not-a-credential')
sessionStorage.setItem('loor_sa_operator', JSON.stringify(operator))
const controls = document.getElementById('qa-controls')!
controls.style.cssText = 'position:relative;z-index:10000;padding:8px;background:#fff1a8;color:#111;font:12px sans-serif'
controls.innerHTML = '<strong>HARNESS LOCAL — respostas sintéticas; nenhuma chamada operacional.</strong> <button id="hold-upload">Reter próximo upload</button> <button id="release-upload">Concluir upload pendente</button> <button id="reject-upload">Recusar upload pendente</button> <output id="qa-ledger" aria-live="polite"></output>'
let hold = false
let pending: { done: (response: Response) => void; response: Response } | null = null
let uploads = 0
let writes = 0
const calls: { method: string; path: string }[] = []
const ledger = () => { document.getElementById('qa-ledger')!.textContent = ` Uploads: ${uploads}; PUTs: ${writes}; pendente: ${pending ? 'sim' : 'não'}; reter próximo: ${hold ? 'sim' : 'não'}; chamadas interceptadas: ${calls.length}` }
document.getElementById('hold-upload')!.onclick = () => { hold = true; ledger() }
document.getElementById('release-upload')!.onclick = () => { const p = pending; pending = null; p?.done(p.response); ledger() }
document.getElementById('reject-upload')!.onclick = () => { const p = pending; pending = null; p?.done(json({ code: 'E_VALIDATION' }, 422)); ledger() }
function json(value: unknown, status = 200) { return new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json', 'x-correlation-id': 'synthetic-local-check' } }) }
function tenant(id: number) { return { id, idKey: String(id), name: id === 6 ? 'Proprietário QA WL6' : `Origem QA ${id}`, slug: id === 6 ? 'homologacao' : `origem-qa-${id}`, baseUrl: `https://qa-${id}.example.invalid`, isActive: true, status: 'active' } }
const nativeFetch = window.fetch.bind(window)
window.fetch = async (input, options) => {
  const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url, location.href)
  if (url.origin === location.origin) return nativeFetch(input, options)
  if (url.origin !== 'https://backend-super-admin-loor.onrender.com') throw new Error('External network denied by test harness')
  const method = options?.method ?? 'GET'
  const path = url.pathname.replace(/^\/api/, '')
  calls.push({ method, path }); ledger()
  if (path === '/auth/me' && method === 'GET') return json(operator)
  if (path === '/homolog/menu-visibility' && method === 'GET') return json({ code: 'UNAVAILABLE_IN_LOCAL_HARNESS' }, 404)
  if (path === '/whitelabels' && method === 'GET') {
    const page = Number(url.searchParams.get('page') ?? 1)
    const perPage = Number(url.searchParams.get('perPage') ?? 10)
    const search = (url.searchParams.get('search') ?? '').toLowerCase()
    const rows = [tenant(6), ...Array.from({ length: 24 }, (_, n) => tenant(41 + n))].filter(t => !search || `${t.name} ${t.slug}`.toLowerCase().includes(search))
    return json({ data: rows.slice((page - 1) * perPage, page * perPage), meta: { page, perPage, total: rows.length, lastPage: Math.max(1, Math.ceil(rows.length / perPage)) } })
  }
  if (/^\/whitelabels\/\d+$/.test(path) && method === 'GET') return json(tenant(Number(path.split('/').at(-1))))
  if (path === '/whitelabels/6/showcase') {
    if (method === 'GET') return json({ data: stored })
    if (method === 'PUT') {
      if (role !== 'SUPER_ADMIN') return json({ code: 'E_FORBIDDEN' }, 403)
      writes++
      const body = JSON.parse(String(options?.body))
      if (body.expectedRevision !== stored.revision) return json({ code: 'E_SHOWCASE_REVISION_CONFLICT', data: stored }, 409)
      stored = { ...stored, configured: true, revision: Number(stored.revision) + 1, document: body.document }
      ledger(); return json({ data: stored })
    }
  }
  if (path === '/whitelabels/6/platform/assets' && method === 'POST') {
    if (role !== 'SUPER_ADMIN') return json({ code: 'E_FORBIDDEN' }, 403)
    const form = options?.body as FormData
    if (form.get('slot') !== 'showcase') throw new Error('Wrong slot in harness')
    uploads++
    const file = form.get('image') as File
    const ref = uuid(100 + uploads)
    const uploadedUrl = file.name === 'loor-logo.png' ? smallLogo : logo
    assets.set(ref, uploadedUrl)
    const response = json({ data: { asset_ref: ref, slot: 'showcase', wtlb_id: 6, mime: file.type, original_name: file.name, size_bytes: file.size, url: new URL(uploadedUrl, location.href).href } }, 201)
    if (hold) { hold = false; return new Promise<Response>(done => { pending = { done, response }; ledger() }) }
    ledger(); return response
  }
  const asset = /^\/whitelabels\/6\/platform\/assets\/([\w-]+)$/.exec(path)
  if (asset && method === 'GET') return json({ data: { asset_ref: asset[1], slot: 'showcase', wtlb_id: 6, mime: 'image/png', original_name: 'qa.png', size_bytes: 1000, url: new URL(assets.get(asset[1]) ?? logo, location.href).href } })
  throw new Error(`Unexpected intercepted operation ${method} ${path}`)
}
ledger()
if (!location.hash) location.hash = '#/whitelabels/6/settings/plataforma/vitrine'
if (new URLSearchParams(location.search).get('view') === 'renderer') {
  const { decodeStoredShowcase } = await import('../../../src/features/whitelabel-showcase/showcaseCodec')
  const { ShowcaseView } = await import('../../../src/features/whitelabel-showcase/public/ShowcaseView')
  const document = decodeStoredShowcase({ data: stored }).document
  createRoot(window.document.getElementById('root')!).render(<ShowcaseView document={document} idPrefix="local-qa" />)
} else {
  const { App } = await import('../../../src/app/App')
  createRoot(document.getElementById('root')!).render(<App />)
}
