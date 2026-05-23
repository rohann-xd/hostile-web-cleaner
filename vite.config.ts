import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { crx } from '@crxjs/vite-plugin'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import zip from 'vite-plugin-zip-pack'
import manifest from './manifest.config.js'
import { name, version } from './package.json'
import { devTestPagesPlugin } from './vite-plugin-dev-test-pages.js'

const rootDir = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  resolve: {
    alias: {
      '@': `${path.resolve(rootDir, 'src')}`,
    },
  },
  plugins: [
    react(),
    crx({ manifest }),
    devTestPagesPlugin(rootDir),
    zip({ outDir: 'release', outFileName: `crx-${name}-${version}.zip` }),
  ],
  server: {
    cors: {
      origin: [
        /chrome-extension:\/\//,
      ],
    },
  },
})
