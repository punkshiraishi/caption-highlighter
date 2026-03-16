import browser from 'webextension-polyfill'
import type { Tabs } from 'webextension-polyfill'
import type { GoogleDocsSyncBindResponse, GoogleDocsSyncPushResponse, GoogleDocsSyncStatus } from '~/shared/messages/google-docs-sync'
import type { GoogleDocsBinding, UserSettings } from '~/shared/models/settings'
import { buildGoogleDocsDocumentUrlPattern, extractGoogleDocsDocumentId, isGoogleDocsDocumentUrl, type GoogleDocsTabSummary } from '~/shared/google-docs'
import { loadUserSettings, saveUserSettings } from '~/shared/storage/settings'

interface DocsSyncRuntimeState {
  lastAttemptAt: number | null
  lastSuccessAt: number | null
  lastError: string | null
  resolvedTabId: number | null
}

const runtimeState: DocsSyncRuntimeState = {
  lastAttemptAt: null,
  lastSuccessAt: null,
  lastError: null,
  resolvedTabId: null,
}

function toTabSummary(tab: Tabs.Tab): GoogleDocsTabSummary | null {
  if (typeof tab.id !== 'number' || typeof tab.windowId !== 'number' || !tab.url)
    return null

  const documentId = extractGoogleDocsDocumentId(tab.url)
  if (!documentId)
    return null

  return {
    tabId: tab.id,
    windowId: tab.windowId,
    title: tab.title ?? 'Untitled Google Doc',
    url: tab.url,
    documentId,
    active: Boolean(tab.active),
  }
}

async function listGoogleDocsTabs(): Promise<GoogleDocsTabSummary[]> {
  const tabs = await browser.tabs.query({ url: ['https://docs.google.com/document/*'] })
  return tabs
    .map(toTabSummary)
    .filter((value): value is GoogleDocsTabSummary => value !== null)
    .sort((left, right) => Number(right.active) - Number(left.active))
}

async function resolveBoundTab(binding: GoogleDocsBinding | null): Promise<Tabs.Tab | null> {
  if (!binding)
    return null

  if (typeof binding.tabId === 'number') {
    try {
      const tab = await browser.tabs.get(binding.tabId)
      if (tab.url && extractGoogleDocsDocumentId(tab.url) === binding.documentId)
        return tab
    }
    catch {
      // Bound tab was closed.
    }
  }

  const tabs = await browser.tabs.query({ url: [buildGoogleDocsDocumentUrlPattern(binding.documentId)] })
  return tabs[0] ?? null
}

async function buildStatus(settings?: UserSettings): Promise<GoogleDocsSyncStatus> {
  const currentSettings = settings ?? await loadUserSettings()
  const binding = currentSettings.docsSync.binding
  const resolved = await resolveBoundTab(binding)

  runtimeState.resolvedTabId = resolved?.id ?? null

  return {
    enabled: currentSettings.docsSync.enabled,
    binding,
    state: !binding ? 'unbound' : resolved ? 'ready' : 'stale',
    resolvedTabId: runtimeState.resolvedTabId,
    lastAttemptAt: runtimeState.lastAttemptAt,
    lastSuccessAt: runtimeState.lastSuccessAt,
    lastError: runtimeState.lastError,
  }
}

export async function handleListGoogleDocsTabs() {
  return {
    ok: true,
    tabs: await listGoogleDocsTabs(),
  }
}

export async function handleBindGoogleDocsTab(tabId: number): Promise<GoogleDocsSyncBindResponse> {
  const tab = await browser.tabs.get(tabId)
  if (!tab.url || !isGoogleDocsDocumentUrl(tab.url) || typeof tab.id !== 'number' || typeof tab.windowId !== 'number')
    return { ok: false, error: 'Google Docs の編集タブを選択してください。' }

  const documentId = extractGoogleDocsDocumentId(tab.url)
  if (!documentId)
    return { ok: false, error: 'Google Docs のドキュメントIDを取得できませんでした。' }

  const settings = await loadUserSettings()
  const nextSettings: UserSettings = {
    ...settings,
    docsSync: {
      enabled: true,
      binding: {
        tabId: tab.id,
        windowId: tab.windowId,
        url: tab.url,
        title: tab.title ?? 'Untitled Google Doc',
        documentId,
        boundAt: Date.now(),
      },
    },
  }

  await saveUserSettings(nextSettings)
  runtimeState.lastError = null

  return {
    ok: true,
    settings: nextSettings.docsSync,
    status: await buildStatus(nextSettings),
  }
}

export async function handleUnbindGoogleDocsTab(): Promise<GoogleDocsSyncBindResponse> {
  const settings = await loadUserSettings()
  const nextSettings: UserSettings = {
    ...settings,
    docsSync: {
      enabled: false,
      binding: null,
    },
  }

  await saveUserSettings(nextSettings)
  runtimeState.lastError = null
  runtimeState.resolvedTabId = null

  return {
    ok: true,
    settings: nextSettings.docsSync,
    status: await buildStatus(nextSettings),
  }
}

export async function handlePushGoogleDocsUpdate(markdownContent: string): Promise<GoogleDocsSyncPushResponse> {
  const settings = await loadUserSettings()
  const statusBefore = await buildStatus(settings)

  if (!settings.docsSync.enabled || !settings.docsSync.binding) {
    return { ok: true, status: statusBefore }
  }

  const targetTab = await resolveBoundTab(settings.docsSync.binding)
  runtimeState.lastAttemptAt = Date.now()

  if (!targetTab?.id) {
    runtimeState.lastError = 'Bound Google Docs tab is no longer open.'
    return {
      ok: false,
      status: await buildStatus(settings),
      error: runtimeState.lastError,
    }
  }

  try {
    const response = await browser.tabs.sendMessage(targetTab.id, {
      type: 'gdocs-sync:apply-markdown',
      payload: {
        markdownContent,
        documentId: settings.docsSync.binding.documentId,
      },
    }) as { ok?: boolean, error?: string } | undefined

    if (!response?.ok) {
      runtimeState.lastError = response?.error ?? 'Google Docs tab did not accept the update.'
      return {
        ok: false,
        status: await buildStatus(settings),
        error: runtimeState.lastError,
      }
    }

    runtimeState.lastSuccessAt = Date.now()
    runtimeState.lastError = null
    return {
      ok: true,
      status: await buildStatus(settings),
    }
  }
  catch (error) {
    runtimeState.lastError = error instanceof Error ? error.message : String(error)
    return {
      ok: false,
      status: await buildStatus(settings),
      error: runtimeState.lastError,
    }
  }
}

export async function handleGetGoogleDocsStatus() {
  return {
    ok: true,
    status: await buildStatus(),
  }
}
