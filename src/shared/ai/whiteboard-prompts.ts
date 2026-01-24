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
    return `会議の議事録を更新し、階層的な見出しを含むMarkdownで構造化して出力してください。

ルール:
- 出力はMarkdownのみ（コードブロック・HTML・前置き/後置きは書かない）
- 見出しは3段階を使い分ける: "##"（大分類）、"###"（中分類）、"####"（小分類）
- 箇条書きは "-" を使う。必要なら入れ子のリストも使う
- 内容が複雑な場合は積極的に "###" や "####" で細分化する

現在の議事録（Markdown）:
${previousSummary}

追加内容: ${cleanedCaptions}

更新した議事録（Markdown）:
##`
  }

  return `会議発言を議事録として、階層的な見出しを含むMarkdownで構造化して出力してください。

ルール:
- 出力はMarkdownのみ（コードブロック・HTML・前置き/後置きは書かない）
- 見出しは3段階を使い分ける: "##"（大分類）、"###"（中分類）、"####"（小分類）
- 箇条書きは "-" を使う。必要なら入れ子のリストも使う
- 内容が複雑な場合は積極的に "###" や "####" で細分化する

発言: ${cleanedCaptions}

議事録（Markdown）:
##`
}

export function buildWhiteboardImagePrompt(payload: GeminiWhiteboardImagePromptPayload): string {
  const markdown = payload.markdown.trim()
  const safeMarkdown = markdown || '（議事録が空です）'

  return `あなたは画像生成AIです。以下の議事録を「ホワイトボードにまとめた一枚画像」として生成してください。

要件:
- 出力は文字を含む「画像」(SVGではなくラスター画像)。
- 白いホワイトボードの質感、薄い罫線や枠線、マーカーで書いたような手書き風。
- ホワイトボードのフレームや周りの風景は一切含めない。
- タイトル「議事録」を上部中央に配置。
- 議事録は短い箇条書きで、見出しと本文を整理して読みやすく。
- 余白を取り、セクションごとに囲みや区切りを入れる。
- 色は黒/濃いグレーを基調に、アクセント1〜2色まで。
- 文字は読みやすいサイズで、詰め込みすぎない。

議事録:
${safeMarkdown}

出力: 1枚の画像。`
}
