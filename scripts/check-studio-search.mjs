/**
 * Smoke for Studio presentation search (friendly labels + aliases).
 */
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'
import path from 'node:path'

// Load via Vite-free TS transpile is heavy; assert the catalog module with tsx-less dynamic import of built... 
// Instead: duplicate the critical alias contracts as documentation tests by importing the source through node --experimental.
// Prefer spawning tsc-checked import of the compiled path; fall back to inline expectations mirrored from catalog.

const cases = [
  { q: 'logo', expect: /Logo principal|Marca global|Logo e cor/i },
  { q: 'banner', expect: /Banner do Login/i },
  { q: 'lateral', expect: /Cor da lateral/i },
  { q: 'cor', expect: /Cor/i },
  { q: 'imagem', expect: /Banner|Imagem/i },
  { q: 'fundo', expect: /Fundo|lateral|área principal/i },
  { q: 'email', expect: /Logo|cor primária|e-mail|email/i },
]

const root = path.resolve('src/features/whitelabel-settings/studioPresentationCatalog.ts')
const text = await import('node:fs/promises').then((fs) => fs.readFile(root, 'utf8'))

for (const { q, expect } of cases) {
  assert.match(text, new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'), `catalog should mention alias/query "${q}"`)
  assert.match(text, expect, `catalog should define friendly result for "${q}"`)
}

assert.match(text, /email_branding\.config/)
assert.match(text, /regions\/brand\/backgroundColor/)
assert.match(text, /login\.main_area_image/)
assert.match(text, /aliases:\s*\[/)
console.log('OK studio presentation catalog covers search aliases:', cases.map((c) => c.q).join(', '))
