import type { ReasoningStep } from '../../../domain/types.js'
import { isMockMode } from '../../../infrastructure/env.js'
import { callAI } from '../../llm.js'
import { generateMockStepData } from '../../mock.js'
import { analysisCache } from '../../promptCache.js'
import { CURRENT_PROMPT_VERSION, getStepSystemPrompt } from '../../prompts/index.js'
import { buildStep1UserPrompt } from '../../prompts/stepUserPrompts.js'
import { extractJSON } from '../../validator.js'
import type { StepExecutor, StepInput, StepOutput } from '../types.js'

interface ScenarioData {
  type: string
  description: string
  keyDimensions: string[]
}

export const systemPromptFragment = `
Step 1: INTENT CLASSIFICATION & SCENARIO DISCOVERY
- Task type: evaluation + extraction + reasoning + comparison
- First, UNDERSTAND what the materials are about
- Auto-detect the domain/scenario (job offer, rental contract, homework submission, purchase agreement, etc.)
- Identify the key dimensions that matter for THIS scenario
- Do NOT rely on a fixed list of dimensions — discover them from the material
`

export const outputSchema = {
  scenario: {
    type: 'string',
    description:
      'auto-detected scenario type (e.g., job_offer, rental_contract, homework_submission, purchase, service_agreement)',
  },
  description: {
    type: 'string',
    description: '1-sentence description of what these materials are about',
  },
  key_dimensions: {
    type: 'array',
    items: { type: 'string' },
    description: 'key dimensions discovered for this scenario',
  },
}

export const stepScenarioDiscovery: StepExecutor = async (
  input: StepInput,
): Promise<StepOutput> => {
  const startTime = Date.now()
  const isMock = isMockMode(input.aiConfig?.apiKey, input.isDemo)

  // Mock 模式：从 generateMockStepData 获取独立步骤数据
  if (isMock) {
    const mockData = generateMockStepData(input.sources)
    return {
      data: {
        scenario: mockData.scenarioDiscovery.scenario,
        reasoning: mockData.scenarioDiscovery.reasoning,
      },
      modelVersion: 'mock-rule-engine',
      promptVersion: CURRENT_PROMPT_VERSION,
      tokenPrompt: 0,
      tokenCompletion: 0,
      latencyMs: Date.now() - startTime,
    }
  }

  // 真实模式：独立 AI 调用（带 prompt cache）
  const systemPrompt = getStepSystemPrompt('step-1-scenario', CURRENT_PROMPT_VERSION)
  const userPrompt = buildStep1UserPrompt(
    input.sources,
    input.scenarioType,
    input.scenarioKnowledge,
  )
  const aiResponse = await callAI(userPrompt, systemPrompt, 2, input.aiConfig, {
    enabled: true,
    cacheInstance: analysisCache,
  })

  console.log('[Step1] AI response length:', aiResponse.content.length)
  console.log('[Step1] AI response preview:', aiResponse.content.slice(0, 500))

  const parsed = extractJSON(aiResponse.content)

  const scenarioRaw = parsed?.scenario as
    | { type?: string; description?: string; key_dimensions?: string[] }
    | undefined
  const reasoningTrace = parsed?.reasoning_trace as ReasoningStep[] | undefined

  const scenarioData: ScenarioData = scenarioRaw
    ? {
        type: scenarioRaw.type || input.scenarioType || 'custom',
        description: scenarioRaw.description || '自动识别场景',
        keyDimensions: scenarioRaw.key_dimensions || [],
      }
    : {
        type: input.scenarioType || 'custom',
        description: '自动识别场景',
        keyDimensions: [],
      }

  const reasoningStep = reasoningTrace?.find((r) =>
    String(r.step).toUpperCase().includes('SCENARIO'),
  )

  return {
    data: {
      scenario: scenarioData,
      reasoning: reasoningStep?.result || '场景识别完成',
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
