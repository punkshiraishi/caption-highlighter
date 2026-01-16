/**
 * キャプション収集バッファ
 * CaptionObserverから受け取ったテキストを蓄積し、一定間隔でLLM処理に渡す
 */

import type { CaptionBufferEntry, WhiteboardSettings } from '~/shared/models/whiteboard'

export type BufferFlushCallback = (text: string, entries: CaptionBufferEntry[]) => void

export class CaptionBuffer {
  private entries: CaptionBufferEntry[] = []
  private processedTexts = new Set<string>()
  private flushTimer: ReturnType<typeof setTimeout> | null = null
  private settings: WhiteboardSettings
  private onFlush: BufferFlushCallback | null = null

  constructor(settings: WhiteboardSettings) {
    this.settings = settings
  }

  /**
   * フラッシュ時のコールバックを設定
   */
  setFlushCallback(callback: BufferFlushCallback): void {
    this.onFlush = callback
  }

  /**
   * 設定を更新
   */
  updateSettings(settings: WhiteboardSettings): void {
    this.settings = settings
  }

  /**
   * キャプションテキストを追加
   */
  add(text: string, speaker?: string): void {
    if (!this.settings.enabled)
      return

    const normalizedText = this.normalizeText(text)
    if (!normalizedText)
      return

    // UIテキストをフィルタリング
    if (this.isUIText(normalizedText))
      return

    // 完全一致の重複チェック
    if (this.processedTexts.has(normalizedText))
      return

    // リアルタイム更新の処理：
    // 新しいテキストが既存のエントリの拡張版（途中経過）の場合、
    // 既存のエントリを置き換える
    const lastEntry = this.entries[this.entries.length - 1]
    if (lastEntry) {
      // 新しいテキストが前のテキストを含んでいる場合は置き換え
      if (normalizedText.startsWith(lastEntry.text.substring(0, 10))) {
        this.entries[this.entries.length - 1] = {
          text: normalizedText,
          timestamp: Date.now(),
          speaker,
        }
        this.processedTexts.add(normalizedText)
        return
      }
    }

    const entry: CaptionBufferEntry = {
      text: normalizedText,
      timestamp: Date.now(),
      speaker,
    }

    this.entries.push(entry)
    this.processedTexts.add(normalizedText)

    // 古い処理済みテキストの履歴を制限（メモリ対策）
    if (this.processedTexts.size > 500) {
      const toRemove = Array.from(this.processedTexts).slice(0, 100)
      toRemove.forEach(t => this.processedTexts.delete(t))
    }

    this.scheduleFlush()
  }

  /**
   * UIテキストかどうかを判定
   */
  private isUIText(text: string): boolean {
    const uiPatterns = [
      /^arrow_/i,
      /一番下に移動/,
      /一番上に移動/,
      /^[\s\p{P}]+$/u, // 記号のみ
    ]
    return uiPatterns.some(pattern => pattern.test(text))
  }

  /**
   * DOM要素からテキストを抽出して追加
   */
  addFromElement(element: HTMLElement): void {
    const text = element.textContent?.trim()
    if (text) {
      // スピーカー名を取得する試み（Google Meetの構造に依存）
      const speaker = this.extractSpeaker(element)
      this.add(text, speaker)
    }
  }

  /**
   * スピーカー名の抽出を試みる
   */
  private extractSpeaker(element: HTMLElement): string | undefined {
    // Google Meetではスピーカー名が別の要素に含まれることがある
    const parent = element.closest('[data-participant-id]')
    if (parent) {
      const nameEl = parent.querySelector('[data-self-name]')
      return nameEl?.textContent?.trim()
    }
    return undefined
  }

  /**
   * テキストを正規化
   */
  private normalizeText(text: string): string {
    return text
      .trim()
      .replace(/\s+/g, ' ')
      // 空文字や短すぎるテキストは無視
      .substring(0, 1000) // 長すぎるテキストを制限
  }

  /**
   * フラッシュをスケジュール
   */
  private scheduleFlush(): void {
    if (this.flushTimer)
      return

    this.flushTimer = setTimeout(() => {
      this.flush()
    }, this.settings.bufferIntervalMs)
  }

  /**
   * バッファをフラッシュしてコールバックを呼び出す
   */
  flush(): void {
    this.flushTimer = null

    if (this.entries.length === 0)
      return

    const combinedText = this.entries
      .map(e => e.speaker ? `${e.speaker}: ${e.text}` : e.text)
      .join('\n')

    // 最小文字数に達していなければスキップ（次回に持ち越し）
    if (combinedText.length < this.settings.minCharsToProcess) {
      this.scheduleFlush()
      return
    }

    const entriesCopy = [...this.entries]
    this.entries = []

    if (this.onFlush) {
      this.onFlush(combinedText, entriesCopy)
    }
  }

  /**
   * 強制的にフラッシュ（設定に関係なく）
   */
  forceFlush(): void {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer)
      this.flushTimer = null
    }

    if (this.entries.length === 0)
      return

    const combinedText = this.entries
      .map(e => e.speaker ? `${e.speaker}: ${e.text}` : e.text)
      .join('\n')

    const entriesCopy = [...this.entries]
    this.entries = []

    if (this.onFlush) {
      this.onFlush(combinedText, entriesCopy)
    }
  }

  /**
   * バッファをクリア
   */
  clear(): void {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer)
      this.flushTimer = null
    }
    this.entries = []
  }

  /**
   * 現在バッファされているエントリ数を取得
   */
  getEntryCount(): number {
    return this.entries.length
  }

  /**
   * 現在バッファされている文字数を取得
   */
  getCharCount(): number {
    return this.entries.reduce((sum, e) => sum + e.text.length, 0)
  }

  /**
   * リソースを解放
   */
  destroy(): void {
    this.clear()
    this.processedTexts.clear()
    this.onFlush = null
  }
}
