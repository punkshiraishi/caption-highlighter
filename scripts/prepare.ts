// generate stub index.html files for dev entry
import { execSync } from 'node:child_process'
import process from 'node:process'
import fs from 'fs-extra'
import chokidar from 'chokidar'
import { isDev, log, port, r } from './utils'

/**
 * Stub index.html to use Vite in development
 */
async function stubIndexHtml() {
  const views = ['options']

  for (const view of views) {
    await fs.ensureDir(r(`extension/dist/${view}`))
    let data = await fs.readFile(r(`src/${view}/index.html`), 'utf-8')
    data = data
      .replace('"./main.ts"', `"http://localhost:${port}/${view}/main.ts"`)
      .replace('<div id="app"></div>', '<div id="app">Vite server did not start</div>')
    await fs.writeFile(r(`extension/dist/${view}/index.html`), data, 'utf-8')
    log('PRE', `stub ${view}`)
  }
}

async function syncAssets() {
  const source = r('assets')
  const destination = r('extension/assets')

  if (!await fs.pathExists(source))
    return

  await fs.ensureDir(destination)
  await fs.copy(source, destination)
  log('PRE', 'sync assets')
}

function writeManifest() {
  execSync('npx esno ./scripts/manifest.ts', { stdio: 'inherit' })
}

async function prepare() {
  writeManifest()
  await syncAssets()

  if (isDev) {
    await stubIndexHtml()
    chokidar.watch(r('src/**/*.html'))
      .on('change', () => {
        stubIndexHtml().catch(error => console.error(error))
      })
    chokidar.watch([r('src/manifest.ts'), r('package.json')])
      .on('change', () => {
        writeManifest()
      })
    chokidar.watch(r('assets/**'))
      .on('change', () => {
        syncAssets().catch(error => console.error(error))
      })
  }
}

prepare().catch((error) => {
  console.error(error)
  process.exit(1)
})
