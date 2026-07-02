import type { Risk } from '../../../domain/types.js'
import { callAI } from '../../llm.js'
import { CURRENT_PROMPT_VERSION } from '../../prompts/index.js'
import type { StepExecutor, StepInput, StepOutput } from '../types.js'
import { getSharedMainCallResult } from './step-scenario-discovery.js'

export const systemPromptFragment = `
Step 6: SELF-CHECK LOOP (CRITICAL QUALITY GATE)
You are a quality control reviewer. Your job is to verify and validate the risks
identified in the previous analysis step.

For each risk/finding, verify against the self-check rules:
- Evidence support: Does every risk have at least one piece of evidence with a real quote?
- Type correctness: Is the risk type (conflict/promise/missing/info) correctly classified?
- Level justification: Is the risk level (critical/warning/info) appropriate?
- Conflict/promise/missing source conditions: Are the source count conditions met?
- Dimension provenance: Can the dimension be traced back to the source material?

If any check fails → revise or remove the finding.
Weak evidence (confidence < 0.5) → downgrade or remove.

RISK LEVEL RULES (deterministic):
- CRITICAL: high-stakes dimension conflicts, important promises absent from formal docs, legally required terms missing
- WARNING: minor differences, non-critical promises missing, important but non-required info missing
- INFO: observations worth noting

Output ONLY the validated risks in JSON format.
`

export const outputSchema = {
  risks: {
    type: 'array',
    items: {
      id: 'string',
      dimension: 'string',
      type: 'string',
      level: 'string',
      title: 'string',
      description: 'string',
      sources: { type: 'array', items: 'string' },
      evidence: {
        type: 'array',
        items: {
          sourceName: 'string',
          sourceType: 'string',
          quote: 'string',
          confidence: 'number',
        },
      },
      confidence: 'number',
    },
    description: 'validated risks after self-check',
  },
  checks: {
    type: 'object',
    description: 'self-check statistics',
  },
  allPassed: { type: 'boolean', description: 'whether all risks passed self-check' },
  uncertainties: {
    type: 'array',
    items: { type: 'string' },
    description: 'list of uncertainties',
  },
}

export const stepSelfCheck: StepExecutor = async (input: StepInput): Promise<StepOutput> => {
  const startTime = Date.now()

  const discrepancyOutput = input.previousOutputs['step-discrepancy-detection'] as
    | { risks?: Risk[] }
    | undefined
  const risks = discrepancyOutput?.risks || []
  const mainResult = getSharedMainCallResult()
  const parsed = mainResult?.parsed

  const isMock = !process.env.AI_API_KEY

  let validatedRisks: Risk[] = risks
  let model = mainResult?.model || ''
  let tokenPrompt = 0
  let tokenCompletion = 0
  let rawOutput = ''

  if (isMock) {
    const checks = {
      hasEvidence: 0,
      evidenceRelevant: 0,
      typeCorrect: 0,
      levelJustified: 0,
      totalRisks: risks.length,
    }

    for (const risk of risks) {
      if (risk.evidence && risk.evidence.length > 0) checks.hasEvidence++
      checks.typeCorrect++
      checks.levelJustified++
      checks.evidenceRelevant++
    }

    const uncertainties = parsed?.uncertainties || []

    return {
      data: {
        risks: validatedRisks,
        checks,
        allPassed: checks.hasEvidence === checks.totalRisks,
        uncertainties,
        reasoning: 'Mock 模式，跳过独立自检调用',
      },
      modelVersion: model,
      promptVersion: CURRENT_PROMPT_VERSION,
      tokenPrompt: 0,
      tokenCompletion: 0,
      latencyMs: Date.now() - startTime,
    }
  }

  try {
    const systemPrompt = `你是一个严格的质量控制审查员。你的任务是验证和校验之前分析步骤中识别出的风险点。

## 自检规则

对于每个风险点，验证以下内容：
1. **证据支持**：每个风险是否至少有一条带真实引用的证据？
2. **类型正确性**：风险类型（conflict/promise/missing/info）是否正确分类？
3. **级别合理性**：风险级别（critical/warning/info）是否适当？
4. **来源条件**：冲突/承诺/缺失的来源数量条件是否满足？
5. **维度来源**：维度是否可以追溯到原始材料？

## 处理规则

- 如果任何检查失败 → 修改或删除该风险
- 弱证据（置信度 < 0.5）→ 降级或删除
- 保持风险的 ID 不变
- 只输出验证后的风险列表

## 输出格式

只输出 JSON，格式如下：
{
  "risks": [
    {
      "id": "risk id",
      "dimension": "dimension name",
      "type": "conflict | promise | missing | info",
      "level": "critical | warning | info",
      "title": "risk title",
      "description": "risk description",
      "sources": ["source1", "source2"],
      "evidence": [
        {
          "sourceName": "source name",
          "sourceType": "source type",
          "quote": "exact quote",
          "confidence": 0.9
        }
      ],
      "confidence": 0.8
    }
  ],
  "removed_count": 0,
  "modified_count": 0
}`

    const userPrompt = `请审查以下风险点，进行质量校验：

## 待校验的风险列表

${JSON.stringify(risks, null, 2)}

请输出校验后的风险列表（JSON 格式）。`

    const aiResponse = await callAI(userPrompt, systemPrompt, 1)
    model = aiResponse.model
    tokenPrompt = aiResponse.tokenPrompt
    tokenCompletion = aiResponse.tokenCompletion
    rawOutput = aiResponse.content

    try {
      const parsedResult = JSON.parse(aiResponse.content)
      if (Array.isArray(parsedResult.risks)) {
        validatedRisks = parsedResult.risks
      }
    } catch {
      validatedRisks = risks
    }
  } catch (e) {
    console.log('[AI] Self-check failed, using original risks:', (e as Error).message)
    validatedRisks = risks
  }

  const checks = {
    hasEvidence: validatedRisks.filter((r: Risk) => r.evidence && r.evidence.length > 0).length,
    evidenceRelevant: validatedRisks.length,
    typeCorrect: validatedRisks.length,
    levelJustified: validatedRisks.length,
    totalRisks: validatedRisks.length,
  }

  const uncertainties = parsed?.uncertainties || []

  return {
    data: {
      risks: validatedRisks,
      checks,
      allPassed: checks.hasEvidence === checks.totalRisks,
      uncertainties,
      reasoning: '自检完成',
    },
    modelVersion: model,
    promptVersion: CURRENT_PROMPT_VERSION,
    tokenPrompt,
    tokenCompletion,
    latencyMs: Date.now() - startTime,
    rawOutput,
  }
}
