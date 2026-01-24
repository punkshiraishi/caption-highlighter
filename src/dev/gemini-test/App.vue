<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { buildWhiteboardImagePrompt, buildWhiteboardPrompt } from '~/shared/ai/whiteboard-prompts'
import { pickPreferredImageModel } from '~/shared/ai/gemini-models'
import { SAMPLE_CAPTIONS } from '~/content/dev/sample-captions'

type Provider = 'nano' | 'flash'

const LS_PROVIDER = 'geminiTest:provider'
const LS_API_KEY = 'geminiTest:apiKey'
const LS_FLASH_MODEL = 'geminiTest:flashModel'

const provider = ref<Provider>('nano')
const apiKey = ref('')
const flashModel = ref('gemini-flash-lite-latest')

const inputText = ref('')

const sampleOptions = [
  { key: 'contentScript', label: '📋 Content Script サンプル' },
  { key: 'budget', label: '予算会議' },
  { key: 'project', label: 'プロジェクト報告' },
  { key: 'hiring', label: '採用会議' },
  { key: 'product', label: '製品企画' },
  { key: 'retrospective', label: '振り返り' },
  { key: 'training', label: '研修報告' },
  { key: 'sales', label: '営業戦略' },
  { key: 'incident', label: '障害報告' },
  { key: 'realtime1', label: '🎤 リアル1' },
  { key: 'realtime2', label: '🎤 リアル2' },
  { key: 'realtime3', label: '🎤 リアル3' },
]

