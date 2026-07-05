import {
  calculateStepDurations,
  generateNonLinearProgress,
  generateTokenStats,
  perturbResult,
  seededRandom,
} from '../algorithms/analysisSimulator'
import { DEMO_RESULTS } from '../constants/demoData'
import type { AnalyzeResult, Source } from '../types'

const ANALYSIS_STEPS = [
  { key: 'scenario', name: '场景识别', desc: '理解材料内容，识别场景类型' },
  { key: 'parsing', name: '解析材料', desc: '提取每份材料的关键信息' },
  { key: 'dimensions', name: '维度发现', desc: '自动发现需要比对的重要维度' },
  { key: 'extraction', name: '跨源提取', desc: '从各材料中提取对应维度的值' },
  { key: 'detection', name: '差异检测', desc: '比对冲突、承诺、缺失信息' },
  { key: 'validation', name: '证据校验', desc: '验证每个结论的证据链' },
  { key: 'output', name: '生成报告', desc: '整理分析结果和检查清单' },
]

export interface DemoStreamCallbacks {
  onInit?: (data: { analysisId: string; totalSteps: number }) => void
  onStepStart?: (data: {
    stepIndex: number
    stepId: string
    stepName: string
    stepDesc: string
  }) => void
  onStepProgress?: (data: {
    stepIndex: number
    stepId: string
    progress: number
    message?: string
  }) => void
  onStepComplete?: (data: { stepIndex: number; stepId: string; stepName: string }) => void
  onProgress?: (progress: number, message?: string) => void
  onComplete?: (result: AnalyzeResult) => void
  onError?: (error: string) => void
}

export function isDemoScenario(scenarioType: string | null): boolean {
  if (!scenarioType) return false
  return Object.keys(DEMO_RESULTS).includes(scenarioType)
}

