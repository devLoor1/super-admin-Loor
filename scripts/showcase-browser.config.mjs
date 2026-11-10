import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
// Test-only entry; never referenced by the application's vite.config.ts or Netlify.
export default defineConfig({
  root: path.join(repo, 'scripts/fixtures/showcase-browser'),
  plugins: [react()],
  define: {
    'import.meta.env.VITE_API_BASE_URL': JSON.stringify('https://backend-super-admin-loor.onrender.com/api'),
    'import.meta.env.VITE_SHOWCASE_ENABLED': JSON.stringify('true'),
  },
  server: { host: '127.0.0.1', strictPort: true, hmr: false, watch: null, fs: { allow: [repo] } },
  preview: { host: '127.0.0.1', strictPort: true },
  build: { outDir: path.join(repo, 'node_modules/.cache/showcase-browser-dist'), emptyOutDir: true, assetsInlineLimit: 0 },
})
