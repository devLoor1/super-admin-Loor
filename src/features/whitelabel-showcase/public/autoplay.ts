/* Ported from FRONT-WEB/src/views/mock/whitelabels/autoplay.ts (approved showcase, branch mock @8a927d5 + local refinements). Logic unchanged. */
export const CARD_INTERVAL_MS = 5000

export interface PlaybackConditions {
  userPaused: boolean
  pageVisible: boolean
  inViewport: boolean
  hovered: boolean
  focused: boolean
  ready: boolean
}

export interface PlaybackSnapshot extends PlaybackConditions {
  running: boolean
}

interface Options {
  initial: PlaybackConditions
  advance: () => void
  notify: (snapshot: PlaybackSnapshot) => void
  schedule: (callback: () => void, delay: number) => number
  cancel: (timer: number) => void
}

/** One cancellable interval per card; suspended time is never caught up. */
export function createCardPlayback({ initial, advance, notify, schedule, cancel }: Options) {
  let conditions = { ...initial }
  let timer: number | null = null
  let disposed = false
  const canRun = () => !disposed && !conditions.userPaused && conditions.pageVisible
    && conditions.inViewport && !conditions.hovered && !conditions.focused && conditions.ready
  const snapshot = (): PlaybackSnapshot => ({ ...conditions, running: canRun() })
  const clear = () => {
    if (timer !== null) cancel(timer)
    timer = null
  }
  const arm = () => {
    clear()
    if (!canRun()) return
    timer = schedule(() => {
      timer = null
      if (!canRun()) return
      advance()
      arm()
    }, CARD_INTERVAL_MS)
  }
  const update = (patch: Partial<PlaybackConditions>) => {
    if (disposed || Object.entries(patch).every(([key, value]) => conditions[key as keyof PlaybackConditions] === value)) return
    conditions = { ...conditions, ...patch }
    arm()
    notify(snapshot())
  }
  arm()
  notify(snapshot())
  return {
    update,
    snapshot,
    restart: arm,
    dispose: () => { disposed = true; clear(); },
  }
}
