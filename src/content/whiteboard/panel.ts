/**
 * ホワイトボードフローティングパネル
 * ドラッグ可能、リサイズ可能なフローティングウィンドウ
 */

import type { GeminiNanoAvailability, WhiteboardSettings, WhiteboardState } from '~/shared/models/whiteboard'

const PANEL_ID = 'whiteboard-panel'
const TOGGLE_ID = 'whiteboard-toggle'
const STORAGE_KEY = 'whiteboard-panel-position'

interface PanelPosition {
  x: number
  y: number
  width: number
  height: number
}

export class WhiteboardPanel {
  private panel: HTMLElement | null = null
  private toggle: HTMLElement | null = null
  private contentEl: HTMLElement | null = null
  private statusEl: HTMLElement | null = null
  private footerEl: HTMLElement | null = null
  private copyBtn: HTMLElement | null = null
  private markdownContent = ''
  private settings: WhiteboardSettings
  private isVisible = false
  private isMinimized = false
  private isDragging = false
  private isResizing = false
  private dragOffset = { x: 0, y: 0 }
  private availability: GeminiNanoAvailability = 'not-supported'

  constructor(settings: WhiteboardSettings) {
    this.settings = settings
  }

  /**
   * パネルを作成してDOMに追加
   */
  create(): void {
    if (this.panel)
      return

    this.createToggleButton()
    this.createPanel()
    this.loadPosition()
    this.setupEventListeners()
  }

  /**
   * トグルボタンを作成
   */
  private createToggleButton(): void {
    this.toggle = document.createElement('button')
    this.toggle.id = TOGGLE_ID
    this.toggle.className = 'whiteboard-toggle'
    this.toggle.innerHTML = '📋'
    this.toggle.title = 'ホワイトボードを表示/非表示'
    this.toggle.addEventListener('click', () => this.toggleVisibility())
    document.body.appendChild(this.toggle)
  }

  /**
   * パネル本体を作成
   */
  private createPanel(): void {
    this.panel = document.createElement('div')
    this.panel.id = PANEL_ID
    this.panel.className = 'whiteboard-panel whiteboard-panel--entering'
    this.panel.style.display = 'none'
    this.panel.style.left = `${this.settings.panelPosition.x}px`
    this.panel.style.top = `${this.settings.panelPosition.y}px`
    this.panel.style.width = `${this.settings.panelSize.width}px`
    this.panel.style.height = `${this.settings.panelSize.height}px`

    this.panel.innerHTML = `
      <div class="whiteboard-panel__header">
        <div class="whiteboard-panel__title">
          <span class="whiteboard-panel__title-icon">📋</span>
          <span>ホワイトボード</span>
          <span class="whiteboard-panel__status"></span>
        </div>
        <div class="whiteboard-panel__controls">
          <button class="whiteboard-panel__btn whiteboard-panel__btn--copy" title="コピー">📄</button>
          <button class="whiteboard-panel__btn whiteboard-panel__btn--minimize" title="最小化">─</button>
          <button class="whiteboard-panel__btn whiteboard-panel__btn--close" title="閉じる">✕</button>
        </div>
      </div>
      <div class="whiteboard-panel__content">
        <pre class="whiteboard-panel__markdown"></pre>
      </div>
      <div class="whiteboard-panel__footer">
        <span class="whiteboard-panel__footer-info">Gemini Nano で構造化</span>
        <span class="whiteboard-panel__footer-count"></span>
      </div>
      <div class="whiteboard-panel__resize"></div>
    `

    document.body.appendChild(this.panel)

    // 要素の参照を取得
    this.contentEl = this.panel.querySelector('.whiteboard-panel__markdown')
    this.statusEl = this.panel.querySelector('.whiteboard-panel__status')
    this.footerEl = this.panel.querySelector('.whiteboard-panel__footer-count')
    this.copyBtn = this.panel.querySelector('.whiteboard-panel__btn--copy')

    // 初期メッセージを表示
    if (this.contentEl) {
      this.contentEl.textContent = '字幕を待機中...'
    }

    // 入場アニメーション後にクラスを削除
    setTimeout(() => {
      this.panel?.classList.remove('whiteboard-panel--entering')
    }, 300)
  }

