<template>
  <form class="theme" @submit.prevent>
    <div class="theme__row" v-for="field in fields" :key="field.key">
      <label>
        {{ field.label }}
        <input type="color" :value="local[field.key]" @input="onColorChange(field.key, $event)">
      </label>
      <span class="theme__value">{{ local[field.key] }}</span>
    </div>
  </form>
</template>

<script setup lang="ts">
import { reactive, watch } from 'vue'
import type { ThemeSettings } from '~/shared/models/settings'

const props = defineProps<{ value: ThemeSettings }>()
const emit = defineEmits<{ (event: 'change', value: Partial<ThemeSettings>): void }>()

const local = reactive({ ...props.value })

watch(() => props.value, (value) => {
  Object.assign(local, value)
})

const fields = [
  { key: 'highlightBg', label: 'ハイライト背景' },
  { key: 'highlightText', label: 'ハイライト文字色' },
  { key: 'highlightBorder', label: 'ハイライト枠線' },
  { key: 'popupBg', label: 'ポップアップ背景' },
  { key: 'popupText', label: 'ポップアップ文字色' },
] as const

type ThemeKey = keyof ThemeSettings

function onColorChange(key: ThemeKey, event: Event) {
  const value = (event.target as HTMLInputElement).value
  if (local[key] === value)
    return
  local[key] = value
  emit('change', { [key]: value })
}
</script>

<style scoped>
.theme {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.theme__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  background: rgba(15, 23, 42, 0.6);
  padding: 12px 16px;
  border-radius: 12px;
}

label {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 14px;
}

input[type="color"] {
  width: 48px;
  height: 32px;
  border: none;
  border-radius: 6px;
  background: none;
  cursor: pointer;
}

.theme__value {
  font-family: monospace;
  color: #cbd5f5;
}
</style>
