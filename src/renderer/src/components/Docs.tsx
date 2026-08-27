import { type ReactElement } from 'react'
import { DocGlyph } from '../icons'
import { useStore } from '../state'
import { previewLines, timeLabel, dayLabel } from '@shared/blocks'
import type { Doc } from '@shared/types'

export function Docs({ docsView, themeId }: { docsView: 'grid' | 'list'; themeId?: number }): ReactElement {
  const { docs, go } = useStore()
  const shown: Doc[] = themeId == null ? docs : docs.filter((d) => d.themeId === themeId)

  if (docsView === 'list') {
    return (
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', paddingTop: 4, gap: 1 }}>
        {shown.map((d) => (
          <div
            key={d.id}
            className="hover-bg"
            onClick={() => go({ view: 'note', noteId: d.id })}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              height: 52,
              padding: '0 12px',
              margin: '0 10px',
              borderRadius: 9,
              cursor: 'pointer',
              flex: 'none'
            }}
          >
            <DocGlyph width={14} height={16} style={{ color: 'var(--muted)' }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13.5, fontWeight: 500, lineHeight: 1.45, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {d.title}
              </div>
              <div style={{ fontSize: 11.5, color: 'var(--faint)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {previewLines(d.content, 2).join(' · ')}
              </div>
            </div>
            <span style={{ fontSize: 11.5, color: 'var(--ghost)', flex: 'none', fontVariantNumeric: 'tabular-nums' }}>
              {timeLabel(d.updatedAt)}
            </span>
          </div>
        ))}
        {shown.length === 0 && (
          <div style={{ fontSize: 12.5, color: 'var(--faint)', textAlign: 'center', marginTop: 40 }}>Keine Dokumente.</div>
        )}
      </div>
    )
  }

  return (
    <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '6px 24px 0' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '22px 18px', margin: '14px 0 10px' }}>
        {shown.map((d) => (
          <div
            key={d.id}
            onClick={() => go({ view: 'note', noteId: d.id })}
            style={{ display: 'flex', flexDirection: 'column', gap: 9, cursor: 'pointer' }}
          >
            <div
              className="hover-accent-ring"
              style={{
                height: 140,
                borderRadius: 10,
                background: 'var(--card)',
                boxShadow: '0 0 0 1px var(--ring)',
                padding: 11,
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                gap: 4
              }}
            >
              <div style={{ fontSize: 8.5, fontWeight: 600, lineHeight: 1.4 }}>{d.title}</div>
              {previewLines(d.content, 8).map((line, i) => (
                <div
                  key={i}
                  style={{ fontSize: 7, lineHeight: 1.65, color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                >
                  {line}
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, maxWidth: '100%' }}>
                <span style={{ fontSize: 12.5, fontWeight: 500, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {d.title}
                </span>
              </div>
              <div style={{ fontSize: 11.5, color: 'var(--faint)' }}>{dayLabel(d.updatedAt)}</div>
            </div>
          </div>
        ))}
      </div>
      {shown.length === 0 && (
        <div style={{ fontSize: 12.5, color: 'var(--faint)', textAlign: 'center', marginTop: 40 }}>Keine Dokumente.</div>
      )}
    </div>
  )
}