  /**
   * イベントリスナーを設定
   */
  private setupEventListeners(): void {
    if (!this.panel)
      return

    // ヘッダーでドラッグ
    const header = this.panel.querySelector('.whiteboard-panel__header')
    if (header) {
      header.addEventListener('mousedown', (e) => this.startDrag(e as MouseEvent))
    }

    // コピーボタン
    this.copyBtn?.addEventListener('click', () => this.copyToClipboard())

    // 最小化ボタン
    const minimizeBtn = this.panel.querySelector('.whiteboard-panel__btn--minimize')
    minimizeBtn?.addEventListener('click', () => this.toggleMinimize())

    // 閉じるボタン
    const closeBtn = this.panel.querySelector('.whiteboard-panel__btn--close')
    closeBtn?.addEventListener('click', () => this.hide())

    // リサイズハンドル
    const resizeHandle = this.panel.querySelector('.whiteboard-panel__resize')
    resizeHandle?.addEventListener('mousedown', (e) => this.startResize(e as MouseEvent))

    // グローバルイベント
    document.addEventListener('mousemove', (e) => this.onMouseMove(e))
    document.addEventListener('mouseup', () => this.onMouseUp())
  }

  /**
   * ドラッグ開始
   */
  private startDrag(e: MouseEvent): void {
    if ((e.target as HTMLElement).closest('.whiteboard-panel__controls'))
      return

    this.isDragging = true
    this.panel?.classList.add('whiteboard-panel--dragging')

    const rect = this.panel!.getBoundingClientRect()
    this.dragOffset = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    }

