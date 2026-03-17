<script setup lang="ts">
import browser from 'webextension-polyfill'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import DictionaryTable from './components/DictionaryTable.vue'
import ImportPreview from './components/ImportPreview.vue'
import { useSettingsStore } from './stores/settings'
import type { DictionaryImportStats } from '~/shared/utils/csv'
import { buildDictionaryFromCsv, parseCsv } from '~/shared/utils/csv'
import { loadSecrets, saveSecrets } from '~/shared/storage/secrets'
import type { GoogleDocsSyncStatus } from '~/shared/messages/google-docs-sync'
import type { GoogleDocsTabSummary } from '~/shared/google-docs'

const store = useSettingsStore()
const fileInput = ref<HTMLInputElement | null>(null)
const filter = computed({
  get: () => store.filter,
  set: value => store.setFilter(value),
})

const apiKey = ref('')
const permGranted = ref<boolean | null>(null)
const aiTestResult = ref<string | null>(null)
const aiTestError = ref<string | null>(null)
const savingKey = ref(false)
const flashOrigins = ['https://generativelanguage.googleapis.com/*']

const headers = ref<string[]>([])
const csvRows = ref<Record<string, string>[]>([])
const selection = reactive({
  term: '',
  definition: '',
  alias: '',
})
const stats = ref<DictionaryImportStats | null>(null)
const importError = ref<string | null>(null)
const openDocsTabs = ref<GoogleDocsTabSummary[]>([])
const selectedDocsTabId = ref<number | null>(null)
const docsStatus = ref<GoogleDocsSyncStatus | null>(null)
const docsBusy = ref(false)
const docsError = ref<string | null>(null)

const hasPreview = computed(() => headers.value.length > 0 && csvRows.value.length > 0)
const hasApiKey = computed(() => apiKey.value.trim().length > 0)
const aiConsentGranted = computed(() => store.ai.allowSendCaptionsToCloud)
const aiPermissionGranted = computed(() => permGranted.value === true)
const aiReady = computed(() => hasApiKey.value && aiConsentGranted.value && aiPermissionGranted.value)
const aiChecklist = computed(() => [
  { label: 'Google AI Studio key を保存', done: hasApiKey.value },
  { label: '字幕を Google AI に送って会議メモを作ることに同意', done: aiConsentGranted.value },
  { label: 'ブラウザで Google AI への接続を許可', done: aiPermissionGranted.value },
])
const aiCompletedSteps = computed(() => aiChecklist.value.filter(item => item.done).length)
const canTestAi = computed(() => aiReady.value && !savingKey.value)
const docsConnected = computed(() => store.docsSync.enabled && docsStatus.value?.state === 'ready')
const docsNeedsAttention = computed(() => store.docsSync.enabled && docsStatus.value?.state === 'stale')
const docsTargetLabel = computed(() => docsStatus.value?.binding?.title ?? '未選択')
const totalSetupSteps = 2
const completedSetupSteps = computed(() => {
  let count = 0
  if (aiReady.value)
    count += 1
  if (docsConnected.value)
    count += 1
  return count
})

watch(() => [selection.term, selection.definition, selection.alias], () => {
  importError.value = null
  stats.value = null
})

onMounted(() => {
  void initialize()
})

async function initialize() {
  await store.initialize()
  const secrets = await loadSecrets()
  apiKey.value = secrets.geminiApiKey || ''
  await refreshPermission()
  await refreshGoogleDocsTabs()
  await refreshGoogleDocsStatus()
}

async function refreshPermission() {
  permGranted.value = await browser.permissions.contains({ origins: flashOrigins })
}

async function requestPermission() {
  aiTestResult.value = null
  aiTestError.value = null
  const ok = await browser.permissions.request({ origins: flashOrigins })
  permGranted.value = ok
}

async function persistApiKey() {
  savingKey.value = true
  aiTestResult.value = null
  aiTestError.value = null
  try {
    await saveSecrets({ geminiApiKey: apiKey.value.trim() })
  }
  finally {
    savingKey.value = false
  }
}

