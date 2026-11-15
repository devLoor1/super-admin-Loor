/** Ephemeral HTTP revalidation of official logos; never part of a showcase document.
 * These browser resource budgets are defensive implementation limits, not upload
 * limits or a new Backend contract. Custom assets do not use this service. */
export const OFFICIAL_LOGO_REFRESH_MS = 60_000
export const OFFICIAL_LOGO_TIMEOUT_MS = 10_000
export const OFFICIAL_LOGO_MAX_BYTES = 5 * 1024 * 1024

export type OfficialLogoSnapshot = Readonly<{
  sourceUrl: string
  renderUrl: string
  status: 'idle' | 'refreshing' | 'ready' | 'unverified'
  digest: string | null
  checkedAt: number | null
}>
type Timer = ReturnType<typeof setTimeout>
type Dependencies = {
  fetch: typeof fetch
  now: () => number
  setTimer: (callback: () => void, delay: number) => Timer
  clearTimer: (timer: Timer) => void
  createObjectURL: (blob: Blob) => string
  revokeObjectURL: (url: string) => void
  digest: (blob: Blob) => Promise<string>
  decode: (url: string, signal: AbortSignal) => Promise<void>
}

function decodeImage(url: string, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    const cleanup = () => { image.onload = null; image.onerror = null; signal.removeEventListener('abort', abort) }
    const abort = () => { cleanup(); image.src = ''; reject(new DOMException('Cancelled', 'AbortError')) }
    image.onload = () => { cleanup(); resolve() }
    image.onerror = () => { cleanup(); reject(new Error('Image could not be decoded')) }
    signal.addEventListener('abort', abort, { once: true })
    if (signal.aborted) { abort(); return }
    image.src = url
  })
}

function safeSource(input: string): string {
  const url = new URL(input)
  if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) throw new Error('Invalid official logo URL')
  return url.href
}

async function boundedImage(response: Response, signal: AbortSignal): Promise<Blob> {
  if (!response.ok || response.type === 'opaque') throw new Error('Logo is not readable')
  const mime = response.headers.get('content-type')?.split(';')[0].trim().toLowerCase() ?? ''
  if (!mime.startsWith('image/')) throw new Error('Logo response is not an image')
  const length = Number(response.headers.get('content-length'))
  if (length > OFFICIAL_LOGO_MAX_BYTES) throw new Error('Logo exceeds browser resource budget')
  const reader = response.body?.getReader()
  if (!reader) throw new Error('Logo response has no body')
  const chunks: ArrayBuffer[] = []
  let bytes = 0
  try {
    while (true) {
      if (signal.aborted) throw new DOMException('Cancelled', 'AbortError')
      const part = await reader.read()
      if (part.done) break
      bytes += part.value.byteLength
      if (bytes > OFFICIAL_LOGO_MAX_BYTES) throw new Error('Logo exceeds browser resource budget')
      chunks.push(new Uint8Array(part.value).buffer)
    }
    if (!bytes) throw new Error('Logo response is empty')
    return new Blob(chunks, { type: mime })
  } catch (error) {
    await reader.cancel().catch(() => undefined)
    throw error
  } finally {
    reader.releaseLock()
  }
}

export type OfficialLogoHandle = {
  getSnapshot: () => OfficialLogoSnapshot
  subscribe: (listener: () => void) => () => void
  setActive: (active: boolean) => void
  release: () => void
}

/** One entry/request per distinct source URL across all cards and previews.
 * Owners explicitly activate their handle only while the image/document is visible.
 * A failed CORS/revalidation attempt retains the original or last decoded image;
 * 'unverified' deliberately does not claim that cached bytes are current. */
