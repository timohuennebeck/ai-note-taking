import { useState, type ReactElement } from 'react'
import { TitleBar } from './components/TitleBar'
import { Home } from './components/Home'
import { Themen } from './components/Themen'
import { Chat } from './components/Chat'
import { Docs } from './components/Docs'
import { NoteActions, NoteView } from './components/NoteView'
import { Icon } from './icons'
import { segBtn } from './ui'
import { api, useStore } from './state'
import type { Doc } from '@shared/types'

export default function App(): ReactElement {
  const { view, go, back, docs, thread, refresh } = useStore()
  const v = view.view
  const [docsView, setDocsView] = useState<'grid' | 'list'>('grid')
  const [editing, setEditing] = useState(false)
  const [currentDoc, setCurrentDoc] = useState<Doc | null>(null)

  const isDocs = v === 'notes' || v === 'filter'
  const notHome = v !== 'home'

  const chatState = thread.some((e) => e.type === 'proposal' && e.state === 'open')
    ? 'wartet auf deine Bestätigung'
    : thread.some((e) => e.type === 'question' && e.answer == null)
      ? 'Rückfragen offen'
      : 'abgelegt'

  const titles: Record<string, [string, string]> = {
    themen: ['Themen', ''],
    hist: ['Dump', chatState],
    notes: ['Unterlagen', `${docs.length} ${docs.length === 1 ? 'Dokument' : 'Dokumente'}`],
    filter: [
      view.themeName ?? 'Filter',
      `${docs.filter((d) => d.themeId === view.themeId).length} Dokumente`
    ],
    note: [currentDoc?.title ?? 'Notiz', '']
  }
  const [viewTitle, viewMeta] = titles[v] ?? ['', '']

  return (
    <section
      style={{
        display: 'flex',
        width: '100vw',
        height: '100vh',
        padding: 0,
        background: 'var(--canvas)',
        color: 'var(--ink)'
      }}
    >
      <div
        style={{
          flex: 1,
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          margin: 8,
          borderRadius: 10,
          background: 'var(--panel)',
          boxShadow: '0 0 0 1px var(--ring)',
          overflow: 'hidden'
        }}
      >
        <TitleBar />

        {notHome && (
          <div style={{ height: 44, flex: 'none', display: 'flex', alignItems: 'center', gap: 10, padding: '0 20px' }}>
            {(v === 'note' || v === 'hist') && (
              <>
                <span
                  className="hover-ink"
                  onClick={() => (v === 'note' ? back() : go({ view: 'home' }))}
                  style={{ display: 'flex', alignItems: 'center', fontSize: 12.5, color: 'var(--muted)', cursor: 'pointer' }}
                >
                  {v === 'note' ? 'Unterlagen' : 'Start'}
                </span>
                <span style={{ fontSize: 12, color: 'var(--ghost)' }}>/</span>
              </>
            )}
            <span style={{ fontSize: 13, fontWeight: 600 }}>{viewTitle}</span>
            {v !== 'note' && viewMeta && (
              <span style={{ fontSize: 12, color: 'var(--faint)' }}>{viewMeta}</span>
            )}
            <span style={{ flex: 1 }} />
            {v === 'note' && (
              <>
                <span style={{ fontSize: 12, color: 'var(--faint)' }}>
                  {currentDoc ? `${currentDoc.themeName ?? 'kein Thema'}` : ''}
                </span>
                <NoteActions
                  editing={editing}
                  setEditing={setEditing}
                  onDelete={() => {
                    if (view.noteId != null) {
                      void api.deleteDoc(view.noteId).then(() => {
                        refresh()
                        back()
                      })
                    }
                  }}
                />
              </>
            )}
            {isDocs && (
              <span style={{ display: 'flex', padding: 2, borderRadius: 7, background: 'var(--groupbg)', gap: 1 }}>
                <span onClick={() => setDocsView('grid')} style={segBtn(docsView === 'grid')}>
                  <Icon name="squares-2x2" size={14} />
                </span>
                <span onClick={() => setDocsView('list')} style={segBtn(docsView === 'list')}>
                  <Icon name="list-bullet" size={14} />
                </span>
              </span>
            )}
          </div>
        )}

        {v === 'home' && <Home />}
        {v === 'themen' && <Themen />}
        {v === 'hist' && <Chat />}
        {isDocs && <Docs docsView={docsView} themeId={v === 'filter' ? view.themeId : undefined} />}
        {v === 'note' && view.noteId != null && (
          <NoteView noteId={view.noteId} editing={editing} setEditing={setEditing} onDocLoaded={setCurrentDoc} />
        )}
      </div>
    </section>
  )
}
