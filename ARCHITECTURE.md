# 💬 YouJu Architecture Blueprint

<p align="center">
  <b>English | <a href="./ARCHITECTURE_zh.md">简体中文</a></b>
</p>

This document details the 5-layer Domain-Driven Design (DDD) Clean Architecture and deterministic risk arbitration engine powering **YouJu**.

```mermaid
graph TD
    Client[React 18 / Tailwind Frontend] -->|API Request| Gateway[API Gateway & Router]

    subgraph "5-Layer DDD Clean Architecture"
        Gateway --> InterfaceLayer[1. Interface Layer (DTO / Adapters)]
        InterfaceLayer --> AppLayer[2. Application Layer (Orchestration)]
        AppLayer --> DomainLayer[3. Core Domain Layer (Entities & Rules)]
        AppLayer --> RiskEngine[4. Risk Engine (Arbitration & Metrics)]
        DomainLayer --> InfraLayer[5. Infrastructure Layer (LLM / DB)]
    end

    subgraph "Risk Classification Pipeline"
        RiskEngine --> ZodValidator[Runtime Zod Schema Validation]
        RiskEngine --> HeuristicFallback[Offline Deterministic Fallback]
        RiskEngine --> ReflectionLoop[LLM Dual-Reflection Loop]
    end
```

---

## 🏛️ 1. 5-Layer DDD Strict Boundary Isolation
- **Core Domain Independence**: Business entities and risk evaluation aggregates have zero dependencies on external frameworks or LLM SDKs.
- **Contract-First**: Every input/output payload is strictly validated at runtime with Zod schemas to block malformed data.

---

## 🛡️ 2. 3-Tier Risk Hierarchy & Offline Heuristic Fallback
- **Critical Risks**: Unilateral termination clauses, excessive liability exemptions.
- **Warnings**: Ambiguous performance deadlines, missing default calculation metrics.
- **Informational**: Force majeure clause refinements.
- **Offline Fallback**: Seamlessly degrades to local regex and heuristic rule banks if network connectivity is disrupted.

---

<sub>© 2026 YouJu. Licensed under the MIT License.</sub>
