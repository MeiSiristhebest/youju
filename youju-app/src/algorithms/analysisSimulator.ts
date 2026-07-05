import type {
  AnalysisDimension,
  AnalyzeResult,
  ChecklistItem,
  ReasoningStep,
  Risk,
  Source,
} from '../types'

const STEP_BASE_WEIGHTS = [0.08, 0.18, 0.12, 0.22, 0.2, 0.14, 0.06]

const MODEL_CONFIGS = {
  primary: { name: 'gpt-4o', tokensPerSecond: 35, costPer1kInput: 0.0025, costPer1kOutput: 0.01 },
  fast: {
    name: 'gpt-4o-mini',
    tokensPerSecond: 80,
    costPer1kInput: 0.00015,
    costPer1kOutput: 0.0006,
  },
}

export function seededRandom(seed: number): () => number {
  let s = seed
  return () => {
    s = (s * 9301 + 49297) % 233280
    return s / 233280
  }
}

function estimateTokens(text: string): number {
  const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length
  const englishWords = text.split(/\s+/).filter((w) => w.length > 0).length
  return Math.floor(chineseChars * 0.6 + englishWords * 1.3 + text.length * 0.15)
}

export interface SimulationConfig {
  seed?: number
  sourceCount?: number
  totalChars?: number
  riskCount?: number
  isIncremental?: boolean
  incrementalNewSourceCount?: number
}

export function calculateStepDurations(config: SimulationConfig): number[] {
  const {
    seed = Date.now(),
    sourceCount = 3,
    totalChars = 5000,
    riskCount = 6,
    isIncremental = false,
    incrementalNewSourceCount = 1,
  } = config

  const rand = seededRandom(seed)
  const baseMultiplier = isIncremental ? 0.35 + incrementalNewSourceCount * 0.1 : 1.0

  const sourceFactor = 0.7 + sourceCount * 0.15
  const charFactor = 0.7 + Math.min(totalChars / 10000, 1.5)
  const riskFactor = 0.8 + riskCount * 0.05

  const globalMultiplier = sourceFactor * charFactor * riskFactor * baseMultiplier

  const baseDurations = [
    800,
    1200 + sourceCount * 300,
    900,
    1500 + sourceCount * 200 + riskCount * 80,
    1400 + riskCount * 120,
    1000 + riskCount * 100,
    600,
  ]

  return baseDurations.map((base, i) => {
    const jitter = 0.75 + rand() * 0.5
    const weight = STEP_BASE_WEIGHTS[i]
    const adjusted = base * globalMultiplier * weight * 4 * jitter
    return Math.max(200, Math.floor(adjusted))
  })
}

export function generateNonLinearProgress(
  stepDuration: number,
  stepIndex: number,
  seed: number,
): Array<{ delay: number; progress: number }> {
  const rand = seededRandom(seed + stepIndex * 1000)
  const subSteps = 8 + Math.floor(rand() * 6)
  const points: Array<{ delay: number; progress: number }> = []

  const curveType = stepIndex % 3
  let _accumulated = 0

  for (let i = 0; i < subSteps; i++) {
    const t = (i + 1) / subSteps
    let progressRatio: number

    switch (curveType) {
      case 0:
        progressRatio = 1 - (1 - t) ** 2
        break
      case 1:
        progressRatio = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2
        break
      case 2:
        progressRatio = t ** 1.5
        break
      default:
        progressRatio = t
    }

    const jitter = (rand() - 0.5) * 0.08
    progressRatio = Math.max(0.01, Math.min(0.99, progressRatio + jitter))

    const delayPortion = 0.7 + rand() * 0.6
    const delay = (stepDuration / subSteps) * delayPortion

    _accumulated += delay
    points.push({
      delay: Math.floor(delay),
      progress: Math.floor(progressRatio * 1000) / 10,
    })
  }

  if (rand() > 0.7) {
    const pauseIndex = Math.floor(rand() * (subSteps - 2)) + 1
    points[pauseIndex].delay += Math.floor(200 + rand() * 400)
  }

  return points
}

