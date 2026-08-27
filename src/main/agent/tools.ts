import { tool } from '@anthropic-ai/claude-agent-sdk'
import type { SdkMcpToolDefinition } from '@anthropic-ai/claude-agent-sdk'
import { z } from 'zod'
import { randomUUID } from 'crypto'
import type { LitterDb } from '../db'
import type { InteractionRegistry } from './interactions'
import type { AgentEvent, ProposalRow } from '@shared/types'

export interface SessionCtx {
  sessionId: number
  dumpId: number | null
  db: LitterDb
  interactions: InteractionRegistry
  emit: (ev: AgentEvent) => void
}

const text = (s: string) => ({ content: [{ type: 'text' as const, text: s }] })
const errText = (s: string) => ({ content: [{ type: 'text' as const, text: s }], isError: true })

/** Resolve a theme by name, creating it when the agent asks for a new one. */
function themeIdFor(ctx: SessionCtx, themeName: string | undefined, create: boolean): number | null {
  if (!themeName) return null
  const existing = ctx.db.getThemeByName(themeName)
  if (existing) return existing.id
  if (!create) return null
  return ctx.db.createTheme(themeName).id
}

export function buildKeplerTools(ctx: SessionCtx): Array<SdkMcpToolDefinition<any>> {
  const changed = (): void => ctx.emit({ type: 'data_changed', sessionId: ctx.sessionId })

  return [
    tool(
      'list_themes',
      'Listet alle Themen mit Beschreibung und Dokument-Anzahl.',
      {},
      async () => {
        const themes = ctx.db.listThemes()
        if (!themes.length) return text('Noch keine Themen vorhanden.')
        return text(
          themes
            .map(
              (t) =>
                `- [id ${t.id}] ${t.name} (${t.docCount} Dokumente)${t.description ? ` — ${t.description}` : ''}`
            )
            .join('\n')
        )
      }
    ),

    tool(
      'create_theme',
      'Legt ein neues Thema an. description ist deine eigene Ablage-Regel für dieses Thema.',
      {
        name: z.string().describe('Kurzer Themenname ohne Emoji, z. B. "Finanzen"'),
        description: z.string().describe('Wann gehört etwas in dieses Thema?')
      },
      async ({ name, description }) => {
        const t = ctx.db.createTheme(name, description)
        ctx.db.updateTheme(t.id, { description })
        changed()
        return text(`Thema "${t.name}" angelegt (id ${t.id}).`)
      }
    ),

    tool(
      'update_theme',
      'Aktualisiert Name oder Beschreibung eines Themas.',
      {
        theme_id: z.number(),
        name: z.string().optional(),
        description: z.string().optional()
      },
      async ({ theme_id, name, description }) => {
        if (!ctx.db.getTheme(theme_id)) return errText(`Thema ${theme_id} existiert nicht.`)
        ctx.db.updateTheme(theme_id, { name, description })
        changed()
        return text(`Thema ${theme_id} aktualisiert.`)
      }
    ),

    tool(
      'list_documents',
      'Listet Dokumente (optional gefiltert nach Thema) mit id, Titel, Thema und Datum.',
      { theme_name: z.string().optional() },
      async ({ theme_name }) => {
        let themeId: number | null | undefined = undefined
        if (theme_name) {
          const t = ctx.db.getThemeByName(theme_name)
          if (!t) return text(`Kein Thema namens "${theme_name}".`)
          themeId = t.id
        }
        const docs = ctx.db.listDocs(themeId ?? null)
        if (!docs.length) return text('Keine Dokumente gefunden.')
        return text(
          docs
            .slice(0, 60)
            .map(
              (d) =>
                `- [id ${d.id}] "${d.title}" (Thema: ${d.themeName ?? 'keins'}, geändert ${d.updatedAt})`
            )
            .join('\n')
        )
      }
    ),

    tool(
      'read_document',
      'Liest ein Dokument vollständig.',
      { document_id: z.number() },
      async ({ document_id }) => {
        const d = ctx.db.getDoc(document_id)
        if (!d) return errText(`Dokument ${document_id} existiert nicht.`)
        return text(
          `# ${d.title}\n(id ${d.id}, Thema: ${d.themeName ?? 'keins'})\n\n${d.content || '(leer)'}`
        )
      }
    ),

    tool(
      'search_notes',
      'Volltextsuche über alle Dokumente. Liefert Treffer mit id und Ausschnitt.',
      { query: z.string() },
      async ({ query }) => {
        const hits = ctx.db.searchDocs(query)
        if (!hits.length) return text(`Keine Treffer für "${query}".`)
        return text(
          hits
            .map((h) => `- [id ${h.id}] "${h.title}" (Thema: ${h.themeName ?? 'keins'}): ${h.snippet}`)
            .join('\n')
        )
      }
    ),

    tool(
      'create_document',
      'Legt ein neues Dokument in einem Thema an. Inhalt als schlichtes Markdown.',
      {
        title: z.string().describe('Prägnanter Titel, 2-4 Wörter'),
        markdown: z.string(),
        theme_name: z.string().describe('Name eines bestehenden oder neuen Themas')
      },
      async ({ title, markdown, theme_name }) => {
        const themeId = themeIdFor(ctx, theme_name, true)
        const d = ctx.db.createDoc({ title, content: markdown, themeId, dumpId: ctx.dumpId })
        if (ctx.dumpId != null) ctx.db.addFiling(ctx.dumpId, d.id, 'created')
        changed()
        return text(`Dokument "${d.title}" angelegt (id ${d.id}, Thema: ${theme_name}).`)
      }
    ),

    tool(
      'append_to_document',
      'Ergänzt ein bestehendes Dokument um neuen Markdown-Inhalt (überschreibt nichts).',
      { document_id: z.number(), markdown: z.string() },
      async ({ document_id, markdown }) => {
        const d = ctx.db.getDoc(document_id)
        if (!d) return errText(`Dokument ${document_id} existiert nicht.`)
        ctx.db.appendToDoc(document_id, markdown)
        if (ctx.dumpId != null) ctx.db.addFiling(ctx.dumpId, document_id, 'appended')
        changed()
        return text(`Dokument "${d.title}" ergänzt.`)
      }
    ),

    tool(
      'rename_document',
      'Benennt ein Dokument um. Nutze das, wenn ein Titel nicht mehr passt — etwa nachdem du Inhalte zusammengeführt hast und ein umfassenderer Titel besser passt.',
      { document_id: z.number(), title: z.string().describe('Neuer prägnanter Titel, 2-4 Wörter') },
      async ({ document_id, title }) => {
        const d = ctx.db.getDoc(document_id)
        if (!d) return errText(`Dokument ${document_id} existiert nicht.`)
        ctx.db.updateDoc(document_id, { title })
        changed()
        return text(`Dokument "${d.title}" heißt jetzt "${title}".`)
      }
    ),

    tool(
      'merge_documents',
      'Führt ein Dokument in ein anderes über: hängt den Inhalt der Quelle an das Ziel an und löscht die Quelle. Danach ggf. rename_document nutzen, damit der Titel beide Inhalte abdeckt.',
      {
        source_document_id: z.number(),
        target_document_id: z.number()
      },
      async ({ source_document_id, target_document_id }) => {
        if (source_document_id === target_document_id) return errText('Quelle und Ziel sind identisch.')
        const src = ctx.db.getDoc(source_document_id)
        const dst = ctx.db.getDoc(target_document_id)
        if (!src) return errText(`Dokument ${source_document_id} existiert nicht.`)
        if (!dst) return errText(`Dokument ${target_document_id} existiert nicht.`)
        if (src.content.trim()) ctx.db.appendToDoc(target_document_id, src.content.trim())
        ctx.db.deleteDoc(source_document_id)
        if (ctx.dumpId != null) ctx.db.addFiling(ctx.dumpId, target_document_id, 'appended')
        changed()
        return text(`"${src.title}" wurde in "${dst.title}" (id ${dst.id}) zusammengeführt und gelöscht.`)
      }
    ),

    tool(
      'set_document_theme',
      'Verschiebt ein Dokument in ein anderes Thema.',
      { document_id: z.number(), theme_name: z.string() },
      async ({ document_id, theme_name }) => {
        const d = ctx.db.getDoc(document_id)
        if (!d) return errText(`Dokument ${document_id} existiert nicht.`)
        const themeId = themeIdFor(ctx, theme_name, true)
        ctx.db.updateDoc(document_id, { themeId })
        changed()
        return text(`"${d.title}" liegt jetzt in "${theme_name}".`)
      }
    ),

    tool(
      'create_todo',
      'Legt eine Aufgabe an.',
      {
        text: z.string(),
        due_label: z.string().optional().describe('z. B. "Fr, 16 Uhr" oder "12. Sep"'),
        theme_name: z.string().optional(),
        document_id: z.number().optional()
      },
      async ({ text: todoText, due_label, theme_name, document_id }) => {
        const themeId = themeIdFor(ctx, theme_name, false)
        const todo = ctx.db.createTodo({
          text: todoText,
          dueLabel: due_label ?? null,
          themeId,
          noteId: document_id ?? null,
          dumpId: ctx.dumpId
        })
        changed()
        return text(`Todo angelegt (id ${todo.id}): ${todo.text}${due_label ? ` · ${due_label}` : ''}`)
      }
    ),

    tool(
      'ask_user',
      'Stellt dem Nutzer EINE kurze Rückfrage mit 2-3 Antwort-Optionen und wartet auf die Antwort. Der Nutzer kann auch frei antworten.',
      {
        question: z.string(),
        options: z.array(z.string()).min(2).max(4)
      },
      async ({ question, options }) => {
        const questionId = randomUUID()
        const msg = ctx.db.addMessage(
          ctx.sessionId,
          'tool_use',
          JSON.stringify({ t: 'question', id: questionId, text: question, options, answer: null })
        )
        ctx.emit({ type: 'question', sessionId: ctx.sessionId, questionId, text: question, options })
        const answer = await ctx.interactions.waitForAnswer(ctx.sessionId, questionId)
        ctx.db.updateMessageContent(
          msg.id,
          JSON.stringify({ t: 'question', id: questionId, text: question, options, answer })
        )
        if (!answer) return errText('Der Nutzer hat nicht geantwortet (Sitzung beendet).')
        return text(`Antwort des Nutzers: ${answer}`)
      }
    ),

    tool(
      'propose_filing',
      'Zeigt dem Nutzer deinen Ablage-Vorschlag (Zeilen wie Titel/Thema/Todo) und wartet auf Bestätigung. Erst nach "accepted" darfst du ablegen.',
      {
        summary: z.string().describe('Einleitungssatz, z. B. "Dann würde ich es so ablegen — passt das?"'),
        rows: z
          .array(z.object({ label: z.string(), value: z.string() }))
          .min(1)
          .max(6)
      },
      async ({ summary, rows }) => {
        const proposalId = randomUUID()
        const msg = ctx.db.addMessage(
          ctx.sessionId,
          'tool_use',
          JSON.stringify({ t: 'proposal', id: proposalId, text: summary, rows, state: 'open', committedAt: null })
        )
        ctx.emit({
          type: 'proposal',
          sessionId: ctx.sessionId,
          proposalId,
          text: summary,
          rows: rows as ProposalRow[]
        })
        const accepted = await ctx.interactions.waitForProposal(ctx.sessionId, proposalId)
        ctx.db.updateMessageContent(
          msg.id,
          JSON.stringify({
            t: 'proposal',
            id: proposalId,
            text: summary,
            rows,
            state: accepted ? 'accepted' : 'rejected',
            committedAt: accepted ? new Date().toISOString() : null
          })
        )
        return text(accepted ? 'accepted — der Nutzer hat bestätigt. Lege jetzt ab.' : 'rejected — der Nutzer möchte es anders. Frage nach.')
      }
    )
  ]
}
