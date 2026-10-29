import { resolve } from 'node:path'
import { defineConfig } from 'electron-vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Gemeinsame Aliase: jede Schicht importiert core/shared über einen festen Pfad
// statt über "../../..".
const alias = {
  '@core': resolve(__dirname, 'src/core'),
  '@shared': resolve(__dirname, 'src/shared')
}

export default defineConfig({
  main: {
    resolve: { alias }
  },
  preload: {
    resolve: { alias }
  },
  renderer: {
    resolve: {
      alias: { ...alias, '@renderer': resolve(__dirname, 'src/renderer') }
    },
    plugins: [react(), tailwindcss()]
  }
})
