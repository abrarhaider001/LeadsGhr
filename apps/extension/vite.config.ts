import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig({
  plugins: [react()],
  build: { rollupOptions: { input: { sidepanel: resolve(root, 'sidepanel.html'), offscreen: resolve(root, 'offscreen.html'), background: resolve(root, 'src/background.ts') }, output: { entryFileNames: '[name].js' } } },
})