export function createOfficialLogoRegistry(overrides: Partial<Dependencies> = {}) {
  const deps: Dependencies = {
    fetch: (...args) => fetch(...args), now: () => Date.now(),
    setTimer: (callback, delay) => setTimeout(callback, delay), clearTimer: timer => clearTimeout(timer),
    createObjectURL: blob => URL.createObjectURL(blob), revokeObjectURL: url => URL.revokeObjectURL(url),
    digest: async blob => [...new Uint8Array(await crypto.subtle.digest('SHA-256', await blob.arrayBuffer()))].map(byte => byte.toString(16).padStart(2, '0')).join(''),
    decode: decodeImage,
    ...overrides,
  }
  type Owner = { active: boolean; listeners: Set<() => void> }
  type Entry = {
    url: string; snapshot: OfficialLogoSnapshot; owners: Set<Owner>; nextAt: number
    objectUrl: string | null; request: AbortController | null; pending: Promise<void> | null
  }
  const entries = new Map<string, Entry>()
  let timer: Timer | null = null
  let disposed = false
  const isActive = (entry: Entry) => [...entry.owners].some(owner => owner.active)
  const notify = (entry: Entry, changes: Partial<OfficialLogoSnapshot>) => {
    entry.snapshot = { ...entry.snapshot, ...changes }
    for (const owner of entry.owners) for (const listener of owner.listeners) listener()
  }
  const isCurrent = (entry: Entry, request: AbortController) => !disposed && entries.get(entry.url) === entry && entry.request === request && !request.signal.aborted && isActive(entry)
  const schedule = () => {
    if (timer !== null) deps.clearTimer(timer)
    timer = null
    if (disposed) return
    const due = [...entries.values()].filter(entry => isActive(entry) && !entry.pending).map(entry => entry.nextAt)
    if (due.length) timer = deps.setTimer(() => { timer = null; void refreshDue() }, Math.max(0, Math.min(...due) - deps.now()))
  }
  const refresh = (entry: Entry): Promise<void> => {
    if (entry.pending) return entry.pending
    if (disposed || !isActive(entry) || deps.now() < entry.nextAt) return Promise.resolve()
    entry.nextAt = deps.now() + OFFICIAL_LOGO_REFRESH_MS
    const request = new AbortController()
    entry.request = request
    const deadline = deps.setTimer(() => request.abort(), OFFICIAL_LOGO_TIMEOUT_MS)
    notify(entry, { status: 'refreshing' })
    const operation = async () => {
      let candidate: string | null = null
      try {
        const response = await deps.fetch(entry.url, { method: 'GET', cache: 'no-cache', credentials: 'omit', referrerPolicy: 'no-referrer', signal: request.signal })
        const blob = await boundedImage(response, request.signal)
        const digest = await deps.digest(blob)
        if (!isCurrent(entry, request)) return
        if (digest !== entry.snapshot.digest) {
          candidate = deps.createObjectURL(blob)
          // Preserve an SVG view/symbol fragment while the underlying objectURL
          // remains separately tracked for revocation. Query stays on the GET.
          const fragment = new URL(entry.url).hash
          await deps.decode(candidate + fragment, request.signal)
          if (!isCurrent(entry, request)) return
          const previous = entry.objectUrl
          entry.objectUrl = candidate
          candidate = null
          notify(entry, { renderUrl: entry.objectUrl + fragment, digest, status: 'ready', checkedAt: deps.now() })
          if (previous) deps.revokeObjectURL(previous)
        } else notify(entry, { status: 'ready', checkedAt: deps.now() })
      } catch {
        if (entries.get(entry.url) === entry && !disposed && entry.request === request) notify(entry, { status: 'unverified' })
      } finally {
        if (candidate) deps.revokeObjectURL(candidate)
        deps.clearTimer(deadline)
        if (entries.get(entry.url) === entry && !disposed && entry.request === request && entry.snapshot.status === 'refreshing') notify(entry, { status: 'unverified' })
        if (entry.request === request) entry.request = null
        entry.pending = null
        schedule()
      }
    }
    // Defer execution so even synchronous test dependencies see pending installed.
    entry.pending = Promise.resolve().then(operation)
    return entry.pending
  }
  const refreshDue = async () => {
    await Promise.all([...entries.values()].filter(isActive).map(refresh))
    schedule()
  }
  const retain = (input: string): OfficialLogoHandle => {
    if (disposed) throw new Error('Official logo registry is disposed')
    const url = safeSource(input)
    let entry = entries.get(url)
    if (!entry) {
      entry = { url, snapshot: { sourceUrl: url, renderUrl: url, status: 'idle', digest: null, checkedAt: null }, owners: new Set(), nextAt: 0, objectUrl: null, request: null, pending: null }
      entries.set(url, entry)
    }
    const retained = entry
    const owner: Owner = { active: false, listeners: new Set() }
    retained.owners.add(owner)
    let released = false
    return {
      getSnapshot: () => retained.snapshot,
      subscribe: listener => { if (!released) owner.listeners.add(listener); return () => { owner.listeners.delete(listener) } },
      setActive: active => {
        if (released || owner.active === active) return
        owner.active = active
        if (!isActive(retained)) retained.request?.abort()
        if (active) void refreshDue()
        else schedule()
      },
      release: () => {
        if (released) return
        released = true
        owner.listeners.clear()
        retained.owners.delete(owner)
        if (!isActive(retained)) retained.request?.abort()
        if (!retained.owners.size) {
          entries.delete(url)
          if (retained.objectUrl) { deps.revokeObjectURL(retained.objectUrl); retained.objectUrl = null }
        }
        schedule()
      },
    }
  }
  return {
    retain, refreshDue,
    dispose: () => {
      disposed = true
      if (timer !== null) deps.clearTimer(timer)
      timer = null
      for (const entry of entries.values()) {
        entry.request?.abort()
        if (entry.objectUrl) { deps.revokeObjectURL(entry.objectUrl); entry.objectUrl = null }
        entry.owners.clear()
      }
      entries.clear()
    },
  }
}
