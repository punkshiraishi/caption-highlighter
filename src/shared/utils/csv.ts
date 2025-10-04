import Papa from 'papaparse'
import { createDictionaryEntry } from '../models/dictionary'
import type { DictionaryEntry } from '../models/dictionary'

export interface CsvParseResult {
  headers: string[]
  rows: Record<string, string>[]
}

export function parseCsv(content: string): CsvParseResult {
  const result = Papa.parse<Record<string, string>>(content, {
    header: true,
    skipEmptyLines: true,
    transformHeader: header => header.trim(),
  })

  if (result.errors.length)
    throw new Error(result.errors.map(error => error.message).join('\n'))

  const headers = result.meta.fields?.map(field => field.trim()).filter(Boolean) ?? []

  return {
    headers,
    rows: result.data,
  }
}

export interface DictionaryImportStats {
  added: number
  skipped: number
}

export function buildDictionaryFromCsv(rows: Record<string, string>[], termColumn: string, definitionColumn: string): { entries: DictionaryEntry[]; stats: DictionaryImportStats } {
  const entries: DictionaryEntry[] = []
  let skipped = 0

  for (const row of rows) {
    const term = (row[termColumn] ?? '').toString().trim()
    const definition = (row[definitionColumn] ?? '').toString().trim()
    if (!term || !definition) {
      skipped += 1
      continue
    }

    entries.push(createDictionaryEntry(term, definition, 'imported'))
  }

  return {
    entries,
    stats: {
      added: entries.length,
      skipped,
    },
  }
}

export interface CsvPreviewRow {
  [column: string]: string
}

export function previewRows(rows: Record<string, string>[], limit = 5): CsvPreviewRow[] {
  return rows.slice(0, limit).map(row => ({ ...row }))
}
