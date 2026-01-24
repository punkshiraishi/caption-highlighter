import './styles.css'
import './whiteboard/whiteboard.css'
import 'uno.css'
import { CaptionObserver, DEFAULT_CAPTION_SELECTORS } from './dom/caption-observer'
import { CaptionHighlighter, applyThemeVariables } from './highlight/highlighter'
import { TooltipController } from './highlight/tooltip'
import { WhiteboardPanel, WhiteboardProcessor, getDefaultWhiteboardSettings, getGeminiNanoClient } from './whiteboard'
import { type UserSettings, applyUserSettingsDefaults } from '~/shared/models/settings'
import { loadUserSettings, observeSettings } from '~/shared/storage/settings'

/* eslint-disable no-console */

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

  whiteboardPanel.setProvider(currentSettings.ai.whiteboardProvider)
  whiteboardProcessor.setAiSettings(currentSettings.ai)

  if (currentSettings.ai.whiteboardProvider === 'nano') {
    // Gemini Nanoの可用性をチェック
    const client = getGeminiNanoClient()
    const availability = await client.checkAvailability()
    whiteboardPanel.setAvailability(availability)

    if (availability === 'available') {
      const initialized = await whiteboardProcessor.initialize()
      if (initialized)
        console.log('[caption-highlighter] Whiteboard initialized successfully')
      else
        console.warn('[caption-highlighter] Failed to initialize whiteboard processor')
    }
    else {
      console.warn('[caption-highlighter] Gemini Nano not available:', availability)
    }
  }
  else {
    const initialized = await whiteboardProcessor.initialize()
    if (!initialized) {
      whiteboardPanel.setFlashUnavailable('Options で同意・API Key・権限を設定してください。')
      console.warn('[caption-highlighter] Gemini Flash not ready')
    }
    else {
      // 以前のエラーメッセージ表示を解除
      whiteboardPanel.updateState(whiteboardProcessor.getState())
    }
  }
}

function applySettings(settings: UserSettings) {
  currentSettings = settings
  tooltip.updateTheme(settings.theme)
  applyThemeVariables(settings.theme)
  highlighter.updateSettings(settings)
  observer.setDebounceMs(settings.matching.debounceMs)
  highlighter.reprocessAll()

  // ホワイトボードの要約プロバイダを反映（変更時は再初期化）
  whiteboardPanel.setProvider(settings.ai.whiteboardProvider)
  whiteboardProcessor.setAiSettings(settings.ai)
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
  })
  whiteboardWired = true
}

bootstrap()
