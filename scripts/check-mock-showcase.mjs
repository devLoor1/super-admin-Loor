/**
 * Vitrine de White Labels — offline prototype checks (mock branch only).
 * Behavioral checks of the pure model, validation, Markdown allowlist, presentation gates,
 * simulated repository/draft store and slug classification, plus static isolation checks.
 * Stage 3 regressions reproduce the defects of the Stage 2 local review (B1 READ_ONLY writes,
 * B2 draft reload protection, D1 stale slug result, B3 static guard for configurable text).
 * No browser, no network, no React rendering: the only transport touched is the in-memory mockRequest.
 * Results describe the offline prototype, never Backend contracts or persistence.
 */
import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'
import ts from 'typescript'

const root = process.cwd(), require = createRequire(import.meta.url)
const feature = path.join(root, 'src/features/whitelabel-showcase')
let checks = 0
const ok = (value, message) => { assert.ok(value, message); checks++ }
const eq = (actual, expected, message) => { assert.deepEqual(actual, expected, message); checks++ }

/* ---------- static isolation ---------- */
async function walk(dir) {
  const files = []
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name)
    if (entry.isDirectory()) files.push(...await walk(p))
    else files.push(p)
  }
  return files
}
const files = await walk(feature)
for (const file of files.filter(f => /\.(t|j)sx?$/.test(f))) {
  const source = await fs.readFile(file, 'utf8')
  ok(!/dangerouslySetInnerHTML|\.innerHTML\s*=|<iframe|readAsDataURL|toDataURL|\bbtoa\s*\(|localStorage|sessionStorage|indexedDB/.test(source), `forbidden API in ${path.relative(root, file)}`)
  ok(!/\b(?:fetch|XMLHttpRequest|WebSocket|EventSource)\s*\(|navigator\.sendBeacon/.test(source), `network API in ${path.relative(root, file)}`)
}
const html = await fs.readFile(path.join(root, 'index.html'), 'utf8')
ok(/connect-src 'none'/.test(html) && /frame-src 'none'/.test(html) && /img-src 'self' data: blob:/.test(html), 'CSP unchanged (no frames, no network, blob images)')
const css = await fs.readFile(path.join(feature, 'public/showcase.css'), 'utf8')
ok(!/@media\s*\(max-width/.test(css), 'showcase width breakpoints are container queries')
ok(!/\b\d+(\.\d+)?vw\b/.test(css), 'showcase uses container units, not viewport width units')
const selectors = css.replace(/\/\*[\s\S]*?\*\//g, '').replace(/@font-face\s*\{[^}]*\}/g, '').replace(/@(?:container|media|keyframes)[^{]*\{/g, '').match(/[^{}@]+(?=\{)/g).map(s => s.trim()).filter(s => s && !s.startsWith('@') && !/^(from|to|\d+%)$/.test(s))
for (const selector of selectors) for (const part of selector.split(/,(?![^(]*\))/)) {
  const p = part.trim()
  ok(p.startsWith('.wl-showcase') || p.startsWith(':where(.wl-showcase)') || p.startsWith('.wl-page'), `unscoped showcase selector: ${p}`)
}
// Approved assets are byte-identical copies of FRONT-WEB/src/assets/mock-whitelabels (see assets/ASSETS.md).
const manifest = await fs.readFile(path.join(feature, 'assets/ASSETS.md'), 'utf8')
for (const [file, hash] of [...manifest.matchAll(/^\| `([^`]+)` \| ([0-9a-f]{64}) \|/gm)].map(m => [m[1], m[2]])) {
  const digest = crypto.createHash('sha256').update(await fs.readFile(path.join(feature, 'assets', file))).digest('hex')
  eq(digest, hash, `asset ${file} differs from the recorded approved copy`)
}

/* ---------- behavioral checks (transpiled sources in an OS temp dir) ---------- */
const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'loor-showcase-check-'))
const outputs = new Map()
async function compile(file) {
  if (outputs.has(file)) return outputs.get(file)
  const target = path.join(temp, `${outputs.size}.mjs`)
  outputs.set(file, target)
  if (file.endsWith('.json')) { await fs.writeFile(target, `export default ${await fs.readFile(file, 'utf8')}`); return target }
  let js = ts.transpileModule(await fs.readFile(file, 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.ReactJSX } }).outputText
  const matches = [...js.matchAll(/((?:^|\n)\s*(?:import|export)\b[^;]*?\sfrom\s*)(['"])([^'"]+)\2/g)]
  for (const match of matches) {
    const specifier = match[3]
    let destination
    if (specifier.startsWith('.')) {
      const base = path.resolve(path.dirname(file), specifier)
      let found
      for (const candidate of [base, `${base}.ts`, `${base}.tsx`, `${base}.json`]) { try { if ((await fs.stat(candidate)).isFile()) { found = candidate; break } } catch {} }
      assert.ok(found, `unresolved ${specifier} from ${file}`)
      destination = await compile(found)
    } else destination = require.resolve(specifier)
    js = js.replace(match[0], `${match[1]}${JSON.stringify(pathToFileURL(destination).href)}`)
  }
  await fs.writeFile(target, js)
  return target
}
const load = async p => import(pathToFileURL(await compile(path.join(root, p))).href)

try {
  const model = await load('src/features/whitelabel-showcase/showcaseModel.ts')
  const validation = await load('src/features/whitelabel-showcase/showcaseValidation.ts')
  const markdown = await load('src/features/whitelabel-showcase/showcaseMarkdown.ts')
  const access = await load('src/features/whitelabel-showcase/showcaseAccess.ts')
  const mapping = await load('src/features/whitelabel-showcase/showcaseMapping.ts')
  const media = await load('src/features/whitelabel-showcase/showcaseMedia.ts')
  const seed = await load('src/features/whitelabel-showcase/fixtures/showcaseSeed.ts')
  const defaults = await load('src/features/whitelabel-showcase/fixtures/showcaseSourceDefaults.ts')
  const repository = await load('src/features/whitelabel-showcase/showcaseRepository.ts')
  const store = await load('src/features/whitelabel-showcase/showcaseStore.ts')
  const simulation = await load('src/features/whitelabel-showcase/showcaseSimulation.ts')
  const lookup = await load('src/features/whitelabel-showcase/showcaseSourceLookup.ts')
  const navigation = await load('src/features/whitelabel-showcase/editor/showcaseNavigation.ts')
  const { mockRequest } = await load('src/mock/mockBackend.ts')

  // Seed media stand-ins (the bundled files are registered by Vite imports in the browser).
  for (const ref of [...seed.SEED_ASSET_REFS, 'origem-simulada:nova-plataforma-demo:logo']) media.registerMedia({ assetRef: ref, url: `seed:${ref}`, fileName: ref, mime: 'image/png', bytes: 1, width: 1440, height: 720, origin: ref.startsWith('origem') ? 'origem-simulada' : 'aprovado' })
  const resolve = media.hasMedia
  const admin = { roles: ['SUPER_ADMIN'] }, readonly = { roles: ['READ_ONLY'] }, support = { roles: ['SUPPORT_ADMIN'] }

  /* identity, repetition and independence */
  const owner = seed.ownerSource()
  const a = model.createCardInstance({ source: owner, defaults: null, copyLogo: media.copyForOwner })
  const b = model.createCardInstance({ source: owner, defaults: null, copyLogo: media.copyForOwner })
  ok(model.isUuid(a.instanceId) && model.isUuid(b.instanceId) && a.instanceId !== b.instanceId, 'repeated source → distinct UUID instances')
  ok(a.instanceId !== owner.whitelabelId && a.instanceId !== owner.slug, 'instance id is independent from source id/slug')
  eq(a.source.logical, { whitelabelId: 6, slug: 'homologacao' }, 'owner fixture keeps the logical WL6/homologacao identity')
  eq(a.copiedDefaults.missing, ['logo', 'colors', 'shortDescription'], 'missing canonical defaults are explicit')
  const editedA = { ...a, shortDescription: 'Somente A', colors: { panel: '#123456', divider: '#ABCDEF' } }
  ok(b.shortDescription === '' && b.colors.panel === model.DEFAULT_COLORS.panel, 'editing one repeated card leaves the other untouched')
  const nova = defaults.getSourceDefaults('nova-plataforma-demo')
  const c = model.createCardInstance({ source: { whitelabelId: '3', slug: 'nova-plataforma-demo', name: 'Nova Plataforma · Demo', logical: null }, defaults: nova, copyLogo: media.copyForOwner })
  ok(c.logo && c.logo.assetRef.startsWith('copia-proprietario:') && c.logo.assetRef !== nova.logo.sourceAssetRef, 'canonical logo becomes an owner-scoped copy reference')
  eq([c.shortDescription, c.colors], [nova.shortDescription, nova.colors], 'available simulated defaults initialize the card')
  const ordered = [editedA, b, c]
  const moved = model.moveItem(ordered, 0, 2)
  eq(moved.map(card => card.instanceId), [b.instanceId, c.instanceId, a.instanceId], 'reorder changes only positions')
  eq(moved[2], editedA, 'reorder preserves identity and customizations')
  eq(model.moveCard(ordered, b.instanceId, -1).map(card => card.instanceId), [b.instanceId, a.instanceId, c.instanceId], 'move up by instance id')

  /* defaults: later source changes never overwrite; restore is explicit and per card */
  const customized = { ...c, shortDescription: 'Texto personalizado' }
  const v2 = defaults.simulateSourceBrandingChange(admin, 'nova-plataforma-demo')
  ok(v2.version === 2 && customized.shortDescription === 'Texto personalizado' && c.colors.panel === nova.colors.panel, 'source branding change does not touch existing cards')
  const plan = model.restorePlan(customized, v2)
  ok(plan.some(change => change.field === 'shortDescription') && plan.some(change => change.field === 'colors') && plan.some(change => change.field === 'logo'), 'restore plan lists the replaced fields')
  const restored = model.applyRestore(customized, v2, ['shortDescription'], media.copyForOwner)
  ok(restored.shortDescription === v2.shortDescription && restored.colors.panel === customized.colors.panel && restored.logo.assetRef === customized.logo.assetRef && JSON.stringify(restored.images) === JSON.stringify(customized.images) && restored.instanceId === customized.instanceId, 'restore applies only the confirmed field and never photos/identity')
  eq(model.restorePlan(customized, null), [], 'no canonical defaults → nothing restorable')
  const partial = { ...v2, shortDescription: null }
  ok(!model.restorePlan({ ...customized, shortDescription: 'Mantido' }, partial).some(change => change.field === 'shortDescription'), 'missing default never erases a customization')
  defaults.resetSourceDefaultsForChecks()

  /* images 1–4, replace/remove independence */
  const imgs = [1, 2, 3].map(n => model.newImageAssociation(`aprovado:conecta-square`, `f${n}.webp`, `Imagem ${n}`))
  const replaced = model.replaceImage(imgs, imgs[1].associationId, 'aprovado:impulso-town', 'nova.webp')
  ok(replaced[1].associationId !== imgs[1].associationId && replaced[1].assetRef === 'aprovado:impulso-town' && replaced[0] === imgs[0] && replaced[2] === imgs[2], 'replace creates a new association only at that position')
  ok(model.removeImage(imgs, imgs[0].associationId).length === 2 && resolve('aprovado:conecta-square'), 'remove detaches the association and keeps the media')
  const four = [...imgs, model.newImageAssociation('aprovado:impulso-town', 'x.webp', 'x')]
  eq(model.addImage(four, model.newImageAssociation('aprovado:impulso-town', 'y.webp', 'y')).length, 4, 'a fifth image is not added')

  /* validation */
  const valid = seed.seedDocument()
  eq(validation.validateShowcase(valid, resolve), [], 'seed configuration is valid')
  const noBanner = { ...valid, banner: { images: [] } }
  ok(validation.validateShowcase(noBanner, resolve).some(issue => issue.tab === 'banner'), 'banner needs at least one image')
  ok(validation.validateShowcase({ ...valid, banner: { images: [...four, model.newImageAssociation('aprovado:hero-team', 'h.png', 'h')] } }, resolve).some(issue => /no máximo 4/.test(issue.message)), 'banner rejects more than four images')
  ok(validation.validateShowcase({ ...valid, cards: [] }, resolve).some(issue => /ao menos um card válido/.test(issue.message)), 'saving needs at least one card')
  const incomplete = { ...valid, cards: [...valid.cards, { ...a, displayName: ' ' }] }
  const incompleteIssues = validation.validateShowcase(incomplete, resolve)
  ok(['nome exibido', 'descrição curta', 'logotipo', 'fotografia'].every(word => incompleteIssues.some(issue => issue.instanceId === a.instanceId && issue.message.includes(word))), 'incomplete card explains every missing essential')
  const altMissing = { ...valid, banner: { images: [{ ...valid.banner.images[0], alt: '' }] } }
  ok(validation.validateShowcase(altMissing, resolve).some(issue => /descreva a imagem/.test(issue.message)), 'informative image needs a text alternative')
  eq(validation.validateShowcase({ ...valid, banner: { images: [{ ...valid.banner.images[0], alt: '', decorative: true }] } }, resolve), [], 'explicitly decorative image may have empty alt')
  ok(validation.validateShowcase({ ...valid, cards: [valid.cards[0], { ...valid.cards[1], instanceId: valid.cards[0].instanceId }] }, resolve).some(issue => /repetido/.test(issue.message)), 'duplicate instance ids are rejected')
  ok(validation.validateShowcase({ ...valid, banner: { images: [{ ...valid.banner.images[0], assetRef: 'upload-simulado:perdido' }] } }, resolve).some(issue => /indisponível/.test(issue.message)), 'unresolvable media reference blocks saving')
  ok(validation.validateShowcase({ ...valid, introduction: { ...valid.introduction, title: ' ' } }, resolve).some(issue => issue.tab === 'introducao'), 'active introduction needs a title')
  eq(validation.validateShowcase({ ...valid, introduction: null }, resolve), [], 'removed introduction is valid')
  ok(validation.cardWarnings({ ...valid.cards[0], colors: { panel: '#F5F5F5', divider: '#000000' } }).length === 1, 'low contrast panel color is warned (not blocked)')

  /* Markdown allowlist */
  const md = markdown.parseShowcaseMarkdown('Texto **forte** e *ênfase*.\nLinha 2 com [link](https://example.invalid/a).\n\n- um\n- dois\n\n1. primeiro')
  eq(md.issues, [], 'allowed constructs produce no issues')
  eq(md.blocks.map(block => block.type), ['paragraph', 'list', 'list'], 'paragraphs and simple lists')
  ok(md.blocks[0].children.some(node => node.type === 'break') && md.blocks[0].children.some(node => node.type === 'strong') && md.blocks[0].children.some(node => node.type === 'em') && md.blocks[0].children.some(node => node.type === 'link' && node.href === 'https://example.invalid/a'), 'inline bold/italic/link and preserved line break')
  ok(md.blocks[2].ordered === true, 'ordered simple list')
  const hostile = markdown.parseShowcaseMarkdown('<script>alert(1)</script>\n<img src=x onerror=alert(1)>\n![x](https://example.invalid/i.png)\n[x](javascript:alert(1))\n[y](data:text/html,1)\n# Título\n| a | b |\n  - aninhada')
  ok(hostile.issues.length >= 7, 'HTML, images, unsafe links, headings, tables and nested lists are reported')
  const flat = JSON.stringify(hostile.blocks)
  ok(!/"type":"link"/.test(flat), 'no unsafe link becomes a link node')
  ok(markdown.markdownPlainText(hostile.blocks).includes('<script>alert(1)</script>'), 'raw HTML stays literal text')
  ok(markdown.safeHttpUrl('http://example.invalid') && !markdown.safeHttpUrl('https://user:pw@example.invalid') && !markdown.safeHttpUrl('ftp://example.invalid') && !markdown.safeHttpUrl('//example.invalid'), 'only absolute HTTP(S) links without credentials')

  /* presentation gates (not authorization) */
  const tenant = mapping.SHOWCASE_SIMULATION.mockTenant
  ok(access.showcaseAvailableFor({ tenantId: tenant.id, tenantSlug: tenant.slug, environment: 'homolog' }), 'mapped owner fixture in homolog → available')
  for (const id of ['1', '2', '3', '6', 'wl_proto_01', '999']) ok(!access.showcaseAvailableFor({ tenantId: id, environment: 'homolog' }), `other tenant ${id} → unavailable`)
  ok(!access.showcaseAvailableFor({ tenantId: tenant.id, environment: 'outro' }), 'owner in another environment → unavailable')
  ok(!access.showcaseAvailableFor({ tenantId: tenant.id, tenantSlug: 'outro-slug', environment: 'homolog' }), 'confirmed slug mismatch → unavailable')
  ok(access.canViewShowcase(admin.roles) && access.canViewShowcase(readonly.roles) && !access.canViewShowcase(support.roles) && !access.canViewShowcase([]), 'view follows the existing settings read gate')
  ok(access.canEditShowcase(admin.roles) && !access.canEditShowcase(readonly.roles) && !access.canEditShowcase(support.roles), 'edit is SUPER_ADMIN only')
  eq(mapping.mockSlugForInput(' HomologACAO '), tenant.slug, 'logical slug maps to the mock fixture')
  ok(mapping.isShowcaseFamilyHash('#/whitelabels/4/settings/plataforma/vitrine?aba=banner') && mapping.isShowcaseFamilyHash(`#/whitelabels/4/settings/plataforma/vitrine/cards/${a.instanceId}`) && mapping.isShowcaseFamilyHash('#/mock/vitrine-publica/4?versao=rascunho') && !mapping.isShowcaseFamilyHash('#/whitelabels/4/settings'), 'showcase route family')

  /* slug lookup classification (adapter result) and mock transport row */
  const row = { id: tenant.id, slug: tenant.slug, name: tenant.name, status: 'active' }
  eq(lookup.classifyLookup(tenant.slug, [row], true).status, 'found', 'exact active match → found')
  eq(lookup.classifyLookup(tenant.slug, [{ ...row, status: 'inactive' }], true).status, 'inactive', 'inactive source cannot be added (prototype decision)')
  eq(lookup.classifyLookup('nao-existe', [row], true).status, 'not-found', 'no exact match with complete pagination → not found')
  eq(lookup.classifyLookup('nao-existe', [], false).status, 'inconclusive', 'incomplete pagination never proves absence')
  eq(lookup.classifyLookup(tenant.slug, [{ ...row, slug: `${tenant.slug}-2` }], true).status, 'not-found', 'prefix/similar slugs are never accepted')
  ok(lookup.classifyLookup(tenant.slug, [row], true).source.logical?.slug === 'homologacao', 'found owner source carries the logical identity')
  const login = await mockRequest('/auth/login', { method: 'POST', body: JSON.stringify({ email: 'demo@example.invalid', password: 'demo' }) })
  const headers = { Authorization: `Bearer ${(await login.json()).accessToken}` }
  const listed = await (await mockRequest(`/whitelabels?search=${tenant.slug}&page=1&perPage=10`, { headers })).json()
  ok(listed.data.some(item => item.idKey === tenant.id && item.slug === tenant.slug && item.isActive) && !listed.data.some(item => item.slug === 'homologacao'), 'mock transport exposes only the fictitious owner fixture, never the real slug')
  const wallets = await (await mockRequest('/wallets?perPage=100', { headers })).json().catch(() => null)
  ok(!wallets?.data?.some?.(item => item.whitelabelId === tenant.numericId), 'no Finance seed fabricated for the owner fixture')

  /* simulated repository: complete save, expected revision, roles, uncertainty */
  repository.resetStoredShowcaseForChecks()
  const base = repository.readStoredShowcase()
  const changed = { ...base.document, introduction: { ...base.document.introduction, subtitle: 'Alterado na verificação' } }
  eq((await repository.saveShowcase({ expectedRevision: base.revision, document: changed, actor: readonly, outcome: 'sucesso', resolve, delayMs: 0 })).status, 'rejected', 'READ_ONLY save rejected by the simulation')
  eq((await repository.saveShowcase({ expectedRevision: base.revision, document: { ...changed, cards: [] }, actor: admin, outcome: 'sucesso', resolve, delayMs: 0 })).status, 'rejected', 'incomplete configuration rejected server-side (simulated)')
  eq((await repository.saveShowcase({ expectedRevision: base.revision, document: changed, actor: admin, outcome: 'falha', resolve, delayMs: 0 })).status, 'failed', 'simulated failure')
  eq(repository.readStoredShowcase().revision, base.revision, 'failure leaves the stored version untouched')
  const saved = await repository.saveShowcase({ expectedRevision: base.revision, document: changed, actor: admin, outcome: 'sucesso', resolve, delayMs: 0 })
  ok(saved.status === 'saved' && saved.stored.revision === base.revision + 1, 'complete save increments the revision')
  const stale = await repository.saveShowcase({ expectedRevision: base.revision, document: valid, actor: admin, outcome: 'sucesso', resolve, delayMs: 0 })
  ok(stale.status === 'conflict' && repository.readStoredShowcase().document.introduction.subtitle === 'Alterado na verificação', 'stale revision conflicts and nothing is overwritten')
  ok(repository.getStoredSnapshot() === repository.getStoredSnapshot(), 'stable snapshot for subscriptions')

  /* draft store: dirty tracking, role guard, conflict keeps the draft, uncertain → readback */
  repository.resetStoredShowcaseForChecks()
  store.resetShowcaseStoreForChecks()
  ok(!store.isDraftDirty(), 'fresh store is clean')
  assert.throws(() => store.updateDraft(readonly, draft => ({ ...draft, cards: [] })), /permissão/)
  checks++
  ok(!store.isDraftDirty(), 'READ_ONLY mutation handler is refused')
  store.addCard(admin, a)
  ok(store.isDraftDirty() && store.draftIssues().length > 0, 'incomplete draft is representable and explains why it cannot be saved')
  eq((await store.saveDraft(admin)).status, 'blocked', 'incomplete draft is not saved')
  store.removeCard(admin, a.instanceId)
  ok(!store.isDraftDirty(), 'removing the added card returns to the saved state')
  store.updateDraft(admin, draft => ({ ...draft, introduction: { ...draft.introduction, title: 'Título editado' } }))
  repository.simulateConcurrentEdit(admin)
  await store.saveDraft(admin)
  ok(store.getShowcaseState().phase === 'conflict' && store.getShowcaseState().draft.introduction.title === 'Título editado', 'conflict preserves the draft (no forced overwrite)')
  eq((await store.saveDraft(admin)).status, 'blocked', 'saving stays blocked until the current version is reloaded')
  store.discardDraft(admin)
  ok(!store.isDraftDirty() && store.getShowcaseState().baseRevision === repository.readStoredShowcase().revision, 'reload adopts the current revision')
  store.updateDraft(admin, draft => ({ ...draft, introduction: { ...draft.introduction, title: 'Gravação incerta' } }))
  simulation.setNextOutcomes(admin, { nextSave: 'incerto-aplicado' })
  await store.saveDraft(admin)
  ok(store.getShowcaseState().phase === 'saved' && /leitura confirmou/.test(store.getShowcaseState().message), 'uncertain result is confirmed by readback before any resend')
  store.updateDraft(admin, draft => ({ ...draft, introduction: { ...draft.introduction, title: 'Não aplicada' } }))
  simulation.setNextOutcomes(admin, { nextSave: 'incerto-nao-aplicado' })
  await store.saveDraft(admin)
  ok(store.getShowcaseState().phase === 'failed' && store.isDraftDirty(), 'uncertain-not-applied keeps the draft for a new attempt')
  ok(simulation.getSimulation().nextSave === 'sucesso', 'one-shot simulation outcomes reset')
  const introStored = store.getShowcaseState().draft.introduction
  store.removeIntroduction(admin)
  ok(store.getShowcaseState().draft.introduction === null, 'introduction section can be removed')
  store.restoreIntroduction(admin)
  eq(store.getShowcaseState().draft.introduction, introStored, 'removed introduction can be restored in the same draft')

  /* upload candidate validation (prototype assumption: PNG/JPEG, non-empty, ≤ 20 MiB, matching signature) */
  const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), jpg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0])
  ok(media.checkUploadCandidate({ name: 'a.png', type: 'image/png', size: 10 }, png).ok && media.checkUploadCandidate({ name: 'a.jpeg', type: 'image/jpeg', size: 10 }, jpg).ok, 'PNG/JPEG accepted')
  ok(!media.checkUploadCandidate({ name: 'a.png', type: 'image/png', size: 0 }, png).ok, 'empty file refused')
  ok(!media.checkUploadCandidate({ name: 'a.png', type: 'image/png', size: media.UPLOAD_LIMIT_BYTES + 1 }, png).ok, 'file over 20 MiB refused')
  ok(!media.checkUploadCandidate({ name: 'a.webp', type: 'image/webp', size: 10 }, png).ok && !media.checkUploadCandidate({ name: 'a.gif', type: 'image/gif', size: 10 }, png).ok, 'other formats refused')
  ok(!media.checkUploadCandidate({ name: 'a.png', type: 'image/png', size: 10 }, jpg).ok, 'signature must match the declared format')
  ok(media.uploadWarnings('foto', 'image/jpeg', 10, 800, 800).length === 2 && media.uploadWarnings('foto', 'image/jpeg', 10, 1440, 720).length === 0, 'resolution/proportion produce guidance, not rejection')

  /* ---------- Stage 3 regressions (defects observed in the Stage 2 local review) ---------- */

  /* B1 · READ_ONLY: every write path of this module is refused by the called function itself, and nothing changes */
  repository.resetStoredShowcaseForChecks()
  store.resetShowcaseStoreForChecks()
  defaults.resetSourceDefaultsForChecks()
  // Precondition: a pending draft in this tab and a pending one-shot outcome, so "nothing changed" is meaningful.
  store.updateDraft(admin, draft => ({ ...draft, introduction: { ...draft.introduction, subtitle: 'Rascunho de outra pessoa nesta aba' } }))
  simulation.setNextOutcomes(admin, { nextUpload: 'falha' })
  const before = {
    stored: JSON.stringify(repository.readStoredShowcase()),
    snapshot: repository.getStoredSnapshot(),
    state: JSON.stringify(store.getShowcaseState()),
    simulation: JSON.stringify(simulation.getSimulation()),
    source: JSON.stringify(defaults.getSourceDefaults('nova-plataforma-demo')),
  }
  const seeded = store.getShowcaseState().draft.cards
  const readonlyWrites = [
    // Controls of "Controles da simulação" (B1 reproduction: "Simular edição em outra sessão" incremented 1 → 2).
    ['simular edição em outra sessão', () => repository.simulateConcurrentEdit(readonly)],
    ['simular nova versão do branding da origem', () => defaults.simulateSourceBrandingChange(readonly, 'nova-plataforma-demo')],
    ['próximo salvamento', () => simulation.setNextOutcomes(readonly, { nextSave: 'falha' })],
    ['próximo envio de arquivo', () => simulation.setNextOutcomes(readonly, { nextUpload: 'sucesso' })],
    ['próxima busca', () => simulation.setNextOutcomes(readonly, { nextLookup: 'falha' })],
    // Restoration / discard of data.
    ['descartar rascunho', () => store.discardDraft(readonly)],
    ['remover introdução', () => store.removeIntroduction(readonly)],
    ['restaurar introdução', () => store.restoreIntroduction(readonly)],
    // Ordinary editorial handlers.
    ['adicionar card', () => store.addCard(readonly, a)],
    ['mover card', () => store.moveCardTo(readonly, 0, 1)],
    ['remover card', () => store.removeCard(readonly, seeded[0].instanceId)],
    ['aplicar card', () => store.replaceCard(readonly, { ...seeded[0], shortDescription: 'x' })],
  ]
  for (const [label, attempt] of readonlyWrites) {
    assert.throws(attempt, error => error instanceof access.ShowcasePermissionError, `READ_ONLY ${label} must be refused`)
    checks++
  }
  assert.throws(() => repository.simulateConcurrentEdit(support), error => error instanceof access.ShowcasePermissionError, 'SUPPORT_ADMIN concurrent edit must be refused')
  checks++
  await assert.rejects(store.saveDraft(readonly), error => error instanceof access.ShowcasePermissionError, 'READ_ONLY save must be refused')
  checks++
  const pngFile = new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])], 'tentativa.png', { type: 'image/png' })
  await assert.rejects(media.ingestUpload(readonly, pngFile, 'foto'), error => error instanceof access.ShowcasePermissionError, 'READ_ONLY upload must be refused')
  checks++
  eq(JSON.stringify(repository.readStoredShowcase()), before.stored, 'READ_ONLY attempts: saved document and revision unchanged')
  ok(repository.getStoredSnapshot() === before.snapshot, 'READ_ONLY attempts: no repository notification/snapshot replaced')
  eq(JSON.stringify(store.getShowcaseState()), before.state, 'READ_ONLY attempts: draft, phase and base revision unchanged')
  eq(JSON.stringify(simulation.getSimulation()), before.simulation, 'READ_ONLY attempts: simulated outcomes unchanged and not consumed')
  eq(JSON.stringify(defaults.getSourceDefaults('nova-plataforma-demo')), before.source, 'READ_ONLY attempts: source defaults unchanged')
  // Consultation stays available: reading the saved version and switching the demo context write nothing.
  simulation.setSimulatedEnvironment('outro')
  simulation.setSimulatedEnvironment('homolog')
  ok(JSON.stringify(repository.readStoredShowcase()) === before.stored && JSON.stringify(store.getShowcaseState()) === before.state, 'context selector (MOCK gallery) changes no document, revision or draft')
  // The source lifecycle that makes a card's origin inactive goes through the mock transport, which refuses READ_ONLY writes.
  const readonlyLogin = await mockRequest('/auth/login', { method: 'POST', body: JSON.stringify({ email: 'readonly@example.invalid', password: 'demo' }) })
  const readonlyHeaders = { Authorization: `Bearer ${(await readonlyLogin.json()).accessToken}` }
  const novaRow = (await (await mockRequest('/whitelabels?search=nova-plataforma-demo&page=1&perPage=10', { headers: readonlyHeaders })).json()).data.find(item => item.slug === 'nova-plataforma-demo')
  eq((await mockRequest(`/whitelabels/${novaRow.id}/deactivate`, { method: 'PATCH', headers: readonlyHeaders })).status, 403, 'READ_ONLY cannot deactivate a card source')
  ok((await (await mockRequest(`/whitelabels/${novaRow.id}`, { headers: readonlyHeaders })).json()).isActive === true, 'source stays active after the refused READ_ONLY attempt')
  // Positive control: the same commands still work for the edit profile.
  const concurrent = repository.simulateConcurrentEdit(admin)
  ok(concurrent.revision === JSON.parse(before.stored).revision + 1, 'SUPER_ADMIN simulation command still writes (control)')
  simulation.setNextOutcomes(admin, { nextUpload: 'sucesso' })

  /* B2 · reload/close protection follows the draft, not the screen (saved projection included) */
  repository.resetStoredShowcaseForChecks()
  store.resetShowcaseStoreForChecks()
  const unloadListeners = new Map()
  const tab = { addEventListener: (type, listener) => unloadListeners.set(type, listener), removeEventListener: (type, listener) => { if (unloadListeners.get(type) === listener) unloadListeners.delete(type) } }
  const uninstall = store.installDraftUnloadProtection(tab)
  const reload = () => {
    const event = { prevented: false, returnValue: undefined, preventDefault() { this.prevented = true } }
    unloadListeners.get('beforeunload')(event)
    return event
  }
  ok(!reload().prevented, 'clean tab: reload is not interrupted')
  // Recorded scenario: edit the subtitle, open the draft page, go to the saved projection #/mock/vitrine-publica/4, reload.
  store.updateDraft(admin, draft => ({ ...draft, introduction: { ...draft.introduction, subtitle: 'QA rascunho reload 20261106' } }))
  ok(navigation.leavePrompt(mapping.showcasePublicHref(tenant.id, true), admin) === null && navigation.leavePrompt(mapping.showcasePublicHref(tenant.id), admin) === null, 'editor → draft page → saved projection keeps the draft without asking')
  const reloadSaved = reload()
  ok(reloadSaved.prevented && reloadSaved.returnValue === '', 'reload while the saved projection is shown asks first (the draft would be lost)')
  ok(navigation.leavePrompt(mapping.showcaseEditorHref(tenant.id, 'introducao'), admin) === null, 'back to the editor keeps the draft without asking')
  const leaving = navigation.leavePrompt('#/dashboard', admin)
  ok(leaving && leaving.confirmLabel === 'Descartar e sair', 'leaving the Vitrine screens with a draft asks, from any of them')
  eq(navigation.leavePrompt('#/dashboard', readonly), null, 'a profile that cannot discard is not asked: its navigation keeps the tab memory')
  eq(store.getShowcaseState().draft.introduction.subtitle, 'QA rascunho reload 20261106', 'assessing navigation never discards')
  leaving.onConfirm()
  ok(!store.isDraftDirty() && !reload().prevented, 'after the confirmed discard, reload is free again')
  store.updateDraft(admin, draft => ({ ...draft, introduction: { ...draft.introduction, subtitle: 'Salvo antes de recarregar' } }))
  ok(reload().prevented, 'new draft protected again')
  await store.saveDraft(admin)
  ok(store.getShowcaseState().phase === 'saved' && !reload().prevented, 'after a confirmed save, reload is free (the seed is restored by design)')
  uninstall()
  ok(!unloadListeners.has('beforeunload'), 'protection is removed with the tab component')

  /* D1 · "Adicionar card": the result always belongs to the current slug */
  const rows = [
    { id: '1', slug: 'finapop-demo', name: 'Finapop · Demo', status: 'active' },
    { id: '2', slug: 'loor-demo', name: 'Loor · Demo', status: 'inactive' },
    { id: '3', slug: 'nova-plataforma-demo', name: 'Nova Plataforma · Demo', status: 'active' },
    { id: tenant.id, slug: tenant.slug, name: tenant.name, status: 'active' },
  ]
  const answer = typed => lookup.classifyLookup(mapping.mockSlugForInput(typed), rows, true)
  const searchFor = (session, typed) => {
    const started = lookup.startLookup(lookup.editLookupInput(session, typed))
    return { started, session: started.session }
  }
  // A found → input edited to B without searching.
  let run = searchFor(lookup.initialLookupSession, 'finapop-demo')
  let session = lookup.receiveLookup(run.session, run.started.attempt, answer('finapop-demo'))
  eq(lookup.eligibleLookupSelection(session)?.source.slug, 'finapop-demo', 'result for the current slug can be added')
  const editedToB = lookup.editLookupInput(session, 'nao-existe-qa')
  ok(editedToB.result === null && editedToB.phase === 'idle' && lookup.eligibleLookupSelection(editedToB) === null, 'A found, input changed to B: previous result and selection discarded (03-stale-slug-result)')
  ok(lookup.eligibleLookupSelection({ ...session, input: 'nao-existe-qa' }) === null, 'even a kept result is never addable when it does not match the current input')
  ok(lookup.eligibleLookupSelection(lookup.editLookupInput(session, '  FINAPOP-demo ')) !== null, 'same normalized slug keeps its own result')
  // Empty and non-existent input.
  const emptied = lookup.editLookupInput(session, '   ')
  ok(lookup.eligibleLookupSelection(emptied) === null && lookup.startLookup(emptied) === null, 'empty input: nothing selectable, nothing searched')
  run = searchFor(session, 'nao-existe-qa')
  session = lookup.receiveLookup(run.session, run.started.attempt, answer('nao-existe-qa'))
  ok(session.result.status === 'not-found' && lookup.eligibleLookupSelection(session) === null, 'non-existent slug: not found, nothing selectable')
  // Out-of-order responses: A pending, slug changed to B and searched, B answers, then A arrives late.
  const runA = searchFor(lookup.initialLookupSession, 'finapop-demo')
  const runB = searchFor(runA.session, 'nova-plataforma-demo')
  ok(lookup.receiveLookup(runB.session, runA.started.attempt, answer('finapop-demo')) === runB.session, 'late A while B is loading is ignored')
  session = lookup.receiveLookup(runB.session, runB.started.attempt, answer('nova-plataforma-demo'))
  session = lookup.receiveLookup(session, runA.started.attempt, answer('finapop-demo'))
  eq(lookup.eligibleLookupSelection(session)?.source.slug, 'nova-plataforma-demo', 'late A after B never replaces the newer result')
  const typedDuringA = lookup.editLookupInput(runA.session, 'loor-demo')
  eq(lookup.receiveLookup(typedDuringA, runA.started.attempt, answer('finapop-demo')), typedDuringA, 'editing while A is loading supersedes A')
  // Inclusion only from an eligible result of the current input.
  for (const [typed, status] of [['loor-demo', 'inactive'], ['nao-existe-qa', 'not-found']]) {
    const r = searchFor(lookup.initialLookupSession, typed)
    const done = lookup.receiveLookup(r.session, r.started.attempt, answer(typed))
    ok(done.result.status === status && lookup.eligibleLookupSelection(done) === null, `${status} result is never addable`)
  }
  for (const failure of [{ status: 'error', slug: 'finapop-demo', message: 'x' }, { status: 'inconclusive', slug: 'finapop-demo', reason: 'x' }]) {
    const r = searchFor(lookup.initialLookupSession, 'finapop-demo')
    ok(lookup.eligibleLookupSelection(lookup.receiveLookup(r.session, r.started.attempt, failure)) === null, `${failure.status} result is never addable`)
  }
  const forgedFound = searchFor(lookup.initialLookupSession, 'finapop-demo')
  ok(lookup.eligibleLookupSelection(lookup.receiveLookup(forgedFound.session, forgedFound.started.attempt, answer('nova-plataforma-demo'))) === null, 'a found result for another slug is never addable')
  // Repetition of a valid source stays possible: two lookups of the owner → two independent cards.
  repository.resetStoredShowcaseForChecks()
  store.resetShowcaseStoreForChecks()
  const ownerCards = ['homologacao', ' HOMOLOGACAO'].map(typed => {
    const r = searchFor(lookup.initialLookupSession, typed)
    const selection = lookup.eligibleLookupSelection(lookup.receiveLookup(r.session, r.started.attempt, answer(typed)))
    const card = model.createCardInstance({ source: selection.source, defaults: selection.defaults, copyLogo: media.copyForOwner })
    store.addCard(admin, card)
    return card
  })
  const ownerIds = store.getShowcaseState().draft.cards.filter(card => card.source.slug === tenant.slug).map(card => card.instanceId)
  ok(ownerCards[0].instanceId !== ownerCards[1].instanceId && ownerCards.every(card => ownerIds.includes(card.instanceId)) && ownerIds.length === seed.seedDocument().cards.length + 2 && new Set(ownerIds).size === ownerIds.length, 'owner source repeated in independent cards (seed instances + 2 new, all distinct)')
  store.resetShowcaseStoreForChecks()

  /* B3 · configurable text wraps inside the approved geometry (static guard; layout is verified in the browser) */
  const cssRules = [...css.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(m => ({ selectors: m[1].split(/,(?![^(]*\))/).map(x => x.trim()), body: m[2] }))
  const declares = (selector, property) => cssRules.some(rule => rule.selectors.includes(selector) && new RegExp(`(^|;)\\s*${property}\\s*;?`).test(rule.body.replace(/\s+/g, ' ').replace(/: /g, ':')))
  for (const selector of [':where(.wl-showcase) .wl-platform-details p', ':where(.wl-showcase) .wl-brand-fallback', ':where(.wl-showcase) .wl-intro-title', ':where(.wl-showcase) .wl-intro-subtitle', ':where(.wl-showcase) .wl-intro-body', ':where(.wl-showcase) .wl-dialog .wl-dialog-title', ':where(.wl-showcase) .wl-dialog > p']) {
    ok(declares(selector, 'overflow-wrap:anywhere'), `user text may break anywhere: ${selector}`)
  }
  for (const selector of [':where(.wl-showcase) .wl-platforms > *', ':where(.wl-showcase) .wl-platform > *', ':where(.wl-showcase) .wl-platform-info > *']) {
    ok(declares(selector, 'min-width:0'), `card track item has a zero minimum: ${selector}`)
  }

  /* B2 complement · voluntary logout with card fields not yet applied (Stage 3 revalidation) */
  const prototypeNavigation = await load('src/app/prototypeNavigation.ts')
  const auth = await load('src/lib/authSession.ts')
  const cardHash = mapping.showcaseCardHref(tenant.id, seed.seedDocument().cards[0].instanceId)
  const previousWindow = globalThis.window
  // logout() only writes window.location.hash; this minimal stand-in is removed afterwards.
  globalThis.window = { location: { hash: cardHash } }
  try {
    const signIn = async () => auth.persistSession(await (await mockRequest('/auth/login', { method: 'POST', body: JSON.stringify({ email: 'demo@example.invalid', password: 'demo' }) })).json())
    repository.resetStoredShowcaseForChecks()
    store.resetShowcaseStoreForChecks()
    // An applied draft (tab memory, survives logout by policy) plus a card field edited but not applied.
    store.updateDraft(admin, draft => ({ ...draft, introduction: { ...draft.introduction, subtitle: 'Rascunho aplicado mantido' } }))
    const original = store.getShowcaseState().draft.cards[0].shortDescription
    const edited = 'QA campo local não aplicado — troca de perfil'
    let field = edited
    let held = null
    const unregister = prototypeNavigation.registerPrototypeLogoutGuard(navigation.holdLogoutWhenNeeded(
      () => navigation.cardLogoutPrompt(field !== original, () => { field = original }),
      pending => { held = pending },
    ))
    await signIn()
    prototypeNavigation.requestPrototypeLogout(auth.logout)
    ok(held && auth.isAuthenticated() && window.location.hash === cardHash && field === edited, 'logout with unapplied card fields is held: session, route and field intact')
    ok(/ainda não foram aplicados/.test(held.prompt.description) && /continuam na memória desta aba/.test(held.prompt.description) && held.prompt.confirmLabel === 'Descartar alterações do card e sair', 'prompt names what is lost (card fields) and what stays (applied draft)')
    // Cancel ("Continuar editando" clears the pending prompt only).
    held = null
    ok(auth.isAuthenticated() && window.location.hash === cardHash && field === edited, 'cancel keeps session, route and edited values')
    // Confirm.
    prototypeNavigation.requestPrototypeLogout(auth.logout)
    held.prompt.onConfirm()
    held.resume()
    ok(!auth.isAuthenticated() && window.location.hash === '#/login' && field === original, 'confirm discards only the card fields, then logs out')
    eq(store.getShowcaseState().draft.introduction.subtitle, 'Rascunho aplicado mantido', 'applied tab draft is not discarded by logout (documented policy)')
    // Editor without changes: no confirmation.
    await signIn()
    window.location.hash = cardHash
    held = null
    prototypeNavigation.requestPrototypeLogout(auth.logout)
    ok(held === null && !auth.isAuthenticated() && window.location.hash === '#/login', 'card editor without changes: immediate logout, no confirmation')
    unregister()
    // Screens that register nothing keep the original immediate logout.
    await signIn()
    prototypeNavigation.requestPrototypeLogout(auth.logout)
    ok(!auth.isAuthenticated(), 'without a registered guard, logout is unchanged')
    store.resetShowcaseStoreForChecks()
  } finally {
    if (previousWindow === undefined) delete globalThis.window
    else globalThis.window = previousWindow
  }

  /* B3 complement · shell title of the Vitrine views (static presence only; overflow is measured in the browser) */
  const editorCss = await fs.readFile(path.join(feature, 'editor/ShowcaseEditor.module.css'), 'utf8')
  ok(/:global\(html\[data-view\^='settings-showcase'\] header h1\)\s*\{[^}]*min-width:\s*0[^}]*white-space:\s*normal[^}]*overflow-wrap:\s*anywhere/.test(editorCss), 'shell title opt-in for the Vitrine views only (other screens unchanged)')

  /* ---------- Stage 3 follow-up (D2, D3, upload attempts) ---------- */

  /* D2 · "Configurações" quick action of the Whitelabels list: same rule as the Settings entry block */
  const settingsHref = mapping.showcaseOwnerSettingsHref(tenant.id)
  eq(access.showcaseSettingsEntryHref({ tenantId: tenant.id, tenantSlug: tenant.slug, environment: 'homolog', roles: admin.roles }), settingsHref, 'SUPER_ADMIN on the mapped owner in homolog → owner Settings')
  eq(access.showcaseSettingsEntryHref({ tenantId: tenant.id, tenantSlug: tenant.slug, environment: 'homolog', roles: readonly.roles }), settingsHref, 'READ_ONLY → same Settings, for consultation only')
  ok(!access.canEditShowcase(readonly.roles), 'the destination grants no edit to READ_ONLY (edit gate unchanged)')
  for (const [label, context] of [
    ['SUPPORT_ADMIN', { tenantId: tenant.id, tenantSlug: tenant.slug, environment: 'homolog', roles: support.roles }],
    ['no session', { tenantId: tenant.id, tenantSlug: tenant.slug, environment: 'homolog', roles: undefined }],
    ['other environment', { tenantId: tenant.id, tenantSlug: tenant.slug, environment: 'outro', roles: admin.roles }],
    ['other tenant #1', { tenantId: '1', tenantSlug: 'finapop-demo', environment: 'homolog', roles: admin.roles }],
    ['other tenant #3', { tenantId: '3', tenantSlug: 'nova-plataforma-demo', environment: 'homolog', roles: admin.roles }],
    ['prototype id', { tenantId: 'wl_proto_01', tenantSlug: 'wl_proto_01', environment: 'homolog', roles: admin.roles }],
    ['slug mismatch', { tenantId: tenant.id, tenantSlug: 'outro-slug', environment: 'homolog', roles: admin.roles }],
  ]) eq(access.showcaseSettingsEntryHref(context), null, `${label} → keeps the previous notice (no destination)`)

  /* D3 · breakpoints keep exactly the approved set (static guard; the threshold itself is measured in the browser) */
  const conditions = [...new Set([...css.matchAll(/@container wl-page ([^{]+)\{/g)].map(m => m[1].trim()))].sort()
  eq(conditions, ['(max-width: 1149px)', '(max-width: 1320px) and (min-width: 1150px)', '(max-width: 700px)'], 'container breakpoints = approved media breakpoints (1320/1150, 1149, 700)')

  /* Upload attempts · abandoned or superseded uploads never apply; failures never leave "sending" */
  const deferred = () => { let resolve, reject; const promise = new Promise((ok, ko) => { resolve = ok; reject = ko }); return { promise, resolve, reject } }
  const fakeUpload = name => {
    const assetRef = `upload-simulado:check-${name}`
    media.registerMedia({ assetRef, url: `blob:check-${name}`, fileName: `${name}.png`, mime: 'image/png', bytes: 10, width: 1440, height: 720, origin: 'upload-simulado' })
    return { ok: true, entry: media.resolveMedia(assetRef), warnings: [] }
  }
  // Control: the current attempt of an open picker applies.
  let picker = media.createUploadAttempts()
  let pending = deferred()
  let attemptRun = media.runUploadAttempt(picker, () => pending.promise)
  pending.resolve(fakeUpload('control'))
  eq((await attemptRun).status, 'apply', 'current attempt of an open picker applies')
  // Picker closed (X / Escape / backdrop) while processing.
  picker = media.createUploadAttempts()
  pending = deferred()
  attemptRun = media.runUploadAttempt(picker, () => pending.promise)
  picker.close()
  pending.resolve(fakeUpload('closed'))
  eq((await attemptRun).status, 'ignored', 'closed picker: the late result is ignored')
  ok(!media.hasMedia('upload-simulado:check-closed'), 'the undelivered reference is released at once')
  // Superseded by another choice (approved example) in the same picker.
  picker = media.createUploadAttempts()
  pending = deferred()
  attemptRun = media.runUploadAttempt(picker, () => pending.promise)
  picker.supersede()
  pending.resolve(fakeUpload('superseded'))
  eq((await attemptRun).status, 'ignored', 'superseded attempt is ignored')
  // Abandoned picker A, new picker B completes first, then A answers late: only B applies.
  const uploadPickerA = media.createUploadAttempts(), uploadPickerB = media.createUploadAttempts()
  const slowA = deferred(), fastB = deferred()
  const uploadRunA = media.runUploadAttempt(uploadPickerA, () => slowA.promise)
  uploadPickerA.close()
  const uploadRunB = media.runUploadAttempt(uploadPickerB, () => fastB.promise)
  fastB.resolve(fakeUpload('b'))
  eq((await uploadRunB).status, 'apply', 'the newer picker applies its result')
  slowA.resolve(fakeUpload('a'))
  eq((await uploadRunA).status, 'ignored', 'late A after B never replaces the newer choice')
  // Two attempts in the same picker: the later one wins whatever the completion order.
  picker = media.createUploadAttempts()
  const first = deferred(), second = deferred()
  const uploadRunFirst = media.runUploadAttempt(picker, () => first.promise)
  const uploadRunSecond = media.runUploadAttempt(picker, () => second.promise)
  second.resolve(fakeUpload('second'))
  first.resolve(fakeUpload('first'))
  eq([(await uploadRunFirst).status, (await uploadRunSecond).status], ['ignored', 'apply'], 'only the latest attempt of a picker applies')
  // StrictMode-like effect cycle (close → open) before any attempt keeps the picker usable.
  picker = media.createUploadAttempts()
  picker.close()
  picker.open()
  pending = deferred()
  attemptRun = media.runUploadAttempt(picker, () => pending.promise)
  pending.resolve(fakeUpload('reopened'))
  eq((await attemptRun).status, 'apply', 'reopened picker applies its new attempt')
  // Expected failure keeps the previous image (caller applies nothing) and ends the loading state.
  picker = media.createUploadAttempts()
  eq(await media.runUploadAttempt(picker, async () => ({ ok: false, message: 'Falha simulada' })), { status: 'error', message: 'Falha simulada' }, 'failure → error state, nothing to apply (previous image preserved)')
  // Unexpected failure: an unreadable file through the real ingestUpload ends in an error, not in "sending".
  const unreadable = { name: 'ilegivel.png', type: 'image/png', size: 12, slice: () => ({ arrayBuffer: () => Promise.reject(new Error('NotReadableError')) }) }
  const unreadableOutcome = await media.runUploadAttempt(media.createUploadAttempts(), () => media.ingestUpload(admin, unreadable, 'foto'))
  ok(unreadableOutcome.status === 'error' && /Não foi possível ler o arquivo/.test(unreadableOutcome.message), 'unreadable file → error message, loading state can end')
  const refused = await media.runUploadAttempt(media.createUploadAttempts(), () => media.ingestUpload(readonly, unreadable, 'foto'))
  ok(refused.status === 'error' && /perfil sem permissão/.test(refused.message), 'READ_ONLY upload still refused, as an error state')

  console.log(`Mock Vitrine de White Labels passed: ${checks} checks (identity, repetition, ordering, defaults/restore, 1–4 media, validation, Markdown allowlist, presentation gates, simulated repository/draft/conflict/readback, uploads, scoped styles, approved asset copies; Stage 3: READ_ONLY write refusal, draft reload protection, logout with unapplied card fields, slug lookup session, configurable text wrapping guards; follow-up: list quick action, approved breakpoints, abandoned/superseded uploads). No network invoked; not Backend evidence; layout still needs the browser.`)
} finally {
  assert.ok(path.resolve(temp).startsWith(path.resolve(os.tmpdir()) + path.sep))
  await fs.rm(temp, { recursive: true, force: true })
}
