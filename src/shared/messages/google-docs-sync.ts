import type { GoogleDocsBinding, GoogleDocsSyncSettings } from '../models/settings'
import type { GoogleDocsTabSummary } from '../google-docs'

export interface GoogleDocsSyncStatus {
  enabled: boolean
  binding: GoogleDocsBinding | null
  state: 'unbound' | 'ready' | 'stale'
  resolvedTabId: number | null
  lastAttemptAt: number | null
  lastSuccessAt: number | null
  lastError: string | null
}

export type GoogleDocsSyncMessage =
  | { type: 'gdocs-sync:list-tabs' }
  | { type: 'gdocs-sync:bind-tab', payload: { tabId: number } }
  | { type: 'gdocs-sync:unbind' }
  | { type: 'gdocs-sync:get-status' }
  | { type: 'gdocs-sync:push-update', payload: { markdownContent: string, lastUpdated: number } }

export interface GoogleDocsSyncListTabsResponse {
  ok: boolean
  tabs: GoogleDocsTabSummary[]
}

export interface GoogleDocsSyncBindResponse {
  ok: boolean
  settings?: GoogleDocsSyncSettings
  status?: GoogleDocsSyncStatus
  error?: string
}

export interface GoogleDocsSyncStatusResponse {
  ok: boolean
  status: GoogleDocsSyncStatus
}

export interface GoogleDocsSyncPushResponse {
  ok: boolean
  status: GoogleDocsSyncStatus
  error?: string
}
