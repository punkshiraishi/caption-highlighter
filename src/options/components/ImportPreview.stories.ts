import type { Meta, StoryObj } from '@storybook/vue3'
import ImportPreview from './ImportPreview.vue'

const headers = ['term', 'definition', 'notes']
const rows = [
  { term: 'SLA', definition: 'Service Level Agreement', notes: 'external' },
  { term: 'MTTR', definition: 'Mean Time To Recovery', notes: 'operations' },
]

const meta: Meta<typeof ImportPreview> = {
  title: 'Options/ImportPreview',
  component: ImportPreview,
  args: {
    headers,
    rows,
    stats: null,
    error: null,
    term: 'term',
    definition: 'definition',
  },
  argTypes: {
    confirm: { action: 'confirm' },
    cancel: { action: 'cancel' },
  },
  render: args => ({
    components: { ImportPreview },
    setup() {
      return { args }
    },
    template: '<ImportPreview v-bind="args" v-model:term="args.term" v-model:definition="args.definition" />',
  }),
}

export default meta

type Story = StoryObj<typeof ImportPreview>

export const Default: Story = {}

export const WithError: Story = {
  args: {
    error: '列の選択を確認してください。',
  },
}

export const WithStats: Story = {
  args: {
    stats: {
      added: 12,
      skipped: 3,
    },
  },
}
