import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CaptionObserver, DEFAULT_CAPTION_SELECTORS } from '~/content/dom/caption-observer'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const sampleHtml = readFileSync(join(__dirname, 'meets-sample-dom.html'), 'utf-8')

describe('caption observer', () => {
  beforeEach(() => {
    document.body.innerHTML = sampleHtml
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    document.body.innerHTML = ''
  })

  it('captures the spoken caption text from the Meet DOM', () => {
    const observer = new CaptionObserver({
      selectors: DEFAULT_CAPTION_SELECTORS,
      debounceMs: 0,
    })

    const observed: string[] = []

    observer.onCaption((element) => {
      const content = element.textContent?.trim()
      if (!content)
        return

      if (content.includes('テストテスト'))
        observed.push(content)
    })

    observer.start()
    vi.runOnlyPendingTimers()
    observer.stop()

    expect(observed).toContain('テストテスト。 テストテスト。')
  })
})
