import { randomUUID } from 'crypto'
import type { LitterDb } from '../db'
import { InteractionRegistry } from './interactions'
import { anchorQuote } from '@shared/citations'
import { dayLabel } from '@shared/blocks'
import type { AgentEvent, AnsweredSource } from '@shared/types'

/**
 * Scripted stand-in for the Claude agent (LITTER_FAKE_AGENT=1).
 * Lets the full UI loop — dump, Rückfragen, proposal, filing, ask with
 * citations — run without a Claude login. Used for demos and E2E tests.
 */
export class FakeAgentService {
  readonly interactions = new InteractionRegistry()
  private db: LitterDb
  private emit: (ev: AgentEvent) => void

  constructor(opts: { db: LitterDb; emit: (ev: AgentEvent) => void }) {
    this.db = opts.db
    this.emit = opts.emit
  }

  getAuthStatus(): { ok: boolean; detail: string } {
    return { ok: true, detail: 'Demo-Modus (LITTER_FAKE_AGENT)' }
  }

  private titleFor(content: string): string {
    const words = content
      .replace(/[\n\r]+/g, ' ')
      .split(/\s+/)
      .filter(Boolean)
    return words.slice(0, 3).join(' ').replace(/[.,;:!?]+$/, '') || 'Ohne Titel'
  }

  private matchTheme(content: string): { name: string; isNew: boolean } {
    const lower = content.toLowerCase()
    for (const t of this.db.listThemes()) {
      const needles = [t.name.toLowerCase(), ...(t.description ?? '').toLowerCase().split(/[,;]\s*/)]
      if (needles.some((n) => n.length > 2 && lower.includes(n))) {
        return { name: t.name, isNew: false }
      }
    }
    const first = this.db.listThemes()[0]
    if (first) return { name: first.name, isNew: false }
    return { name: 'Notizen', isNew: true }
  }

  processDump(dumpId: number): { sessionId: number } {
    const dump = this.db.getDump(dumpId)
    if (!dump) throw new Error(`dump ${dumpId} not found`)
    const session = this.db.createSession('process_dump', dumpId)
    this.db.setDumpStatus(dumpId, 'processing')
    this.db.addMessage(session.id, 'user', dump.content)
    this.emit({ type: 'session', sessionId: session.id, dumpId, kind: 'process_dump' })
    void this.script(session.id, dumpId, dump.content)
    return { sessionId: session.id }
  }

