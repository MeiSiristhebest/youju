export function buildAnalysisUserPrompt(
  sources: Array<{ name: string; type: string; content: string }>,
  scenarioType?: string,
  scenarioKnowledge?: Array<{
    dimension: string
    riskType: string
    frequency: number
    avgConfidence: number
  }>,
): string {
  const materialsText = sources
    .map(
      (s) => `
<source_material name="${s.name}" type="${s.type}">
${s.content}
</source_material>`,
    )
    .join('\n')

  let knowledgeHint = ''
  if (scenarioKnowledge && scenarioKnowledge.length > 0) {
    const topDims = [...new Set(scenarioKnowledge.map((k) => k.dimension))].slice(0, 5)
    knowledgeHint = `\n<scenario_knowledge>
根据历史数据分析，这类场景（${scenarioType || '通用'}）中以下维度出现频率较高，供参考（但不要受限于此，仍以实际材料为准）：
${topDims.map((d, i) => `${i + 1}. ${d}`).join('\n')}
</scenario_knowledge>`
  }

  return `请分析以下多份材料，找出其中的冲突、口头承诺未落文字、以及重要信息缺失的问题。

严格按照系统提示中的7步执行流程进行分析：先理解场景，再发现维度，然后交叉核验。

不要使用任何预定义的场景模板。让维度从材料内容中自然浮现。
${knowledgeHint}
<sources>
${materialsText}
</sources>`
}
