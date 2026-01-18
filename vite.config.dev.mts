import { defineConfig } from 'vite'
import { sharedConfig } from './vite.config.mjs'
import { port, r } from './scripts/utils'

// Dev-only Vue app for testing prompts / image generation.
export default defineConfig(({ command }) => ({
  ...sharedConfig,
  root: r('src/dev/gemini-test'),
  base: command === 'serve' ? undefined : '/dist/',
  server: {
    // avoid clashing with dev:web (default port)
    port: port + 10,
    hmr: { host: 'localhost' },
  },
  build: {
    outDir: r('dist/dev/gemini-test'),
    emptyOutDir: false,
  },
}))
