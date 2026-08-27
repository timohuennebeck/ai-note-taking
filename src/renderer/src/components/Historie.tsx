import { useEffect, useState, type ReactElement } from 'react'
import { Icon } from '../icons'
import { menuItem, menuStyle } from '../ui'
import { api, useStore } from '../state'

export function Historie(): ReactElement {
  const { feed, openChatForDump, refresh } = useStore()
  const [menuFor, setMenuFor] = useState<number | null>(null)

  // any click outside a row menu closes it
  useEffect(() => {
    if (menuFor == null) return
    const close = (): void => setMenuFor(null)
    window.addEventListener('click', close)
    return () => window.removeEventListener('click', close)
  }, [menuFor])

  return (
    <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', paddingTop: 4, gap: 1 }}>
      {feed.map((item, i) => (
        <div
          key={item.dumpId}
          className="hover-bg litter-row"
          onClick={() => void openChatForDump(item.dumpId)}
          style={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            minHeight: 46,
            padding: '5px 12px',
            margin: '0 10px',
            borderRadius: 9,
            cursor: 'pointer',
            flex: 'none'
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
          {item.status === 'processed' && item.parts.length === 0 && (
            <span style={{ fontSize: 11.5, color: 'var(--ghost)', flex: 'none' }}>nichts abgelegt</span>
          )}
          {item.status === 'failed' && (
            <span style={{ fontSize: 11.5, color: 'var(--accent)', flex: 'none' }}>fehlgeschlagen</span>
          )}
          {item.status === 'processing' && item.pendingQuestions === 0 && (
            <span className="kepler-pending" style={{ fontSize: 11.5, flex: 'none' }}>
              sortiert ein …
            </span>
          )}
          {item.status === 'processed' && item.parts.length > 0 && (
            <span style={{ fontSize: 11.5, color: 'var(--faint)', flex: 'none' }}>
              {item.parts.find((p) => p.kind === 'doc')?.themeName ?? 'abgelegt'}
              {item.parts.some((p) => p.kind === 'todo') ? ' · Todo erkannt' : ''}
            </span>
          )}
          <span
            className="litter-row-menu hover-bg2"
            onClick={(e) => {
              e.stopPropagation()
              setMenuFor(menuFor === item.dumpId ? null : item.dumpId)
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 24,
              height: 24,
              flex: 'none',
              borderRadius: 6,
              color: 'var(--faint)',
              cursor: 'pointer',
              opacity: menuFor === item.dumpId ? 1 : undefined
            }}
          >
            <Icon name="ellipsis-horizontal" size={15} />
          </span>
          {menuFor === item.dumpId && (
            <div
              onClick={(e) => e.stopPropagation()}
              style={{ ...menuStyle(i >= feed.length - 2), left: 'auto', right: 8, width: 210 }}
            >
              <div
                className="hover-bg"
                onClick={() => {
                  setMenuFor(null)
                  void openChatForDump(item.dumpId)
                }}
                style={menuItem}
              >
                <Icon name="clock" size={12} style={{ color: 'var(--faint)' }} />
                <span style={{ flex: 1 }}>Unterhaltung öffnen</span>
              </div>
              {item.status === 'failed' && (
                <div
                  className="hover-bg"
                  onClick={() => {
                    setMenuFor(null)
                    void api.retryDump(item.dumpId).then(refresh)
                  }}
                  style={menuItem}
                >
                  <Icon name="arrow-up" size={12} style={{ color: 'var(--faint)' }} />
                  <span style={{ flex: 1 }}>Erneut versuchen</span>
                </div>
              )}
              <div
                className="hover-bg"
                onClick={() => {
                  setMenuFor(null)
                  void api.deleteDump(item.dumpId).then(refresh)
                }}
                style={{ ...menuItem, color: 'var(--accent)' }}
              >
                <Icon name="trash" size={12} />
                <span style={{ flex: 1 }}>Aus Historie löschen</span>
              </div>
            </div>
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
