import fs from 'fs'
import os from 'os'
import path from 'path'
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

  it('strips emoji that ended up in theme names on open', () => {
    const file = path.join(os.tmpdir(), `litter-emoji-${process.pid}.sqlite3`)
    for (const suffix of ['', '-wal', '-shm']) {
      try { fs.unlinkSync(file + suffix) } catch { /* not there */ }
    }
    const first = new LitterDb(file)
    first.db.prepare("INSERT INTO themes (name) VALUES ('🗂️ EmaBoard')").run()
    first.db.prepare("INSERT INTO themes (name) VALUES ('✈️  Lissabon')").run()
    first.db.prepare("INSERT INTO themes (name) VALUES ('Familie')").run()
    first.close()

    // reopening runs the migration
    const second = new LitterDb(file)
    expect(second.listThemes().map((t) => t.name)).toEqual(['EmaBoard', 'Familie', 'Lissabon'])
    second.close()
    for (const suffix of ['', '-wal', '-shm']) {
      try { fs.unlinkSync(file + suffix) } catch { /* not there */ }
    }
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

  it('links appended documents to the dump via filings', () => {
    const existing = db.createDoc({ title: 'Meeting-Notiz', content: '- alter Stand' })
    const dump = db.createDump('Heute wieder Gehaltstransparenz besprochen')
    db.appendToDoc(existing.id, '- neuer Stand')
    db.addFiling(dump.id, existing.id, 'appended')

    const docs = db.docsForDump(dump.id)
    expect(docs).toHaveLength(1)
    expect(docs[0]).toMatchObject({ id: existing.id, action: 'appended' })

    const feed = buildFeed(db)
    expect(feed[0].parts).toEqual([
      { kind: 'doc', label: 'Meeting-Notiz', noteId: existing.id, themeName: undefined, action: 'appended' }
    ])
  })

  it('deletes a dump with its sessions and filings, keeping documents', () => {
    const dump = db.createDump('Lass Frust Phase6 umbenennen')
    const session = db.createSession('process_dump', dump.id)
    db.addMessage(session.id, 'user', dump.content)
    const doc = db.createDoc({ title: 'Phase6', content: '- Frust', dumpId: dump.id })
    db.addFiling(dump.id, doc.id, 'created')

    db.deleteDump(dump.id)

    expect(db.getDump(dump.id)).toBeNull()
    expect(buildFeed(db)).toHaveLength(0)
    expect(db.listMessages(session.id)).toHaveLength(0)
    // the filed document survives — only the history entry is gone
    expect(db.getDoc(doc.id)?.title).toBe('Phase6')
  })

  it('renames a document without touching its content or theme', () => {
    const theme = db.createTheme('Arbeit & Karriere')
    const doc = db.createDoc({ title: 'Phase6', content: '- Frust', themeId: theme.id })
    db.updateDoc(doc.id, { title: 'Frust Phase6' })
    const after = db.getDoc(doc.id)
    expect(after).toMatchObject({ title: 'Frust Phase6', content: '- Frust', themeName: 'Arbeit & Karriere' })
    expect(db.searchDocs('Frust')[0].id).toBe(doc.id)
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
      { kind: 'doc', label: 'Digest-Idee', noteId: 1, themeName: 'EmaBoard', action: 'created' },
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

    const { entries, running } = buildThread(db, session.id)
    expect(entries.map((t) => t.type)).toEqual(['user', 'agent'])
    expect(running).toBe(false)
    expect((entries[1] as { text: string }).text).toContain('Failed to spawn Claude Code process')
    expect(buildFeed(db)[0].status).toBe('failed')
  })

  it('reports a still-running session so the chat can show the indicator', () => {
    const dump = db.createDump('Zahnarzt anrufen')
    const session = db.createSession('process_dump', dump.id)
    db.addMessage(session.id, 'user', dump.content)
    db.setDumpStatus(dump.id, 'processing')

    expect(buildThread(db, session.id).running).toBe(true)
    db.finishSession(session.id, 'Abgelegt.', null)
    expect(buildThread(db, session.id).running).toBe(false)
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

    const { entries, running } = buildThread(db, session.id)
    expect(entries.map((t) => t.type)).toEqual(['user', 'question', 'user', 'proposal', 'agent', 'filed'])
    expect(running).toBe(false)
    expect(entries.at(-1)).toMatchObject({ type: 'filed', docTitle: 'Hero', docLines: ['Zeile'] })
  })
})
