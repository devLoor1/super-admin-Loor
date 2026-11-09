import { Fragment, type ReactNode } from 'react'
import { parseShowcaseMarkdown, type MdInline } from '../showcaseMarkdown'

/**
 * Renders the limited Markdown subset as React elements built from parsed data.
 * No HTML string is ever interpreted (no innerHTML); unsupported syntax stays
 * literal text. Shared by the editor preview and the simulated public page.
 */
function inline(nodes: MdInline[], key = ''): ReactNode[] {
  return nodes.map((node, index) => {
    const id = `${key}${index}`
    if (node.type === 'text') return <Fragment key={id}>{node.text}</Fragment>
    if (node.type === 'break') return <br key={id} />
    if (node.type === 'strong') return <strong key={id}>{inline(node.children, `${id}-`)}</strong>
    if (node.type === 'em') return <em key={id}>{inline(node.children, `${id}-`)}</em>
    return <a key={id} href={node.href} target="_blank" rel="noopener noreferrer nofollow">{inline(node.children, `${id}-`)}</a>
  })
}

export function MarkdownContent({ source, className }: { source: string; className?: string }) {
  const { blocks } = parseShowcaseMarkdown(source)
  return (
    <div className={className}>
      {blocks.map((block, index) => block.type === 'paragraph'
        ? <p key={index}>{inline(block.children)}</p>
        : block.ordered
          ? <ol key={index}>{block.items.map((item, position) => <li key={position}>{inline(item)}</li>)}</ol>
          : <ul key={index}>{block.items.map((item, position) => <li key={position}>{inline(item)}</li>)}</ul>)}
    </div>
  )
}
