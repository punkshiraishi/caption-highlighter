import { describe, expect, it } from 'vitest'
import { createMatcher } from '~/shared/matching/matcher'
import type { DictionaryEntry } from '~/shared/models/dictionary'
import { DEFAULT_MATCHING_SETTINGS } from '~/shared/models/settings'

function entry(term: string, definition = '', aliases: string[] = []): DictionaryEntry {
  return {
    id: term,
    term,
    definition,
    aliases,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

describe('matcher', () => {
  it('matches terms in partial mode (case-insensitive)', () => {
    const matcher = createMatcher([
      entry('Latency'),
      entry('Throughput'),
    ], { ...DEFAULT_MATCHING_SETTINGS, mode: 'partial', caseSensitive: false })

    const result = matcher.findMatches('Latency keeps increasing but throughput is stable')
    expect(result).toHaveLength(2)
    expect(result[0].matchText).toBe('Latency')
    expect(result[1].matchText.toLowerCase()).toBe('throughput')
  })

  it('respects case sensitivity flag', () => {
    const matcher = createMatcher([entry('API')], { ...DEFAULT_MATCHING_SETTINGS, caseSensitive: true })
    const result = matcher.findMatches('api response time')
    expect(result).toHaveLength(0)
  })

  it('enforces exact matching boundaries', () => {
    const matcher = createMatcher([entry('load')], { ...DEFAULT_MATCHING_SETTINGS, mode: 'exact' })
    const result = matcher.findMatches('load test has offload stage')
    expect(result).toHaveLength(1)
    expect(result[0].matchText).toBe('load')
  })

  it('supports regex terms', () => {
    const matcher = createMatcher([entry('CPU\\s*(usage|load)')], { ...DEFAULT_MATCHING_SETTINGS, mode: 'regex' })
    const result = matcher.findMatches('CPU usage peaked alongside CPU load')
    expect(result).toHaveLength(2)
    expect(result[0].matchText).toBe('CPU usage')
  })

  it('matches aliases alongside primary terms', () => {
    const matcher = createMatcher([
      entry('Service Level Objective', '', ['SLO', 'サービスレベル目標']),
    ], { ...DEFAULT_MATCHING_SETTINGS, mode: 'partial' })

    const result = matcher.findMatches('SLO を守るにはサービスレベル目標の達成が必要です。')
    expect(result).toHaveLength(2)
    expect(result[0].matchText).toBe('SLO')
    expect(result[1].matchText).toBe('サービスレベル目標')
  })

  it('limits highlights per node', () => {
    const matcher = createMatcher([
      entry('latency'),
      entry('throughput'),
      entry('error'),
    ], { ...DEFAULT_MATCHING_SETTINGS, maxHighlightsPerNode: 2 })

    const result = matcher.findMatches('latency latency throughput error error')
    expect(result).toHaveLength(2)
  })
})
