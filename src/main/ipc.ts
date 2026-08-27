import { ipcMain } from 'electron'
import type { LitterDb } from './db'
import type { AgentService } from './agent/service'
import type { FakeAgentService } from './agent/fake'
import { buildFeed, buildThread } from './feed'

type Agent = AgentService | FakeAgentService

export function registerIpc(db: LitterDb, agent: Agent): void {
  const h = <T extends unknown[], R>(channel: string, fn: (...args: T) => R): void => {
    ipcMain.handle(channel, (_ev, ...args) => fn(...(args as T)))
  }

  h('dump:create', (content: string) => {
    const dump = db.createDump(content)
    const { sessionId } = agent.processDump(dump.id)
    return { dumpId: dump.id, sessionId }
  })
  h('dump:retry', (dumpId: number) => agent.processDump(dumpId))
  h('dump:delete', (dumpId: number) => db.deleteDump(dumpId))
  h('ask', (question: string) => agent.ask(question))
  h('agent:answerQuestion', (sessionId: number, questionId: string, answer: string) =>
    agent.answerQuestion(sessionId, questionId, answer)
  )
  h('agent:resolveProposal', (sessionId: number, proposalId: string, accepted: boolean) =>
    agent.resolveProposal(sessionId, proposalId, accepted)
  )
  h('agent:sendChat', (sessionId: number, text: string) => agent.sendChatMessage(sessionId, text))
  h('agent:authStatus', () => agent.getAuthStatus())

  h('feed:list', (limit?: number) => buildFeed(db, limit ?? 30))
  h('history:list', () => buildFeed(db, 200))
  h('thread:get', (sessionId: number) => buildThread(db, sessionId))
  h('session:forDump', (dumpId: number) => db.latestSessionForDump(dumpId)?.id ?? null)

  h('themes:list', () => db.listThemes())
  h('themes:create', (name: string) => db.createTheme(name))
  h('themes:rename', (id: number, name: string) => db.updateTheme(id, { name }))
  h('themes:delete', (id: number) => db.deleteTheme(id))

  h('docs:list', (themeId?: number | null) => db.listDocs(themeId ?? null))
  h('docs:get', (id: number) => db.getDoc(id))
  h('docs:update', (id: number, patch: { title?: string; content?: string }) => db.updateDoc(id, patch))
  h('docs:delete', (id: number) => db.deleteDoc(id))
  h('docs:setTheme', (id: number, themeId: number | null) => db.updateDoc(id, { themeId }))
  h('docs:create', (title: string) => db.createDoc({ title, content: '' }))

  h('todos:list', () => db.listTodos())
  h('todos:toggle', (id: number, done: boolean) => db.setTodoDone(id, done))
}
