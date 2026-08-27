import type { CSSProperties, ReactElement } from 'react'

/** Heroicons path data, taken 1:1 from the design file's icon preload. */
const PATHS: Record<string, string> = {
  'lock-closed':
    'M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25',
  funnel:
    'M12 3c2.755 0 5.455.232 8.083.678c.533.09.917.556.917 1.096v1.044a2.25 2.25 0 0 1-.659 1.591l-5.432 5.432a2.25 2.25 0 0 0-.659 1.591v2.927a2.25 2.25 0 0 1-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 0 0-.659-1.591L3.659 7.409A2.25 2.25 0 0 1 3 5.818V4.774c0-.54.384-1.006.917-1.096A48.3 48.3 0 0 1 12 3',
  'squares-2x2':
    'M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25zm0 9.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18zM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25zm0 9.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18z',
  check: 'm4.5 12.75l6 6l9-13.5',
  sun: 'M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0a3.75 3.75 0 0 1 7.5 0',
  moon: 'M21.752 15.002A9.7 9.7 0 0 1 18 15.75A9.75 9.75 0 0 1 8.25 6c0-1.33.266-2.597.748-3.752A9.75 9.75 0 0 0 3 11.25A9.75 9.75 0 0 0 12.75 21a9.75 9.75 0 0 0 9.002-5.998',
  plus: 'M12 4.5v15m7.5-7.5h-15',
  'list-bullet':
    'M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75zm.375 0a.375.375 0 1 1-.75 0a.375.375 0 0 1 .75 0M3.75 12h.007v.008H3.75zm.375 0a.375.375 0 1 1-.75 0a.375.375 0 0 1 .75 0m-.375 5.25h.007v.008H3.75zm.375 0a.375.375 0 1 1-.75 0a.375.375 0 0 1 .75 0',
  'arrow-up': 'M4.5 10.5L12 3m0 0l7.5 7.5M12 3v18',
  trash:
    'm14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21q.512.078 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48 48 0 0 0-3.478-.397m-12 .562q.51-.088 1.022-.165m0 0a48 48 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a52 52 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a49 49 0 0 0-7.5 0',
  clock: 'M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0a9 9 0 0 1 18 0',
  'folder-open':
    'M3.75 9.776q.168-.026.344-.026h15.812q.176 0 .344.026m-16.5 0a2.25 2.25 0 0 0-1.883 2.542l.857 6a2.25 2.25 0 0 0 2.227 1.932H19.05a2.25 2.25 0 0 0 2.227-1.932l.857-6a2.25 2.25 0 0 0-1.883-2.542m-16.5 0V6A2.25 2.25 0 0 1 6 3.75h3.879a1.5 1.5 0 0 1 1.06.44l2.122 2.12a1.5 1.5 0 0 0 1.06.44H18A2.25 2.25 0 0 1 20.25 9v.776',
  hashtag: 'M5.25 8.25h15m-16.5 7.5h15m-1.8-13.5l-3.9 19.5m-2.1-19.5l-3.9 19.5',
  'check-circle': 'M9 12.75L11.25 15L15 9.75M21 12a9 9 0 1 1-18 0a9 9 0 0 1 18 0',
  'document-text':
    'M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9',
  inbox:
    'M2.25 13.5h3.86a2.25 2.25 0 0 1 2.012 1.244l.256.512a2.25 2.25 0 0 0 2.013 1.244h3.218a2.25 2.25 0 0 0 2.013-1.244l.256-.512a2.25 2.25 0 0 1 2.013-1.244h3.859m-19.5.338V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18v-4.162q0-.338-.1-.661l-2.41-7.839a2.25 2.25 0 0 0-2.15-1.588H6.911a2.25 2.25 0 0 0-2.15 1.588L2.35 13.177a2.3 2.3 0 0 0-.1.661'
}

const SOLID: Record<string, string> = {
  'star-solid':
    'M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.006l5.404.434c1.164.093 1.636 1.545.749 2.305l-4.117 3.527l1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354L7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273l-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.434z'
}

export function Icon({
  name,
  size = 14,
  style
}: {
  name: string
  size?: number
  style?: CSSProperties
}): ReactElement {
  const solid = SOLID[name]
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      style={{ display: 'inline-block', verticalAlign: '-0.125em', flex: 'none', ...style }}
    >
      {solid ? (
        <path fill="currentColor" fillRule="evenodd" clipRule="evenodd" d={solid} />
      ) : (
        <path
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d={PATHS[name] ?? ''}
        />
      )}
    </svg>
  )
}

/** The little document glyph used for chips and list rows. */
export function DocGlyph({
  width = 11,
  height = 13,
  style
}: {
  width?: number
  height?: number
  style?: CSSProperties
}): ReactElement {
  return (
    <svg width={width} height={height} viewBox="0 0 12 14" fill="none" style={{ flex: 'none', ...style }}>
      <path
        d="M2.6 0.6h4.3L10.4 4.1v8.3a1.1 1.1 0 0 1-1.1 1.1H2.6a1.1 1.1 0 0 1-1.1-1.1V1.7A1.1 1.1 0 0 1 2.6 0.6Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="0.9"
        strokeOpacity="0.85"
      />
      <path d="M6.8 0.7v2.4a1 1 0 0 0 1 1h2.4" stroke="currentColor" strokeWidth="0.9" strokeOpacity="0.85" />
      <path d="M3.6 6.7h4.7M3.6 8.7h4.7M3.6 10.7h3" stroke="currentColor" strokeWidth="0.9" strokeLinecap="round" />
    </svg>
  )
}

/** The Litter starburst logo. */
export function Starburst({ size = 13 }: { size?: number }): ReactElement {
  const lines: Array<[number, number]> = [
    [15, 3],
    [21, 4.6],
    [25.4, 9],
    [27, 15],
    [25.4, 21],
    [21, 25.4],
    [15, 27],
    [9, 25.4],
    [4.6, 21],
    [3, 15],
    [4.6, 9],
    [9, 4.6]
  ]
  return (
    <svg width={size} height={size} viewBox="0 0 30 30" style={{ flex: 'none' }}>
      <g stroke="var(--accent)" strokeWidth="2.4" strokeLinecap="round">
        {lines.map(([x, y], i) => (
          <line key={i} x1="15" y1="15" x2={x} y2={y} />
        ))}
      </g>
    </svg>
  )
}
