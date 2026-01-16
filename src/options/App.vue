<script setup lang="ts">
import browser from 'webextension-polyfill'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import DictionaryTable from './components/DictionaryTable.vue'
import ImportPreview from './components/ImportPreview.vue'
import { useSettingsStore } from './stores/settings'
import type { DictionaryImportStats } from '~/shared/utils/csv'
import { buildDictionaryFromCsv, parseCsv } from '~/shared/utils/csv'
import { loadSecrets, saveSecrets } from '~/shared/storage/secrets'
import { GEMINI_FLASH_FIXED_MODEL } from '~/shared/ai/gemini'

const store = useSettingsStore()
const fileInput = ref<HTMLInputElement | null>(null)
const filter = computed({
  get: () => store.filter,
  set: value => store.setFilter(value),
})

const apiKey = ref('')
const permGranted = ref<boolean | null>(null)
const flashTestResult = ref<string | null>(null)
const flashTestError = ref<string | null>(null)
const savingKey = ref(false)

const flashOrigins = ['https://generativelanguage.googleapis.com/*']
const isFlash = computed(() => store.ai.whiteboardProvider === 'flash')

const headers = ref<string[]>([])
const csvRows = ref<Record<string, string>[]>([])
const selection = reactive({
  term: '',
  definition: '',
  alias: '',
})
const stats = ref<DictionaryImportStats | null>(null)
const importError = ref<string | null>(null)

const hasPreview = computed(() => headers.value.length > 0 && csvRows.value.length > 0)

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
}

async function refreshPermission() {
  permGranted.value = await browser.permissions.contains({ origins: flashOrigins })
}

async function requestPermission() {
  flashTestResult.value = null
  flashTestError.value = null
  const ok = await browser.permissions.request({ origins: flashOrigins })
  permGranted.value = ok
}

async function persistApiKey() {
  savingKey.value = true
  flashTestResult.value = null
  flashTestError.value = null
  try {
    await saveSecrets({ geminiApiKey: apiKey.value })
  }
  finally {
    savingKey.value = false
  }
}

