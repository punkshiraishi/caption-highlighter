/**
 * ホワイトボード機能の型定義
 */

/**
 * ホワイトボードに表示する1つのアイテム（トピック/キーワード）
 */
export interface WhiteboardItem {
  id: string
  text: string
  level: number // ネストの深さ（0がルート）
  children: WhiteboardItem[]
  timestamp: number
  isNew?: boolean // 新規追加されたことを示すフラグ（アニメーション用）
}

/**
 * ホワイトボードの全体状態
 */
export interface WhiteboardState {
  items: WhiteboardItem[]
  /** マークダウン形式の要約テキスト */
  markdownContent: string
  lastUpdated: number
  isProcessing: boolean
}

/**
 * ホワイトボード設定
 */
export interface WhiteboardSettings {
  enabled: boolean
  /** キャプションをバッファする間隔（ミリ秒） */
  bufferIntervalMs: number
  /** LLM処理を実行する最小文字数 */
  minCharsToProcess: number
  /** パネルの初期位置 */
  panelPosition: {
    x: number
    y: number
  }
  /** パネルのサイズ */
  panelSize: {
    width: number
    height: number
  }
  /** パネルを最小化しているか */
  panelMinimized: boolean
}

/**
 * デフォルトのホワイトボード設定
 */
export function getDefaultWhiteboardSettings(): WhiteboardSettings {
  return {
    enabled: true,
    bufferIntervalMs: 30000, // 30秒ごとにLLM処理（Gemini Nanoは処理に時間がかかる）
    minCharsToProcess: 100, // 最低100文字でLLM処理
    panelPosition: { x: 20, y: 100 },
    panelSize: { width: 320, height: 400 },
    panelMinimized: false,
  }
}

/**
 * LLMからの応答をパースした結果
 */
export interface ParsedLLMResponse {
  success: boolean
  items: WhiteboardItem[]
  /** マークダウン形式の要約テキスト */
  markdownContent?: string
  error?: string
}

/**
 * Gemini Nano APIの可用性状態
 */
export type GeminiNanoAvailability =
  | 'available' // 利用可能
  | 'not-supported' // ブラウザが非対応
  | 'not-ready' // モデルがダウンロードされていない
  | 'error' // その他のエラー

/**
 * キャプションバッファのエントリ
 */
export interface CaptionBufferEntry {
  text: string
  timestamp: number
  speaker?: string
}

/**
 * ホワイトボードアイテムのIDを生成
 */
export function generateItemId(): string {
  return `wb-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
}

/**
 * 空のホワイトボード状態を生成
 */
export function createEmptyWhiteboardState(): WhiteboardState {
  return {
    items: [],
    markdownContent: '',
    lastUpdated: Date.now(),
    isProcessing: false,
  }
}
