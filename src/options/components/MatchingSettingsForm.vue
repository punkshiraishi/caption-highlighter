<script setup lang="ts">
import { reactive, watch } from 'vue'
import type { MatchingSettings } from '~/shared/models/settings'

const props = defineProps<{ value: MatchingSettings }>()
const emit = defineEmits<{ (event: 'change', value: Partial<MatchingSettings>): void }>()

const local = reactive({ ...props.value })

watch(() => props.value, (value) => {
  Object.assign(local, value)
})

function update<K extends keyof MatchingSettings>(key: K, value: MatchingSettings[K]) {
  if (local[key] === value)
    return
  local[key] = value
  emit('change', { [key]: value })
}

function updateNumber<K extends keyof MatchingSettings>(key: K, event: Event) {
  const target = event.target as HTMLInputElement
  const value = Number.parseInt(target.value, 10)
  if (Number.isNaN(value))
    return
  update(key, value as MatchingSettings[K])
}
</script>

<template>
  <form class="matching" @submit.prevent>
    <label>
      マッチ方法
      <select :value="local.mode" @change="update('mode', ($event.target as HTMLSelectElement).value as MatchingSettings['mode'])">
        <option value="partial">部分一致（デフォルト）</option>
        <option value="exact">完全一致（単語単位）</option>
        <option value="regex">正規表現</option>
      </select>
    </label>

    <label class="inline">
      <input type="checkbox" :checked="local.caseSensitive" @change="update('caseSensitive', ($event.target as HTMLInputElement).checked)">
      大文字・小文字を区別する
    </label>

    <label>
      ハイライト遅延 (ms)
      <input type="number" min="0" max="1000" :value="local.debounceMs" @change="updateNumber('debounceMs', $event)">
    </label>

    <label>
      1 ノードあたりの最大ハイライト数
      <input type="number" min="1" max="100" :value="local.maxHighlightsPerNode" @change="updateNumber('maxHighlightsPerNode', $event)">
    </label>
  </form>
</template>

<style scoped>
.matching {
  display: grid;
  gap: 16px;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
}

label {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 14px;
}

select,
input[type="number"] {
  background: rgba(15, 23, 42, 0.6);
  color: #f8fafc;
  border: 1px solid rgba(148, 163, 184, 0.4);
  border-radius: 8px;
  padding: 8px 12px;
}

.inline {
  flex-direction: row;
  align-items: center;
  gap: 10px;
}

input[type="checkbox"] {
  width: 18px;
  height: 18px;
}
</style>