  private async script(sessionId: number, dumpId: number, content: string): Promise<void> {
    const delay = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms))
    await delay(400)

    const ambiguous = /\boder\b|\?/i.test(content)
    const theme = this.matchTheme(content)
    let chosenTheme = theme.name

    if (ambiguous) {
      const qid = randomUUID()
      const qText = `Bevor ich ablege: gehört das zum Thema „${theme.name}“, oder soll ich ein neues Thema anlegen?`
      const options = [`Zu ${theme.name}`, 'Neues Thema', 'Nur festhalten']
      const msg = this.db.addMessage(
        sessionId,
        'tool_use',
        JSON.stringify({ t: 'question', id: qid, text: qText, options, answer: null })
      )
      this.emit({ type: 'question', sessionId, questionId: qid, text: qText, options })
      const answer = await this.interactions.waitForAnswer(sessionId, qid)
      this.db.updateMessageContent(
        msg.id,
        JSON.stringify({ t: 'question', id: qid, text: qText, options, answer })
      )
      if (answer === 'Neues Thema') chosenTheme = this.titleFor(content)

      const pid = randomUUID()
      const rows = [
        { label: 'Titel', value: `${this.titleFor(content)} · neu` },
        { label: 'Thema', value: chosenTheme },
        { label: 'Todo', value: /anruf|erledig|bis\s/i.test(content) ? 'erkannt' : 'keins' }
      ]
      const pText = 'Dann würde ich es so ablegen — passt das?'
      const pmsg = this.db.addMessage(
        sessionId,
        'tool_use',
        JSON.stringify({ t: 'proposal', id: pid, text: pText, rows, state: 'open', committedAt: null })
      )
      this.emit({ type: 'proposal', sessionId, proposalId: pid, text: pText, rows })
      const accepted = await this.interactions.waitForProposal(sessionId, pid)
      this.db.updateMessageContent(
        pmsg.id,
        JSON.stringify({
          t: 'proposal',
          id: pid,
          text: pText,
          rows,
          state: accepted ? 'accepted' : 'rejected',
          committedAt: accepted ? new Date().toISOString() : null
        })
      )
      if (!accepted) {
        this.db.addMessage(sessionId, 'assistant', 'Alles klar — nichts ist abgelegt. Sag mir, was anders sein soll.')
        this.emit({
          type: 'agent_text',
          sessionId,
          text: 'Alles klar — nichts ist abgelegt. Sag mir, was anders sein soll.'
        })
        this.db.setDumpStatus(dumpId, 'pending')
        this.emit({ type: 'done', sessionId })
        return
      }
    }

    const themeRow = this.db.createTheme(chosenTheme)
    this.db.addThemeFiling(dumpId, themeRow.id)
    const bullets = content
      .split(/\n+|(?<=[.!?])\s+/)
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => `- ${s}`)
      .join('\n')
    const doc = this.db.createDoc({
      title: this.titleFor(content),
      content: bullets,
      themeId: themeRow.id,
      dumpId
    })
    if (/anruf|erledig|bis\s/i.test(content)) {
      this.db.createTodo({
        text: bullets.split('\n')[0]?.replace(/^- /, '') ?? 'Aufgabe',
        dueLabel: null,
        themeId: themeRow.id,
        noteId: doc.id,
        dumpId
      })
    }
    this.emit({ type: 'data_changed', sessionId })

    const summary = `Abgelegt in „${doc.title}“ (${themeRow.name}). Der Roh-Dump bleibt unverändert.`
    this.db.addMessage(sessionId, 'assistant', summary)
    this.db.setDumpStatus(dumpId, 'processed')
    this.db.finishSession(sessionId, summary, null)
    this.emit({ type: 'agent_text', sessionId, text: summary })
    this.emit({ type: 'filed', sessionId, dumpId, summary })
    this.emit({ type: 'done', sessionId })
  }

  ask(questionText: string): { sessionId: number } {
    const session = this.db.createSession('ask', null)
    this.db.addMessage(session.id, 'user', questionText)
    this.emit({ type: 'session', sessionId: session.id, dumpId: null, kind: 'ask' })
    void (async () => {
      await new Promise((r) => setTimeout(r, 500))
      const hits = this.db.searchDocs(questionText, 3)
      const docs = hits.length ? hits : this.db.listDocs().slice(0, 2).map((d) => ({ ...d, snippet: '' }))
      const sources: AnsweredSource[] = docs.map((d) => {
        const quote = d.content.split('\n')[0]?.replace(/^[-#>\s[\]x]+/, '').trim() ?? ''
        const range = quote ? anchorQuote(d.content, quote) : null
        return {
          noteId: d.id,
          title: d.title,
          quote,
          date: dayLabel(d.updatedAt),
          start: range?.start ?? null,
          end: range?.end ?? null
        }
      })
      const text = docs.length
        ? `Dazu habe ich ${docs.length === 1 ? 'eine Notiz' : `${docs.length} Notizen`} gefunden — am ehesten passt „${docs[0].title}“.`
        : 'Dazu steht noch nichts in deinen Notizen.'
      this.db.addMessage(session.id, 'tool_use', JSON.stringify({ t: 'answer', text, sources }))
      this.db.finishSession(session.id, text, null)
      this.emit({ type: 'answer', sessionId: session.id, text, sources })
      this.emit({ type: 'done', sessionId: session.id })
    })()
    return { sessionId: session.id }
  }

  answerQuestion(sessionId: number, questionId: string, answer: string): void {
    this.db.addMessage(sessionId, 'user', answer)
    this.interactions.answer(sessionId, questionId, answer)
  }

  resolveProposal(sessionId: number, proposalId: string, accepted: boolean): void {
    this.db.addMessage(sessionId, 'user', accepted ? 'Passt, ablegen' : 'Korrigieren')
    this.interactions.resolveProposal(sessionId, proposalId, accepted)
  }

  sendChatMessage(sessionId: number, text: string): void {
    this.db.addMessage(sessionId, 'user', text)
    const reply = 'Verstanden — im Demo-Modus kann ich darauf nur begrenzt eingehen.'
    this.db.addMessage(sessionId, 'assistant', reply)
    this.emit({ type: 'agent_text', sessionId, text: reply })
    this.emit({ type: 'done', sessionId })
  }

  shutdown(): void {
    /* nothing to clean up */
  }
}

export type AnyAgentService = FakeAgentService | import('./service').AgentService
