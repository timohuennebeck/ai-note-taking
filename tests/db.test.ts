import { beforeEach, describe, expect, it } from 'vitest'
import { LitterDb } from '../src/main/db'
import { buildFeed, buildThread } from '../src/main/feed'

let db: LitterDb

beforeEach(() => {
  db = new LitterDb(':memory:')
})

describe('LitterDb', () => {
  it('creates dumps immutably and tracks status', () => {
    const dump = db.createDump('Zahnarzt anrufen wegen Milo')
    expect(dump.status).toBe('pending')
    db.setDumpStatus(dump.id, 'processed')
    expect(db.getDump(dump.id)?.status).toBe('processed')
    expect(db.getDump(dump.id)?.processedAt).toBeTruthy()
    expect(db.getDump(dump.id)?.content).toBe('Zahnarzt anrufen wegen Milo')
  })

  it('creates themes idempotently by name', () => {
    const a = db.createTheme('Familie', 'Alles rund um die Familie')
    const b = db.createTheme('familie')
    expect(b.id).toBe(a.id)
    expect(db.listThemes()).toHaveLength(1)
  })

  it('files docs into themes and counts them', () => {
    const theme = db.createTheme('EmaBoard')
    const dump = db.createDump('Sprint-Notiz')
    db.createDoc({ title: 'Sprint-Notizen', content: '- Demo Do 14:00', themeId: theme.id, dumpId: dump.id })
    expect(db.listThemes()[0].docCount).toBe(1)
    expect(db.docsForDump(dump.id)[0].themeName).toBe('EmaBoard')
  })

  it('appends without overwriting', () => {
    const d = db.createDoc({ title: 'Hero', content: '- Zeile eins' })
    db.appendToDoc(d.id, '- Zeile zwei')
    expect(db.getDoc(d.id)?.content).toBe('- Zeile eins\n\n- Zeile zwei')
  })

  it('searches via FTS after insert and update', () => {
    const d = db.createDoc({ title: 'Lissabon', content: 'Flug LH1178 um 06:55, Hotel Baixa' })
    expect(db.searchDocs('Baixa')[0].id).toBe(d.id)
    db.updateDoc(d.id, { content: 'Flug gestrichen, neuer Plan' })
    expect(db.searchDocs('Baixa')).toHaveLength(0)
    expect(db.searchDocs('gestrichen')[0].id).toBe(d.id)
    db.deleteDoc(d.id)
    expect(db.searchDocs('gestrichen')).toHaveLength(0)
  })

  it('does not crash FTS on quoted or special-character queries', () => {
    db.createDoc({ title: 'T', content: 'inhalt' })
    expect(() => db.searchDocs('was "ist" das? AND OR NOT (')).not.toThrow()
  })

  it('stores todos with theme and due label', () => {
    const theme = db.createTheme('Familie')
    const todo = db.createTodo({ text: 'Zahnarzt anrufen', dueLabel: 'Fr, 16 Uhr', themeId: theme.id })
    expect(db.listTodos()[0]).toMatchObject({
      text: 'Zahnarzt anrufen',
      dueLabel: 'Fr, 16 Uhr',
      themeName: 'Familie',
      done: false
    })
    db.setTodoDone(todo.id, true)
    expect(db.listTodos()[0].done).toBe(true)
  })
})

describe('feed + thread', () => {
  it('builds feed items with parts and pending questions', () => {
    const dump = db.createDump('Idee: wöchentlicher Digest oder eigenes Thema?')
    const session = db.createSession('process_dump', dump.id)
    const theme = db.createTheme('EmaBoard')
    db.createDoc({ title: 'Digest-Idee', content: '- wöchentlich', themeId: theme.id, dumpId: dump.id })
    db.createTodo({ text: 'Digest testen', dueLabel: 'Do', themeId: theme.id, dumpId: dump.id })
    db.addMessage(
      session.id,
      'tool_use',
      JSON.stringify({ t: 'question', id: 'q1', text: 'Eigenes Thema?', options: ['Ja', 'Nein'], answer: null })
    )

    const feed = buildFeed(db)
    expect(feed).toHaveLength(1)
    expect(feed[0].parts).toEqual([
      { kind: 'doc', label: 'Digest-Idee', noteId: 1, themeName: 'EmaBoard' },
      { kind: 'todo', label: 'Digest testen · Do' }
    ])
    expect(feed[0].pendingQuestions).toBe(1)
  })

  it('surfaces the stored session error in the thread', () => {
    const dump = db.createDump('Gehaltstransparenz besprochen')
    const session = db.createSession('process_dump', dump.id)
    db.addMessage(session.id, 'user', dump.content)
    db.setDumpStatus(dump.id, 'failed')
    db.finishSession(session.id, null, 'Failed to spawn Claude Code process')

    const thread = buildThread(db, session.id)
    expect(thread.map((t) => t.type)).toEqual(['user', 'agent'])
    expect(thread[1]).toMatchObject({ type: 'agent' })
    expect((thread[1] as { text: string }).text).toContain('Failed to spawn Claude Code process')
    expect(buildFeed(db)[0].status).toBe('failed')
  })

  it('reconstructs a full thread with question, proposal and filed card', () => {
    const dump = db.createDump('Hero-Zeile testen')
    const session = db.createSession('process_dump', dump.id)
    db.addMessage(session.id, 'user', 'Hero-Zeile testen')
    db.addMessage(
      session.id,
      'tool_use',
      JSON.stringify({ t: 'question', id: 'q1', text: 'Ergänzen?', options: ['Ja', 'Nein'], answer: 'Ja' })
    )
    db.addMessage(session.id, 'user', 'Ja')
    db.addMessage(
      session.id,
      'tool_use',
      JSON.stringify({
        t: 'proposal',
        id: 'p1',
        text: 'So ablegen?',
        rows: [{ label: 'Titel', value: 'Hero' }],
        state: 'accepted',
        committedAt: '2026-08-27 09:31:00'
      })
    )
    db.addMessage(session.id, 'assistant', 'Abgelegt.')
    db.createDoc({ title: 'Hero', content: '- Zeile', dumpId: dump.id })
    db.finishSession(session.id, 'Abgelegt.', null)

    const thread = buildThread(db, session.id)
    const types = thread.map((t) => t.type)
    expect(types).toEqual(['user', 'question', 'user', 'proposal', 'agent', 'filed'])
    const filed = thread.at(-1)
    expect(filed).toMatchObject({ type: 'filed', docTitle: 'Hero', docLines: ['Zeile'] })
  })
})
