import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import { Readable } from 'node:stream'

const host = process.env.TAURI_DEV_HOST

function devProxyPlugin() {
  return {
    name: 'dev-dynamic-proxy',
    configureServer(server: import('vite').ViteDevServer) {
      server.middlewares.use('/api/proxy', async (req, res) => {
        const requestUrl = new URL(req.url ?? '', 'http://localhost')
        const target = requestUrl.searchParams.get('url')

        if (!target) {
          res.statusCode = 400
          res.end('Missing "url" query parameter')
          return
        }

        if (!/^https?:\/\//.test(target)) {
          res.statusCode = 400
          res.end('Invalid proxy target')
          return
        }

        const abortController = new AbortController()
        req.on('close', () => abortController.abort())

        const upstreamHeaders = new Headers()
        for (const [key, value] of Object.entries(req.headers)) {
          if (!value) continue
          if (['host', 'origin', 'referer', 'connection', 'content-length'].includes(key)) continue
          upstreamHeaders.set(key, Array.isArray(value) ? value.join(', ') : value)
        }

        try {
          const requestBody =
            req.method === 'GET' || req.method === 'HEAD'
              ? undefined
              : (Readable.toWeb(req) as unknown as NonNullable<RequestInit['body']>)

          const upstreamResponse = await fetch(target, {
            method: req.method,
            headers: upstreamHeaders,
            body: requestBody,
            duplex: 'half',
            signal: abortController.signal,
          })

          res.statusCode = upstreamResponse.status
          upstreamResponse.headers.forEach((value, key) => {
            if (['content-encoding', 'transfer-encoding', 'connection'].includes(key)) return
            res.setHeader(key, value)
          })

          if (!upstreamResponse.body) {
            res.end()
            return
          }

          Readable.fromWeb(upstreamResponse.body).pipe(res)
        } catch (error) {
          if (abortController.signal.aborted) {
            res.end()
            return
          }

          const message = error instanceof Error ? error.message : 'Proxy request failed'
          res.statusCode = 502
          res.setHeader('content-type', 'application/json')
          res.end(JSON.stringify({ error: message }))
        }
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), devProxyPlugin()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  clearScreen: false,
  server: {
    port: 5173,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: 'ws',
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      ignored: ['**/src-tauri/**'],
    },
  },
  envPrefix: ['VITE_', 'TAURI_ENV_*'],
  build: {
    target:
      process.env.TAURI_ENV_PLATFORM === 'windows' ? 'chrome105' : 'safari13',
    minify: !process.env.TAURI_ENV_DEBUG ? 'esbuild' : false,
    sourcemap: !!process.env.TAURI_ENV_DEBUG,
  },
})
