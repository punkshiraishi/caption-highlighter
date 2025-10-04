import type { Meta, StoryObj } from '@storybook/vue3'
import DictionaryTable from './DictionaryTable.vue'
import type { DictionaryEntry } from '~/shared/models/dictionary'

const sampleEntries: DictionaryEntry[] = [
  {
    id: '1',
    term: 'SLO',
    definition: 'Service Level Objective',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: '2',
    term: 'Error Budget',
    definition: 'Allowed downtime derived from SLO target',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
]

const meta: Meta<typeof DictionaryTable> = {
  title: 'Options/DictionaryTable',
  component: DictionaryTable,
  args: {
    entries: sampleEntries,
  },
  argTypes: {
    remove: { action: 'remove' },
  },
}

export default meta

type Story = StoryObj<typeof DictionaryTable>

export const Default: Story = {}

export const Empty: Story = {
  args: {
    entries: [],
  },
}
