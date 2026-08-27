import { useRef, useState, type ReactElement } from 'react'
import { DocGlyph, Icon, Starburst } from '../icons'
import { chipCore, menuItem, menuStyle, modeBtn, serif } from '../ui'
import { api, useStore } from '../state'
import type { FeedItem } from '@shared/types'

function Capture(): ReactElement {
  const { mode, setMode, submit, clearAsk } = useStore()
  const [text, setText] = useState('')
  const [focused, setFocused] = useState(false)
  const ref = useRef<HTMLTextAreaElement>(null)
  const typed = text.trim().length > 0

  const fields = {
    dump: {
      empty: 'Was geht dir durch den Kopf?',
      hint: 'Enter zum Ablegen',
      sub: 'Einfach schreiben. Ablegen macht Litter.'
    },
    ask: { empty: 'Frag deine Notizen …', hint: '', sub: 'Antworten kommen aus deinen eigenen Dumps.' }
  }
  const fm = fields[mode]

  const send = (): void => {
    if (!typed) {
      ref.current?.focus()
      return
    }
    void submit(text)
    setText('')
  }

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <Starburst size={25} />
          <span style={{ fontFamily: serif, fontSize: 27, letterSpacing: '-0.5px' }}>
            Lad’s einfach ab, Timo.
          </span>
        </div>
        <span style={{ fontSize: 12.5, color: 'var(--faint)' }}>{fm.sub}</span>
      </div>
      <div style={{ width: 620, position: 'relative' }}>
        <div
          style={{
            borderRadius: 12,
            background: 'var(--card)',
            boxShadow:
              typed || focused
                ? '0 0 0 1.5px var(--accent), var(--cardshadow)'
                : '0 0 0 1px var(--ring), var(--cardshadow)',
            padding: '15px 15px 11px'
          }}
        >
          <textarea
            ref={ref}
            value={text}
            rows={1}
            placeholder={fm.empty}
            onChange={(e) => {
              setText(e.target.value)
              e.target.style.height = 'auto'
              e.target.style.height = `${Math.min(e.target.scrollHeight, 180)}px`
            }}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                send()
              }
            }}
            style={{
              width: '100%',
              minHeight: 24,
              maxHeight: 180,
              fontSize: 14.5,
              lineHeight: 1.6,
              border: 'none',
              outline: 'none',
              resize: 'none',
              background: 'transparent',
              padding: 0,
              userSelect: 'text'
            }}
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 14 }}>
            <Icon name="plus" size={17} style={{ color: 'var(--muted)', cursor: 'pointer' }} />
            <span style={{ display: 'flex', padding: 2, borderRadius: 999, background: 'var(--groupbg)', gap: 1 }}>
              <span
                onClick={() => {
                  setMode('dump')
                  clearAsk()
                }}
                style={modeBtn(mode === 'dump')}
              >
                Dump
              </span>
              <span onClick={() => setMode('ask')} style={modeBtn(mode === 'ask')}>
                Frage
              </span>
            </span>
            <span style={{ flex: 1 }} />
            <span style={{ fontSize: 11, color: 'var(--ghost)' }}>{fm.hint}</span>
            <span
              onClick={send}
              style={{
                width: 30,
                height: 30,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                ...(typed
                  ? { background: 'var(--accent)', color: 'var(--accent-ink)' }
                  : { background: 'var(--sendidle)', color: 'var(--faint)' })
              }}
            >
              <Icon name="arrow-up" size={15} />
            </span>
          </div>
        </div>
      </div>
    </>
  )
}

