import { IncomingMessage, ServerResponse } from 'node:http'
import type { Express, Request as ExpressRequest, Response as ExpressResponse } from 'express'
import { createApp } from '../../src/app.js'
import { driver } from '../../src/data/db.js'
import { getContainer } from '../../src/app.js'
import { Tokens } from '../../src/infrastructure/di/tokens.js'
import type { AnalysisService } from '../../src/domain/services/analysisService.js'

interface EdgeOneContext {
  request: Request
  env: Record<string, string>
  params: Record<string, string>
  waitUntil: (promise: Promise<unknown>) => void
  next: () => Promise<Response>
}

let appInstance: Express | null = null
let initialized = false

async function initializeApp() {
  if (initialized) return
  initialized = true

  const { app } = createApp(driver)
  appInstance = app

  if (process.env.ENABLE_SCENARIO_PREHEAT !== 'false') {
    const container = getContainer()
    const analysisService = container.resolve<AnalysisService>(Tokens.AnalysisService)
    analysisService.preheatScenarioPresets().catch((e: unknown) => {
      console.error('[EdgeOne] 场景预热失败:', e)
    })
  }
}

function webRequestToNodeRequest(webReq: Request, url: string): IncomingMessage {
  const req = new IncomingMessage({} as any)
  req.method = webReq.method
  req.url = url
  req.headers = {}

  webReq.headers.forEach((value: string, key: string) => {
    req.headers[key.toLowerCase()] = value
  })

  return req
}

function nodeResponseToWebResponse(nodeRes: ServerResponse, bodyChunks: Buffer[]): Response {
  const statusCode = nodeRes.statusCode
  const headers = new Headers()

  const nodeHeaders = nodeRes.getHeaders()
  for (const [key, value] of Object.entries(nodeHeaders)) {
    if (value !== undefined && value !== null) {
      if (Array.isArray(value)) {
        for (const v of value) {
          headers.append(key, String(v))
        }
      } else {
        headers.set(key, String(value))
      }
    }
  }

  const body = bodyChunks.length > 0 ? Buffer.concat(bodyChunks) : null

  return new Response(body, {
    status: statusCode,
    headers,
  })
}

async function handleRequest(app: Express, webReq: Request, params: Record<string, string>): Promise<Response> {
  const url = new URL(webReq.url)
  const path = url.pathname + url.search

  const nodeReq = webRequestToNodeRequest(webReq, path)
  const nodeRes = new ServerResponse(nodeReq)

  const req = nodeReq as unknown as ExpressRequest
  const res = nodeRes as unknown as ExpressResponse

  ;(req as any).params = params

  const chunks: Buffer[] = []

  const originalWrite = res.write.bind(res)
  const originalEnd = res.end.bind(res)

  res.write = function (chunk: any, ...args: any[]): boolean {
    if (chunk) {
      chunks.push(Buffer.from(chunk))
    }
    return originalWrite(chunk, ...args)
  } as any

  res.end = function (chunk?: any, ...args: any[]): ExpressResponse {
    if (chunk) {
      chunks.push(Buffer.from(chunk))
    }
    return originalEnd(chunk, ...args) as any
  } as any

  if (webReq.body) {
    const reader = webReq.body.getReader()
    const pump = async () => {
      const { done, value } = await reader.read()
      if (done) {
        nodeReq.push(null)
        return
      }
      nodeReq.push(value)
      await pump()
    }
    pump().catch((e) => {
      console.error('[EdgeOne] 请求体读取失败:', e)
    })
  } else {
    nodeReq.push(null)
  }

  return new Promise((resolve) => {
    nodeRes.on('finish', () => {
      resolve(nodeResponseToWebResponse(nodeRes, chunks))
    })

    app(req, res, (err) => {
      if (err) {
        console.error('[EdgeOne] Express 错误:', err)
        if (!nodeRes.writableEnded) {
          nodeRes.statusCode = 500
          nodeRes.setHeader('content-type', 'application/json; charset=utf-8')
          nodeRes.end(JSON.stringify({ error: '内部服务器错误' }))
        }
      } else if (!nodeRes.writableEnded) {
        nodeRes.statusCode = 404
        nodeRes.setHeader('content-type', 'application/json; charset=utf-8')
        nodeRes.end(JSON.stringify({ error: '未找到' }))
      }
    })
  })
}

export async function onRequest(context: EdgeOneContext): Promise<Response> {
  await initializeApp()

  if (!appInstance) {
    return new Response(JSON.stringify({ error: '应用初始化失败' }), {
      status: 500,
      headers: { 'content-type': 'application/json; charset=utf-8' },
    })
  }

  return handleRequest(appInstance, context.request, context.params)
}

export async function onRequestGet(context: EdgeOneContext): Promise<Response> {
  return onRequest(context)
}

export async function onRequestPost(context: EdgeOneContext): Promise<Response> {
  return onRequest(context)
}

export async function onRequestPut(context: EdgeOneContext): Promise<Response> {
  return onRequest(context)
}

export async function onRequestDelete(context: EdgeOneContext): Promise<Response> {
  return onRequest(context)
}

export async function onRequestPatch(context: EdgeOneContext): Promise<Response> {
  return onRequest(context)
}

export async function onRequestOptions(context: EdgeOneContext): Promise<Response> {
  return onRequest(context)
}

export async function onRequestHead(context: EdgeOneContext): Promise<Response> {
  return onRequest(context)
}
