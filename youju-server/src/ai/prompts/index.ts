import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  getRiskRulesSummary,
  QUALITY_BAR,
  RISK_RULES_VERSION,
  SELF_CHECK_RULES,
} from '../../domain/rules/riskRules.js'
import { buildAnalysisUserPrompt as buildAnalysisUserPromptV1 } from './versions/v1/analysis.user.js'
import { buildChatUserPrompt as buildChatUserPromptV1 } from './versions/v1/chat.user.js'
import { buildDraftUserPrompt as buildDraftUserPromptV1 } from './versions/v1/draft.user.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export const CURRENT_PROMPT_VERSION = 'v1'

export type PromptType = 'analysis' | 'draft' | 'chat'

export type StepPromptName =
  | 'step-1-scenario'
  | 'step-2-input-parsing'
  | 'step-3-dimension-discovery'
  | 'step-4-cross-source-extraction'
  | 'step-5-discrepancy-detection'
  | 'step-6-self-check'

let analysisSystemPromptV1 = ''
let draftSystemPromptV1 = ''
let chatSystemPromptV1 = ''
let sharedHeaderV1 = ''
const stepPromptCache: Partial<Record<StepPromptName, string>> = {}

function loadMarkdown(filePath: string): string {
  try {
    return fs.readFileSync(filePath, 'utf-8')
  } catch (e) {
    console.error(`Failed to load prompt file: ${filePath}`, e)
    return ''
  }
}

function ensurePromptsLoaded() {
  if (!analysisSystemPromptV1) {
    analysisSystemPromptV1 = loadMarkdown(path.join(__dirname, 'versions/v1/analysis.system.md'))
  }
  if (!draftSystemPromptV1) {
    draftSystemPromptV1 = loadMarkdown(path.join(__dirname, 'versions/v1/draft.system.md'))
  }
  if (!chatSystemPromptV1) {
    chatSystemPromptV1 = loadMarkdown(path.join(__dirname, 'versions/v1/chat.system.md'))
  }
  if (!sharedHeaderV1) {
    sharedHeaderV1 = loadMarkdown(path.join(__dirname, 'versions/v1/steps/shared-header.md'))
  }
}

function applyTemplateVariables(prompt: string): string {
  const rulesSummary = getRiskRulesSummary()
  const selfCheck = SELF_CHECK_RULES.map((r, i) => `${i + 1}. ${r}`).join('\n')
  const qualityBar = QUALITY_BAR.map((r, i) => `${i + 1}. ${r}`).join('\n')

  return prompt
    .replaceAll('{{RISK_RULES_VERSION}}', RISK_RULES_VERSION)
    .replaceAll('{{RISK_RULES_SUMMARY}}', rulesSummary)
    .replaceAll('{{SELF_CHECK_RULES}}', selfCheck)
    .replaceAll('{{QUALITY_BAR}}', qualityBar)
}

export function getStepSystemPrompt(
  stepName: StepPromptName,
  version: string = CURRENT_PROMPT_VERSION,
): string {
  ensurePromptsLoaded()

  if (stepPromptCache[stepName]) {
    return applyTemplateVariables(stepPromptCache[stepName]!)
  }

  const fileName = `${stepName}.system.md`
  const stepPrompt = loadMarkdown(path.join(__dirname, `versions/${version}/steps/${fileName}`))
  const combined = `${sharedHeaderV1}\n\n${stepPrompt}`
  stepPromptCache[stepName] = combined

  return applyTemplateVariables(combined)
}

export function loadChatSystemPrompt(version: string = CURRENT_PROMPT_VERSION): string {
  ensurePromptsLoaded()
  switch (version) {
    case 'v1':
      return chatSystemPromptV1
    default:
      return chatSystemPromptV1
  }
}

export function getAnalysisSystemPrompt(version: string = CURRENT_PROMPT_VERSION): string {
  ensurePromptsLoaded()
  let prompt: string
  switch (version) {
    case 'v1':
      prompt = analysisSystemPromptV1
      break
    default:
      prompt = analysisSystemPromptV1
  }

  const rulesSummary = getRiskRulesSummary()
  const selfCheck = SELF_CHECK_RULES.map((r, i) => `${i + 1}. ${r}`).join('\n')
  const qualityBar = QUALITY_BAR.map((r, i) => `${i + 1}. ${r}`).join('\n')

  prompt = prompt.replaceAll('{{RISK_RULES_VERSION}}', RISK_RULES_VERSION)
  prompt = prompt.replaceAll('{{RISK_RULES_SUMMARY}}', rulesSummary)
  prompt = prompt.replaceAll('{{SELF_CHECK_RULES}}', selfCheck)
  prompt = prompt.replaceAll('{{QUALITY_BAR}}', qualityBar)

  return prompt
}

export function getDraftSystemPrompt(version: string = CURRENT_PROMPT_VERSION): string {
  ensurePromptsLoaded()
  switch (version) {
    case 'v1':
      return draftSystemPromptV1
    default:
      return draftSystemPromptV1
  }
}

export function buildAnalysisUserPrompt(
  sources: Array<{ name: string; type: string; content: string }>,
  scenarioType?: string,
  scenarioKnowledge?: Array<{
    dimension: string
    riskType: string
    frequency: number
    avgConfidence: number
  }>,
  version: string = CURRENT_PROMPT_VERSION,
): string {
  switch (version) {
    default:
      return buildAnalysisUserPromptV1(sources, scenarioType, scenarioKnowledge)
  }
}

export function buildDraftUserPrompt(
  params: {
    riskTitle: string
    riskDescription: string
    evidence: { sourceName: string; quote: string }[]
    context?: string
    stylePref?: {
      formality?: number
      friendliness?: number
      conciseness?: number
      preferredTone?: string
    }
  },
  version: string = CURRENT_PROMPT_VERSION,
): string {
  switch (version) {
    default:
      return buildDraftUserPromptV1(params)
  }
}

export function buildChatUserPrompt(
  content: string,
  contextSourceIds?: string[],
  version: string = CURRENT_PROMPT_VERSION,
): string {
  switch (version) {
    default:
      return buildChatUserPromptV1(content, contextSourceIds)
  }
}

export type ChatPromptBundle = {
  systemPrompt: string
  userPromptBuilder: (content: string, contextSourceIds?: string[]) => string
}

export function getChatPrompt(version: string = CURRENT_PROMPT_VERSION): ChatPromptBundle {
  const systemPrompt = loadChatSystemPrompt(version)
  const userPromptBuilder = (content: string, contextSourceIds?: string[]) =>
    buildChatUserPrompt(content, contextSourceIds, version)
  return { systemPrompt, userPromptBuilder }
}
