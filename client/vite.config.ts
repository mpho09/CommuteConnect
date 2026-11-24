import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    environment: 'jsdom',
    // Process-based workers crash intermittently on some Windows machines.
    pool: 'threads',
    setupFiles: ['./src/test/setup.ts'],
    css: false,
  },
})
