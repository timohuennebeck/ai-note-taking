import type {
  AgentEvent,
  Doc,
  FeedItem,
  LitterApi,
  Theme,
  ThreadEntry,
  Todo
} from '@shared/types'

/**
 * In-browser stand-in for the preload API, active only when the renderer runs
 * outside Electron (vite dev server / UI screenshots). Read-mostly demo data
 * shaped like the design mock.
 */

const themes: Theme[] = [
  { id: 1, name: 'Familie', description: 'Termine, Kinder, Zuhause', emoji: '🏠', createdAt: '', updatedAt: '', docCount: 2 },
  { id: 2, name: 'Finanzen', description: 'Preise, Verträge, Budget', emoji: '💶', createdAt: '', updatedAt: '', docCount: 1 },
  { id: 3, name: 'EmaBoard', description: 'Produktarbeit: Features, Sprints, Feedback', emoji: '🗂️', createdAt: '', updatedAt: '', docCount: 4 },
  { id: 4, name: 'Credentials', description: 'Kurse, Zertifikate, Lernen', emoji: '🎓', createdAt: '', updatedAt: '', docCount: 1 },
  { id: 5, name: 'Lissabon', description: 'Reise im September: Flüge, Hotel, Ideen', emoji: '✈️', createdAt: '', updatedAt: '', docCount: 1 }
]

const now = new Date()
const today = (h: number, m: number): string => {
  const d = new Date(now)
  d.setHours(h, m, 0, 0)
  return d.toISOString().replace('T', ' ').slice(0, 19)
}
const daysAgo = (n: number): string => {
  const d = new Date(now.getTime() - n * 86_400_000)
  return d.toISOString().replace('T', ' ').slice(0, 19)
}

const docs: Doc[] = [
  {
    id: 1,
    dumpId: 1,
    themeId: 3,
    themeName: 'EmaBoard',
    title: 'Hero-Zeilen',
    content:
      '> Notizen, die sich selbst ablegen.\n\n## Kandidaten\n- Einfach schreiben. Ablegen macht Dump.\n- Dein Kopf ist zum Denken da, nicht zum Sortieren.\n- Erst dumpen, dann denken.\n\nDie zweite Zeile wirkt am ruhigsten — mit Priya abstimmen.\n\n- [ ] Zeilen-Kandidaten mit Priya klären',
    createdAt: today(9, 12),
    updatedAt: today(9, 12)
  },
  {
    id: 2,
    dumpId: 2,
    themeId: 1,
    themeName: 'Familie',
    title: 'Zahnarzt Milo',
    content:
      '- Praxis Dr. Sommer, freitags nur bis 16 Uhr\n- Kontrolltermin für Milo vereinbaren\n- [ ] Anrufen bis Freitag 16 Uhr',
    createdAt: today(8, 40),
    updatedAt: today(8, 40)
  },
  {
    id: 3,
    dumpId: 4,
    themeId: 3,
    themeName: 'EmaBoard',
    title: 'Sprint-Notizen',
    content:
      '> Sprint-Review verschoben.\n\n- Termin auf Do 14:00 verschoben, Raum Nord\n- Priya übernimmt die Demo\n- Onboarding-Flow ist fast fertig',
    createdAt: daysAgo(1),
    updatedAt: daysAgo(1)
  },
  {
    id: 4,
    dumpId: 3,
    themeId: 3,
    themeName: 'EmaBoard',
    title: 'Wochen-Digest',
    content:
      '- Idee: wöchentliche Zusammenfassung aller Dumps\n- Automatisch am Sonntagabend\n- Erst als E-Mail testen, dann in der App',
    createdAt: today(9, 20),
    updatedAt: today(9, 20)
  },
  {
    id: 5,
    dumpId: 5,
    themeId: 5,
    themeName: 'Lissabon',
    title: 'Lissabon-Reise',
    content:
      '- Flug LH1178 um 06:55\n- Hotel Baixa, Check-in ab 15 Uhr\n- Tram 28 früh morgens, sonst zu voll\n- [ ] Fado-Abend buchen · 12. Sep',
    createdAt: daysAgo(1),
    updatedAt: daysAgo(1)
  },
  {
    id: 6,
    dumpId: null,
    themeId: 2,
    themeName: 'Finanzen',
    title: 'Preise',
    content: '```\nStarter     0 €\nPro         8 €/Monat\nTeam       19 €/Monat\n```\nJahresrabatt noch offen — erst nach dem Beta-Feedback entscheiden.',
    createdAt: daysAgo(90),
    updatedAt: daysAgo(90)
  },
  {
    id: 7,
    dumpId: null,
    themeId: 4,
    themeName: 'Credentials',
    title: 'Leseliste',
    content: '- Aufsatz über Gedächtnispaläste\n- Zitat bei 34:10 nachhören\n- Building a Second Brain, Kapitel 4',
    createdAt: daysAgo(200),
    updatedAt: daysAgo(200)
  },
  {
    id: 8,
    dumpId: null,
    themeId: 1,
    themeName: 'Familie',
    title: 'Küche planen',
    content: '- Maße nachmessen: Nische 2,40 m\n- Angebot von Schreiner Huber abwarten\n- [ ] Rückruf Huber',
    createdAt: daysAgo(120),
    updatedAt: daysAgo(120)
  }
]

