import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'
import type {
  AgentMessage,
  AgentSession,
  Doc,
  Dump,
  DumpStatus,
  MessageRole,
  SessionKind,
  Theme,
  Todo
} from '@shared/types'

const SCHEMA = `
CREATE TABLE IF NOT EXISTS dumps (
  id            INTEGER PRIMARY KEY,
  content       TEXT NOT NULL,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  processed_at  TEXT,
  status        TEXT NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending', 'processing', 'processed', 'failed'))
);

CREATE TABLE IF NOT EXISTS themes (
  id            INTEGER PRIMARY KEY,
  name          TEXT NOT NULL UNIQUE,
  description   TEXT,
  emoji         TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS notes (
  id            INTEGER PRIMARY KEY,
  dump_id       INTEGER REFERENCES dumps(id) ON DELETE SET NULL,
  theme_id      INTEGER REFERENCES themes(id) ON DELETE SET NULL,
  title         TEXT NOT NULL,
  content       TEXT NOT NULL DEFAULT '',
  position      INTEGER NOT NULL DEFAULT 0,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_notes_theme ON notes(theme_id);
CREATE INDEX IF NOT EXISTS idx_notes_dump ON notes(dump_id);

CREATE TABLE IF NOT EXISTS todos (
  id            INTEGER PRIMARY KEY,
  text          TEXT NOT NULL,
  due_label     TEXT,
  theme_id      INTEGER REFERENCES themes(id) ON DELETE SET NULL,
  note_id       INTEGER REFERENCES notes(id) ON DELETE SET NULL,
  dump_id       INTEGER REFERENCES dumps(id) ON DELETE SET NULL,
  done          INTEGER NOT NULL DEFAULT 0,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS filings (
  id            INTEGER PRIMARY KEY,
  dump_id       INTEGER NOT NULL REFERENCES dumps(id) ON DELETE CASCADE,
  note_id       INTEGER NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
  action        TEXT NOT NULL DEFAULT 'created' CHECK (action IN ('created', 'appended')),
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_filings_dump ON filings(dump_id);

CREATE TABLE IF NOT EXISTS agent_sessions (
  id             INTEGER PRIMARY KEY,
  dump_id        INTEGER REFERENCES dumps(id) ON DELETE SET NULL,
  kind           TEXT NOT NULL DEFAULT 'process_dump'
                 CHECK (kind IN ('process_dump', 'chat', 'ask', 'reorganize')),
  sdk_session_id TEXT,
  started_at     TEXT NOT NULL DEFAULT (datetime('now')),
  finished_at    TEXT,
  summary        TEXT,
  error          TEXT
);
CREATE INDEX IF NOT EXISTS idx_sessions_dump ON agent_sessions(dump_id);

CREATE TABLE IF NOT EXISTS agent_messages (
  id            INTEGER PRIMARY KEY,
  session_id    INTEGER NOT NULL REFERENCES agent_sessions(id) ON DELETE CASCADE,
  role          TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'tool_use', 'tool_result', 'system')),
  content       TEXT NOT NULL,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_messages_session ON agent_messages(session_id);

CREATE VIRTUAL TABLE IF NOT EXISTS notes_fts USING fts5(
  title, content, content=notes, content_rowid=id
);
CREATE TRIGGER IF NOT EXISTS notes_ai AFTER INSERT ON notes BEGIN
  INSERT INTO notes_fts(rowid, title, content) VALUES (new.id, new.title, new.content);
END;
CREATE TRIGGER IF NOT EXISTS notes_ad AFTER DELETE ON notes BEGIN
  INSERT INTO notes_fts(notes_fts, rowid, title, content) VALUES ('delete', old.id, old.title, old.content);
END;
CREATE TRIGGER IF NOT EXISTS notes_au AFTER UPDATE ON notes BEGIN
  INSERT INTO notes_fts(notes_fts, rowid, title, content) VALUES ('delete', old.id, old.title, old.content);
  INSERT INTO notes_fts(rowid, title, content) VALUES (new.id, new.title, new.content);
END;
`

interface DumpRow {
  id: number
  content: string
  created_at: string
  processed_at: string | null
  status: DumpStatus
}
interface ThemeRow {
  id: number
  name: string
  description: string | null
  emoji: string | null
  created_at: string
  updated_at: string
  doc_count?: number
}
interface NoteRow {
  id: number
  dump_id: number | null
  theme_id: number | null
  theme_name?: string | null
  title: string
  content: string
  created_at: string
  updated_at: string
}
interface TodoRow {
  id: number
  text: string
  due_label: string | null
  theme_name?: string | null
  note_id: number | null
  dump_id: number | null
  done: number
  created_at: string
}
interface SessionRow {
  id: number
  dump_id: number | null
  kind: SessionKind
  sdk_session_id: string | null
  started_at: string
  finished_at: string | null
  summary: string | null
  error: string | null
}
interface MessageRow {
  id: number
  session_id: number
  role: MessageRole
  content: string
  created_at: string
}

