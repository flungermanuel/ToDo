import { resolve } from 'node:path'
import { defineConfig } from 'vitest/config'

// Eigene Konfiguration für die manuelle Evaluation (npm run eval) – getrennt von den
// normalen Tests, damit `npm test` und die CI nie ein Modell brauchen.
export default defineConfig({
  resolve: {
    alias: {
      '@core': resolve(import.meta.dirname, 'src/core'),
      '@shared': resolve(import.meta.dirname, 'src/shared')
    }
  },
  test: {
    include: ['eval/**/*.eval.ts']
  }
})
