/**
 * Whiteboard UI icons (Material Symbols via unplugin-icons).
 *
 * We use `?raw` to get SVG markup as a string so we can inject it into DOM-built UI
 * (content scripts are not Vue components).
 */

import clipboardSvg from '~icons/material-symbols/content-paste?raw'
import imageSvg from '~icons/material-symbols/image?raw'
import copySvg from '~icons/material-symbols/content-copy?raw'
import minimizeSvg from '~icons/material-symbols/remove?raw'
import maximizeSvg from '~icons/material-symbols/open-in-full?raw'
import closeSvg from '~icons/material-symbols/close?raw'
import warningSvg from '~icons/material-symbols/warning?raw'
import checkSvg from '~icons/material-symbols/check?raw'

export const ICON_CLIPBOARD = clipboardSvg
export const ICON_IMAGE = imageSvg
export const ICON_COPY = copySvg
export const ICON_MINIMIZE = minimizeSvg
export const ICON_MAXIMIZE = maximizeSvg
export const ICON_CLOSE = closeSvg
export const ICON_WARNING = warningSvg
export const ICON_CHECK = checkSvg
