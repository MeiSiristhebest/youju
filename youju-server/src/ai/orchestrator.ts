import type { AIRawOutput, AnalyzeResult, Evidence, Source } from '../domain/types.js'
import { analysisAdapter } from './adapters/analysisAdapter.js'
import { draftAdapter } from './adapters/draftAdapter.js'
import { mockAnalyze } from './mock.js'

export interface AIAnalysisResult {
  parsed: AIRawOutput | null
  model: string
  tokenPrompt: number
  tokenCompletion: number
  rawOutput: string
  isMock: boolean
}

/**
 * @deprecated 请使用 analysisAdapter.analyze() 替代
 * 旧接口，内部委托给 AnalysisAdapter
 */
export async function runAIAnalysis(
  sources: Source[],
  scenarioType?: string,
  scenarioKnowledge?: Array<{
    dimension: string
    riskType: string
    frequency: number
    avgConfidence: number
  }>,
): Promise<AIAnalysisResult> {
  const result = await analysisAdapter.analyze(sources, {
    scenarioType,
    scenarioKnowledge: scenarioKnowledge as any,
  })

  const finalResult = result.result
  const debugInfo = finalResult.debugInfo

  let parsed: AIRawOutput | null = null
  try {
    if (debugInfo?.rawOutput) {
      parsed = JSON.parse(debugInfo.rawOutput) as AIRawOutput
    }
  } catch {
    parsed = null
  }

  return {
    parsed,
    model: debugInfo?.model || '',
    tokenPrompt: debugInfo?.tokenPrompt || 0,
    tokenCompletion: debugInfo?.tokenCompletion || 0,
    rawOutput: debugInfo?.rawOutput || '',
    isMock: result.isMock,
  }
}

/**
 * @deprecated 请使用 draftAdapter.generateDraft() 替代
 * 旧接口，内部委托给 DraftAdapter
 */
export async function runAIDraftGeneration(
  risk: {
    title: string
    description: string
    evidence: Evidence[]
  },
  context?: string,
  stylePref?: {
    formality?: number
    friendliness?: number
    conciseness?: number
    preferredTone?: string
  },
): Promise<string> {
  return draftAdapter.generateDraft(risk, context, stylePref)
}

/**
 * @deprecated 请使用 analysisAdapter.analyze() 替代
 */
export function getMockAnalysisResult(sources: Source[]): AnalyzeResult {
  return mockAnalyze(sources)
}