const todos: Todo[] = [
  { id: 1, text: 'Anrufen bis Freitag 16 Uhr', dueLabel: 'Fr, 16 Uhr', themeName: 'Familie', noteId: 2, dumpId: 2, done: false, createdAt: today(8, 40) },
  { id: 2, text: 'Zeilen-Kandidaten mit Priya klären', dueLabel: 'Heute', themeName: 'EmaBoard', noteId: 1, dumpId: 1, done: false, createdAt: today(9, 12) },
  { id: 3, text: 'Fado-Abend buchen', dueLabel: '12. Sep', themeName: 'Lissabon', noteId: 5, dumpId: 5, done: false, createdAt: daysAgo(1) }
]

const feed: FeedItem[] = [
  {
    dumpId: 6,
    sessionId: 6,
    time: '09:31',
    createdAt: today(9, 31),
    text: 'Neue Hero-Zeile: Dein Kopf ist zum Denken da, nicht zum Sortieren — oder lieber als Claim fürs Onboarding?',
    status: 'processing',
    pendingQuestions: 2,
    parts: []
  },
  {
    dumpId: 1,
    sessionId: 1,
    time: '09:12',
    createdAt: today(9, 12),
    text: 'Hero-Zeile Idee: Notizen, die sich selbst ablegen. Und die Kandidaten mit Priya durchgehen.',
    status: 'processed',
    pendingQuestions: 0,
    parts: [
      { kind: 'doc', label: 'Hero-Zeilen', noteId: 1, themeName: 'EmaBoard' },
      { kind: 'todo', label: 'Zeilen-Kandidaten mit Priya klären · Heute' }
    ]
  },
  {
    dumpId: 2,
    sessionId: 2,
    time: '08:40',
    createdAt: today(8, 40),
    text: 'Zahnarzt wegen Milo anrufen, Praxis hat freitags nur bis 16 Uhr auf.',
    status: 'processed',
    pendingQuestions: 0,
    parts: [
      { kind: 'doc', label: 'Zahnarzt Milo', noteId: 2, themeName: 'Familie' },
      { kind: 'todo', label: 'Anrufen bis Freitag 16 Uhr · Fr, 16 Uhr' }
    ]
  },
  {
    dumpId: 3,
    sessionId: 3,
    time: '09:20',
    createdAt: today(9, 20),
    text: 'Idee: wöchentliche Zusammenfassung aller Dumps, automatisch am Sonntagabend.',
    status: 'processed',
    pendingQuestions: 0,
    parts: [{ kind: 'doc', label: 'Wochen-Digest', noteId: 4, themeName: 'EmaBoard', isNew: true }]
  },
  {
    dumpId: 5,
    sessionId: 5,
    time: 'Di',
    createdAt: daysAgo(1),
    text: 'Flug LH1178 um 06:55, Hotel Baixa Check-in ab 15 Uhr. Fado-Abend am 12. September buchen.',
    status: 'processed',
    pendingQuestions: 0,
    parts: [
      { kind: 'doc', label: 'Lissabon-Reise', noteId: 5, themeName: 'Lissabon' },
      { kind: 'todo', label: 'Fado-Abend buchen · 12. Sep' }
    ]
  }
]

