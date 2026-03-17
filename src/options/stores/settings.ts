import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { DictionaryEntry } from '~/shared/models/dictionary'
import { mergeDictionaryEntries, removeDictionaryEntry } from '~/shared/models/dictionary'
import type { AiSettings, GoogleDocsSyncSettings, MatchingSettings, ThemeSettings, UserSettings } from '~/shared/models/settings'
import { DEFAULT_AI_SETTINGS, DEFAULT_GOOGLE_DOCS_SYNC_SETTINGS, DEFAULT_MATCHING_SETTINGS, DEFAULT_THEME_SETTINGS } from '~/shared/models/settings'
import { loadUserSettings, saveUserSettings } from '~/shared/storage/settings'

export const useSettingsStore = defineStore('settings', () => {
  const loading = ref(false)
  const dictionary = ref<DictionaryEntry[]>([])
  const matching = ref<MatchingSettings>({ ...DEFAULT_MATCHING_SETTINGS })
  const theme = ref<ThemeSettings>({ ...DEFAULT_THEME_SETTINGS })
  const ai = ref<AiSettings>({ ...DEFAULT_AI_SETTINGS })
  const docsSync = ref<GoogleDocsSyncSettings>({ ...DEFAULT_GOOGLE_DOCS_SYNC_SETTINGS })
  const filter = ref('')

  async function initialize() {
    loading.value = true
    try {
      const settings = await loadUserSettings()
      dictionary.value = [...settings.dictionary.entries]
      matching.value = { ...settings.matching }
      theme.value = { ...settings.theme }
      ai.value = { ...settings.ai }
      docsSync.value = {
        ...settings.docsSync,
        binding: settings.docsSync.binding ? { ...settings.docsSync.binding } : null,
      }
    }
    finally {
      loading.value = false
    }
  }

  async function persist() {
    const payload: UserSettings = {
      dictionary: { entries: [...dictionary.value] },
      matching: { ...matching.value },
      theme: { ...theme.value },
      ai: { ...ai.value },
      docsSync: {
        ...docsSync.value,
        binding: docsSync.value.binding ? { ...docsSync.value.binding } : null,
      },
    }

    await saveUserSettings(payload)
  }

  async function importEntries(entries: DictionaryEntry[]) {
    dictionary.value = mergeDictionaryEntries(dictionary.value, entries)
    await persist()
  }

  async function removeEntry(id: string) {
    dictionary.value = removeDictionaryEntry(dictionary.value, id)
    await persist()
  }

  async function clearDictionary() {
    dictionary.value = []
    await persist()
  }

  async function updateMatching(options: Partial<MatchingSettings>) {
    matching.value = { ...matching.value, ...options }
    await persist()
  }

  async function updateTheme(options: Partial<ThemeSettings>) {
    theme.value = { ...theme.value, ...options }
    await persist()
  }

  async function updateAi(options: Partial<AiSettings>) {
    ai.value = { ...ai.value, ...options }
    await persist()
  }

  async function updateDocsSync(options: Partial<GoogleDocsSyncSettings>) {
    docsSync.value = {
      ...docsSync.value,
      ...options,
      binding: options.binding === undefined
        ? (docsSync.value.binding ? { ...docsSync.value.binding } : null)
        : (options.binding ? { ...options.binding } : null),
    }
    await persist()
  }

  const filteredEntries = computed(() => {
    if (!filter.value.trim())
      return dictionary.value

    const token = filter.value.trim().toLocaleLowerCase()
    return dictionary.value.filter(entry => (
      entry.term.toLocaleLowerCase().includes(token)
      || entry.definition.toLocaleLowerCase().includes(token)
      || (entry.aliases ?? []).some(alias => alias.toLocaleLowerCase().includes(token))
    ))
  })

  function setFilter(value: string) {
    filter.value = value
  }

  return {
    loading,
    dictionary,
    matching,
    theme,
    ai,
    docsSync,
    filter,
    filteredEntries,
    initialize,
    importEntries,
    removeEntry,
    clearDictionary,
    updateMatching,
    updateTheme,
    updateAi,
    updateDocsSync,
    setFilter,
  }
})
