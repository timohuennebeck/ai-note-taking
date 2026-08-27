import { contextBridge, ipcRenderer } from 'electron'
import type { AgentEvent, LitterApi } from '@shared/types'

const invoke = (channel: string, ...args: unknown[]): Promise<never> =>
  ipcRenderer.invoke(channel, ...args) as Promise<never>

const api: LitterApi = {
  createDump: (content) => invoke('dump:create', content),
  retryDump: (dumpId) => invoke('dump:retry', dumpId),
  deleteDump: (dumpId) => invoke('dump:delete', dumpId),
  ask: (question) => invoke('ask', question),
  answerQuestion: (sessionId, questionId, answer) =>
    invoke('agent:answerQuestion', sessionId, questionId, answer),
  resolveProposal: (sessionId, proposalId, accepted) =>
    invoke('agent:resolveProposal', sessionId, proposalId, accepted),
  sendChatMessage: (sessionId, text) => invoke('agent:sendChat', sessionId, text),

  listFeed: (limit) => invoke('feed:list', limit),
  getThread: (sessionId) => invoke('thread:get', sessionId),
  getSessionForDump: (dumpId) => invoke('session:forDump', dumpId),

  listThemes: () => invoke('themes:list'),

  listDocs: (themeId) => invoke('docs:list', themeId),
  getDoc: (id) => invoke('docs:get', id),
  updateDoc: (id, patch) => invoke('docs:update', id, patch),
  deleteDoc: (id) => invoke('docs:delete', id),
  setDocTheme: (id, themeId) => invoke('docs:setTheme', id, themeId),

  listTodos: () => invoke('todos:list'),
  toggleTodo: (id, done) => invoke('todos:toggle', id, done),

  getAuthStatus: () => invoke('agent:authStatus'),

  onAgentEvent: (handler) => {
    const listener = (_ev: Electron.IpcRendererEvent, payload: AgentEvent): void => handler(payload)
    ipcRenderer.on('agent:event', listener)
    return () => ipcRenderer.removeListener('agent:event', listener)
  }
}

contextBridge.exposeInMainWorld('litter', api)
