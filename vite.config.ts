import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Offline demonstration: no proxy and no HMR network channel.
  server: { hmr: false, host: '127.0.0.1' },
  preview: { host: '127.0.0.1' },
})
