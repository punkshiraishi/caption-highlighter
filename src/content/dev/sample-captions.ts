import { DEFAULT_CAPTION_SELECTORS } from '../dom/caption-observer'

export const SAMPLE_CAPTIONS = [
  // ===== 開始 =====
  '皆さんお疲れ様です。では始めましょう。',
  '今日は進捗の共有と、来月の発表会の準備の2つを話します。',
  'あとで「あ、さっきの話だけど…」みたいに補足が入るかもしれません。',

  // ===== 進捗（プロジェクト） =====
  'まず進捗からいきます。',
  'バックエンドAPIの実装はひと通り終わりました。',
  'フロントはだいたい8割くらいで、来週には結合テストに入れそうです。',
  '気になってるのが、外部APIのレスポンスが遅い件です。',
  'キャッシュを入れる方向で考えていて、田中さんが今週中に調査をまとめます。',
  'リリース目標は来月15日で、いまのところ大きな遅れはないです。',
  'キャッシュ方式は「メモリ」と「Redis」の2案で比較する感じでいきましょう。',

  // ===== 発表会の準備 =====
  '次に、来月の発表会の準備です。佐藤さんお願いします。',
  'はい。日程は来月20日で、新機能発表会の準備状況です。',
  '会場は渋谷のカンファレンスセンターで確定して、定員は100名です。',
  '申込みは今65名で、目標の80名まであと15名です。',
  'プレゼン資料は今週中にドラフトを作って、来週レビューします。',
  'デモ環境は山田さんが担当で、再来週までに用意する予定です。',
  '集客はSNS投稿を週3回に増やす方針でいきます。',

  // ===== 途中で戻ってくる補足（進捗に差し込みたい内容）=====
  'あ、さっきの外部APIが遅い件、言い忘れてたので補足します。',
  '原因はレート制限っぽい可能性が高いです。',
  '短期対応として、リトライとバックオフを入れます。',
  '中期的には、非同期キューにして詰まらないようにする案も検討したいです。',
  'この件の担当は引き続き田中さんで、期限は今週金曜でお願いします。',

  // ===== 途中で戻ってくる補足（発表会に差し込みたい内容）=====
  'もう一点、発表会の件でも補足です。',
  '会場のWi-Fiが不安定かもしれないという話が来ていて、予備回線を手配します。',
  '当日の流れは、挨拶→デモ→QA→懇親会、のイメージで作っていきます。',

  // ===== まとめ =====
  '最後に今日の決めたことをまとめます。',
  'キャッシュ導入の調査は田中さんが今週中に完了。',
  '発表会の資料ドラフトは今週中、レビューは来週。',
  'デモ環境は山田さんが再来週までに準備。',
  '次回の定例は来週水曜14時からです。お疲れ様でした。',
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

/** 注入間隔（ミリ秒） */
const INJECT_INTERVAL_MS = 5000

/**
 * サンプル字幕を少しずつ注入（リアルタイム字幕をシミュレート）
 */
export function injectSampleCaptions(): void {
  const container = findCaptionContainer()
  if (!container)
    return

  let index = 0
  const intervalId = setInterval(() => {
    if (index >= SAMPLE_CAPTIONS.length) {
      clearInterval(intervalId)
      return
    }

    const caption = SAMPLE_CAPTIONS[index]
    container.appendChild(createCaptionDom(SAMPLE_USER_NAME, SAMPLE_USER_IMAGE_URL, caption))
    index++
  }, INJECT_INTERVAL_MS)
}

function findCaptionContainer(): HTMLElement | null {
  const direct = document.querySelector<HTMLElement>(CAPTION_CONTAINER_SELECTOR)
  if (direct && !direct.closest('[role="dialog"]'))
    return direct

  for (const selector of DEFAULT_CAPTION_SELECTORS) {
    const found = document.querySelector<HTMLElement>(selector)
    if (found && !found.closest('[role="dialog"]'))
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
