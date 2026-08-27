import { useState, type ReactElement } from 'react'
import { Icon } from '../icons'
import { api, useStore } from '../state'
import { dayLabel } from '@shared/blocks'

export function Themen(): ReactElement {
  const { themes, go, refresh } = useStore()
  const [adding, setAdding] = useState(false)

  return (
    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', padding: '4px 14px 20px', overflowY: 'auto' }}>
      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 2 }}>
        {themes.map((t) => (
          <div
            key={t.id}
            className="hover-bg"
            onClick={() => go({ view: 'filter', themeId: t.id, themeName: t.name })}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              height: 56,
              padding: '0 12px',
              borderRadius: 9,
              cursor: 'pointer'
            }}
          >
            <Icon name="folder-open" size={16} style={{ color: 'var(--muted)' }} />
            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
              <span style={{ fontSize: 13.5, fontWeight: 500 }}>
                {t.emoji ? `${t.emoji} ` : ''}
                {t.name}
              </span>
              <span style={{ fontSize: 11.5, color: 'var(--faint)' }}>
                {t.docCount === 1 ? '1 Dokument' : `${t.docCount} Dokumente`}
                {t.description ? ` · ${t.description}` : ''}
              </span>
            </div>
            <span style={{ fontSize: 11.5, color: 'var(--ghost)', flex: 'none' }}>
              bearbeitet {dayLabel(t.updatedAt)}
            </span>
          </div>
        ))}
        <div
          className="hover-ink"
          onClick={() => setAdding(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            height: 40,
            padding: '0 12px',
            borderRadius: 9,
            cursor: 'pointer',
            color: 'var(--faint)'
          }}
        >
          <Icon name="plus" size={14} />
          <span style={{ fontSize: 12.5 }}>Thema anlegen</span>
        </div>
        {adding && (
          <input
            autoFocus
            placeholder="Themenname"
            onKeyDown={(e) => {
              if (e.key === 'Escape') setAdding(false)
              if (e.key === 'Enter') {
                const name = (e.target as HTMLInputElement).value.trim()
                if (name) {
                  void api.createTheme(name).then(() => {
                    refresh()
                    setAdding(false)
                  })
                }
              }
            }}
            style={{
              height: 32,
              margin: '2px 12px',
              padding: '0 10px',
              borderRadius: 7,
              border: 'none',
              outline: 'none',
              boxShadow: 'inset 0 0 0 1.5px var(--accent)',
              background: 'var(--card)',
              fontSize: 13
            }}
          />
        )}
      </div>
    </div>
  )
}
