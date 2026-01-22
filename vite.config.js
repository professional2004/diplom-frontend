import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { templateCompilerOptions } from '@tresjs/core'
import fs from 'fs'

export default defineConfig({
  plugins: [
    vue({
      ...templateCompilerOptions
    })
  ],
  server: {
    port: 5173,
    https: {
      key: fs.readFileSync('C:/certificates/localhost+2-key.pem'),
      cert: fs.readFileSync('C:/certificates/localhost+2.pem')
    }
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
  }
})

