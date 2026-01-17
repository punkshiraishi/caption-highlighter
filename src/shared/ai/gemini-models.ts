export interface GeminiModelInfo {
  name?: string
  supportedGenerationMethods?: string[]
}

export function normalizeModelName(name: string): string {
  return name.startsWith('models/') ? name.slice('models/'.length) : name
}

/**
 * 画像生成に使うモデル名を、models.listの結果から選ぶ。
 * - generateContent 対応
 * - モデル名に "image" を含むもの
 * - 優先順を固定（同一性担保）
 */
export function pickPreferredImageModel(models: GeminiModelInfo[]): string | null {
  const candidates = models
    .filter(m => Array.isArray(m.supportedGenerationMethods))
    .filter(m => m.supportedGenerationMethods!.includes('generateContent'))
    .filter(m => typeof m.name === 'string' && /image/i.test(m.name))

  const preferredOrder = [
    'gemini-3-pro-image-preview',
    'gemini-2.5-flash-image',
    'gemini-2.0-flash-exp-image-generation',
  ]

  for (const preferred of preferredOrder) {
    const found = candidates.find(m => normalizeModelName(String(m.name)).endsWith(preferred))
    if (found?.name)
      return normalizeModelName(String(found.name))
  }

  const fallback = candidates[0]?.name
  return fallback ? normalizeModelName(String(fallback)) : null
}
