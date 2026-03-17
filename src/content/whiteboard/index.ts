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
} from '~/shared/models/whiteboard'

export {
  getDefaultWhiteboardSettings,
  createEmptyWhiteboardState,
} from '~/shared/models/whiteboard'

export { getGeminiFlashClient } from '../ai/gemini-flash'
