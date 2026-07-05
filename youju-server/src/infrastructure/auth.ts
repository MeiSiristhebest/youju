import { jwtVerify, SignJWT } from 'jose'
import type { JwtPort } from '../domain/ports/jwtPort.js'
import { getEnv } from './env.js'

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

export const jwtAdapter: JwtPort = {
  generateToken,
  verifyToken,
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

export async function getUserIdFromReq(req: SimpleRequest): Promise<number | null> {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) return null
  const token = authHeader.substring(7)
  return verifyToken(token)
}
