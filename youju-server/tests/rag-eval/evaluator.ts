/**
 * RAGAS 离线评估器（简化版）
 *
 * 实现 RAGAS 4 指标的 LLM-as-judge 评估：
 * - Faithfulness: 答案是否忠于检索上下文（无幻觉）
 * - Answer Relevancy: 答案是否与问题相关
 * - Context Precision: 检索上下文是否精准
 * - Context Recall: 检索上下文是否覆盖 ground truth
 *
 * 支持两种模式：
 * - Real 模式（配置 AI_API_KEY）：使用 LLM 生成答案 + LLM-as-judge 评分
 * - Mock 模式（无 API Key）：使用启发式生成 + 启发式评分，结果仅供参考
 *
 * 阈值：Faithfulness 平均值 < 0.85 或 Answer Relevancy 平均值 < 0.7 时退出码 1
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { callAI } from '../../src/ai/llm.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

// ─────────────────────────────────────────────────────────────────────────────
// 类型定义
// ─────────────────────────────────────────────────────────────────────────────

type EvalCategory = 'single_doc' | 'multi_doc_compare' | 'cross_doc_reasoning' | 'no_answer'

interface EvalSample {
  id: string
  question: string
  groundTruth: string
  contexts: string[]
  scenario: string
  category: EvalCategory
}

interface MetricScores {
  faithfulness: number
  answerRelevancy: number
  contextPrecision: number
  contextRecall: number
}

interface EvalResult {
  sample: EvalSample
  answer: string
  scores: MetricScores
  mode: 'real' | 'mock'
  error?: string
}

// ─────────────────────────────────────────────────────────────────────────────
// 常量
// ─────────────────────────────────────────────────────────────────────────────

const FAITHFULNESS_THRESHOLD = 0.85
const ANSWER_RELEVANCY_THRESHOLD = 0.7
const HAS_API_KEY = !!process.env.AI_API_KEY

// ─────────────────────────────────────────────────────────────────────────────
// 数据集加载
// ─────────────────────────────────────────────────────────────────────────────

function loadDataset(): EvalSample[] {
  const datasetPath = resolve(__dirname, 'dataset.json')
  const raw = readFileSync(datasetPath, 'utf-8')
  return JSON.parse(raw) as EvalSample[]
}

// ─────────────────────────────────────────────────────────────────────────────
// 答案生成
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Real 模式：调用 LLM 基于检索上下文生成答案（模拟 RAG 生成步骤）
 */
async function generateAnswerLLM(sample: EvalSample): Promise<string> {
  const systemPrompt =
    '你是一个专业的文档问答助手。请仅基于提供的文档片段回答问题。' +
    '如果文档中没有相关信息，请回答"知识库中未找到相关内容。"不要编造信息。'
  const contextBlock = sample.contexts.map((c, i) => `[片段${i + 1}]\n${c}`).join('\n\n')
  const userPrompt = `文档片段：\n${contextBlock}\n\n问题：${sample.question}\n\n请基于上述文档片段回答问题：`

  const response = await callAI(userPrompt, systemPrompt, 1)
  return response.content
}

/**
 * Mock 模式：基于上下文生成启发式答案
 */
function generateMockAnswer(sample: EvalSample): string {
  if (sample.category === 'no_answer') {
    return '知识库中未找到相关内容。'
  }
  const firstContext = sample.contexts[0]
  if (!firstContext) return '知识库中未找到相关内容。'
  return firstContext.slice(0, 200)
}

// ─────────────────────────────────────────────────────────────────────────────
// 指标评分 - LLM-as-judge
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 使用 LLM 对生成的答案进行 4 指标评分
 */
