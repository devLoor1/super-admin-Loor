import { beforeConsolidation } from './reviewed-consolidation-boundary.mjs'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync } from './reviewed-consolidation-boundary.mjs'
import { resolve } from 'node:path'
import { root } from './operators-test-harness.mjs'

// Exact SA-BE-007 delivery, not a directory exemption. Earlier runtime assertions
// remain in force after reversing ONLY these reviewed contextual additions.
const fingerprints = {
  'src/app/App.tsx':'30e757061923410ff345a6344afcc32b07eb1f83c54be03b694128a0267b8e11',
  'src/features/menu-visibility/MenuVisibilityPage.tsx':'619f61fb23f2882efe5949ad543a0df3a50b00f069fa15f536cf016f1b698cd4',
  'src/features/control-plane-operators/operatorApi.ts':'2301262d978c952cbc1c625ab5f52ea2c4a3b9f17cb579826822fe5a57e01285',
  'src/features/control-plane-operators/OperatorDetailPage.tsx':'d62f11ff49af148bafc08d7e1e9dffc3892a4e43ea7d43cca6782a053ab5a05f',
  'src/features/control-plane-operators/operatorPresent.ts':'4fceb81e71007e9b8dff171766837d4a530c86ce1fc9b1200985466b1c51a5c7',
  'src/features/control-plane-operators/operatorRoute.ts':'f8caaab99627058ae4cf7b2b0cb38a6892c77e68eb3776e6f2a1ca3355a0a313',
  'src/features/control-plane-operators/Operators.module.css':'71926f08b109ec50acf03f0681a73ac7ad33808bc22feff6a1a9bb99a5a7f305',
  'src/features/control-plane-operators/OperatorsListPage.tsx':'a0db24c6e130b5c79eab126add39cab53e05662301e087fafbfd8e4150de01e0',
  'src/features/control-plane-operators/OperatorUi.tsx':'179e1e9afda8ce000ed8f5a01773b948c71b01801dbe517b6ead99b347bfab70',
  'src/features/control-plane-operators/useOperators.ts':'3e8498086b30cca64fbd6104b45ae24322aca3ffdf496b04595efee575200c62',
}
const hash = s => createHash('sha256').update(s.replaceAll('\r\n','\n')).digest('hex')
export function reviewedOperators(path) {
  if (!Object.hasOwn(fingerprints,path)) return false
  assert.equal(hash(beforeConsolidation(path,readFileSync(resolve(root,path),'utf8'))),fingerprints[path],`Unreviewed Operators boundary: ${path}`)
  return true
}
const additions = [
  "import { OperatorsListPage } from '../features/control-plane-operators/OperatorsListPage'\n",
  "import { OperatorDetailPage } from '../features/control-plane-operators/OperatorDetailPage'\n",
  "  | 'control-plane-operators'\n  | 'control-plane-operator'\n",
  "  | { view: 'control-plane-operators'; rawQuery: string }\n  | { view: 'control-plane-operator'; id: string; returnTo?: string; invalidQuery: boolean }\n",
  "  'control-plane-operators': 'Super Admin · Operadores do Control Plane',\n  'control-plane-operator': 'Super Admin · Consulta do operador',\n",
  "  'control-plane-operators',\n  'control-plane-operator',\n",
  "  if (path === 'settings/operators') return { view: 'control-plane-operators', rawQuery: window.location.hash.split('?').slice(1).join('?') }\n  if (path.startsWith('settings/operators/')) {\n    return { view: 'control-plane-operator', id: decodeSegment(path.slice('settings/operators/'.length)), returnTo: param('returnTo'), invalidQuery: [...params.keys()].some(key => key !== 'returnTo' || params.getAll(key).length !== 1) }\n  }\n",
  "  if (route.view === 'control-plane-operators') return <OperatorsListPage rawQuery={route.rawQuery} />\n  if (route.view === 'control-plane-operator') return <OperatorDetailPage key={route.id} id={route.id} returnTo={route.returnTo} invalidQuery={route.invalidQuery} />\n",
]
export function withoutOperators(source) {
  source=beforeConsolidation('src/app/App.tsx',source)
  let code=source.replaceAll('\r\n','\n')
  if (!code.includes("import { OperatorsListPage }")) { assert.ok(!code.includes('control-plane-operators'),'Unreviewed partial Operators adaptation'); return code }
  assert.equal(hash(code),fingerprints['src/app/App.tsx'],'Only exact reviewed Operators App additions can be normalized')
  for (const exact of additions) {assert.equal(code.split(exact).length,2);code=code.replace(exact,'')}
  return code
}
export function withoutOperatorsEntry(source) {
  source=beforeConsolidation('src/features/menu-visibility/MenuVisibilityPage.tsx',source)
  let code=source.replaceAll('\r\n','\n')
  assert.equal(hash(code),fingerprints['src/features/menu-visibility/MenuVisibilityPage.tsx'])
  for(const exact of ["import { OperatorsEntry } from '../control-plane-operators/OperatorUi'\n",'      <OperatorsEntry />\n']) {assert.equal(code.split(exact).length,2);code=code.replace(exact,'')}
  return code
}
