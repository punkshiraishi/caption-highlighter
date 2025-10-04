import { describe, expect, it } from 'vitest'
import { buildDictionaryFromCsv, parseCsv } from '~/shared/utils/csv'

describe('csv importer', () => {
  const csv = `term,description,alias\nSLO,Service level objective,"service level objective,サービスレベル目標"\n,,\nlatency,Time to respond,"latency,遅延"\n`

  it('parses headers and rows', () => {
    const result = parseCsv(csv)
    expect(result.headers).toEqual(['term', 'description', 'alias'])
    expect(result.rows).toHaveLength(3)
  })

  it('builds dictionary entries and skips empty rows', () => {
    const { entries, stats } = buildDictionaryFromCsv(parseCsv(csv).rows, 'term', 'description', 'alias')
    expect(entries).toHaveLength(2)
    expect(stats.skipped).toBe(1)
    expect(entries[0].term).toBe('SLO')
    expect(entries[1].definition).toBe('Time to respond')
    expect(entries[0].aliases).toEqual(['service level objective', 'サービスレベル目標'])
    expect(entries[1].aliases).toEqual(['latency', '遅延'])
  })
})
