import { type ReactElement } from 'react'
import { useStore } from '../state'

export function Historie(): ReactElement {
  const { feed, openChatForDump } = useStore()

  return (
    <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', paddingTop: 4, gap: 1 }}>
      {feed.map((item) => (
        <div
          key={item.dumpId}
          className="hover-bg"
          onClick={() => void openChatForDump(item.dumpId)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            minHeight: 46,
            padding: '5px 12px',
            margin: '0 10px',
            borderRadius: 9,
            cursor: 'pointer'
          }}
        >
          <span style={{ width: 38, flex: 'none', fontSize: 11.5, color: 'var(--ghost)', fontVariantNumeric: 'tabular-nums' }}>
            {item.time}
          </span>
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontSize: 13.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {item.text}
            </span>
            {item.pendingQuestions > 0 && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span
                  style={{
                    width: 14,
                    height: 14,
                    borderRadius: '50%',
                    flex: 'none',
                    background: 'var(--accent)',
                    color: 'var(--accent-ink)',
                    fontSize: 8.5,
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  K
                </span>
                <span style={{ fontSize: 11.5, color: 'var(--accent)' }}>
                  Kepler hat {item.pendingQuestions === 1 ? 'eine Rückfrage' : `${item.pendingQuestions} Rückfragen`}
                </span>
              </span>
            )}
          </div>
          {item.status === 'processed' && item.parts.length > 0 && (
            <span style={{ fontSize: 11.5, color: 'var(--faint)', flex: 'none' }}>
              {item.parts.find((p) => p.kind === 'doc')?.themeName ?? 'abgelegt'}
              {item.parts.some((p) => p.kind === 'todo') ? ' · Todo erkannt' : ''}
            </span>
          )}
          {item.status === 'processing' && item.pendingQuestions === 0 && (
            <span className="kepler-pending" style={{ fontSize: 11.5, flex: 'none' }}>
              sortiert ein …
            </span>
          )}
        </div>
      ))}
      {feed.length === 0 && (
        <div style={{ fontSize: 12.5, color: 'var(--faint)', textAlign: 'center', marginTop: 40 }}>
          Noch keine Historie.
        </div>
      )}
    </div>
  )
}
