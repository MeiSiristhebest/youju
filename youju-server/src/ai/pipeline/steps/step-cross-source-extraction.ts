import type { Evidence, ReasoningStep } from '../../../domain/types.js'
import { isMockMode } from '../../../infrastructure/env.js'
import { callAI } from '../../llm.js'
import { generateMockStepData } from '../../mock.js'
import { analysisCache } from '../../promptCache.js'
import { CURRENT_PROMPT_VERSION, getStepSystemPrompt } from '../../prompts/index.js'
import { buildStep4UserPrompt } from '../../prompts/stepUserPrompts.js'
import { extractJSON } from '../../validator.js'
import type { StepExecutor, StepInput, StepOutput } from '../types.js'

interface ExtractedEntityRaw {
  dimension: string
  value: string
  evidence: Evidence
}

export const systemPromptFragment = `
Step 4: CROSS-SOURCE EXTRACTION
For each discovered dimension:
  • Extract the value/statement from EACH source that mentions it
  • Record exact quote for each extraction
  • Note which source mentions it and which don't
  • Assign confidence score to each extraction
`

export const outputSchema = {
  entities: {
    type: 'array',
    items: {
      dimension: 'string',
      value: 'string',
      evidence: {
        sourceName: 'string',
        sourceType: 'string',
        quote: 'string',
        confidence: 'number',
      },
    },
    description: 'extracted entities across sources',
  },
  byDimension: {
    type: 'object',
    description: 'entities grouped by dimension',
  },
  totalExtracted: { type: 'number', description: 'total number of extracted entities' },
}

export const stepCrossSourceExtraction: StepExecutor = async (
  input: StepInput,
): Promise<StepOutput> => {
  const startTime = Date.now()
  const isMock = isMockMode(input.aiConfig?.apiKey, input.isDemo)

  // Mock 模式：从 generateMockStepData 获取独立步骤数据
  if (isMock) {
    const mockData = generateMockStepData(input.sources)
    return {
      data: mockData.crossSourceExtraction,
      modelVersion: 'mock-rule-engine',
      promptVersion: CURRENT_PROMPT_VERSION,
      tokenPrompt: 0,
      tokenCompletion: 0,
      latencyMs: Date.now() - startTime,
    }
  }

  // 真实模式：独立 AI 调用（带 prompt cache）
  const step1Output = input.previousOutputs['step-scenario-discovery']
  const step3Output = input.previousOutputs['step-dimension-discovery'] as
    | { dimensions?: string[] }
    | undefined
  const systemPrompt = getStepSystemPrompt('step-4-cross-source-extraction', CURRENT_PROMPT_VERSION)
  const userPrompt = buildStep4UserPrompt(
    input.sources,
    step1Output as Record<string, unknown>,
    step3Output || {},
  )
  const aiResponse = await callAI(userPrompt, systemPrompt, 2, input.aiConfig, {
    enabled: true,
    cacheInstance: analysisCache,
  })

  const parsed = extractJSON(aiResponse.content)
  const reasoningTrace = parsed?.reasoning_trace as ReasoningStep[] | undefined
  const reasoningStep = reasoningTrace?.find(
    (r) =>
      String(r.step).toUpperCase().includes('EXTRACTION') ||
      String(r.step).toUpperCase().includes('CROSS'),
  )

  const rawEntities = (parsed?.extracted_entities || parsed?.entities) as
    | ExtractedEntityRaw[]
    | undefined
  const entities = rawEntities || []

  const byDimension: Record<string, ExtractedEntityRaw[]> = {}
  for (const entity of entities) {
    if (!byDimension[entity.dimension]) {
      byDimension[entity.dimension] = []
    }
    byDimension[entity.dimension].push(entity)
  }

  return {
    data: {
      entities,
      byDimension,
      totalExtracted: entities.length,
      reasoning: reasoningStep?.result || '跨源提取完成',
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
