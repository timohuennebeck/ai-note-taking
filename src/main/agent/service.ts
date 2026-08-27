import { spawn } from 'child_process'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { query, createSdkMcpServer } from '@anthropic-ai/claude-agent-sdk'
import type { Options, SDKMessage, SDKUserMessage } from '@anthropic-ai/claude-agent-sdk'
import type { LitterDb } from '../db'
import { InteractionRegistry } from './interactions'
import { buildKeplerTools } from './tools'
import { KEPLER_ASK_PROMPT, KEPLER_CHAT_PROMPT, KEPLER_DUMP_PROMPT } from './prompts'
import { anchorQuote, parseAnswer } from '@shared/citations'
import { dayLabel } from '@shared/blocks'
import type { AgentEvent, AnsweredSource } from '@shared/types'

/** Unbounded async queue used as the streaming input for a running session. */
class MessageQueue implements AsyncIterable<SDKUserMessage> {
  private buffer: SDKUserMessage[] = []
  private waiter: ((v: IteratorResult<SDKUserMessage>) => void) | null = null
  private closed = false

  push(text: string): void {
    const msg: SDKUserMessage = {
      type: 'user',
      message: { role: 'user', content: text },
      parent_tool_use_id: null,
      session_id: ''
    }
    if (this.waiter) {
      const w = this.waiter
      this.waiter = null
      w({ value: msg, done: false })
    } else {
      this.buffer.push(msg)
    }
  }

  close(): void {
    this.closed = true
    if (this.waiter) {
      const w = this.waiter
      this.waiter = null
      w({ value: undefined as never, done: true })
    }
  }

  [Symbol.asyncIterator](): AsyncIterator<SDKUserMessage> {
    return {
      next: (): Promise<IteratorResult<SDKUserMessage>> => {
        if (this.buffer.length) {
          return Promise.resolve({ value: this.buffer.shift()!, done: false })
        }
        if (this.closed) return Promise.resolve({ value: undefined as never, done: true })
        return new Promise((resolve) => {
          this.waiter = resolve
        })
      }
    }
  }
}

interface RunningSession {
  queue: MessageQueue
  abort: AbortController
}

export interface AgentServiceOptions {
  db: LitterDb
  /** directory the agent may read/write (the app's library folder) */
  libraryDir: string
  emit: (ev: AgentEvent) => void
}

export class AgentService {
  readonly interactions = new InteractionRegistry()
  private db: LitterDb
  private libraryDir: string
  private emitCb: (ev: AgentEvent) => void
  private running = new Map<number, RunningSession>()

  constructor(opts: AgentServiceOptions) {
    this.db = opts.db
    this.libraryDir = opts.libraryDir
    this.emitCb = opts.emit
  }

  private emit(ev: AgentEvent): void {
    this.emitCb(ev)
  }

  /* ---------------- auth ---------------- */

  getAuthStatus(): { ok: boolean; detail: string } {
    if (process.env.CLAUDE_CODE_OAUTH_TOKEN) return { ok: true, detail: 'CLAUDE_CODE_OAUTH_TOKEN' }
    if (process.env.ANTHROPIC_API_KEY) return { ok: true, detail: 'ANTHROPIC_API_KEY' }
    const creds = path.join(os.homedir(), '.claude', '.credentials.json')
    if (fs.existsSync(creds)) return { ok: true, detail: 'Claude-Login (~/.claude)' }
    // macOS stores subscription credentials in the keychain; the CLI knows how
    // to read them even when the JSON file is absent, so treat an existing
    // ~/.claude directory as "probably logged in".
    if (process.platform === 'darwin' && fs.existsSync(path.join(os.homedir(), '.claude'))) {
      return { ok: true, detail: 'Claude-Login (Keychain)' }
    }
    return {
      ok: false,
      detail:
        'Kein Claude-Login gefunden. Einmalig im Terminal "claude" starten und anmelden (Claude-Abo), dann Litter neu öffnen.'
    }
  }

  /* ---------------- session runners ---------------- */

