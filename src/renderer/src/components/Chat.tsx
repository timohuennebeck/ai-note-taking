import { useEffect, useRef, useState, type ReactElement } from 'react'
import { Icon } from '../icons'
import { optChip } from '../ui'
import { AgentText } from './AgentText'
import { useStore } from '../state'
import type { ThreadEntry } from '@shared/types'

function LitterAvatar({ size = 20 }: { size?: number }): ReactElement {
  return (
    <span
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        flex: 'none',
        marginTop: 1,
        background: 'var(--accent)',
        color: 'var(--accent-ink)',
        fontSize: size / 2,
        fontWeight: 700,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      L
    </span>
  )
}

function Entry({ e }: { e: ThreadEntry }): ReactElement | null {
  const { answerQuestion, resolveProposal, go } = useStore()

  if (e.type === 'user') {
    return (
      <div style={{ alignSelf: 'flex-end', maxWidth: '75%', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 5 }}>
        <div
          style={{
            background: 'var(--groupbg)',
            borderRadius: '13px 13px 4px 13px',
            padding: '10px 14px',
            fontSize: 13.5,
            lineHeight: 1.55,
            userSelect: 'text'
          }}
        >
          {e.text}
        </div>
        {e.time && (
          <span style={{ fontSize: 10.5, color: 'var(--ghost)', fontVariantNumeric: 'tabular-nums' }}>{e.time}</span>
        )}
      </div>
    )
  }

  const body = (children: ReactElement): ReactElement => (
    <div style={{ display: 'flex', gap: 10, maxWidth: '86%' }}>
      <LitterAvatar />
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'flex-start' }}>
        {children}
      </div>
    </div>
  )

  if (e.type === 'agent') {
    return body(
      <div style={{ marginTop: 1 }}>
        <AgentText text={e.text} />
      </div>
    )
  }

  if (e.type === 'question') {
    return body(
      <>
        <div style={{ fontSize: 13.5, lineHeight: 1.55, color: 'var(--text2)', marginTop: 1 }}>{e.text}</div>
        {e.answer == null && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {e.options.map((opt) => (
              <span key={opt} onClick={() => void answerQuestion(e.questionId, opt)} style={optChip(false)}>
                {opt}
              </span>
            ))}
          </div>
        )}
      </>
    )
  }

  if (e.type === 'proposal') {
    return body(
      <>
        <div style={{ fontSize: 13.5, lineHeight: 1.55, color: 'var(--text2)', marginTop: 1 }}>{e.text}</div>
        <div
          style={{
            width: '100%',
            borderRadius: 11,
            background: 'var(--card)',
            boxShadow: '0 0 0 1px var(--ring), var(--cardshadow)',
            padding: '13px 14px 12px'
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            {e.rows.map((row, i) => (
              <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'baseline' }}>
                <span style={{ width: 76, flex: 'none', fontSize: 11.5, color: 'var(--faint)' }}>{row.label}</span>
                <span style={{ flex: 1, minWidth: 0, fontSize: 12.5, lineHeight: 1.5 }}>{row.value}</span>
              </div>
            ))}
          </div>
          {e.state === 'open' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 14 }}>
              <span
                onClick={() => void resolveProposal(e.proposalId, true)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  height: 27,
                  padding: '0 12px',
                  borderRadius: 7,
                  background: 'var(--accent)',
                  color: 'var(--accent-ink)',
                  fontSize: 12,
                  fontWeight: 500,
                  cursor: 'pointer'
                }}
              >
                Passt, ablegen
              </span>
              <span
                className="hover-ink"
                onClick={() => void resolveProposal(e.proposalId, false)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  height: 27,
                  padding: '0 10px',
                  borderRadius: 7,
                  fontSize: 12,
                  color: 'var(--muted)',
                  cursor: 'pointer'
                }}
              >
                Korrigieren
              </span>
              <span style={{ flex: 1 }} />
              <span style={{ fontSize: 11, color: 'var(--ghost)' }}>nichts ist bisher abgelegt</span>
            </div>
          )}
          {e.state === 'accepted' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 13, fontSize: 11, color: 'var(--ghost)' }}>
              <Icon name="check-circle" size={13} style={{ color: 'var(--accent)' }} />
              von dir bestätigt{e.committedAt ? ` ${e.committedAt} Uhr` : ''}
            </div>
          )}
        </div>
      </>
    )
  }

  if (e.type === 'filed' && e.docTitle != null) {
    return body(
      <div
        onClick={() => e.noteId != null && go({ view: 'note', noteId: e.noteId })}
        style={{ width: 132, display: 'flex', flexDirection: 'column', gap: 9, cursor: 'pointer', marginTop: 2 }}
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
          <div style={{ fontSize: 8.5, fontWeight: 600, lineHeight: 1.4 }}>{e.docTitle}</div>
          {e.docLines.map((line, i) => (
            <div
              key={i}
              style={{ fontSize: 7, lineHeight: 1.65, color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
            >
              {line}
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
          <span style={{ fontSize: 12.5, fontWeight: 500, maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {e.docTitle}
          </span>
          <span style={{ fontSize: 11.5, color: 'var(--faint)' }}>{e.docDate}</span>
        </div>
      </div>
    )
  }

  return null
}

export function Chat(): ReactElement {
  const { thread, threadBusy, sendChat } = useStore()
  const [text, setText] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)

  const hasOpenChoices = thread.some(
    (e) => (e.type === 'question' && e.answer == null) || (e.type === 'proposal' && e.state === 'open')
  )
  // first pass over a fresh dump reads as filing, later turns as thinking
  const filedYet = thread.some((e) => e.type === 'agent' || e.type === 'filed' || e.type === 'proposal')
  const busy = threadBusy && !hasOpenChoices
  const busyLabel = filedYet ? 'Litter denkt nach …' : 'Litter sortiert ein …'

  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [thread, busy])

  return (
    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
      <div
        ref={scrollRef}
        style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '22px 28px 0' }}
      >
        <div style={{ width: '100%', maxWidth: 620, marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 18, paddingBottom: 8 }}>
          {thread.map((e, i) => (
            <Entry key={i} e={e} />
          ))}
          {busy && (
            <div style={{ display: 'flex', gap: 10 }}>
              <LitterAvatar />
              <span className="litter-pending" style={{ fontSize: 13, marginTop: 2 }}>
                {busyLabel}
              </span>
            </div>
          )}
        </div>
      </div>
      <div style={{ flex: 'none', display: 'flex', justifyContent: 'center', padding: '14px 28px 18px' }}>
        <div
          style={{
            width: '100%',
            maxWidth: 620,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            height: 42,
            padding: '0 7px 0 14px',
            borderRadius: 11,
            background: 'var(--card)',
            boxShadow: '0 0 0 1px var(--ring), var(--cardshadow)'
          }}
        >
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && text.trim()) {
                void sendChat(text)
                setText('')
              }
            }}
            placeholder={hasOpenChoices ? 'Antworten oder eigene Frage tippen …' : 'Noch etwas dazu …'}
            style={{ flex: 1, minWidth: 0, fontSize: 13, border: 'none', outline: 'none', background: 'transparent', userSelect: 'text' }}
          />
          {hasOpenChoices && <span style={{ fontSize: 11, color: 'var(--ghost)' }}>oder oben wählen</span>}
          <span
            onClick={() => {
              if (text.trim()) {
                void sendChat(text)
                setText('')
              }
            }}
            style={{
              width: 28,
              height: 28,
              flex: 'none',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              ...(text.trim()
                ? { background: 'var(--accent)', color: 'var(--accent-ink)' }
                : { background: 'var(--sendidle)', color: 'var(--faint)' })
            }}
          >
            <Icon name="arrow-up" size={14} />
          </span>
        </div>
      </div>
    </div>
  )
}
