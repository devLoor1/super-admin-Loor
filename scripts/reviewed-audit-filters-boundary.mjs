import { beforeConsolidation } from './reviewed-consolidation-boundary.mjs'
import assert from 'node:assert/strict'
import { withoutOperators } from './reviewed-operators-boundary.mjs'
import { createHash } from 'node:crypto'
import { readFileSync } from './reviewed-consolidation-boundary.mjs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
// Exact later-delivery pins, not an Audit-directory exemption. Historical
// privacy/adversarial assertions remain active; current behavior has its own suite.
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..')
const fingerprints={
 'src/app/App.tsx':'2f5e5bbfd3c31a8cb39e31c61f1544870b9c8dd43054958602ef3ef343dcd1b7',
 'src/features/governance-audit/auditApi.ts':'94f1fe8f414579ec4368ac1ad1179a9df0054828ad8d4ae97153434813b3f7b9',
 'src/features/governance-audit/auditRoute.ts':'49065e98cea7ff4031de3f4cc89c4f6d32085d18c3fff6cefbeb52df7f3abbba',
 'src/features/governance-audit/auditDates.ts':'4200bf62b4e210b9f4f56291aadaed21f3e9e7a30bcc44d187d831762186fcbb',
 'src/features/governance-audit/AuditFilters.tsx':'3848b13eb9b1757f0d2a04f10050a2adeb88bb9d2b68ea438bde80ae45564eda',
 'src/features/governance-audit/useAuditData.ts':'58f78237b8c6229e874403f7b2c15b753cf9568ebd570ac8fcf784dbb0f594f4',
 'src/features/governance-audit/AuditListPage.tsx':'6d7092dd5684967237d05acb0d5cd51f515f625460b10f0dc69d6600f75a84a7',
 'src/features/governance-audit/AuditDetailPage.tsx':'f7abcf74299b1b17735182ef422475dfcc6f9ece6bda11a6cb9acbd541d13ffc',
 'src/features/governance-audit/Audit.module.css':'b6809cf2ae770ef6716bfa72aa374761e1694ca62d26d2d690c00b70267f8b41',
}
const hash=s=>createHash('sha256').update(s.replaceAll('\r\n','\n')).digest('hex')
export function reviewedAuditFilters(path){
 if(!Object.hasOwn(fingerprints,path))return false
 const source=beforeConsolidation(path,readFileSync(resolve(root,path),'utf8'))
 assert.equal(hash(path==='src/app/App.tsx'?withoutOperators(source):source),fingerprints[path],`Unreviewed Audit delivery change: ${path}`)
 return true
}
export function withoutAuditRawQuery(source){
  source=beforeConsolidation('src/app/App.tsx',source)
 const code=withoutOperators(source).replaceAll('\r\n','\n'), line='        rawQuery={route.search}\n'
 if(!code.includes(line))return code
 assert.equal(hash(code),fingerprints['src/app/App.tsx'],'Only the exact authorized Audit raw-query adaptations may be normalized')
 assert.equal(code.split(line).length,2)
 const raw="      search: window.location.hash.includes('?') ? window.location.hash.slice(window.location.hash.indexOf('?') + 1) : '',\n"
 assert.equal(code.split(raw).length,2)
 return code.replace(line,'').replace(raw,'      search,\n')
}
