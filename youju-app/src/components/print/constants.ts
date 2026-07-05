import type { RiskLevel } from '@/types'

export const KAMI = {
  parchment: '#f5f4ed',
  ivory: '#faf9f5',
  warmSand: '#e8e6dc',
  brand: '#1B365D',
  brandLight: '#2D5A8A',
  nearBlack: '#141413',
  darkWarm: '#3d3d3a',
  olive: '#504e49',
  stone: '#6b6a64',
  border: '#e8e6dc',
  borderSoft: '#e5e3d8',
  tagBg: '#E4ECF5',
  danger: '#8B2C2C',
  dangerBg: '#f0e0d8',
  warning: '#8B6914',
  warningBg: '#f5ecd8',
  success: '#2C5F2D',
  successBg: '#e0ecd8',
} as const

export const serifFont =
  '"TsangerJinKai02", "Source Han Serif SC", "Noto Serif CJK SC", "Songti SC", "STSong", Georgia, serif'
export const sansFont =
  '"PingFang SC", "Source Han Sans SC", "Noto Sans CJK SC", "Microsoft YaHei", sans-serif'
export const monoFont =
  '"JetBrains Mono", "SF Mono", "Fira Code", Consolas, Monaco, "TsangerJinKai02", "Source Han Serif SC", monospace'

export function levelLabel(level: RiskLevel): string {
  return level === 'critical' ? '严重' : level === 'warning' ? '需要确认' : '提示'
}

export function typeLabel(type: string): string {
  const map: Record<string, string> = {
    conflict: '直接矛盾',
    promise: '承诺未落文字',
    missing: '信息缺失',
    info: '信息提示',
  }
  return map[type] || type
}

export function levelStyle(level: RiskLevel): { color: string; bg: string } {
  if (level === 'critical') return { color: KAMI.danger, bg: KAMI.dangerBg }
  if (level === 'warning') return { color: KAMI.warning, bg: KAMI.warningBg }
  return { color: KAMI.success, bg: KAMI.successBg }
}
