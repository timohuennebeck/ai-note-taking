import type { ReactElement, ReactNode } from 'react'
import { DocGlyph, Icon } from '../icons'
import { chipCore } from '../ui'
import { useStore } from '../state'

/**
 * Renders an agent message: markdown bullets become real list rows, and any
 * theme or document the app knows is shown as the same chip the feed uses.
 */

interface Ref {
  kind: 'theme' | 'doc'
  name: string
  id: number
}

function ThemeChip({ name, onClick }: { name: string; onClick: () => void }): ReactElement {
  return (
    <span
      className="litter-chip litter-chip-click"
      onClick={onClick}
      style={{ ...chipCore, cursor: 'pointer', display: 'inline-flex', verticalAlign: '-5px' }}
    >
      <Icon name="folder-open" size={11} />
      {name}
    </span>
  )
}

function DocChip({ name, onClick }: { name: string; onClick: () => void }): ReactElement {
  return (
    <span
      className="litter-chip litter-chip-click"
      onClick={onClick}
      style={{ ...chipCore, cursor: 'pointer', display: 'inline-flex', verticalAlign: '-5px' }}
    >
      <DocGlyph />
      {name}
    </span>
  )
}

const escapeRe = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** Inline pass: **bold**, `code`, and chips for known theme/document names. */
function inline(text: string, refs: Ref[], go: (r: Ref) => void, keyBase: string): ReactNode {
  const names = refs
    .map((r) => r.name)
    .filter((n) => n.length >= 3)
    .sort((a, b) => b.length - a.length)
  const chipRe = names.length ? `(?<chip>${names.map(escapeRe).join('|')})` : ''
  const re = new RegExp(
    ['\\*\\*(?<bold>[^*]+)\\*\\*', '`(?<code>[^`\\n]+)`', chipRe].filter(Boolean).join('|'),
    'g'
  )

  const out: ReactNode[] = []
  let last = 0
  let m: RegExpExecArray | null
  let i = 0
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) out.push(text.slice(last, m.index))
    const g = m.groups ?? {}
    if (g.bold !== undefined) {
      out.push(
        <strong key={`${keyBase}-b${i++}`} style={{ fontWeight: 600, color: 'var(--ink)' }}>
          {g.bold}
        </strong>
      )
    } else if (g.code !== undefined) {
      out.push(
        <code
          key={`${keyBase}-c${i++}`}
          style={{
            fontFamily: 'ui-monospace, Menlo, monospace',
            fontSize: '0.92em',
            background: 'var(--groupbg)',
            borderRadius: 4,
            padding: '1px 4px'
          }}
        >
          {g.code}
        </code>
      )
    } else if (g.chip !== undefined) {
      const ref = refs.find((r) => r.name === g.chip)!
      out.push(
        ref.kind === 'theme' ? (
          <ThemeChip key={`${keyBase}-t${i++}`} name={ref.name} onClick={() => go(ref)} />
        ) : (
          <DocChip key={`${keyBase}-d${i++}`} name={ref.name} onClick={() => go(ref)} />
        )
      )
    }
    last = m.index + m[0].length
  }
  if (last < text.length) out.push(text.slice(last))
  return out
}

export function AgentText({ text }: { text: string }): ReactElement {
  const { themes, docs, go } = useStore()

  const refs: Ref[] = [
    ...themes.map((t) => ({ kind: 'theme' as const, name: t.name, id: t.id })),
    ...docs.map((d) => ({ kind: 'doc' as const, name: d.title, id: d.id }))
  ]
  const open = (r: Ref): void => {
    if (r.kind === 'theme') go({ view: 'filter', themeId: r.id, themeName: r.name })
    else go({ view: 'note', noteId: r.id })
  }

  const lines = text.split('\n')
  const blocks: ReactNode[] = []
  let bullets: string[] = []
  const flush = (): void => {
    if (!bullets.length) return
    const items = bullets
    bullets = []
    blocks.push(
      <div
        key={`ul-${blocks.length}`}
        style={{ display: 'flex', flexDirection: 'column', gap: 6, margin: '4px 0 2px' }}
      >
        {items.map((b, i) => (
          <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'baseline' }}>
            <span style={{ color: 'var(--ghost)', flex: 'none' }}>·</span>
            <span style={{ flex: 1, minWidth: 0 }}>{inline(b, refs, open, `li-${blocks.length}-${i}`)}</span>
          </div>
        ))}
      </div>
    )
  }

  lines.forEach((raw, idx) => {
    const line = raw.trim()
    const bullet = /^[-*•]\s+(.*)$/.exec(line)
    if (bullet) {
      bullets.push(bullet[1])
      return
    }
    flush()
    if (!line) return
    blocks.push(
      <div key={`p-${idx}`} style={{ margin: blocks.length ? '6px 0 0' : 0 }}>
        {inline(line, refs, open, `p-${idx}`)}
      </div>
    )
  })
  flush()

  return <div style={{ fontSize: 13.5, lineHeight: 1.6, color: 'var(--text2)', userSelect: 'text' }}>{blocks}</div>
}
