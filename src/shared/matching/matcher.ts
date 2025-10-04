import type { DictionaryEntry } from '../models/dictionary'
import type { MatchingSettings } from '../models/settings'
import { escapeRegExp } from '../utils/string'

export interface MatchResult {
  entry: DictionaryEntry
  start: number
  end: number
  matchText: string
}

interface CompiledEntry {
  entry: DictionaryEntry
  regex: RegExp
}

function buildRegex(entry: DictionaryEntry, settings: MatchingSettings): RegExp | null {
  if (!entry.term.trim())
    return null

  const flags = settings.caseSensitive ? 'g' : 'gi'

  try {
    if (settings.mode === 'regex')
      return new RegExp(entry.term, flags)

    const escaped = escapeRegExp(entry.term)
    if (settings.mode === 'exact')
      return new RegExp(`(?:^|\\b)${escaped}(?:\\b|$)`, flags)

    return new RegExp(escaped, flags)
  }
  catch (error) {
    console.warn('[caption-highlighter] Failed to build regex for entry', entry.term, error)
    return null
  }
}

export function createMatcher(entries: DictionaryEntry[], settings: MatchingSettings) {
  const compiled: CompiledEntry[] = entries
    .map(entry => ({ entry, regex: buildRegex(entry, settings) }))
    .filter((item): item is CompiledEntry => Boolean(item.regex))

  const maxHighlights = settings.maxHighlightsPerNode

  function findMatches(text: string): MatchResult[] {
    if (!text)
      return []

    const matches: MatchResult[] = []

    for (const { entry, regex } of compiled) {
      regex.lastIndex = 0
      let result: RegExpExecArray | null
      while ((result = regex.exec(text))) {
        const matchText = result[0]
        if (!matchText)
          break

        const start = result.index
        const end = start + matchText.length
        matches.push({ entry, matchText, start, end })
        if (matches.length >= maxHighlights)
          break
        if (!regex.global)
          break
      }
      if (matches.length >= maxHighlights)
        break
    }

    if (!matches.length)
      return matches

    matches.sort((a, b) => {
      if (a.start === b.start)
        return (b.end - b.start) - (a.end - a.start)
      return a.start - b.start
    })

    const filtered: MatchResult[] = []
    let lastEnd = -1
    for (const match of matches) {
      if (match.start < lastEnd)
        continue
      filtered.push(match)
      lastEnd = match.end
      if (filtered.length >= maxHighlights)
        break
    }

    return filtered
  }

  return {
    findMatches,
  }
}

export type Matcher = ReturnType<typeof createMatcher>
