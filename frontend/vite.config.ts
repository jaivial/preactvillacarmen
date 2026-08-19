import { existsSync } from 'node:fs'
import { request as httpRequest, type IncomingHttpHeaders, type IncomingMessage, type ServerResponse } from 'node:http'
import { request as httpsRequest } from 'node:https'

import preact from '@preact/preset-vite'
import { defineConfig, loadEnv, type Plugin, type Alias } from 'vite'

const DEV_API_PROXY_TIMEOUT_MS = 10_000

function normalizeProxyTarget(target: string) {
  return target.replace(/\/+$/, '')
}

function uniqueProxyTargets(values: Array<string | undefined>) {
  const seen = new Set<string>()
  const out: string[] = []

  for (const value of values) {
    const trimmed = value?.trim()
    if (!trimmed) continue

    const normalized = normalizeProxyTarget(trimmed)
    if (seen.has(normalized)) continue

    seen.add(normalized)
    out.push(normalized)
  }

  return out
}

function readRequestBody(req: IncomingMessage) {
  return new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = []

    req.on('data', (chunk) => {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
    })
    req.on('end', () => resolve(Buffer.concat(chunks)))
    req.on('error', reject)
  })
}

function buildProxyHeaders(headers: IncomingHttpHeaders, target: URL): IncomingHttpHeaders {
  const nextHeaders: IncomingHttpHeaders = { ...headers, host: target.host }
  delete nextHeaders.connection
  return nextHeaders
}

function writeProxyUnavailable(res: ServerResponse, targets: string[]) {
  if (res.writableEnded) return

  res.writeHead(503, { 'Content-Type': 'application/json' })
  res.end(
    JSON.stringify({
      success: false,
      message: 'API de desarrollo no disponible. Inicia backend en :8080 o define VITE_API_PROXY_TARGET.',
      targets,
    })
  )
}

function proxyToTarget(
  req: IncomingMessage & { originalUrl?: string },
  res: ServerResponse,
  body: Buffer,
  targets: string[],
  index: number
): void {
  if (index >= targets.length) {
    writeProxyUnavailable(res, targets)
    return
  }

  const baseTarget = targets[index]
  const targetUrl = new URL(req.originalUrl ?? req.url ?? '/', `${baseTarget}/`)
  const requestImpl = targetUrl.protocol === 'https:' ? httpsRequest : httpRequest

  let settled = false

  const retryNextTarget = () => {
    if (settled || res.headersSent || res.writableEnded) return
    settled = true
    proxyToTarget(req, res, body, targets, index + 1)
  }

  const proxyReq = requestImpl(
    targetUrl,
    {
      method: req.method,
      headers: buildProxyHeaders(req.headers, targetUrl),
    },
    (proxyRes) => {
      if (settled || res.writableEnded) return
      settled = true

      const headers = { ...proxyRes.headers }
      res.writeHead(proxyRes.statusCode ?? 502, headers)
      proxyRes.pipe(res)
    }
  )

  proxyReq.on('error', retryNextTarget)
  proxyReq.setTimeout(DEV_API_PROXY_TIMEOUT_MS, () => {
    proxyReq.destroy(new Error('proxy timeout'))
  })

  if (body.length > 0) {
    proxyReq.write(body)
  }
  proxyReq.end()
}

function apiProxyMiddleware(targets: string[]) {
  return async (
    req: IncomingMessage & { originalUrl?: string },
    res: ServerResponse,
    next: (err?: unknown) => void
  ) => {
    const path = req.originalUrl ?? req.url
    if (!path?.startsWith('/api')) {
      next()
      return
    }

    try {
      const body = req.method === 'GET' || req.method === 'HEAD' ? Buffer.alloc(0) : await readRequestBody(req)
      proxyToTarget(req, res, body, targets, 0)
    } catch {
      if (!res.writableEnded) {
        res.writeHead(500, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ success: false, message: 'No se pudo leer la petición API de desarrollo.' }))
      }
    }
  }
}

