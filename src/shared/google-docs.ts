const GOOGLE_DOCS_DOCUMENT_PATH = /^https:\/\/docs\.google\.com\/document\/d\/([^/?#]+)/

export interface GoogleDocsTabSummary {
  tabId: number
  windowId: number
  title: string
  url: string
  documentId: string
  active: boolean
}

export function extractGoogleDocsDocumentId(url: string): string | null {
  const match = GOOGLE_DOCS_DOCUMENT_PATH.exec(url)
  return match?.[1] ?? null
}

export function isGoogleDocsDocumentUrl(url: string): boolean {
  return extractGoogleDocsDocumentId(url) !== null
}

export function buildGoogleDocsDocumentUrlPattern(documentId: string): string {
  return `https://docs.google.com/document/d/${documentId}/*`
}
