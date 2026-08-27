import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactElement,
  type ReactNode
} from 'react'
import type {
  AgentEvent,
  AnsweredSource,
  Doc,
  FeedItem,
  LitterApi,
  Theme,
  ThreadEntry,
  Todo
} from '@shared/types'
import { mockApi } from './mockApi'

export const api: LitterApi =
  typeof window !== 'undefined' && (window as Window & { litter?: LitterApi }).litter
    ? (window as Window & { litter: LitterApi }).litter
    : mockApi

export type ViewName = 'home' | 'themen' | 'hist' | 'notes' | 'filter' | 'note'

export interface ViewState {
  view: ViewName
  themeId?: number
  themeName?: string
  noteId?: number
  sessionId?: number
  highlight?: { start: number; end: number } | null
}

export interface AskResult {
  question: string
  text: string | null
  sources: AnsweredSource[]
  pending: boolean
}

interface Store {
  view: ViewState
  go: (v: ViewState) => void
  back: () => void

  feed: FeedItem[]
  themes: Theme[]
  docs: Doc[]
  todos: Todo[]
  refresh: () => void

  mode: 'dump' | 'ask'
  setMode: (m: 'dump' | 'ask') => void
  ask: AskResult | null
  clearAsk: () => void
  submit: (text: string) => Promise<void>
  justSentDump: number | null

  thread: ThreadEntry[]
  threadBusy: boolean
  openChatForDump: (dumpId: number) => Promise<void>
  answerQuestion: (questionId: string, answer: string) => Promise<void>
  resolveProposal: (proposalId: string, accepted: boolean) => Promise<void>
  sendChat: (text: string) => Promise<void>

  dark: boolean
  toggleDark: () => void

  auth: { ok: boolean; detail: string; model: string } | null
}

const Ctx = createContext<Store | null>(null)

export function useStore(): Store {
  const s = useContext(Ctx)
  if (!s) throw new Error('store missing')
  return s
}

