import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'

/*
 * URL-backed search box (routing utility — no business state).
 *
 * The typed text (draft) is debounced into the URL through `commit`; the URL
 * wins when it changes from outside (Back / Forward, links, "Limpar"). Any
 * other URL change made by the page (scope, page, filters) must carry
 * `pendingSearch()` instead of the URL value: otherwise a just-typed edit that
 * the debounce has not committed yet (e.g. a cleared box) would be replaced by
 * the stale URL search for one request.
 */
export function useUrlSearchDraft({
  urlSearch,
  urlKey = urlSearch,
  maxLength,
  delayMs = 400,
  commit,
}: {
  /** Normalized search currently in the URL. */
  urlSearch: string
  /** Whole URL context: scope-only Back / Forward must also restore the draft. */
  urlKey?: string
  maxLength: number
  delayMs?: number
  /** Writes the normalized search into the URL (the page decides replace / push and the other params). */
  commit: (search: string) => void
}) {
  const [draft, setDraft] = useState(urlSearch)
  // The search value this hook itself wrote: its URL echo must not overwrite newer typing.
  const ownSearch = useRef<string | null>(null)
  const commitRef = useRef(commit)
  useLayoutEffect(() => {
    commitRef.current = commit
  })

  useEffect(() => {
    if (ownSearch.current !== urlSearch) setDraft(urlSearch)
    ownSearch.current = null
  }, [urlSearch, urlKey])

  const normalized = draft.trim().slice(0, maxLength)
  useEffect(() => {
    if (normalized === urlSearch) return
    const timer = window.setTimeout(() => {
      ownSearch.current = normalized
      commitRef.current(normalized)
    }, delayMs)
    return () => window.clearTimeout(timer)
  }, [normalized, urlSearch, delayMs])

  /** Search to keep in a URL change made now: the pending draft wins over the stale URL value. */
  const pendingSearch = useCallback(() => {
    ownSearch.current = normalized
    return normalized
  }, [normalized])

  /** Empties the box; the caller writes the URL without a search. */
  const clear = useCallback(() => {
    ownSearch.current = ''
    setDraft('')
  }, [])

  return { draft, setDraft, pendingSearch, clear }
}
