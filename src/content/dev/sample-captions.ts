import { DEFAULT_CAPTION_SELECTORS } from '../dom/caption-observer'

export const SAMPLE_CAPTIONS = [
  // ===== 開始・アジェンダ紹介 =====
  '皆さんお疲れ様です。本日の定例ミーティングを始めます。',
  '今日のアジェンダは大きく4つあります。1つ目がQ3の売上実績と分析、2つ目が新機能リリースの進捗、3つ目がカスタマーサポート体制の見直し、4つ目がセキュリティ対策の強化です。',
  '各議題には複数のサブトピックがあるので、時間配分に気をつけながら進めていきましょう。',

  // ===== 議題1: Q3売上実績と分析 =====
  'それではまず、Q3の売上実績について報告します。',
  '全体の売上高は1億2,300万円で、前年同期比で18%増加しました。',
  '内訳を詳しく見ていきます。まずSaaSプランについてです。',
  'SaaSプランの月額課金ユーザーは3,200アカウントから4,100アカウントに増加しました。',
  'SaaSの中でもスタータープランが特に好調で、前期比40%増です。',
  'プロフェッショナルプランは20%増、エンタープライズプランは5%増にとどまりました。',
  '次に、オンプレミス版の実績です。エンタープライズ向けオンプレミス版は予想を下回り、目標の80%にとどまりました。',
  '要因は複数あります。まず大手企業の予算凍結の影響が大きいです。',
  '次に競合A社が値下げキャンペーンを実施したことも影響しています。',
  'さらに、導入に時間がかかるという評価がオンプレミスへの移行を躊躇させている面もあります。',
  'Q4の対策として3つの施策を検討しています。',
  '1つ目はPoCパッケージの無償提供、2つ目は導入支援チームの増員、3つ目は競合対策の価格見直しです。',
  '各施策の詳細は後ほど営業部から共有します。',

  // ===== 議題2: 新機能リリースの進捗 =====
  '続いて、新機能リリースの進捗を共有します。担当の田中から報告をお願いします。',
  'はい、田中です。現在開発中の機能は大きく3つあります。AI分析機能、レポート自動生成、モバイルアプリ対応です。',
  'まずAI分析機能について報告します。バックエンドのMLパイプラインは実装完了し、精度検証フェーズに入っています。',
  '現時点の精度は92.3%で、目標の95%にはあと一歩です。',
  '精度向上のための取り組みを2つ進めています。',
  '1つ目は学習データの追加収集です。追加で5,000件必要で、特に金融業界と製造業のデータが不足しています。',
  '2つ目はモデルのチューニングです。ハイパーパラメータの最適化とアンサンブル学習の導入を検討中です。',
  'データ収集についてはパートナー企業3社と交渉中で、来週までに回答をもらう予定です。',
  'モデルのチューニングは井上さんが担当し、今月20日までに結果を出す予定です。',
  '次にレポート自動生成機能について報告します。',
  'テンプレートエンジンの実装が完了し、現在はPDF出力とExcel出力の最終調整中です。',
  'PDF出力は文字化けの問題があり、フォント埋め込みの対応を進めています。',
  'Excel出力はグラフの再現性に課題があり、ライブラリの変更を検討中です。',
  '最後にモバイルアプリ対応です。iOS版は審査提出済みで、来週には承認される見込みです。',
  'Android版は最終テスト中ですが、一部の端末でクラッシュする問題が見つかりました。',
  '原因はメモリリークで、今週中に修正して再テストを行います。',
  'フロントエンドについては、ダッシュボード画面が80%完成、レポート出力機能が60%完成です。',
  'UIについてはデザインレビューで3点の指摘がありました。',
  '1点目がグラフの配色、2点目がアクセシビリティ対応、3点目がダークモードの対応です。',
  'リリース目標は来月末ですが、精度目標を達成できない場合は2週間延期する判断になります。',
  '延期判断のデッドラインは今月25日としたいと思います。',

  // ===== 議題3: カスタマーサポート体制 =====
  '続いて、カスタマーサポート体制の見直しについてです。佐藤さん、現状の課題を説明してください。',
  'はい、佐藤です。現在の問い合わせ対応時間は平均4.2時間ですが、Q4では2時間以内を目標にしています。',
  '課題を体系的に整理しました。大きく分けて3つのカテゴリーがあります。',
  '1つ目のカテゴリーはツール面の課題です。チケット分類の精度が低く、エスカレーションに時間がかかっています。',
  'チケット分類は現在手動で行っていますが、Zendeskの機械学習機能を有効化することで、分類精度を80%程度まで上げられる見込みです。',
  '導入コストは初期費用10万円、月額2万円の追加となります。',
  '2つ目のカテゴリーはナレッジベースの課題です。現在200記事ありますが、よくある質問Top30に対応する記事が半分しかありません。',
  '不足している記事は15本で、内訳は製品機能に関するものが8本、トラブルシューティングが5本、料金・契約に関するものが2本です。',
  '担当は鈴木さんが製品機能8本、山田さんがトラブルシューティングと料金関連7本を担当する案でいかがでしょうか。',
  '3つ目のカテゴリーは運用体制の課題です。夜間帯は現在、翌営業日対応としています。',
  'プレミアムプランのお客様からは24時間対応の要望が多く、解約理由にも挙がっています。',
  '対策として2つの選択肢を検討しています。外部コールセンターへの委託とシフト制の導入です。',
  '外部委託の場合、コストは月額80万円、対応品質は標準的、立ち上げは2週間で可能です。',
  'シフト制の場合、コストは月額50万円増、対応品質は高い、ただし採用に2ヶ月かかります。',
  '短期的には外部委託、来年度からシフト制に移行するハイブリッド案を提案します。',

  // ===== 議題4: セキュリティ対策 =====
  '最後の議題はセキュリティ対策の強化についてです。',
  '先月のセキュリティ監査で3つの指摘事項がありました。',
  '1つ目はパスワードポリシーの強化、2つ目は二要素認証の必須化、3つ目はログ保持期間の延長です。',
  'パスワードポリシーについては、最小文字数を8文字から12文字に変更し、複雑性要件を追加します。',
  '対象は全ユーザーですが、既存ユーザーには3ヶ月の猶予期間を設けます。',
  '二要素認証については、管理者アカウントは即時必須化、一般ユーザーは来月から段階的に導入します。',
  '導入方法は3種類用意します。SMS認証、認証アプリ、ハードウェアトークンです。',
  'ログ保持期間は現在90日ですが、これを1年に延長します。',
  'ストレージコストは月額5万円増加しますが、コンプライアンス対応として必須と判断しました。',
  '実装スケジュールは来月からフェーズ1としてパスワードポリシー、再来月からフェーズ2として二要素認証、3ヶ月後にフェーズ3としてログ対応を進めます。',

  // ===== まとめ・決定事項 =====
  '皆さんありがとうございます。では本日の決定事項とアクションアイテムをまとめます。',
  '決定事項は5点あります。',
  '1点目、エンタープライズ向けPoCキャンペーンは営業部で詳細を詰めて来週提案。担当は高橋さん。',
  '2点目、AI機能の精度目標達成可否は25日に最終判断。田中さんは判断材料をまとめてください。',
  '3点目、サポート体制はQ4から外部委託を開始。契約手続きは佐藤さんが進めてください。',
  '4点目、ナレッジベース追加記事15本は今月末までに完成。鈴木さんが8本、山田さんが7本を担当。',
  '5点目、セキュリティ強化は来月からフェーズ1を開始。全体管理は情報システム部の中村さん。',
  'アクションアイテムの期限を確認します。',
  '今週中のタスクは、AI分析のメモリリーク修正と、外部委託業者への見積もり依頼です。',
  '来週中のタスクは、PoCキャンペーン詳細の提案と、パートナー企業からのデータ収集回答確認です。',
  '今月末までのタスクは、ナレッジベース記事作成と、セキュリティ強化の詳細設計です。',
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