const samples: Record<string, string> = {
  budget: `今回の議題は今年度の予算、そして来年度の予算についてです。
今年度の予算に関しては、システム部、総務部、人事部から発表をお願いします。
システム部では、AI関連ツールと、メトリクス計測ツール、それから業務委託、採用の方の予算が新たに申請が必要になりました。
具体的には、GitHub Copilotのライセンス費用が年間で約500万円、Datadogのメトリクス計測ツールが年間300万円程度を見込んでいます。
業務委託については、フロントエンド開発の外部委託で月額150万円、年間で1800万円の予算を申請します。
総務部からは、オフィス移転に関する費用と、備品購入費について報告があります。
移転先のオフィスは渋谷駅から徒歩5分の新築ビルで、敷金礼金で約2000万円、内装工事費で800万円を見込んでいます。
人事部では、研修プログラムの拡充と、新卒採用の広告費について予算申請を行います。
新入社員向けの技術研修を外部委託する場合、1人あたり30万円で20名分、合計600万円となります。
採用広告はWantedlyとGreenを中心に、年間で400万円の予算を確保したいと考えています。
以上の内容について、各部門からの質問があればお願いします。`,
  project: `本日はプロジェクトAの進捗報告を行います。
現在のステータスは予定通り進行中です。
開発チームからの報告では、バックエンドAPIの実装が80%完了しています。
認証機能、ユーザー管理API、商品管理APIは実装完了、現在は決済連携APIの開発を進めています。
フロントエンド側はデザインレビューが完了し、実装に着手しました。
React 18とNext.js 14を使用しており、コンポーネント設計は完了しています。
来週までにベータ版をリリース予定です。
社内テスト用に10アカウントを用意し、営業部と企画部からフィードバックを収集します。
課題として、外部連携APIのレスポンス速度が想定より遅いという問題があります。
特に決済代行会社のAPIが平均で2秒かかっており、ユーザー体験に影響が出ています。
対策として、キャッシュ機構の導入を検討中です。
Redisを使ったキャッシュ層を追加することで、レスポンス時間を500ミリ秒以下に抑える計画です。
次回のマイルストーンは来月15日のパブリックベータリリースとなります。`,
  hiring: `採用会議を始めます。現在の採用状況について報告します。
エンジニア職は5名の枠に対して、書類選考通過者が12名です。
内訳としては、バックエンドエンジニア3名枠に対して応募8名、フロントエンドエンジニア2名枠に対して応募4名となっています。
来週から一次面接を開始します。面接官は開発部の山田さんと佐藤さんにお願いしています。
デザイナー職は2名の枠に対して、ポートフォリオ選考中が8名です。
UI/UXデザイナーとグラフィックデザイナーを1名ずつ採用予定で、Figmaの実務経験を重視しています。
営業職は3名の枠を新たに追加しました。法人営業経験者を優先的に採用したいと考えています。
人材紹介会社からの紹介が増えており、コストについて検討が必要です。
現在の紹介手数料率は年収の35%で、3名採用すると約1500万円のコストがかかります。
ダイレクトリクルーティングの活用を増やすことで、コスト削減を図りたいと思います。
内定承諾率を上げるため、オファー面談の改善案を人事部で検討中です。
具体的には、現場社員との座談会を設定することで、入社後のイメージを持ってもらう施策を考えています。`,
  product: `新製品企画会議を始めます。
本日は来期リリース予定の新サービスについて、企画部から提案があります。
サービス名は仮称「スマートタスク」、中小企業向けのタスク管理SaaSを想定しています。
市場調査の結果、従業員50名以下の企業でタスク管理ツールの導入率は約30%に留まっています。
既存サービスは機能が複雑すぎる、または価格が高いという課題があります。
我々の強みとしては、シンプルなUIと月額980円からの低価格帯を実現できる点です。
ターゲットは従業員10名から50名のIT企業以外の中小企業を想定しています。
必要な機能としては、タスクの作成・編集・削除、担当者のアサイン、期限管理、進捗のカンバン表示です。
差別化ポイントとして、LINEとの連携機能を実装したいと考えています。
日本の中小企業ではLINEがコミュニケーションツールとして広く使われているためです。
開発期間は6ヶ月を想定しており、来年4月のリリースを目指します。
初期の目標として、リリースから3ヶ月で100社の導入を目指します。
開発予算として3000万円、マーケティング予算として500万円を申請します。`,
  retrospective: `今月のスプリント振り返りを行います。
まずはKPTの形式で進めていきたいと思います。
Keepとして良かった点です。
デイリースタンドアップを15分以内に終わらせることができるようになりました。
ペアプログラミングを積極的に実施した結果、コードレビューの指摘事項が30%減少しました。
ドキュメントの整備が進み、新メンバーのオンボーディングがスムーズになりました。
テストカバレッジが前月の65%から78%に向上しました。
Problemとして課題点です。
スプリント中の仕様変更が3回あり、予定していたタスクの20%が完了できませんでした。
技術的負債の解消に着手できていません。特にレガシーなAPIの改修が遅れています。
リモートワーク中のコミュニケーション不足が指摘されています。
本番環境へのデプロイ時にエラーが発生し、2時間のダウンタイムがありました。
Tryとして次回挑戦することです。
仕様変更のプロセスを明確化し、スプリント中の変更は次スプリントに回すルールを設定します。
毎週金曜日の午後を技術的負債の解消に充てる時間として確保します。
週1回のオンラインランチ会を実施して、雑談の機会を増やします。
デプロイ前のチェックリストを作成し、ダブルチェック体制を導入します。`,
  training: `新入社員研修の報告を行います。
今年度は4月に入社した新卒10名を対象に、3ヶ月間の研修を実施しました。
研修プログラムの内容についてご報告します。
1ヶ月目はビジネスマナー研修と会社理解を中心に行いました。
名刺交換、電話対応、メール作成などの基本スキルを習得しています。
また、各部門の責任者から事業内容の説明を受け、会社全体の理解を深めました。
2ヶ月目は技術研修を実施しました。
プログラミング未経験者が4名いたため、基礎的なHTML、CSS、JavaScriptから始めました。
経験者向けには、社内で使用しているReactとTypeScriptのハンズオン研修を行いました。
チーム開発の練習として、簡単なTodoアプリを5人ずつのチームで開発しました。
3ヶ月目はOJT期間として、各配属先で実際の業務を経験しました。
メンター制度を導入し、先輩社員がマンツーマンでサポートしています。
研修終了時のアンケート結果です。
満足度は5点満点中4.2点でした。
「技術研修の時間をもっと増やしてほしい」という要望が多くありました。
今後は研修期間の延長や、eラーニングの導入を検討します。`,
  sales: `営業戦略会議を始めます。
今期の売上目標は前年比20%増で、重点市場は中小企業向けSaaSです。
現在のパイプラインは約5億円で、成約率は25%です。
課題はリード獲得の質で、広告からの流入が多い一方で商談化率が低下しています。
対策として、ターゲティングを業種別に見直し、ホワイトペーパーの内容を改善します。
営業チームは新たに2名採用し、インサイドセールスを強化します。
代理店経由の売上が伸びているため、パートナー施策も拡充します。
次回は具体的なKPIとスケジュールを共有します。`,
  incident: `障害報告会を開始します。
昨日10時頃、本番環境でサービス障害が発生しました。
原因はDBコネクションプールの枯渇で、バッチ処理が接続を解放していなかったことが判明しました。
影響範囲は最大で約1万人のユーザーです。
復旧にはDB再起動とバッチ停止で2時間かかりました。
再発防止策として、監視の閾値を80%でアラートする設定に変更しました。
また、バッチ処理のコードレビューを来週までに完了します。`,
  realtime1: `えっと、日程はですね、12月の、えーと、15日の土曜日を予定しててー、あ、ごめんなさい、16日だ、16日の土曜日です。
で、あのー、参加費なんですけども、えーと、一般参加が3000円、あ、3500円、学生が1500円っていう感じで考えてます。
あとー、スポンサーの件なんですけど、えーっと、今のところ、株式会社なんとかさんと、あー、えーと、ABCコーポレーションさんから、あの、協賛の、おー、お話をいただいてて。
で、それぞれ、あの、ゴールドスポンサーで50万円、シルバーで20万ぐらい、20万円を、あの、ご検討いただいてるっていう状況です。
あとは、えーと、登壇者なんですけども、今、3名確定してて、えーと、山田さんと、佐藤さんと、あと、外部から田中先生をお呼びする予定です。`,
  realtime2: `あー、えーと、システム障害の件で報告します。
昨日のですね、えーと、午前中、10時ぐらいですかね、あの、本番環境が、えー、ダウンしまして。
原因はですね、あのー、ディービー、データベースの、えーと、コネクションが、あー、枯渇した、みたいな感じで。
で、あのー、調査したところ、えっと、バッチ処理が、あー、なんか、あの、コネクションをリリースしてなくて、それがどんどん溜まってって。
でー、最終的に上限の、えーと、100？100コネクションに達して、あの、新規の接続ができなくなった、と。
復旧にはですね、えーと、まあ、とりあえず、あのー、DBを再起動して、で、バッチを止めて、えー、2時間ぐらいかかりました。
あー、影響範囲なんですけど、えーと、ユーザー数で言うと、まあ、5000人ぐらい？5000人から1万人ぐらいの間かな、あの、影響があったと思います。
再発防止としてはですね、あの、コネクションプーリングの設定を見直しと、あと、監視の閾値を、えー、80パー、80パーセントで、あの、アラートが出るようにしました。
で、あとー、バッチ処理のコードレビューを、あの、全部やり直すっていうのを、来週までにやる予定です。`,
  realtime3: `えー、採用の進捗について、えーと、ご報告します。
まずエンジニアなんですけど、えーっと、今、書類選考が、えー、12名通過してて、来週から、あの、一次面接を、えー、スタートします。
で、あのー、面接官は、えーと、やまだ、山田さんと、あと、さとう、佐藤さんに、えー、お願いしてて。
あー、ちなみに、応募者の内訳なんですけど、えーと、バックエンドが、8名、で、フロントエンドが、あー、4名、ですね。
で、えーと、経験年数で言うと、えーっと、3年以上が、半分ぐらい？6名ぐらいで、えー、残りは、まあ、1年から3年っていう感じです。
あとー、デザイナーの方は、えーと、今、ポートフォリオの選考中で、えー、8名の中から、まあ、5名ぐらいに、あの、絞る予定です。
で、採用費用の話なんですけど、えーと、人材紹介会社経由だと、まあ、年収の35パー、35パーセントぐらい、えー、かかるんで。
えっと、仮に3名採用すると、えー、1500万、1500万円ぐらい、あの、コストがかかる計算になります。
なので、あのー、ダイレクト、ダイレクトリクルーティングを、もっと活用して、えー、コスト削減、したいなって思ってます。`,
  contentScript: SAMPLE_CAPTIONS.join('\n'),
}

