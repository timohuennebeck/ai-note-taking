/**
 * Documents are stored as a small markdown subset; the UI renders typed blocks
 * (the design's h / p / b / c / mark / todo styles).
 *
 *   ## Heading        -> h
 *   - bullet          -> b
 *   ```\ncode\n```    -> c
 *   > highlighted     -> mark
 *   - [ ] task        -> todo
 *   anything else     -> p
 */

export type BlockKind = 'h' | 'p' | 'b' | 'c' | 'mark' | 'todo'

export interface DocBlock {
  kind: BlockKind
  text: string
}

export function parseBlocks(markdown: string): DocBlock[] {
  const blocks: DocBlock[] = []
  const lines = markdown.split('\n')
  let i = 0
  let para: string[] = []
  const flushPara = (): void => {
    if (para.length) {
      blocks.push({ kind: 'p', text: para.join(' ').trim() })
      para = []
    }
  }
  while (i < lines.length) {
    const line = lines[i]
    const trimmed = line.trim()
    if (!trimmed) {
      flushPara()
      i++
      continue
    }
    if (trimmed.startsWith('```')) {
      flushPara()
      const code: string[] = []
      i++
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        code.push(lines[i])
        i++
      }
      i++ // closing fence
      blocks.push({ kind: 'c', text: code.join('\n') })
      continue
    }
    const heading = /^#{1,6}\s+(.*)$/.exec(trimmed)
    if (heading) {
      flushPara()
      blocks.push({ kind: 'h', text: heading[1] })
      i++
      continue
    }
    const todo = /^[-*]\s+\[[ xX]?\]\s+(.*)$/.exec(trimmed)
    if (todo) {
      flushPara()
      blocks.push({ kind: 'todo', text: todo[1] })
      i++
      continue
    }
    const bullet = /^[-*•]\s+(.*)$/.exec(trimmed)
    if (bullet) {
      flushPara()
      blocks.push({ kind: 'b', text: bullet[1] })
      i++
      continue
    }
    if (trimmed.startsWith('>')) {
      flushPara()
      blocks.push({ kind: 'mark', text: trimmed.replace(/^>\s?/, '') })
      i++
      continue
    }
    para.push(trimmed)
    i++
  }
  flushPara()
  return blocks
}

/** Short preview lines for document cards. */
export function previewLines(markdown: string, max = 8): string[] {
  return parseBlocks(markdown)
    .filter((b) => b.kind !== 'c')
    .map((b) => b.text)
    .filter(Boolean)
    .slice(0, max)
}

const WEEKDAYS = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa']

/** SQLite datetime('now') strings are UTC without a zone marker. */
export function parseDbDate(dbDate: string): Date {
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(dbDate)) {
    return new Date(dbDate.replace(' ', 'T') + 'Z')
  }
  return new Date(dbDate)
}

/** Design-style relative labels: "09:12" today, "Di" this week, "18.05.26" older. */
export function timeLabel(dbDate: string, now: Date = new Date()): string {
  const d = parseDbDate(dbDate)
  if (isNaN(d.getTime())) return dbDate
  const sameDay = d.toDateString() === now.toDateString()
  if (sameDay) {
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  }
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86_400_000)
  if (diffDays < 7) return WEEKDAYS[d.getDay()]
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getFullYear() % 100).padStart(2, '0')}`
}

/** "heute", "Dienstag", "18.05.26" — used on document cards. */
export function dayLabel(dbDate: string, now: Date = new Date()): string {
  const d = parseDbDate(dbDate)
  if (isNaN(d.getTime())) return dbDate
  if (d.toDateString() === now.toDateString()) return 'heute'
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86_400_000)
  if (diffDays < 7) {
    return ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'][d.getDay()]
  }
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getFullYear() % 100).padStart(2, '0')}`
}
