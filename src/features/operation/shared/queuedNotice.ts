/*
 * A notice raised right before a route change (e.g. "criada como Rascunho")
 * would be lost with the previous page's shell. It is queued here and shown
 * by the next Operation page once it mounts. In-memory only.
 */
let queued: string | null = null

export function queueNotice(message: string) {
  queued = message
}

export function takeQueuedNotice() {
  const message = queued
  queued = null
  return message
}
