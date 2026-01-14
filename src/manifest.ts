import fs from 'fs-extra'
import type { Manifest } from 'webextension-polyfill'
import type PkgType from '../package.json'
import { isDev, isFirefox, port, r } from '../scripts/utils'

export async function getManifest() {
  const pkg = await fs.readJSON(r('package.json')) as typeof PkgType

  const manifest: Manifest.WebExtensionManifest = {
    manifest_version: 3,
    name: pkg.displayName || pkg.name,
    version: pkg.version,
    description: pkg.description,
    action: {
      default_icon: {
        16: 'assets/icon-16.png',
        48: 'assets/icon-48.png',
        128: 'assets/icon-128.png',
      },
    },
    options_ui: {
      page: 'dist/options/index.html',
      open_in_tab: true,
    },
    background: isFirefox
      ? {
          scripts: ['dist/background/index.mjs'],
          type: 'module',
        }
      : {
          service_worker: 'dist/background/index.mjs',
          type: 'module',
        },
    icons: {
      16: 'assets/icon-16.png',
      48: 'assets/icon-48.png',
      128: 'assets/icon-128.png',
    },
    permissions: [
      'storage',
    ],
    host_permissions: ['https://meet.google.com/*'],
    content_scripts: [
      {
        matches: ['https://meet.google.com/*'],
        js: ['dist/contentScripts/index.global.js'],
        css: ['dist/contentScripts/style.css'],
        run_at: 'document_idle',
      },
      // Gemini Nano bridge script runs in MAIN world to access LanguageModel API
      {
        matches: ['https://meet.google.com/*'],
        js: ['dist/contentScripts/gemini-bridge.global.js'],
        run_at: 'document_start',
        world: 'MAIN',
      } as any,
    ],
    web_accessible_resources: [
      {
        resources: ['dist/contentScripts/style.css'],
        matches: ['https://meet.google.com/*'],
      },
    ],
    content_security_policy: {
      extension_pages: isDev
        ? `script-src 'self' http://localhost:${port}; object-src 'self'`
        : "script-src 'self'; object-src 'self'",
    },
  }

  return manifest
}
