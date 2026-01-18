import { DEFAULT_CAPTION_SELECTORS } from '../dom/caption-observer'

const SAMPLE_CAPTIONS = [
  '本日はプロジェクトAの進捗報告を行います。',
  '現在のステータスは予定通り進行中です。',
  '開発チームからの報告では、バックエンドAPIの実装が80%完了しています。',
  '認証機能、ユーザー管理API、商品管理APIは実装完了、現在は決済連携APIの開発を進めています。',
  'フロントエンド側はデザインレビューが完了し、実装に着手しました。',
  'React 18とNext.js 14を使用しており、コンポーネント設計は完了しています。',
  '来週までにベータ版をリリース予定です。',
  '社内テスト用に10アカウントを用意し、営業部と企画部からフィードバックを収集します。',
  '課題として、外部連携APIのレスポンス速度が想定より遅いという問題があります。',
  '特に決済代行会社のAPIが平均で2秒かかっており、ユーザー体験に影響が出ています。',
  '対策として、キャッシュ機構の導入を検討中です。',
  'Redisを使ったキャッシュ層を追加することで、レスポンス時間を500ミリ秒以下に抑える計画です。',
  '次回のマイルストーンは来月15日のパブリックベータリリースとなります。',
]

const SAMPLE_USER_NAME = 'あなた'
const SAMPLE_USER_IMAGE_URL = 'https://lh3.googleusercontent.com/a/default=s192-c-mo'

const CAPTION_CONTAINER_SELECTOR = '.vNKgIf.UDinHf[role="region"][aria-label="字幕"]'
const CAPTION_WRAPPER_CLASS = 'nMcdL bj4p3b'
const USER_INFO_CLASS = 'adE6rb'
const USER_IMAGE_CLASS = 'Z6byG r6DyN'
const USER_NAME_CONTAINER_CLASS = 'KcIKyf jxFHg'
const USER_NAME_CLASS = 'NWpY1d'
const CAPTION_TEXT_CLASS = 'ygicle VbkSUe'

export function injectSampleCaptions(): void {
  const container = findCaptionContainer()
  if (!container)
    return

  const fragment = document.createDocumentFragment()
  SAMPLE_CAPTIONS.forEach((caption) => {
    fragment.appendChild(createCaptionDom(SAMPLE_USER_NAME, SAMPLE_USER_IMAGE_URL, caption))
  })
  container.appendChild(fragment)
}

function findCaptionContainer(): HTMLElement | null {
  const direct = document.querySelector<HTMLElement>(CAPTION_CONTAINER_SELECTOR)
  if (direct)
    return direct

  for (const selector of DEFAULT_CAPTION_SELECTORS) {
    const found = document.querySelector<HTMLElement>(selector)
    if (found)
      return found
  }

  return null
}

function createCaptionDom(userName: string, userImageUrl: string, captionText: string): HTMLElement {
  const mainDiv = document.createElement('div')
  mainDiv.className = CAPTION_WRAPPER_CLASS
  mainDiv.setAttribute('data-ch-caption', '1')
  mainDiv.setAttribute('data-ch-processed-version', '1')

  const userInfoDiv = document.createElement('div')
  userInfoDiv.className = USER_INFO_CLASS

  const img = document.createElement('img')
  img.className = USER_IMAGE_CLASS
  img.alt = ''
  img.src = userImageUrl || SAMPLE_USER_IMAGE_URL
  img.setAttribute('data-ch-caption', '1')
  img.setAttribute('data-iml', Date.now().toString())
  img.setAttribute('data-ch-processed-version', '1')

  const nameContainer = document.createElement('div')
  nameContainer.className = USER_NAME_CONTAINER_CLASS
  nameContainer.setAttribute('data-ch-caption', '1')
  nameContainer.setAttribute('data-ch-processed-version', '1')

  const nameSpan = document.createElement('span')
  nameSpan.className = USER_NAME_CLASS
  nameSpan.textContent = userName
  nameSpan.setAttribute('data-ch-caption', '1')
  nameSpan.setAttribute('data-ch-processed-version', '1')

  nameContainer.appendChild(nameSpan)
  userInfoDiv.appendChild(img)
  userInfoDiv.appendChild(nameContainer)

  const captionDiv = document.createElement('div')
  captionDiv.className = CAPTION_TEXT_CLASS
  captionDiv.textContent = captionText
  captionDiv.setAttribute('data-ch-caption', '1')
  captionDiv.setAttribute('data-ch-processed-version', '1')

  mainDiv.appendChild(userInfoDiv)
  mainDiv.appendChild(captionDiv)

  return mainDiv
}
