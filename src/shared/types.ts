/** Shared domain types used by main, preload and renderer. */

export type DumpStatus = 'pending' | 'processing' | 'processed' | 'failed'

export interface Dump {
  id: number
  content: string
  createdAt: string
  processedAt: string | null
  status: DumpStatus
}

export interface Theme {
  id: number
  name: string
  description: string | null
  emoji: string | null
  createdAt: string
  updatedAt: string
  /** filled by list queries */
  docCount: number
}

/** A "Dokument" in the UI. Content is markdown; blocks are derived for display. */
export interface Doc {
  id: number
  dumpId: number | null
  themeId: number | null
  themeName: string | null
  title: string
  content: string
  createdAt: string
  updatedAt: string
}

export interface Todo {
  id: number
  text: string
  /** human label like "Fr, 16 Uhr" | "Heute" | "12. Sep" */
  dueLabel: string | null
  themeName: string | null
  noteId: number | null
  dumpId: number | null
  done: boolean
  createdAt: string
}

export type SessionKind = 'process_dump' | 'chat' | 'ask' | 'reorganize'

export interface AgentSession {
  id: number
  dumpId: number | null
  kind: SessionKind
  sdkSessionId: string | null
  startedAt: string
  finishedAt: string | null
  summary: string | null
  error: string | null
}

export type MessageRole = 'user' | 'assistant' | 'tool_use' | 'tool_result' | 'system'

export interface AgentMessage {
  id: number
  sessionId: number
  role: MessageRole
  /** plain text, or JSON payload for structured entries (questions, proposals, filings) */
  content: string
  createdAt: string
}

/** What the agent did to a single dump — drives the feed + history rows. */
export interface FilingPart {
  kind: 'doc' | 'todo'
  label: string
  noteId?: number
  themeName?: string
  /** whether the dump created this document or was appended to it */
  action?: 'created' | 'appended'
}

export interface FeedItem {
  dumpId: number
  sessionId: number | null
  time: string
  createdAt: string
  text: string
  status: DumpStatus
  pendingQuestions: number
  parts: FilingPart[]
}

/** A source citation for an ask answer, already anchored against the note. */
export interface AnsweredSource {
  noteId: number
  title: string
  quote: string
  date: string
  /** character range in the note content, when the quote anchored */
  start: number | null
  end: number | null
}

/* ---------- structured chat thread (per dump session) ---------- */

export interface ProposalRow {
  label: string
  value: string
}

export type ThreadEntry =
  | { type: 'user'; text: string; time?: string }
  | { type: 'agent'; text: string }
  | {
      type: 'question'
      text: string
      options: string[]
      /** chosen answer once the user picked/typed one */
      answer: string | null
      questionId: string
    }
  | {
      type: 'proposal'
      text: string
      rows: ProposalRow[]
      proposalId: string
      state: 'open' | 'accepted' | 'rejected'
      committedAt: string | null
    }
  | { type: 'filed'; text: string; noteId: number | null; docTitle: string | null; docDate: string | null; docLines: string[] }

/** A thread plus whether its agent session is still working. */
export interface ThreadState {
  entries: ThreadEntry[]
  /** session started but not finished — Kepler is still on it */
  running: boolean
}

/* ---------- agent events streamed to the renderer ---------- */

export type AgentEvent =
  | { type: 'session'; sessionId: number; dumpId: number | null; kind: SessionKind }
  | { type: 'thinking'; sessionId: number }
  | { type: 'agent_text'; sessionId: number; text: string }
  | { type: 'question'; sessionId: number; questionId: string; text: string; options: string[] }
  | { type: 'proposal'; sessionId: number; proposalId: string; text: string; rows: ProposalRow[] }
  | { type: 'filed'; sessionId: number; dumpId: number | null; summary: string }
  | { type: 'answer'; sessionId: number; text: string; sources: AnsweredSource[] }
  | { type: 'data_changed'; sessionId: number }
  | { type: 'error'; sessionId: number; message: string }
  | { type: 'done'; sessionId: number }

/* ---------- renderer-facing API (implemented in preload) ---------- */

export interface LitterApi {
  createDump(content: string): Promise<{ dumpId: number; sessionId: number }>
  /** re-run agent processing for a failed dump */
  retryDump(dumpId: number): Promise<{ sessionId: number }>
  /** remove a dump and its sessions from the history */
  deleteDump(dumpId: number): Promise<void>
  ask(question: string): Promise<{ sessionId: number }>
  /** answer a pending agent question (picked chip or typed text) */
  answerQuestion(sessionId: number, questionId: string, answer: string): Promise<void>
  /** resolve a pending filing proposal */
  resolveProposal(sessionId: number, proposalId: string, accepted: boolean): Promise<void>
  /** free-form user message into a running or finished dump session */
  sendChatMessage(sessionId: number, text: string): Promise<void>

  listFeed(limit?: number): Promise<FeedItem[]>
  getThread(sessionId: number): Promise<ThreadState>
  getSessionForDump(dumpId: number): Promise<number | null>

  /** themes are created and maintained by the agent, never from the UI */
  listThemes(): Promise<Theme[]>

  listDocs(themeId?: number | null): Promise<Doc[]>
  getDoc(id: number): Promise<Doc | null>
  updateDoc(id: number, patch: { title?: string; content?: string }): Promise<void>
  deleteDoc(id: number): Promise<void>
  setDocTheme(id: number, themeId: number | null): Promise<void>

  listTodos(): Promise<Todo[]>
  toggleTodo(id: number, done: boolean): Promise<void>

  getAuthStatus(): Promise<{ ok: boolean; detail: string }>

  onAgentEvent(handler: (ev: AgentEvent) => void): () => void
}
