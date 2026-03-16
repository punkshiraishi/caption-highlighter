import browser from 'webextension-polyfill'
import { applyMarkdownToOpenGoogleDoc } from './editor'
import { extractGoogleDocsDocumentId } from '~/shared/google-docs'

let lastAppliedContent = ''

browser.runtime.onMessage.addListener(async (message: unknown) => {
  if (!message || typeof message !== 'object')
    return

  const msg = message as {
    type?: string
    payload?: { markdownContent?: string, documentId?: string }
  }

  if (msg.type !== 'gdocs-sync:apply-markdown')
    return

  const expectedDocumentId = msg.payload?.documentId
  const currentDocumentId = extractGoogleDocsDocumentId(window.location.href)

  if (!expectedDocumentId || currentDocumentId !== expectedDocumentId) {
    return { ok: false, error: 'The bound Google Doc does not match this tab.' }
  }

  const markdownContent = msg.payload?.markdownContent ?? ''
  if (markdownContent === lastAppliedContent)
    return { ok: true }

  try {
    await applyMarkdownToOpenGoogleDoc(markdownContent)
    lastAppliedContent = markdownContent
    return { ok: true }
  }
  catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    }
  }
})