function devApiProxyPlugin(targets: string[]): Plugin {
  return {
    name: 'dev-api-proxy',
    configurePreviewServer(server) {
      server.middlewares.use(apiProxyMiddleware(targets))
    },
    configureServer(server) {
      server.config.logger.info(`[api-proxy] targets: ${targets.join(' -> ')}`)

      server.middlewares.use(apiProxyMiddleware(targets))

      // WebSocket tunneling for /api/* (e.g. the public Forky assistant chat).
      // Registered in the post hook: server.httpServer is not yet available
      // during configureServer in Vite 7.
      return () => {
        console.log('[api-proxy] post hook, httpServer:', !!server.httpServer, 'addr:', JSON.stringify(server.httpServer?.address() ?? null), 'upgrade listeners:', server.httpServer?.listeners('upgrade').length ?? 0)
        setTimeout(() => {
          console.log('[api-proxy] after 2s, addr:', JSON.stringify(server.httpServer?.address() ?? null), 'listeners:', server.httpServer?.listeners('upgrade').length ?? 0)
        }, 2000)
        server.httpServer?.on('upgrade', (req, socket, head) => {
          const path = req.url ?? ''
          console.log('[api-proxy] upgrade:', path)
          if (!path.startsWith('/api')) {
            return
          }
          let settled = false
          const tryTarget = (index: number) => {
            if (settled || index >= targets.length) {
              socket.destroy()
              return
            }
            const baseTarget = targets[index]
            const targetUrl = new URL(path, `${baseTarget}/`)
            const requestImpl = targetUrl.protocol === 'https:' ? httpsRequest : httpRequest
            const proxyReq = requestImpl(
              {
                hostname: targetUrl.hostname,
                port: targetUrl.port || (targetUrl.protocol === 'https:' ? 443 : 80),
                path: targetUrl.pathname + targetUrl.search,
                method: req.method,
                headers: {
                  ...buildProxyHeaders(req.headers, targetUrl),
                  connection: 'Upgrade',
                  upgrade: 'websocket',
                },
              },
              (proxyRes) => {
                if (settled) return
                // A non-101 answer means this target did not upgrade (e.g. a
                // foreign backend without the route) — move to the next target.
                if (proxyRes.statusCode !== 101) {
                  proxyRes.resume()
                  tryTarget(index + 1)
                  return
                }
                settled = true
                socket.write(
                  `HTTP/1.1 ${proxyRes.statusCode ?? 502} ${proxyRes.statusMessage ?? ''}\r\n` +
                    Object.entries(proxyRes.headers)
                      .map(([k, v]) => `${k}: ${v}\r\n`)
                      .join('') +
                    '\r\n'
                )
                proxyRes.pipe(socket)
              }
            )
            proxyReq.on('upgrade', (proxyRes, proxySocket) => {
              if (settled) {
                proxySocket.destroy()
                return
              }
              settled = true
              proxySocket.write(head)
              socket.write(
                `HTTP/1.1 101 Switching Protocols\r\n` +
                  Object.entries(proxyRes.headers)
                    .map(([k, v]) => `${k}: ${v}\r\n`)
                    .join('') +
                  '\r\n'
              )
              proxySocket.pipe(socket)
              socket.pipe(proxySocket)
            })
            proxyReq.on('error', () => {
              if (settled) return
              tryTarget(index + 1)
            })
            proxyReq.end()
          }
          tryTarget(0)
        })
      }
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  console.log('[api-proxy] port env:', { processPort: process.env.VITE_PORT, filePort: env.VITE_PORT, processHmr: process.env.VITE_HMR_PORT, fileHmr: env.VITE_HMR_PORT, mode })
  const port = Number(env.VITE_PORT) || 5174
  const hmrPort = Number(env.VITE_HMR_PORT) || port
  const hmrClientPort = Number(env.VITE_HMR_CLIENT_PORT) || hmrPort
  const apiProxyTargets = uniqueProxyTargets([
    env.VITE_API_PROXY_TARGET,
    env.BACKEND_ORIGIN,
    existsSync('/.dockerenv') ? 'http://backend:8080' : undefined,
    'http://127.0.0.1:8080',
    'http://localhost:8080',
    'http://127.0.0.1:8081',
    'http://localhost:8081',
  ])

  return {
    // Private dep-optimization cache: this dev server can run concurrently
    // with another vite instance sharing node_modules (contended caches hang
    // module loading). Set VITE_CACHE_DIR to isolate.
    cacheDir: process.env.VITE_CACHE_DIR ?? undefined,
    plugins: [preact(), devApiProxyPlugin(apiProxyTargets)],
    resolve: {
      alias: [] as Alias[],
    },
    define: {
      __DEV__: JSON.stringify(mode !== 'production'),
    },
    server: {
      host: '0.0.0.0',
      port,
      allowedHosts: [
        '0.0.0.0',
        'localhost',
        '.trycloudflare.com',
        '.menustudioai.com',
      ],
      hmr: {
        clientPort: hmrClientPort,
        port: hmrPort,
      },
    },
  }
})
