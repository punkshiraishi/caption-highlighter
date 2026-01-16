export interface Secrets {
  /** AI Studio API Key（Gemini Flash 用） */
  geminiApiKey: string
}

export const DEFAULT_SECRETS: Secrets = {
  geminiApiKey: '',
}