export function generateTokenStats(
  sources: Source[],
  riskCount: number,
  seed: number,
): {
  promptTokens: number
  completionTokens: number
  totalTokens: number
  model: string
  estimatedCost: number
} {
  const rand = seededRandom(seed)
  const totalText = sources.map((s) => s.content).join('\n')
  const inputTokens = estimateTokens(totalText)

  const systemPromptTokens = 800 + Math.floor(rand() * 200)
  const stepOutputTokens = [
    50 + Math.floor(rand() * 30),
    sources.length * (80 + Math.floor(rand() * 40)),
    60 + Math.floor(rand() * 40),
    riskCount * (120 + Math.floor(rand() * 60)),
    riskCount * (100 + Math.floor(rand() * 50)),
    riskCount * (80 + Math.floor(rand() * 40)),
    150 + Math.floor(rand() * 80),
  ]

  const completionTokens = stepOutputTokens.reduce((a, b) => a + b, 0)
  const promptTokens = inputTokens + systemPromptTokens
  const totalTokens = promptTokens + completionTokens

  const model = rand() > 0.3 ? MODEL_CONFIGS.primary.name : MODEL_CONFIGS.fast.name
  const config = model === MODEL_CONFIGS.primary.name ? MODEL_CONFIGS.primary : MODEL_CONFIGS.fast
  const estimatedCost =
    (promptTokens / 1000) * config.costPer1kInput +
    (completionTokens / 1000) * config.costPer1kOutput

  return {
    promptTokens: Math.floor(promptTokens),
    completionTokens: Math.floor(completionTokens),
    totalTokens: Math.floor(totalTokens),
    model,
    estimatedCost: Math.round(estimatedCost * 10000) / 10000,
  }
}

function shallowClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj))
}

export function perturbResult(result: AnalyzeResult, seed: number): AnalyzeResult {
  const rand = seededRandom(seed)
  const perturbed = shallowClone(result)

  if (perturbed.risks && perturbed.risks.length > 2) {
    const swapCount = Math.floor(rand() * 2) + 1
    for (let i = 0; i < swapCount; i++) {
      const idx1 = Math.floor(rand() * perturbed.risks.length)
      const idx2 = Math.floor(rand() * perturbed.risks.length)
      if (idx1 !== idx2) {
        const temp = perturbed.risks[idx1]
        perturbed.risks[idx1] = perturbed.risks[idx2]
        perturbed.risks[idx2] = temp
      }
    }

    perturbed.risks.forEach((risk: Risk) => {
      if (risk.confidence !== undefined) {
        const delta = (rand() - 0.5) * 10
        risk.confidence = Math.max(50, Math.min(99, risk.confidence + delta))
        risk.confidence = Math.round(risk.confidence)
      }
      if (risk.evidence && risk.evidence.length > 0) {
        risk.evidence.forEach((ev) => {
          if (ev.confidence !== undefined) {
            const delta = (rand() - 0.5) * 6
            ev.confidence = Math.max(60, Math.min(99, ev.confidence + delta))
            ev.confidence = Math.round(ev.confidence)
          }
        })
      }
    })
  }

  if (perturbed.checklist && perturbed.checklist.length > 0) {
    const shuffled = [...perturbed.checklist]
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1))
      if (rand() > 0.7) {
        ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
      }
    }
    perturbed.checklist = shuffled as ChecklistItem[]
  }

  if (perturbed.dimensions && perturbed.dimensions.length > 0) {
    perturbed.dimensions.forEach((dim: AnalysisDimension) => {
      if (dim.weight !== undefined) {
        const delta = (rand() - 0.5) * 0.05
        dim.weight = Math.max(0.5, Math.min(1.5, dim.weight + delta))
        dim.weight = Math.round(dim.weight * 100) / 100
      }
    })
  }

  if (perturbed.reasoningTrace && perturbed.reasoningTrace.length > 0) {
    perturbed.reasoningTrace.forEach((step: ReasoningStep, _i: number) => {
      const durationJitter = 0.85 + rand() * 0.3
      step.durationMs = Math.floor((step.durationMs || 1000) * durationJitter)
      if (step.tokenUsage !== undefined) {
        step.tokenUsage = Math.floor(step.tokenUsage * (0.9 + rand() * 0.2))
      }
    })
  }

  if (perturbed.meta) {
    perturbed.meta.durationMs = 0
    delete perturbed.meta.isMock
    perturbed.meta.analysisId = `ana_${Date.now().toString(36)}_${Math.floor(rand() * 10000).toString(36)}`
    perturbed.meta.model = perturbed.debugInfo?.model || 'gpt-4o'
  }

  return perturbed as AnalyzeResult
}

