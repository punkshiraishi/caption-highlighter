/**
 * ホワイトボードフローティングパネル
 * ドラッグ可能、リサイズ可能なフローティングウィンドウ
 */

import { getGeminiFlashClient } from '../ai/gemini-flash'
import { injectSampleCaptions } from '../dev/sample-captions'
import type { GeminiNanoAvailability, WhiteboardSettings, WhiteboardState } from '~/shared/models/whiteboard'
import type { WhiteboardProvider } from '~/shared/models/settings'

/* eslint-disable no-console */

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
  private markdownViewEl: HTMLElement | null = null
  private imageViewEl: HTMLElement | null = null
  private statusEl: HTMLElement | null = null
  private footerEl: HTMLElement | null = null
  private footerInfoEl: HTMLElement | null = null
  private debugRowEl: HTMLElement | null = null
  private debugButtonEl: HTMLButtonElement | null = null
  private copyBtn: HTMLElement | null = null
  private imageBtn: HTMLElement | null = null
  private imageRunBtn: HTMLElement | null = null
  private markdownTabBtn: HTMLElement | null = null
  private imageTabBtn: HTMLElement | null = null
  private downloadBtn: HTMLElement | null = null
  private imageEl: HTMLImageElement | null = null
  private imageStatusEl: HTMLElement | null = null
  private imageEmptyEl: HTMLElement | null = null
  private markdownContent = ''
  private imageDataUrl = ''
  private imageLoading = false
  private settings: WhiteboardSettings
  private isVisible = false
  private isMinimized = false
  private isDragging = false
  private isResizing = false
  private dragOffset = { x: 0, y: 0 }

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
          <button class="whiteboard-panel__btn whiteboard-panel__btn--image" title="画像出力">🖼️</button>
          <button class="whiteboard-panel__btn whiteboard-panel__btn--copy" title="コピー">📄</button>
          <button class="whiteboard-panel__btn whiteboard-panel__btn--minimize" title="最小化">─</button>
          <button class="whiteboard-panel__btn whiteboard-panel__btn--close" title="閉じる">✕</button>
        </div>
      </div>
      <div class="whiteboard-panel__tabs">
        <button class="whiteboard-panel__tab whiteboard-panel__tab--markdown is-active" data-tab="markdown">メモ</button>
        <button class="whiteboard-panel__tab whiteboard-panel__tab--image" data-tab="image">画像</button>
      </div>
      <div class="whiteboard-panel__content">
        <div class="whiteboard-panel__view whiteboard-panel__view--markdown is-active">
          <pre class="whiteboard-panel__markdown"></pre>
        </div>
        <div class="whiteboard-panel__view whiteboard-panel__view--image">
          <div class="whiteboard-panel__image-toolbar">
            <span class="whiteboard-panel__image-hint">画像はボタン押下で生成されます</span>
            <div class="whiteboard-panel__image-actions">
              <button class="whiteboard-panel__btn whiteboard-panel__btn--image-run" title="画像を生成">生成</button>
              <button class="whiteboard-panel__btn whiteboard-panel__btn--download" title="画像を保存">DL</button>
            </div>
          </div>
          <div class="whiteboard-panel__image-canvas-wrap">
            <img class="whiteboard-panel__image" alt="ホワイトボード画像">
            <div class="whiteboard-panel__image-status"></div>
            <div class="whiteboard-panel__image-empty">画像を作成するには議事録が必要です</div>
          </div>
        </div>
      </div>
      <div class="whiteboard-panel__footer">
        <div class="whiteboard-panel__footer-main">
          <span class="whiteboard-panel__footer-info">Gemini Nano で構造化</span>
          <span class="whiteboard-panel__footer-count"></span>
        </div>
        <div class="whiteboard-panel__debug">
          <button class="whiteboard-panel__debug-btn" type="button">サンプル字幕を注入</button>
        </div>
      </div>
      <div class="whiteboard-panel__resize"></div>
    `

    document.body.appendChild(this.panel)

    // 要素の参照を取得
    this.contentEl = this.panel.querySelector('.whiteboard-panel__markdown')
    this.markdownViewEl = this.panel.querySelector('.whiteboard-panel__view--markdown')
    this.imageViewEl = this.panel.querySelector('.whiteboard-panel__view--image')
    this.statusEl = this.panel.querySelector('.whiteboard-panel__status')
    this.footerEl = this.panel.querySelector('.whiteboard-panel__footer-count')
    this.footerInfoEl = this.panel.querySelector('.whiteboard-panel__footer-info')
    this.debugRowEl = this.panel.querySelector('.whiteboard-panel__debug')
    this.debugButtonEl = this.panel.querySelector('.whiteboard-panel__debug-btn')
    this.copyBtn = this.panel.querySelector('.whiteboard-panel__btn--copy')
    this.imageBtn = this.panel.querySelector('.whiteboard-panel__btn--image')
    this.markdownTabBtn = this.panel.querySelector('.whiteboard-panel__tab--markdown')
    this.imageTabBtn = this.panel.querySelector('.whiteboard-panel__tab--image')
    this.imageRunBtn = this.panel.querySelector('.whiteboard-panel__btn--image-run')
    this.downloadBtn = this.panel.querySelector('.whiteboard-panel__btn--download')
    this.imageEl = this.panel.querySelector('.whiteboard-panel__image')
    this.imageStatusEl = this.panel.querySelector('.whiteboard-panel__image-status')
    this.imageEmptyEl = this.panel.querySelector('.whiteboard-panel__image-empty')

    // 初期メッセージを表示
    if (this.contentEl) {
      this.contentEl.textContent = '字幕を待機中...'
    }

    this.initializeDebugToggle()

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
      header.addEventListener('mousedown', e => this.startDrag(e as MouseEvent))
    }

    // コピーボタン
    this.copyBtn?.addEventListener('click', () => this.copyToClipboard())

    // 画像出力ボタン（生成してタブを切り替え）
    this.imageBtn?.addEventListener('click', () => this.generateImage())
    this.imageRunBtn?.addEventListener('click', () => this.generateImage())

    // 最小化ボタン
    const minimizeBtn = this.panel.querySelector('.whiteboard-panel__btn--minimize')
    minimizeBtn?.addEventListener('click', () => this.toggleMinimize())

    // 閉じるボタン
    const closeBtn = this.panel.querySelector('.whiteboard-panel__btn--close')
    closeBtn?.addEventListener('click', () => this.hide())

    // リサイズハンドル
    const resizeHandle = this.panel.querySelector('.whiteboard-panel__resize')
    resizeHandle?.addEventListener('mousedown', e => this.startResize(e as MouseEvent))

    // タブ切り替え
    this.markdownTabBtn?.addEventListener('click', () => this.switchTab('markdown'))
    this.imageTabBtn?.addEventListener('click', () => this.switchTab('image'))
    this.downloadBtn?.addEventListener('click', () => this.downloadImage())

    this.debugButtonEl?.addEventListener('click', () => this.handleSampleInject())

    // グローバルイベント
    document.addEventListener('mousemove', e => this.onMouseMove(e))
    document.addEventListener('mouseup', () => this.onMouseUp())
  }

  private initializeDebugToggle(): void {
    if (!this.debugRowEl || !this.debugButtonEl)
      return

    if (!__DEV__) {
      this.debugRowEl.style.display = 'none'
    }
  }

  private handleSampleInject(): void {
    if (!__DEV__)
      return
    injectSampleCaptions()
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

  setProvider(provider: WhiteboardProvider): void {
    if (!this.footerInfoEl)
      return
    this.footerInfoEl.textContent = provider === 'flash'
      ? 'Gemini Flash で構造化（beta）'
      : 'Gemini Nano で構造化'
  }

  setFlashUnavailable(message: string): void {
    if (!this.contentEl)
      return
    this.contentEl.innerHTML = `
      <div class="whiteboard-panel__unavailable">
        <div class="whiteboard-panel__unavailable-icon">⚠️</div>
        <div class="whiteboard-panel__unavailable-title">Gemini Flash が利用できません</div>
        <div class="whiteboard-panel__unavailable-text">
          ${message}
        </div>
      </div>
    `
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
   * タブを切り替え
   */
  private switchTab(tab: 'markdown' | 'image'): void {
    const isMarkdown = tab === 'markdown'
    this.markdownViewEl?.classList.toggle('is-active', isMarkdown)
    this.imageViewEl?.classList.toggle('is-active', !isMarkdown)
    this.markdownTabBtn?.classList.toggle('is-active', isMarkdown)
    this.imageTabBtn?.classList.toggle('is-active', !isMarkdown)
    if (!isMarkdown) {
      this.refreshImageView()
    }
  }

  /**
   * 画像生成を実行
   */
  private async generateImage(): Promise<void> {
    const markdown = this.markdownContent.trim()
    if (!markdown) {
      this.toggleImageEmpty(true)
      this.setImageStatus('議事録が空です')
      return
    }

    this.toggleImageEmpty(false)
    this.switchTab('image')

    if (this.imageLoading)
      return
    this.imageLoading = true
    this.setImageStatus('画像生成中...')

    const result = await getGeminiFlashClient().generateWhiteboardImage(markdown)
    this.imageLoading = false
    if (!result.success || !result.dataUrl) {
      this.imageDataUrl = ''
      this.refreshImageView()
      this.setImageStatus(result.error || '画像生成に失敗しました')
      return
    }

    this.imageDataUrl = result.dataUrl
    this.refreshImageView()
    this.setImageStatus('')
  }

  private refreshImageView(): void {
    if (this.imageEl) {
      this.imageEl.src = this.imageDataUrl || ''
      this.imageEl.classList.toggle('is-empty', !this.imageDataUrl)
    }
    this.toggleImageEmpty(!this.imageDataUrl)
  }

  private toggleImageEmpty(visible: boolean): void {
    this.imageEmptyEl?.classList.toggle('is-visible', visible)
  }

  private setImageStatus(text: string): void {
    if (!this.imageStatusEl)
      return
    this.imageStatusEl.textContent = text
    this.imageStatusEl.classList.toggle('is-visible', Boolean(text))
  }

  private downloadImage(): void {
    if (!this.imageDataUrl)
      return
    try {
      const link = document.createElement('a')
      link.href = this.imageDataUrl
      link.download = `whiteboard-${Date.now()}.png`
      link.click()
    }
    catch (error) {
      console.error('[Whiteboard] Failed to download image:', error)
    }
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
    this.markdownViewEl = null
    this.imageViewEl = null
    this.statusEl = null
    this.footerEl = null
    this.footerInfoEl = null
    this.debugRowEl = null
    this.debugButtonEl = null
    this.copyBtn = null
    this.imageBtn = null
    this.imageRunBtn = null
    this.markdownTabBtn = null
    this.imageTabBtn = null
    this.downloadBtn = null
    this.imageEl = null
    this.imageStatusEl = null
    this.imageEmptyEl = null
  }
}