const toDump = (r: DumpRow): Dump => ({
  id: r.id,
  content: r.content,
  createdAt: r.created_at,
  processedAt: r.processed_at,
  status: r.status
})
const toTheme = (r: ThemeRow): Theme => ({
  id: r.id,
  name: r.name,
  description: r.description,
  emoji: r.emoji,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
  docCount: r.doc_count ?? 0
})
const toDoc = (r: NoteRow): Doc => ({
  id: r.id,
  dumpId: r.dump_id,
  themeId: r.theme_id,
  themeName: r.theme_name ?? null,
  title: r.title,
  content: r.content,
  createdAt: r.created_at,
  updatedAt: r.updated_at
})
const toTodo = (r: TodoRow): Todo => ({
  id: r.id,
  text: r.text,
  dueLabel: r.due_label,
  themeName: r.theme_name ?? null,
  noteId: r.note_id,
  dumpId: r.dump_id,
  done: !!r.done,
  createdAt: r.created_at
})
const toSession = (r: SessionRow): AgentSession => ({
  id: r.id,
  dumpId: r.dump_id,
  kind: r.kind,
  sdkSessionId: r.sdk_session_id,
  startedAt: r.started_at,
  finishedAt: r.finished_at,
  summary: r.summary,
  error: r.error
})
const toMessage = (r: MessageRow): AgentMessage => ({
  id: r.id,
  sessionId: r.session_id,
  role: r.role,
  content: r.content,
  createdAt: r.created_at
})

export class LitterDb {
  readonly db: Database.Database

  constructor(dbPath: string) {
    if (dbPath !== ':memory:') fs.mkdirSync(path.dirname(dbPath), { recursive: true })
    this.db = new Database(dbPath)
    this.db.pragma('journal_mode = WAL')
    this.db.pragma('foreign_keys = ON')
    this.db.exec(SCHEMA)
  }

  close(): void {
    this.db.close()
  }

  /* ---------- dumps ---------- */

  createDump(content: string): Dump {
    const id = this.db.prepare('INSERT INTO dumps (content) VALUES (?)').run(content)
      .lastInsertRowid as number
    return this.getDump(id)!
  }

  getDump(id: number): Dump | null {
    const r = this.db.prepare('SELECT * FROM dumps WHERE id = ?').get(id) as DumpRow | undefined
    return r ? toDump(r) : null
  }

  listDumps(limit = 100): Dump[] {
    const rows = this.db
      .prepare('SELECT * FROM dumps ORDER BY id DESC LIMIT ?')
      .all(limit) as DumpRow[]
    return rows.map(toDump)
  }

  setDumpStatus(id: number, status: DumpStatus): void {
    const processed = status === 'processed' ? "datetime('now')" : 'processed_at'
    this.db
      .prepare(`UPDATE dumps SET status = ?, processed_at = ${processed} WHERE id = ?`)
      .run(status, id)
  }

  /* ---------- themes ---------- */

  listThemes(): Theme[] {
    const rows = this.db
      .prepare(
        `SELECT t.*, (SELECT COUNT(*) FROM notes n WHERE n.theme_id = t.id) AS doc_count
         FROM themes t ORDER BY t.name COLLATE NOCASE`
      )
      .all() as ThemeRow[]
    return rows.map(toTheme)
  }

  getTheme(id: number): Theme | null {
    const r = this.db.prepare('SELECT * FROM themes WHERE id = ?').get(id) as ThemeRow | undefined
    return r ? toTheme(r) : null
  }

  getThemeByName(name: string): Theme | null {
    const r = this.db
      .prepare('SELECT * FROM themes WHERE name = ? COLLATE NOCASE')
      .get(name) as ThemeRow | undefined
    return r ? toTheme(r) : null
  }

  createTheme(name: string, description?: string | null, emoji?: string | null): Theme {
    const existing = this.getThemeByName(name)
    if (existing) return existing
    const id = this.db
      .prepare('INSERT INTO themes (name, description, emoji) VALUES (?, ?, ?)')
      .run(name, description ?? null, emoji ?? null).lastInsertRowid as number
    return this.getTheme(id)!
  }