    e.preventDefault()
  }

  /**
   * リサイズ開始
   */
  private startResize(e: MouseEvent): void {
    this.isResizing = true
    e.preventDefault()
    e.stopPropagation()
  }

  /**
   * マウス移動時の処理
   */
  private onMouseMove(e: MouseEvent): void {
    if (this.isDragging && this.panel) {
      const x = Math.max(0, Math.min(window.innerWidth - 100, e.clientX - this.dragOffset.x))
      const y = Math.max(0, Math.min(window.innerHeight - 50, e.clientY - this.dragOffset.y))

      this.panel.style.left = `${x}px`
      this.panel.style.top = `${y}px`
    }

    if (this.isResizing && this.panel) {
      const rect = this.panel.getBoundingClientRect()
      const width = Math.max(250, e.clientX - rect.left)
      const height = Math.max(200, e.clientY - rect.top)

      this.panel.style.width = `${width}px`
      this.panel.style.height = `${height}px`
    }
  }

  /**
   * マウスアップ時の処理
   */
  private onMouseUp(): void {
    if (this.isDragging || this.isResizing) {
      this.isDragging = false
      this.isResizing = false
      this.panel?.classList.remove('whiteboard-panel--dragging')
      this.savePosition()
    }
  }

  /**
   * 位置を保存
   */
  private savePosition(): void {
    if (!this.panel)
      return

    const position: PanelPosition = {
      x: Number.parseInt(this.panel.style.left) || this.settings.panelPosition.x,
      y: Number.parseInt(this.panel.style.top) || this.settings.panelPosition.y,
      width: Number.parseInt(this.panel.style.width) || this.settings.panelSize.width,
      height: Number.parseInt(this.panel.style.height) || this.settings.panelSize.height,
    }

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(position))
    }
    catch {
      // localStorage unavailable
    }
  }

  /**
   * 位置を復元
   */
  private loadPosition(): void {
    if (!this.panel)
      return

    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const position: PanelPosition = JSON.parse(stored)
        this.panel.style.left = `${position.x}px`
        this.panel.style.top = `${position.y}px`
        this.panel.style.width = `${position.width}px`
        this.panel.style.height = `${position.height}px`
      }
    }
    catch {
      // localStorage unavailable or invalid data
    }
  }

  /**
   * 表示/非表示を切り替え
   */
  toggleVisibility(): void {
    if (this.isVisible) {
      this.hide()
    }
    else {
      this.show()
    }
  }

  /**
   * パネルを表示
   */
  show(): void {
    if (!this.panel)
      return

    this.panel.style.display = 'flex'
    this.isVisible = true
    this.toggle?.classList.add('whiteboard-toggle--hidden')
  }

  /**
   * パネルを非表示
   */
  hide(): void {
    if (!this.panel)
      return

    this.panel.style.display = 'none'
    this.isVisible = false
    this.toggle?.classList.remove('whiteboard-toggle--hidden')
  }

  /**
   * 最小化を切り替え
   */
  toggleMinimize(): void {
    if (!this.panel)
      return

    this.isMinimized = !this.isMinimized
    this.panel.classList.toggle('whiteboard-panel--minimized', this.isMinimized)
  }

  /**
   * 状態を更新
   */
  updateState(state: WhiteboardState): void {
    if (this.statusEl) {
      if (state.isProcessing) {
        this.statusEl.textContent = '処理中...'
        this.statusEl.className = 'whiteboard-panel__status whiteboard-panel__status--processing'
      }
      else {
        this.statusEl.textContent = ''
        this.statusEl.className = 'whiteboard-panel__status'
      }
    }

    // マークダウンコンテンツを表示
    if (this.contentEl) {
      if (state.markdownContent) {
        this.markdownContent = state.markdownContent
        this.contentEl.textContent = state.markdownContent
      }
      else if (!state.isProcessing) {
        this.contentEl.textContent = '字幕を待機中...'
      }
    }

    // 行数を表示
    if (this.footerEl && state.markdownContent) {
      const lineCount = state.markdownContent.split('\n').filter(line => line.trim().startsWith('-')).length
      this.footerEl.textContent = `${lineCount} 項目`
    }
  }

  /**
   * クリップボードにコピー
   */
  private async copyToClipboard(): Promise<void> {
    if (!this.markdownContent) {
      return
    }

    try {
      await navigator.clipboard.writeText(this.markdownContent)

      // コピー成功のフィードバック
      if (this.copyBtn) {
        const originalText = this.copyBtn.textContent
        this.copyBtn.textContent = '✓'
        this.copyBtn.classList.add('whiteboard-panel__btn--copied')

        setTimeout(() => {
          if (this.copyBtn) {
            this.copyBtn.textContent = originalText
            this.copyBtn.classList.remove('whiteboard-panel__btn--copied')
          }
        }, 1500)
      }

      console.log('[Whiteboard] Content copied to clipboard')
    }
    catch (error) {
      console.error('[Whiteboard] Failed to copy to clipboard:', error)
    }
  }

  /**
   * Gemini Nanoの可用性を設定
   */
  setAvailability(availability: GeminiNanoAvailability): void {
    this.availability = availability

    if (this.contentEl && availability !== 'available') {
      this.contentEl.innerHTML = `
        <div class="whiteboard-panel__unavailable">
          <div class="whiteboard-panel__unavailable-icon">⚠️</div>
          <div class="whiteboard-panel__unavailable-title">Gemini Nano が利用できません</div>
          <div class="whiteboard-panel__unavailable-text">
            ${this.getAvailabilityMessage(availability)}
          </div>
        </div>
      `
    }
  }

  /**
   * 可用性に応じたメッセージを取得
   */
  private getAvailabilityMessage(availability: GeminiNanoAvailability): string {
    switch (availability) {
      case 'not-supported':
        return 'Chrome Canary/Dev で chrome://flags から「Prompt API for Gemini Nano」を有効にしてください。'
      case 'not-ready':
        return 'chrome://components から「Optimization Guide On Device Model」をダウンロードしてください。'
      case 'error':
        return 'エラーが発生しました。ブラウザを再起動してみてください。'
      default:
        return ''
    }
  }

  /**
   * 設定を更新
   */
  updateSettings(settings: WhiteboardSettings): void {
    this.settings = settings
  }

  /**
   * パネルが表示されているか
   */
  isShown(): boolean {
    return this.isVisible
  }

  /**
   * リソースを解放
   */
  destroy(): void {
    this.panel?.remove()
    this.toggle?.remove()
    this.panel = null
    this.toggle = null
    this.contentEl = null
    this.statusEl = null
    this.footerEl = null
    this.copyBtn = null
  }
}

