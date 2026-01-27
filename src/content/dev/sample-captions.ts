import { DEFAULT_CAPTION_SELECTORS } from '../dom/caption-observer'

export const SAMPLE_CAPTIONS = [
  // ===== 開始 =====
  '皆さんお疲れ様です。本日の定例ミーティングを始めます。',
  '今日のアジェンダは2つです。プロジェクトの進捗報告と、来月のイベント準備についてです。',
  '議事録は「議題1」「議題2」でまとめます。途中で追記が入るので注意してください。',

  // ===== 議題1: プロジェクト進捗 =====
  'まず、プロジェクトの進捗について報告します。',
  '開発は予定通り進んでおり、バックエンドAPIの実装が完了しました。',
  'フロントエンドは80%完成で、来週には結合テストに入れる見込みです。',
  '課題として、外部APIのレスポンスが遅い問題があります。',
  '対策としてキャッシュの導入を検討中で、田中さんが今週中に調査結果をまとめます。',
  'リリース目標は来月15日で、現時点では予定通りです。',
  '議題1の決定: キャッシュ方式は「メモリ＋Redis」の二案で比較します。',

  // ===== 議題2: イベント準備 =====
  '次に、来月のイベント準備について佐藤さんからお願いします。',
  'はい、来月20日に予定している新機能発表会の準備状況です。',
  '会場は渋谷のカンファレンスセンターで確定しました。定員100名です。',
  '現在の申し込み状況は65名で、目標の80名まであと15名です。',
  'プレゼン資料は今週中にドラフトを完成させ、来週レビューを行います。',
  'デモ環境の準備は山田さんが担当で、再来週までに用意する予定です。',
  '議題2の決定: 集客はSNS投稿を週3回に増やします。',

  // ===== 追記（議題1へ差し込みたい内容）=====
  '【追記: 議題1】外部API遅延の原因はレート制限の可能性が高いです。',
  '【追記: 議題1】短期対応として、リトライ＋バックオフを入れます。',
  '【追記: 議題1】中期対応として、非同期キュー化も検討します。',
  '【追記: 議題1】担当は田中さん継続、期限は今週金曜です。',

  // ===== 追記（議題2へ差し込みたい内容）=====
  '【追記: 議題2】会場のWi-Fiが不安定との連絡があり、予備回線を手配します。',
  '【追記: 議題2】当日のタイムテーブルは「挨拶→デモ→QA→懇親会」です。',

  // ===== まとめ =====
  'では本日の決定事項をまとめます。',
  '1点目、キャッシュ導入の調査は田中さんが今週中に完了。',
  '2点目、イベント資料のドラフトは今週中、レビューは来週。',
  '3点目、デモ環境は山田さんが再来週までに準備。',
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