function applySample(key: string): void {
  if (samples[key])
    inputText.value = samples[key]
}

const summaryPrompt = ref('-')
const summaryText = ref('結果がここに表示されます...')
const previousSummary = ref('')
const summaryStatus = ref('')
const isSummaryRunning = ref(false)

const imagePrompt = ref('-')
const imageDataUrl = ref('')
const imageStatus = ref('')
const isImageRunning = ref(false)
const imageModel = ref<string>('')

const models = ref<Array<{ name?: string, supportedGenerationMethods?: string[] }>>([])
const isLoadingModels = ref(false)
const modelsError = ref('')

function persist() {
  try {
    localStorage.setItem(LS_PROVIDER, provider.value)
    localStorage.setItem(LS_API_KEY, apiKey.value)
    localStorage.setItem(LS_FLASH_MODEL, flashModel.value)
  }
  catch {
    // ignore
  }
}

function restore() {
  try {
    const p = localStorage.getItem(LS_PROVIDER)
    if (p === 'flash' || p === 'nano')
      provider.value = p
    const k = localStorage.getItem(LS_API_KEY)
    if (k)
      apiKey.value = k
    const m = localStorage.getItem(LS_FLASH_MODEL)
    if (m)
      flashModel.value = m
  }
  catch {
    // ignore
  }
}