async function testAiConnection() {
  aiTestResult.value = null
  aiTestError.value = null
  try {
    const resp = await browser.runtime.sendMessage({
      type: 'ai:flash:test',
    }) as { ok: boolean, text?: string, error?: string }

    if (!resp.ok) {
      aiTestError.value = resp.error || '接続テストに失敗しました。'
      return
    }

    aiTestResult.value = resp.text || '接続できました。'
  }
  catch (error) {
    aiTestError.value = error instanceof Error ? error.message : String(error)
  }
}

function triggerFile() {
  fileInput.value?.click()
}

function guessAliasHeader(available: string[], excluded: string[]): string {
  const known = ['alias', 'aliases', 'エイリアス', '別名']
  for (const header of available) {
    const lower = header.trim().toLocaleLowerCase()
    if (known.includes(lower) && !excluded.includes(header))
      return header
  }
  return ''
}

function resetSelection() {
  selection.term = headers.value[0] ?? ''
  selection.definition = headers.value[1] ?? ''
  selection.alias = guessAliasHeader(headers.value, [selection.term, selection.definition])
}

function clearPreview() {
  headers.value = []
  csvRows.value = []
  stats.value = null
  importError.value = null
  selection.term = ''
  selection.definition = ''
  selection.alias = ''
  if (fileInput.value)
    fileInput.value.value = ''
}

async function handleFileSelected(event: Event) {
  const input = event.target as HTMLInputElement
  if (!input.files?.length)
    return

  const file = input.files[0]
  const content = await file.text()

  try {
    const result = parseCsv(content)
    if (!result.headers.length)
      throw new Error('ヘッダー行が見つかりませんでした。')

    headers.value = result.headers
    csvRows.value = result.rows
    resetSelection()
    stats.value = null
    importError.value = null
  }
  catch (error) {
    importError.value = error instanceof Error ? error.message : 'CSV の解析に失敗しました。'
    headers.value = []
    csvRows.value = []
  }
}

async function confirmImport(columns: { term: string, definition: string, alias: string | null }) {
  if (!csvRows.value.length)
    return

  importError.value = null

  const { entries, stats: importStats } = buildDictionaryFromCsv(
    csvRows.value,
    columns.term,
    columns.definition,
    columns.alias ?? undefined,
  )

  if (!entries.length) {
    stats.value = importStats
    importError.value = '追加対象の行がありません。列の選択を確認してください。'
    return
  }

  stats.value = importStats
  await store.importEntries(entries)
  clearPreview()
}

async function handleReset() {
  // eslint-disable-next-line no-alert
  if (window.confirm('辞書をすべて削除しますか？'))
    await store.clearDictionary()
}

async function refreshGoogleDocsTabs() {
  const response = await browser.runtime.sendMessage({
    type: 'gdocs-sync:list-tabs',
  }) as { ok: boolean, tabs: GoogleDocsTabSummary[] }

  openDocsTabs.value = response.tabs

  if (selectedDocsTabId.value && openDocsTabs.value.some(tab => tab.tabId === selectedDocsTabId.value))
    return

  const boundTabId = docsStatus.value?.resolvedTabId ?? store.docsSync.binding?.tabId ?? null
  selectedDocsTabId.value = openDocsTabs.value.find(tab => tab.tabId === boundTabId)?.tabId ?? openDocsTabs.value[0]?.tabId ?? null
}

async function refreshGoogleDocsStatus() {
  const response = await browser.runtime.sendMessage({
    type: 'gdocs-sync:get-status',
  }) as { ok: boolean, status: GoogleDocsSyncStatus }

  docsStatus.value = response.status
}

async function bindSelectedGoogleDoc() {
  const tabId = Number(selectedDocsTabId.value)
  if (!Number.isFinite(tabId))
    return

  docsBusy.value = true
  docsError.value = null

  try {
    const response = await browser.runtime.sendMessage({
      type: 'gdocs-sync:bind-tab',
      payload: { tabId },
    }) as { ok: boolean, error?: string, status?: GoogleDocsSyncStatus }

    if (!response.ok) {
      docsError.value = response.error ?? 'Google Docs を接続できませんでした。'
      return
    }

    await store.updateDocsSync({
      enabled: true,
      binding: response.status?.binding ?? store.docsSync.binding,
    })
    docsStatus.value = response.status ?? null
  }
  finally {
    docsBusy.value = false
  }
}

