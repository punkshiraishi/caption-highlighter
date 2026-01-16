/**
 * ホワイトボードプロセッサ
 * キャプションをLLMで処理し、ホワイトボードの状態を管理する
 */

/* eslint-disable no-console */

import { getGeminiNanoClient } from '../ai/gemini-nano'
import { getGeminiFlashClient } from '../ai/gemini-flash'
import { CaptionBuffer } from './caption-buffer'
import type { WhiteboardSettings, WhiteboardState } from '~/shared/models/whiteboard'
import { createEmptyWhiteboardState } from '~/shared/models/whiteboard'
import type { AiSettings } from '~/shared/models/settings'

export type WhiteboardUpdateCallback = (state: WhiteboardState) => void

export class WhiteboardProcessor {
  private state: WhiteboardState
  private settings: WhiteboardSettings
  private buffer: CaptionBuffer
  private updateCallbacks = new Set<WhiteboardUpdateCallback>()
  private isInitialized = false
  private ai: AiSettings | null = null

  constructor(settings: WhiteboardSettings) {
    this.settings = settings
    this.state = createEmptyWhiteboardState()
    this.buffer = new CaptionBuffer(settings)

    this.buffer.setFlushCallback((text) => {
      this.processCaption(text)
    })
  }

  /**
   * AI設定を更新（provider切替など）
   */
  setAiSettings(ai: AiSettings): void {
    const prev = this.ai?.whiteboardProvider
    this.ai = ai

    // provider切替時は初期化状態をリセット
    if (prev && prev !== ai.whiteboardProvider) {
      this.isInitialized = false
      if (prev === 'nano')
        getGeminiNanoClient().destroy()
    }
  }

  /**
   * 初期化（providerに応じて準備）
   */
  async initialize(): Promise<boolean> {
    if (!this.ai) {
      console.warn('[Whiteboard] AI settings not set')
      this.isInitialized = false
      return false
    }

    if (this.ai.whiteboardProvider === 'nano') {
      const client = getGeminiNanoClient()
      const availability = await client.checkAvailability()

      if (availability === 'available') {
        const sessionCreated = await client.createSession()
        this.isInitialized = sessionCreated
        return sessionCreated
      }

      console.warn('[Whiteboard] Gemini Nano not available:', availability)
      this.isInitialized = false
      return false
    }

    // flash
    const flash = getGeminiFlashClient()
    const config = await flash.getConfig()
    const ok = config.allowSendCaptionsToCloud && config.hasApiKey && config.hasPermission
    this.isInitialized = ok
    return ok
  }

  /**
   * 初期化済みかどうか
   */
  isReady(): boolean {
    return this.isInitialized && this.settings.enabled
  }

  /**
   * 状態更新のコールバックを登録
   */
  onUpdate(callback: WhiteboardUpdateCallback): () => void {
    this.updateCallbacks.add(callback)
    return () => this.updateCallbacks.delete(callback)
  }

  /**
   * 設定を更新
   */
  updateSettings(settings: WhiteboardSettings): void {
    this.settings = settings
    this.buffer.updateSettings(settings)
  }

  /**
   * キャプション要素を処理
   */
  addCaption(element: HTMLElement): void {
    if (!this.settings.enabled)
      return
    this.buffer.addFromElement(element)
  }

  /**
   * キャプションテキストを直接追加
   */
  addCaptionText(text: string): void {
    if (!this.settings.enabled)
      return
    this.buffer.add(text)
  }

  /**
   * キャプションをLLMで処理
   */
  private async processCaption(text: string): Promise<void> {
    if (!this.isInitialized) {
      console.warn('[Whiteboard] Processor not initialized')
      return
    }
    if (!this.ai) {
      console.warn('[Whiteboard] AI settings not set')
      return
    }

    // LLM処理中は新しいリクエストをスキップ
    if (this.state.isProcessing) {
      console.log('[Whiteboard] Skipping - already processing')
      return
    }

    console.log('[Whiteboard] Processing caption:', text.substring(0, 100), '...')
    this.updateState({ isProcessing: true })

    try {
      // 前回の要約を含めてLLMに送信
      const result = this.ai.whiteboardProvider === 'flash'
        ? await getGeminiFlashClient().summarize(text, this.state.markdownContent, this.ai.flashModel)
        : await getGeminiNanoClient().summarize(text, this.state.markdownContent)

      if (result.success && result.markdownContent) {
        this.updateState({
          markdownContent: result.markdownContent,
          lastUpdated: Date.now(),
        })
        console.log('[Whiteboard] Summary updated')
      }
      else if (result.error) {
        console.warn('[Whiteboard] LLM processing failed:', result.error)
      }
    }
    catch (error) {
      console.error('[Whiteboard] Processing error:', error)
    }
    finally {
      this.updateState({ isProcessing: false })
    }
  }

  /**
   * 状態を更新してコールバックを呼び出す
   */
  private updateState(partial: Partial<WhiteboardState>): void {
    this.state = { ...this.state, ...partial }
    this.notifyUpdate()
  }

  /**
   * コールバックに更新を通知
   */
  private notifyUpdate(): void {
    for (const callback of this.updateCallbacks) {
      try {
        callback(this.state)
      }
      catch (error) {
        console.error('[Whiteboard] Update callback error:', error)
      }
    }
  }

  /**
   * 現在の状態を取得
   */
  getState(): WhiteboardState {
    return this.state
  }

  /**
   * 状態をクリア
   */
  clear(): void {
    this.state = createEmptyWhiteboardState()
    this.buffer.clear()
    this.notifyUpdate()
  }

  /**
   * バッファを強制フラッシュ
   */
  forceProcess(): void {
    this.buffer.forceFlush()
  }

  /**
   * リソースを解放
   */
  destroy(): void {
    this.buffer.destroy()
    this.updateCallbacks.clear()
    getGeminiNanoClient().destroy()
  }
}