  private baseOptions(sessionId: number, dumpId: number | null, systemPrompt: string): Options {
    const ctx = {
      sessionId,
      dumpId,
      db: this.db,
      interactions: this.interactions,
      emit: (ev: AgentEvent) => this.emit(ev)
    }
    const server = createSdkMcpServer({
      name: 'litter',
      version: '1.0.0',
      tools: buildKeplerTools(ctx)
    })
    const abort = new AbortController()
    const options: Options = {
      abortController: abort,
      systemPrompt,
      cwd: this.libraryDir,
      // No built-in tools: the agent works exclusively through the litter MCP
      // server, so it can never touch anything outside the app's own data.
      tools: [],
      mcpServers: { litter: server },
      allowedTools: ['mcp__litter__*'],
      permissionMode: 'dontAsk',
      maxTurns: 40,
      persistSession: true,
      env: {
        ...process.env,
        // ask_user / propose_filing block until the user reacts in the UI.
        CLAUDE_CODE_STREAM_CLOSE_TIMEOUT: String(24 * 60 * 60 * 1000)
      },
      stderr: (data) => {
        if (process.env.LITTER_DEBUG) console.error('[agent]', data)
      }
    }
    // Inside Electron there is no system Node on PATH necessarily; run the
    // SDK runtime with Electron's own binary in Node mode.
    if (process.versions.electron) {
      options.spawnClaudeCodeProcess = (spawnOpts) =>
        spawn(process.execPath, spawnOpts.args, {
          cwd: spawnOpts.cwd,
          env: { ...spawnOpts.env, ELECTRON_RUN_AS_NODE: '1' },
          signal: spawnOpts.signal,
          stdio: ['pipe', 'pipe', 'pipe']
        })
    }
    return options
  }

  /** Drive one SDK query loop, persisting messages and emitting events. */
  private async run(
    sessionId: number,
    dumpId: number | null,
    options: Options,
    input: string | MessageQueue,
    onDone: (finalText: string | null, error: string | null) => void
  ): Promise<void> {
    let finalText: string | null = null
    let lastAssistantText = ''
    let error: string | null = null
    try {
      const q = query({ prompt: typeof input === 'string' ? input : input, options })
      for await (const message of q as AsyncIterable<SDKMessage>) {
        if (message.type === 'system' && message.subtype === 'init') {
          this.db.setSdkSessionId(sessionId, message.session_id)
        } else if (message.type === 'assistant') {
          const blocks = message.message.content
          const textParts: string[] = []
          if (Array.isArray(blocks)) {
            for (const b of blocks) {
              if (b.type === 'text' && b.text.trim()) textParts.push(b.text)
            }
          }
          if (textParts.length) {
            lastAssistantText = textParts.join('\n')
            this.db.addMessage(sessionId, 'assistant', lastAssistantText)
            this.emit({ type: 'agent_text', sessionId, text: lastAssistantText })
          }
          if (message.error) {
            error = `Agent-Fehler: ${message.error}`
          }
        } else if (message.type === 'result') {
          if (message.subtype === 'success') {
            finalText = message.result || lastAssistantText
          } else {
            error = message.errors?.join('; ') || message.subtype
          }
          // Streaming-input sessions stay open for more user turns; we end the
          // turn here and use `resume` for follow-ups instead.
          if (typeof input !== 'string') input.close()
        }
      }
    } catch (e) {
      error = e instanceof Error ? e.message : String(e)
    } finally {
      this.running.delete(sessionId)
      this.interactions.cancelSession(sessionId)
      onDone(finalText ?? lastAssistantText ?? null, error)
    }
  }

  /* ---------------- public API ---------------- */

  /** Process a new dump: split, file, ask questions when unsure. */
  processDump(dumpId: number): { sessionId: number } {
    const dump = this.db.getDump(dumpId)
    if (!dump) throw new Error(`dump ${dumpId} not found`)
    const session = this.db.createSession('process_dump', dumpId)
    this.db.setDumpStatus(dumpId, 'processing')
    this.db.addMessage(session.id, 'user', dump.content)
    this.emit({ type: 'session', sessionId: session.id, dumpId, kind: 'process_dump' })

    const options = this.baseOptions(session.id, dumpId, KEPLER_DUMP_PROMPT)
    const queue = new MessageQueue()
    this.running.set(session.id, { queue, abort: options.abortController! })
    queue.push(
      `Neuer Dump (id ${dumpId}, gerade eingegangen):\n\n"""\n${dump.content}\n"""\n\nLege ihn ab.`
    )

    void this.run(session.id, dumpId, options, queue, (finalText, error) => {
      if (error) {
        this.db.setDumpStatus(dumpId, 'failed')
        this.db.finishSession(session.id, null, error)
        this.emit({ type: 'error', sessionId: session.id, message: error })
      } else {
        this.db.setDumpStatus(dumpId, 'processed')
        this.db.finishSession(session.id, finalText, null)
        this.emit({ type: 'filed', sessionId: session.id, dumpId, summary: finalText ?? '' })
      }
      this.emit({ type: 'done', sessionId: session.id })
    })
    return { sessionId: session.id }
  }

