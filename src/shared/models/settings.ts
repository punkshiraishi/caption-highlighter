import type { DictionaryState } from './dictionary'
import { DEFAULT_DICTIONARY_STATE } from './dictionary'

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

export interface UserSettings {
  dictionary: DictionaryState
  matching: MatchingSettings
  theme: ThemeSettings
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

export const DEFAULT_USER_SETTINGS: UserSettings = {
  dictionary: DEFAULT_DICTIONARY_STATE,
  matching: DEFAULT_MATCHING_SETTINGS,
  theme: DEFAULT_THEME_SETTINGS,
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
  }
}
