import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react-swc'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', 'LOADUP_')
  return {
    plugins: [react()],
    server: {
      host: '127.0.0.1',
      proxy: {
        '/api': { target: env.LOADUP_API_TARGET || 'http://127.0.0.1:8080', changeOrigin: true },
      },
    },
    build: {
      target: 'esnext',
      chunkSizeWarningLimit: 700,
    }
  }
})