  updateTheme(id: number, patch: { name?: string; description?: string | null }): void {
    const cur = this.getTheme(id)
    if (!cur) return
    this.db
      .prepare(
        "UPDATE themes SET name = ?, description = ?, updated_at = datetime('now') WHERE id = ?"
      )
      .run(patch.name ?? cur.name, patch.description !== undefined ? patch.description : cur.description, id)
  }

  deleteTheme(id: number): void {
    this.db.prepare('DELETE FROM themes WHERE id = ?').run(id)
  }

  /* ---------- notes / docs ---------- */

  listDocs(themeId?: number | null): Doc[] {
    const base = `SELECT n.*, t.name AS theme_name FROM notes n LEFT JOIN themes t ON t.id = n.theme_id`
    const rows = (
      themeId == null
        ? this.db.prepare(`${base} ORDER BY n.updated_at DESC`).all()
        : this.db.prepare(`${base} WHERE n.theme_id = ? ORDER BY n.updated_at DESC`).all(themeId)
    ) as NoteRow[]
    return rows.map(toDoc)
  }

  getDoc(id: number): Doc | null {
    const r = this.db
      .prepare(
        `SELECT n.*, t.name AS theme_name FROM notes n LEFT JOIN themes t ON t.id = n.theme_id WHERE n.id = ?`
      )
      .get(id) as NoteRow | undefined
    return r ? toDoc(r) : null
  }

  findDocByTitle(title: string): Doc | null {
    const r = this.db
      .prepare(
        `SELECT n.*, t.name AS theme_name FROM notes n LEFT JOIN themes t ON t.id = n.theme_id
         WHERE n.title = ? COLLATE NOCASE ORDER BY n.updated_at DESC`
      )
      .get(title) as NoteRow | undefined
    return r ? toDoc(r) : null
  }

  createDoc(args: {
    title: string
    content?: string
    themeId?: number | null
    dumpId?: number | null
  }): Doc {
    const id = this.db
      .prepare('INSERT INTO notes (title, content, theme_id, dump_id) VALUES (?, ?, ?, ?)')
      .run(args.title, args.content ?? '', args.themeId ?? null, args.dumpId ?? null)
      .lastInsertRowid as number
    return this.getDoc(id)!
  }

  updateDoc(id: number, patch: { title?: string; content?: string; themeId?: number | null }): void {
    const cur = this.getDoc(id)
    if (!cur) return
    this.db
      .prepare(
        "UPDATE notes SET title = ?, content = ?, theme_id = ?, updated_at = datetime('now') WHERE id = ?"
      )
      .run(
        patch.title ?? cur.title,
        patch.content ?? cur.content,
        patch.themeId !== undefined ? patch.themeId : cur.themeId,
        id
      )
  }

  appendToDoc(id: number, markdown: string): void {
    const cur = this.getDoc(id)
    if (!cur) return
    const joined = cur.content.trim().length ? `${cur.content.replace(/\s+$/, '')}\n\n${markdown}` : markdown
    this.updateDoc(id, { content: joined })
  }

  deleteDoc(id: number): void {
    this.db.prepare('DELETE FROM notes WHERE id = ?').run(id)
  }

  searchDocs(query: string, limit = 12): Array<Doc & { snippet: string }> {
    // Escape the FTS query: quote each term to avoid syntax errors on user input.
    const safe = query
      .split(/\s+/)
      .filter(Boolean)
      .map((t) => `"${t.replace(/"/g, '""')}"`)
      .join(' ')
    if (!safe) return []
    const rows = this.db
      .prepare(
        `SELECT n.*, t.name AS theme_name,
                snippet(notes_fts, 1, '', '', ' … ', 18) AS snippet
         FROM notes_fts f
         JOIN notes n ON n.id = f.rowid
         LEFT JOIN themes t ON t.id = n.theme_id
         WHERE notes_fts MATCH ?
         ORDER BY rank LIMIT ?`
      )
      .all(safe, limit) as Array<NoteRow & { snippet: string }>
    return rows.map((r) => ({ ...toDoc(r), snippet: r.snippet }))
  }

  /* ---------- todos ---------- */

  listTodos(): Todo[] {
    const rows = this.db
      .prepare(
        `SELECT td.*, t.name AS theme_name FROM todos td
         LEFT JOIN themes t ON t.id = td.theme_id
         ORDER BY td.done ASC, td.id DESC`
      )
      .all() as TodoRow[]
    return rows.map(toTodo)
  }

