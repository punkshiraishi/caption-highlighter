import { debounce } from '~/shared/utils/timing'

export interface CaptionObserverOptions {
  selectors: string[]
  debounceMs: number
}

export type CaptionListener = (element: HTMLElement) => void

const CAPTION_DATA_ATTRIBUTE = 'data-ch-caption'

export class CaptionObserver {
  private readonly selectors: string[]
  private readonly listeners = new Set<CaptionListener>()
  private readonly pending = new Set<HTMLElement>()
  private scheduleFlushFn: () => void
  private debounceMs: number

  private container: HTMLElement | null = null
  private rootObserver?: MutationObserver
  private captionObserver?: MutationObserver

  constructor(options: CaptionObserverOptions) {
    this.selectors = options.selectors
    this.debounceMs = options.debounceMs
    this.scheduleFlushFn = this.createDebouncedFlush()
  }

  start() {
    this.observeRoot()
    this.tryAttach()
  }

  stop() {
    this.rootObserver?.disconnect()
    this.captionObserver?.disconnect()
    this.pending.clear()
  }

  onCaption(listener: CaptionListener): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  private observeRoot() {
    this.rootObserver?.disconnect()
    this.rootObserver = new MutationObserver(() => {
      this.tryAttach()
    })
    this.rootObserver.observe(document.body, {
      childList: true,
      subtree: true,
    })
  }

  private tryAttach() {
    if (this.container && document.contains(this.container))
      return

    const next = this.findContainer()
    if (!next)
      return

    this.attachTo(next)
  }

  private findContainer(): HTMLElement | null {
    for (const selector of this.selectors) {
      const candidate = document.querySelector<HTMLElement>(selector)
      if (candidate)
        return candidate
    }
    return null
  }

  private attachTo(container: HTMLElement) {
    this.container = container
    this.captionObserver?.disconnect()

    this.captionObserver = new MutationObserver(mutations => this.handleMutations(mutations))
    this.captionObserver.observe(container, {
      childList: true,
      subtree: true,
      characterData: true,
    })

    const initialNodes = Array.from(container.querySelectorAll<HTMLElement>('*'))
      .filter(el => el.childNodes.length > 0)

    initialNodes.forEach(node => this.queue(node))
    this.scheduleFlushFn()
  }

  private handleMutations(mutations: MutationRecord[]) {
    for (const mutation of mutations) {
      if (mutation.type === 'childList') {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE)
            this.queue(node as HTMLElement)
          else if (node.nodeType === Node.TEXT_NODE && mutation.target instanceof HTMLElement)
            this.queue(mutation.target)
        })
      }
      else if (mutation.type === 'characterData' && mutation.target.parentElement) {
        this.queue(mutation.target.parentElement)
      }
    }

    if (this.pending.size)
      this.scheduleFlushFn()
  }

  private queue(element: HTMLElement) {
    if (!element.isConnected)
      return

    element.setAttribute(CAPTION_DATA_ATTRIBUTE, '1')
    this.pending.add(element)
  }

  setDebounceMs(delay: number) {
    if (delay === this.debounceMs)
      return
    this.debounceMs = delay
    this.scheduleFlushFn = this.createDebouncedFlush()
  }

  private createDebouncedFlush() {
    return debounce(() => this.flush(), this.debounceMs)
  }

  private flush() {
    if (!this.pending.size)
      return

    const snapshot = Array.from(this.pending)
    this.pending.clear()

    snapshot.forEach((element) => {
      if (!element.isConnected)
        return
      for (const listener of this.listeners)
        listener(element)
    })
  }
}

export const CAPTION_NODE_ATTRIBUTE = CAPTION_DATA_ATTRIBUTE
