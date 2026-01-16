/**
 * ホワイトボード機能のエントリーポイント
 */

export { CaptionBuffer } from './caption-buffer'
export { WhiteboardProcessor } from './processor'
export { WhiteboardPanel } from './panel'
export { NestedListRenderer } from './components/nested-list'

export type {
  WhiteboardItem,
  WhiteboardState,
  WhiteboardSettings,
  GeminiNanoAvailability,
} from '~/shared/models/whiteboard'

export {
  getDefaultWhiteboardSettings,
  createEmptyWhiteboardState,
} from '~/shared/models/whiteboard'

export { getGeminiNanoClient } from '../ai/gemini-nano'
