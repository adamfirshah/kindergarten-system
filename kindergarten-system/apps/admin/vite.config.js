import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  envDir: '../../',
  publicDir: '../portal/public',
  plugins: [react(), tailwindcss()],
})
