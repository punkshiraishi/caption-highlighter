import { describe, expect, it } from 'vitest'
import { buildWhiteboardPrompt, cleanCaptionsForWhiteboard } from '~/content/ai/gemini-whiteboard-prompt'

describe('gemini whiteboard prompt', () => {
  it('cleanCaptionsForWhiteboard filters short lines and keeps the last 3 lines', () => {
    const input = [
      '短い',
      'これは十分に長いテスト行です12345', // > 15
      'これも十分に長いテスト行です12345', // > 15
      'また十分に長いテスト行です12345', // > 15
      'さらに十分に長いテスト行です12345', // > 15 (should be in last 3)
    ].join('\n')

    expect(cleanCaptionsForWhiteboard(input)).toBe([
      'これも十分に長いテスト行です12345',
      'また十分に長いテスト行です12345',
      'さらに十分に長いテスト行です12345',
    ].join(' '))
  })

  it('buildWhiteboardPrompt (initial) includes cleaned captions and ends with heading seed', () => {
    const prompt = buildWhiteboardPrompt({
      captions: '短い\nこれは十分に長いテスト行です12345\nこれも十分に長いテスト行です12345\nまた十分に長いテスト行です12345',
      previousSummary: '',
    })

    expect(prompt).toContain('会議発言を議事録として、階層的な見出しを含むMarkdownで構造化して出力してください。')
    expect(prompt).toContain('見出しは3段階を使い分ける: "##"（大分類）、"###"（中分類）、"####"（小分類）')
    expect(prompt).toContain('発言: これは十分に長いテスト行です12345 これも十分に長いテスト行です12345 また十分に長いテスト行です12345')
    expect(prompt.endsWith('##')).toBe(true)
  })

  it('buildWhiteboardPrompt (update) includes previous summary and ends with heading seed', () => {
    const prev = '## 議題\n- 予算\n## 担当\n- 人事部'
    const prompt = buildWhiteboardPrompt({
      captions: '短い\nこれは十分に長いテスト行です12345\nこれも十分に長いテスト行です12345\nまた十分に長いテスト行です12345',
      previousSummary: prev,
    })

    expect(prompt).toContain('会議の議事録を更新し、階層的な見出しを含むMarkdownで構造化して出力してください。')
    expect(prompt).toContain('見出しは3段階を使い分ける: "##"（大分類）、"###"（中分類）、"####"（小分類）')
    expect(prompt).toContain(`現在の議事録（Markdown）:\n${prev}`)
    expect(prompt).toContain('追加内容: これは十分に長いテスト行です12345 これも十分に長いテスト行です12345 また十分に長いテスト行です12345')
    expect(prompt.endsWith('##')).toBe(true)
  })
})
