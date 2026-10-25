import { readFile } from './reviewed-consolidation-boundary.mjs'
import { testSourceExists as existsSync } from './reviewed-consolidation-boundary.mjs'
import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import ts from 'typescript'

export const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(import.meta.url)
export const dataModule = code => `data:text/javascript;base64,${Buffer.from(code).toString('base64')}`
export const reactUrl = pathToFileURL(require.resolve('react')).href
export const renderUrl = pathToFileURL(require.resolve('react-dom/server')).href
export function moduleLoader({ development = false, overrides = {} } = {}) {
  const modules = new Map()
  async function url(path) {
    if (modules.has(path)) return modules.get(path)
    if (overrides[path]) return dataModule(overrides[path])
    if (path.endsWith('.css')) return dataModule('export default new Proxy({}, {get:(_,k)=>String(k)})')
    let code = ts.transpileModule(await readFile(resolve(root, path), 'utf8'), { fileName: path, compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.ReactJSX } }).outputText
      .replaceAll('import.meta.env', `({DEV:${development},VITE_API_BASE_URL:"https://control-plane.example.invalid/api"})`)
    for (const m of [...code.matchAll(/from\s+(['"])([^'"]+)\1/g)]) {
      let target
      if (m[2].startsWith('.')) {
        const base = resolve(root, dirname(path), m[2])
        const absolute = base.endsWith('.css') ? base : existsSync(base + '.ts') ? base + '.ts' : base + '.tsx'
        const relative = absolute.slice(root.length + 1).replaceAll('\\', '/')
        target = await url(relative)
      } else target = pathToFileURL(require.resolve(m[2])).href
      code = code.replace(m[0], `from ${JSON.stringify(target)}`)
    }
    const result = dataModule(code); modules.set(path, result); return result
  }
  return async path => import(await url(path))
}
