import type { ReactElement } from 'react'
import { Icon, Starburst } from '../icons'
import { tab } from '../ui'
import { useStore } from '../state'

const isMac = navigator.userAgent.includes('Macintosh')

export function TitleBar(): ReactElement {
  const { view, go, dark, toggleDark } = useStore()
  const v = view.view

  return (
    <div
      className="drag"
      style={{
        height: 44,
        flex: 'none',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '0 16px',
        position: 'relative'
      }}
    >
      {isMac ? (
        // native traffic lights occupy this space (hiddenInset)
        <span style={{ width: 56, flex: 'none' }} />
      ) : (
        <>
          <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#FF5F57', boxShadow: 'inset 0 0 0 0.5px rgba(0,0,0,0.15)' }} />
          <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#FEBC2E', boxShadow: 'inset 0 0 0 0.5px rgba(0,0,0,0.15)' }} />
          <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#28C840', boxShadow: 'inset 0 0 0 0.5px rgba(0,0,0,0.15)' }} />
        </>
      )}
      <span
        className="no-drag"
        onClick={() => go({ view: 'home' })}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          height: 28,
          padding: '0 9px',
          marginLeft: 6,
          borderRadius: 7,
          cursor: 'pointer'
        }}
      >
        <Starburst size={13} />
        <span style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 13, letterSpacing: '-0.3px', color: 'var(--ink)' }}>
          Litter
        </span>
      </span>
      <div
        className="no-drag"
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          display: 'flex',
          alignItems: 'center',
          gap: 2
        }}
      >
        <span className="hover-ink" onClick={() => go({ view: 'notes' })} style={tab(v === 'notes' || v === 'note' || v === 'filter')}>
          <Icon name="inbox" size={14} />
          Eingang
        </span>
        <span className="hover-ink" onClick={() => go({ view: 'themen' })} style={tab(v === 'themen')}>
          <Icon name="folder-open" size={14} />
          Themen
        </span>
        <span className="hover-ink" onClick={() => go({ view: 'today' })} style={tab(v === 'today' || v === 'hist')}>
          <Icon name="clock" size={14} />
          Historie
        </span>
      </div>
      <span style={{ flex: 1 }} />
      <span
        className="no-drag hover-bg"
        onClick={toggleDark}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 26,
          height: 26,
          borderRadius: 7,
          cursor: 'pointer',
          ...(dark ? { color: 'var(--faint)' } : { background: 'var(--active)', color: 'var(--ink)' })
        }}
      >
        <Icon name={dark ? 'moon' : 'sun'} size={15} />
      </span>
      <span
        className="no-drag"
        style={{
          width: 24,
          height: 24,
          borderRadius: '50%',
          background: 'var(--avatar)',
          fontSize: 9.5,
          fontWeight: 600,
          color: 'var(--avatar-ink)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flex: 'none',
          marginLeft: 5,
          cursor: 'pointer'
        }}
      >
        TH
      </span>
    </div>
  )
}
