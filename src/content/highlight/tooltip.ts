import type { DictionaryEntry } from '~/shared/models/dictionary'
import type { ThemeSettings } from '~/shared/models/settings'

const TOOLTIP_ID = 'caption-highlighter-tooltip'

export class TooltipController {
  private readonly entryMap = new WeakMap<HTMLElement, DictionaryEntry>()
  private readonly tooltipEl: HTMLDivElement
  private readonly termEl: HTMLDivElement
  private readonly definitionEl: HTMLDivElement
  constructor(theme: ThemeSettings) {
    this.tooltipEl = document.createElement('div')
    this.tooltipEl.id = TOOLTIP_ID
    this.tooltipEl.className = 'caption-highlighter__tooltip'
    this.tooltipEl.setAttribute('role', 'tooltip')
    this.tooltipEl.setAttribute('aria-live', 'polite')
    this.tooltipEl.style.position = 'fixed'
    this.tooltipEl.style.pointerEvents = 'none'
    this.tooltipEl.style.opacity = '0'
    this.tooltipEl.style.transition = 'opacity 120ms ease-in-out'
    this.tooltipEl.style.visibility = 'hidden'

    this.termEl = document.createElement('div')
    this.termEl.className = 'caption-highlighter__tooltip-term'
    this.definitionEl = document.createElement('div')
    this.definitionEl.className = 'caption-highlighter__tooltip-definition'

    this.tooltipEl.append(this.termEl, this.definitionEl)
    document.body.appendChild(this.tooltipEl)

    this.applyTheme(theme)
  }

  updateTheme(theme: ThemeSettings) {
    this.applyTheme(theme)
  }

  register(element: HTMLElement, entry: DictionaryEntry) {
    if (this.entryMap.has(element))
      return

    element.setAttribute('tabindex', '0')
    element.classList.add('caption-highlighter__match')
    element.dataset.chDefinitionAvailable = '1'

    this.entryMap.set(element, entry)

    const show = (event: Event) => {
      this.showTooltip(entry, event.currentTarget as HTMLElement)
    }
    const hide = () => {
      this.hideTooltip()
    }

    element.addEventListener('mouseenter', show)
    element.addEventListener('focus', show)
    element.addEventListener('pointerenter', show)
    element.addEventListener('mouseleave', hide)
    element.addEventListener('blur', hide)
    element.addEventListener('pointerleave', hide)
    element.addEventListener('touchstart', show, { passive: true })
    element.addEventListener('touchend', hide, { passive: true })

    element.addEventListener('keydown', (event) => {
      if (event instanceof KeyboardEvent && (event.key === 'Escape' || event.key === 'Esc'))
        this.hideTooltip()
    })
  }

  private showTooltip(entry: DictionaryEntry, element: HTMLElement) {
    this.termEl.textContent = entry.term
    this.definitionEl.textContent = entry.definition

    this.tooltipEl.style.opacity = '1'
    this.tooltipEl.style.visibility = 'visible'

    this.positionTooltip(element)
  }

  private hideTooltip() {
    this.tooltipEl.style.opacity = '0'
    this.tooltipEl.style.visibility = 'hidden'
  }

  private positionTooltip(element: HTMLElement) {
    const rect = element.getBoundingClientRect()
    const tooltipRect = this.tooltipEl.getBoundingClientRect()

    let top = rect.bottom + 6
    let left = rect.left + (rect.width / 2) - (tooltipRect.width / 2)

    if (top + tooltipRect.height > window.innerHeight - 8)
      top = rect.top - tooltipRect.height - 6

    if (top < 8)
      top = 8

    if (left + tooltipRect.width > window.innerWidth - 8)
      left = window.innerWidth - tooltipRect.width - 8

    if (left < 8)
      left = 8

    this.tooltipEl.style.top = `${top}px`
    this.tooltipEl.style.left = `${left}px`
  }

  private applyTheme(theme: ThemeSettings) {
    this.tooltipEl.style.backgroundColor = theme.popupBg
    this.tooltipEl.style.color = theme.popupText
    this.tooltipEl.style.border = `1px solid ${theme.highlightBorder}`
  }
}
