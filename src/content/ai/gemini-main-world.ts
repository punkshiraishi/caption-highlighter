/**
 * Gemini Nano Main World Script
 * メインワールドで実行され、LanguageModel APIに直接アクセスする
 */

interface BridgeRequest {
  type: 'GEMINI_NANO_REQUEST'
  action: 'checkAvailability' | 'createSession' | 'prompt' | 'destroy'
  payload?: any
  requestId: string
}

interface BridgeResponse {
  type: 'GEMINI_NANO_RESPONSE'
  requestId: string
  success: boolean
  data?: any
  error?: string
}

const SYSTEM_PROMPT = `あなたは会議メモを作成するアシスタントです。
必ず以下の形式で出力してください：

- トピック1
  - サブトピック
- トピック2
  - サブトピック

「- 」で始まる箇条書きのみ出力。説明文は不要。`

let session: any = null

function getLanguageModelAPI(): any {
  // @ts-expect-error LanguageModel is a global
  if (typeof self !== 'undefined' && self.LanguageModel) {
    // @ts-expect-error LanguageModel is a global
    return self.LanguageModel
  }
  if (typeof window !== 'undefined' && (window as any).LanguageModel) {
    return (window as any).LanguageModel
  }
  if (typeof window !== 'undefined' && (window as any).ai?.languageModel) {
    return (window as any).ai.languageModel
  }
  return null
}

async function checkAvailability(): Promise<{ available: boolean, status: string }> {
  const api = getLanguageModelAPI()
  console.log('[GeminiBridge] API found:', !!api)

  if (!api) {
    return { available: false, status: 'not-supported' }
  }

  try {
    let status: string
    if (api.availability) {
      status = await api.availability()
    }
    else if (api.capabilities) {
      const caps = await api.capabilities()
      status = caps.available
    }
    else {
      return { available: false, status: 'not-supported' }
    }

    console.log('[GeminiBridge] Availability status:', status)
    return {
      // 新しいAPIでは 'available'、古いAPIでは 'readily' が返る
      available: status === 'readily' || status === 'available',
      status,
    }
  }
  catch (error) {
    console.error('[GeminiBridge] Availability check failed:', error)
    return { available: false, status: 'error' }
  }
}

async function createSession(): Promise<boolean> {
  const api = getLanguageModelAPI()
  if (!api)
    return false

  try {
    session = await api.create({
      // システムプロンプトなし（Playgroundと同様）
      // 出力言語を日本語に指定（警告回避）
      expectedOutputLanguages: ['ja'],
      // Playgroundと同じ設定
      temperature: 1.0,
      topK: 3,
    })
    console.log('[GeminiBridge] Session created')
    return true
  }
  catch (error) {
    console.error('[GeminiBridge] Failed to create session:', error)
    return false
  }
}

interface PromptPayload {
  captions: string
  previousSummary: string
}

// キャプションのクリーンアップ（途中経過を除去）
function cleanCaptions(captions: string): string {
  const lines = captions.split('\n')
  // 短すぎる行（途中経過）を除去
  const filtered = lines.filter(line => line.length > 15)
  // 最後の3行のみ使用（重要な部分）
  return filtered.slice(-3).join(' ')
}

async function executePrompt(payload: PromptPayload): Promise<string> {
  if (!session) {
    const created = await createSession()
    if (!created) {
      throw new Error('Failed to create session')
    }
  }

  const { captions, previousSummary } = payload

  // キャプションから途中経過を除去
  const cleanedCaptions = cleanCaptions(captions)

  let prompt: string
  if (previousSummary && previousSummary.trim()) {
    prompt = `会議メモを更新。ネストした箇条書きで構造化。強調記号(**)は使わない。

現在のメモ:
${previousSummary}

追加内容: ${cleanedCaptions}

更新したメモ:
-`
  }
  else {
    prompt = `会議発言をネストした箇条書きで構造化。強調記号(**)は使わない。

発言: ${cleanedCaptions}

構造化メモ:
- 議題
  -`
  }

  console.log('[GeminiBridge] Executing prompt:')
  console.log('---PROMPT START---')
  console.log(prompt)
  console.log('---PROMPT END---')
  const result = await session.prompt(prompt)
  console.log('[GeminiBridge] Prompt result:', result)
  return result || ''
}

function destroySession(): void {
  if (session) {
    try {
      session.destroy()
    }
    catch {
      // ignore
    }
    session = null
  }
}

// メッセージハンドラ
window.addEventListener('message', async (event) => {
  if (event.source !== window)
    return

  const request = event.data as BridgeRequest
  if (!request || request.type !== 'GEMINI_NANO_REQUEST')
    return

  console.log('[GeminiBridge] Received request:', request.action)

  const response: BridgeResponse = {
    type: 'GEMINI_NANO_RESPONSE',
    requestId: request.requestId,
    success: false,
  }

  try {
    switch (request.action) {
      case 'checkAvailability': {
        const result = await checkAvailability()
        response.success = true
        response.data = result
        break
      }
      case 'createSession': {
        const created = await createSession()
        response.success = created
        response.data = created // クライアント側で期待している値を返す
        break
      }
      case 'prompt': {
        const result = await executePrompt(request.payload as PromptPayload)
        response.success = true
        response.data = result
        break
      }
      case 'destroy': {
        destroySession()
        response.success = true
        break
      }
    }
  }
  catch (error) {
    response.success = false
    response.error = error instanceof Error ? error.message : String(error)
    console.error('[GeminiBridge] Request failed:', error)
  }

  console.log('[GeminiBridge] Sending response:', response.success)
  window.postMessage(response, '*')
})

console.log('[GeminiBridge] Main world script initialized')
