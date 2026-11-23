import { defineConfig } from 'electron-vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { resolve } from 'node:path'

export default defineConfig({
  main: {
    build: {
      lib: {
        entry: resolve(import.meta.dirname, 'src/main.ts'),
        formats: ['cjs'],
        fileName: () => 'main.cjs',
      },
      rollupOptions: { external: ['better-sqlite3'] },
    },
  },
  preload: {
    build: {
      lib: {
        entry: resolve(import.meta.dirname, 'src/preload.ts'),
        formats: ['cjs'],
        fileName: () => 'preload.js',
      },
    },
  },
  renderer: {
    plugins: [react(), tailwindcss()],
    root: import.meta.dirname,
    build: { rollupOptions: { input: resolve(import.meta.dirname, 'index.html') } },
  },
})
