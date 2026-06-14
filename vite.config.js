import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api/stream': {
        target: 'https://tv.alii.uk',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/stream/, '/api/public/s/v2-BBsCERFWSgJCGgsEDQhfXgEbChxMG1oDHAIIDAsGSR1aBgoRQl4EAAoZFAJEAUMGGAUHFEtAQAFK'),
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      }
    }
  }
})
