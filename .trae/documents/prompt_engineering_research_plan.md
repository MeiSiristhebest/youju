# 提示词工程最前沿调研报告 & 优化方案

## 一、调研概述

基于 OpenAI、Google、Anthropic 三大顶级 AI 厂商的官方文档、泄露系统提示词分析、学术论文、以及工业界真实 Agent 实现，系统调研 2025-2026 年提示词工程最前沿实践，并对本项目现有提示词进行对比分析与优化建议。

---

## 二、第一优先级：三大厂商官方最佳实践

### 2.1 OpenAI（工程化、工具化路线）

**核心来源**：[platform.openai.com/docs/guides/prompt-engineering](https://platform.openai.com/docs/guides/prompt-engineering)

#### 2.1.1 消息角色体系（2025-2026 最新）

OpenAI 在 Responses API 中引入了新的角色体系：

| 角色 | 权重 | 用途 |
|------|------|------|
| **developer** | 最高 | 系统规则与业务逻辑（≈函数定义） |
| **user** | 次高 | 用户输入与配置（≈函数参数） |
| **assistant** | 最低 | 模型生成的内容 |

**关键洞察**：OpenAI 将 developer 和 user 消息比喻为"函数定义 vs 函数参数"——developer 定义"怎么做事"，user 提供"做什么事"的数据。这与本项目的"静态配置 vs 动态输入"分离模型完全一致。

#### 2.1.2 新增 `instructions` 参数

```javascript
const response = await client.responses.create({
  model: "gpt-5",
  instructions: "Talk like a pirate.",  // 新参数，优先级最高
  input: "Are semicolons optional in JavaScript?",
});
```

`instructions` 参数是 API 级别的系统指令入口，**优先级高于 input 中的 developer 消息**，且只对当前请求生效。

#### 2.1.3 开发者消息的标准结构

OpenAI 官方推荐的开发者消息结构顺序：

```
1. Identity（身份）     → 目的、沟通风格、高层目标
2. Instructions（指令） → 规则、应该做什么、不应该做什么
3. Examples（示例）     → 输入示例 + 期望输出
4. Context（上下文）   → 额外信息、私有数据（放在最后，因为每轮可能不同）
```

**关键发现**：OpenAI 同时推荐使用 **Markdown 格式化 + XML 标签** 来组织提示词结构：
- Markdown headers/lists → 标记段落层级
- XML tags → 标记数据边界（如 `<user_query>...</user_query>`）

#### 2.1.4 可复用提示词（Reusable Prompts）

OpenAI 推出了 Dashboard 级别的提示词模板管理：
- 支持变量占位符（如 `{{customer_name}}`）
- 支持版本管理
- 支持文件类型变量（PDF、图片等）

**启示**：本项目已有的版本化目录（`v1/`）和模板变量（`{{RISK_RULES_VERSION}}`）与这个方向一致。

#### 2.1.5 模型选择策略

- **Reasoning models**（如 o3/o4-mini）：内建思维链，适合复杂任务和多步规划，但更慢更贵
- **GPT models**（如 gpt-4.1）：快速高效，但需要更明确的指令
- **大小模型搭配**：大模型做核心推理，小模型做辅助性工作

---

### 2.2 Anthropic（结构化 + 安全双轮驱动路线）

**核心来源**：[docs.anthropic.com](https://docs.anthropic.com) + Claude Code 源码泄露分析

#### 2.2.1 Claude Code 的 System Prompt 组装流程（泄露逆向）

Anthropic 的真实产品级提示词由 `SystemPromptBuilder` 按以下顺序拼装：

```
1. Intro Section        → 角色定义（"You are an interactive agent..."）
2. Output Style         → 输出风格（如 "Concise"）
3. System Section       → 系统规则（工具权限、安全提醒等）
4. Doing Tasks Section  → 任务执行准则（不乱改代码、不加冗余抽象等）
5. Actions Section      → 操作安全准则（可逆性评估、高风险操作需授权）
─── SYSTEM_PROMPT_DYNAMIC_BOUNDARY ───  ← 静态/动态分界线
6. Environment Section  → 环境上下文（模型名、工作目录、日期、操作系统）
7. Project Context      → 项目上下文（Git status、Git diff 快照）
8. Instruction Files    → CLAUDE.md 等指令文件内容
9. Runtime Config       → 配置信息（权限模式、MCP 服务器等）
```

**关键发现**：
- **静态/动态分界线**：步1-5是静态的（可缓存），步6-9是动态的（每轮变化）。这直接服务于 **Prompt Caching**——静态部分全局缓存，大幅降低成本和延迟
- **CLAUDE.md 作为用户可控的"长期记忆"入口**：用户通过编写 CLAUDE.md 文件间接注入系统提示词，实现跨会话持久化
- **Prompt Caching 是核心**：Anthropic 工程团队明确表示"Prompt Caching Is Everything"

#### 2.2.2 XML 标签结构化

Anthropic 的标志性技术，Claude Code 中大量使用：

```xml
<system-reminder>
这是一个提醒：你的待办事项列表当前为空...
</system-reminder>

<good-example>
pytest /foo/bar/tests
</good-example>

<bad-example>
cd /foo/bar && pytest tests
</bad-example>
```

**为什么 XML 有效**：
- Claude 训练数据中大量 XML 结构，模型对其有"先天理解"
- 比 Markdown 代码块边界更精确
- 比 JSON 更适合嵌入长文本
- 属性可携带元数据

#### 2.2.3 Claude 3.7 产品级 System Prompt 设计原则

从 Claude 3.7 系统提示词分析得出五大原则：

| 原则 | 说明 | 实例 |
|------|------|------|
| **明确性** | 每个条款措辞精确，消除歧义 | 用"comma-separated list"而非"list" |
| **结构化** | 模块化分区，层级清晰 | 引用规范、工件管理、安全规则各自独立 |
| **约束性** | 正向+负向双向约束 | "应该做什么"+"不应该做什么" |
| **场景化** | 针对不同场景动态调整 | "无搜索结果"时的降级策略 |
| **可扩展性** | 面向未来预留接口 | 版本指定（lucide-react@0.263.1） |

#### 2.2.4 强调策略（大写 + 加粗 + 反复强调）

Claude Code 的 Prompt 里充满 IMPORTANT、VERY IMPORTANT、NEVER、ALWAYS：
- "IMPORTANT: 除非被要求，不要添加任何注释"
- "VERY IMPORTANT: 避免使用 find/grep 等命令"
- "NEVER: 绝不要为用户生成或猜测 URL"

**结论**：虽然不够"优雅"，但在当前模型能力下，**大写强调仍是 SOTA**。

#### 2.2.5 不只写"规则"，更要写"算法"

Claude Code 的高明之处在于：对核心任务写出**流程化算法**，把决策步骤讲清楚，比零散的 Do/Don't 更容易被执行。

---

### 2.3 Google（系统化、方法论路线）

**核心来源**：[cloud.google.com/vertex-ai/generative-ai/docs](https://cloud.google.com/vertex-ai/generative-ai/docs) + Prompt Engineering 白皮书

#### 2.3.1 核心三要素（The 3 P's）

- **Persona（角色）**：你希望 AI 扮演谁
- **Task（任务）**：你希望 AI 做什么，具体到步骤
- **Purpose（目的）**：为什么要做，最终目标是什么

#### 2.3.2 十大技巧

1. **Be Specific** — 越具体越好
2. **Provide Context** — 背景信息决定输出质量
3. **Use Examples** — Few-shot 优于 Zero-shot，3-5个示例最佳
4. **Assign a Role** — 角色设定激活特定知识域
5. **Specify Output Format** — JSON/Markdown/表格
6. **Break It Down** — 拆解任务
7. **Iterate and Refine** — 迭代优化
8. **Leverage Chain-of-Thought** — 思维链
9. **Set Constraints** — 约束条件
10. **Use Delimiters** — 分隔符标记边界

#### 2.3.3 Google 的核心哲学

> "Prompt = Workflow Definition"

Google 将提示词视为工作流定义，而非简单指令。这在其 Gemini API 的 function calling、multimodal prompts、agent workflows 设计中体现得最为明显。

---

## 三、第二优先级：论文前沿

### 3.1 The Prompt Report（arXiv:2406.06608）

**最重要的综述论文**，从 4,797 篇记录中提取了 58 种文本提示技术：

**核心分类法**：
- **In-Context Learning（上下文学习）**：Zero-shot / Few-shot / Many-shot
- **Ensembling（集成）**：多提示词投票、多路径推理
- **Self-Critique（自我批评）**：模型审查自己的输出
- **Decomposition（分解）**：任务拆解为子任务
- **Reasoning（推理增强）**：Chain-of-Thought 及其变体

**对本项目的启示**：当前只用了 CoT + Self-Check，还有 Self-Critique（让模型先输出再审查再修正）和 Ensembling（多路验证）尚未应用。

### 3.2 Prompt as Requirements Engineering（arXiv:2603.16348）

**核心思想**：Prompt = 软件需求 + 解决方案混合体

这篇论文提出，提示词本质上是在做需求工程（Requirements Engineering）：
- 提示词中的约束 ≈ 功能需求
- 提示词中的安全规则 ≈ 非功能需求
- 提示词中的示例 ≈ 验收标准
- 提示词中的执行流程 ≈ 系统架构

**对本项目的启示**：本项目的提示词已经具备需求工程的雏形（7层结构 ≈ 需求规格说明），但缺少"验收标准"——即 Few-Shot 示例。

---

## 四、第三优先级：真实工业实现

### 4.1 Claude Code 的 Agent 设计哲学

MinusX 团队通过逆向分析得出的核心结论：

> **"大道至简，KISS 依然有效"**

Claude Code 的设计哲学可以提炼为：
1. **相信模型**：把复杂留给模型，把简单留给系统
2. **弱化 RAG，强化 LLM 搜索**：让模型像人一样去搜索，而非预先向量化
3. **高/中/低层工具搭配**：低层（Bash/Read/Write）+ 中层（Edit/Grep/Glob）+ 高层（Task/WebFetch）
4. **让 Agent 自己维护 To-Do**：解决"上下文腐烂"
5. **KISS 原则**：与其执着框架堆叠，不如做简单但健壮的

### 4.2 AI 工程的四次跃迁

| 阶段 | 时间 | 核心能力 | 稀缺技能 |
|------|------|----------|----------|
| **Prompt Engineering** | 2022- | 语言：把话说清楚 | 提示词写作 |
| **Context Engineering** | 2024-2025 | 信息：给模型看对的 | 信息策展 |
| **Harness Engineering** | 2026初 | 控制：定好规则护栏 | 系统约束设计 |
| **Loop Engineering** | 2026中 | 管理：让系统自己转 | 目标定义 + 验证设计 |

### 4.3 Context Engineering 的5个核心动作

Anthropic 2025年9月正式提出：

1. **选择（Selection）**：不是所有信息都该进模型，"少给但给对"
2. **压缩（Compression）**：不是删信息，而是提炼因果结构
3. **检索（Retrieval）**：RAG 不是结束，而是开始——关键在检索结果能否被模型用好
4. **状态（State）**：Agent 的本质不是聊天，而是推进任务
5. **注入（Injection）**：just-in-time 运行时加载，而非预先塞满

**关键数据**：
- 准确率在 32K tokens 处开始滑坡（Databricks 研究）
- Contextual Retrieval 可将检索失败降低 49%-67%（Anthropic 研究）
- 同一模型，只改 Harness 设计，表现可差 6 倍（斯坦福+清华研究）

---

## 五、三大厂商共识与差异

### 5.1 高度一致的共识

| 共识 | 说明 |
|------|------|
| **清晰 > 巧妙** | 明白说清楚比话术技巧重要10倍 |
| **示例 > 描述** | 一个好示例胜过一千字描述（三家都推荐 Few-Shot） |
| **结构化 > 自由文本** | 用 JSON/XML/表格约束输出 |
| **拆分 > 一步到位** | 复杂任务必须拆解 |
| **迭代 > 一次完美** | 提示词是调出来的，不是写出来的 |
| **给思考时间** | 让模型先推理再输出 |
| **安全是底线** | 系统提示必须包含注入防御和行为边界 |
| **XML 标签有效** | 三家都推荐使用分隔符/XML标签组织结构 |

### 5.2 各厂商特色侧重

| 维度 | OpenAI | Google | Anthropic |
|------|--------|--------|-----------|
| **核心理念** | 工程化、工具化 | 系统化、方法论 | 结构化、安全优先 |
| **特色技术** | Structured Outputs、Code Interpreter | Temperature/Top-P 调优体系 | XML 标签、宪法AI、Prompt Caching |
| **输出控制** | API 级 JSON Schema 保证 | Schema 引导 + JSON 模式 | XML + 严格格式指令 |
| **推理增强** | Reasoning Models (o3/o4) + 思维链 | 分步任务分解 | 渐进式推理 + 自我检查 |
| **工程实践** | 评估驱动、工具优先、可复用提示词 | 迭代记录、A/B测试 | Prompt Caching、静态/动态分界 |
| **Agent 架构** | Responses API + 函数调用 | Gemini agent workflows | Claude Code = 简单循环 + 强模型 |

---

## 六、本项目提示词现状分析

### 6.1 当前架构（[analysis.system.md](file:///d:/developWorkPlaces/youju/youju-server/src/ai/prompts/versions/v1/analysis.system.md)）

本项目采用 7 层结构：

```
1. AGENT IDENTITY LAYER       → 角色定义
2. TASK EXECUTION MODEL        → 7步执行流水线
3. CORE BEHAVIORAL RULES       → 行为宪法
4. SAFETY & PROMPT INJECTION   → 安全防护
5. CONTEXT SEPARATION MODEL    → 静态/动态分离
6. OUTPUT SCHEMA ENFORCEMENT   → JSON Schema 约束
7. QUALITY BAR                 → 质量标准
```

### 6.2 与业界最佳实践的对照评估

| 最佳实践 | 本项目现状 | 差距评估 |
|----------|-----------|----------|
| **XML 标签结构化** | 使用 `<<<INPUT_START` 分隔符，但整体用 `━` 分隔 | ⚠️ 中等差距 — 应全面采用 XML 标签 |
| **Few-Shot 示例** | 无任何示例 | ❌ 重大缺失 — 行业公认最重要的优化之一 |
| **developer/user 角色分离** | system.md + user.ts 分离 | ✅ 已实现 |
| **静态/动态分界** | 有 `STATIC CONFIG` / `DYNAMIC INPUT` 概念 | ⚠️ 有概念但无 Prompt Caching 利用 |
| **置信度评分标准** | 要求输出 confidence 但无定义 | ⚠️ 无标准 — 模型会随意给分 |
| **证据引用规范** | 要求 quote 但无精确性要求 | ⚠️ 中等差距 — 可能导致前端高亮定位不准 |
| **自检循环** | 有 Self-Check 步骤 | ⚠️ 形同虚设 — 模型倾向全选"通过" |
| **行为宪法** | 有 MUST / MUST NOT 列表 | ✅ 已实现 |
| **注入防御** | 有完整的注入防御层 | ✅ 已实现，与 Anthropic 思想一致 |
| **流程化算法** | 7步流水线是算法化的 | ✅ 已实现 |
| **版本管理** | v1/ 目录 + CURRENT_PROMPT_VERSION | ✅ 已实现 |
| **Pipeline 架构** | PipelineExecutor 支持暂停/恢复/重试/跳过 | ✅ 架构优秀 |
| **场景知识注入** | 通过 scenarioKnowledge 参数动态注入 | ✅ 已实现 |
| **迭代评估** | 无评估框架 | ❌ 缺失 — 无法量化提示词改进效果 |
| **大写强调** | 有少量 IMPORTANT | ⚠️ 关键规则未用强调策略 |

---

## 七、优化方案

### 7.1 高优先级优化（立即实施，投入产出比最高）

#### 优化1：全面 XML 标签结构化

**理由**：三家厂商均推荐 XML 标签，Anthropic 尤为强调。当前使用的 `━` 分隔符和 `<<<INPUT_START` 标记不够精确。

**改动**：将 `analysis.system.md` 的结构从 `━━` 分隔改为 XML 标签：

```xml
<identity>
You are "YouJu" (有据), a Universal Information Alignment Agent...
</identity>

<execution_pipeline>
<step name="SCENARIO_DISCOVERY" order="1">
...
</step>
</execution_pipeline>

<behavioral_rules>
<must>...</must>
<must_not>...</must_not>
</behavioral_rules>

<safety>
...
</safety>

<context_separation>
<static_config>...</static_config>
<dynamic_input>
<<<INPUT_START
{SOURCE_MATERIALS}
INPUT_END>>>
</dynamic_input>
</context_separation>

<output_schema>
...
</output_schema>

<quality_bar>
...
</quality_bar>
```

#### 优化2：增加 Few-Shot 示例

**理由**：三家厂商一致认为 Few-Shot 是提升输出稳定性和质量最有效的方法。当前零示例的情况下，模型输出的格式、颗粒度、置信度都不稳定。

**改动**：在 `analysis.system.md` 的 `<output_schema>` 之后增加 `<examples>` 区块，包含 2-3 个高质量示例：

```xml
<examples>
<example>
<scenario>劳动合同 vs 口头承诺对比</scenario>
<input_summary>两份材料：1）正式劳动合同 2）微信聊天记录</input_summary>
<output>
{
  "task_type": "information_alignment_analysis",
  "scenario": {
    "type": "job_offer",
    "description": "对比正式劳动合同与微信沟通中的薪资承诺",
    "key_dimensions": ["monthly_salary", "bonus", "probation_period", "work_location"]
  },
  "extracted_entities": [
    {
      "dimension": "monthly_salary",
      "value": "合同：15,000元/月；微信：HR承诺18,000元/月",
      "evidence": {
        "sourceName": "劳动合同",
        "sourceType": "formal",
        "quote": "第三条 甲方支付乙方月工资人民币壹万伍仟元整",
        "confidence": 0.98
      }
    }
  ],
  "risks": [
    {
      "dimension": "monthly_salary",
      "type": "conflict",
      "level": "critical",
      "title": "月薪金额冲突",
      "description": "合同记载月薪15,000元，但微信聊天中HR明确承诺18,000元，存在3,000元差额",
      "evidence": [...]
    }
  ]
}
</output>
</example>
</examples>
```

#### 优化3：明确置信度评分标准

**理由**：当前 confidence 字段无评分标准，模型倾向随意给高分。三家厂商均强调"量化指标优于模糊描述"。

**改动**：在 `<behavioral_rules>` 中增加置信度定义：

```xml
<confidence_scoring>
  0.95-1.0: 有明确原文逐字引用，多源一致，无歧义
  0.80-0.94: 有原文引用，但表述略模糊，或只有单源
  0.60-0.79: 需要一定推理，证据较弱
  0.40-0.59: 推测性结论，应降级为 info 或移除
  <0.40: 不允许输出，直接丢弃
</confidence_scoring>
```

#### 优化4：细化证据引用规范

**理由**：当前只要求有 quote，但引用可能断章取义或过度省略，导致前端无法准确定位和高亮。

**改动**：增加引用规范：

```xml
<evidence_rules>
  - 引用必须是原文逐字摘录（保留原始标点和格式）
  - 引用长度控制在20-200字之间
  - 如有上下文依赖，必须完整引用相关句子
  - 禁止用"等"、"..."省略关键信息
  - 引用必须足以支撑对应结论——第三方读者仅凭引用即可判断结论是否合理
</evidence_rules>
```

#### 优化5：强化自检循环

**理由**：当前自检步骤形同虚设，模型倾向全选"通过"。Claude Code 的做法是写"流程化算法"而非零散规则。

**改动**：将自检步骤从"规则列表"改为"算法流程"：

```xml
<self_check_procedure>
For EACH risk in your output:
  1. FIND the original quote in source material → if not found, REMOVE this risk
  2. VERIFY the quote actually supports the conclusion → if not, REVISE
  3. CHECK confidence against scoring standard → if < 0.5, DOWNGRADE or REMOVE
  4. ASK: "Would a neutral third party agree this is a real risk?" → if not, REMOVE
  5. RECORD: write a one-sentence justification for keeping this risk

After checking ALL risks:
  6. COUNT total risks → if > 15, reconsider whether some are noise
  7. VERIFY all dimensions from Step 3 are covered → if not, explain why in uncertainties
</self_check_procedure>
```

### 7.2 中优先级优化（后续迭代）

#### 优化6：细化"信息缺失"判断门槛

增加缺失判断的准入条件：
- 该维度在同场景历史数据中出现频率 > 30%
- 或属于法律/监管要求必须有的条款
- 或属于高风险维度（金钱、时间、责任）
- 必须给出"为什么重要"的具体理由

#### 优化7：大写强调关键规则

对 MUST NOT 列表中的关键条目使用 IMPORTANT/NEVER/ALWAYS 强调：
- `NEVER hallucinate dimensions, facts, or risks`
- `ALWAYS include exact quotes from source material`
- `IMPORTANT: Confidence < 0.5 findings MUST be removed`

#### 优化8：维度发现方法论指导

增加维度发现的具体方法论：
```
1. 先提取所有实体和数值（人名、日期、金额、地点）
2. 再识别双方权利义务条款
3. 最后提取流程性/时间线信息
每个维度必须：
- 能用一句话说清楚"比较什么"
- 在至少1份材料中有明确提及
- 对决策有实际影响
```

### 7.3 长期优化（架构级）

#### 优化9：Prompt Caching 利用

参照 Claude Code 的静态/动态分界线设计：
- 将 `analysis.system.md` 的静态部分（identity, rules, schema, examples）放在前面
- 将动态注入部分（materials, scenarioKnowledge）放在后面
- 利用 Anthropic/OpenAI 的 Prompt Caching 能力缓存静态部分

#### 优化10：评估框架搭建

建立提示词评估数据集：
- 准备 10-20 个标准测试用例（含预期输出）
- 每次提示词修改后跑评估，量化改进效果
- 关注维度：格式合规率、证据引用率、幻觉率、置信度分布

#### 优化11：多模型适配层

当前的提示词以英文编写，但输出要求中文。长期应考虑：
- 主模型使用 Claude → 保留 XML 标签结构
- 备选模型使用 GPT → 适配 OpenAI 的 developer 角色体系
- 备选模型使用 Gemini → 适配 Google 的 function calling 格式

---

## 八、实施计划

### 第一阶段：核心优化

| 步骤 | 文件 | 改动 |
|------|------|------|
| 1 | `analysis.system.md` | 全面 XML 标签化改造 |
| 2 | `analysis.system.md` | 增加 Few-Shot 示例区块 |
| 3 | `analysis.system.md` | 增加置信度评分标准 |
| 4 | `analysis.system.md` | 增加证据引用规范 |
| 5 | `analysis.system.md` | 自检步骤算法化 |
| 6 | `chat.system.md` | 同步 XML 标签化 |
| 7 | `draft.system.md` | 同步 XML 标签化 |
| 8 | `analysis.user.ts` | 适配 XML 标签输入格式 |

### 第二阶段：增强优化

| 步骤 | 文件 | 改动 |
|------|------|------|
| 9 | `analysis.system.md` | 细化缺失判断门槛 |
| 10 | `analysis.system.md` | 大写强调关键规则 |
| 11 | `analysis.system.md` | 维度发现方法论 |
| 12 | `domain/rules/riskRules.ts` | 增加置信度阈值常量 |

### 第三阶段：架构优化

| 步骤 | 文件 | 改动 |
|------|------|------|
| 13 | AI adapter 层 | Prompt Caching 集成 |
| 14 | 新建评估模块 | 提示词评估框架 |
| 15 | AI adapter 层 | 多模型适配层 |

---

## 九、风险评估

| 风险 | 概率 | 影响 | 缓解措施 |
|------|------|------|----------|
| XML 标签化导致输出格式变化 | 中 | 中 | 先在测试环境验证，逐步推出 v2 |
| Few-Shot 示例占据过多 token | 低 | 中 | 控制在 500 token 以内，只保留最关键的示例 |
| 置信度标准过于严格导致漏报 | 中 | 高 | 设置合理的阈值区间，0.4-0.59 降级而非直接删除 |
| 自检算法化增加推理成本 | 低 | 低 | 自检步骤已独立，不影响主流程 |

---

## 十、结论

本项目的提示词架构在行业中处于**中上水平**——7层结构、7步流水线、静态/动态分离、行为宪法、注入防御等设计与业界最佳实践高度一致。

主要差距集中在**细节打磨**而非架构层面：
1. **缺少 Few-Shot 示例**（行业公认最重要的优化，预计 +30% 输出稳定性）
2. **未采用 XML 标签结构化**（三家厂商一致推荐）
3. **置信度/证据引用/自检循环**等关键环节缺少操作化标准
4. **未利用 Prompt Caching**（可降本 90%+）

这些优化可以**不改变架构**的情况下逐步实施，风险可控，收益显著。
