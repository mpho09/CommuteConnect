import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    // Process-based workers crash intermittently on some Windows machines.
    pool: 'threads',
  },
})
