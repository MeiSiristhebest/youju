export function buildDraftUserPrompt(params: {
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
}): string {
  const evidenceText = params.evidence
    .map(
      (e, i) =>
        `[证据${i + 1}] ${e.sourceName}: "${e.quote.substring(0, 100)}${e.quote.length > 100 ? '...' : ''}"`,
    )
    .join('\n')

  let styleHint = ''
  if (params.stylePref) {
    const hints: string[] = []
    if (params.stylePref.preferredTone === 'formal') hints.push('语气稍正式、专业')
    else if (params.stylePref.preferredTone === 'casual') hints.push('语气轻松随意')
    else if (params.stylePref.preferredTone === 'friendly') hints.push('语气亲切友好')
    else if (params.stylePref.preferredTone === 'professional') hints.push('语气专业、严谨')

    if (params.stylePref.conciseness !== undefined && params.stylePref.conciseness < 0.4) {
      hints.push('可以稍详细一些')
    } else if (params.stylePref.conciseness !== undefined && params.stylePref.conciseness > 0.6) {
      hints.push('尽量简洁')
    }

    if (hints.length > 0) {
      styleHint = `\n用户风格偏好：${hints.join('，')}\n`
    }
  }

  return `请根据以下信息生成一段确认话术：

风险点：${params.riskTitle}
详细说明：${params.riskDescription}
${evidenceText ? `\n相关证据：\n${evidenceText}\n` : ''}
${params.context ? `额外上下文：${params.context}\n` : ''}${styleHint}
生成自然、礼貌、清晰的确认消息（中文）：`
}
