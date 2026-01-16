export interface GeminiWhiteboardImagePromptPayload {
  markdown: string
}

export function buildWhiteboardImagePrompt(payload: GeminiWhiteboardImagePromptPayload): string {
  const markdown = payload.markdown.trim()
  const safeMarkdown = markdown || '（議事録が空です）'

  return `あなたは画像生成AIです。以下の議事録を「ホワイトボードにまとめた一枚画像」として生成してください。

要件:
- 出力は文字を含む「画像」(SVGではなくラスター画像)。
- 白いホワイトボードの質感、薄い罫線や枠線、マーカーで書いたような手書き風。
- タイトル「議事録」を上部中央に配置。
- 議事録は短い箇条書きで、見出しと本文を整理して読みやすく。
- 余白を取り、セクションごとに囲みや区切りを入れる。
- 色は黒/濃いグレーを基調に、アクセント1〜2色まで。
- 文字は読みやすいサイズで、詰め込みすぎない。

議事録:
${safeMarkdown}

出力: 1枚の画像。`
}
