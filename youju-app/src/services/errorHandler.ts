export const ErrorCode = {
  AUTH_ERROR: 401,
  NETWORK_ERROR: -1,
  TIMEOUT_ERROR: 408,
  VALIDATION_ERROR: 400,
  SERVER_ERROR: 500,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
} as const

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode]

export class ApiError extends Error {
  code: ErrorCode
  msg: string
  status: number
  data: unknown
  originalError?: Error

  constructor(code: ErrorCode, msg: string, status: number, data?: unknown, originalError?: Error) {
    super(msg)
    this.name = 'ApiError'
    this.code = code
    this.msg = msg
    this.status = status
    this.data = data || null
    this.originalError = originalError
  }

  isAuthError(): boolean {
    return this.code === ErrorCode.AUTH_ERROR
  }

  isNetworkError(): boolean {
    return this.code === ErrorCode.NETWORK_ERROR
  }

  isTimeoutError(): boolean {
    return this.code === ErrorCode.TIMEOUT_ERROR
  }

  isValidationError(): boolean {
    return this.code === ErrorCode.VALIDATION_ERROR
  }

  isServerError(): boolean {
    return this.code === ErrorCode.SERVER_ERROR
  }
}

export const getErrorCodeFromStatus = (status: number): ErrorCode => {
  switch (status) {
    case 401:
      return ErrorCode.AUTH_ERROR
    case 403:
      return ErrorCode.FORBIDDEN
    case 404:
      return ErrorCode.NOT_FOUND
    case 408:
      return ErrorCode.TIMEOUT_ERROR
    case 400:
      return ErrorCode.VALIDATION_ERROR
    case 500:
    case 502:
    case 503:
    case 504:
      return ErrorCode.SERVER_ERROR
    default:
      return ErrorCode.SERVER_ERROR
  }
}

export const handleApiError = (error: unknown): ApiError => {
  if (error instanceof ApiError) {
    return error
  }

  if (error instanceof Error && error.name === 'AbortError') {
    return new ApiError(ErrorCode.TIMEOUT_ERROR, '请求超时，请稍后重试', 408, null, error)
  }

  if (
    error instanceof TypeError ||
    (error instanceof Error && error.message?.includes('fetch')) ||
    (error instanceof Error && error.message?.includes('network')) ||
    (error instanceof Error && error.message?.includes('Failed to fetch'))
  ) {
    return new ApiError(
      ErrorCode.NETWORK_ERROR,
      '网络连接失败，请检查网络',
      -1,
      null,
      error instanceof Error ? error : undefined,
    )
  }

  const err = error as { status?: number; msg?: string; message?: string; data?: unknown }
  const status = err.status || 500
  const message = err.msg || err.message || '请求失败'
  const data = err.data || null
  const code = getErrorCodeFromStatus(status)

  return new ApiError(code, message, status, data, error instanceof Error ? error : undefined)
}

export const useApiErrorHandler = () => {
  const handleError = (error: unknown, onAuthError?: () => void) => {
    const apiError = handleApiError(error)

    console.error('[ApiError]', {
      code: apiError.code,
      msg: apiError.msg,
      status: apiError.status,
      data: apiError.data,
    })

    if (apiError.isAuthError() && onAuthError) {
      onAuthError()
    }

    return apiError
  }

  return { handleError }
}
