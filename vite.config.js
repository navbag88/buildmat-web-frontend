import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env vars so we can read VITE_* during config evaluation.
  // loadEnv reads .env, .env.local, .env.[mode], etc.
  const env = loadEnv(mode, process.cwd(), '')

  // Proxy target priority:
  //   1. VITE_PROXY_TARGET  – explicit override (e.g. http://139.59.46.39:8090)
  //   2. VITE_API_BASE_URL  – strip trailing /api segment if present
  //   3. fallback to direct backend
  const rawTarget = env.VITE_PROXY_TARGET
    || (env.VITE_API_BASE_URL ? env.VITE_API_BASE_URL.replace(/\/api\/?$/, '') : null)
    || 'http://localhost:8080'

  const proxyTarget = rawTarget.replace(/\/$/, '') // strip trailing slash

  console.log(`[vite] API proxy → ${proxyTarget}`)

  return {
    plugins: [react()],

    server: {
      port: 5173,
      proxy: {
        '/api': {
          target: proxyTarget,
          changeOrigin: true,   // rewrites the Host header to match the target
          secure: false,        // allow self-signed certs on local/dev gateways
          // Forward cookies back to the browser under localhost so the
          // HTTP-only session cookie set by the gateway is usable in dev.
          cookieDomainRewrite: { '*': 'localhost' },
          configure(proxy) {
            proxy.on('error', (err) => {
              console.error('[vite proxy error]', err.message)
            })
            proxy.on('proxyReq', (proxyReq, req) => {
              // Ensure Origin header is forwarded so the backend CORS check passes.
              if (!proxyReq.getHeader('Origin')) {
                proxyReq.setHeader('Origin', `http://localhost:5173`)
              }
            })
          }
        }
      }
    },

    build: {
      outDir: '../backend/src/main/resources/static',
      emptyOutDir: true
    }
  }
})
