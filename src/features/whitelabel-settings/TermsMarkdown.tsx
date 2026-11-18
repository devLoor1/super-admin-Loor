import { createElement, type ReactNode } from 'react'
import styles from './TermsMarkdown.module.css'

// Only explicit HTTP(S) links become anchors. Everything else remains React text,
// including raw HTML in older revisions. The original source is never rewritten.
function inline(text: string): ReactNode[] {
  const nodes: ReactNode[] = []
  const tokens = /\[([^[\]\n]+)\]\((https?:\/\/[^\s()<>]+)\)|\*\*([^*\n]+)\*\*|\*([^*\n]+)\*/gi
  let offset = 0
  for (const match of text.matchAll(tokens)) {
    nodes.push(text.slice(offset, match.index))
    if (match[1]) {
      try {
        const link = new URL(match[2])
        nodes.push(link.hostname && !link.username && !link.password
          ? <a key={match.index} href={link.href} target="_blank" rel="noopener noreferrer">{match[1]}</a>
          : match[0])
      } catch {
        nodes.push(match[0])
      }
    } else if (match[3]) {
      nodes.push(<strong key={match.index}>{match[3]}</strong>)
    } else {
      nodes.push(<em key={match.index}>{match[4]}</em>)
    }
    offset = match.index! + match[0].length
  }
  nodes.push(text.slice(offset))
  return nodes
}

export function TermsMarkdown({ source }: { source: string }) {
  const blocks: ReactNode[] = []
  let kind: 'p' | 'ul' | 'ol' = 'p'
  let lines: string[] = []
  let firstNumber = 1
  function flush() {
    if (!lines.length) return
    const children = kind === 'p'
      ? inline(lines.join('\n'))
      : lines.map((line, index) => <li key={index}>{inline(line)}</li>)
    blocks.push(createElement(kind, { key: blocks.length, ...(kind === 'ol' ? { start: firstNumber } : {}) }, children))
    lines = []
  }
  for (const line of source.split(/\r\n|\n|\r/)) {
    const heading = /^(#{1,6})[ \t]+(.+)$/.exec(line)
    if (!line.trim() || heading) {
      flush()
      if (heading) blocks.push(createElement('h' + heading[1].length, { key: blocks.length }, inline(heading[2])))
      continue
    }
    const item = /^ {0,3}(?:[-*+]|(\d{1,9})[.)])[ \t]+(.*)$/.exec(line)
    const nextKind = item ? item[1] ? 'ol' : 'ul' : 'p'
    if (nextKind !== kind) flush()
    kind = nextKind
    if (kind === 'ol' && !lines.length) firstNumber = Number(item![1])
    lines.push(item ? item[2] : line)
  }
  flush()
  return <div className={styles.preview}>{blocks}</div>
}
