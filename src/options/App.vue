<template>
  <main class="options" v-if="!store.loading">
    <header class="options__header">
      <div>
        <h1>Caption Highlighter</h1>
        <p class="options__subtitle">Google Meet の字幕をリアルタイムにハイライトします。</p>
      </div>
      <button class="button button--secondary" type="button" @click="handleReset">辞書をすべて削除</button>
    </header>

    <section class="panel">
      <header class="panel__header">
        <div>
          <h2>辞書</h2>
          <p class="panel__subtitle">用語と説明を管理します。CSV からの取り込みに対応しています。</p>
        </div>
        <button class="button" type="button" @click="triggerFile">CSV をインポート</button>
        <input ref="fileInput" class="sr-only" type="file" accept="text/csv" @change="handleFileSelected">
      </header>

      <div class="dictionary__toolbar">
        <label class="dictionary__search">
          <span>検索</span>
          <input type="search" placeholder="用語または説明" v-model="filter">
        </label>
        <span class="dictionary__count">{{ store.filteredEntries.length }} 件</span>
      </div>

      <DictionaryTable :entries="store.filteredEntries" @remove="store.removeEntry" />
      <ImportPreview
        v-if="hasPreview"
        :headers="headers"
        :rows="csvRows"
        v-model:term="selection.term"
        v-model:definition="selection.definition"
        :stats="stats"
        :error="importError"
        @confirm="confirmImport"
        @cancel="clearPreview"
      />
      <p v-else-if="importError" class="import-error">{{ importError }}</p>
    </section>

    <section class="panel">
      <h2>マッチング設定</h2>
      <MatchingSettingsForm :value="store.matching" @change="store.updateMatching" />
    </section>

    <section class="panel">
      <h2>テーマ</h2>
      <ThemeSettingsForm :value="store.theme" @change="store.updateTheme" />
    </section>
  </main>
  <div v-else class="loading">設定を読込中...</div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import DictionaryTable from './components/DictionaryTable.vue'
import ImportPreview from './components/ImportPreview.vue'
import MatchingSettingsForm from './components/MatchingSettingsForm.vue'
import ThemeSettingsForm from './components/ThemeSettingsForm.vue'
import { useSettingsStore } from './stores/settings'
import type { DictionaryImportStats } from '~/shared/utils/csv'
import { parseCsv, buildDictionaryFromCsv } from '~/shared/utils/csv'

const store = useSettingsStore()
const fileInput = ref<HTMLInputElement | null>(null)
const filter = computed({
  get: () => store.filter,
  set: value => store.setFilter(value),
})

const headers = ref<string[]>([])
const csvRows = ref<Record<string, string>[]>([])
const selection = reactive({
  term: '',
  definition: '',
})
const stats = ref<DictionaryImportStats | null>(null)
const importError = ref<string | null>(null)

const hasPreview = computed(() => headers.value.length > 0 && csvRows.value.length > 0)

watch(() => [selection.term, selection.definition], () => {
  importError.value = null
  stats.value = null
})

onMounted(() => {
  store.initialize()
})

function triggerFile() {
  fileInput.value?.click()
}

function resetSelection() {
  selection.term = headers.value[0] ?? ''
  selection.definition = headers.value[1] ?? ''
}

function clearPreview() {
  headers.value = []
  csvRows.value = []
  stats.value = null
  importError.value = null
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

async function confirmImport(columns: { term: string; definition: string }) {
  if (!csvRows.value.length)
    return

  importError.value = null

  const { entries, stats: importStats } = buildDictionaryFromCsv(csvRows.value, columns.term, columns.definition)

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
  if (window.confirm('辞書をすべて削除しますか？'))
    await store.clearDictionary()
}
</script>

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