async function scoreWithLLM(sample: EvalSample, answer: string): Promise<MetricScores> {
  const systemPrompt =
    '你是 RAGAS 评估助手。请根据提供的信息评估 RAG 系统的回答质量，返回 4 个指标分数。'
  const contextBlock = sample.contexts.map((c, i) => `[片段${i + 1}]\n${c}`).join('\n\n')
  const userPrompt = `问题：${sample.question}
标准答案：${sample.groundTruth}
检索到的文档片段：
${contextBlock}
系统回答：${answer}

请评估以下 4 个指标（0-1 之间，保留 2 位小数）：
1. faithfulness: 系统回答是否完全忠于检索到的文档片段（1=完全忠于文档，0=大量编造）
2. answer_relevancy: 系统回答是否直接回答了问题（1=完全相关，0=完全不相关）
3. context_precision: 检索到的文档片段是否与问题精准相关（1=全部相关，0=全部无关）
4. context_recall: 检索到的文档片段是否覆盖了标准答案的关键信息（1=完全覆盖，0=未覆盖）

请严格只返回 JSON，不要包含其他文字，格式：
{"faithfulness": 0.85, "answer_relevancy": 0.90, "context_precision": 0.80, "context_recall": 0.75}`

  const response = await callAI(userPrompt, systemPrompt, 1)
  return parseScoresFromLLM(response.content)
}

/**
 * 从 LLM 返回中解析 4 个指标分数
 */
function parseScoresFromLLM(content: string): MetricScores {
  const jsonMatch = content.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    return defaultScores()
  }
  try {
    const parsed = JSON.parse(jsonMatch[0]) as Record<string, unknown>
    return {
      faithfulness: clampScore(parsed.faithfulness),
      answerRelevancy: clampScore(parsed.answer_relevancy),
      contextPrecision: clampScore(parsed.context_precision),
      contextRecall: clampScore(parsed.context_recall),
    }
  } catch {
    return defaultScores()
  }
}

function clampScore(value: unknown): number {
  const num = Number(value)
  if (!Number.isFinite(num)) return 0
  return Math.max(0, Math.min(1, num))
}

function defaultScores(): MetricScores {
  return { faithfulness: 0, answerRelevancy: 0, contextPrecision: 0, contextRecall: 0 }
}

// ─────────────────────────────────────────────────────────────────────────────
// 指标评分 - 启发式（Mock 模式回退）
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 中文文本分词：提取中文字符 + 英文单词
 */
function tokenize(text: string): Set<string> {
  const tokens = new Set<string>()
  const chineseChars = text.match(/[\u4e00-\u9fff]/g) || []
  for (const c of chineseChars) tokens.add(c)
  const words = text.match(/[a-zA-Z]+/g) || []
  for (const w of words) tokens.add(w.toLowerCase())
  return tokens
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 1
  let intersection = 0
  for (const t of a) if (b.has(t)) intersection++
  const union = a.size + b.size - intersection
  return union === 0 ? 0 : intersection / union
}

/**
 * 启发式评分：基于关键词重叠度计算 4 个指标
 */
function scoreHeuristic(sample: EvalSample, answer: string): MetricScores {
  const questionTokens = tokenize(sample.question)
  const answerTokens = tokenize(answer)
  const groundTruthTokens = tokenize(sample.groundTruth)
  const contextTokensList = sample.contexts.map((c) => tokenize(c))
  const allContextTokens = new Set<string>()
  for (const tokens of contextTokensList) for (const t of tokens) allContextTokens.add(t)

  // Faithfulness：答案中每个句子是否有上下文支撑
  const sentences = answer.split(/[。！？\n.!?]/).filter((s) => s.trim().length > 0)
  let groundedCount = 0
  for (const sentence of sentences) {
    const sentTokens = tokenize(sentence)
    if (sentTokens.size === 0) continue
    let maxOverlap = 0
    for (const ctxTokens of contextTokensList) {
      maxOverlap = Math.max(maxOverlap, jaccard(sentTokens, ctxTokens))
    }
    if (maxOverlap > 0.3) groundedCount++
  }
  const faithfulness = sentences.length > 0 ? groundedCount / sentences.length : 0.5

  // Answer Relevancy：问题与答案的 Jaccard 相似度
  const answerRelevancy = jaccard(questionTokens, answerTokens)

  // Context Precision：每个上下文与问题的平均相似度
  const precisions = contextTokensList.map((ct) => jaccard(questionTokens, ct))
  const contextPrecision =
    precisions.length > 0 ? precisions.reduce((a, b) => a + b, 0) / precisions.length : 0

  // Context Recall：标准答案与所有上下文的 Jaccard 相似度
  const contextRecall = jaccard(groundTruthTokens, allContextTokens)

  return { faithfulness, answerRelevancy, contextPrecision, contextRecall }
}

