/**
 * Bridge between blocking agent tool calls (ask_user / propose_filing) and the
 * renderer. A tool handler registers a pending interaction and awaits its
 * promise; the IPC layer resolves it when the user answers in the UI.
 */

interface Pending<T> {
  resolve: (value: T) => void
  createdAt: number
}

export class InteractionRegistry {
  private questions = new Map<string, Pending<string>>()
  private proposals = new Map<string, Pending<boolean>>()

  private key(sessionId: number, id: string): string {
    return `${sessionId}:${id}`
  }

  waitForAnswer(sessionId: number, questionId: string): Promise<string> {
    return new Promise((resolve) => {
      this.questions.set(this.key(sessionId, questionId), { resolve, createdAt: Date.now() })
    })
  }

  answer(sessionId: number, questionId: string, value: string): boolean {
    const k = this.key(sessionId, questionId)
    const p = this.questions.get(k)
    if (!p) return false
    this.questions.delete(k)
    p.resolve(value)
    return true
  }

  waitForProposal(sessionId: number, proposalId: string): Promise<boolean> {
    return new Promise((resolve) => {
      this.proposals.set(this.key(sessionId, proposalId), { resolve, createdAt: Date.now() })
    })
  }

  resolveProposal(sessionId: number, proposalId: string, accepted: boolean): boolean {
    const k = this.key(sessionId, proposalId)
    const p = this.proposals.get(k)
    if (!p) return false
    this.proposals.delete(k)
    p.resolve(accepted)
    return true
  }

  /** Abandon everything for a session (app shutdown or session error). */
  cancelSession(sessionId: number): void {
    const prefix = `${sessionId}:`
    for (const [k, p] of this.questions) {
      if (k.startsWith(prefix)) {
        this.questions.delete(k)
        p.resolve('')
      }
    }
    for (const [k, p] of this.proposals) {
      if (k.startsWith(prefix)) {
        this.proposals.delete(k)
        p.resolve(false)
      }
    }
  }
}
