import browser from 'webextension-polyfill'
import type { Secrets } from '../models/secrets'
import { DEFAULT_SECRETS } from '../models/secrets'

export const SECRETS_STORAGE_KEY = 'captionHighlighter:secrets'

export async function loadSecrets(): Promise<Secrets> {
  const result = await browser.storage.local.get({
    [SECRETS_STORAGE_KEY]: null,
  }) as Record<string, Secrets | null>

  const stored = result[SECRETS_STORAGE_KEY]
  return {
    ...DEFAULT_SECRETS,
    ...(stored ?? {}),
  }
}

export async function saveSecrets(secrets: Partial<Secrets>): Promise<void> {
  const current = await loadSecrets()
  const next: Secrets = {
    ...current,
    ...secrets,
  }

  await browser.storage.local.set({
    [SECRETS_STORAGE_KEY]: next,
  })
}
