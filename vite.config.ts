import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import process from 'node:process'
import tailwindcss from '@tailwindcss/vite'
import { resolve } from 'node:path'
const host = process.env.TAURI_DEV_HOST
export default defineConfig(() => ({
  plugins: [react(), tailwindcss()],
  clearScreen: false,
  resolve: {
    extensions: ['.js', '.jsx', '.ts', '.tsx'],
    alias: {
      '@': resolve(import.meta.dirname, 'src'),
    },
  },
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: 'ws',
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      // 3. tell Vite to ignore watching `src-tauri`
      ignored: ['**/src-tauri/**'],
    },
  },
}))
