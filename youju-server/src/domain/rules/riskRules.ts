/**
 * Risk business rules for the analysis pipeline.
 *
 * These rules are the single source of truth for risk type definitions,
 * risk level classification criteria, quality bar and self-check rules.
 * The prompt (ai/prompts/versions/v1/analysis.system.md) only references
 * these rules by name; the concrete conditions live here so they are
 * versioned, testable and reusable by domain services.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Risk type definitions
// ─────────────────────────────────────────────────────────────────────────────

export const RISK_TYPES = {
  CONFLICT: {
    id: 'conflict',
    description: '多个来源对同一维度的描述不一致',
    minSources: 2,
  },
  PROMISE_UNWRITTEN: {
    id: 'promise',
    description: '非正式来源提及但正式来源未记录的承诺',
    minInformal: 1,
    minFormalMention: 0,
  },
  MISSING: {
    id: 'missing',
    description: '所有来源都未提及但该维度对此场景很重要',
  },
  INFO: {
    id: 'info',
    description: '值得关注但不构成风险的观察',
  },
} as const

// ─────────────────────────────────────────────────────────────────────────────
// Risk level rules (deterministic)
// ─────────────────────────────────────────────────────────────────────────────

export const RISK_LEVEL_RULES = {
  CRITICAL: {
    level: 'critical',
    conditions: [
      '高 stakes 维度（金钱/法律义务/核心承诺）上的冲突 + ≥2来源不一致',
      '高 stakes 维度的可信承诺在正式文件中完全缺失（promise类型）',
      '合同/官方文件中缺失法律要求条款（missing类型）',
    ],
  },
  WARNING: {
    level: 'warning',
    conditions: [
      '非关键维度的措辞差异或冲突（≥2来源但维度不属于高stakes）',
      '非关键承诺未在正式文件中体现（promise类型）',
      '重要但非法律要求的信息缺失（missing类型，属于高风险维度但非法定要求）',
    ],
  },
  INFO: {
    level: 'info',
    conditions: ['值得注意但不一定有问题的观察', '需要了解但不构成风险的事项'],
  },
} as const

// ─────────────────────────────────────────────────────────────────────────────
// Quality bar (hard requirements for AI output)
// ─────────────────────────────────────────────────────────────────────────────

export const QUALITY_BAR = [
  '100% 基于输入数据（零幻觉）',
  '每个风险至少有1条带原文引用的证据',
  '证据实际支撑结论（非边缘相关）',
  '结构有效的 JSON 匹配 schema',
  '推理链覆盖所有7个步骤',
  '风险等级遵循确定性规则',
  '维度从材料中发现（非硬编码模板）',
  'JSON 外无额外文本',
] as const

// ─────────────────────────────────────────────────────────────────────────────
// Self-check rules (per-finding verification)
// ─────────────────────────────────────────────────────────────────────────────

export const SELF_CHECK_RULES = [
  '证据强度：引用是否确实来自原文？是否直接支撑结论，而非边缘相关？',
  '分类准确性：风险类型是否正确？（conflict需≥2来源不同值 / promise需非正式有+正式无 / missing需所有来源均无）',
  '等级合理性：风险等级是否符合判断矩阵？（高stakes维度冲突为critical / 非关键维度差异为warning）',
  '维度有效性：这是一个值得追踪的真实维度吗？（能否一句话说清比较什么？第三方会关心吗？）',
  '确认偏差：是否因为"想找到问题"而强行制造了发现？（中立读者是否同意这是问题？）',
  '完整性：是否遗漏了明显的风险？（是否有不对称信息值得提及？）',
  '冲突：是否确实有2+来源的不同声明？',
  '承诺：是否在非正式来源但不在正式来源中？',
  '缺失：是否在所有来源中确实都不存在？',
  '该维度是否从材料中发现（而非臆造）？',
] as const

// ─────────────────────────────────────────────────────────────────────────────
// Rule versioning
// ─────────────────────────────────────────────────────────────────────────────

export const RISK_RULES_VERSION = 'v1'

const HIGH_STAKES_DIMENSIONS = [
  'salary',
  'compensation',
  'amount',
  'price',
  'deposit',
  'payment',
  'rent',
  'fee',
  'cost',
  'bonus',
  '薪',
  '金',
  '钱',
  '费',
  'liability',
  'termination',
  'responsibility',
  'legal',
  'contract',
  '责任',
  '义务',
  '条款',
  '违约',
  'date',
  'deadline',
  'duration',
  'start_date',
  'end_date',
  '期',
  '时间',
  '日期',
  '截止',
]

export function classifyRiskLevel(
  riskType: string,
  dimension: string,
  evidenceCount: number,
): 'critical' | 'warning' | 'info' {
  const dimLower = dimension.toLowerCase()
  const isHighStakes = HIGH_STAKES_DIMENSIONS.some((kw) => dimLower.includes(kw.toLowerCase()))

  switch (riskType) {
    case 'conflict':
      if (isHighStakes && evidenceCount >= 2) return 'critical'
      if (evidenceCount >= 2) return 'warning'
      return 'info'
    case 'promise':
      if (isHighStakes) return 'warning'
      return 'info'
    case 'missing':
      if (isHighStakes) return 'warning'
      return 'info'
    default:
      return 'info'
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers (consumed by prompt builder / domain services)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns a short, human-readable summary of the risk rules.
 * Intended to be referenced (not inlined) by the system prompt so the AI
 * knows the gist of the rules without the prompt owning the rule logic.
 */
export function getRiskRulesSummary(): string {
  const riskTypes = Object.values(RISK_TYPES)
    .map((t) => `- ${t.id}: ${t.description}`)
    .join('\n')

  const levelRules = Object.values(RISK_LEVEL_RULES)
    .map((r) => `${r.level.toUpperCase()}: ${r.conditions.join('; ')}`)
    .join('\n')

  return `Risk Types:\n${riskTypes}\n\nRisk Levels:\n${levelRules}`
}
