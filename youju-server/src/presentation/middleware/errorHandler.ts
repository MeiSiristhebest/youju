import type { NextFunction, Request, Response } from 'express'
import { AppError, errorResponse } from '../../domain/errors.js'
import { logger } from '../../infrastructure/logger.js'

export function errorHandler(
  err: Error | AppError,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json(errorResponse(err))
    return
  }

  logger.error({ err }, 'Unhandled error')

  const statusCode = res.statusCode && res.statusCode >= 400 ? res.statusCode : 500

  res.status(statusCode).json(errorResponse(err))
}

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    code: 404,
    error: {
      code: 'NOT_FOUND',
      message: `找不到 ${req.method} ${req.path}`,
    },
  })
}
