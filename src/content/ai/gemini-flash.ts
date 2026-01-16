import browser from 'webextension-polyfill'
import { buildWhiteboardPrompt } from './gemini-whiteboard-prompt'
import { buildWhiteboardImagePrompt } from './gemini-whiteboard-image-prompt'
import type { ParsedLLMResponse } from '~/shared/models/whiteboard'

export class GeminiFlashClient {
  async summarize(captionText: string, previousSummary: string = '', model?: string): Promise<ParsedLLMResponse> {
    try {
      const prompt = buildWhiteboardPrompt({
        captions: captionText,
        previousSummary,
      })

      const response = await browser.runtime.sendMessage({
        type: 'ai:flash:summarize',
        payload: {
          model,
          prompt,
        },
      }) as { ok: boolean, text?: string, error?: string }

      if (!response?.ok) {
        return {
          success: false,
          items: [],
          markdownContent: '',
          error: response?.error || 'Flash request failed',
        }
      }

      return this.parseMarkdownResponse(response.text || '')
    }
    catch (error) {
      console.error('[Whiteboard] Failed to summarize with Flash:', error)
      return {
        success: false,
        items: [],
        markdownContent: '',
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  async generateWhiteboardImage(markdown: string): Promise<{ success: boolean, dataUrl?: string, error?: string }> {
    try {
      const prompt = buildWhiteboardImagePrompt({ markdown })
      const response = await browser.runtime.sendMessage({
        type: 'ai:flash:generate-image',
        payload: { prompt },
      }) as { ok: boolean, image?: { base64: string, mimeType: string }, error?: string }

      if (!response?.ok || !response.image?.base64) {
        return {
          success: false,
          error: response?.error || 'Image generation failed',
        }
      }

      const mime = response.image.mimeType || 'image/png'
      const dataUrl = `data:${mime};base64,${response.image.base64}`
      return { success: true, dataUrl }
    }
    catch (error) {
      console.error('[Whiteboard] Failed to generate image:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  async getConfig(): Promise<{
    enabled: boolean
    allowSendCaptionsToCloud: boolean
    hasApiKey: boolean
    hasPermission: boolean
    model: string
  }> {
    const resp = await browser.runtime.sendMessage({ type: 'ai:flash:config' }) as any
    if (!resp?.ok) {
      return {
        enabled: false,
        allowSendCaptionsToCloud: false,
        hasApiKey: false,
        hasPermission: false,
        model: 'gemini-2.5-flash-lite',
      }
    }
    return {
      enabled: Boolean(resp.enabled),
      allowSendCaptionsToCloud: Boolean(resp.allowSendCaptionsToCloud),
      hasApiKey: Boolean(resp.hasApiKey),
      hasPermission: Boolean(resp.hasPermission),
      model: String(resp.model || 'gemini-2.5-flash-lite'),
    }
  }

  private parseMarkdownResponse(response: string): ParsedLLMResponse {
    if (!response || typeof response !== 'string') {
      return {
        success: false,
        items: [],
        markdownContent: '',
        error: 'Empty response from LLM',
      }
    }

    let markdown = response.trim()
    if (markdown.startsWith('```')) {
      const firstNewline = markdown.indexOf('\n')
      const lastFence = markdown.lastIndexOf('```')
      if (firstNewline !== -1 && lastFence > firstNewline)
        markdown = markdown.slice(firstNewline + 1, lastFence).trim()
    }

    if (markdown.length > 0) {
      return {
        success: true,
        items: [],
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
}

let clientInstance: GeminiFlashClient | null = null

export function getGeminiFlashClient(): GeminiFlashClient {
  if (!clientInstance)
    clientInstance = new GeminiFlashClient()
  return clientInstance
}
