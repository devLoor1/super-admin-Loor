/**
 * Limited, safe Markdown for the introductory section (V1 allowlist):
 * paragraphs (single line breaks preserved), **bold**, *italic* / _italic_,
 * simple lists (`- item`, `* item`, `1. item`) and [text](http(s)://link).
 *
 * The parser produces plain data. Rendering builds React elements from this
 * data only, so raw HTML is never interpreted: it is reported as an issue and
 * shown as literal text. The same parser feeds the editor preview and the
 * simulated public page.
 */

export type MdInline =
  | { type: 'text'; text: string }
  | { type: 'strong'; children: MdInline[] }
  | { type: 'em'; children: MdInline[] }
  | { type: 'link'; href: string; children: MdInline[] }
  | { type: 'break' }

export type MdBlock =
  | { type: 'paragraph'; children: MdInline[] }
  | { type: 'list'; ordered: boolean; items: MdInline[][] }

export type MdIssue = { line: number; message: string }

const LIST_ITEM = /^( *)([-*]|\d{1,3}[.)])\s+(.*)$/

/** Accepts only absolute HTTP(S) URLs without spaces or credentials. */
export function safeHttpUrl(raw: string): string | null {
  const value = raw.trim()
  if (!/^https?:\/\/\S+$/i.test(value)) return null
  try {
    const url = new URL(value)
    if ((url.protocol !== 'http:' && url.protocol !== 'https:') || url.username || url.password || !url.hostname) return null
    return url.href
  } catch {
    return null
  }
}

function lineIssues(line: string, number: number): MdIssue[] {
  const issues: MdIssue[] = []
  if (/<\/?[a-z!][^>]*>|<!--/i.test(line)) issues.push({ line: number, message: 'HTML não é permitido; o trecho será exibido como texto.' })
  if (/!\[[^\]]*\]\([^)]*\)/.test(line)) issues.push({ line: number, message: 'Imagens incorporadas não são permitidas.' })
  if (/^ {0,3}#{1,6}(\s|$)/.test(line)) issues.push({ line: number, message: 'Títulos internos não são permitidos; use os campos Título e Subtítulo.' })
  if (/^\s*\|.*\|\s*$/.test(line)) issues.push({ line: number, message: 'Tabelas não são permitidas.' })
  if (/^\s*(```|~~~)/.test(line)) issues.push({ line: number, message: 'Blocos de código não são permitidos.' })
  if (/^ {0,3}>/.test(line)) issues.push({ line: number, message: 'Citações não são suportadas nesta versão.' })
  const list = LIST_ITEM.exec(line)
  if (list && list[1].length >= 2) issues.push({ line: number, message: 'Listas aninhadas não são suportadas; use uma lista simples.' })
  return issues
}

function findClosing(text: string, marker: string, from: number) {
  let index = text.indexOf(marker, from)
  while (index !== -1 && marker === '*' && text[index + 1] === '*') index = text.indexOf(marker, index + 2)
  return index
}

function pushText(nodes: MdInline[], text: string) {
  if (!text) return
  const last = nodes.at(-1)
  if (last?.type === 'text') last.text += text
  else nodes.push({ type: 'text', text })
}

export function parseInline(text: string, line: number, issues: MdIssue[]): MdInline[] {
  const nodes: MdInline[] = []
  let index = 0
  while (index < text.length) {
    const char = text[index]
    if (char === '!' && text[index + 1] === '[') {
      // Image syntax is reported per line and kept entirely as literal text (never a link).
      const close = text.indexOf('](', index + 2)
      const end = close === -1 ? -1 : text.indexOf(')', close + 2)
      const stop = end === -1 ? index + 2 : end + 1
      pushText(nodes, text.slice(index, stop))
      index = stop
      continue
    }
    if (char === '[') {
      const close = text.indexOf('](', index + 1)
      const end = close === -1 ? -1 : text.indexOf(')', close + 2)
      if (close !== -1 && end !== -1) {
        const label = text.slice(index + 1, close)
        const href = safeHttpUrl(text.slice(close + 2, end))
        if (href && label.trim()) {
          nodes.push({ type: 'link', href, children: parseInline(label, line, issues) })
        } else {
          issues.push({ line, message: label.trim() ? 'Link inválido: use um endereço http:// ou https:// completo.' : 'Link sem texto explícito.' })
          pushText(nodes, text.slice(index, end + 1))
        }
        index = end + 1
        continue
      }
    }
    if (char === '*' && text[index + 1] === '*') {
      const close = text.indexOf('**', index + 2)
      if (close > index + 2) {
        nodes.push({ type: 'strong', children: parseInline(text.slice(index + 2, close), line, issues) })
        index = close + 2
        continue
      }
    }
    if ((char === '*' || char === '_') && text[index + 1] !== char && text[index + 1] !== ' ' && (char === '*' || index === 0 || /\s|\p{P}/u.test(text[index - 1]))) {
      const close = findClosing(text, char, index + 1)
      if (close > index + 1 && text[close - 1] !== ' ') {
        nodes.push({ type: 'em', children: parseInline(text.slice(index + 1, close), line, issues) })
        index = close + 1
        continue
      }
    }
    pushText(nodes, char)
    index += 1
  }
  return nodes
}

export function parseShowcaseMarkdown(source: string): { blocks: MdBlock[]; issues: MdIssue[] } {
  const lines = source.replace(/\r\n?/g, '\n').split('\n')
  const blocks: MdBlock[] = []
  const issues: MdIssue[] = []
  let paragraph: MdInline[] | null = null
  let list: Extract<MdBlock, { type: 'list' }> | null = null
  lines.forEach((raw, position) => {
    const number = position + 1
    issues.push(...lineIssues(raw, number))
    if (!raw.trim()) {
      paragraph = null
      list = null
      return
    }
    const item = LIST_ITEM.exec(raw)
    if (item) {
      const ordered = /\d/.test(item[2])
      paragraph = null
      if (!list || list.ordered !== ordered) {
        list = { type: 'list', ordered, items: [] }
        blocks.push(list)
      }
      list.items.push(parseInline(item[3].trim(), number, issues))
      return
    }
    list = null
    const content = parseInline(raw.trim(), number, issues)
    if (paragraph) {
      paragraph.push({ type: 'break' }, ...content)
    } else {
      paragraph = content
      blocks.push({ type: 'paragraph', children: paragraph })
    }
  })
  return { blocks, issues }
}

/** Plain text of the rendered content (accessibility labels, checks). */
export function markdownPlainText(blocks: MdBlock[]): string {
  const inline = (nodes: MdInline[]): string => nodes.map(node => node.type === 'text' ? node.text : node.type === 'break' ? '\n' : inline(node.children)).join('')
  return blocks.map(block => block.type === 'paragraph' ? inline(block.children) : block.items.map(inline).join('\n')).join('\n\n')
}
