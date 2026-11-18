import assert from 'node:assert/strict'
import { moduleLoader, reactUrl, renderUrl } from './operators-test-harness.mjs'

const storage = new Map()
globalThis.sessionStorage = { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) }
globalThis.window = { setTimeout, clearTimeout }
const load = moduleLoader()
const { readTerms, publishTerms, parseTermsDocument } = await load('src/features/whitelabel-settings/termsPublication.ts')
const { persistSession } = await load('src/lib/authSession.ts')
const login = roles => persistSession({ accessToken: 'synthetic-only', tokenType: 'Bearer', operator: { id: 'qa', name: 'QA', email: 'qa@example.invalid', roles } })
const source = '# Acentuação\n\nLinha 1\nLinha 2\n\n- Um\n- Dois\n\n1. Três\n\n[Ajuda](https://example.invalid/ajuda)\n[Ignorar](javascript:alert)\n<script>texto legado</script>'
const revision = (id, number, markdown) => ({ configured: true, revision_id: id, revision: number, title: 'Termos QA', content_markdown: markdown, published_at: null })
const empty = { configured: false, revision_id: null, revision: null }
const initial = revision(17, 3, 'Anterior'), saved = revision(18, 4, source)
const draft = { title: 'Termos QA', markdown: source }
const projection = (current, tenant = 6) => ({ data: { whitelabel: { id: tenant }, current, history: current.configured ? [current] : [] } })
let calls, queue
function simulate(...responses) {
  calls = []; queue = responses
  globalThis.fetch = async (url, options) => {
    assert.equal(new URL(url).pathname, '/api/whitelabels/6/terms-of-use')
    calls.push({ method: options.method, body: options.body && JSON.parse(options.body) })
    if (!queue.length) throw Error('Unexpected extra request')
    const [status, body] = queue.shift()
    return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
  }
}
const publish = (id = 17) => publishTerms('6', id, draft, new AbortController().signal)
const methods = () => calls.map(call => call.method)
const { createElement } = await import(reactUrl), { renderToStaticMarkup } = await import(renderUrl)
const { TermsMarkdown } = await load('src/features/whitelabel-settings/TermsMarkdown.tsx')
const html = renderToStaticMarkup(createElement(TermsMarkdown, { source }))
for (const text of ['<h1>Acentuação</h1>', 'Linha 1\nLinha 2', '<ul>', '<ol', 'href="https://example.invalid/ajuda"', '&lt;script&gt;']) assert.ok(html.includes(text), text)
assert.doesNotMatch(html, /<script|href="javascript:/i)
assert.equal(parseTermsDocument(projection(saved), '6').current.markdown, source)
assert.throws(() => parseTermsDocument(projection(initial, 9), '6'))
assert.equal(parseTermsDocument(projection(empty), '6').current, null)
login(['READ_ONLY'])
simulate([200, projection(initial)])
assert.equal((await readTerms('6')).current.id, 17)
await assert.rejects(publish(), err => err.status === 403)
assert.deepEqual(methods(), ['GET'])
login(['SUPER_ADMIN'])
simulate([200, projection(initial)], [200, { data: saved }], [200, projection(saved)])
assert.equal((await publish()).outcome, 'confirmed')
assert.deepEqual(methods(), ['GET', 'PUT', 'GET'])
assert.deepEqual(calls[1].body, { title: draft.title, content_markdown: source, expectedCurrentRevisionId: 17 })
simulate([200, projection(saved)])
assert.equal((await publish()).outcome, 'stale')
assert.deepEqual(methods(), ['GET'])
simulate([200, projection(initial)], [409, { code: 'E_TERMS_OF_USE_REVISION_STALE' }], [200, projection(saved)])
assert.equal((await publish()).outcome, 'stale')
assert.deepEqual(methods(), ['GET', 'PUT', 'GET'])
simulate([200, projection(initial)], [500, {}], [200, projection(saved)])
assert.equal((await publish()).outcome, 'matching')
assert.deepEqual(methods(), ['GET', 'PUT', 'GET'])
simulate([200, projection(initial)], [500, {}], [200, projection(initial)])
assert.equal((await publish()).outcome, 'uncertain')
assert.deepEqual(methods(), ['GET', 'PUT', 'GET'])
simulate([200, projection(empty)], [200, { data: saved }], [200, projection(saved)])
assert.equal((await publish(null)).outcome, 'confirmed')
assert.ok(!('expectedCurrentRevisionId' in calls[1].body))
simulate([200, projection(initial)], [403, {}])
await assert.rejects(publish(), err => err.status === 403)
assert.deepEqual(methods(), ['GET', 'PUT'])
simulate([200, projection(initial)])
const fetchInitial = globalThis.fetch
globalThis.fetch = async (...args) => {
  const response = await fetchInitial(...args)
  login(['READ_ONLY'])
  return response
}
await assert.rejects(publish(), err => err.name === 'AbortError')
assert.deepEqual(methods(), ['GET'])
console.info('Terms publication, tenant, roles, readback, stale revision, uncertain response, Markdown and legacy checks passed (simulated).')
