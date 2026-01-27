/**
 * Minimal, safe Markdown renderer for content script UI.
 *
 * - Escapes all HTML first (so AI output can't inject HTML)
 * - Supports: headings (##/###/####), paragraphs, unordered/ordered lists (flat),
 *   fenced code blocks (```), inline code (`code`).
 *
 * NOTE: This is intentionally small to avoid pulling in heavy markdown libs.
 */

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function renderEmphasis(escapedText: string): string {
  // Bold first, then italic (keep patterns simple to avoid pathological backtracking)
  const boldStar = /\*\*([^*\r\n]+)\*\*/g
  const boldUnderscore = /__([^_\r\n]+)__/g
  const italicStar = /\*([^*\r\n]+)\*/g
  const italicUnderscore = /_([^_\r\n]+)_/g

  return escapedText
    .replace(boldStar, '<strong>$1</strong>')
    .replace(boldUnderscore, '<strong>$1</strong>')
    .replace(italicStar, '<em>$1</em>')
    .replace(italicUnderscore, '<em>$1</em>')
}

function renderInline(text: string): string {
  // Escape first, then add minimal inline formatting.
  // Inline code is handled first by splitting, so emphasis won't touch code spans.
  const parts = text.split(/`([^`]+)`/g)
  return parts
    .map((part, idx) => {
      const escaped = escapeHtml(part)
      // Odd indices are code captures
      if (idx % 2 === 1)
        return `<code>${escaped}</code>`
      return renderEmphasis(escaped)
    })
    .join('')
}

function isUnorderedListItem(line: string): RegExpExecArray | null {
  return /^([ \t]*)[-*][ \t]+([^\t \r\n].*)$/.exec(line)
}

function isOrderedListItem(line: string): RegExpExecArray | null {
  return /^([ \t]*)\d+\.[ \t]+([^\t \r\n].*)$/.exec(line)
}

export function renderMarkdownToHtml(markdown: string): string {
  const md = (markdown ?? '').replace(/\r\n/g, '\n').trim()
  if (!md)
    return ''

  const lines = md.split('\n')
  const out: string[] = []

  let paragraph: string[] = []
  let inCode = false
  let codeLines: string[] = []
  let listType: 'ul' | 'ol' | null = null

  const flushParagraph = () => {
    if (paragraph.length === 0)
      return
    const html = paragraph.map(l => renderInline(l.trim())).join('<br>')
    out.push(`<p>${html}</p>`)
    paragraph = []
  }

  const closeList = () => {
    if (!listType)
      return
    out.push(`</${listType}>`)
    listType = null
  }

  const openList = (next: 'ul' | 'ol') => {
    if (listType === next)
      return
    closeList()
    out.push(`<${next}>`)
    listType = next
  }

  const flushCode = () => {
    if (!inCode)
      return
    const code = escapeHtml(codeLines.join('\n'))
    out.push(`<pre><code>${code}</code></pre>`)
    inCode = false
    codeLines = []
  }

  for (const rawLine of lines) {
    const line = rawLine ?? ''
    const trimmed = line.trimEnd()

    if (inCode) {
      if (trimmed.startsWith('```')) {
        flushCode()
      }
      else {
        codeLines.push(rawLine)
      }
      continue
    }

    if (trimmed.startsWith('```')) {
      flushParagraph()
      closeList()
      inCode = true
      codeLines = []
      continue
    }

    // Blank line: end paragraph / list block
    if (trimmed.trim() === '') {
      flushParagraph()
      closeList()
      continue
    }

    // Horizontal rule (--- / *** / ___)
    if (/^(?:-{3,}|\*{3,}|_{3,})$/.test(trimmed.trim())) {
      flushParagraph()
      closeList()
      out.push('<hr>')
      continue
    }

    // Headings (## → h2 ... ##### → h5)
    const h = /^(#{2,5})[ \t]+([^\t \r\n].*)$/.exec(trimmed.trim())
    if (h) {
      flushParagraph()
      closeList()
      const level = h[1].length
      const tag = level === 2 ? 'h2' : level === 3 ? 'h3' : level === 4 ? 'h4' : 'h5'
      out.push(`<${tag}>${renderInline(h[2].trim())}</${tag}>`)
      continue
    }

    // Lists (flat)
    const ul = isUnorderedListItem(trimmed)
    if (ul) {
      flushParagraph()
      openList('ul')
      out.push(`<li>${renderInline(ul[2].trim())}</li>`)
      continue
    }
    const ol = isOrderedListItem(trimmed)
    if (ol) {
      flushParagraph()
      openList('ol')
      out.push(`<li>${renderInline(ol[2].trim())}</li>`)
      continue
    }

    // Paragraph line
    closeList()
    paragraph.push(trimmed)
  }

  flushParagraph()
  closeList()
  flushCode()

  return out.join('\n')
}
