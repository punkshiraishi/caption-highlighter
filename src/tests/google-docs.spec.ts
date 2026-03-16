import { describe, expect, it } from 'vitest'
import {
  buildGoogleDocsDocumentUrlPattern,
  extractGoogleDocsDocumentId,
  isGoogleDocsDocumentUrl,
} from '~/shared/google-docs'

describe('google docs helpers', () => {
  it('extracts a document id from an edit url', () => {
    expect(extractGoogleDocsDocumentId('https://docs.google.com/document/d/abc123/edit')).toBe('abc123')
  })

  it('rejects non-document urls', () => {
    expect(extractGoogleDocsDocumentId('https://docs.google.com/spreadsheets/d/abc123/edit')).toBeNull()
    expect(isGoogleDocsDocumentUrl('https://docs.google.com/spreadsheets/d/abc123/edit')).toBe(false)
  })

  it('builds a stable query pattern for a bound document', () => {
    expect(buildGoogleDocsDocumentUrlPattern('abc123')).toBe('https://docs.google.com/document/d/abc123/*')
  })
})
