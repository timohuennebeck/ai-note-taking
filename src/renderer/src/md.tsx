import type { ReactNode } from 'react'

/**
 * Minimal inline-markdown renderer for agent text: **bold**, *italic*, `code`.
 * Block structure stays plain — documents get their own block parser.
 */
export function renderInline(text: string): ReactNode {
  const parts: ReactNode[] = []
  const re = /(\*\*([^*]+)\*\*|\*([^*\n]+)\*|`([^`\n]+)`)/g
  let last = 0
  let m: RegExpExecArray | null
  let key = 0
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index))
    if (m[2] !== undefined) {
      parts.push(
        <strong key={key++} style={{ fontWeight: 600, color: 'var(--ink)' }}>
          {m[2]}
        </strong>
      )
    } else if (m[3] !== undefined) {
      parts.push(<em key={key++}>{m[3]}</em>)
    } else if (m[4] !== undefined) {
      parts.push(
        <code
          key={key++}
          style={{
            fontFamily: 'ui-monospace, Menlo, monospace',
            fontSize: '0.92em',
            background: 'var(--groupbg)',
            borderRadius: 4,
            padding: '1px 4px'
          }}
        >
          {m[4]}
        </code>
      )
    }
    last = m.index + m[0].length
  }
  if (last < text.length) parts.push(text.slice(last))
  return parts.length === 1 ? parts[0] : parts
}
