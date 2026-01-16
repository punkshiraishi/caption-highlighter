import browser, { type Storage } from 'webextension-polyfill'
import type { DictionaryEntry } from '../models/dictionary'
import { mergeDictionaryEntries } from '../models/dictionary'
import type { UserSettings } from '../models/settings'
import { DEFAULT_USER_SETTINGS, applyUserSettingsDefaults } from '../models/settings'

export const STORAGE_VERSION = 1
export const STORAGE_KEY = 'captionHighlighter:userSettings'
export const STORAGE_VERSION_KEY = 'captionHighlighter:storageVersion'

export interface StoredSettingsPayload {
  settings: UserSettings
  version: number
}

function cloneEntries(entries: DictionaryEntry[]): DictionaryEntry[] {
  return entries.map(entry => ({
    ...entry,
    aliases: [...(entry.aliases ?? [])],
  }))
}

function normalizeSettings(settings: UserSettings): UserSettings {
  return {
    dictionary: {
      entries: mergeDictionaryEntries([], settings.dictionary.entries.map(entry => ({
        ...entry,
        aliases: [...(entry.aliases ?? [])],
      }))),
    },
    matching: { ...DEFAULT_USER_SETTINGS.matching, ...settings.matching },
    theme: { ...DEFAULT_USER_SETTINGS.theme, ...settings.theme },
  }
}

function deserializeSettings(payload: StoredSettingsPayload | null): UserSettings {
  if (!payload) {
    return {
      dictionary: { entries: [] },
      matching: { ...DEFAULT_USER_SETTINGS.matching },
      theme: { ...DEFAULT_USER_SETTINGS.theme },
    }
  }

  return applyUserSettingsDefaults({
    dictionary: {
      entries: cloneEntries(payload.settings.dictionary.entries).map(entry => ({
        ...entry,
        aliases: entry.aliases ?? [],
      })),
    },
    matching: payload.settings.matching,
    theme: payload.settings.theme,
  })
}

export async function loadUserSettings(): Promise<UserSettings> {
  const result = await browser.storage.local.get({
    [STORAGE_KEY]: null,
  }) as Record<string, StoredSettingsPayload | null>

  return deserializeSettings(result[STORAGE_KEY])
}

export async function saveUserSettings(settings: UserSettings): Promise<void> {
  const normalized = normalizeSettings(settings)

  await browser.storage.local.set({
    [STORAGE_KEY]: {
      settings: normalized,
      version: STORAGE_VERSION,
    },
    [STORAGE_VERSION_KEY]: STORAGE_VERSION,
  })
}

export async function ensureSettingsInitialized(): Promise<UserSettings> {
  const existing = await browser.storage.local.get({
    [STORAGE_KEY]: null,
  }) as Record<string, StoredSettingsPayload | null>

  if (!existing[STORAGE_KEY]) {
    await saveUserSettings(DEFAULT_USER_SETTINGS)
    return DEFAULT_USER_SETTINGS
  }

  return deserializeSettings(existing[STORAGE_KEY])
}

export type SettingsChangeCallback = (settings: UserSettings) => void

export function observeSettings(callback: SettingsChangeCallback): () => void {
  const listener = (changes: Record<string, Storage.StorageChange>, area: string) => {
    if (area !== 'local')
      return

    if (!changes[STORAGE_KEY])
      return

    const updated = changes[STORAGE_KEY].newValue as StoredSettingsPayload | null
    if (!updated)
      return

    callback(deserializeSettings(updated))
  }

  browser.storage.onChanged.addListener(listener)

  return () => browser.storage.onChanged.removeListener(listener)
}
