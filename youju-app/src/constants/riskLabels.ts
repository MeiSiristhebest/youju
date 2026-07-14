import type { RiskLevel } from '@/types/common'

// ─────────────────────────────────────────────────────────────────────────────
// 基础风险类型（AI 实际输出的只有这 4 种）
// ─────────────────────────────────────────────────────────────────────────────

export type BaseType = 'conflict' | 'promise' | 'missing' | 'info'

const BASE_LABELS: Record<BaseType, string> = {
  conflict: '直接矛盾',
  promise: '承诺未落文字',
  missing: '信息缺失',
  info: '信息提示',
}

const BASE_SHORT_LABELS: Record<BaseType, string> = {
  conflict: '冲突',
  promise: '承诺缺失',
  missing: '遗漏',
  info: '提示',
}

// ─────────────────────────────────────────────────────────────────────────────
// 场景化标签覆盖
// AI 始终输出 4 种基础类型，前端根据 scenario.type 映射为更贴切的中文
// ─────────────────────────────────────────────────────────────────────────────

const SCENARIO_OVERRIDES: Record<
  string,
  Partial<Record<BaseType, { label: string; short: string }>>
> = {
  // 求职 offer
  job_offer: {
    conflict: { label: '信息冲突', short: '冲突' },
    promise: { label: '口头承诺未入合同', short: '承诺未落' },
    missing: { label: '条款缺失', short: '缺失' },
  },
  // 租房
  rental_contract: {
    conflict: { label: '约定冲突', short: '冲突' },
    promise: { label: '口头承诺未落实', short: '承诺未落' },
    missing: { label: '条款缺失', short: '缺失' },
  },
  // 购物消费
  purchase: {
    conflict: { label: '信息冲突', short: '冲突' },
    promise: { label: '宣传承诺未兑现', short: '未兑现' },
    missing: { label: '条款缺失', short: '缺失' },
  },
  // 服务协议
  service_agreement: {
    conflict: { label: '约定冲突', short: '冲突' },
    promise: { label: '口头承诺未入合同', short: '承诺未落' },
    missing: { label: '条款缺失', short: '缺失' },
  },
  // 法律纠纷
  legal_dispute: {
    conflict: { label: '事实矛盾', short: '矛盾' },
    promise: { label: '口头承诺无凭证', short: '无凭证' },
    missing: { label: '证据缺失', short: '缺证' },
    info: { label: '法律提示', short: '提示' },
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// 向后兼容：旧 demo 数据中遗留的类型 → 映射到基础类型
// ─────────────────────────────────────────────────────────────────────────────

const LEGACY_TYPE_MAP: Record<string, BaseType> = {
  missing_evidence: 'missing',
  legal_risk: 'conflict',
  calculation: 'conflict',
  methodology: 'info',
  measurement: 'info',
  finding: 'info',
  fraud_risk: 'conflict',
  disclosure: 'missing',
  ip_risk: 'missing',
  team_risk: 'missing',
  metric_inflation: 'conflict',
  exaggeration: 'conflict',
  partial_truth: 'conflict',
  consistent: 'info',
}

/** 将遗留类型归一化为基础类型 */
function normalizeType(type: string): BaseType {
  if (type in BASE_LABELS) return type as BaseType
  return LEGACY_TYPE_MAP[type] || 'info'
}

// ─────────────────────────────────────────────────────────────────────────────
// 公共 API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 获取风险类型标签（带场景化）
 * @param type 风险类型（AI 输出的基础类型，或遗留类型）
 * @param scenarioType 场景类型（可选，用于场景化标签）
 */
export function getRiskTypeLabel(type: string, scenarioType?: string): string {
  const baseType = normalizeType(type)
  const override = SCENARIO_OVERRIDES[scenarioType || '']?.[baseType]
  return override?.label || BASE_LABELS[baseType]
}

/** 获取风险类型短标签（带场景化） */
export function getRiskTypeShortLabel(type: string, scenarioType?: string): string {
  const baseType = normalizeType(type)
  const override = SCENARIO_OVERRIDES[scenarioType || '']?.[baseType]
  return override?.short || BASE_SHORT_LABELS[baseType]
}

// ─────────────────────────────────────────────────────────────────────────────
// 兼容旧代码的常量导出（不带场景化，仅基础类型）
// ─────────────────────────────────────────────────────────────────────────────

/** @deprecated 请使用 getRiskTypeLabel(type, scenarioType) 代替 */
export const RISK_TYPE_LABELS: Record<string, string> = { ...BASE_LABELS }

/** @deprecated 请使用 getRiskTypeShortLabel(type, scenarioType) 代替 */
export const RISK_TYPE_SHORT_LABELS: Record<string, string> = { ...BASE_SHORT_LABELS }

// ─────────────────────────────────────────────────────────────────────────────
// 风险等级标签
// ─────────────────────────────────────────────────────────────────────────────

export const RISK_LEVEL_LABELS: Record<RiskLevel, string> = {
  critical: '严重',
  warning: '需要确认',
  info: '提示',
}

export const RISK_LEVEL_SHORT_LABELS: Record<RiskLevel, string> = {
  critical: '严重',
  warning: '警告',
  info: '提示',
}

export const RISK_LEVEL_EMOJI: Record<RiskLevel, string> = {
  critical: '🔴',
  warning: '🟡',
  info: '🔵',
}

export function getRiskLevelLabel(level: string): string {
  return RISK_LEVEL_LABELS[level as RiskLevel] || level
}

export function getRiskLevelEmoji(level: string): string {
  return RISK_LEVEL_EMOJI[level as RiskLevel] || '⚪'
}
