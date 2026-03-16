import browser from 'webextension-polyfill'
import type { Tabs } from 'webextension-polyfill'
import type { GoogleDocsSyncBindResponse, GoogleDocsSyncPushResponse, GoogleDocsSyncStatus } from '~/shared/messages/google-docs-sync'
import type { GoogleDocsBinding, UserSettings } from '~/shared/models/settings'
import { type GoogleDocsTabSummary, buildGoogleDocsDocumentUrlPattern, extractGoogleDocsDocumentId, isGoogleDocsDocumentUrl } from '~/shared/google-docs'
import { loadUserSettings, saveUserSettings } from '~/shared/storage/settings'

interface DocsSyncRuntimeState {
  lastAttemptAt: number | null
  lastSuccessAt: number | null
  lastError: string | null
  resolvedTabId: number | null
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function getChromeRuntimeLastError(): { message?: string } | null {
  return (globalThis as typeof globalThis & { chrome?: { runtime?: { lastError?: { message?: string } } } }).chrome?.runtime?.lastError ?? null
}

function getDebuggerApi(): {
  attach: (target: { tabId: number }, version: string, callback: () => void) => void
  detach: (target: { tabId: number }, callback: () => void) => void
  sendCommand: (target: { tabId: number }, method: string, commandParams: object | undefined, callback: (result: unknown) => void) => void
} {
  const debuggerApi = (globalThis as typeof globalThis & { chrome?: { debugger?: {
    attach: (target: { tabId: number }, version: string, callback: () => void) => void
    detach: (target: { tabId: number }, callback: () => void) => void
    sendCommand: (target: { tabId: number }, method: string, commandParams: object | undefined, callback: (result: unknown) => void) => void
  } } }).chrome?.debugger
  if (!debuggerApi)
    throw new Error('chrome.debugger API is unavailable.')
  return debuggerApi
}

function attachDebugger(tabId: number): Promise<void> {
  return new Promise((resolve, reject) => {
    getDebuggerApi().attach({ tabId }, '1.3', () => {
      const lastError = getChromeRuntimeLastError()
      if (lastError && !lastError.message?.includes('Another debugger is already attached')) {
        reject(new Error(lastError.message))
        return
      }
      resolve()
    })
  })
}

function detachDebugger(tabId: number): Promise<void> {
  return new Promise((resolve) => {
    getDebuggerApi().detach({ tabId }, () => resolve())
  })
}

function sendDebuggerCommand<T = unknown>(tabId: number, method: string, commandParams?: object): Promise<T> {
  return new Promise((resolve, reject) => {
    getDebuggerApi().sendCommand({ tabId }, method, commandParams, (result: unknown) => {
      const lastError = getChromeRuntimeLastError()
      if (lastError) {
        reject(new Error(lastError.message))
        return
      }
      resolve(result as T)
    })
  })
}

async function applyMarkdownWithDebugger(tabId: number, markdownContent: string): Promise<void> {
  const normalized = markdownContent.trim().length > 0 ? markdownContent : ' '

  await attachDebugger(tabId)
  try {
    await sendDebuggerCommand(tabId, 'Runtime.enable')
    await sendDebuggerCommand(tabId, 'Page.enable')

    await sendDebuggerCommand(tabId, 'Runtime.evaluate', {
      expression: `(() => {
        const frame = document.querySelector('iframe.docs-texteventtarget-iframe');
        const doc = frame && frame.contentDocument;
        const target = doc && doc.querySelector('[contenteditable="true"]');
        if (!doc || !target) return false;
        target.focus();
        return true;
      })()`,
      awaitPromise: false,
      returnByValue: true,
    })

    await sleep(150)

    const metaModifier = 4
    await sendDebuggerCommand(tabId, 'Input.dispatchKeyEvent', { type: 'rawKeyDown', key: 'Meta', code: 'MetaLeft', windowsVirtualKeyCode: 91, nativeVirtualKeyCode: 91, modifiers: metaModifier })
    await sendDebuggerCommand(tabId, 'Input.dispatchKeyEvent', { type: 'keyDown', key: 'a', code: 'KeyA', windowsVirtualKeyCode: 65, nativeVirtualKeyCode: 65, modifiers: metaModifier })
    await sendDebuggerCommand(tabId, 'Input.dispatchKeyEvent', { type: 'keyUp', key: 'a', code: 'KeyA', windowsVirtualKeyCode: 65, nativeVirtualKeyCode: 65, modifiers: metaModifier })
    await sendDebuggerCommand(tabId, 'Input.dispatchKeyEvent', { type: 'keyUp', key: 'Meta', code: 'MetaLeft', windowsVirtualKeyCode: 91, nativeVirtualKeyCode: 91 })

    await sleep(80)

    await sendDebuggerCommand(tabId, 'Input.dispatchKeyEvent', { type: 'keyDown', key: 'Backspace', code: 'Backspace', windowsVirtualKeyCode: 8, nativeVirtualKeyCode: 8 })
    await sendDebuggerCommand(tabId, 'Input.dispatchKeyEvent', { type: 'keyUp', key: 'Backspace', code: 'Backspace', windowsVirtualKeyCode: 8, nativeVirtualKeyCode: 8 })

    await sleep(80)

    await sendDebuggerCommand(tabId, 'Input.insertText', { text: normalized })
  }
  finally {
    await detachDebugger(tabId)
  }
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
    await applyMarkdownWithDebugger(targetTab.id, markdownContent)

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
