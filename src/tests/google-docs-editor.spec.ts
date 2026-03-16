import { beforeEach, describe, expect, it } from 'vitest'
import { applyMarkdownToOpenGoogleDoc } from '~/content/docs-sync/editor'

describe('google docs editor sync helper', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="host" contenteditable="true"></div>'
  })

  it('updates a contenteditable fallback target', async () => {
    await applyMarkdownToOpenGoogleDoc('# Notes\n- item')

    const host = document.querySelector('#host')
    expect(host?.textContent).toBe('# Notes\n- item')
  })
})
