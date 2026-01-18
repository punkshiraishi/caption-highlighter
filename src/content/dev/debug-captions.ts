import browser from 'webextension-polyfill'
import { CAPTION_NODE_ATTRIBUTE, DEFAULT_CAPTION_SELECTORS } from '../dom/caption-observer'
import { DEBUG_CAPTION_QUERY_KEY, DEBUG_CAPTION_STORAGE_KEY } from '~/shared/dev/debug-captions'

const DEBUG_CONTAINER_ID = 'caption-highlighter-debug-captions'
const DEBUG_LINE_CLASS = 'caption-highlighter__debug-line'
const MEET_CAPTION_LINE_CLASS = 'ygicle VbkSUe'

const DEBUG_LINES = [
  'えーと、まず最初に今日のアジェンダを確認します。課題は3点、進捗共有とボトルネックの整理、次週の対応方針です。',
  '先週のリリース後、問い合わせが少し増えていますが、ログを見る限り致命的なエラーは出ていません。',
  '実装の優先度は高い順に、ログイン周りの安定化、通知UIの改善、そして管理画面の検索機能です。',
  '開発チームのリソース配分ですが、AさんはAPI側、Bさんはフロント、Cさんはテスト強化に入ります。',
  '今週の残タスクとして、決済連携のテストと、社内向けのデモ準備があります。',
  '議事録としては、来週の火曜までにプロトタイプを完成させ、金曜にレビューを実施する予定です。',
  'ユーザーからの要望で多かったのは、ショートカットの追加と、検索精度の向上でした。',
  '次回は、今回の数値の振り返りと改善施策の効果測定を中心に進めます。',
]

export async function isDebugCaptionEnabled(): Promise<boolean> {
  if (!__DEV__)
    return false
  try {
    const params = new URLSearchParams(window.location.search)
    if (params.get(DEBUG_CAPTION_QUERY_KEY) === '1')
      return true
    const stored = await browser.storage.local.get(DEBUG_CAPTION_STORAGE_KEY)
    if (stored[DEBUG_CAPTION_STORAGE_KEY] === true)
      return true
    return localStorage.getItem(DEBUG_CAPTION_STORAGE_KEY) === '1'
  }
  catch {
    return false
  }
}

export function setupDebugCaptionFeed(options: {
  enabled: boolean
  onCaption: (element: HTMLElement) => void
  intervalMs?: number
  maxLines?: number
}): (() => void) | null {
  if (!options.enabled)
    return null

  const { container, owned } = resolveTargetContainer()
  const intervalMs = options.intervalMs ?? 1800
  const maxLines = options.maxLines ?? 6
  let index = 0

  const timer = window.setInterval(() => {
    const line = DEBUG_LINES[index % DEBUG_LINES.length]
    index += 1
    const captionEl = createDebugLine(line)
    container.appendChild(captionEl)
    options.onCaption(captionEl)

    while (container.childElementCount > maxLines && container.firstElementChild) {
      container.removeChild(container.firstElementChild)
    }
  }, intervalMs)

  return () => {
    window.clearInterval(timer)
    if (owned)
      container.remove()
  }
}

export function setupDebugCaptionController(options: {
  onCaption: (element: HTMLElement) => void
  intervalMs?: number
  maxLines?: number
  pollMs?: number
}): () => void {
  let cleanup: (() => void) | null = null
  let lastEnabled = false
  const pollMs = options.pollMs ?? 1000

  const apply = async () => {
    const enabled = await isDebugCaptionEnabled()
    if (enabled === lastEnabled)
      return

    lastEnabled = enabled
    if (cleanup) {
      cleanup()
      cleanup = null
    }

    if (enabled) {
      cleanup = setupDebugCaptionFeed({
        enabled: true,
        onCaption: options.onCaption,
        intervalMs: options.intervalMs,
        maxLines: options.maxLines,
      })
    }
  }

  const timer = window.setInterval(() => {
    void apply()
  }, pollMs)

  void apply()

  return () => {
    window.clearInterval(timer)
    if (cleanup)
      cleanup()
  }
}

export function injectDebugCaptionsOnce(): void {
  if (!__DEV__)
    return
  const { container } = resolveTargetContainer()
  const fragment = document.createDocumentFragment()
  for (const line of DEBUG_LINES) {
    fragment.appendChild(createDebugLine(line))
  }
  container.appendChild(fragment)
}

function resolveTargetContainer(): { container: HTMLElement, owned: boolean } {
  const meetContainer = findMeetCaptionContainer()
  if (meetContainer)
    return { container: meetContainer, owned: false }

  return { container: ensureDebugContainer(), owned: true }
}

function findMeetCaptionContainer(): HTMLElement | null {
  const candidates: HTMLElement[] = []
  for (const selector of DEFAULT_CAPTION_SELECTORS) {
    document.querySelectorAll<HTMLElement>(selector).forEach((el) => {
      if (!candidates.includes(el))
        candidates.push(el)
    })
  }

  for (const candidate of candidates) {
    if (!candidate.isConnected)
      continue
    if (candidate.getAttribute('aria-hidden') === 'true')
      continue
    const rect = candidate.getBoundingClientRect()
    if (rect.width === 0 || rect.height === 0)
      continue
    const textContainer = candidate.querySelector<HTMLElement>('.ygicle, .VbkSUe')
    if (textContainer?.parentElement)
      return textContainer.parentElement
    return candidate
  }

  if (!candidates[0])
    return null
  const fallback = candidates[0].querySelector<HTMLElement>('.ygicle, .VbkSUe')
  if (fallback?.parentElement)
    return fallback.parentElement
  return fallback ?? candidates[0]
}

function ensureDebugContainer(): HTMLElement {
  const existing = document.getElementById(DEBUG_CONTAINER_ID)
  if (existing)
    return existing as HTMLElement

  const container = document.createElement('div')
  container.id = DEBUG_CONTAINER_ID
  container.setAttribute('role', 'region')
  container.setAttribute('aria-label', '字幕 (Debug)')
  container.style.position = 'fixed'
  container.style.right = '16px'
  container.style.bottom = '16px'
  container.style.width = '360px'
  container.style.maxHeight = '220px'
  container.style.overflow = 'hidden'
  container.style.padding = '8px 10px'
  container.style.borderRadius = '10px'
  container.style.background = 'rgba(0, 0, 0, 0.6)'
  container.style.color = '#fff'
  container.style.fontSize = '13px'
  container.style.lineHeight = '1.5'
  container.style.zIndex = '2147483647'
  container.style.pointerEvents = 'none'

  document.body.appendChild(container)
  return container
}

function createDebugLine(text: string): HTMLElement {
  const line = document.createElement('div')
  line.className = `${MEET_CAPTION_LINE_CLASS} ${DEBUG_LINE_CLASS}`
  line.textContent = text
  line.setAttribute(CAPTION_NODE_ATTRIBUTE, '1')
  return line
}
