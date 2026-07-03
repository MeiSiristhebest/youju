import * as dns from 'node:dns'
import * as net from 'node:net'
import * as cheerio from 'cheerio'
import type { ErrorCode } from '../domain/errors.js'
import { AppError } from '../domain/errors.js'

const PRIVATE_IP_RANGES: Array<{ start: string; end: string }> = [
  { start: '0.0.0.0', end: '0.255.255.255' },
  { start: '10.0.0.0', end: '10.255.255.255' },
  { start: '100.64.0.0', end: '100.127.255.255' },
  { start: '127.0.0.0', end: '127.255.255.255' },
  { start: '169.254.0.0', end: '169.254.255.255' },
  { start: '172.16.0.0', end: '172.31.255.255' },
  { start: '192.0.0.0', end: '192.0.0.255' },
  { start: '192.0.2.0', end: '192.0.2.255' },
  { start: '192.168.0.0', end: '192.168.255.255' },
  { start: '198.18.0.0', end: '198.19.255.255' },
  { start: '198.51.100.0', end: '198.51.100.255' },
  { start: '203.0.113.0', end: '203.0.113.255' },
  { start: '224.0.0.0', end: '255.255.255.255' },
]

const DEFAULT_TIMEOUT_MS = 10_000
const MAX_RESPONSE_BYTES = 5 * 1024 * 1024

function parseCsvList(value: string | undefined): string[] {
  if (!value) return []
  return value
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
}

const URL_ALLOWLIST = parseCsvList(process.env.URL_FETCH_ALLOWLIST)
const URL_DENYLIST = parseCsvList(process.env.URL_FETCH_DENYLIST)
const USE_ALLOWLIST = URL_ALLOWLIST.length > 0

function ipToLong(ip: string): number {
  const parts = ip.split('.').map(Number)
  return (parts[0] << 24) + (parts[1] << 16) + (parts[2] << 8) + parts[3]
}

function isPrivateIp(ip: string): boolean {
  if (net.isIPv6(ip)) {
    return (
      ip === '::1' || ip.startsWith('fe80:') || ip.startsWith('fc00:') || ip.startsWith('fd00:')
    )
  }
  if (!net.isIPv4(ip)) return true
  const long = ipToLong(ip)
  return PRIVATE_IP_RANGES.some(
    (range) => long >= ipToLong(range.start) && long <= ipToLong(range.end),
  )
}

function hostnameMatchesList(hostname: string, list: string[]): boolean {
  const host = hostname.toLowerCase()
  return list.some((pattern) => {
    if (pattern.startsWith('*.')) {
      const suffix = pattern.slice(1)
      return host.endsWith(suffix) || host === suffix.slice(1)
    }
    return host === pattern
  })
}

async function resolveHostname(hostname: string): Promise<string[]> {
  return new Promise((resolve, reject) => {
    dns.lookup(hostname, { all: true, family: 0 }, (err, addresses) => {
      if (err) reject(err)
      else resolve(addresses.map((a) => a.address))
    })
  })
}

export class SSRFError extends AppError {
  constructor(message: string) {
    super('SSRF_BLOCKED' as ErrorCode, message, 400)
    this.name = 'SSRFError'
  }
}

export interface UrlValidationResult {
  url: URL
  resolvedIps: string[]
}

export async function validateUrlForFetch(inputUrl: string): Promise<UrlValidationResult> {
  let parsed: URL
  try {
    parsed = new URL(inputUrl)
  } catch {
    throw new SSRFError('无效的 URL')
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new SSRFError('仅支持 http 和 https 协议')
  }

  if (parsed.port) {
    const port = parseInt(parsed.port, 10)
    if (port !== 80 && port !== 443 && port < 1024) {
      throw new SSRFError('不允许访问特权端口')
    }
  }

  const hostname = parsed.hostname
  if (!hostname) throw new SSRFError('URL 缺少主机名')

  if (USE_ALLOWLIST) {
    if (!hostnameMatchesList(hostname, URL_ALLOWLIST)) {
      throw new SSRFError('域名不在允许列表中')
    }
  }

  if (URL_DENYLIST.length > 0) {
    if (hostnameMatchesList(hostname, URL_DENYLIST)) {
      throw new SSRFError('域名在禁止列表中')
    }
  }

  let resolvedIps: string[]
  if (net.isIP(hostname)) {
    if (isPrivateIp(hostname)) {
      throw new SSRFError('禁止访问私有 IP 地址')
    }
    resolvedIps = [hostname]
  } else {
    resolvedIps = await resolveHostname(hostname)
    if (resolvedIps.length === 0) throw new SSRFError('DNS 解析失败')

    for (const ip of resolvedIps) {
      if (isPrivateIp(ip)) {
        throw new SSRFError('目标主机解析到私有 IP，已拒绝访问')
      }
    }
  }

  return { url: parsed, resolvedIps }
}

async function getRemoteAddress(response: Response): Promise<string | null> {
  const res = response as unknown as { socket?: { remoteAddress?: string } }
  if (!res.socket) return null
  return res.socket.remoteAddress || null
}

export async function extractFromUrl(url: string): Promise<string> {
  const { url: validatedUrl, resolvedIps } = await validateUrlForFetch(url)

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS)

  try {
    const response = await fetch(validatedUrl.toString(), {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; YoujuBot/1.0)',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      signal: controller.signal,
      redirect: 'manual',
    })

    if (response.type === 'opaqueredirect' || (response.status >= 300 && response.status < 400)) {
      throw new SSRFError('不允许重定向')
    }

    const remoteAddr = await getRemoteAddress(response)
    if (remoteAddr && !resolvedIps.includes(remoteAddr)) {
      if (isPrivateIp(remoteAddr)) {
        throw new SSRFError('检测到 DNS 重绑定攻击，连接目标为私有 IP')
      }
    }

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    const contentLength = response.headers.get('content-length')
    if (contentLength && parseInt(contentLength, 10) > MAX_RESPONSE_BYTES) {
      throw new Error('响应体过大')
    }

    let bytesReceived = 0
    const reader = response.body?.getReader()
    const chunks: Uint8Array[] = []

    if (reader) {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        if (value) {
          bytesReceived += value.length
          if (bytesReceived > MAX_RESPONSE_BYTES) {
            reader.cancel()
            throw new Error('响应体过大')
          }
          chunks.push(value)
        }
      }
    }

    const totalLength = chunks.reduce((sum, c) => sum + c.length, 0)
    const combined = new Uint8Array(totalLength)
    let offset = 0
    for (const chunk of chunks) {
      combined.set(chunk, offset)
      offset += chunk.length
    }

    const html = new TextDecoder('utf-8').decode(combined)
    const $ = cheerio.load(html)

    $('script, style, nav, footer, header, aside').remove()

    const text = $('main, article, .content, #content, body').text().replace(/\s+/g, ' ').trim()

    return text.substring(0, 5000)
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('请求超时')
    }
    throw error
  } finally {
    clearTimeout(timeoutId)
  }
}
