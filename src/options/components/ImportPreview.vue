<script setup lang="ts">
import { computed } from 'vue'
import type { CsvPreviewRow, DictionaryImportStats } from '~/shared/utils/csv'

type Row = Record<string, string>

const props = defineProps<{
  headers: string[]
  rows: Row[]
  stats: DictionaryImportStats | null
  error: string | null
}>()

const emit = defineEmits<{ (event: 'confirm', payload: { term: string, definition: string, alias: string | null }): void, (event: 'cancel'): void }>()

const termModel = defineModel<string>('term', { required: true })
const definitionModel = defineModel<string>('definition', { required: true })
const aliasModel = defineModel<string>('alias', { default: '' })

const previewRows = computed<CsvPreviewRow[]>(() => {
  return Array.from({ length: Math.min(5, props.rows.length) }, (_, index) => {
    const row = props.rows[index]
    if (!row)
      return {}
    const preview: CsvPreviewRow = {}
    for (const header of props.headers)
      preview[header] = row[header] ?? ''
    return preview
  })
})

const canImport = computed(() => Boolean(termModel.value && definitionModel.value))

function handleConfirm() {
  if (!canImport.value)
    return
  emit('confirm', { term: termModel.value, definition: definitionModel.value, alias: aliasModel.value || null })
}
</script>

<template>
  <div class="import-preview">
    <h3>CSV プレビュー</h3>

    <div class="import-preview__controls">
      <label>
        用語列
        <select v-model="termModel">
          <option v-for="header in headers" :key="header" :value="header">{{ header }}</option>
        </select>
      </label>
      <label>
        エイリアス列 (任意)
        <select v-model="aliasModel">
          <option value="">選択なし</option>
          <option v-for="header in headers" :key="header" :value="header">{{ header }}</option>
        </select>
      </label>
      <label>
        説明列
        <select v-model="definitionModel">
          <option v-for="header in headers" :key="header" :value="header">{{ header }}</option>
        </select>
      </label>
    </div>

    <table>
      <thead>
        <tr>
          <th v-for="header in headers" :key="header">
            {{ header }}
          </th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(row, index) in previewRows" :key="index">
          <td v-for="header in headers" :key="header">
            {{ row[header] }}
          </td>
        </tr>
      </tbody>
    </table>

    <p v-if="error" class="import-preview__error">
      {{ error }}
    </p>
    <p v-else-if="stats" class="import-preview__stats">
      {{ stats.added }} 件を追加、{{ stats.skipped }} 行をスキップします。
    </p>

    <div class="import-preview__actions">
      <button class="button" type="button" :disabled="!canImport" @click="handleConfirm">
        読み込む
      </button>
      <button class="button button--secondary" type="button" @click="$emit('cancel')">
        キャンセル
      </button>
    </div>
  </div>
</template>

<style scoped>
.import-preview {
  background: rgba(15, 23, 42, 0.6);
  border-radius: 12px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.import-preview__controls {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
}

label {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 14px;
}

select {
  background: rgba(30, 41, 59, 0.8);
  border: 1px solid rgba(148, 163, 184, 0.3);
  color: #f8fafc;
  border-radius: 6px;
  padding: 6px 10px;
}

table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
  background: rgba(15, 23, 42, 0.4);
}

th,
td {
  border: 1px solid rgba(100, 116, 139, 0.4);
  padding: 8px;
  text-align: left;
}

td {
  white-space: pre-wrap;
}

.import-preview__actions {
  display: flex;
  gap: 12px;
}

.import-preview__error {
  color: #f97316;
}

.import-preview__stats {
  color: #38bdf8;
}
</style>