async function unbindGoogleDoc() {
  docsBusy.value = true
  docsError.value = null

  try {
    await browser.runtime.sendMessage({ type: 'gdocs-sync:unbind' })
    await store.updateDocsSync({ enabled: false, binding: null })
    await refreshGoogleDocsStatus()
  }
  finally {
    docsBusy.value = false
  }
}

async function toggleGoogleDocsSync(enabled: boolean) {
  await store.updateDocsSync({ enabled })
  await refreshGoogleDocsStatus()
}

const docsStatusLabel = computed(() => {
  if (!store.docsSync.enabled)
    return 'オフ'
  if (!docsStatus.value)
    return '確認中'
  if (docsStatus.value.state === 'ready')
    return '同期中'
  if (docsStatus.value.state === 'stale')
    return '再接続が必要'
  return '未設定'
})

const setupHeadline = computed(() => {
  if (completedSetupSteps.value === totalSetupSteps)
    return '準備完了'
  if (completedSetupSteps.value === 0)
    return '初期設定が必要です'
  return 'あと少しで完了です'
})

const setupMessage = computed(() => {
  if (completedSetupSteps.value === totalSetupSteps)
    return 'Google Meet で字幕を AI が整理し、選んだ Google Docs に自動で反映できます。'
  if (!aiReady.value)
    return 'まずは AI 会議メモの準備を完了してください。'
  return '最後に同期先の Google Docs を選ぶと、会議メモを自動反映できます。'
})
</script>