export async function runDemoAnalysisStream(
  sources: Source[],
  scenarioType: string,
  callbacks: DemoStreamCallbacks,
  options?: {
    isIncremental?: boolean
    previousResult?: AnalyzeResult | null
    abortSignal?: AbortSignal
  },
): Promise<AnalyzeResult> {
  const { isIncremental = false, previousResult, abortSignal } = options || {}

  const startTime = Date.now()
  const seed = startTime + Math.floor(Math.random() * 1000000)
  const _rand = seededRandom(seed)

  const totalChars = sources.reduce((sum, s) => sum + (s.content?.length || 0), 0)
  const baseResult = DEMO_RESULTS[scenarioType as keyof typeof DEMO_RESULTS]

  if (!baseResult) {
    const errorMsg = `未知场景: ${scenarioType}`
    callbacks.onError?.(errorMsg)
    throw new Error(errorMsg)
  }

  const riskCount = baseResult.risks?.length || 5
  const newSourceCount = isIncremental
    ? sources.length - (previousResult?.meta?.sourceCount || 0)
    : 0

  const stepDurations = calculateStepDurations({
    seed,
    sourceCount: sources.length,
    totalChars,
    riskCount,
    isIncremental,
    incrementalNewSourceCount: newSourceCount,
  })

  const totalSteps = ANALYSIS_STEPS.length
  const analysisId = `ana_${startTime.toString(36)}`

  const checkAborted = () => {
    if (abortSignal?.aborted) {
      throw new DOMException('Aborted', 'AbortError')
    }
  }

  const delay = (ms: number) =>
    new Promise<void>((resolve, reject) => {
      if (abortSignal?.aborted) {
        reject(new DOMException('Aborted', 'AbortError'))
        return
      }
      const timer = setTimeout(() => {
        resolve()
      }, ms)
      abortSignal?.addEventListener(
        'abort',
        () => {
          clearTimeout(timer)
          reject(new DOMException('Aborted', 'AbortError'))
        },
        { once: true },
      )
    })

  try {
    callbacks.onInit?.({
      analysisId,
      totalSteps,
    })

    let lastProgress = 0

    for (let i = 0; i < totalSteps; i++) {
      checkAborted()

      const step = ANALYSIS_STEPS[i]

      callbacks.onStepStart?.({
        stepIndex: i,
        stepId: step.key,
        stepName: step.name,
        stepDesc: step.desc,
      })

      const stepStartProgress = (i / totalSteps) * 100
      lastProgress = stepStartProgress
      callbacks.onProgress?.(stepStartProgress, `正在${step.name}...`)

      const progressPoints = generateNonLinearProgress(stepDurations[i], i, seed)

      for (const point of progressPoints) {
        checkAborted()
        await delay(point.delay)

        callbacks.onStepProgress?.({
          stepIndex: i,
          stepId: step.key,
          progress: point.progress,
        })

        const overallProgress = ((i + point.progress / 100) / totalSteps) * 100
        lastProgress = Math.max(lastProgress, overallProgress)
        callbacks.onProgress?.(lastProgress)
      }

      callbacks.onStepComplete?.({
        stepIndex: i,
        stepId: step.key,
        stepName: step.name,
      })

      const stepCompleteProgress = ((i + 1) / totalSteps) * 100
      lastProgress = stepCompleteProgress
      callbacks.onProgress?.(stepCompleteProgress, `${step.name}完成`)
    }

    checkAborted()

    const perturbed = perturbResult(baseResult, seed)

    if (perturbed.meta) {
      perturbed.meta.durationMs = Date.now() - startTime
      perturbed.meta.analysisId = analysisId
      perturbed.meta.sourceCount = sources.length
      perturbed.meta.sourceIds = sources.map((s) => s.id)
      perturbed.meta.isIncremental = isIncremental
    }

    const tokenStats = generateTokenStats(sources, riskCount, seed)
    if (perturbed.debugInfo) {
      perturbed.debugInfo.tokenPrompt = tokenStats.promptTokens
      perturbed.debugInfo.tokenCompletion = tokenStats.completionTokens
      perturbed.debugInfo.tokenTotal = tokenStats.totalTokens
      perturbed.debugInfo.model = tokenStats.model
      perturbed.debugInfo.estimatedCost = tokenStats.estimatedCost
    }

    callbacks.onProgress?.(100, '分析完成')
    callbacks.onComplete?.(perturbed)

    return perturbed
  } catch (error) {
    if ((error as Error).name === 'AbortError') {
      throw error
    }
    const errorMsg = (error as Error).message || '分析失败'
    callbacks.onError?.(errorMsg)
    throw error
  }
}

export async function runDemoDraftStream(
  risk: {
    id: string
    title: string
    description: string
  },
  sourceNames: string[],
  onDelta: (text: string) => void,
  options?: {
    abortSignal?: AbortSignal
  },
): Promise<string> {
  const { generateStreamChunks, generateDraftContent } = await import(
    '../algorithms/analysisSimulator'
  )

  const seed = Date.now() + Math.floor(Math.random() * 1000000)
  const fullText = generateDraftContent({
    seed,
    riskTitle: risk.title,
    riskDescription: risk.description,
    sourceNames,
  })

  const chunks = generateStreamChunks(fullText, seed, 'normal')

  const checkAborted = () => {
    if (options?.abortSignal?.aborted) {
      throw new DOMException('Aborted', 'AbortError')
    }
  }

  const delay = (ms: number) =>
    new Promise<void>((resolve, reject) => {
      if (options?.abortSignal?.aborted) {
        reject(new DOMException('Aborted', 'AbortError'))
        return
      }
      const timer = setTimeout(() => {
        resolve()
      }, ms)
      options?.abortSignal?.addEventListener(
        'abort',
        () => {
          clearTimeout(timer)
          reject(new DOMException('Aborted', 'AbortError'))
        },
        { once: true },
      )
    })

  let result = ''

  for (const chunk of chunks) {
    checkAborted()
    if (chunk.delay > 0) {
      await delay(chunk.delay)
    }
    if (chunk.text) {
      result += chunk.text
      onDelta(chunk.text)
    }
  }

  return result
}
