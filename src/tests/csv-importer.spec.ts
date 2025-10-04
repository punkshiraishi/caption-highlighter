import { describe, expect, it } from 'vitest'
import { buildDictionaryFromCsv, parseCsv } from '~/shared/utils/csv'

describe('csv importer', () => {
  const csv = `term,description,extra\nSLO,Service level objective,core\n,,\nlatency,Time to respond,metrics\n`

  it('parses headers and rows', () => {
    const result = parseCsv(csv)
    expect(result.headers).toEqual(['term', 'description', 'extra'])
    expect(result.rows).toHaveLength(3)
  })

  it('builds dictionary entries and skips empty rows', () => {
    const { entries, stats } = buildDictionaryFromCsv(parseCsv(csv).rows, 'term', 'description')
    expect(entries).toHaveLength(2)
    expect(stats.skipped).toBe(1)
    expect(entries[0].term).toBe('SLO')
    expect(entries[1].definition).toBe('Time to respond')
  })
})
