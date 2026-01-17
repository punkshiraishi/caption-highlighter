export interface GeminiWhiteboardPromptPayload {
  captions: string
  previousSummary: string
}

export interface GeminiWhiteboardImagePromptPayload {
  markdown: string
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
 * Geminiに送るプロンプト文字列を構築（ホワイトボード用）
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

export function buildWhiteboardImagePrompt(payload: GeminiWhiteboardImagePromptPayload): string {
  const markdown = payload.markdown.trim()
  const safeMarkdown = markdown || '（議事録が空です）'

  return `あなたは画像生成AIです。以下の議事録を「ホワイトボードにまとめた一枚画像」として生成してください。

要件:
- 出力は文字を含む「画像」(SVGではなくラスター画像)。
- 白いホワイトボードの質感、薄い罫線や枠線、マーカーで書いたような手書き風。
- ホワイトボードのフレームや周りの風景は含めない。
- タイトル「議事録」を上部中央に配置。
- 議事録は短い箇条書きで、見出しと本文を整理して読みやすく。
- 余白を取り、セクションごとに囲みや区切りを入れる。
- 色は黒/濃いグレーを基調に、アクセント1〜2色まで。
- 文字は読みやすいサイズで、詰め込みすぎない。

議事録:
${safeMarkdown}

出力: 1枚の画像。`
}