export function StoreProvider({ children }: { children: ReactNode }): ReactElement {
  const [stack, setStack] = useState<ViewState[]>([{ view: 'home' }])
  const view = stack[stack.length - 1]

  const [feed, setFeed] = useState<FeedItem[]>([])
  const [themes, setThemes] = useState<Theme[]>([])
  const [docs, setDocs] = useState<Doc[]>([])
  const [todos, setTodos] = useState<Todo[]>([])
  const [ask, setAsk] = useState<AskResult | null>(null)
  const [mode, setMode] = useState<'dump' | 'ask'>('dump')
  const [thread, setThread] = useState<ThreadEntry[]>([])
  const [threadBusy, setThreadBusy] = useState(false)
  const [justSentDump, setJustSentDump] = useState<number | null>(null)
  const [auth, setAuth] = useState<{ ok: boolean; detail: string; model: string } | null>(null)
  const [dark, setDark] = useState<boolean>(() => localStorage.getItem('litter.dark') === '1')

  const askSession = useRef<number | null>(null)
  const chatSession = useRef<number | null>(null)

  useEffect(() => {
    document.body.classList.toggle('dark', dark)
    localStorage.setItem('litter.dark', dark ? '1' : '0')
  }, [dark])

  const refresh = useCallback((): void => {
    void api.listFeed().then(setFeed)
    void api.listThemes().then(setThemes)
    void api.listDocs(null).then(setDocs)
    void api.listTodos().then(setTodos)
  }, [])

  const reloadThread = useCallback((): void => {
    const sid = chatSession.current
    if (sid == null) return
    void api.getThread(sid).then((t) => {
      setThread(t.entries)
      // the session itself is the source of truth for "Litter is working"
      setThreadBusy(t.running)
    })
  }, [])

  useEffect(() => {
    refresh()
    void api.getAuthStatus().then(setAuth)
  }, [refresh])

  useEffect(() => {
    return api.onAgentEvent((ev: AgentEvent) => {
      if (ev.type === 'answer' && ev.sessionId === askSession.current) {
        setAsk((prev) =>
          prev ? { ...prev, text: ev.text, sources: ev.sources, pending: false } : prev
        )
      }
      if (ev.type === 'error' && ev.sessionId === askSession.current) {
        setAsk((prev) =>
          prev ? { ...prev, text: `Fehler: ${ev.message}`, sources: [], pending: false } : prev
        )
      }
      if (
        ev.sessionId === chatSession.current &&
        ['question', 'proposal', 'agent_text', 'filed', 'error', 'done', 'thinking'].includes(ev.type)
      ) {
        reloadThread()
        if (ev.type === 'done' || ev.type === 'error') setThreadBusy(false)
      }
      if (['filed', 'data_changed', 'done', 'question', 'proposal'].includes(ev.type)) {
        refresh()
      }
    })
  }, [refresh, reloadThread])

  const go = useCallback((v: ViewState): void => {
    setStack((s) => [...s, v])
    if (v.view === 'hist' && v.sessionId != null) {
      chatSession.current = v.sessionId
      void api.getThread(v.sessionId).then((t) => {
        setThread(t.entries)
        setThreadBusy(t.running)
      })
    }
  }, [])

  /** Escape always returns to the home screen, from any depth. */
  const back = useCallback((): void => {
    setAsk(null)
    setStack([{ view: 'home' }])
  }, [])

  useEffect(() => {
    const isTyping = (): boolean => {
      const el = document.activeElement
      return (
        el instanceof HTMLElement &&
        (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)
      )
    }
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        const el = document.activeElement
        if (el instanceof HTMLElement) el.blur()
        back()
        return
      }
      // single-letter jumps, never while writing or with a modifier held
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping()) return
      const key = e.key.toLowerCase()
      if (key === 'u') {
        e.preventDefault()
        go({ view: 'notes' })
      } else if (key === 't') {
        e.preventDefault()
        go({ view: 'themen' })
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [back, go])

  const submit = useCallback(
    async (text: string): Promise<void> => {
      if (!text.trim()) return
      if (mode === 'dump') {
        const { dumpId } = await api.createDump(text.trim())
        setJustSentDump(dumpId)
        setAsk(null)
        refresh()
        setTimeout(() => setJustSentDump((cur) => (cur === dumpId ? null : cur)), 6000)
      } else {
        const { sessionId } = await api.ask(text.trim())
        askSession.current = sessionId
        setAsk({ question: text.trim(), text: null, sources: [], pending: true })
      }
    },
    [mode, refresh]
  )

  const openChatForDump = useCallback(
    async (dumpId: number): Promise<void> => {
      const sessionId = await api.getSessionForDump(dumpId)
      if (sessionId == null) return
      go({ view: 'hist', sessionId })
    },
    [go]
  )

  const answerQuestion = useCallback(
    async (questionId: string, answer: string): Promise<void> => {
      const sid = chatSession.current
      if (sid == null) return
      setThreadBusy(true)
      await api.answerQuestion(sid, questionId, answer)
      reloadThread()
    },
    [reloadThread]
  )

  const resolveProposal = useCallback(
    async (proposalId: string, accepted: boolean): Promise<void> => {
      const sid = chatSession.current
      if (sid == null) return
      setThreadBusy(true)
      await api.resolveProposal(sid, proposalId, accepted)
      reloadThread()
    },
    [reloadThread]
  )

  const sendChat = useCallback(
    async (text: string): Promise<void> => {
      const sid = chatSession.current
      if (sid == null || !text.trim()) return
      setThreadBusy(true)
      await api.sendChatMessage(sid, text.trim())
      reloadThread()
    },
    [reloadThread]
  )

  const store = useMemo<Store>(
    () => ({
      view,
      go,
      back,
      feed,
      themes,
      docs,
      todos,
      refresh,
      mode,
      setMode,
      ask,
      clearAsk: () => setAsk(null),
      submit,
      justSentDump,
      thread,
      threadBusy,
      openChatForDump,
      answerQuestion,
      resolveProposal,
      sendChat,
      dark,
      toggleDark: () => setDark((d) => !d),
      auth
    }),
    [
      view,
      go,
      back,
      feed,
      themes,
      docs,
      todos,
      refresh,
      mode,
      ask,
      submit,
      justSentDump,
      thread,
      threadBusy,
      openChatForDump,
      answerQuestion,
      resolveProposal,
      sendChat,
      dark,
      auth
    ]
  )

  return <Ctx.Provider value={store}>{children}</Ctx.Provider>
}
