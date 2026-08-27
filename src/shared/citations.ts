/**
 * Citation contract between the agent and the app.
 *
 * The agent cites sources inline as:  [source: note:42 "verbatim quote"]
 * The app strips those markers from the answer text and anchors each quote
 * against the real note content. A citation that cannot be anchored still
 * yields a source chip (without a highlight range) — a hallucinated note id
 * yields nothing.
 */

export interface RawCitation {
  noteId: number
  quote: string
}

export interface ParsedAnswer {
  /** answer text with citation markers removed */
  text: string
  citations: RawCitation[]
}

const MARKER = /\[\s*source:\s*note:(\d+)\s+"((?:[^"\\]|\\.)*)"\s*\]/g

export function parseAnswer(raw: string): ParsedAnswer {
  const citations: RawCitation[] = []
  const text = raw
    .replace(MARKER, (_m, id: string, quote: string) => {
      citations.push({ noteId: Number(id), quote: quote.replace(/\\"/g, '"') })
      return ''
    })
    .replace(/[ \t]+([.,;:!?])/g, '$1')
    .replace(/[ \t]{2,}/g, ' ')
    .trim()
  // de-duplicate identical citations
  const seen = new Set<string>()
  const unique = citations.filter((c) => {
    const k = `${c.noteId}:${c.quote}`
    if (seen.has(k)) return false
    seen.add(k)
    return true
  })
  return { text, citations: unique }
}

export interface AnchorRange {
  start: number
  end: number
}

const normalize = (s: string): string => s.toLowerCase().replace(/\s+/g, ' ')

/**
 * Find the character range of `quote` inside `content`.
 * 1. exact match
 * 2. case/whitespace-insensitive match (mapped back to original offsets)
 * 3. null — quote did not anchor
 */
export function anchorQuote(content: string, quote: string): AnchorRange | null {
  const q = quote.trim()
  if (!q) return null

  const exact = content.indexOf(q)
  if (exact >= 0) return { start: exact, end: exact + q.length }

  // Build a normalized copy of content with an offset map back to the original.
  const map: number[] = []
  let norm = ''
  let lastWasSpace = false
  for (let i = 0; i < content.length; i++) {
    const ch = content[i]
    if (/\s/.test(ch)) {
      if (!lastWasSpace && norm.length > 0) {
        norm += ' '
        map.push(i)
      }
      lastWasSpace = true
    } else {
      norm += ch.toLowerCase()
      map.push(i)
      lastWasSpace = false
    }
  }
  const target = normalize(q)
  const idx = norm.indexOf(target)
  if (idx < 0 || idx + target.length - 1 >= map.length) return null
  const start = map[idx]
  const endIdx = map[idx + target.length - 1]
  return { start, end: endIdx + 1 }
}
