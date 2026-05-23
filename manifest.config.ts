import { defineManifest } from '@crxjs/vite-plugin'
import pkg from './package.json'

export default defineManifest({
  manifest_version: 3,
  name: 'Hostile Web Cleaner',
  description:
    'Repair hostile, manipulative website behaviors — not another ad blocker.',
  version: pkg.version,
  icons: {
    48: 'public/logo.png',
  },
  action: {
    default_icon: {
      48: 'public/logo.png',
    },
    default_popup: 'src/popup/index.html',
  },
  permissions: ['storage', 'tabs', 'webNavigation', 'scripting', 'activeTab'],
  host_permissions: ['<all_urls>'],
  background: {
    service_worker: 'src/background/index.ts',
    type: 'module',
  },
  content_scripts: [
    {
      js: ['src/content/index.ts'],
      matches: ['https://*/*', 'http://*/*'],
      run_at: 'document_start',
      all_frames: true,
    },
    {
      js: ['src/content/injected/main-world.ts'],
      matches: ['https://*/*', 'http://*/*'],
      run_at: 'document_start',
      all_frames: true,
      world: 'MAIN',
    },
  ],
})
