import { DEFAULT_CAPTION_SELECTORS } from '../dom/caption-observer'

const SAMPLE_CAPTIONS = [
  // 開始・アジェンダ紹介
  '皆さんお疲れ様です。本日の定例ミーティングを始めます。',
  '今日のアジェンダは3つあります。1つ目がQ3の売上実績報告、2つ目が新機能リリースの進捗、3つ目がカスタマーサポート体制の見直しです。',

  // ===== 議題1: Q3売上実績 =====
  'それではまず、Q3の売上実績について報告します。',
  '全体の売上高は1億2,300万円で、前年同期比で18%増加しました。',
  '特にSaaSプランの契約数が好調で、月額課金ユーザーが3,200アカウントから4,100アカウントに増えています。',
  '一方で、エンタープライズ向けのオンプレミス版は予想を下回り、目標の80%にとどまりました。',
  '主な要因として、大手企業の予算凍結と競合製品の値下げがあります。',
  'Q4に向けては、エンタープライズ向けにPoCパッケージを無償提供するキャンペーンを検討しています。',

  // ===== 議題2: 新機能リリース進捗 =====
  '続いて、新機能リリースの進捗を共有します。担当の田中から報告をお願いします。',
  'はい、田中です。現在開発中のAI分析機能について報告します。',
  'バックエンドのMLパイプラインは実装完了し、精度検証フェーズに入っています。',
  '現時点の精度は92.3%で、目標の95%にはあと一歩です。',
  '精度向上のため、学習データを追加で5,000件収集する必要があります。',
  '特に金融業界と製造業のデータが不足しているので、パートナー企業から提供を受ける方向で調整中です。',
  'フロントエンドについては、ダッシュボード画面が80%完成、レポート出力機能が60%完成です。',
  'UIについてはデザインレビューで指摘があり、グラフの配色とアクセシビリティ対応を修正中です。',
  'リリース目標は来月末ですが、精度目標を達成できない場合は2週間延期する判断になります。',
  '延期判断のデッドラインは今月25日としたいと思います。',

  // ===== 議題3: カスタマーサポート体制 =====
  '最後に、カスタマーサポート体制の見直しについて話し合います。佐藤さん、現状の課題を説明してください。',
  'はい、佐藤です。現在の問い合わせ対応時間は平均4.2時間ですが、これをQ4では2時間以内にしたいと考えています。',
  '課題は3つあります。1つ目がチケット分類の精度、2つ目がナレッジベースの整備不足、3つ目が夜間帯の対応体制です。',
  'チケット分類については、現在手動で行っていますが、これを自動化するツールの導入を提案します。',
  'Zendeskの機械学習機能を有効化することで、分類精度を80%程度まで上げられる見込みです。',
  'ナレッジベースは現在200記事ありますが、よくある質問Top30に対応する記事が半分しかありません。',
  '今月中に不足している15記事を追加作成する計画です。担当は鈴木さんと山田さんにお願いしたいです。',
  '夜間帯は現在、翌営業日対応としていますが、プレミアムプランのお客様からは即時対応の要望が多いです。',
  '選択肢として、外部コールセンターへの委託か、シフト制の導入を検討しています。',
  'コスト面では外部委託が月額80万円、シフト制だと人件費増が月50万円程度の試算です。',
  'サービス品質を考えるとシフト制が望ましいですが、採用が間に合うか不透明です。',
  '一旦、Q4は外部委託でスタートし、来年度からシフト制に移行する案でいかがでしょうか。',

  // ===== まとめ・決定事項 =====
  '皆さんありがとうございます。では本日の決定事項をまとめます。',
  '1点目、エンタープライズ向けPoCキャンペーンは営業部で詳細を詰めて来週提案。担当は高橋さん。',
  '2点目、AI機能の精度目標達成可否は25日に最終判断。田中さんは判断材料をまとめてください。',
  '3点目、サポート体制はQ4から外部委託を開始。契約手続きは佐藤さんが進めてください。',
  '4点目、ナレッジベース追加記事15本は今月末までに鈴木さんと山田さんで作成。',
  '次回の定例は来週水曜日の14時からです。それでは本日は以上となります。お疲れ様でした。',
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
