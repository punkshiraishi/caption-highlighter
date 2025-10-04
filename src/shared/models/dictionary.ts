export interface DictionaryEntry {
  id: string
  term: string
  definition: string
  aliases: string[]
  createdAt: string
  updatedAt: string
  source?: 'local' | 'imported'
}

export interface DictionaryState {
  entries: DictionaryEntry[]
}

export const DEFAULT_DICTIONARY_STATE: DictionaryState = {
  entries: [],
}

function normalizeAliases(aliases?: string[]): string[] {
  if (!aliases?.length)
    return []

  const unique = new Map<string, string>()
  for (const alias of aliases) {
    const trimmed = alias.trim()
    if (!trimmed)
      continue
    const key = trimmed.toLocaleLowerCase()
    if (!unique.has(key))
      unique.set(key, trimmed)
  }
  return Array.from(unique.values())
}

export function createDictionaryEntry(term: string, definition: string, source: DictionaryEntry['source'] = 'local', aliases?: string[]): DictionaryEntry {
  const now = new Date().toISOString()

  return {
    id: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    term: term.trim(),
    definition: definition.trim(),
    aliases: normalizeAliases(aliases),
    createdAt: now,
    updatedAt: now,
    source,
  }
}

export interface DictionaryMergeOptions {
  preferExisting?: boolean
}

function normalizeTerm(term: string) {
  return term.trim().toLocaleLowerCase()
}

export function mergeDictionaryEntries(existing: DictionaryEntry[], incoming: DictionaryEntry[], options: DictionaryMergeOptions = {}): DictionaryEntry[] {
  const byTerm = new Map<string, DictionaryEntry>()
  const preferExisting = options.preferExisting ?? false

  for (const entry of existing) {
    byTerm.set(normalizeTerm(entry.term), {
      ...entry,
      aliases: normalizeAliases(entry.aliases),
    })
  }

  for (const entry of incoming) {
    const key = normalizeTerm(entry.term)
    if (!entry.term.trim() || !entry.definition.trim())
      continue

    if (preferExisting && byTerm.has(key))
      continue

    byTerm.set(key, {
      ...entry,
      aliases: normalizeAliases(entry.aliases),
      updatedAt: new Date().toISOString(),
    })
  }

  return Array.from(byTerm.values())
    .sort((a, b) => a.term.localeCompare(b.term, undefined, { sensitivity: 'base' }))
}

export function removeDictionaryEntry(entries: DictionaryEntry[], id: string): DictionaryEntry[] {
  return entries.filter(entry => entry.id !== id)
}

export function replaceDictionary(entries: DictionaryEntry[]): DictionaryEntry[] {
  return mergeDictionaryEntries([], entries)
}
