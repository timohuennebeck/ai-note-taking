import type { LitterDb } from './db'
import { previewLines, timeLabel, dayLabel } from '@shared/blocks'
import type { FeedItem, FilingPart, ThreadEntry } from '@shared/types'

/** Rows for the home feed and the Historie view. */
export function buildFeed(db: LitterDb, limit = 30): FeedItem[] {
  return db.listDumps(limit).map((dump) => {
    const session = db.latestSessionForDump(dump.id)
    const docs = db.docsForDump(dump.id)
    const todos = db.todosForDump(dump.id)
    const parts: FilingPart[] = [
      ...docs.map((d) => ({
        kind: 'doc' as const,
        label: d.title,
        noteId: d.id,
        themeName: d.themeName ?? undefined
      })),
      ...todos.map((t) => ({
        kind: 'todo' as const,
        label: t.dueLabel ? `${t.text} · ${t.dueLabel}` : t.text
      }))
    ]
    let pendingQuestions = 0
    if (session && !session.finishedAt) {
      for (const m of db.listMessages(session.id)) {
        if (m.role !== 'tool_use') continue
        try {
          const p = JSON.parse(m.content)
          if (p.t === 'question' && p.answer == null) pendingQuestions++
          if (p.t === 'proposal' && p.state === 'open') pendingQuestions++
        } catch {
          /* non-JSON tool row */
        }
      }
      if (pendingQuestions === 0 && dump.status === 'processing') pendingQuestions = 0
    }
    return {
      dumpId: dump.id,
      sessionId: session?.id ?? null,
      time: timeLabel(dump.createdAt),
      createdAt: dump.createdAt,
      text: dump.content,
      status: dump.status,
      pendingQuestions,
      parts
    }
  })
}

/** Reconstruct the chat thread of a dump session from persisted messages. */
export function buildThread(db: LitterDb, sessionId: number): ThreadEntry[] {
  const session = db.getSession(sessionId)
  if (!session) return []
  const entries: ThreadEntry[] = []
  const messages = db.listMessages(sessionId)
  let first = true
  for (const m of messages) {
    if (m.role === 'user') {
      entries.push({ type: 'user', text: m.content, time: first ? timeLabel(m.createdAt) : undefined })
      first = false
    } else if (m.role === 'assistant') {
      entries.push({ type: 'agent', text: m.content })
    } else if (m.role === 'tool_use') {
      try {
        const p = JSON.parse(m.content)
        if (p.t === 'question') {
          // the picked answer is persisted separately as a real user message,
          // so the question entry itself only carries state
          entries.push({
            type: 'question',
            text: p.text,
            options: p.options ?? [],
            answer: p.answer ?? null,
            questionId: p.id
          })
        } else if (p.t === 'proposal') {
          entries.push({
            type: 'proposal',
            text: p.text,
            rows: p.rows ?? [],
            proposalId: p.id,
            state: p.state ?? 'open',
            committedAt: p.committedAt ? timeLabel(p.committedAt) : null
          })
        } else if (p.t === 'answer') {
          entries.push({ type: 'agent', text: p.text })
        }
      } catch {
        /* ignore non-JSON */
      }
    }
  }
  // Filed summary card: show the first document created from this dump.
  if (session.dumpId != null && session.finishedAt && !session.error) {
    const docs = db.docsForDump(session.dumpId)
    if (docs.length) {
      const d = docs[0]
      entries.push({
        type: 'filed',
        text: '',
        noteId: d.id,
        docTitle: d.title,
        docDate: dayLabel(d.updatedAt),
        docLines: previewLines(d.content, 8)
      })
    }
  }
  return entries
}
