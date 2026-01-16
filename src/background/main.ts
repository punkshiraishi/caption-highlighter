import browser from 'webextension-polyfill'
import { ensureSettingsInitialized, loadUserSettings, saveUserSettings } from '~/shared/storage/settings'
import type { UserSettings } from '~/shared/models/settings'
import { loadSecrets } from '~/shared/storage/secrets'
import { GEMINI_FLASH_FIXED_MODEL, GEMINI_IMAGE_MODEL } from '~/shared/ai/gemini'

if (import.meta.hot) {
  // @ts-expect-error background HMR
  import('/@vite/client')
}

browser.runtime.onInstalled.addListener(async () => {
  await ensureSettingsInitialized()
})

browser.runtime.onStartup.addListener(async () => {
  await ensureSettingsInitialized()
})

type MessagePayload =
  | { type: 'settings:get' }
  | { type: 'settings:set', payload: UserSettings }
  | { type: 'ai:flash:config' }
  | { type: 'ai:flash:test', payload?: { model?: string } }
  | { type: 'ai:flash:summarize', payload: { model?: string, prompt: string } }
  | { type: 'ai:flash:generate-image', payload: { prompt: string } }

browser.runtime.onMessage.addListener(async (message: unknown) => {
  if (!message || typeof message !== 'object')
    return

  const msg = message as MessagePayload

  if (msg.type === 'settings:get')
    return loadUserSettings()

  if (msg.type === 'settings:set') {
    await saveUserSettings(msg.payload)
    return { ok: true }
  }

  if (msg.type === 'ai:flash:config') {
    const settings = await loadUserSettings()
    const secrets = await loadSecrets()

    const origins = ['https://generativelanguage.googleapis.com/*']
    const hasPerm = await browser.permissions.contains({ origins })

    return {
      ok: true,
      enabled: settings.ai.whiteboardProvider === 'flash',
      allowSendCaptionsToCloud: settings.ai.allowSendCaptionsToCloud,
      hasApiKey: Boolean(secrets.geminiApiKey?.trim()),
      hasPermission: hasPerm,
      model: GEMINI_FLASH_FIXED_MODEL,
    }
  }

  if (msg.type === 'ai:flash:test') {
    const settings = await loadUserSettings()
    const secrets = await loadSecrets()

    if (!settings.ai.allowSendCaptionsToCloud)
      return { ok: false, error: '外部送信の同意が必要です（Optionsで有効化してください）' }

    const apiKey = secrets.geminiApiKey?.trim()
    if (!apiKey)
      return { ok: false, error: 'API Key が未設定です（Optionsで設定してください）' }

    const origins = ['https://generativelanguage.googleapis.com/*']
    const hasPerm = await browser.permissions.contains({ origins })
    if (!hasPerm)
      return { ok: false, error: '権限がありません（Optionsで権限を許可してください）' }

    const model = GEMINI_FLASH_FIXED_MODEL
    const prompt = 'hello'
    const result = await callGeminiFlash({ apiKey, model, prompt })
    return { ok: true, text: result }
  }

  if (msg.type === 'ai:flash:summarize') {
    const settings = await loadUserSettings()
    const secrets = await loadSecrets()

    if (settings.ai.whiteboardProvider !== 'flash')
      return { ok: false, error: 'Flash が無効です（設定を確認してください）' }
    if (!settings.ai.allowSendCaptionsToCloud)
      return { ok: false, error: '外部送信の同意が必要です（Optionsで有効化してください）' }

    const apiKey = secrets.geminiApiKey?.trim()
    if (!apiKey)
      return { ok: false, error: 'API Key が未設定です（Optionsで設定してください）' }

    const origins = ['https://generativelanguage.googleapis.com/*']
    const hasPerm = await browser.permissions.contains({ origins })
    if (!hasPerm)
      return { ok: false, error: '権限がありません（Optionsで権限を許可してください）' }

    const model = GEMINI_FLASH_FIXED_MODEL
    const text = await callGeminiFlash({ apiKey, model, prompt: msg.payload.prompt })
    return { ok: true, text }
  }

  if (msg.type === 'ai:flash:generate-image') {
    const settings = await loadUserSettings()
    const secrets = await loadSecrets()

    if (!settings.ai.allowSendCaptionsToCloud)
      return { ok: false, error: '外部送信の同意が必要です（Optionsで有効化してください）' }

    const apiKey = secrets.geminiApiKey?.trim()
    if (!apiKey)
      return { ok: false, error: 'API Key が未設定です（Optionsで設定してください）' }

    const origins = ['https://generativelanguage.googleapis.com/*']
    const hasPerm = await browser.permissions.contains({ origins })
    if (!hasPerm)
      return { ok: false, error: '権限がありません（Optionsで権限を許可してください）' }

    const model = GEMINI_IMAGE_MODEL
    const image = await callGeminiImage({ apiKey, model, prompt: msg.payload.prompt })
    return { ok: true, image }
  }
})

