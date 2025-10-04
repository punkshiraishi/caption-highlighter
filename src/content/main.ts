import './styles.css'
import 'uno.css'
import { CaptionObserver, DEFAULT_CAPTION_SELECTORS } from './dom/caption-observer'
import { CaptionHighlighter, applyThemeVariables } from './highlight/highlighter'
import { TooltipController } from './highlight/tooltip'
import { type UserSettings, applyUserSettingsDefaults } from '~/shared/models/settings'
import { loadUserSettings, observeSettings } from '~/shared/storage/settings'

let currentSettings: UserSettings = applyUserSettingsDefaults({})

applyThemeVariables(currentSettings.theme)

const tooltip = new TooltipController(currentSettings.theme)
const highlighter = new CaptionHighlighter({
  settings: currentSettings,
  tooltip,
})

const observer = new CaptionObserver({
  selectors: DEFAULT_CAPTION_SELECTORS,
  debounceMs: currentSettings.matching.debounceMs,
})

observer.onCaption(element => highlighter.process(element))
observer.start()

async function bootstrap() {
  try {
    const stored = await loadUserSettings()
    applySettings(stored)
  }
  catch (error) {
    console.error('[caption-highlighter] Failed to load settings', error)
  }
}

function applySettings(settings: UserSettings) {
  currentSettings = settings
  tooltip.updateTheme(settings.theme)
  applyThemeVariables(settings.theme)
  highlighter.updateSettings(settings)
  observer.setDebounceMs(settings.matching.debounceMs)
  highlighter.reprocessAll()
}

observeSettings((next) => {
  applySettings(next)
})

bootstrap()
