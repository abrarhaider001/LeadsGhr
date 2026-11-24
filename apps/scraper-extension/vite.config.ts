import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { readLocalMode } from '../../scripts/local-mode.mjs'

const root = fileURLToPath(new URL('.', import.meta.url))

// Local mode (LEADSGHR_MODE=local in the repository's .env): build without the license check. The packaging
// script keeps such a build out of the committed ZIP.
const localMode = readLocalMode(resolve(root, '../..'))
if (localMode)
  console.warn('LEADSGHR_MODE is local: this build skips the license check. Do not ship it.')

export default defineConfig({
  plugins: [react()],
  define: { __LEADSGHR_LOCAL_MODE__: JSON.stringify(localMode) },
  base: './',
  build: {
    modulePreload: false,
    cssCodeSplit: false,
    rollupOptions: {
      input: {
        popup: resolve(root, 'popup.html'),
        runner: resolve(root, 'runner.html'),
        background: resolve(root, 'src/background.ts'),
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: 'chunks/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
      },
    },
  },
})
