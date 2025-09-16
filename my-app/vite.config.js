import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3002,        // <-- change to your desired port
    open: true,        // optional: auto-open browser
    strictPort: true,  // optional: fail if port is taken (don’t auto-increment)
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
})