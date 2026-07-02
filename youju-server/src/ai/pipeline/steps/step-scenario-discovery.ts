import type { AIRawOutput } from '../../../domain/types.js'
import { callAI } from '../../llm.js'
import { mockAnalyze } from '../../mock.js'
import {
  buildAnalysisUserPrompt,
  CURRENT_PROMPT_VERSION,
  getAnalysisSystemPrompt,
} from '../../prompts/index.js'
import { extractAndValidateJSON } from '../../validator.js'
import type { StepExecutor, StepInput, StepOutput } from '../types.js'

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

let sharedMainCallResult: {
  parsed: AIRawOutput | null
  model: string
  tokenPrompt: number
  tokenCompletion: number
  rawOutput: string
  isMock: boolean
} | null = null

let sharedMainCallPromise: Promise<void> | null = null

async function ensureMainCallExecuted(input: StepInput): Promise<void> {
  if (sharedMainCallResult) return
  if (sharedMainCallPromise) return sharedMainCallPromise

  sharedMainCallPromise = (async () => {
    const isMock = !process.env.AI_API_KEY

    if (isMock) {
      const mockResult = mockAnalyze(input.sources)
      let parsed: AIRawOutput | null = null
      try {
        parsed = JSON.parse(mockResult.debugInfo?.rawOutput || '{}') as AIRawOutput
      } catch {
        parsed = null
      }
      sharedMainCallResult = {
        parsed,
        model: mockResult.debugInfo?.model || 'mock-rule-engine',
        tokenPrompt: mockResult.debugInfo?.tokenPrompt || 0,
        tokenCompletion: mockResult.debugInfo?.tokenCompletion || 0,
        rawOutput: mockResult.debugInfo?.rawOutput || '',
        isMock: true,
      }
      return
    }

    const systemPrompt = getAnalysisSystemPrompt(CURRENT_PROMPT_VERSION)
    const userPrompt = buildAnalysisUserPrompt(
      input.sources,
      input.scenarioType,
      input.scenarioKnowledge as any,
      CURRENT_PROMPT_VERSION,
    )
    const aiResponse = await callAI(userPrompt, systemPrompt, 2)
    const parsed = extractAndValidateJSON(aiResponse.content)

    if (!parsed) {
      console.log('[AI] Output schema validation failed, falling back to mock')
      const mockResult = mockAnalyze(input.sources)
      let mockParsed: AIRawOutput | null = null
      try {
        mockParsed = JSON.parse(mockResult.debugInfo?.rawOutput || '{}') as AIRawOutput
      } catch {
        mockParsed = null
      }
      sharedMainCallResult = {
        parsed: mockParsed,
        model: mockResult.debugInfo?.model || 'mock-rule-engine',
        tokenPrompt: mockResult.debugInfo?.tokenPrompt || 0,
        tokenCompletion: mockResult.debugInfo?.tokenCompletion || 0,
        rawOutput: mockResult.debugInfo?.rawOutput || '',
        isMock: true,
      }
      return
    }

    if ((parsed as any).error) {
      console.log('[AI] Analysis error:', (parsed as any).error, (parsed as any).details)
      const mockResult = mockAnalyze(input.sources)
      let mockParsed: AIRawOutput | null = null
      try {
        mockParsed = JSON.parse(mockResult.debugInfo?.rawOutput || '{}') as AIRawOutput
      } catch {
        mockParsed = null
      }
      sharedMainCallResult = {
        parsed: mockParsed,
        model: mockResult.debugInfo?.model || 'mock-rule-engine',
        tokenPrompt: mockResult.debugInfo?.tokenPrompt || 0,
        tokenCompletion: mockResult.debugInfo?.tokenCompletion || 0,
        rawOutput: mockResult.debugInfo?.rawOutput || '',
        isMock: true,
      }
      return
    }

    sharedMainCallResult = {
      parsed,
      model: aiResponse.model,
      tokenPrompt: aiResponse.tokenPrompt,
      tokenCompletion: aiResponse.tokenCompletion,
      rawOutput: aiResponse.content,
      isMock: false,
    }
  })()

  return sharedMainCallPromise
}

export function getSharedMainCallResult() {
  return sharedMainCallResult
}

export function resetSharedMainCallResult() {
  sharedMainCallResult = null
  sharedMainCallPromise = null
}

const MAIN_CALL_STEP_COUNT = 5

export const stepScenarioDiscovery: StepExecutor = async (
  input: StepInput,
): Promise<StepOutput> => {
  const startTime = Date.now()

  await ensureMainCallExecuted(input)
  const result = sharedMainCallResult!

  const parsed = result.parsed
  let scenarioData: any = null

  if (parsed?.scenario) {
    scenarioData = {
      type: parsed.scenario.type,
      description: parsed.scenario.description,
      keyDimensions: parsed.scenario.key_dimensions || [],
    }
  } else {
    scenarioData = {
      type: input.scenarioType || 'custom',
      description: '自动识别场景',
      keyDimensions: [],
    }
  }

  const reasoningStep = parsed?.reasoning_trace?.find((r: any) =>
    String(r.step).toUpperCase().includes('SCENARIO'),
  )

  const tokenPrompt = Math.ceil(result.tokenPrompt / MAIN_CALL_STEP_COUNT)
  const tokenCompletion = Math.ceil(result.tokenCompletion / MAIN_CALL_STEP_COUNT)

  return {
    data: {
      scenario: scenarioData,
      reasoning: reasoningStep?.result || '场景识别完成',
      _rawParsed: parsed,
      _isMock: result.isMock,
      _rawOutput: result.rawOutput,
    },
    modelVersion: result.model,
    promptVersion: CURRENT_PROMPT_VERSION,
    tokenPrompt,
    tokenCompletion,
    latencyMs: Date.now() - startTime,
    rawOutput: result.rawOutput,
  }
}
