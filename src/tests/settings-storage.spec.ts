import { beforeEach, describe, expect, it, vi } from 'vitest'
import { STORAGE_KEY, STORAGE_VERSION_KEY, loadUserSettings, saveUserSettings } from '~/shared/storage/settings'

const localStore = new Map<string, unknown>()

vi.mock('webextension-polyfill', () => ({
  default: {
    storage: {
      local: {
        async get(defaults: Record<string, unknown>) {
          const result: Record<string, unknown> = {}
          for (const [key, fallback] of Object.entries(defaults))
            result[key] = localStore.has(key) ? localStore.get(key) : fallback
          return result
        },
        async set(values: Record<string, unknown>) {
          for (const [key, value] of Object.entries(values))
            localStore.set(key, value)
        },
      },
      onChanged: {
        addListener() {},
        removeListener() {},
      },
    },
  },
}))

describe('settings storage', () => {
  beforeEach(() => {
    localStore.clear()
  })

  it('migrates legacy AI provider settings to cloud-only defaults', async () => {
    localStore.set(STORAGE_KEY, {
      version: 1,
      settings: {
        dictionary: { entries: [] },
        matching: undefined,
        theme: undefined,
        ai: {
          whiteboardProvider: 'nano',
          allowSendCaptionsToCloud: false,
        },
        docsSync: undefined,
      },
    })

    const settings = await loadUserSettings()

    expect(settings.ai.allowSendCaptionsToCloud).toBe(false)
    expect(settings.ai.flashModel).toBe('gemini-flash-lite-latest')
    expect('whiteboardProvider' in settings.ai).toBe(false)
  })

  it('persists normalized cloud AI settings', async () => {
    await saveUserSettings({
      dictionary: { entries: [] },
      matching: {
        mode: 'partial',
        caseSensitive: false,
        debounceMs: 50,
        maxHighlightsPerNode: 20,
      },
      theme: {
        highlightBg: '#fff2a8',
        highlightText: '#1b1b1b',
        highlightBorder: '#d49700',
        popupBg: '#1b1b1b',
        popupText: '#ffffff',
      },
      ai: {
        allowSendCaptionsToCloud: true,
        flashModel: 'gemini-flash-lite-latest',
      },
      docsSync: {
        enabled: false,
        binding: null,
      },
    })

    expect(localStore.get(STORAGE_VERSION_KEY)).toBe(1)
    expect(localStore.get(STORAGE_KEY)).toMatchObject({
      version: 1,
      settings: {
        ai: {
          allowSendCaptionsToCloud: true,
          flashModel: 'gemini-flash-lite-latest',
        },
      },
    })
  })
})
