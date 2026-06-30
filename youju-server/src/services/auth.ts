import { findOrCreateUser } from './db.js'

const JWT_SECRET = process.env.JWT_SECRET || 'youju-dev-secret-key'

// 简单的 JWT 实现（无需额外依赖）
function base64UrlEncode(obj: object): string {
  return Buffer.from(JSON.stringify(obj))
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

function base64UrlDecode(str: string): any {
  const padded = str + '='.repeat((4 - (str.length % 4)) % 4)
  return JSON.parse(
    Buffer.from(padded.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf-8')
  )
}

// 简单的 Request 类型（避免导入整个express）
interface SimpleRequest {
  headers: {
    authorization?: string
    'x-session-id'?: string
  }
}

function sign(payload: object): string {
  const header = { alg: 'HS256', typ: 'JWT' }
  const encodedHeader = base64UrlEncode(header)
  const encodedPayload = base64UrlEncode({ ...payload, iat: Date.now() })
  const signature = base64UrlEncode({ secret: JWT_SECRET, h: encodedHeader, p: encodedPayload })
  return `${encodedHeader}.${encodedPayload}.${signature}`
}

function verify(token: string): any | null {
  try {
    const [header, payload, signature] = token.split('.')
    if (!header || !payload || !signature) return null
    const expected = base64UrlEncode({ secret: JWT_SECRET, h: header, p: payload })
    if (signature !== expected) return null
    return base64UrlDecode(payload)
  } catch {
    return null
  }
}

export function generateToken(userId: number): string {
  return sign({ userId })
}

export function verifyToken(token: string): number | null {
  const payload = verify(token)
  return payload?.userId || null
}

// 从请求头获取 session_id
export function getSessionIdFromReq(req: SimpleRequest): string | null {
  const authHeader = req.headers.authorization
  if (authHeader?.startsWith('Session ')) {
    return authHeader.substring(8)
  }
  return req.headers['x-session-id'] || null
}

// 获取用户ID和sessionID
export function getUserIdAndSessionId(req: SimpleRequest): { userId: number | null; sessionId: string | null } {
  const userId = getUserIdFromReq(req)
  const sessionId = getSessionIdFromReq(req)
  return { userId, sessionId }
}

// 微信登录模拟 - 生成模拟用户
export async function wechatLoginMock(code?: string) {
  const mockOpenid = code ? `wx_${code}` : `wx_guest_${Date.now()}`
  const mockNicknames = ['微信用户', '小据同学', '有据用户', 'AI助手']
  const nickname = mockNicknames[Math.floor(Math.random() * mockNicknames.length)]
  const avatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${mockOpenid}`

  const user = findOrCreateUser(mockOpenid, nickname, avatar)
  const token = generateToken(user.id)

  return {
    token,
    user: {
      id: user.id,
      nickname: user.nickname,
      avatar: user.avatar
    }
  }
}

// 从请求头提取用户ID
export function getUserIdFromReq(req: any): number | null {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) return null
  const token = authHeader.substring(7)
  return verifyToken(token)
}
