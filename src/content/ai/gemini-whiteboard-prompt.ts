export interface GeminiWhiteboardPromptPayload {
  captions: string
  previousSummary: string
}

/**
 * キャプションのクリーンアップ（途中経過を除去）
 * - 短すぎる行（15文字以下）を除外
 * - 残った行の最後3行をスペース結合
 */
export function cleanCaptionsForWhiteboard(captions: string): string {
  const lines = captions.split('\n')
  const filtered = lines.filter(line => line.length > 15)
  return filtered.slice(-3).join(' ')
}

/**
 * Gemini Nanoに送るプロンプト文字列を構築（ホワイトボード用）
 */
export function buildWhiteboardPrompt(payload: GeminiWhiteboardPromptPayload): string {
  const { captions, previousSummary } = payload
  const cleanedCaptions = cleanCaptionsForWhiteboard(captions)

  if (previousSummary && previousSummary.trim()) {
    return `会議メモを更新。ネストした箇条書きで構造化。強調記号(**)は使わない。

現在のメモ:
${previousSummary}

追加内容: ${cleanedCaptions}

更新したメモ:
-`
  }

  return `会議発言をネストした箇条書きで構造化。強調記号(**)は使わない。

発言: ${cleanedCaptions}

構造化メモ:
- 議題
  -`
}
