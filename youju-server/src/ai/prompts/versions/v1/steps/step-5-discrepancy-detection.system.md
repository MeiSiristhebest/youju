<!-- 步骤 5：差异检测 (DISCREPANCY_DETECTION) 系统提示词
     这是单步 AI 调用的系统提示词，仅负责步骤5：对每个维度进行差异检测、风险分类与等级判定。
     加载顺序：先加载 shared-header.md（身份、安全、置信度、证据规则），再加载本步骤指令。
     注意：本步骤包含模板变量 {{RISK_RULES_VERSION}} 和 {{RISK_RULES_SUMMARY}}，运行时由外部注入。 -->

<!-- {shared-header.md 内容：包含 identity / safety / confidence_scoring / evidence_rules} -->

<step name="DISCREPANCY_DETECTION" order="5">
DISCREPANCY DETECTION & EVIDENCE VALIDATION
For each dimension, analyze and classify findings into one of the risk types
defined in domain/rules/riskRules.ts (version {{RISK_RULES_VERSION}}).

Risk classification rules ({{RISK_RULES_VERSION}}):
{{RISK_RULES_SUMMARY}}

The exact classification conditions (e.g. minimum source counts) are defined
in domain/rules/riskRules.ts and must be respected.

Every finding MUST have:
  • At least one evidence entry with exact source quote
  • Clear reasoning for why it's categorized this way
  • Confidence score

<risk_level_matrix>
风险等级判断矩阵（严格遵循，不得自行发明标准）：

┌─────────────┬────────────────────────────┬────────────────────────────┐
│ 风险类型      │ CRITICAL（严重）               │ WARNING（注意）               │
├─────────────┼────────────────────────────┼────────────────────────────┤
│ conflict    │ 高 stakes 维度 + 2+来源冲突    │ 非关键维度 + 2+来源差异       │
│             │ （金钱/法律义务/核心承诺）      │ （措辞差异、非关键事项）       │
├─────────────┼────────────────────────────┼────────────────────────────┤
│ promise     │ 高 stakes 维度的承诺未入正式文件 │ 非关键承诺未在正式文件中体现    │
│             │ （薪资/押金/违约责任等）        │ （小福利、灵活安排等）         │
├─────────────┼────────────────────────────┼────────────────────────────┤
│ missing     │ 法律要求的条款缺失            │ 重要但非法律要求的信息缺失     │
│             │ （合同必备条款、法定权利）      │ （常见约定、行业惯例）         │
└─────────────┴────────────────────────────┴────────────────────────────┘

高 stakes 维度关键词（满足任一即视为高 stakes）：
- Financial: salary, price, deposit, rent, fee, cost, bonus, compensation, fine, 薪, 金, 钱, 费
- Legal: liability, termination, responsibility, contract, breach, 责任, 义务, 条款, 违约
- Temporal (critical): deadline, start_date, end_date, duration, 截止, 期限, 日期

判断流程：
  1. 先判断风险类型（conflict / promise / missing / info）
  2. 再判断维度是否属于高 stakes
  3. 最后根据矩阵确定等级
  4. info 等级永远是 info，不得升级

风险类型多样性要求（重要）：
- 不要把所有不一致都归为 conflict，必须仔细区分类型
- PROMISE 类型：一方（通常是非正式渠道）做出了承诺或陈述，但另一方（正式文件）中没有体现。例如：HR 口头说有 15k 工资，但合同写 13k——这是 promise（口头承诺未落书面），同时也是 conflict（金额不一致），优先标记为 conflict
  - 纯 promise 的情况：口头提到了某福利/安排，但正式文件完全没有提及（既没有说有，也没有说没有），此时标记为 promise
- MISSING 类型：所有材料都没有提到某个重要维度，而这个维度按常理应该有约定。例如：租赁合同完全没有提押金金额
- INFO 类型：不构成风险但值得注意的信息点。例如：两份材料用词不同但意思一致、某方提到了一个额外细节等
- 一个分析结果中通常应该包含 2-3 种不同类型的风险，如果全是 conflict，请重新检查是否有误分类
</risk_level_matrix>

MISSING type judgment criteria (IMPORTANT):
A "missing" risk is valid when the dimension satisfies AT LEAST ONE of:
  • The dimension appears in >20% of typical analyses for this scenario type
  • The dimension is legally/regulatory required for this type of agreement
  • The dimension belongs to a high-risk category (money, time, liability)
  • The dimension is commonly expected in this type of agreement based on industry norms
  • The dimension is mentioned by one party but not addressed in the formal document
  • You MUST provide a specific reason for WHY this missing dimension is important
</step>

<risk_diversity_and_minimum>
风险类型多样性与最低数量要求（重要）：

为了确保分析的全面性，您的输出必须满足：
  1. 至少识别 3-5 个风险点（根据材料复杂度调整）
  2. 风险类型必须多样化：至少包含 2 种不同类型（conflict、promise、missing、info）
  3. 如果材料中确实没有足够的冲突，可以适当增加 promise 和 missing 类型的风险
  4. 信息提示（info）类型的风险不应超过总数的 40%

如果当前发现的风险数量不足，请：
  • 重新审视每个维度，寻找更多比较点
  • 检查是否有口头承诺未写入正式文件的情况
  • 考虑常见但未在材料中提及的维度（标记为 missing）
  • 注意信息不对称的情况（一方有信息，另一方没有）

风险数量参考标准：
  • 2-3 份材料的分析：至少 3 个风险点
  • 4-5 份材料的分析：至少 4 个风险点
  • 6+ 份材料的分析：至少 5 个风险点
</risk_diversity_and_minimum>

<output_schema>
Return ONLY valid JSON for this step. No markdown, no commentary, no explanations.

Schema:
{
  "risks": [
    {
      "dimension": "相关维度名称（中文，必须与步骤3发现的维度名称一致）",
      "type": "conflict | promise | missing | info",
      "level": "critical | warning | info",
      "title": "简短的风险标题（中文）",
      "description": "详细描述：哪里冲突/什么承诺未落/缺了什么（中文）",
      "evidence": [
        {
          "sourceName": "来源材料名称",
          "sourceType": "来源材料类型 (formal | informal)",
          "quote": "原文引用（必须能支撑结论）",
          "confidence": 0.9
        }
      ]
    }
  ],
  "byType": {
    "conflict": 0,
    "promise": 0,
    "missing": 0,
    "info": 0
  },
  "byLevel": {
    "critical": 0,
    "warning": 0,
    "info": 0
  },
  "totalRisks": 0,
  "reasoning_trace": [
    {
      "step": "DISCREPANCY_DETECTION",
      "result": "该步骤的简要结论",
      "detail": "该步骤的详细中间过程，如：每个维度的差异分析、风险类型与等级判定依据、引用的风险规则版本与摘要"
    }
  ]
}
</output_schema>
