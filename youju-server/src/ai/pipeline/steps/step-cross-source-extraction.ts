import type { AIRawOutput, ReasoningStep, SharedMainCallResult } from '../../../domain/types.js'
import { CURRENT_PROMPT_VERSION } from '../../prompts/index.js'
import type { StepExecutor, StepInput, StepOutput } from '../types.js'

type ExtractedEntityRaw = AIRawOutput['extracted_entities'][number]

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

const MAIN_CALL_STEP_COUNT = 5

export const stepCrossSourceExtraction: StepExecutor = async (
  input: StepInput,
): Promise<StepOutput> => {
  const startTime = Date.now()

  const scenarioOutput = input.previousOutputs['step-scenario-discovery'] as
    | { mainCallResult?: SharedMainCallResult }
    | undefined
  const mainResult = scenarioOutput?.mainCallResult
  const parsed = mainResult?.parsed

  const extractedEntities: ExtractedEntityRaw[] = parsed?.extracted_entities || []

  const byDimension: Record<string, ExtractedEntityRaw[]> = {}
  for (const entity of extractedEntities) {
    if (!byDimension[entity.dimension]) {
      byDimension[entity.dimension] = []
    }
    byDimension[entity.dimension].push(entity)
  }

  const reasoningStep = parsed?.reasoning_trace?.find(
    (r: ReasoningStep) =>
      String(r.step).toUpperCase().includes('EXTRACTION') ||
      String(r.step).toUpperCase().includes('CROSS'),
  )

  const tokenPrompt = mainResult ? Math.ceil(mainResult.tokenPrompt / MAIN_CALL_STEP_COUNT) : 0
  const tokenCompletion = mainResult
    ? Math.ceil(mainResult.tokenCompletion / MAIN_CALL_STEP_COUNT)
    : 0

  return {
    data: {
      entities: extractedEntities,
      byDimension,
      totalExtracted: extractedEntities.length,
      reasoning: reasoningStep?.result || '跨源提取完成',
    },
    modelVersion: mainResult?.model || process.env.AI_MODEL || 'mock-rule-engine',
    promptVersion: CURRENT_PROMPT_VERSION,
    tokenPrompt,
    tokenCompletion,
    latencyMs: Date.now() - startTime,
  }
}