<template>
  <main v-if="!store.loading" class="options">
    <header class="hero">
      <div class="hero__copy">
        <p class="hero__eyebrow">
          Caption Highlighter
        </p>
        <h1>{{ setupHeadline }}</h1>
        <p class="hero__text">
          {{ setupMessage }}
        </p>
      </div>

      <div class="hero__status">
        <div class="hero__status-label">
          セットアップ進捗
        </div>
        <div class="hero__status-value">
          {{ completedSetupSteps }} / {{ totalSetupSteps }}
        </div>
        <div class="hero__status-bar">
          <span :style="{ width: `${(completedSetupSteps / totalSetupSteps) * 100}%` }" />
        </div>
      </div>
    </header>

    <section class="summary-grid">
      <article class="summary-card">
        <span class="summary-card__label">AI 会議メモ</span>
        <strong class="summary-card__value">{{ aiReady ? '使えます' : '準備が必要です' }}</strong>
        <span class="summary-card__meta">{{ aiCompletedSteps }} / 3 完了</span>
      </article>

      <article class="summary-card">
        <span class="summary-card__label">Google Docs 同期</span>
        <strong class="summary-card__value">{{ docsStatusLabel }}</strong>
        <span class="summary-card__meta">{{ docsTargetLabel }}</span>
      </article>

      <article class="summary-card">
        <span class="summary-card__label">辞書</span>
        <strong class="summary-card__value">{{ store.filteredEntries.length }} 件</strong>
        <span class="summary-card__meta">Meet の字幕で強調表示</span>
      </article>
    </section>

    <section class="setup-card">
      <header class="setup-card__header">
        <div>
          <p class="setup-card__step">
            STEP 1
          </p>
          <h2>AI 会議メモを使えるようにする</h2>
          <p class="setup-card__text">
            字幕を Google AI に送り、会議メモを自動で整理します。会話内容はこの機能のためにクラウドへ送信されます。
          </p>
        </div>
        <span class="status-pill" :class="{ 'status-pill--ok': aiReady }">
          {{ aiReady ? '準備完了' : '未完了' }}
        </span>
      </header>

      <div class="setup-grid">
        <label class="field-card field-card--wide">
          <span class="field-card__label">1. Google AI Studio key</span>
          <span class="field-card__help">Google AI Studio で作成した key を保存してください。</span>
          <div class="field-row">
            <input v-model="apiKey" type="password" placeholder="AIza..." autocomplete="off">
            <button class="button" type="button" :disabled="savingKey" @click="persistApiKey">
              {{ savingKey ? '保存中...' : '保存する' }}
            </button>
          </div>
        </label>

        <div class="field-card field-card--wide">
          <span class="field-card__label">2. 字幕の送信に同意する</span>
          <label class="check-row">
            <input
              type="checkbox"
              :checked="store.ai.allowSendCaptionsToCloud"
              @change="store.updateAi({ allowSendCaptionsToCloud: ($event.target as HTMLInputElement).checked })"
            >
            Google Meet の字幕を Google AI に送って会議メモを作ることに同意します
          </label>
        </div>

        <div class="field-card field-card--wide">
          <span class="field-card__label">3. ブラウザの接続許可</span>
          <span class="field-card__help">拡張機能が Google AI にアクセスできるようにします。</span>
          <div class="field-row">
            <button class="button button--secondary" type="button" @click="requestPermission">
              許可する
            </button>
            <button class="button button--ghost" type="button" @click="refreshPermission">
              状態を更新
            </button>
            <span class="status-chip" :class="{ 'status-chip--ok': aiPermissionGranted, 'status-chip--warn': permGranted === false }">
              {{ permGranted === null ? '確認中' : (aiPermissionGranted ? '許可済み' : '未許可') }}
            </span>
          </div>
        </div>

        <div class="field-card field-card--wide">
          <span class="field-card__label">接続チェック</span>
          <span class="field-card__help">上の 3 つが完了したら、実際に接続できるか確認します。</span>
          <div class="field-row">
            <button class="button" type="button" :disabled="!canTestAi" @click="testAiConnection">
              接続を確認する
            </button>
            <span v-if="aiTestResult" class="feedback feedback--ok">接続できました</span>
            <span v-if="aiTestError" class="feedback feedback--warn">{{ aiTestError }}</span>
          </div>
          <pre v-if="aiTestResult" class="result-preview">{{ aiTestResult }}</pre>
        </div>
      </div>

      <ul class="checklist">
        <li v-for="item in aiChecklist" :key="item.label" :class="{ 'is-done': item.done }">
          <span>{{ item.done ? '完了' : '未完了' }}</span>
          <span>{{ item.label }}</span>
        </li>
      </ul>
    </section>

    <section class="setup-card">
      <header class="setup-card__header">
        <div>
          <p class="setup-card__step">
            STEP 2
          </p>
          <h2>会議メモの保存先を選ぶ</h2>
          <p class="setup-card__text">
            先に Google Docs をブラウザで開いてから、ここで同期先を選びます。Meet 画面側の Docs 選択 UI はそのまま使えます。
          </p>
        </div>
        <span class="status-pill" :class="{ 'status-pill--ok': docsConnected, 'status-pill--warn': docsNeedsAttention }">
          {{ docsStatusLabel }}
        </span>
      </header>

      <div class="setup-grid">
        <div class="field-card field-card--wide">
          <span class="field-card__label">同期をオンにする</span>
          <label class="check-row">
            <input
              type="checkbox"
              :checked="store.docsSync.enabled"
              @change="toggleGoogleDocsSync(($event.target as HTMLInputElement).checked)"
            >
            選んだ Google Docs に会議メモを自動で反映する
          </label>
        </div>

        <div class="field-card field-card--wide">
          <span class="field-card__label">今の状態</span>
          <div class="field-row">
            <span class="status-chip" :class="{ 'status-chip--ok': docsConnected, 'status-chip--warn': docsNeedsAttention }">
              {{ docsStatusLabel }}
            </span>
            <button class="button button--ghost" type="button" @click="refreshGoogleDocsStatus">
              状態を更新
            </button>
          </div>
          <p v-if="docsStatus?.binding" class="field-note">
            接続先: {{ docsStatus.binding.title }} / {{ docsStatus.binding.documentId }}
          </p>
          <p v-if="docsStatus?.lastError" class="feedback feedback--warn">
            {{ docsStatus.lastError }}
          </p>
        </div>

        <label class="field-card field-card--wide">
          <span class="field-card__label">Google Docs を選ぶ</span>
          <span class="field-card__help">開いている Google Docs だけ表示されます。</span>
          <div class="field-row field-row--stretch">
            <select v-model="selectedDocsTabId">
              <option :value="null">選択してください</option>
              <option v-for="tab in openDocsTabs" :key="tab.tabId" :value="tab.tabId">
                {{ tab.title }}{{ tab.active ? ' (active)' : '' }}
              </option>
            </select>
            <button class="button button--ghost" type="button" @click="refreshGoogleDocsTabs">
              一覧を更新
            </button>
            <button class="button" type="button" :disabled="docsBusy || !selectedDocsTabId" @click="bindSelectedGoogleDoc">
              {{ docsBusy ? '処理中...' : 'この Docs を使う' }}
            </button>
            <button class="button button--secondary" type="button" :disabled="docsBusy || !store.docsSync.binding" @click="unbindGoogleDoc">
              解除
            </button>
          </div>
          <p v-if="!openDocsTabs.length" class="field-note">
            開いている Google Docs が見つかりません。Google Docs を 1 つ開いてから一覧を更新してください。
          </p>
          <p v-if="docsError" class="feedback feedback--warn">
            {{ docsError }}
          </p>
        </label>
      </div>
    </section>

    <section class="setup-card">
      <header class="setup-card__header">
        <div>
          <p class="setup-card__step">
            辞書
          </p>
          <h2>字幕で強調したい言葉を管理する</h2>
          <p class="setup-card__text">
            用語と説明を登録すると、Google Meet の字幕でその言葉を見つけたときに強調表示します。
          </p>
        </div>
        <div class="field-row">
          <button class="button" type="button" @click="triggerFile">
            CSV を読み込む
          </button>
          <button class="button button--secondary" type="button" @click="handleReset">
            辞書をすべて削除
          </button>
        </div>
        <input ref="fileInput" class="sr-only" type="file" accept="text/csv" @change="handleFileSelected">
      </header>

      <div class="dictionary-toolbar">
        <label class="search-field">
          <span>検索</span>
          <input v-model="filter" type="search" placeholder="用語または説明">
        </label>
        <span class="dictionary-count">{{ store.filteredEntries.length }} 件</span>
      </div>

      <DictionaryTable :entries="store.filteredEntries" @remove="store.removeEntry" />
      <ImportPreview
        v-if="hasPreview"
        v-model:term="selection.term"
        v-model:definition="selection.definition"
        v-model:alias="selection.alias"
        :headers="headers"
        :rows="csvRows"
        :stats="stats"
        :error="importError"
        @confirm="confirmImport"
        @cancel="clearPreview"
      />
      <p v-else-if="importError" class="feedback feedback--warn">
        {{ importError }}
      </p>
    </section>
  </main>
  <div v-else class="loading">
    設定を読込中...
  </div>
