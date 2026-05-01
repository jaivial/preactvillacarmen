import { existsSync } from 'node:fs'
import { request as httpRequest, type IncomingHttpHeaders, type IncomingMessage, type ServerResponse } from 'node:http'
import { request as httpsRequest } from 'node:https'

import preact from '@preact/preset-vite'
import { defineConfig, loadEnv, type Plugin, type Alias } from 'vite'
import { resolve } from 'node:path'

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

function devApiProxyPlugin(targets: string[]): Plugin {
  return {
    name: 'dev-api-proxy',
    configureServer(server) {
      server.config.logger.info(`[api-proxy] targets: ${targets.join(' -> ')}`)

      server.middlewares.use(async (req, res, next) => {
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
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiProxyTargets = uniqueProxyTargets([
    env.VITE_API_PROXY_TARGET,
    env.BACKEND_ORIGIN,
    existsSync('/.dockerenv') ? 'http://backend:8080' : undefined,
    'http://127.0.0.1:8081',
    'http://localhost:8081',
  ])

  return {
    plugins: [preact(), devApiProxyPlugin(apiProxyTargets)],
    resolve: {
      alias: [
        { find: 'react', replacement: 'preact/compat' },
        { find: 'react-dom', replacement: 'preact/compat' },
        { find: 'react/jsx-runtime', replacement: 'preact/jsx-runtime' },
        { find: 'react/jsx-dev-runtime', replacement: 'preact/jsx-runtime' },
      ] as Alias[],
    },
    define: {
      __DEV__: JSON.stringify(mode !== 'production'),
    },
    server: {
      host: '0.0.0.0',
      port: 5174,
      allowedHosts: [
        '0.0.0.0',
        'localhost',
        '.trycloudflare.com',
      ],
      hmr: {
        clientPort: 5174,
        port: 5174,
      },
    },
  }
})
