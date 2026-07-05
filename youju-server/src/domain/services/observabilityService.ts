import type {
  ObservabilityReadRepository,
  ScenarioKnowledgeReadRepository,
} from '../ports/repositories.js'

export class ObservabilityService {
  constructor(
    private readonly observabilityRepo: ObservabilityReadRepository,
    private readonly scenarioKnowledgeRepo: ScenarioKnowledgeReadRepository,
  ) {}

  async getCostStats(userId: number | null, sessionId?: string | null) {
    return this.observabilityRepo.getCostStats(userId, sessionId)
  }

  async getStepPerformanceStats(userId: number | null, sessionId?: string | null) {
    return this.observabilityRepo.getStepPerformanceStats(userId, sessionId)
  }

  async getScenarioKnowledge(scenarioType: string, limit: number = 10) {
    return this.scenarioKnowledgeRepo.getTopKnowledge(scenarioType, limit)
  }

  async getKnowledgeStats() {
    return this.scenarioKnowledgeRepo.getKnowledgeStats?.() || { total: 0, byScenario: {} }
  }
}
