<template>
  <div class="dictionary-table">
    <table>
      <thead>
        <tr>
          <th>用語</th>
          <th>説明</th>
          <th class="actions">操作</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="entry in entries" :key="entry.id">
          <td class="term">{{ entry.term }}</td>
          <td>{{ entry.definition }}</td>
          <td class="actions">
            <button type="button" class="link" @click="$emit('remove', entry.id)">削除</button>
          </td>
        </tr>
        <tr v-if="!entries.length">
          <td colspan="3" class="empty">登録された用語がありません。</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
import type { DictionaryEntry } from '~/shared/models/dictionary'

defineProps<{ entries: DictionaryEntry[] }>()

defineEmits<{ (event: 'remove', id: string): void }>()
</script>

<style scoped>
.dictionary-table {
  max-height: 360px;
  overflow: auto;
  border-radius: 12px;
  border: 1px solid rgba(148, 163, 184, 0.2);
}

th,
td {
  padding: 12px 16px;
  text-align: left;
  font-size: 14px;
  line-height: 1.5;
}

th {
  background: rgba(30, 41, 59, 0.6);
  position: sticky;
  top: 0;
  z-index: 1;
}

tr:nth-child(even) td {
  background: rgba(30, 41, 59, 0.3);
}

.term {
  font-weight: 600;
  color: #e0f2fe;
  width: 25%;
}

.actions {
  width: 80px;
  text-align: right;
}

.link {
  background: transparent;
  border: none;
  color: #f87171;
  cursor: pointer;
  font-weight: 600;
}

.link:hover {
  text-decoration: underline;
}

.empty {
  text-align: center;
  color: #94a3b8;
}
</style>
