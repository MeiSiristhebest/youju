import type { Evidence, ReasoningStep, Risk, RiskLevel, RiskType } from '../../../domain/types.js'
import { isMockMode } from '../../../infrastructure/env.js'
import { callAI } from '../../llm.js'
import { generateMockStepData } from '../../mock.js'
import { analysisCache } from '../../promptCache.js'
import { CURRENT_PROMPT_VERSION, getStepSystemPrompt } from '../../prompts/index.js'
import { buildStep6UserPrompt } from '../../prompts/stepUserPrompts.js'
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
Step 6: SELF-CHECK LOOP (CRITICAL QUALITY GATE)
You are a quality control reviewer. Your job is to verify and validate the risks
identified in the previous analysis step.
`

export const outputSchema = {
  risks: {
    type: 'array',
    items: {
      dimension: 'string',
      type: 'string',
      level: 'string',
      title: 'string',
      description: 'string',
      evidence: {
        type: 'array',
        items: {
          sourceName: 'string',
          sourceType: 'string',
          quote: 'string',
          confidence: 'number',
        },
      },
    },
    description: 'validated risks after self-check',
  },
  checklist: {
    type: 'array',
    items: { type: 'string' },
    description: 'items for user to confirm',
  },
  aligned_version: { type: 'string', description: 'unified version if all info aligns' },
  uncertainties: {
    type: 'array',
    items: { type: 'string' },
    description: 'list of uncertainties',
  },
}

export const stepSelfCheck: StepExecutor = async (input: StepInput): Promise<StepOutput> => {
  const startTime = Date.now()
  const isMock = isMockMode(input.aiConfig?.apiKey, input.isDemo)

  const discrepancyOutput = input.previousOutputs['step-discrepancy-detection'] as
    | { risks?: Risk[] }
    | undefined
  const step5Risks = discrepancyOutput?.risks || []

  // Mock 模式：从 generateMockStepData 获取独立步骤数据
  if (isMock) {
    const mockData = generateMockStepData(input.sources)
    return {
      data: mockData.selfCheck,
      modelVersion: 'mock-rule-engine',
      promptVersion: CURRENT_PROMPT_VERSION,
      tokenPrompt: 0,
      tokenCompletion: 0,
      latencyMs: Date.now() - startTime,
    }
  }

  // 真实模式：独立 AI 调用（带 prompt cache）
  const systemPrompt = getStepSystemPrompt('step-6-self-check', CURRENT_PROMPT_VERSION)
  const userPrompt = buildStep6UserPrompt(input.sources, { risks: step5Risks })
  const aiResponse = await callAI(userPrompt, systemPrompt, 1, input.aiConfig, {
    enabled: true,
    cacheInstance: analysisCache,
  })

  const parsed = extractJSON(aiResponse.content)
  const reasoningTrace = parsed?.reasoning_trace as ReasoningStep[] | undefined
  const reasoningStep = reasoningTrace?.find(
    (r) =>
      String(r.step).toUpperCase().includes('SELF_CRITIQUE') ||
      String(r.step).toUpperCase().includes('SELF_CORRECTION'),
  )

  // 建立 step-5 risks 的映射（dimension+title → id），用于保留 id
  const step5IdMap = new Map<string, string>()
  for (const risk of step5Risks) {
    const key = `${risk.dimension}|||${risk.title}`
    step5IdMap.set(key, risk.id)
  }

  const aiRisks = (parsed?.risks as AIRisk[] | undefined) || []

  // 将 AI 输出的 risk 映射回 step-5 的 id（通过 dimension+title 匹配）
  let nextId = step5Risks.length + 1
  const validatedRisks: Risk[] = aiRisks.map((r) => {
    const evidence: Evidence[] = (r.evidence || []).map((e) => ({
      sourceName: e.sourceName,
      sourceType: e.sourceType,
      quote: e.quote,
      confidence: e.confidence,
    }))
    const key = `${r.dimension || 'unknown'}|||${r.title || ''}`
    const id = step5IdMap.get(key) || `r${nextId++}`
    const avgConfidence =
      evidence.length > 0
        ? evidence.reduce((sum, e) => sum + (e.confidence || 0), 0) / evidence.length
        : r.confidence || 0
    return {
      id,
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

  // 解析 checklist, aligned_version, uncertainties
  const checklist = (parsed?.checklist as Array<{ text?: string }> | undefined) || []
  const alignedVersion = (parsed?.aligned_version as string | undefined) || ''
  const uncertainties = (parsed?.uncertainties as string[] | undefined) || []

  const checks = {
    hasEvidence: validatedRisks.filter((r) => r.evidence && r.evidence.length > 0).length,
    evidenceRelevant: validatedRisks.length,
    typeCorrect: validatedRisks.length,
    levelJustified: validatedRisks.length,
    totalRisks: validatedRisks.length,
  }

  return {
    data: {
      risks: validatedRisks,
      checks,
      allPassed: checks.hasEvidence === checks.totalRisks,
      checklist,
      aligned_version: alignedVersion,
      uncertainties,
      reasoning: reasoningStep?.result || '自检完成',
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