</template>

<style scoped>
.options {
  min-height: 100vh;
  padding: 32px;
  background:
    radial-gradient(circle at top left, rgba(255, 219, 167, 0.55), transparent 28%),
    radial-gradient(circle at top right, rgba(157, 230, 210, 0.35), transparent 30%),
    linear-gradient(180deg, #fffdf6 0%, #f4f8ff 100%);
  color: #1f2937;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.hero,
.setup-card,
.summary-card {
  border: 1px solid rgba(148, 163, 184, 0.24);
  box-shadow: 0 24px 60px rgba(15, 23, 42, 0.08);
}

.hero {
  display: flex;
  justify-content: space-between;
  gap: 20px;
  padding: 28px;
  border-radius: 28px;
  background: rgba(255, 255, 255, 0.84);
  backdrop-filter: blur(18px);
}

.hero__copy h1 {
  margin: 4px 0 10px;
  font-size: 34px;
  line-height: 1.1;
  letter-spacing: -0.03em;
}

.hero__eyebrow {
  margin: 0;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: #b45309;
}

.hero__text {
  margin: 0;
  max-width: 620px;
  color: #475569;
  font-size: 15px;
  line-height: 1.6;
}

.hero__status {
  min-width: 220px;
  padding: 18px;
  border-radius: 22px;
  background: linear-gradient(180deg, #1f2937 0%, #0f172a 100%);
  color: #f8fafc;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.hero__status-label {
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: #cbd5e1;
}

.hero__status-value {
  font-size: 28px;
  font-weight: 700;
}

.hero__status-bar {
  height: 10px;
  border-radius: 999px;
  background: rgba(148, 163, 184, 0.22);
  overflow: hidden;
}

.hero__status-bar span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #f59e0b 0%, #34d399 100%);
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 16px;
}

.summary-card {
  border-radius: 22px;
  padding: 20px;
  background: rgba(255, 255, 255, 0.88);
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.summary-card__label {
  font-size: 13px;
  color: #64748b;
}

.summary-card__value {
  font-size: 22px;
  line-height: 1.2;
}

.summary-card__meta {
  color: #475569;
  font-size: 13px;
}

.setup-card {
  border-radius: 28px;
  padding: 24px;
  background: rgba(255, 255, 255, 0.88);
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.setup-card__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}

.setup-card__step {
  margin: 0 0 6px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: #0f766e;
}

.setup-card__header h2 {
  margin: 0;
  font-size: 24px;
}

.setup-card__text {
  margin: 8px 0 0;
  max-width: 760px;
  color: #475569;
  line-height: 1.6;
}

.setup-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 16px;
}

.field-card {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 18px;
  border-radius: 20px;
  background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
  border: 1px solid rgba(148, 163, 184, 0.2);
}

.field-card--wide {
  grid-column: 1 / -1;
}

.field-card__label {
  font-weight: 700;
}

.field-card__help,
.field-note {
  margin: 0;
  color: #64748b;
  font-size: 13px;
  line-height: 1.5;
}

.field-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
}

.field-row--stretch select {
  min-width: 280px;
  flex: 1 1 320px;
}

.check-row {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  line-height: 1.5;
}

.checklist {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 10px;
}

.checklist li {
  display: grid;
  grid-template-columns: 72px 1fr;
  gap: 12px;
  padding: 12px 14px;
  border-radius: 16px;
  background: #f8fafc;
  color: #475569;
}

.checklist li.is-done {
  background: #ecfdf5;
  color: #166534;
}

.status-pill,
.status-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
}

