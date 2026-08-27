import type { CSSProperties } from 'react'

/** Style fragments lifted 1:1 from the design file. */

export const tab = (active: boolean): CSSProperties => ({
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  height: 26,
  padding: '0 10px',
  borderRadius: 7,
  fontSize: 12.5,
  fontWeight: 600,
  cursor: 'pointer',
  color: active ? 'var(--ink)' : 'var(--muted)'
})

export const segBtn = (active: boolean): CSSProperties =>
  active
    ? {
        width: 26,
        height: 22,
        borderRadius: 5,
        background: 'var(--card)',
        boxShadow: '0 0 0 1px var(--ring2)',
        color: 'var(--ink)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer'
      }
    : {
        width: 26,
        height: 22,
        borderRadius: 5,
        color: 'var(--faint)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer'
      }

export const modeBtn = (active: boolean): CSSProperties =>
  active
    ? {
        padding: '4px 11px',
        borderRadius: 6,
        background: 'var(--card)',
        boxShadow: '0 0 0 1px var(--ring2)',
        fontSize: 12,
        fontWeight: 500,
        cursor: 'pointer'
      }
    : { padding: '4px 11px', borderRadius: 6, fontSize: 12, color: 'var(--faint)', cursor: 'pointer' }

export const optChip = (active: boolean): CSSProperties =>
  active
    ? {
        display: 'flex',
        alignItems: 'center',
        height: 27,
        padding: '0 12px',
        borderRadius: 999,
        background: 'var(--accent)',
        color: 'var(--accent-ink)',
        fontSize: 12,
        fontWeight: 500,
        cursor: 'pointer'
      }
    : {
        display: 'flex',
        alignItems: 'center',
        height: 27,
        padding: '0 12px',
        borderRadius: 999,
        background: 'var(--card)',
        boxShadow: 'inset 0 0 0 1px var(--ring2)',
        fontSize: 12,
        color: 'var(--text2)',
        cursor: 'pointer'
      }

/**
 * Chip geometry only — the background lives in the `.litter-chip` CSS class
 * so `:hover` can actually override it (an inline background never loses).
 */
export const chipCore: CSSProperties = {
  position: 'relative',
  display: 'flex',
  alignItems: 'center',
  gap: 5,
  height: 22,
  padding: '0 8px',
  borderRadius: 6,
  fontSize: 11.5,
  flex: 'none',
  maxWidth: 240,
  color: 'var(--text2)'
}

export const toolBtn: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 5,
  height: 26,
  padding: '0 9px',
  borderRadius: 6,
  background: 'var(--card)',
  boxShadow: 'inset 0 0 0 1px var(--ring2)',
  fontSize: 12,
  color: 'var(--text2)',
  cursor: 'pointer'
}

export const blockStyle: Record<string, CSSProperties> = {
  h: { fontSize: 14.5, fontWeight: 600, margin: '18px 0 2px' },
  p: { fontSize: 14, lineHeight: 1.7, color: 'var(--text2)', marginTop: 10 },
  b: { fontSize: 14, lineHeight: 1.7, color: 'var(--text2)', marginTop: 4 },
  c: {
    fontFamily: 'ui-monospace, Menlo, monospace',
    fontSize: 12,
    lineHeight: 1.7,
    color: 'var(--text2)',
    background: 'var(--groupbg)',
    borderRadius: 8,
    padding: '10px 12px',
    marginTop: 10,
    whiteSpace: 'pre-wrap'
  },
  mark: {
    fontSize: 14,
    lineHeight: 1.7,
    color: 'var(--ink)',
    background: 'var(--tint)',
    borderRadius: 6,
    padding: '6px 9px',
    marginTop: 10
  },
  todo: {
    fontSize: 13,
    lineHeight: 1.6,
    color: 'var(--muted)',
    marginTop: 14,
    padding: '8px 11px',
    borderRadius: 8,
    background: 'var(--groupbg)'
  }
}

export const serif = "Georgia, 'Times New Roman', serif"

export const menuStyle = (up = false): CSSProperties => ({
  position: 'absolute',
  left: 0,
  zIndex: 20,
  width: 190,
  ...(up ? { bottom: 28 } : { top: 28 }),
  borderRadius: 9,
  background: 'var(--card)',
  boxShadow: '0 0 0 1px var(--ring), 0 10px 28px var(--scrim)',
  padding: 4
})

export const menuItem: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  height: 28,
  padding: '0 8px',
  borderRadius: 6,
  fontSize: 12,
  color: 'var(--ink)',
  cursor: 'pointer'
}
