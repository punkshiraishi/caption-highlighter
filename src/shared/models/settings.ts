import type { DictionaryState } from './dictionary'
import { DEFAULT_DICTIONARY_STATE } from './dictionary'
import { GEMINI_FLASH_FIXED_MODEL } from '~/shared/ai/gemini'

export type MatchingMode = 'exact' | 'partial' | 'regex'

export interface MatchingSettings {
  mode: MatchingMode
  caseSensitive: boolean
  debounceMs: number
  maxHighlightsPerNode: number
}

export interface ThemeSettings {
  highlightBg: string
  highlightText: string
  highlightBorder: string
  popupBg: string
  popupText: string
}

export type WhiteboardProvider = 'nano' | 'flash'

export interface AiSettings {
  /** ホワイトボード要約のプロバイダ（初期スコープは2択） */
  whiteboardProvider: WhiteboardProvider
  /** Flash 等の外部 LLM 利用に対する同意（外部送信の明示オプトイン） */
  allowSendCaptionsToCloud: boolean
  /** Flash のモデル名（将来の差し替え用） */
  flashModel: string
}

export interface UserSettings {
  dictionary: DictionaryState
  matching: MatchingSettings
  theme: ThemeSettings
  ai: AiSettings
}

export const DEFAULT_MATCHING_SETTINGS: MatchingSettings = {
  mode: 'partial',
  caseSensitive: false,
  debounceMs: 50,
  maxHighlightsPerNode: 20,
}

export const DEFAULT_THEME_SETTINGS: ThemeSettings = {
  highlightBg: '#fff2a8',
  highlightText: '#1b1b1b',
  highlightBorder: '#d49700',
  popupBg: '#1b1b1b',
  popupText: '#ffffff',
}

export const DEFAULT_AI_SETTINGS: AiSettings = {
  whiteboardProvider: 'nano',
  allowSendCaptionsToCloud: false,
  flashModel: GEMINI_FLASH_FIXED_MODEL,
}

export const DEFAULT_USER_SETTINGS: UserSettings = {
  dictionary: DEFAULT_DICTIONARY_STATE,
  matching: DEFAULT_MATCHING_SETTINGS,
  theme: DEFAULT_THEME_SETTINGS,
  ai: DEFAULT_AI_SETTINGS,
}

export function applyUserSettingsDefaults(partial?: Partial<UserSettings>): UserSettings {
  return {
    dictionary: partial?.dictionary
      ? {
          entries: partial.dictionary.entries.map(entry => ({
            ...entry,
            aliases: [...(entry.aliases ?? [])],
          })),
        }
      : {
          entries: DEFAULT_DICTIONARY_STATE.entries.map(entry => ({
            ...entry,
            aliases: [...(entry.aliases ?? [])],
          })),
        },
    matching: { ...DEFAULT_MATCHING_SETTINGS, ...partial?.matching },
    theme: { ...DEFAULT_THEME_SETTINGS, ...partial?.theme },
    ai: { ...DEFAULT_AI_SETTINGS, ...partial?.ai },
  }
}
