import { type ReactElement } from 'react'
import { Icon } from '../icons'
import { useStore } from '../state'
import { dayLabel } from '@shared/blocks'

export function Themen(): ReactElement {
  const { themes, go } = useStore()

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
              <span style={{ fontSize: 13.5, fontWeight: 500 }}>{t.name}</span>
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
        {themes.length === 0 && (
          <div style={{ fontSize: 12.5, color: 'var(--faint)', textAlign: 'center', marginTop: 40 }}>
            Noch keine Themen — Kepler legt sie an, sobald du etwas ablegst.
          </div>
        )}
      </div>
    </div>
  )
}
