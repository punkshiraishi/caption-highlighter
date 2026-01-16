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
  | { type: 'settings:set', payload: UserSettings }

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
})
