import { jwtVerify, SignJWT } from 'jose'
import type { UserRepository } from '../domain/ports/repositories.js'
import { getEnv } from './env.js'

let _userRepo: UserRepository | null = null

export function setUserRepository(repo: UserRepository): void {
  _userRepo = repo
}

function getUserRepo(): UserRepository {
  if (!_userRepo) {
    throw new Error('UserRepository not set. Call setUserRepository() first.')
  }
  return _userRepo
}

const JWT_SECRET = new TextEncoder().encode(getEnv().JWT_SECRET)
const JWT_EXPIRES_IN = '7d'
const JWT_ALG = 'HS256'
const JWT_ISSUER = 'youju'

export async function generateToken(userId: number): Promise<string> {
  return new SignJWT({ userId })
    .setProtectedHeader({ alg: JWT_ALG, typ: 'JWT' })
    .setIssuer(JWT_ISSUER)
    .setSubject(String(userId))
    .setIssuedAt()
    .setExpirationTime(JWT_EXPIRES_IN)
    .sign(JWT_SECRET)
}

export async function verifyToken(token: string): Promise<number | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET, {
      issuer: JWT_ISSUER,
      algorithms: [JWT_ALG],
    })
    const userId = payload.userId
    return typeof userId === 'number' ? userId : null
  } catch {
    return null
  }
}

interface SimpleRequest {
  headers: {
    authorization?: string
    'x-session-id'?: string
  }
}

export function getSessionIdFromReq(req: SimpleRequest): string | null {
  const authHeader = req.headers.authorization
  if (authHeader?.startsWith('Session ')) {
    return authHeader.substring(8)
  }
  return req.headers['x-session-id'] || null
}

export async function getUserIdAndSessionId(req: SimpleRequest): Promise<{
  userId: number | null
  sessionId: string | null
}> {
  const userId = await getUserIdFromReq(req)
  const sessionId = getSessionIdFromReq(req)
  return { userId, sessionId }
}

export async function wechatLoginMock(code?: string) {
  const mockOpenid = code ? `wx_${code}` : `wx_guest_${Date.now()}`
  const mockNicknames = ['微信用户', '小据同学', '有据用户', 'AI助手']
  const nickname = mockNicknames[Math.floor(Math.random() * mockNicknames.length)]
  const avatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${mockOpenid}`

  const user = await getUserRepo().findOrCreateUser(mockOpenid, nickname, avatar)
  const token = await generateToken(Number(user.id))

  return {
    token,
    user: {
      id: user.id,
      nickname: user.nickname,
      avatar: user.avatar,
    },
  }
}

export async function getUserIdFromReq(req: SimpleRequest): Promise<number | null> {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) return null
  const token = authHeader.substring(7)
  return verifyToken(token)
}
