import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: { alias: { '@': fileURLToPath(new URL('.', import.meta.url)) } },
  test: {
    environment: 'node',
    include: ['**/*.test.ts'],
    exclude: ['node_modules/**', '.next/**', 'services/**'],
    testTimeout: 60_000,
    hookTimeout: 60_000,
    // Tests get a fresh in-memory database instead of writing into the developer's local one.
    env: { AGRILINK_DATA_DIR: 'memory://' },
  },
})
