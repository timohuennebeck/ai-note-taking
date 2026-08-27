import { useEffect, useState, type ReactElement, type ReactNode } from 'react'
import { Icon } from '../icons'
import { blockStyle, serif } from '../ui'
import { api, useStore } from '../state'
import { parseBlocks } from '@shared/blocks'
import { dayLabel } from '@shared/blocks'
import type { Doc } from '@shared/types'

function withHighlight(text: string, quote: string | null): ReactNode {
  if (!quote) return text
  const idx = text.toLowerCase().indexOf(quote.toLowerCase())
  if (idx < 0) return text
  return (
    <>
      {text.slice(0, idx)}
      <span className="note-highlight">{text.slice(idx, idx + quote.length)}</span>
      {text.slice(idx + quote.length)}
    </>
  )
}

export function NoteView({
  noteId,
  editing,
  setEditing,
  onDocLoaded
}: {
  noteId: number
  editing: boolean
  setEditing: (v: boolean) => void
  onDocLoaded: (doc: Doc | null) => void
}): ReactElement {
  const { view, refresh } = useStore()
  const [doc, setDoc] = useState<Doc | null>(null)
  const [draft, setDraft] = useState('')

  useEffect(() => {
    void api.getDoc(noteId).then((d) => {
      setDoc(d)
      setDraft(d?.content ?? '')
      onDocLoaded(d)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [noteId])

  useEffect(() => {
    if (!editing && doc && draft !== doc.content) {
      void api.updateDoc(doc.id, { content: draft }).then(() => {
        void api.getDoc(noteId).then((d) => {
          setDoc(d)
          onDocLoaded(d)
        })
        refresh()
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing])

  if (!doc) {
    return (
      <div style={{ flex: 1, padding: '20px 56px 0', fontSize: 12.5, color: 'var(--faint)' }}>
        Dokument nicht gefunden.
      </div>
    )
  }

  const quote =
    view.highlight && view.highlight.start != null
      ? doc.content.slice(view.highlight.start, view.highlight.end)
      : null
  const blocks = parseBlocks(doc.content)

  return (
    <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '20px 56px 40px' }}>
      <div style={{ maxWidth: 620 }}>
        <div style={{ fontFamily: serif, fontSize: 28, letterSpacing: '-0.4px', userSelect: 'text' }}>{doc.title}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--faint)', margin: '10px 0 4px' }}>
          <span>
            {doc.themeName ?? 'kein Thema'} · {dayLabel(doc.updatedAt)}
          </span>
        </div>
        {editing ? (
          <textarea
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            style={{
              width: '100%',
              minHeight: 320,
              marginTop: 12,
              fontSize: 13.5,
              lineHeight: 1.7,
              fontFamily: 'inherit',
              border: 'none',
              outline: 'none',
              resize: 'vertical',
              borderRadius: 10,
              background: 'var(--card)',
              boxShadow: '0 0 0 1.5px var(--accent)',
              padding: '12px 14px',
              userSelect: 'text'
            }}
          />
        ) : (
          blocks.map((b, i) => (
            <div key={i} style={{ ...blockStyle[b.kind], userSelect: 'text' }}>
              {b.kind === 'b' ? '–  ' : b.kind === 'todo' ? '☐  ' : ''}
              {withHighlight(b.text, quote)}
            </div>
          ))
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 26, fontSize: 11.5, color: 'var(--ghost)' }}>
          <Icon name="lock-closed" size={12} />
          {editing
            ? 'Änderungen fließen als neue Fassung ein — Roh-Dumps bleiben unverändert'
            : 'Roh-Dumps werden nie verändert · diese Seite ist eine Ansicht'}
        </div>
      </div>
    </div>
  )
}

export function NoteActions({
  editing,
  setEditing,
  onDelete
}: {
  editing: boolean
  setEditing: (v: boolean) => void
  onDelete: () => void
}): ReactElement {
  return (
    <>
      <span className="hover-ink" onClick={onDelete} style={{ display: 'flex', cursor: 'pointer', color: 'var(--faint)' }}>
        <Icon name="trash" size={14} />
      </span>
      <span
        onClick={() => setEditing(!editing)}
        style={
          editing
            ? {
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                height: 24,
                padding: '0 9px',
                borderRadius: 6,
                background: 'var(--accent)',
                color: 'var(--accent-ink)',
                fontSize: 11.5,
                fontWeight: 500,
                cursor: 'pointer'
              }
            : {
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                height: 24,
                padding: '0 9px',
                borderRadius: 6,
                background: 'var(--card)',
                boxShadow: 'inset 0 0 0 1px var(--ring2)',
                color: 'var(--text2)',
                fontSize: 11.5,
                cursor: 'pointer'
              }
        }
      >
        {editing ? 'Fertig' : 'Bearbeiten'}
      </span>
    </>
  )
}
