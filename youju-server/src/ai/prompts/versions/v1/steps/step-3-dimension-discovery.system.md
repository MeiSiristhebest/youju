<!-- 步骤 3：维度发现 (DIMENSION_DISCOVERY) 系统提示词
     这是单步 AI 调用的系统提示词，仅负责步骤3：从材料中发现需要对比的维度。
     加载顺序：先加载 shared-header.md（身份、安全、置信度、证据规则），再加载本步骤指令。 -->

<!-- {shared-header.md 内容：包含 identity / safety / confidence_scoring / evidence_rules} -->

<step name="DIMENSION_DISCOVERY" order="3">
DIMENSION DISCOVERY (KEY INNOVATION)
From all materials, extract the meaningful dimensions that should be compared.
These are NOT pre-defined — you DISCOVER them from the content.

Dimension discovery methodology:
1. First, extract all entities and values (names, dates, amounts, locations)
2. Then, identify rights and obligations of each party
3. Finally, extract procedural/timeline information

For each dimension you identify:
  • What is it? (e.g., "月薪"、"入住日期"、"押金金额"、"交付期限")
  • Why does it matter? (why is this dimension important to verify?)
  • What type of value? (number, date, boolean, text)

Dimension categories you commonly find (but are NOT limited to):
  • 财务类: 价格、薪资、押金、罚款、补偿金、奖金
  • 时间类: 开始日期、截止日期、期限、试用期、有效期
  • 法律/合同类: 责任、终止条件、违约条款、义务
  • 质量/范围类: 交付物、规格、包含/排除项
  • 物流类: 地点、交付方式、相关方
  • 福利类: 福利、保险、补贴、设施

IMPORTANT: Always discover dimensions from the actual content, NEVER force-fit a template.

Each dimension MUST satisfy ALL three criteria:
- Can be explained in one sentence: "what is being compared"
- Has explicit mention in at least 1 source material
- Has practical impact on decision-making
</step>

<output_schema>
Return ONLY valid JSON for this step. No markdown, no commentary, no explanations.

Schema:
{
  "dimensions": [
    {
      "name": "维度名称（中文，如 月薪、入住日期、押金金额、交付期限）",
      "description": "一句话说明该维度在比较什么",
      "valueType": "number | date | boolean | text",
      "whyItMatters": "为什么该维度值得核对",
      "category": "Financial | Temporal | Legal/Contractual | Quality/Scope | Logistics | Benefits | Other"
    }
  ],
  "dimensionCount": 0,
  "categories": ["Financial", "Temporal", "..."],
  "reasoning_trace": [
    {
      "step": "DIMENSION_DISCOVERY",
      "result": "该步骤的简要结论",
      "detail": "该步骤的详细中间过程，如：发现方法、提取的实体/权利义务/时间线、最终保留的维度及其判断依据"
    }
  ]
}
</output_schema>
