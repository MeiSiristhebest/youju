import type { ReasoningStep } from '../../../domain/types.js'
import { isMockMode } from '../../../infrastructure/env.js'
import { callAI } from '../../llm.js'
import { generateMockStepData } from '../../mock.js'
import { analysisCache } from '../../promptCache.js'
import { CURRENT_PROMPT_VERSION, getStepSystemPrompt } from '../../prompts/index.js'
import { buildStep3UserPrompt } from '../../prompts/stepUserPrompts.js'
import { extractJSON } from '../../validator.js'
import type { StepExecutor, StepInput, StepOutput } from '../types.js'

export const systemPromptFragment = `
Step 3: DIMENSION DISCOVERY (KEY INNOVATION)
From all materials, extract the meaningful dimensions that should be compared.
These are NOT pre-defined — you DISCOVER them from the content.

For each dimension you identify:
  • What is it? (e.g., "月薪"、"入住日期"、"押金金额"、"交付期限")
  • Why does it matter? (why is this dimension important to verify?)
  • What type of value? (number, date, boolean, text)

Dimension categories you commonly find (but are NOT limited to):
  • 财务类: 价格、薪资、押金、罚款、补偿金、奖金
  • 时间类: 开始日期、截止日期、期限、试用期、有效期
  • 法律/合同类: 责任、终止条件、违约条款、义务
  • 质量/范围类: 交付物、规格、包含/排除项
  • 物流类: 地点、交付方式、相关方
  • 福利类: 福利、保险、补贴、设施

IMPORTANT: Always discover dimensions from the actual content, never force-fit a template.
All dimension names MUST be in Chinese.
`

export const outputSchema = {
  dimensions: {
    type: 'array',
    items: { type: 'string' },
    description: 'list of discovered dimensions',
  },
  dimensionCount: { type: 'number', description: 'total number of dimensions' },
  categories: {
    type: 'object',
    description: 'dimensions grouped by category',
  },
}

export const stepDimensionDiscovery: StepExecutor = async (
  input: StepInput,
): Promise<StepOutput> => {
  const startTime = Date.now()
  const isMock = isMockMode(input.aiConfig?.apiKey, input.isDemo)

  // Mock 模式：从 generateMockStepData 获取独立步骤数据
  if (isMock) {
    const mockData = generateMockStepData(input.sources)
    return {
      data: mockData.dimensionDiscovery,
      modelVersion: 'mock-rule-engine',
      promptVersion: CURRENT_PROMPT_VERSION,
      tokenPrompt: 0,
      tokenCompletion: 0,
      latencyMs: Date.now() - startTime,
    }
  }

  // 真实模式：独立 AI 调用（带 prompt cache）
  const step1Output = input.previousOutputs['step-scenario-discovery']
  const step2Output = input.previousOutputs['step-input-parsing']
  const systemPrompt = getStepSystemPrompt('step-3-dimension-discovery', CURRENT_PROMPT_VERSION)
  const userPrompt = buildStep3UserPrompt(
    input.sources,
    step1Output as Record<string, unknown>,
    step2Output as Record<string, unknown>,
  )
  const aiResponse = await callAI(userPrompt, systemPrompt, 2, input.aiConfig, {
    enabled: true,
    cacheInstance: analysisCache,
  })

  const parsed = extractJSON(aiResponse.content)
  const reasoningTrace = parsed?.reasoning_trace as ReasoningStep[] | undefined
  const reasoningStep = reasoningTrace?.find((r) =>
    String(r.step).toUpperCase().includes('DIMENSION'),
  )

  const rawDimensions = parsed?.dimensions as
    | Array<{ name?: string; description?: string }>
    | string[]
    | undefined
  const dimensions: string[] = Array.isArray(rawDimensions)
    ? rawDimensions.map((d) => (typeof d === 'string' ? d : d.name || ''))
    : []
  const categoriesRaw = parsed?.categories
  const categories: Record<string, string[]> =
    categoriesRaw && !Array.isArray(categoriesRaw) && typeof categoriesRaw === 'object'
      ? (categoriesRaw as Record<string, string[]>)
      : Array.isArray(categoriesRaw)
        ? { all: categoriesRaw as string[] }
        : {}

  return {
    data: {
      dimensions,
      dimensionCount: dimensions.length,
      categories,
      reasoning: reasoningStep?.result || '维度发现完成',
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
