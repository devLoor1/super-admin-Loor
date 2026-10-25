import assert from 'node:assert/strict'
import { readFile } from './reviewed-consolidation-boundary.mjs'
import ts from 'typescript'

// Deterministic lifecycle/timer checks of the actual hook. Browser QA separately
// exercises real React and routing; this harness is not a concurrency simulation.
const source = await readFile(new URL('../src/app/useUrlSearchDraft.ts', import.meta.url), 'utf8')
const code = ts.transpileModule(source, { compilerOptions: {
  target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS,
} }).outputText
let checks = 0
function check(name, run) {
  try { run(); checks += 1 } catch (cause) { throw new Error(`Failed: ${name}`, { cause }) }
}

function harness(initial = {}) {
  let route = { scope: 'all', page: 1, search: '', ...initial }
  let index = 0, dirty = true, now = 0, serial = 0, output
  const slots = [], effects = [], layout = [], timers = new Map(), requests = []
  const dependenciesChanged = (a, b) => !a || !b || a.length !== b.length || a.some((x, i) => !Object.is(x, b[i]))
  const effect = (queue, fn, deps) => {
    const i = index++, previous = slots[i]
    if (dependenciesChanged(previous?.deps, deps)) {
      slots[i] = { deps, cleanup: previous?.cleanup }
      queue.push(() => { slots[i].cleanup?.(); slots[i].cleanup = fn() })
    }
  }
  const react = {
    useState(value) {
      const i = index++
      if (!(i in slots)) slots[i] = typeof value === 'function' ? value() : value
      return [slots[i], next => {
        const value = typeof next === 'function' ? next(slots[i]) : next
        if (!Object.is(value, slots[i])) { slots[i] = value; dirty = true }
      }]
    },
    useRef(value) { const i = index++; return slots[i] ??= { current: value } },
    useEffect(fn, deps) { effect(effects, fn, deps) },
    useLayoutEffect(fn, deps) { effect(layout, fn, deps) },
    useCallback(fn) { index += 1; return fn },
  }
  const clock = {
    setTimeout(fn, delay) { const id = ++serial; timers.set(id, { at: now + delay, fn }); return id },
    clearTimeout(id) { timers.delete(id) },
  }
  const exports = {}
  new Function('require', 'exports', 'window', code)(name => {
    assert.equal(name, 'react'); return react
  }, exports, clock)
  function replace(next) {
    if (JSON.stringify(next) === JSON.stringify(route)) return
    route = next; requests.push({ ...route }); dirty = true
  }
  function flush() {
    let turns = 0
    while (dirty) {
      assert.ok(++turns < 20, 'No render/navigation loop')
      dirty = false; index = 0
      output = exports.useUrlSearchDraft({ urlSearch: route.search, urlKey: JSON.stringify(route), maxLength: 120,
        commit: search => replace({ ...route, page: 1, search }) })
      while (layout.length) layout.shift()()
      while (effects.length) effects.shift()()
    }
  }
  flush()
  return {
    requests,
    route: () => ({ ...route }),
    draft: () => output.draft,
    type(value) { output.setDraft(value); flush() },
    navigate(next) { replace({ ...route, page: 1, search: output.pendingSearch(), ...next }); flush() },
    external(next) { replace({ ...route, ...next }); flush() },
    clear() { output.clear(); replace({ scope: 'all', page: 1, search: '' }); flush() },
    advance(ms) {
      const until = now + ms
      for (;;) {
        const due = [...timers.entries()].filter(([, t]) => t.at <= until).sort((a, b) => a[1].at - b[1].at)[0]
        if (!due) break
        now = due[1].at; timers.delete(due[0]); due[1].fn(); flush()
      }
      now = until
    },
    unmount() { for (const slot of slots) slot?.cleanup?.() },
  }
}

for (const domain of ['Investor', 'Entrepreneur']) {
  check(`${domain} A: clear then immediate scope does not send stale search`, () => {
    const h = harness({ search: 'old', page: 3 })
    h.type(''); h.navigate({ scope: '4' }); h.advance(800)
    assert.deepEqual(h.requests, [{ scope: '4', page: 1, search: '' }])
    assert.equal(h.draft(), '')
  })
  check(`${domain} B: pending new search is carried once into scope`, () => {
    const h = harness({ page: 3 })
    h.type('new'); h.navigate({ scope: '6' }); h.advance(800)
    assert.deepEqual(h.requests, [{ scope: '6', page: 1, search: 'new' }])
  })
  check(`${domain} C: external search history cancels a pending draft`, () => {
    const h = harness({ search: 'first', scope: '4' })
    h.type('not committed'); h.external({ search: 'second', scope: '6' }); h.external({ search: 'first', scope: '4' })
    h.advance(800)
    assert.equal(h.draft(), 'first'); assert.equal(h.route().search, 'first')
    assert.equal(h.requests.length, 2)
  })
  check(`${domain} D: debounce and scope both reset pages`, () => {
    const h = harness({ page: 3 })
    h.type('new'); h.advance(400)
    assert.equal(h.route().page, 1)
    h.navigate({ page: 2 }); h.navigate({ scope: '4' })
    assert.equal(h.route().page, 1)
  })
  check(`${domain} C: scope-only history restores URL over an uncommitted draft`, () => {
    const h = harness({ search: 'same', scope: '4' })
    h.type('not committed'); h.external({ scope: '6' }); h.external({ scope: '4' }); h.advance(800)
    assert.equal(h.draft(), 'same'); assert.equal(h.route().search, 'same')
    assert.equal(h.requests.length, 2)
  })
}
check('Typing waits for the budget and commits only the latest draft', () => {
  const h = harness(); h.type('a'); h.advance(200); h.type('abc'); h.advance(399)
  assert.equal(h.requests.length, 0); h.advance(1)
  assert.deepEqual(h.requests, [{ scope: 'all', page: 1, search: 'abc' }])
  h.advance(1000); assert.equal(h.requests.length, 1)
})
check('Own URL echo does not erase newer typing', () => {
  const h = harness(); h.type('one'); h.advance(400); h.type('two'); h.advance(400)
  assert.equal(h.draft(), 'two'); assert.equal(h.route().search, 'two')
})
check('Normalization bounds whitespace and long search without a loop', () => {
  const h = harness(); h.type('  ' + 'x'.repeat(150) + '  '); h.advance(400)
  assert.equal(h.route().search.length, 120); h.advance(1000); assert.equal(h.requests.length, 1)
})
check('Clear and unmount cancel pending commits', () => {
  const h = harness({ search: 'old' }); h.type('pending'); h.clear(); h.advance(1000)
  assert.equal(h.route().search, ''); assert.equal(h.requests.length, 1)
  h.type('abandoned'); h.unmount(); h.advance(1000); assert.equal(h.requests.length, 1)
})
console.log(`URL search draft lifecycle: ${checks} passed (deterministic, no network)`)