const threads: Record<number, ThreadEntry[]> = {
  6: [
    {
      type: 'user',
      text: 'Neue Hero-Zeile: Dein Kopf ist zum Denken da, nicht zum Sortieren — oder lieber als Claim fürs Onboarding?',
      time: '09:31'
    },
    {
      type: 'question',
      text: 'Bevor ich ablege: gehört die Zeile ins bestehende Dokument „Hero-Zeilen“?',
      options: ['Ja, ergänzen', 'Neues Dokument', 'Nur festhalten, nicht ablegen'],
      answer: null,
      questionId: 'q1'
    }
  ],
  1: [
    { type: 'user', text: 'Hero-Zeile Idee: Notizen, die sich selbst ablegen. Und die Kandidaten mit Priya durchgehen.', time: '09:12' },
    {
      type: 'question',
      text: 'Gehört das ins bestehende Dokument „Hero-Zeilen“?',
      options: ['Ja, ergänzen', 'Neues Dokument', 'Nur als Idee'],
      answer: 'Ja, ergänzen',
      questionId: 'q1'
    },
    { type: 'user', text: 'Ja, ergänzen' },
    {
      type: 'proposal',
      text: 'So habe ich es abgelegt:',
      rows: [
        { label: 'Titel', value: 'Hero-Zeilen · ergänzt' },
        { label: 'Thema', value: 'EmaBoard' },
        { label: 'Todo', value: 'Zeilen-Kandidaten mit Priya klären' }
      ],
      proposalId: 'p1',
      state: 'accepted',
      committedAt: '09:12'
    },
    { type: 'agent', text: 'Abgelegt. Der Roh-Dump bleibt unverändert — das Dokument ist nur eine Ansicht darauf.' },
    {
      type: 'filed',
      text: '',
      noteId: 1,
      docTitle: 'Hero-Zeilen',
      docDate: 'heute',
      docLines: ['Notizen, die sich selbst ablegen.', 'Kandidaten', 'Einfach schreiben. Ablegen macht Dump.', 'Dein Kopf ist zum Denken da', 'Erst dumpen, dann denken.']
    }
  ]
}

function emit(ev: AgentEvent): void {
  for (const h of handlers) h(ev)
}
const handlers = new Set<(ev: AgentEvent) => void>()
let nextId = 100

