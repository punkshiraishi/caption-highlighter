import browser from 'webextension-polyfill'
import { ensureSettingsInitialized, loadUserSettings, saveUserSettings } from '~/shared/storage/settings'
import type { UserSettings } from '~/shared/models/settings'

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
  | { type: 'settings:set'; payload: UserSettings }

browser.runtime.onMessage.addListener(async (message: MessagePayload) => {
  if (!message || typeof message !== 'object')
    return

  if (message.type === 'settings:get')
    return loadUserSettings()

  if (message.type === 'settings:set') {
    await saveUserSettings(message.payload)
    return { ok: true }
  }
})
