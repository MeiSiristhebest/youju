import type { ReasoningStep, SharedMainCallResult } from '../../../domain/types.js'
import { CURRENT_PROMPT_VERSION } from '../../prompts/index.js'
import type { StepExecutor, StepInput, StepOutput } from '../types.js'

export const systemPromptFragment = `
Step 3: DIMENSION DISCOVERY (KEY INNOVATION)
From all materials, extract the meaningful dimensions that should be compared.
These are NOT pre-defined — you DISCOVER them from the content.

For each dimension you identify:
  • What is it? (e.g., "monthly salary", "move-in date", "security deposit", "delivery deadline")
  • Why does it matter? (why is this dimension important to verify?)
  • What type of value? (number, date, boolean, text)

Dimension categories you commonly find (but are NOT limited to):
  • Financial: price, salary, deposit, fine, compensation, bonus
  • Temporal: start date, deadline, duration, trial period, validity
  • Legal/Contractual: liability, termination conditions, penalty clauses, responsibilities
  • Quality/Scope: deliverables, specifications, inclusions/exclusions
  • Logistics: location, delivery method, parties involved
  • Benefits: welfare, insurance, perks, amenities

IMPORTANT: Always discover dimensions from the actual content, never force-fit a template.
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

const MAIN_CALL_STEP_COUNT = 5

export const stepDimensionDiscovery: StepExecutor = async (
  input: StepInput,
): Promise<StepOutput> => {
  const startTime = Date.now()

  const scenarioOutput = input.previousOutputs['step-scenario-discovery'] as
    | { mainCallResult?: SharedMainCallResult }
    | undefined
  const mainResult = scenarioOutput?.mainCallResult
  const parsed = mainResult?.parsed

  const dimensions: string[] = []
  if (parsed?.scenario?.key_dimensions) {
    dimensions.push(...parsed.scenario.key_dimensions)
  }
  if (parsed?.extracted_entities) {
    for (const entity of parsed.extracted_entities) {
      if (!dimensions.includes(entity.dimension)) {
        dimensions.push(entity.dimension)
      }
    }
  }
  if (parsed?.risks) {
    for (const risk of parsed.risks) {
      if (!dimensions.includes(risk.dimension)) {
        dimensions.push(risk.dimension)
      }
    }
  }

  const reasoningStep = parsed?.reasoning_trace?.find((r: ReasoningStep) =>
    String(r.step).toUpperCase().includes('DIMENSION'),
  )

  const tokenPrompt = mainResult ? Math.ceil(mainResult.tokenPrompt / MAIN_CALL_STEP_COUNT) : 0
  const tokenCompletion = mainResult
    ? Math.ceil(mainResult.tokenCompletion / MAIN_CALL_STEP_COUNT)
    : 0

  return {
    data: {
      dimensions,
      dimensionCount: dimensions.length,
      reasoning: reasoningStep?.result || '维度发现完成',
    },
    modelVersion: mainResult?.model || process.env.AI_MODEL || 'mock-rule-engine',
    promptVersion: CURRENT_PROMPT_VERSION,
    tokenPrompt,
    tokenCompletion,
    latencyMs: Date.now() - startTime,
  }
}

function _categorizeDimensions(dimensions: string[]): Record<string, string[]> {
  const categories: Record<string, string[]> = {
    financial: [],
    temporal: [],
    legal: [],
    quality: [],
    logistics: [],
    benefits: [],
    other: [],
  }

  for (const dim of dimensions) {
    const d = dim.toLowerCase()
    if (d.match(/salary|price|cost|fee|deposit|bonus|compensation|amount|pay|薪|金|钱|费/)) {
      categories.financial.push(dim)
    } else if (d.match(/date|deadline|duration|start|end|trial|period|time|期|时间|日期/)) {
      categories.temporal.push(dim)
    } else if (d.match(/liability|termination|responsibility|legal|contract|责任|义务|条款/)) {
      categories.legal.push(dim)
    } else if (d.match(/quality|scope|deliverable|spec|质量|范围/)) {
      categories.quality.push(dim)
    } else if (d.match(/location|delivery|logistics|地点|位置|交付/)) {
      categories.logistics.push(dim)
    } else if (d.match(/benefit|welfare|insurance|perk|福利|保险/)) {
      categories.benefits.push(dim)
    } else {
      categories.other.push(dim)
    }
  }

  return categories
}
