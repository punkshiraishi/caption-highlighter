import type { Meta, StoryObj } from '@storybook/vue3'
import ThemeSettingsForm from './ThemeSettingsForm.vue'
import { DEFAULT_THEME_SETTINGS } from '~/shared/models/settings'

const meta: Meta<typeof ThemeSettingsForm> = {
  title: 'Options/ThemeSettingsForm',
  component: ThemeSettingsForm,
  args: {
    value: { ...DEFAULT_THEME_SETTINGS },
  },
  argTypes: {
    change: { action: 'change' },
  },
}

export default meta

type Story = StoryObj<typeof ThemeSettingsForm>

export const Default: Story = {}

export const DarkerPopup: Story = {
  args: {
    value: {
      ...DEFAULT_THEME_SETTINGS,
      popupBg: '#000000',
      popupText: '#ffffff',
    },
  },
}
