/**
 * 前端运行时配置中心
 *
 * 集中管理所有 HTTP/流式请求的运行时常量。
 * 可通过 Vite 环境变量覆盖默认值。
 * 与后端 env.ts 对称，作为前端的单一配置源。
 */

const num = (key: string, fallback: number): number => {
  const val = (import.meta.env as Record<string, string | undefined>)[key]
  if (typeof val !== 'string' || val === '') return fallback
  const parsed = Number(val)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

/** 普通请求超时（毫秒） */
export const API_TIMEOUT = num('VITE_API_TIMEOUT', 30000)

/** 流式请求超时（毫秒）— SSE 长连接需要更长超时 */
export const STREAM_TIMEOUT = num('VITE_STREAM_TIMEOUT', 120000)

/** 请求失败重试次数 */
export const API_RETRIES = num('VITE_API_RETRIES', 2)

/** 重试延迟基数（毫秒），实际延迟 = API_RETRY_DELAY * 2^(attempt-1) */
export const API_RETRY_DELAY = num('VITE_API_RETRY_DELAY', 1000)

/** Token 提前刷新阈值（毫秒），距过期不足此值时触发刷新 */
export const TOKEN_REFRESH_THRESHOLD = num('VITE_TOKEN_REFRESH_THRESHOLD', 300000)

/** API 基础路径 */
export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '/api/v1').replace(/\/$/, '')

/** React Query 通用重试延迟函数，实际延迟 = API_RETRY_DELAY * 2^attempt，上限 3 秒 */
export const queryRetryDelay = (attemptIndex: number): number =>
  Math.min(API_RETRY_DELAY * 2 ** attemptIndex, 3000)