function AskResult(): ReactElement | null {
  const { ask, go } = useStore()
  if (!ask) return null
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden', padding: '2px 2px 0' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: 'var(--muted)' }}>
        {ask.question}
      </div>
      {ask.pending ? (
        <div className="kepler-pending" style={{ fontSize: 13, marginTop: 14 }}>
          Kepler liest deine Notizen …
        </div>
      ) : (
        <>
          <div style={{ fontFamily: serif, fontSize: 18.5, lineHeight: 1.55, marginTop: 12, userSelect: 'text' }}>
            {ask.text}
          </div>
          {ask.sources.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginTop: 20 }}>
              <span style={{ fontSize: 12, color: 'var(--faint)', marginRight: 2 }}>Belegt durch</span>
              {ask.sources.map((s, i) => (
                <span
                  key={i}
                  className="hover-bg2"
                  onClick={() =>
                    go({
                      view: 'note',
                      noteId: s.noteId,
                      highlight: s.start != null && s.end != null ? { start: s.start, end: s.end } : null
                    })
                  }
                  style={{ ...chipCore, cursor: 'pointer' }}
                >
                  <DocGlyph style={{ color: 'var(--muted)' }} />
                  {s.title}
                </span>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

function FeedRow({ item }: { item: FeedItem }): ReactElement {
  const { justSentDump, openChatForDump, themes, refresh, go } = useStore()
  const [menuFor, setMenuFor] = useState<number | null>(null)
  const fresh = item.dumpId === justSentDump
  const pending = item.status === 'pending' || item.status === 'processing'
  const docParts = item.parts.filter((p) => p.kind === 'doc')
  const splitLabel =
    item.parts.length > 1
      ? 'aufgeteilt in'
      : docParts[0]?.action === 'appended'
        ? 'ergänzt in'
        : 'abgelegt in'

  return (
    <div
      className="hover-bg"
      onClick={() => void openChatForDump(item.dumpId)}
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'flex-start',
        gap: 12,
        padding: 10,
        borderRadius: 9,
        cursor: 'pointer'
      }}
    >
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <span style={{ fontSize: 13, lineHeight: 1.5 }}>{item.text}</span>
        {pending ? (
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {item.pendingQuestions > 0 ? (
              <>
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
              </>
            ) : item.status === 'pending' ? (
              <span style={{ fontSize: 11.5, color: 'var(--faint)' }}>wartet auf Kepler</span>
            ) : (
              <span className="kepler-pending" style={{ fontSize: 11.5 }}>
                Kepler sortiert ein …
              </span>
            )}
          </span>
        ) : item.status === 'failed' ? (
          <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span
              onClick={(e) => {
                e.stopPropagation()
                void api.retryDump(item.dumpId).then(refresh)
              }}
              style={{ fontSize: 11.5, color: 'var(--accent)', cursor: 'pointer', fontWeight: 500 }}
            >
              Ablage fehlgeschlagen — erneut versuchen
            </span>
            <span style={{ fontSize: 11.5, color: 'var(--faint)' }}>antippen für Details</span>
          </span>
        ) : item.parts.length === 0 ? (
          <span style={{ fontSize: 11.5, color: 'var(--ghost)' }}>nichts abgelegt</span>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11.5, color: 'var(--ghost)', flex: 'none' }}>{splitLabel}</span>
            {item.parts.map((p, pi) => (
              <span key={pi} style={{ display: 'flex', alignItems: 'center', gap: 5, flex: 'none' }}>
                {p.kind === 'doc' ? (
                  <>
                    <span
                      className="hover-bg2"
                      onClick={(e) => {
                        e.stopPropagation()
                        if (p.noteId != null) go({ view: 'note', noteId: p.noteId })
                      }}
                      style={{ ...chipCore, cursor: 'pointer' }}
                    >
                      <DocGlyph />
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.label}</span>
                    </span>
                    {p.themeName && (
                      <>
                        <span style={{ fontSize: 11.5, color: 'var(--ghost)', flex: 'none' }}>in</span>
                        <span
                          className="hover-bg2"
                          onClick={(e) => {
                            e.stopPropagation()
                            setMenuFor(menuFor === pi ? null : pi)
                          }}
                          style={{ ...chipCore, cursor: 'pointer' }}
                        >
                          <Icon name="folder-open" size={11} />
                          {p.themeName}
                          {menuFor === pi && (
                            <div style={menuStyle()}>
                              {themes.map((t) => (
                                <div
                                  key={t.id}
                                  className="hover-bg"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setMenuFor(null)
                                    if (p.noteId != null) {
                                      void api.setDocTheme(p.noteId, t.id).then(refresh)
                                    }
                                  }}
                                  style={menuItem}
                                >
                                  <Icon name="folder-open" size={12} style={{ color: 'var(--faint)' }} />
                                  <span style={{ flex: 1 }}>{t.name}</span>
                                  {t.name === p.themeName && (
                                    <Icon name="check" size={12} style={{ color: 'var(--accent)' }} />
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </span>
                      </>
                    )}
                  </>
                ) : (
                  <span onClick={(e) => e.stopPropagation()} style={{ ...chipCore, cursor: 'default' }}>
                    <span
                      style={{
                        width: 11,
                        height: 11,
                        flex: 'none',
                        borderRadius: 3,
                        boxShadow: 'inset 0 0 0 1px currentColor',
                        opacity: 0.55
                      }}
                    />
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.label}</span>
                  </span>
                )}
              </span>
            ))}
          </div>
        )}
      </div>
      <span
        style={{ fontSize: 11, color: 'var(--ghost)', flex: 'none', paddingTop: 3, fontVariantNumeric: 'tabular-nums' }}
      >
        {fresh ? 'gerade' : item.time}
      </span>
    </div>
  )
}

export function Home(): ReactElement {
  const { feed, ask, auth } = useStore()
  return (
    <div
      style={{
        flex: 1,
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 22,
        padding: '42px 0 18px',
        overflow: 'hidden'
      }}
    >
      <Capture />
      <div style={{ width: 620, flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
        {auth && !auth.ok && (
          <div
            style={{
              fontSize: 12,
              lineHeight: 1.6,
              color: 'var(--text2)',
              background: 'var(--tint)',
              borderRadius: 9,
              padding: '10px 12px',
              marginBottom: 12
            }}
          >
            {auth.detail}
          </div>
        )}
        {ask ? (
          <AskResult />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1, minHeight: 0 }}>
            {feed.map((item) => (
              <FeedRow key={item.dumpId} item={item} />
            ))}
            {feed.length === 0 && (
              <div style={{ fontSize: 12.5, color: 'var(--faint)', textAlign: 'center', marginTop: 30 }}>
                Noch keine Dumps — schreib einfach los.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