async function testFlash() {
  flashTestResult.value = null
  flashTestError.value = null
  try {
    const resp = await browser.runtime.sendMessage({
      type: 'ai:flash:test',
      payload: { model: store.ai.flashModel },
    }) as { ok: boolean, text?: string, error?: string }

    if (!resp.ok) {
      flashTestError.value = resp.error || '接続テストに失敗しました'
      return
    }
    flashTestResult.value = resp.text || '(ok)'
  }
  catch (error) {
    flashTestError.value = error instanceof Error ? error.message : String(error)
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
</script>

<template>
  <main v-if="!store.loading" class="options">
    <header class="options__header">
      <div>
        <h1>Caption Highlighter</h1>
        <p class="options__subtitle">
          Google Meet の字幕をリアルタイムにハイライトします。
        </p>
      </div>
      <button class="button button--secondary" type="button" @click="handleReset">
        辞書をすべて削除
      </button>
    </header>

    <section class="panel">
      <header class="panel__header">
        <div>
          <h2>辞書</h2>
          <p class="panel__subtitle">
            用語と説明を管理します。CSV からの取り込みに対応しています。
          </p>
        </div>
        <button class="button" type="button" @click="triggerFile">
          CSV をインポート
        </button>
        <input ref="fileInput" class="sr-only" type="file" accept="text/csv" @change="handleFileSelected">
      </header>

      <div class="dictionary__toolbar">
        <label class="dictionary__search">
          <span>検索</span>
          <input v-model="filter" type="search" placeholder="用語または説明">
        </label>
        <span class="dictionary__count">{{ store.filteredEntries.length }} 件</span>
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
      <p v-else-if="importError" class="import-error">
        {{ importError }}
      </p>
    </section>

    <section class="panel">
      <header class="panel__header">
        <div>
          <h2>ホワイトボード要約</h2>
          <p class="panel__subtitle">
            会議メモを自動で構造化します。Flash は beta（外部送信あり・既定OFF）です。
          </p>
        </div>
      </header>

      <div class="ai-grid">
        <label class="ai-field">
          <span>要約エンジン</span>
          <select
            :value="store.ai.whiteboardProvider"
            @change="store.setWhiteboardProvider(($event.target as HTMLSelectElement).value as any)"
          >
            <option value="nano">Gemini Nano（ローカル）</option>
            <option value="flash">Gemini Flash（クラウド / beta）</option>
          </select>
        </label>

        <div v-if="isFlash" class="ai-field">
          <span>Flash model（固定）</span>
          <div class="ai-row">
            <span class="ai-pill ai-pill--ok">{{ GEMINI_FLASH_FIXED_MODEL }}</span>
          </div>
          <span class="ai-help">ホワイトボード要約の Flash はモデルを固定しています（テストページでは任意選択できます）。</span>
        </div>

        <label v-if="isFlash" class="ai-field ai-field--wide">
          <span>AI Studio API Key（Secrets）</span>
          <div class="ai-row">
            <input v-model="apiKey" type="password" placeholder="AIza..." autocomplete="off">
            <button class="button" type="button" :disabled="savingKey" @click="persistApiKey">
              {{ savingKey ? '保存中...' : '保存' }}
            </button>
          </div>
          <span class="ai-help">API Key は拡張の local storage に保存されます（Meetページには表示しません）。</span>
        </label>

        <label v-if="isFlash" class="ai-field ai-field--wide">
          <span>外部送信の同意（必須）</span>
          <label class="ai-check">
            <input
              type="checkbox"
              :checked="store.ai.allowSendCaptionsToCloud"
              @change="store.updateAi({ allowSendCaptionsToCloud: ($event.target as HTMLInputElement).checked })"
            >
            字幕テキストを Gemini Flash（外部API）へ送信することに同意します（beta）
          </label>
        </label>

        <div v-if="isFlash" class="ai-field ai-field--wide">
          <span>権限</span>
          <div class="ai-row">
            <button class="button button--secondary" type="button" @click="requestPermission">
              権限を許可
            </button>
            <button class="button button--secondary" type="button" @click="refreshPermission">
              状態を更新
            </button>
            <span class="ai-pill" :class="{ 'ai-pill--ok': permGranted, 'ai-pill--ng': permGranted === false }">
              {{ permGranted === null ? '不明' : (permGranted ? '許可済み' : '未許可') }}
            </span>
          </div>
          <span class="ai-help">Flash 利用には `generativelanguage.googleapis.com` へのアクセス権限が必要です。</span>
        </div>

        <div v-if="isFlash" class="ai-field ai-field--wide">
          <span>接続テスト</span>
          <div class="ai-row">
            <button class="button" type="button" @click="testFlash">
              接続テスト
            </button>
            <span v-if="flashTestResult" class="ai-ok">OK</span>
            <span v-if="flashTestError" class="ai-ng">{{ flashTestError }}</span>
          </div>
          <pre v-if="flashTestResult" class="ai-preview">{{ flashTestResult }}</pre>
        </div>
      </div>
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
  background: #0f172a;
  color: #f8fafc;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.options__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.options__subtitle {
  margin: 4px 0 0;
  color: #cbd5f5;
}

.panel {
  background: #111c38;
  border-radius: 16px;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  box-shadow: 0 20px 30px rgba(11, 24, 56, 0.4);
}

.panel__header {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  align-items: center;
  justify-content: space-between;
}

.panel__subtitle {
  margin: 6px 0 0;
  color: #94a3b8;
}

.ai-grid {
  display: grid;
  gap: 16px;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
}

.ai-field {
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-size: 14px;
  color: #cbd5f5;
}

.ai-field > span {
  color: #cbd5f5;
}

.ai-field--wide {
  grid-column: 1 / -1;
}

.ai-row {
  display: flex;
  gap: 10px;
  align-items: center;
  flex-wrap: wrap;
}

.ai-help {
  font-size: 12px;
  color: #94a3b8;
}

.ai-check {
  display: flex;
  gap: 10px;
  align-items: center;
  color: #e2e8f0;
}

.ai-pill {
  font-size: 12px;
  padding: 4px 10px;
  border-radius: 999px;
  border: 1px solid rgba(148, 163, 184, 0.35);
  color: #94a3b8;
}

.ai-pill--ok {
  border-color: rgba(34, 197, 94, 0.4);
  color: #86efac;
}

.ai-pill--ng {
  border-color: rgba(249, 115, 22, 0.4);
  color: #fdba74;
}

.ai-ok {
  color: #86efac;
  font-size: 13px;
}

.ai-ng {
  color: #fdba74;
  font-size: 13px;
}

.ai-preview {
  margin-top: 10px;
  background: rgba(15, 23, 42, 0.65);
  border: 1px solid rgba(148, 163, 184, 0.3);
  border-radius: 8px;
  padding: 10px 12px;
  color: #e2e8f0;
  font-size: 12px;
}

.ai-grid select,
.ai-grid input[type="text"],
.ai-grid input[type="password"] {
  background: rgba(15, 23, 42, 0.65);
  border: 1px solid rgba(148, 163, 184, 0.3);
  border-radius: 8px;
  padding: 8px 12px;
  color: inherit;
}

.button {
  background: #38bdf8;
  color: #0f172a;
  border: none;
  border-radius: 8px;
  padding: 10px 16px;
  font-weight: 600;
  cursor: pointer;
  transition: background 120ms ease-in-out;
}

.button:hover {
  background: #22d3ee;
}

.button--secondary {
  background: transparent;
  color: #e2e8f0;
  border: 1px solid rgba(226, 232, 240, 0.4);
}

.dictionary__toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.dictionary__search {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 14px;
  color: #cbd5f5;
}

.dictionary__search input {
  background: rgba(15, 23, 42, 0.65);
  border: 1px solid rgba(148, 163, 184, 0.3);
  border-radius: 8px;
  padding: 8px 12px;
  color: inherit;
}

.dictionary__search input:focus {
  outline: 2px solid #38bdf8;
  outline-offset: 2px;
}

.dictionary__count {
  font-size: 14px;
  color: #94a3b8;
}

.import-error {
  margin-top: 12px;
  color: #f97316;
}

.loading {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #0f172a;
  color: #f8fafc;
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
</style>