  /** Ask a question against the notes; emits an anchored, cited answer. */
  ask(questionText: string): { sessionId: number } {
    const session = this.db.createSession('ask', null)
    this.db.addMessage(session.id, 'user', questionText)
    this.emit({ type: 'session', sessionId: session.id, dumpId: null, kind: 'ask' })

    const options = this.baseOptions(session.id, null, KEPLER_ASK_PROMPT)
    void this.run(session.id, null, options, questionText, (finalText, error) => {
      if (error) {
        this.db.finishSession(session.id, null, error)
        this.emit({ type: 'error', sessionId: session.id, message: error })
      } else {
        const parsed = parseAnswer(finalText ?? '')
        const sources: AnsweredSource[] = []
        for (const c of parsed.citations) {
          const doc = this.db.getDoc(c.noteId)
          if (!doc) continue
          const range = anchorQuote(doc.content, c.quote)
          sources.push({
            noteId: doc.id,
            title: doc.title,
            quote: c.quote,
            date: dayLabel(doc.updatedAt),
            start: range?.start ?? null,
            end: range?.end ?? null
          })
        }
        this.db.addMessage(
          session.id,
          'tool_use',
          JSON.stringify({ t: 'answer', text: parsed.text, sources })
        )
        this.db.finishSession(session.id, parsed.text, null)
        this.emit({ type: 'answer', sessionId: session.id, text: parsed.text, sources })
      }
      this.emit({ type: 'done', sessionId: session.id })
    })
    return { sessionId: session.id }
  }

  /** Answer a pending clarifying question. */
  answerQuestion(sessionId: number, questionId: string, answer: string): void {
    this.db.addMessage(sessionId, 'user', answer)
    if (!this.interactions.answer(sessionId, questionId, answer)) {
      // Session process is gone (e.g. app restart) — resume the SDK session.
      this.continueSession(sessionId, answer)
    }
  }

  resolveProposal(sessionId: number, proposalId: string, accepted: boolean): void {
    this.db.addMessage(sessionId, 'user', accepted ? 'Passt, ablegen' : 'Korrigieren')
    if (!this.interactions.resolveProposal(sessionId, proposalId, accepted)) {
      this.continueSession(sessionId, accepted ? 'Passt, bitte so ablegen.' : 'Bitte korrigieren.')
    }
  }

  /** Free-form follow-up into a dump conversation. */
  sendChatMessage(sessionId: number, text: string): void {
    this.db.addMessage(sessionId, 'user', text)
    const running = this.running.get(sessionId)
    if (running) {
      running.queue.push(text)
      return
    }
    this.continueSession(sessionId, text)
  }

  /** Resume a finished SDK session with a new user message. */
  private continueSession(sessionId: number, text: string): void {
    const session = this.db.getSession(sessionId)
    if (!session) return
    const options = this.baseOptions(sessionId, session.dumpId, KEPLER_CHAT_PROMPT)
    if (session.sdkSessionId) options.resume = session.sdkSessionId
    const queue = new MessageQueue()
    this.running.set(sessionId, { queue, abort: options.abortController! })
    queue.push(text)
    this.emit({ type: 'thinking', sessionId })
    void this.run(sessionId, session.dumpId, options, queue, (finalText, error) => {
      if (error) {
        this.emit({ type: 'error', sessionId, message: error })
      } else if (finalText) {
        this.db.finishSession(sessionId, finalText, null)
      }
      this.emit({ type: 'done', sessionId })
    })
  }

  /** Signal a running session's input stream that no more user turns follow. */
  endTurn(sessionId: number): void {
    this.running.get(sessionId)?.queue.close()
  }

  shutdown(): void {
    for (const [sessionId, r] of this.running) {
      this.interactions.cancelSession(sessionId)
      r.queue.close()
      r.abort.abort()
    }
    this.running.clear()
  }
}
