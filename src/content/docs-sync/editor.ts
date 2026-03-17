const EDITOR_FRAME_SELECTOR = 'iframe.docs-texteventtarget-iframe'

function isTextInput(element: Element | null): element is HTMLTextAreaElement | HTMLInputElement {
  return element instanceof HTMLTextAreaElement || element instanceof HTMLInputElement
}

function canEditElement(element: Element | null): element is HTMLElement {
  return element instanceof HTMLElement && (element.isContentEditable || element === element.ownerDocument.body)
}

function findEditorContext(): { document: Document, target: HTMLElement | HTMLTextAreaElement | HTMLInputElement } | null {
  const editorFrame = document.querySelector<HTMLIFrameElement>(EDITOR_FRAME_SELECTOR)
  const frameDocument = editorFrame?.contentDocument ?? null

  if (frameDocument) {
    const frameCandidates = [
      frameDocument.activeElement,
      frameDocument.querySelector('[contenteditable="true"]'),
      frameDocument.body,
    ]

    for (const candidate of frameCandidates) {
      if (isTextInput(candidate) || canEditElement(candidate))
        return { document: frameDocument, target: candidate }
    }
  }

  const pageCandidates = [
    document.querySelector('[contenteditable="true"]'),
    document.activeElement,
    document.body,
  ]

  for (const candidate of pageCandidates) {
    if (isTextInput(candidate) || canEditElement(candidate))
      return { document, target: candidate }
  }

  return null
}

function dispatchKeyboardShortcut(target: HTMLElement | HTMLTextAreaElement | HTMLInputElement, key: string): void {
  const isMac = navigator.platform.toUpperCase().includes('MAC')
  const eventInit = {
    key,
    code: `Key${key.toUpperCase()}`,
    bubbles: true,
    cancelable: true,
    metaKey: isMac,
    ctrlKey: !isMac,
  }

  target.dispatchEvent(new KeyboardEvent('keydown', eventInit))
  target.dispatchEvent(new KeyboardEvent('keyup', eventInit))
}

function replaceEditableText(
  context: { document: Document, target: HTMLElement | HTMLTextAreaElement | HTMLInputElement },
  text: string,
): boolean {
  const { document: targetDocument, target } = context
  target.focus()

  if (isTextInput(target)) {
    target.select()
    target.setRangeText(text, 0, target.value.length, 'end')
    target.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: text }))
    return true
  }

  dispatchKeyboardShortcut(target, 'a')

  if (typeof targetDocument.execCommand === 'function') {
    if (targetDocument.execCommand('selectAll') && targetDocument.execCommand('insertText', false, text))
      return true
  }

  const selection = targetDocument.getSelection()
  const range = targetDocument.createRange()
  range.selectNodeContents(target)
  selection?.removeAllRanges()
  selection?.addRange(range)
  range.deleteContents()
  range.insertNode(targetDocument.createTextNode(text))
  selection?.removeAllRanges()
  target.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: text }))
  return true
}

async function waitForEditorContext(timeoutMs = 2500): Promise<{ document: Document, target: HTMLElement | HTMLTextAreaElement | HTMLInputElement } | null> {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    const context = findEditorContext()
    if (context)
      return context
    await new Promise(resolve => setTimeout(resolve, 150))
  }
  return null
}

export async function applyMarkdownToOpenGoogleDoc(markdownContent: string): Promise<void> {
  const context = await waitForEditorContext()
  if (!context)
    throw new Error('Google Docs editor surface was not found.')

  const normalized = markdownContent.trim().length > 0 ? markdownContent : ' '
  replaceEditableText(context, normalized)
}
