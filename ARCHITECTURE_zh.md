# 💬 YouJu (有据) 架构设计与风险分析引擎 (Architecture Guide)

<p align="center">
  <b><a href="./ARCHITECTURE.md">English</a> | 简体中文</b>
</p>

本文档说明 **YouJu (有据)** AI 驱动合同漏洞与法律对话风险分析工作台的 DDD 5 层整洁架构与确定性启发式分级引擎。

```mermaid
graph TD
    Client[React 18 / Tailwind 前端] -->|API 请求| Gateway[API 网关与路由分发]

    subgraph "5 层 DDD 整洁架构"
        Gateway --> InterfaceLayer[1. 接口适配层 (Interfaces / DTO)]
        InterfaceLayer --> AppLayer[2. 应用编排层 (Application Services)]
        AppLayer --> DomainLayer[3. 核心领域层 (Domain Rules & Aggregates)]
        AppLayer --> RiskEngine[4. 风险评估与自省引擎 (Risk Classifier)]
        DomainLayer --> InfraLayer[5. 基础设施层 (LLM / Database / Storage)]
    end

    subgraph "风险评估与自省流水线"
        RiskEngine --> ZodValidator[运行时 Zod Schema 强校验]
        RiskEngine --> HeuristicFallback[离线确定性启发式兜底]
        RiskEngine --> ReflectionLoop[LLM 双向自省验证循环]
    end
```

---

## 🏛️ 1. 5-Layer DDD 严格领域隔离
- **领域核心独立**：业务实体与风险分类聚合根不依赖任何外部框架与 LLM SDK。
- **契约先行**：所有外部输入输出均通过运行时 Zod 强类型校验，阻断畸形 Payload。

---

## 🛡️ 2. 3 级风险评估与离线兜底机制
- **高危漏洞 (Critical)**：霸王条款、免责过界、单方解约陷阱。
- **中度瑕疵 (Warning)**：履行期限模糊、违约金计算标准缺失。
- **合规建议 (Info)**：不可抗力条款细化。
- **网络中断/服务异常**：自动降级至离线确定性启发式正则与规则库匹配。

---

<sub>© 2026 YouJu. Licensed under the MIT License.</sub>
