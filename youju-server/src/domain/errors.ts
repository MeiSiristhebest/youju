import { isProd } from '../infrastructure/env.js'

export type ErrorCode =
  | 'BAD_REQUEST'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'RATE_LIMITED'
  | 'SSRF_BLOCKED'
  | 'VALIDATION_ERROR'
  | 'INTERNAL_ERROR'
  | 'ANALYSIS_FAILED'
  | 'FILE_TOO_LARGE'
  | 'SERVICE_UNAVAILABLE'

export class AppError extends Error {
  readonly code: ErrorCode
  readonly statusCode: number
  readonly details?: unknown

  constructor(code: ErrorCode, message: string, statusCode?: number, details?: unknown) {
    super(message)
    this.name = 'AppError'
    this.code = code
    this.statusCode = statusCode ?? errorCodeToStatus(code)
    this.details = details
  }

  toJSON() {
    return {
      code: this.code,
      message: this.message,
      details: this.details,
    }
  }
}

function errorCodeToStatus(code: ErrorCode): number {
  switch (code) {
    case 'BAD_REQUEST':
      return 400
    case 'UNAUTHORIZED':
      return 401
    case 'FORBIDDEN':
      return 403
    case 'NOT_FOUND':
      return 404
    case 'CONFLICT':
      return 409
    case 'RATE_LIMITED':
      return 429
    case 'SSRF_BLOCKED':
      return 400
    case 'VALIDATION_ERROR':
      return 400
    case 'ANALYSIS_FAILED':
      return 500
    case 'FILE_TOO_LARGE':
      return 413
    case 'SERVICE_UNAVAILABLE':
      return 503
    default:
      return 500
  }
}

export function badRequest(message = '请求参数错误', details?: unknown) {
  return new AppError('BAD_REQUEST', message, 400, details)
}

export function unauthorized(message = '未授权访问') {
  return new AppError('UNAUTHORIZED', message, 401)
}

export function forbidden(message = '禁止访问') {
  return new AppError('FORBIDDEN', message, 403)
}

export function notFound(message = '资源不存在') {
  return new AppError('NOT_FOUND', message, 404)
}

export function rateLimited(message = '请求过于频繁，请稍后再试', details?: unknown) {
  return new AppError('RATE_LIMITED', message, 429, details)
}

export function ssrfBlocked(message = 'URL 访问被安全策略阻止') {
  return new AppError('SSRF_BLOCKED', message, 400)
}

export function validationError(message = '参数验证失败', details?: unknown) {
  return new AppError('VALIDATION_ERROR', message, 400, details)
}

export function internalError(message = '服务器内部错误') {
  return new AppError('INTERNAL_ERROR', message, 500)
}

export function fileTooLarge(message = '文件过大', details?: unknown) {
  return new AppError('FILE_TOO_LARGE', message, 413, details)
}

export function serviceUnavailable(message = '服务暂不可用', details?: unknown) {
  return new AppError('SERVICE_UNAVAILABLE', message, 503, details)
}

export interface ApiResponse<T = unknown> {
  code: number
  data?: T
  msg?: string
  error?: {
    code: ErrorCode
    message: string
    details?: unknown
  }
}

export function successResponse<T>(data: T): ApiResponse<T> {
  return { code: 200, data }
}

export function errorResponse(err: AppError | Error): ApiResponse {
  if (err instanceof AppError) {
    return {
      code: err.statusCode,
      error: err.toJSON(),
    }
  }
  return {
    code: 500,
    error: {
      code: 'INTERNAL_ERROR',
      message: isProd() ? '服务器内部错误' : err.message,
    },
  }
}
