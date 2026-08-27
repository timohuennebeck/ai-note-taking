import { describe, expect, it } from 'vitest'
import { anchorQuote, parseAnswer } from '../src/shared/citations'

describe('parseAnswer', () => {
  it('extracts citations and strips markers', () => {
    const raw =
      'Das Review liegt auf Donnerstag 14:00 [source: note:42 "Termin auf Do 14:00 verschoben"]. Priya übernimmt die Demo [source: note:7 "Priya übernimmt die Demo"].'
    const { text, citations } = parseAnswer(raw)
    expect(citations).toEqual([
      { noteId: 42, quote: 'Termin auf Do 14:00 verschoben' },
      { noteId: 7, quote: 'Priya übernimmt die Demo' }
    ])
    expect(text).toBe('Das Review liegt auf Donnerstag 14:00. Priya übernimmt die Demo.')
  })

  it('handles escaped quotes and duplicates', () => {
    const raw = 'A [source: note:1 "sagt \\"hallo\\""] B [source: note:1 "sagt \\"hallo\\""]'
    const { text, citations } = parseAnswer(raw)
    expect(citations).toEqual([{ noteId: 1, quote: 'sagt "hallo"' }])
    expect(text).toBe('A B')
  })

  it('passes through answers without citations', () => {
    expect(parseAnswer('Dazu steht nichts in deinen Notizen.')).toEqual({
      text: 'Dazu steht nichts in deinen Notizen.',
      citations: []
    })
  })
})

describe('anchorQuote', () => {
  const content = '## Sprint\n\n- Termin auf Do 14:00 verschoben\n- Priya übernimmt die Demo\n'

  it('anchors exact quotes', () => {
    const r = anchorQuote(content, 'Priya übernimmt die Demo')
    expect(r).not.toBeNull()
    expect(content.slice(r!.start, r!.end)).toBe('Priya übernimmt die Demo')
  })

  it('anchors case- and whitespace-insensitively', () => {
    const r = anchorQuote(content, 'priya  übernimmt\ndie demo')
    expect(r).not.toBeNull()
    expect(content.slice(r!.start, r!.end)).toBe('Priya übernimmt die Demo')
  })

  it('returns null for quotes that are not in the content', () => {
    expect(anchorQuote(content, 'gibt es nicht')).toBeNull()
    expect(anchorQuote(content, '')).toBeNull()
  })
})
