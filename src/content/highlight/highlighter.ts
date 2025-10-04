import { CAPTION_NODE_ATTRIBUTE } from '../dom/caption-observer'
import type { TooltipController } from './tooltip'
import type { DictionaryEntry } from '~/shared/models/dictionary'
import type { MatchingSettings, ThemeSettings, UserSettings } from '~/shared/models/settings'
import { type MatchResult, type Matcher, createMatcher } from '~/shared/matching/matcher'

const PROCESSED_ATTRIBUTE = 'data-ch-processed-version'
const HIGHLIGHT_CLASS = 'caption-highlighter__match'

function textNodesUnder(element: HTMLElement): Text[] {
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      if (!node.textContent)
        return NodeFilter.FILTER_REJECT
      if (!node.textContent.trim())
        return NodeFilter.FILTER_REJECT
      if (node.parentElement?.classList.contains(HIGHLIGHT_CLASS))
        return NodeFilter.FILTER_REJECT
      return NodeFilter.FILTER_ACCEPT
    },
  })

  const nodes: Text[] = []
  let current: Node | null = walker.nextNode()
  while (current) {
    nodes.push(current as Text)
    current = walker.nextNode()
  }
  return nodes
}

function stripExistingHighlights(element: HTMLElement) {
  const highlights = Array.from(element.querySelectorAll<HTMLElement>(`.${HIGHLIGHT_CLASS}`))
  for (const highlight of highlights) {
    const parent = highlight.parentNode
    if (!parent)
      continue
    const text = highlight.textContent ?? ''
    const textNode = document.createTextNode(text)
    parent.replaceChild(textNode, highlight)
    parent.normalize()
  }
}

interface HighlighterOptions {
  settings: UserSettings
  tooltip: TooltipController
}

export class CaptionHighlighter {
  private tooltip: TooltipController
  private settings: UserSettings
  private matcher: Matcher
  private entryIndex = new Map<string, DictionaryEntry>()
  private version = 0

  constructor(options: HighlighterOptions) {
    this.tooltip = options.tooltip
    this.settings = options.settings
    this.matcher = createMatcher(this.settings.dictionary.entries, this.settings.matching)
    this.refreshIndex()
  }

  updateSettings(settings: UserSettings) {
    this.settings = settings
    this.matcher = createMatcher(settings.dictionary.entries, settings.matching)
    this.refreshIndex()
    this.version += 1
  }

  private refreshIndex() {
    this.entryIndex = new Map(this.settings.dictionary.entries.map(entry => [entry.id, entry]))
  }

  process(element: HTMLElement) {
    if (!element.isConnected)
      return

    stripExistingHighlights(element)

    const textNodes = textNodesUnder(element)

    for (const textNode of textNodes) {
      this.highlightTextNode(textNode, this.settings.matching)
    }

    element.setAttribute(PROCESSED_ATTRIBUTE, this.version.toString())
  }

  reprocessAll(root: ParentNode = document) {
    const processed = Array.from(root.querySelectorAll<HTMLElement>(`[${PROCESSED_ATTRIBUTE}]`))
    const captionNodes = Array.from(root.querySelectorAll<HTMLElement>(`[${CAPTION_NODE_ATTRIBUTE}]`))
    const unique = new Set<HTMLElement>([...processed, ...captionNodes])
    unique.forEach(element => this.process(element))
  }

  private highlightTextNode(node: Text, matching: MatchingSettings) {
    const text = node.textContent ?? ''
    const matches = this.matcher.findMatches(text)
    if (!matches.length)
      return

    const fragment = document.createDocumentFragment()
    let lastIndex = 0
    let highlightsCount = 0

    for (const match of matches) {
      if (match.start > lastIndex) {
        fragment.append(text.substring(lastIndex, match.start))
      }

      const highlight = this.createHighlightElement(match)
      fragment.append(highlight)
      highlightsCount += 1
      lastIndex = match.end
      if (highlightsCount >= matching.maxHighlightsPerNode)
        break
    }

    if (lastIndex < text.length)
      fragment.append(text.substring(lastIndex))

    node.replaceWith(fragment)
  }

  private createHighlightElement(match: MatchResult) {
    const span = document.createElement('span')
    span.textContent = match.matchText
    span.dataset.chEntryId = match.entry.id
    span.setAttribute('role', 'note')
    span.setAttribute('aria-label', `${match.entry.term}: ${match.entry.definition}`)
    span.title = `${match.entry.term}: ${match.entry.definition}`

    const entry = this.entryIndex.get(match.entry.id) ?? match.entry
    this.tooltip.register(span, entry)

    return span
  }
}

export function applyThemeVariables(theme: ThemeSettings) {
  const root = document.documentElement
  root.style.setProperty('--caption-highlighter-highlight-bg', theme.highlightBg)
  root.style.setProperty('--caption-highlighter-highlight-text', theme.highlightText)
  root.style.setProperty('--caption-highlighter-highlight-border', theme.highlightBorder)
  root.style.setProperty('--caption-highlighter-popup-bg', theme.popupBg)
  root.style.setProperty('--caption-highlighter-popup-text', theme.popupText)
}
