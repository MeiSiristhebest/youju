import type { NextFunction, Request, Response } from 'express'
import type { ZodError, ZodSchema } from 'zod'
import { validationError } from '../../domain/errors.js'

export function validateBody(schema: ZodSchema) {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      req.body = schema.parse(req.body)
      next()
    } catch (err) {
      const zodError = err as ZodError
      const details = zodError.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
        code: issue.code,
      }))
      next(validationError('参数验证失败', details))
    }
  }
}

export function validateQuery(schema: ZodSchema) {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      req.query = schema.parse(req.query) as typeof req.query
      next()
    } catch (err) {
      const zodError = err as ZodError
      const details = zodError.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
        code: issue.code,
      }))
      next(validationError('查询参数验证失败', details))
    }
  }
}

export function validateParams(schema: ZodSchema) {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      req.params = schema.parse(req.params) as typeof req.params
      next()
    } catch (err) {
      const zodError = err as ZodError
      const details = zodError.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
        code: issue.code,
      }))
      next(validationError('路径参数验证失败', details))
    }
  }
}
