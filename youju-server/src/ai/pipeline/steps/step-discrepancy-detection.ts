import type { Evidence, ReasoningStep, Risk, RiskLevel, RiskType } from '../../../domain/types.js'
import { isMockMode } from '../../../infrastructure/env.js'
import { callAI } from '../../llm.js'
import { generateMockStepData } from '../../mock.js'
import { analysisCache } from '../../promptCache.js'
import { CURRENT_PROMPT_VERSION, getStepSystemPrompt } from '../../prompts/index.js'
import { buildStep5UserPrompt } from '../../prompts/stepUserPrompts.js'
import { extractJSON } from '../../validator.js'
import type { StepExecutor, StepInput, StepOutput } from '../types.js'

interface AIRisk {
  dimension?: string
  type?: RiskType
  level?: RiskLevel
  title?: string
  description?: string
  confidence?: number
  evidence?: Array<{
    sourceName: string
    sourceType: string
    quote: string
    confidence: number
  }>
}

export const systemPromptFragment = `
Step 5: DISCREPANCY DETECTION & EVIDENCE VALIDATION
For each dimension, analyze and classify findings into one of the risk types
defined in domain/rules/riskRules.ts (conflict, promise, missing, info).
`

export const outputSchema = {
  risks: {
    type: 'array',
    items: {
      id: 'string',
      dimension: 'string',
      type: 'string',
      level: 'string',
      title: 'string',
      description: 'string',
      sources: { type: 'array', items: 'string' },
      evidence: {
        type: 'array',
        items: {
          sourceName: 'string',
          sourceType: 'string',
          quote: 'string',
          confidence: 'number',
        },
      },
      confidence: 'number',
    },
    description: 'detected risks',
  },
  byType: {
    type: 'object',
    description: 'risks grouped by type',
  },
  byLevel: {
    type: 'object',
    description: 'risks grouped by level',
  },
  totalRisks: { type: 'number', description: 'total number of risks' },
}

export const stepDiscrepancyDetection: StepExecutor = async (
  input: StepInput,
): Promise<StepOutput> => {
  const startTime = Date.now()
  const isMock = isMockMode(input.aiConfig?.apiKey, input.isDemo)

  // Mock 模式：从 generateMockStepData 获取独立步骤数据
  if (isMock) {
    const mockData = generateMockStepData(input.sources)
    return {
      data: mockData.discrepancyDetection,
      modelVersion: 'mock-rule-engine',
      promptVersion: CURRENT_PROMPT_VERSION,
      tokenPrompt: 0,
      tokenCompletion: 0,
      latencyMs: Date.now() - startTime,
    }
  }

  // 真实模式：独立 AI 调用（带 prompt cache）
  const step1Output = input.previousOutputs['step-scenario-discovery']
  const step4Output = input.previousOutputs['step-cross-source-extraction'] as
    | { entities?: unknown[] }
    | undefined
  const systemPrompt = getStepSystemPrompt('step-5-discrepancy-detection', CURRENT_PROMPT_VERSION)
  const userPrompt = buildStep5UserPrompt(
    input.sources,
    step1Output as Record<string, unknown>,
    step4Output || {},
  )
  const aiResponse = await callAI(userPrompt, systemPrompt, 2, input.aiConfig, {
    enabled: true,
    cacheInstance: analysisCache,
  })

  const parsed = extractJSON(aiResponse.content)
  const reasoningTrace = parsed?.reasoning_trace as ReasoningStep[] | undefined
  const reasoningStep = reasoningTrace?.find(
    (r) =>
      String(r.step).toUpperCase().includes('DISCREPANCY') ||
      String(r.step).toUpperCase().includes('DETECTION'),
  )

  const aiRisks = (parsed?.risks as AIRisk[] | undefined) || []

  // 在代码中生成 id 和 sources（AI 不输出这两个字段）
  const risks: Risk[] = aiRisks.map((r, i) => {
    const evidence: Evidence[] = (r.evidence || []).map((e) => ({
      sourceName: e.sourceName,
      sourceType: e.sourceType,
      quote: e.quote,
      confidence: e.confidence,
    }))
    const avgConfidence =
      evidence.length > 0
        ? evidence.reduce((sum, e) => sum + (e.confidence || 0), 0) / evidence.length
        : r.confidence || 0
    return {
      id: `r${i + 1}`,
      dimension: r.dimension || 'unknown',
      type: r.type || 'info',
      level: r.level || 'info',
      title: r.title || '未命名风险',
      description: r.description || '',
      sources: [...new Set(evidence.map((e) => e.sourceName))],
      evidence,
      confidence: typeof r.confidence === 'number' ? r.confidence : avgConfidence,
    }
  })

  const byType: Record<string, Risk[]> = {
    conflict: [],
    promise: [],
    missing: [],
    info: [],
  }
  for (const risk of risks) {
    if (byType[risk.type]) {
      byType[risk.type].push(risk)
    }
  }

  const byLevel: Record<string, Risk[]> = {
    critical: [],
    warning: [],
    info: [],
  }
  for (const risk of risks) {
    if (byLevel[risk.level]) {
      byLevel[risk.level].push(risk)
    }
  }

  return {
    data: {
      risks,
      byType,
      byLevel,
      totalRisks: risks.length,
      reasoning: reasoningStep?.result || '差异检测完成',
      reasoning_trace: reasoningTrace || [],
    },
    modelVersion: aiResponse.model,
    promptVersion: CURRENT_PROMPT_VERSION,
    tokenPrompt: aiResponse.tokenPrompt,
    tokenCompletion: aiResponse.tokenCompletion,
    latencyMs: Date.now() - startTime,
    rawOutput: aiResponse.content,
  }
}
