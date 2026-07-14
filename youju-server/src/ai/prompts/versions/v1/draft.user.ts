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
        `  <evidence_item index="${i + 1}" source="${e.sourceName}">${e.quote.substring(0, 100)}${e.quote.length > 100 ? '...' : ''}</evidence_item>`,
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
      styleHint = `\n<style_preference>${hints.join('，')}</style_preference>`
    }
  }

  return `<draft_request>
<risk_point>${params.riskTitle}</risk_point>
<risk_detail>${params.riskDescription}</risk_detail>
${evidenceText ? `<evidence_list>\n${evidenceText}\n</evidence_list>` : ''}
${params.context ? `<extra_context>${params.context}</extra_context>` : ''}${styleHint}
</draft_request>

请根据以上信息生成自然、礼貌、清晰的确认消息（中文）：`
}