export function generateRequestId(seed?: number): string {
  const rand = seed ? seededRandom(seed) : Math.random
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  let id = 'req_'
  for (let i = 0; i < 16; i++) {
    id += chars[Math.floor(rand() * chars.length)]
  }
  return id
}

export function simulateLatency(baseMs: number, variance: number = 0.3): number {
  const jitter = 1 + (Math.random() - 0.5) * variance * 2
  return Math.floor(baseMs * Math.max(0.5, jitter))
}

const DRAFT_TEMPLATES = [
  {
    greeting: ['您好，', '你好，', 'Hi，', '您好！', '你好！'],
    opening: [
      '关于之前沟通的内容，有几点想跟您确认一下。',
      '麻烦您帮忙核实以下事项，非常感谢。',
      '在推进之前，想先跟您对齐一下关键信息。',
      '有几个问题想跟您确认，方便的时候麻烦回复一下。',
      '为了确保理解一致，我整理了几点需要核实的内容。',
    ],
    closing: [
      '麻烦抽空看一下，有问题随时沟通。谢谢！',
      '期待您的回复，感谢配合！',
      '方便的时候请告知，谢谢。',
      '辛苦确认一下，有任何疑问随时联系。',
      '感谢您的时间，期待回复！',
    ],
    signoff: ['', '祝好\n', '顺颂时祺\n', '此致\n敬礼\n', '谢谢\n'],
  },
]

interface DraftGenerateOptions {
  seed?: number
  riskTitle: string
  riskDescription: string
  sourceNames: string[]
  formality?: number
  style?: 'polite' | 'direct' | 'neutral'
}

export function generateDraftContent(options: DraftGenerateOptions): string {
  const { seed = Date.now(), riskTitle, riskDescription, sourceNames, style = 'polite' } = options

  const rand = seededRandom(seed)
  const tpl = DRAFT_TEMPLATES[0]

  const greeting = tpl.greeting[Math.floor(rand() * tpl.greeting.length)]
  const opening = tpl.opening[Math.floor(rand() * tpl.opening.length)]
  const closing = tpl.closing[Math.floor(rand() * tpl.closing.length)]
  const signoff = tpl.signoff[Math.floor(rand() * tpl.signoff.length)]

  const sourcesText = sourceNames.length > 0 ? sourceNames.join('、') : '相关材料'

  const descFirstLine = riskDescription.split(/[。\n]/)[0] || riskDescription.slice(0, 50)

  let body = ''

  if (style === 'direct') {
    body = `关于「${riskTitle}」：\n${riskDescription}\n\n以上内容来自${sourcesText}，请确认是否属实。`
  } else if (style === 'polite') {
    body = `关于「${riskTitle}」：\n我们在整理材料时注意到，${descFirstLine}。\n\n涉及的材料包括：${sourcesText}\n\n想跟您确认一下实际情况是怎样的？如果方便的话，能否以书面形式回复一下？`
  } else {
    body = `关于「${riskTitle}」：\n${riskDescription}\n\n以上信息来源于${sourcesText}，请核实实际情况。`
  }

  return `${greeting}\n\n${opening}\n\n${body}\n\n${closing}\n${signoff}`
}

export interface StreamChunk {
  text: string
  delay: number
}

export function generateStreamChunks(
  fullText: string,
  seed: number,
  speed: 'slow' | 'normal' | 'fast' = 'normal',
): StreamChunk[] {
  const rand = seededRandom(seed)
  const chunks: StreamChunk[] = []

  const speedMap = { slow: 80, normal: 40, fast: 20 }
  const baseDelay = speedMap[speed]

  const paragraphs = fullText.split('\n')

  for (let p = 0; p < paragraphs.length; p++) {
    const para = paragraphs[p]
    let i = 0

    while (i < para.length) {
      const chunkSize = Math.floor(rand() * 4) + 1
      const chunk = para.slice(i, i + chunkSize)
      i += chunkSize

      const delayJitter = 0.6 + rand() * 0.8
      const delay = Math.floor(baseDelay * chunkSize * delayJitter)

      chunks.push({ text: chunk, delay })
    }

    if (p < paragraphs.length - 1) {
      chunks.push({ text: '\n', delay: baseDelay * 2 })
    }

    if (rand() > 0.75 && p < paragraphs.length - 1) {
      const pausePos = Math.floor(chunks.length * rand())
      chunks.splice(pausePos, 0, {
        text: '',
        delay: Math.floor(200 + rand() * 400),
      })
    }
  }

  return chunks
}