export const mockApi: LitterApi = {
  async createDump(content) {
    const dumpId = nextId++
    const sessionId = nextId++
    feed.unshift({
      dumpId,
      sessionId,
      time: 'gerade',
      createdAt: new Date().toISOString().replace('T', ' ').slice(0, 19),
      text: content,
      status: 'processing',
      pendingQuestions: 0,
      parts: []
    })
    setTimeout(() => {
      const item = feed.find((f) => f.dumpId === dumpId)
      if (item) {
        item.status = 'processed'
        item.parts = [{ kind: 'doc', label: 'Neues Dokument', noteId: 1, themeName: 'EmaBoard' }]
      }
      emit({ type: 'filed', sessionId, dumpId, summary: 'Abgelegt.' })
      emit({ type: 'done', sessionId })
    }, 900)
    return { dumpId, sessionId }
  },
  async retryDump(dumpId) {
    const sessionId = nextId++
    const item = feed.find((f) => f.dumpId === dumpId)
    if (item) item.status = 'processing'
    return { sessionId }
  },
  async ask(_question) {
    const sessionId = nextId++
    setTimeout(() => {
      emit({
        type: 'answer',
        sessionId,
        text: 'Das Sprint-Review liegt jetzt auf Donnerstag 14:00 im Raum Nord. Priya übernimmt die Demo.',
        sources: [
          { noteId: 3, title: 'Sprint-Notizen', quote: 'Termin auf Do 14:00 verschoben, Raum Nord', date: 'Di', start: 33, end: 72 },
          { noteId: 3, title: 'Sprint-Notizen', quote: 'Priya übernimmt die Demo', date: 'Di', start: 75, end: 99 }
        ]
      })
      emit({ type: 'done', sessionId })
    }, 700)
    return { sessionId }
  },
  async answerQuestion(sessionId, questionId, answer) {
    const t = threads[sessionId]
    if (t) {
      for (const e of t) if (e.type === 'question' && e.questionId === questionId) e.answer = answer
      t.push({ type: 'user', text: answer })
      t.push({
        type: 'proposal',
        text: 'Dann würde ich es so ablegen — passt das?',
        rows: [
          { label: 'Titel', value: answer === 'Neues Dokument' ? 'Hero-Zeilen · neu' : 'Hero-Zeilen · ergänzt' },
          { label: 'Thema', value: 'EmaBoard' },
          { label: 'Todo', value: 'Zeilen-Kandidaten sammeln' }
        ],
        proposalId: 'p9',
        state: 'open',
        committedAt: null
      })
    }
    emit({ type: 'proposal', sessionId, proposalId: 'p9', text: '', rows: [] })
  },
  async resolveProposal(sessionId, proposalId, accepted) {
    const t = threads[sessionId]
    if (t) {
      for (const e of t) {
        if (e.type === 'proposal' && e.proposalId === proposalId) {
          e.state = accepted ? 'accepted' : 'rejected'
          e.committedAt = accepted ? '09:32' : null
        }
      }
      if (accepted) {
        t.push({ type: 'agent', text: 'Abgelegt. Der Roh-Dump bleibt unverändert.' })
        const item = feed.find((f) => f.sessionId === sessionId)
        if (item) {
          item.status = 'processed'
          item.pendingQuestions = 0
          item.parts = [{ kind: 'doc', label: 'Hero-Zeilen', noteId: 1, themeName: 'EmaBoard' }]
        }
      }
    }
    emit({ type: 'done', sessionId })
  },
  async sendChatMessage(sessionId, text) {
    threads[sessionId]?.push({ type: 'user', text })
    threads[sessionId]?.push({ type: 'agent', text: 'Verstanden.' })
    emit({ type: 'done', sessionId })
  },
  async listFeed() {
    return feed
  },
  async listHistory() {
    return feed
  },
  async getThread(sessionId) {
    return threads[sessionId] ?? []
  },
  async getSessionForDump(dumpId) {
    return feed.find((f) => f.dumpId === dumpId)?.sessionId ?? null
  },
  async listThemes() {
    return themes.map((t) => ({ ...t, docCount: docs.filter((d) => d.themeId === t.id).length }))
  },
  async createTheme(name) {
    const t: Theme = { id: nextId++, name, description: null, emoji: null, createdAt: '', updatedAt: '', docCount: 0 }
    themes.push(t)
    return t
  },
  async renameTheme(id, name) {
    const t = themes.find((x) => x.id === id)
    if (t) t.name = name
  },
  async deleteTheme(id) {
    const i = themes.findIndex((x) => x.id === id)
    if (i >= 0) themes.splice(i, 1)
  },
  async listDocs(themeId) {
    return themeId == null ? docs : docs.filter((d) => d.themeId === themeId)
  },
  async getDoc(id) {
    return docs.find((d) => d.id === id) ?? null
  },
  async updateDoc(id, patch) {
    const d = docs.find((x) => x.id === id)
    if (d) Object.assign(d, patch)
  },
  async deleteDoc(id) {
    const i = docs.findIndex((x) => x.id === id)
    if (i >= 0) docs.splice(i, 1)
  },
  async setDocTheme(id, themeId) {
    const d = docs.find((x) => x.id === id)
    if (d) {
      d.themeId = themeId
      d.themeName = themes.find((t) => t.id === themeId)?.name ?? null
    }
  },
  async createDoc(title) {
    const d: Doc = {
      id: nextId++,
      dumpId: null,
      themeId: null,
      themeName: null,
      title,
      content: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    docs.unshift(d)
    return d
  },
  async listTodos() {
    return todos
  },
  async toggleTodo(id, done) {
    const t = todos.find((x) => x.id === id)
    if (t) t.done = done
  },
  async getAuthStatus() {
    return { ok: true, detail: 'Browser-Demo' }
  },
  onAgentEvent(handler) {
    handlers.add(handler)
    return () => handlers.delete(handler)
  }
}
