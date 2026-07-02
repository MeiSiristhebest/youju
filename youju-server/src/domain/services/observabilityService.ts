import type { ObservabilityRepository, ScenarioKnowledgeRepository } from '../ports/repositories.js'

let _observabilityRepo: ObservabilityRepository | null = null
let _scenarioKnowledgeRepo: ScenarioKnowledgeRepository | null = null

export function setObservabilityRepository(repo: ObservabilityRepository): void {
  _observabilityRepo = repo
}

export function setScenarioKnowledgeRepositoryForObservability(
  repo: ScenarioKnowledgeRepository,
): void {
  _scenarioKnowledgeRepo = repo
}

function getObservabilityRepo(): ObservabilityRepository {
  if (!_observabilityRepo) {
    throw new Error('ObservabilityRepository not set.')
  }
  return _observabilityRepo
}

function getScenarioKnowledgeRepo(): ScenarioKnowledgeRepository {
  if (!_scenarioKnowledgeRepo) {
    throw new Error('ScenarioKnowledgeRepository not set.')
  }
  return _scenarioKnowledgeRepo
}

export async function getCostStats(userId: number | null, sessionId?: string | null) {
  return getObservabilityRepo().getCostStats(userId, sessionId)
}

export async function getStepPerformanceStats(userId: number | null, sessionId?: string | null) {
  return getObservabilityRepo().getStepPerformanceStats(userId, sessionId)
}

export async function getScenarioKnowledge(scenarioType: string, limit: number = 10) {
  return getScenarioKnowledgeRepo().getTopKnowledge(scenarioType, limit)
}

export async function getKnowledgeStats() {
  return getScenarioKnowledgeRepo().getKnowledgeStats?.() || { total: 0, byScenario: {} }
}