const IMAGE_MODEL_CACHE_TTL = 5 * 60 * 1000
let cachedImageModel: { value: string, fetchedAt: number } | null = null

async function callGeminiFlash(params: { apiKey: string, model: string, prompt: string }): Promise<string> {
  const { apiKey, model, prompt } = params
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [
        {
          role: 'user',
          parts: [{ text: prompt }],
        },
      ],
      generationConfig: {
        temperature: 1.0,
        topK: 3,
      },
    }),
  })

  const data = await res.json().catch(() => null) as any
  if (!res.ok) {
    const msg = data?.error?.message || `HTTP ${res.status}`
    throw new Error(msg)
  }

  const text = (data?.candidates?.[0]?.content?.parts || [])
    .map((p: any) => p?.text || '')
    .join('')
    .trim()
  return text
}

async function callGeminiImage(params: { apiKey: string, model: string, prompt: string }): Promise<{ base64: string, mimeType: string }> {
  const { apiKey, model, prompt } = params
  const resolvedModel = await resolveImageModel(apiKey)
  const modelToUse = resolvedModel || model
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(modelToUse)}:generateContent?key=${encodeURIComponent(apiKey)}`

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [
        {
          role: 'user',
          parts: [{ text: prompt }],
        },
      ],
      generationConfig: {
        responseModalities: ['IMAGE'],
        imageConfig: {
          aspectRatio: '16:9',
        },
      },
    }),
  })

  const data = await res.json().catch(() => null) as any
  if (!res.ok) {
    const msg = data?.error?.message || `HTTP ${res.status}`
    throw new Error(msg)
  }

  const base64
    = data?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data
    || data?.images?.[0]?.bytesBase64Encoded
    || data?.generatedImages?.[0]?.bytesBase64Encoded

  if (!base64)
    throw new Error('画像データが取得できませんでした')

  const mimeType
    = data?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.mimeType
    || data?.images?.[0]?.mimeType
    || data?.generatedImages?.[0]?.mimeType
    || 'image/png'

  return { base64, mimeType }
}

async function resolveImageModel(apiKey: string): Promise<string | null> {
  if (cachedImageModel && Date.now() - cachedImageModel.fetchedAt < IMAGE_MODEL_CACHE_TTL) {
    return cachedImageModel.value
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`
  const res = await fetch(url, { method: 'GET' })
  const data = await res.json().catch(() => null) as any
  if (!res.ok) {
    return null
  }

  const models = Array.isArray(data?.models) ? data.models : []
  const candidates = models.filter((m: any) => Array.isArray(m?.supportedGenerationMethods))
  const withGenerateContent = candidates.filter((m: any) => m.supportedGenerationMethods.includes('generateContent'))
  const imageCandidates = withGenerateContent.filter((m: any) => /image/i.test(String(m?.name || '')))
  const preferredOrder = [
    'gemini-3-pro-image-preview',
    'gemini-2.5-flash-image',
    'gemini-2.0-flash-exp-image-generation',
  ]

  let picked: any = null
  for (const name of preferredOrder) {
    const found = imageCandidates.find((m: any) => String(m?.name || '').endsWith(name))
    if (found) {
      picked = found
      break
    }
  }
  if (!picked)
    picked = imageCandidates[0]
  if (!picked?.name)
    return null

  const name = String(picked.name || '')
  const modelName = name.startsWith('models/') ? name.slice('models/'.length) : name
  cachedImageModel = { value: modelName, fetchedAt: Date.now() }
  return modelName
}
