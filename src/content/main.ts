import './styles.css'
import './whiteboard/whiteboard.css'
import 'uno.css'
import browser from 'webextension-polyfill'
import { CaptionObserver, DEFAULT_CAPTION_SELECTORS } from './dom/caption-observer'
import { CaptionHighlighter, applyThemeVariables } from './highlight/highlighter'
import { TooltipController } from './highlight/tooltip'
import { WhiteboardPanel, WhiteboardProcessor, getDefaultWhiteboardSettings } from './whiteboard'
import { type UserSettings, applyUserSettingsDefaults } from '~/shared/models/settings'
import { loadUserSettings, observeSettings } from '~/shared/storage/settings'

let currentSettings: UserSettings = applyUserSettingsDefaults({})

applyThemeVariables(currentSettings.theme)

const tooltip = new TooltipController(currentSettings.theme)
const highlighter = new CaptionHighlighter({
  settings: currentSettings,
  tooltip,
})

// ホワイトボード機能
const whiteboardSettings = getDefaultWhiteboardSettings()
const whiteboardProcessor = new WhiteboardProcessor(whiteboardSettings)
const whiteboardPanel = new WhiteboardPanel(whiteboardSettings)
let whiteboardWired = false
let lastPushedMarkdown = ''
let lastDocsBindingKey = ''

const observer = new CaptionObserver({
  selectors: DEFAULT_CAPTION_SELECTORS,
  debounceMs: currentSettings.matching.debounceMs,
})

// キャプション取得時の処理
observer.onCaption((element) => {
  // 既存のハイライト処理
  highlighter.process(element)

  // ホワイトボード用にキャプションを追加
  whiteboardProcessor.addCaption(element)
})

observer.start()

async function bootstrap() {
  try {
    const stored = await loadUserSettings()
    applySettings(stored)
  }
  catch (error) {
    console.error('[caption-highlighter] Failed to load settings', error)
  }

  // ホワイトボードの初期化
  await initializeWhiteboard()
}

async function initializeWhiteboard() {
  // パネルを作成
  whiteboardPanel.create()

  // サンプル字幕注入後、即座にLLM処理を開始（バッファ待ちをスキップ）
  whiteboardPanel.onSampleInject(() => whiteboardProcessor.forceProcess())

  whiteboardProcessor.setAiSettings(currentSettings.ai)
  const initialized = await whiteboardProcessor.initialize()
  if (!initialized) {
    whiteboardPanel.setCloudAiUnavailable('設定画面で AI の準備を完了してください。')
    console.warn('[caption-highlighter] Cloud AI not ready')
    return
  }

  whiteboardPanel.updateState(whiteboardProcessor.getState())
}

function applySettings(settings: UserSettings) {
  const nextBindingKey = settings.docsSync.binding
    ? `${settings.docsSync.binding.documentId}:${settings.docsSync.binding.tabId}:${Number(settings.docsSync.enabled)}`
    : ''

  if (nextBindingKey !== lastDocsBindingKey) {
    lastDocsBindingKey = nextBindingKey
    lastPushedMarkdown = ''
  }

  currentSettings = settings
  tooltip.updateTheme(settings.theme)
  applyThemeVariables(settings.theme)
  highlighter.updateSettings(settings)
  observer.setDebounceMs(settings.matching.debounceMs)
  highlighter.reprocessAll()

  whiteboardProcessor.setAiSettings(settings.ai)

  if (settings.docsSync.enabled && settings.docsSync.binding && whiteboardProcessor.getState().markdownContent) {
    void syncWhiteboardToGoogleDocs(
      whiteboardProcessor.getState().markdownContent,
      whiteboardProcessor.getState().lastUpdated,
    )
  }
}

observeSettings((next) => {
  applySettings(next)
  initializeWhiteboard().catch((error) => {
    console.warn('[caption-highlighter] Failed to re-initialize whiteboard', error)
  })
})

// プロセッサの状態更新をパネルに反映（1回だけ）
if (!whiteboardWired) {
  whiteboardProcessor.onUpdate((state) => {
    whiteboardPanel.updateState(state)
    void syncWhiteboardToGoogleDocs(state.markdownContent, state.lastUpdated)
  })
  whiteboardWired = true
}

bootstrap()

async function syncWhiteboardToGoogleDocs(markdownContent: string, lastUpdated: number) {
  if (!currentSettings.docsSync.enabled || !currentSettings.docsSync.binding)
    return

  if (markdownContent === lastPushedMarkdown)
    return

  try {
    whiteboardPanel.setDocsSyncPhase('syncing')

    const response = await browser.runtime.sendMessage({
      type: 'gdocs-sync:push-update',
      payload: { markdownContent, lastUpdated },
    }) as { ok?: boolean, error?: string } | undefined

    if (!response?.ok) {
      whiteboardPanel.setDocsSyncPhase('error', response?.error ?? '同期に失敗しました')
      console.warn('[caption-highlighter] Google Docs sync rejected update', response?.error)
      return
    }

    lastPushedMarkdown = markdownContent
    whiteboardPanel.setDocsSyncPhase('success', `同期済み ${new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`)
  }
  catch (error) {
    whiteboardPanel.setDocsSyncPhase('error', error instanceof Error ? error.message : String(error))
    console.warn('[caption-highlighter] Failed to sync whiteboard to Google Docs', error)
  }
}