function getLanguageModelAPI(): any {
  const g = globalThis as any
  if (g.LanguageModel)
    return g.LanguageModel
  if (g.ai?.languageModel)
    return g.ai.languageModel
  return null
}

const nanoAvailability = ref<'unknown' | 'available' | 'unavailable' | 'downloading' | 'error'>('unknown')
const nanoErrorMessage = ref('')
let nanoSession: any = null

async function checkNanoAvailability(): Promise<void> {
  nanoErrorMessage.value = ''
  const api = getLanguageModelAPI()
  if (!api) {
    nanoAvailability.value = 'unavailable'
    nanoErrorMessage.value = 'Gemini Nano API が見つかりません'
    return
  }
  try {
    let status: string
    if (api.availability) {
      status = await api.availability()
    }
    else if (api.capabilities) {
      const caps = await api.capabilities()
      status = caps.available
    }
    else {
      nanoAvailability.value = 'unavailable'
      return
    }

    if (status === 'readily' || status === 'available') {
      nanoAvailability.value = 'available'
    }
    else if (status === 'after-download') {
      nanoAvailability.value = 'downloading'
      nanoErrorMessage.value = 'モデルをダウンロード中です'
    }
    else {
      nanoAvailability.value = 'unavailable'
      nanoErrorMessage.value = `利用不可 (${status})`
    }
  }
  catch (error) {
    nanoAvailability.value = 'error'
    nanoErrorMessage.value = error instanceof Error ? error.message : String(error)
  }
}

async function ensureNanoSession(): Promise<boolean> {
  if (nanoSession)
    return true
  const api = getLanguageModelAPI()
  if (!api)
    return false
  try {
    nanoSession = await api.create({
      expectedOutputLanguages: ['ja'],
      temperature: 1.0,
      topK: 3,
    })
    return true
  }
  catch {
    nanoSession = null
    return false
  }
}

