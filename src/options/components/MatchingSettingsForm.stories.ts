import type { Meta, StoryObj } from '@storybook/vue3'
import MatchingSettingsForm from './MatchingSettingsForm.vue'
import { DEFAULT_MATCHING_SETTINGS } from '~/shared/models/settings'

const meta: Meta<typeof MatchingSettingsForm> = {
  title: 'Options/MatchingSettingsForm',
  component: MatchingSettingsForm,
  args: {
    value: { ...DEFAULT_MATCHING_SETTINGS },
  },
  argTypes: {
    change: { action: 'change' },
  },
}

export default meta

type Story = StoryObj<typeof MatchingSettingsForm>

export const Default: Story = {}

export const RegexMode: Story = {
  args: {
    value: {
      ...DEFAULT_MATCHING_SETTINGS,
      mode: 'regex',
      caseSensitive: true,
    },
  },
}
