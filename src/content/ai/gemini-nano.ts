/**
 * Gemini Nano (Chrome Built-in AI) API ラッパー
 * Main World で実行されるブリッジスクリプトとメッセージパッシングで通信
 */

/* eslint-disable no-console */

import type { GeminiNanoAvailability, ParsedLLMResponse } from '~/shared/models/whiteboard'

interface BridgeResponse {
  type: 'GEMINI_NANO_RESPONSE'
  requestId: string
  success: boolean
  data?: any
  error?: string
}

export class GeminiNanoClient {
  private availability: GeminiNanoAvailability = 'not-supported'
  private pendingRequests = new Map<string, { resolve: (value: any) => void, reject: (reason: any) => void }>()

  constructor() {
    // メッセージリスナーを設定
    window.addEventListener('message', (event) => {
      if (event.source !== window)
        return
      const response = event.data as BridgeResponse
      if (!response || response.type !== 'GEMINI_NANO_RESPONSE')
        return

      const pending = this.pendingRequests.get(response.requestId)
      if (pending) {
        this.pendingRequests.delete(response.requestId)
        if (response.success) {
          pending.resolve(response.data)
        }
        else {
          pending.reject(new Error(response.error || 'Unknown error'))
        }
      }
    })

    console.log('[Whiteboard] GeminiNanoClient initialized')
  }

  /**
   * ブリッジにリクエストを送信
   */
  private sendRequest<T>(action: string, payload?: any): Promise<T> {
    const requestId = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(requestId, { resolve, reject })

      // タイムアウト設定（90秒 - Gemini Nanoの初回処理は時間がかかる）
      const timeoutId = setTimeout(() => {
        if (this.pendingRequests.has(requestId)) {
          this.pendingRequests.delete(requestId)
          reject(new Error('Request timeout'))
        }
      }, 90000)

      // 成功時にタイムアウトをクリア
      const originalResolve = resolve
      const originalReject = reject
      this.pendingRequests.set(requestId, {
        resolve: (value) => {
          clearTimeout(timeoutId)
          originalResolve(value)
        },
        reject: (reason) => {
          clearTimeout(timeoutId)
          originalReject(reason)
        },
      })

      console.log('[Whiteboard] Sending request:', action)
      window.postMessage({
        type: 'GEMINI_NANO_REQUEST',
        action,
        payload,
        requestId,
      }, '*')
    })
  }

  /**
   * Gemini Nano APIが利用可能かチェック
   */
  async checkAvailability(): Promise<GeminiNanoAvailability> {
    try {
      const result = await this.sendRequest<{ available: boolean, status: string }>('checkAvailability')
      console.log('[Whiteboard] Availability result:', result)

      // 新しいAPIでは 'available'、古いAPIでは 'readily' が返る
      if (result.available || result.status === 'available' || result.status === 'readily') {
        this.availability = 'available'
      }
      else if (result.status === 'after-download') {
        this.availability = 'not-ready'
      }
      else {
        this.availability = 'not-supported'
      }

      return this.availability
    }
    catch (error) {
      console.error('[Whiteboard] Failed to check availability:', error)
      this.availability = 'error'
      return this.availability
    }
  }

  /**
   * 現在の可用性状態を取得
   */
  getAvailability(): GeminiNanoAvailability {
    return this.availability
  }

  /**
   * セッションを作成
   */
  async createSession(): Promise<boolean> {
    try {
      return await this.sendRequest<boolean>('createSession')
    }
    catch (error) {
      console.error('[Whiteboard] Failed to create session:', error)
      return false
    }
  }

  /**
   * セッションが有効かどうか（ブリッジ経由では常にtrue扱い）
   */
  hasSession(): boolean {
    return this.availability === 'available'
  }

  /**
   * キャプションを構造化（マークダウン形式で出力）
   */
  async summarize(captionText: string, previousSummary: string = ''): Promise<ParsedLLMResponse> {
    try {
      const response = await this.sendRequest<string>('prompt', {
        captions: captionText,
        previousSummary,
      })
      return this.parseMarkdownResponse(response)
    }
    catch (error) {
      console.error('[Whiteboard] Failed to summarize:', error)
      return {
        success: false,
        items: [],
        markdownContent: '',
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * マークダウン形式のレスポンスをパース
   */
  private parseMarkdownResponse(response: string): ParsedLLMResponse {
    console.log('[Whiteboard] Raw LLM response:', response)

    // レスポンスが空の場合
    if (!response || typeof response !== 'string') {
      return {
        success: false,
        items: [],
        markdownContent: '',
        error: 'Empty response from LLM',
      }
    }

    // マークダウンコードブロックを除去（正規表現のバックトラッキングを避ける）
    let markdown = response.trim()
    if (markdown.startsWith('```')) {
      const firstNewline = markdown.indexOf('\n')
      const lastFence = markdown.lastIndexOf('```')
      if (firstNewline !== -1 && lastFence > firstNewline)
        markdown = markdown.slice(firstNewline + 1, lastFence).trim()
    }

    // 箇条書きでなくてもテキストがあれば成功とする
    // LLMが箇条書きを返さない場合もあるため
    if (markdown.length > 0) {
      return {
        success: true,
        items: [], // マークダウン形式ではitemsは使用しない
        markdownContent: markdown,
      }
    }

    return {
      success: false,
      items: [],
      markdownContent: '',
      error: 'Empty content after parsing',
    }
  }

  /**
   * セッションを破棄
   */
  destroy(): void {
    this.sendRequest('destroy').catch(() => {})
  }
}

/**
 * シングルトンインスタンス
 */
let clientInstance: GeminiNanoClient | null = null

export function getGeminiNanoClient(): GeminiNanoClient {
  if (!clientInstance) {
    clientInstance = new GeminiNanoClient()
  }
  return clientInstance
}