.status-pill {
  min-height: 38px;
  padding: 0 14px;
  background: #fff7ed;
  color: #9a3412;
}

.status-pill--ok {
  background: #ecfdf5;
  color: #166534;
}

.status-pill--warn {
  background: #fff7ed;
  color: #9a3412;
}

.status-chip {
  min-height: 30px;
  padding: 0 10px;
  background: #e2e8f0;
  color: #475569;
}

.status-chip--ok {
  background: #dcfce7;
  color: #166534;
}

.status-chip--warn {
  background: #ffedd5;
  color: #9a3412;
}

.feedback {
  margin: 0;
  font-size: 13px;
}

.feedback--ok {
  color: #166534;
}

.feedback--warn {
  color: #b45309;
}

.result-preview {
  margin: 0;
  padding: 12px 14px;
  border-radius: 14px;
  background: #0f172a;
  color: #e2e8f0;
  font-size: 12px;
  overflow: auto;
}

.dictionary-toolbar {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}

.search-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.dictionary-count {
  color: #64748b;
  font-size: 14px;
}

input[type="search"],
input[type="password"],
select {
  min-height: 44px;
  padding: 0 14px;
  border-radius: 14px;
  border: 1px solid rgba(148, 163, 184, 0.35);
  background: #fff;
  color: inherit;
}

input:focus,
select:focus {
  outline: 2px solid rgba(14, 165, 233, 0.24);
  outline-offset: 2px;
  border-color: #38bdf8;
}

.button {
  min-height: 42px;
  padding: 0 16px;
  border-radius: 14px;
  border: none;
  background: linear-gradient(135deg, #f59e0b 0%, #f97316 100%);
  color: #fff;
  font-weight: 700;
  cursor: pointer;
}

.button:disabled {
  opacity: 0.6;
  cursor: default;
}

.button--secondary {
  background: #fff;
  color: #334155;
  border: 1px solid rgba(148, 163, 184, 0.4);
}

.button--ghost {
  background: #eef2ff;
  color: #1e3a8a;
}

.loading {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fffdf6;
  color: #334155;
  font-size: 18px;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  border: 0;
}

@media (max-width: 900px) {
  .options {
    padding: 18px;
  }

  .hero {
    flex-direction: column;
  }

  .hero__status {
    min-width: 0;
  }

  .setup-card {
    padding: 18px;
  }
}
</style>