// ─────────────────────────────────────────────────────────────────────────────
// 报告生成
// ─────────────────────────────────────────────────────────────────────────────

function average(nums: number[]): number {
  if (nums.length === 0) return 0
  return nums.reduce((a, b) => a + b, 0) / nums.length
}

function fmt(n: number): string {
  return n.toFixed(2)
}

function generateReport(results: EvalResult[]): string {
  const mode = HAS_API_KEY ? 'Real（LLM 评分）' : 'Mock（启发式评分）'
  const timestamp = new Date().toISOString()

  const faithfulnessAvg = average(results.map((r) => r.scores.faithfulness))
  const relevancyAvg = average(results.map((r) => r.scores.answerRelevancy))
  const precisionAvg = average(results.map((r) => r.scores.contextPrecision))
  const recallAvg = average(results.map((r) => r.scores.contextRecall))

  const failedSamples = results.filter(
    (r) =>
      r.scores.faithfulness < FAITHFULNESS_THRESHOLD ||
      r.scores.answerRelevancy < ANSWER_RELEVANCY_THRESHOLD,
  )

  const lines: string[] = []
  lines.push('# RAG 评估报告')
  lines.push('')
  lines.push(`- 生成时间：${timestamp}`)
  lines.push(`- 评估模式：${mode}`)
  lines.push(`- 样本数：${results.length}`)
  lines.push(
    `- 阈值：Faithfulness ≥ ${FAITHFULNESS_THRESHOLD}，Answer Relevancy ≥ ${ANSWER_RELEVANCY_THRESHOLD}`,
  )
  lines.push('')

  lines.push('## 指标汇总')
  lines.push('')
  lines.push('| 指标 | 平均值 |')
  lines.push('|------|--------|')
  lines.push(`| Faithfulness | ${fmt(faithfulnessAvg)} |`)
  lines.push(`| Answer Relevancy | ${fmt(relevancyAvg)} |`)
  lines.push(`| Context Precision | ${fmt(precisionAvg)} |`)
  lines.push(`| Context Recall | ${fmt(recallAvg)} |`)
  lines.push('')

  lines.push('## 详细结果')
  lines.push('')
  lines.push(
    '| ID | 类别 | 场景 | Faithfulness | Answer Relevancy | Context Precision | Context Recall | 状态 |',
  )
  lines.push(
    '|----|------|------|-------------|-----------------|-------------------|----------------|------|',
  )
  for (const r of results) {
    const status = failedSamples.includes(r) ? '❌' : '✅'
    lines.push(
      `| ${r.sample.id} | ${r.sample.category} | ${r.sample.scenario} | ${fmt(r.scores.faithfulness)} | ${fmt(r.scores.answerRelevancy)} | ${fmt(r.scores.contextPrecision)} | ${fmt(r.scores.contextRecall)} | ${status} |`,
    )
  }
  lines.push('')

  if (failedSamples.length > 0) {
    lines.push('## 失败样本分析')
    lines.push('')
    for (const r of failedSamples) {
      const reasons: string[] = []
      if (r.scores.faithfulness < FAITHFULNESS_THRESHOLD) {
        reasons.push(`Faithfulness=${fmt(r.scores.faithfulness)} < ${FAITHFULNESS_THRESHOLD}`)
      }
      if (r.scores.answerRelevancy < ANSWER_RELEVANCY_THRESHOLD) {
        reasons.push(
          `Answer Relevancy=${fmt(r.scores.answerRelevancy)} < ${ANSWER_RELEVANCY_THRESHOLD}`,
        )
      }
      lines.push(`### ${r.sample.id}（${r.sample.category} / ${r.sample.scenario}）`)
      lines.push('')
      lines.push(`- **问题**：${r.sample.question}`)
      lines.push(`- **标准答案**：${r.sample.groundTruth}`)
      lines.push(`- **系统回答**：${r.answer}`)
      lines.push(`- **失败原因**：${reasons.join('，')}`)
      if (r.error) lines.push(`- **错误信息**：${r.error}`)
      lines.push('')
    }
  } else {
    lines.push('## 失败样本分析')
    lines.push('')
    lines.push('所有样本均达到阈值要求。')
    lines.push('')
  }

  return lines.join('\n')
}