  createTodo(args: {
    text: string
    dueLabel?: string | null
    themeId?: number | null
    noteId?: number | null
    dumpId?: number | null
  }): Todo {
    const id = this.db
      .prepare(
        'INSERT INTO todos (text, due_label, theme_id, note_id, dump_id) VALUES (?, ?, ?, ?, ?)'
      )
      .run(args.text, args.dueLabel ?? null, args.themeId ?? null, args.noteId ?? null, args.dumpId ?? null)
      .lastInsertRowid as number
    const r = this.db
      .prepare(
        `SELECT td.*, t.name AS theme_name FROM todos td LEFT JOIN themes t ON t.id = td.theme_id WHERE td.id = ?`
      )
      .get(id) as TodoRow
    return toTodo(r)
  }

  setTodoDone(id: number, done: boolean): void {
    this.db.prepare('UPDATE todos SET done = ? WHERE id = ?').run(done ? 1 : 0, id)
  }

  todosForDump(dumpId: number): Todo[] {
    const rows = this.db
      .prepare(
        `SELECT td.*, t.name AS theme_name FROM todos td
         LEFT JOIN themes t ON t.id = td.theme_id WHERE td.dump_id = ? ORDER BY td.id`
      )
      .all(dumpId) as TodoRow[]
    return rows.map(toTodo)
  }

  /** Record that a dump was filed into a note (created or appended). */
  addFiling(dumpId: number, noteId: number, action: 'created' | 'appended'): void {
    this.db
      .prepare('INSERT INTO filings (dump_id, note_id, action) VALUES (?, ?, ?)')
      .run(dumpId, noteId, action)
  }

  /** Every document this dump was filed into: created from it OR appended to. */
  docsForDump(dumpId: number): Array<Doc & { action: 'created' | 'appended' }> {
    const rows = this.db
      .prepare(
        `SELECT n.*, t.name AS theme_name,
                COALESCE(
                  (SELECT f.action FROM filings f
                   WHERE f.dump_id = @id AND f.note_id = n.id ORDER BY f.id LIMIT 1),
                  'created'
                ) AS action
         FROM notes n
         LEFT JOIN themes t ON t.id = n.theme_id
         WHERE n.dump_id = @id
            OR n.id IN (SELECT note_id FROM filings WHERE dump_id = @id)
         ORDER BY n.position, n.id`
      )
      .all({ id: dumpId }) as Array<NoteRow & { action: 'created' | 'appended' }>
    return rows.map((r) => ({ ...toDoc(r), action: r.action }))
  }

  /* ---------- agent sessions / messages ---------- */

  createSession(kind: SessionKind, dumpId?: number | null): AgentSession {
    const id = this.db
      .prepare('INSERT INTO agent_sessions (kind, dump_id) VALUES (?, ?)')
      .run(kind, dumpId ?? null).lastInsertRowid as number
    return this.getSession(id)!
  }

  getSession(id: number): AgentSession | null {
    const r = this.db.prepare('SELECT * FROM agent_sessions WHERE id = ?').get(id) as
      | SessionRow
      | undefined
    return r ? toSession(r) : null
  }

  latestSessionForDump(dumpId: number): AgentSession | null {
    const r = this.db
      .prepare('SELECT * FROM agent_sessions WHERE dump_id = ? ORDER BY id DESC')
      .get(dumpId) as SessionRow | undefined
    return r ? toSession(r) : null
  }

  setSdkSessionId(id: number, sdkSessionId: string): void {
    this.db
      .prepare('UPDATE agent_sessions SET sdk_session_id = ? WHERE id = ?')
      .run(sdkSessionId, id)
  }

  finishSession(id: number, summary: string | null, error: string | null): void {
    this.db
      .prepare(
        "UPDATE agent_sessions SET finished_at = datetime('now'), summary = ?, error = ? WHERE id = ?"
      )
      .run(summary, error, id)
  }

  addMessage(sessionId: number, role: MessageRole, content: string): AgentMessage {
    const id = this.db
      .prepare('INSERT INTO agent_messages (session_id, role, content) VALUES (?, ?, ?)')
      .run(sessionId, role, content).lastInsertRowid as number
    const r = this.db.prepare('SELECT * FROM agent_messages WHERE id = ?').get(id) as MessageRow
    return toMessage(r)
  }

  updateMessageContent(id: number, content: string): void {
    this.db.prepare('UPDATE agent_messages SET content = ? WHERE id = ?').run(content, id)
  }

  listMessages(sessionId: number): AgentMessage[] {
    const rows = this.db
      .prepare('SELECT * FROM agent_messages WHERE session_id = ? ORDER BY id')
      .all(sessionId) as MessageRow[]
    return rows.map(toMessage)
  }
}
