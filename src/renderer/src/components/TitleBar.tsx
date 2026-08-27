import type { CSSProperties, ReactElement } from 'react'
import { DocGlyph, Icon, Starburst } from '../icons'
import { serif } from '../ui'
import { useStore } from '../state'

const isMac = navigator.userAgent.includes('Macintosh')

/** Square icon button in the window bar — shared by nav and the theme toggle. */
const barBtn = (active: boolean): CSSProperties => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 26,
  height: 26,
  borderRadius: 7,
  cursor: 'pointer',
  ...(active ? { background: 'var(--active)', color: 'var(--ink)' } : { color: 'var(--faint)' })
})

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

      {/* Litter sits dead center of the window bar */}
      <span
        className="no-drag"
        onClick={() => go({ view: 'home' })}
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          display: 'flex',
          alignItems: 'center',
          gap: 7,
          height: 28,
          padding: '0 9px',
          borderRadius: 7,
          cursor: 'pointer'
        }}
      >
        <Starburst size={14} />
        <span style={{ fontFamily: serif, fontSize: 14, letterSpacing: '-0.3px', color: 'var(--ink)' }}>
          Litter
        </span>
      </span>

      <span style={{ flex: 1 }} />

      <span
        className="no-drag hover-bg"
        title="Unterlagen"
        onClick={() => go({ view: 'notes' })}
        style={barBtn(v === 'notes' || v === 'note' || v === 'filter')}
      >
        <DocGlyph width={13} height={15} />
      </span>
      <span
        className="no-drag hover-bg"
        title="Themen"
        onClick={() => go({ view: 'themen' })}
        style={barBtn(v === 'themen')}
      >
        <Icon name="folder-open" size={15} />
      </span>
      <span
        className="no-drag hover-bg"
        title={dark ? 'Heller Modus' : 'Dunkler Modus'}
        onClick={toggleDark}
        style={barBtn(!dark)}
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