// ─────────────────────────────────────────────────────────────────────────────
// 主流程
// ─────────────────────────────────────────────────────────────────────────────

async function evaluateSample(sample: EvalSample): Promise<EvalResult> {
  const mode: 'real' | 'mock' = HAS_API_KEY ? 'real' : 'mock'

  // 生成答案
  let answer: string
  try {
    answer = HAS_API_KEY ? await generateAnswerLLM(sample) : generateMockAnswer(sample)
  } catch {
    answer = generateMockAnswer(sample)
  }

  // 评分
  let scores: MetricScores
  try {
    scores = HAS_API_KEY ? await scoreWithLLM(sample, answer) : scoreHeuristic(sample, answer)
  } catch {
    scores = scoreHeuristic(sample, answer)
  }

  return { sample, answer, scores, mode }
}

async function main(): Promise<void> {
  console.log(`[rag-eval] 评估模式：${HAS_API_KEY ? 'Real（LLM 评分）' : 'Mock（启发式评分）'}`)

  const dataset = loadDataset()
  console.log(`[rag-eval] 加载 ${dataset.length} 个评估样本`)

  const results: EvalResult[] = []
  for (const sample of dataset) {
    process.stdout.write(`[rag-eval] 评估 ${sample.id} (${sample.category})...`)
    const result = await evaluateSample(sample)
    results.push(result)
    console.log(
      ` F=${fmt(result.scores.faithfulness)} AR=${fmt(result.scores.answerRelevancy)} CP=${fmt(result.scores.contextPrecision)} CR=${fmt(result.scores.contextRecall)}`,
    )
  }

  // 生成报告
  const report = generateReport(results)
  const reportDir = resolve(__dirname, '../../docs')
  const reportPath = resolve(reportDir, 'rag-eval-report.md')
  mkdirSync(reportDir, { recursive: true })
  writeFileSync(reportPath, report, 'utf-8')
  console.log(`[rag-eval] 报告已生成：${reportPath}`)

  // 阈值检查
  const faithfulnessAvg = average(results.map((r) => r.scores.faithfulness))
  const relevancyAvg = average(results.map((r) => r.scores.answerRelevancy))
  console.log(
    `[rag-eval] Faithfulness 平均值：${fmt(faithfulnessAvg)}（阈值 ${FAITHFULNESS_THRESHOLD}）`,
  )
  console.log(
    `[rag-eval] Answer Relevancy 平均值：${fmt(relevancyAvg)}（阈值 ${ANSWER_RELEVANCY_THRESHOLD}）`,
  )

  if (faithfulnessAvg < FAITHFULNESS_THRESHOLD || relevancyAvg < ANSWER_RELEVANCY_THRESHOLD) {
    console.error('[rag-eval] ❌ 评估未通过阈值，CI 失败')
    process.exit(1)
  }

  console.log('[rag-eval] ✅ 评估通过')
}

main().catch((e) => {
  console.error('[rag-eval] 评估执行失败:', e)
  process.exit(1)
})
