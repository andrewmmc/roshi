import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    proxy: {
      '/api/proxy': {
        target: 'http://localhost:5173',
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on('proxyReq', (_proxyReq, req) => {
            // The actual proxying is handled by the client-side code
            // This is a placeholder for future CORS proxy support
            console.log('Proxy request:', req.url)
          })
        },
      },
    },
  },
})
