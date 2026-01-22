/**
 * ネストリストコンポーネント
 * ホワイトボードアイテムを階層的に表示
 */

import { ICON_CLIPBOARD } from '../icons'
import type { WhiteboardItem } from '~/shared/models/whiteboard'

const CLASS_PREFIX = 'whiteboard-list'

export class NestedListRenderer {
  private container: HTMLElement

  constructor(container: HTMLElement) {
    this.container = container
  }

  /**
   * アイテムをレンダリング
   */
  render(items: WhiteboardItem[]): void {
    this.container.innerHTML = ''

    if (items.length === 0) {
      this.renderEmptyState()
      return
    }

    const list = this.createList(items, 0)
    this.container.appendChild(list)
  }

  /**
   * 空の状態を表示
   */
  private renderEmptyState(): void {
    const empty = document.createElement('div')
    empty.className = `${CLASS_PREFIX}__empty`
    empty.innerHTML = `
      <div class="${CLASS_PREFIX}__empty-icon"><span class="whiteboard-icon" aria-hidden="true">${ICON_CLIPBOARD}</span></div>
      <div class="${CLASS_PREFIX}__empty-text">会議のトピックがここに表示されます</div>
      <div class="${CLASS_PREFIX}__empty-hint">キャプションを有効にして会話を始めてください</div>
    `
    this.container.appendChild(empty)
  }

  /**
   * リスト要素を作成
   */
  private createList(items: WhiteboardItem[], level: number): HTMLUListElement {
    const ul = document.createElement('ul')
    ul.className = `${CLASS_PREFIX}__list ${CLASS_PREFIX}__list--level-${Math.min(level, 3)}`

    for (const item of items) {
      const li = this.createListItem(item, level)
      ul.appendChild(li)
    }

    return ul
  }

  /**
   * リストアイテム要素を作成
   */
  private createListItem(item: WhiteboardItem, level: number): HTMLLIElement {
    const li = document.createElement('li')
    li.className = `${CLASS_PREFIX}__item`
    li.dataset.itemId = item.id

    if (item.isNew) {
      li.classList.add(`${CLASS_PREFIX}__item--new`)
      // アニメーション後にisNewクラスを削除
      setTimeout(() => {
        li.classList.remove(`${CLASS_PREFIX}__item--new`)
      }, 1500)
    }

    // バレットポイント
    const bullet = document.createElement('span')
    bullet.className = `${CLASS_PREFIX}__bullet`
    bullet.textContent = this.getBulletChar(level)

    // テキスト
    const text = document.createElement('span')
    text.className = `${CLASS_PREFIX}__text`
    text.textContent = item.text

    li.appendChild(bullet)
    li.appendChild(text)

    // 子アイテムがあれば再帰的にレンダリング
    if (item.children.length > 0) {
      const childList = this.createList(item.children, level + 1)
      li.appendChild(childList)
    }

    return li
  }

  /**
   * レベルに応じたバレット文字を取得
   */
  private getBulletChar(level: number): string {
    const bullets = ['●', '○', '■', '□']
    return bullets[Math.min(level, bullets.length - 1)]
  }

  /**
   * 特定のアイテムを更新
   */
  updateItem(itemId: string, text: string): void {
    const li = this.container.querySelector(`[data-item-id="${itemId}"]`)
    if (li) {
      const textEl = li.querySelector(`.${CLASS_PREFIX}__text`)
      if (textEl) {
        textEl.textContent = text
      }
    }
  }

  /**
   * 新しいアイテムを追加（アニメーション付き）
   */
  addItemWithAnimation(item: WhiteboardItem, parentId?: string): void {
    const li = this.createListItem({ ...item, isNew: true }, 0)

    let targetList: HTMLElement | null = null

    if (parentId) {
      const parentLi = this.container.querySelector(`[data-item-id="${parentId}"]`)
      if (parentLi) {
        targetList = parentLi.querySelector(`.${CLASS_PREFIX}__list`)
        if (!targetList) {
          targetList = this.createList([], 1)
          parentLi.appendChild(targetList)
        }
      }
    }
    else {
      targetList = this.container.querySelector(`.${CLASS_PREFIX}__list`)
    }

    if (targetList) {
      targetList.appendChild(li)
    }
  }
}