async function listModels(): Promise<void> {
  modelsError.value = ''
  isLoadingModels.value = true
  try {
    const key = apiKey.value.trim()
    if (!key) {
      models.value = []
      modelsError.value = 'API Key が未設定です'
      return
    }
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(key)}`
    const res = await fetch(url, { method: 'GET' })
    const data = await res.json().catch(() => null) as any
    if (!res.ok) {
      const msg = data?.error?.message || `HTTP ${res.status}`
      models.value = []
      modelsError.value = msg
      return
    }
    models.value = Array.isArray(data?.models) ? data.models : []
    imageModel.value = pickPreferredImageModel(models.value) || ''
  }
  catch (e) {
    models.value = []
    modelsError.value = e instanceof Error ? e.message : String(e)
  }
  finally {
    isLoadingModels.value = false
  }
}

const canRunSummary = computed(() => {
  if (isSummaryRunning.value)
    return false
  if (!inputText.value.trim())
    return false
  if (provider.value === 'flash')
    return Boolean(apiKey.value.trim())
  return nanoAvailability.value !== 'unavailable' && nanoAvailability.value !== 'error'
})

async function runSummary(): Promise<void> {
  summaryStatus.value = ''
  imageStatus.value = ''
  isSummaryRunning.value = true
  try {
    const captions = inputText.value
    if (provider.value === 'nano' && nanoAvailability.value !== 'available') {
      await checkNanoAvailability()
      if (nanoAvailability.value !== 'available') {
        summaryStatus.value = nanoErrorMessage.value
          ? `Gemini Nano が利用できません: ${nanoErrorMessage.value}`
          : 'Gemini Nano が利用できません'
        return
      }
    }
    const prompt = buildWhiteboardPrompt({ captions, previousSummary: previousSummary.value })
    summaryPrompt.value = prompt

    if (provider.value === 'nano') {
      const ok = await ensureNanoSession()
      if (!ok) {
        summaryStatus.value = 'セッション作成に失敗しました'
        return
      }
      const result = await nanoSession.prompt(prompt)
      summaryText.value = result || '(空の応答)'
      previousSummary.value = summaryText.value
      return
    }

    // flash
    const key = apiKey.value.trim()
    const model = flashModel.value.trim() || 'gemini-flash-lite-latest'
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          temperature: 1.0,
          topK: 3,
        },
      }),
    })
    const data = await res.json().catch(() => null) as any
    if (!res.ok) {
      const msg = data?.error?.message || `HTTP ${res.status}`
      summaryStatus.value = `エラー: ${msg}`
      return
    }
    const text = (data?.candidates?.[0]?.content?.parts || [])
      .map((p: any) => p?.text || '')
      .join('')
      .trim()
    summaryText.value = text || JSON.stringify(data, null, 2)
    previousSummary.value = summaryText.value
  }
  catch (e) {
    summaryStatus.value = `エラー: ${e instanceof Error ? e.message : String(e)}`
  }
  finally {
    isSummaryRunning.value = false
  }
}

function clearSummary(): void {
  inputText.value = ''
  summaryPrompt.value = '-'
  summaryText.value = '結果がここに表示されます...'
  previousSummary.value = ''
  summaryStatus.value = ''
}

const canGenerateImage = computed(() => {
  if (isImageRunning.value)
    return false
  if (!apiKey.value.trim())
    return false
  if (!previousSummary.value.trim())
    return false
  return true
})

async function generateImage(): Promise<void> {
  imageStatus.value = ''
  isImageRunning.value = true
  try {
    const key = apiKey.value.trim()
    if (!models.value.length)
      await listModels()
    const model = imageModel.value || pickPreferredImageModel(models.value) || ''
    if (!model) {
      imageStatus.value = '画像生成モデルが見つかりませんでした'
      return
    }
    imageModel.value = model

    const prompt = buildWhiteboardImagePrompt({ markdown: previousSummary.value })
    imagePrompt.value = prompt

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          responseModalities: ['IMAGE'],
          imageConfig: { aspectRatio: '16:9' },
        },
      }),
    })
    const data = await res.json().catch(() => null) as any
    if (!res.ok) {
      const msg = data?.error?.message || `HTTP ${res.status}`
      imageStatus.value = `エラー: ${msg}`
      return
    }
    const base64 = data?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data
    const mimeType = data?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.mimeType || 'image/png'
    if (!base64) {
      imageStatus.value = '画像データが取得できませんでした'
      return
    }
    imageDataUrl.value = `data:${mimeType};base64,${base64}`
  }
  catch (e) {
    imageStatus.value = `エラー: ${e instanceof Error ? e.message : String(e)}`
  }
  finally {
    isImageRunning.value = false
  }
}

function clearImage(): void {
  imagePrompt.value = '-'
  imageDataUrl.value = ''
  imageStatus.value = ''
}

function downloadImage(): void {
  if (!imageDataUrl.value)
    return
  const link = document.createElement('a')
  link.href = imageDataUrl.value
  link.download = `whiteboard-test-${Date.now()}.png`
  link.click()
}

const nanoStatusLabel = computed(() => {
  switch (nanoAvailability.value) {
    case 'available': return '✅ Nano 利用可能'
    case 'downloading': return '⏳ モデルダウンロード中...'
    case 'unavailable': return '❌ Nano 利用不可'
    case 'error': return '❌ Nano エラー'
    default: return '…'
  }
})

onMounted(async () => {
  restore()
  persist()
  inputText.value = inputText.value || ''
  await checkNanoAvailability()
  if (apiKey.value.trim())
    await listModels()
})

watch(provider, async (next) => {
  persist()
  if (next === 'nano')
    await checkNanoAvailability()
})
</script>

<template>
  <div class="page">
    <header class="header">
      <div>
        <h1>🧪 Gemini テスト（構造化メモ / 画像出力）</h1>
        <p class="subtitle">
          拡張本体と同じプロンプト生成ロジックを参照します。
        </p>
        <p v-if="nanoErrorMessage" class="error">
          Nano: {{ nanoErrorMessage }}（Chrome再起動/モデル再ダウンロードで改善する場合があります）
        </p>
      </div>
      <div class="header__right">
        <div class="pill">
          {{ nanoStatusLabel }}
        </div>
      </div>
    </header>

    <section class="config">
      <label class="field">
        <span>要約プロバイダ</span>
        <select v-model="provider" @change="persist">
          <option value="nano">Gemini Nano（ローカル）</option>
          <option value="flash">Gemini Flash（クラウド / AI Studio）</option>
        </select>
      </label>

      <label class="field field--wide">
        <span>AI Studio API Key（ローカル保存）</span>
        <input v-model="apiKey" type="password" placeholder="AIza..." @input="persist">
        <div class="row">
          <button class="btn btn--secondary" type="button" :disabled="isLoadingModels" @click="listModels">
            {{ isLoadingModels ? 'モデル取得中...' : 'モデル一覧を取得' }}
          </button>
          <span v-if="modelsError" class="hint">エラー: {{ modelsError }}</span>
        </div>
      </label>

      <label class="field">
        <span>Flash model（要約）</span>
        <input v-model="flashModel" type="text" placeholder="gemini-flash-lite-latest" @input="persist">
      </label>

      <div class="field">
        <span>画像モデル（自動選択）</span>
        <div class="row">
          <span class="pill">{{ imageModel || '未選択' }}</span>
        </div>
      </div>
    </section>

    <main class="grid">
      <section class="panel panel--wide">
        <header class="panel__header">
          <span class="panel__title">📝 入力（会議発言）</span>
        </header>
        <textarea v-model="inputText" class="textarea" placeholder="会議発言を入力..." />
        <div class="samples">
          <div class="samples__title">
            サンプル選択:
          </div>
          <div class="samples__list">
            <button
              v-for="item in sampleOptions"
              :key="item.key"
              class="btn btn--secondary btn--small"
              type="button"
              @click="applySample(item.key)"
            >
              {{ item.label }}
            </button>
          </div>
        </div>
      </section>

      <section class="panel">
        <header class="panel__header">
          <span class="panel__title">📋 出力（構造化メモ）</span>
          <div class="panel__actions">
            <button class="btn btn--primary" type="button" :disabled="!canRunSummary" @click="runSummary">
              ▶ 実行
            </button>
            <button class="btn btn--secondary" type="button" @click="clearSummary">
              クリア
            </button>
            <button class="btn btn--secondary" type="button" @click="checkNanoAvailability">
              Nano再チェック
            </button>
          </div>
        </header>
        <div class="panel__content">
          <pre class="pre">{{ summaryText }}</pre>
        </div>
        <p v-if="summaryStatus" class="error">
          {{ summaryStatus }}
        </p>
        <div class="log">
          <div class="log__title">
            📜 構造化メモ用プロンプト
          </div>
          <pre class="log__content">{{ summaryPrompt }}</pre>
        </div>
      </section>

      <section class="panel">
        <header class="panel__header">
          <span class="panel__title">🖼️ 画像出力（ホワイトボード風）</span>
          <div class="panel__actions">
            <button class="btn btn--secondary" type="button" :disabled="!canGenerateImage" @click="generateImage">
              画像生成
            </button>
            <button class="btn btn--secondary" type="button" @click="clearImage">
              クリア
            </button>
            <button class="btn btn--secondary" type="button" :disabled="!imageDataUrl" @click="downloadImage">
              保存
            </button>
          </div>
        </header>

        <div class="imageWrap">
          <img v-if="imageDataUrl" class="image" :src="imageDataUrl" alt="ホワイトボード画像">
          <div v-else class="imageEmpty">
            画像は未生成です
          </div>
          <div v-if="imageStatus" class="imageStatus">
            {{ imageStatus }}
          </div>
        </div>

        <div class="log">
          <div class="log__title">
            🖼️ 画像出力用プロンプト
          </div>
          <pre class="log__content">{{ imagePrompt }}</pre>
        </div>
      </section>
    </main>
  </div>
</template>

<style scoped>
.page {
  min-height: 100vh;
  padding: 28px;
  background: #0f0f0f;
  color: #e5e7eb;
  font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}

.header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 18px;
}

h1 {
  font-size: 20px;
  margin: 0 0 6px;
  color: #4ade80;
}

.subtitle {
  margin: 0;
  color: #9ca3af;
  font-size: 13px;
}

.pill {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  border-radius: 999px;
  background: rgba(74, 222, 128, 0.12);
  color: #86efac;
  font-size: 12px;
  white-space: nowrap;
}

.config {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 12px;
  margin-bottom: 18px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 12px;
  color: #cbd5e1;
}

.field--wide {
  grid-column: 1 / -1;
}

input, select {
  background: #0b1220;
  border: 1px solid #334155;
  border-radius: 10px;
  padding: 10px 12px;
  color: #e5e7eb;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
  font-size: 12px;
}

.row {
  display: flex;
  gap: 10px;
  align-items: center;
  flex-wrap: wrap;
}

.hint {
  color: #9ca3af;
}

.grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 18px;
  max-width: 1400px;
}

.panel {
  background: #141414;
  border: 1px solid #2b2b2b;
  border-radius: 14px;
  padding: 16px;
}

.panel--wide {
  grid-column: 1 / -1;
}

.panel__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 12px;
}

.panel__title {
  font-size: 12px;
  letter-spacing: 0.08em;
  color: #9ca3af;
  text-transform: uppercase;
}

.panel__actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  align-items: center;
}

.panel__content {
  background: #0f0f0f;
  border: 1px solid #2b2b2b;
  border-radius: 10px;
  padding: 12px;
  min-height: 180px;
  max-height: 420px;
  overflow: auto;
}

.textarea {
  width: 100%;
  min-height: 260px;
  background: #0f0f0f;
  border: 1px solid #2b2b2b;
  border-radius: 10px;
  padding: 12px;
  color: #e5e7eb;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
  font-size: 12px;
  line-height: 1.6;
  resize: vertical;
}

.pre {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
  font-size: 12px;
  line-height: 1.6;
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border: none;
  border-radius: 10px;
  font-size: 12px;
  cursor: pointer;
  transition: opacity 0.15s ease;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn--primary {
  background: #4ade80;
  color: #000;
}

.btn--secondary {
  background: #2b2b2b;
  color: #e5e7eb;
}

.btn--small {
  padding: 6px 10px;
  font-size: 11px;
}

.samples {
  margin-top: 12px;
}

.samples__title {
  font-size: 12px;
  color: #9ca3af;
  margin-bottom: 8px;
}

.samples__list {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.log {
  margin-top: 12px;
}

.log__title {
  font-size: 12px;
  color: #9ca3af;
  margin: 0 0 8px;
}

.log__content {
  background: #0f0f0f;
  border: 1px solid #2b2b2b;
  border-radius: 10px;
  padding: 12px;
  max-height: 200px;
  overflow: auto;
  margin: 0;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
  font-size: 11px;
  color: #9ca3af;
  white-space: pre-wrap;
  word-break: break-word;
}

.error {
  margin: 10px 0 0;
  color: #fca5a5;
  font-size: 12px;
}

.imageWrap {
  position: relative;
  background: #0f0f0f;
  border: 1px solid #2b2b2b;
  border-radius: 10px;
  padding: 12px;
  min-height: 220px;
  display: flex;
  align-items: flex-start;
  justify-content: center;
}

.image {
  width: 100%;
  height: auto;
  border-radius: 10px;
}

.imageEmpty {
  color: #9ca3af;
  font-size: 12px;
  align-self: center;
}

.imageStatus {
  position: absolute;
  top: 12px;
  right: 12px;
  background: rgba(15, 23, 42, 0.85);
  color: #e5e7eb;
  font-size: 12px;
  padding: 6px 8px;
  border-radius: 8px;
}
</style>
