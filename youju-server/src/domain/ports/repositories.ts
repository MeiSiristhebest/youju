import type {
  AnalysisLog,
  AnalysisStats,
  AnalysisStep,
  CostStats,
  ScenarioKnowledge,
  Share,
  Source,
  StepEvent,
  StepPerformanceStats,
  Task,
  TaskResult,
  User,
} from '../types.js'

export interface ObservabilityRepository {
  getCostStats(userId: number | null, sessionId?: string | null): Promise<CostStats>
  getStepPerformanceStats(
    userId: number | null,
    sessionId?: string | null,
    limit?: number,
  ): Promise<StepPerformanceStats[]>
  estimateCost(tokenPrompt: number, tokenCompletion: number, model: string): number
}

export interface AnalysisLogRepository {
  createAnalysisLog(
    input: Omit<AnalysisLog, 'id' | 'createdAt' | 'version' | 'logGroupId'> & {
      logGroupId?: string | null
      version?: number
    },
  ): Promise<{ id: string; logGroupId: string; version: number } & AnalysisLog>
  appendAnalysisLog(
    logGroupId: string,
    status: string,
    patch: Partial<AnalysisLog>,
  ): Promise<AnalysisLog>
  getLatestAnalysisLog(logGroupId: string): Promise<AnalysisLog | null>
  getAnalysisLogById(id: string): Promise<AnalysisLog | null>
  getAnalysisLogsByUser(
    userId: number | null,
    sessionId?: string | null,
    limit?: number,
  ): Promise<AnalysisLog[]>
  getAnalysisStats(userId: number | null, sessionId?: string | null): Promise<AnalysisStats>
  saveCheckpoint(analysisLogId: string, checkpointData: unknown): Promise<void>
  getCheckpoint(analysisLogId: string): Promise<unknown | null>
  updateAnalysisLog?(id: string, data: Partial<AnalysisLog>): Promise<void>
}

export interface AnalysisStepRepository {
  createAnalysisStep(
    input: Omit<AnalysisStep, 'id' | 'startedAt' | 'completedAt'> & {
      startedAt?: string | null
      completedAt?: string | null
    },
  ): Promise<AnalysisStep>
  updateAnalysisStep?(id: string, data: Partial<AnalysisStep>): Promise<boolean>
  getAnalysisStepsByLogId(analysisLogId: string): Promise<AnalysisStep[]>
  getLatestStepByLogAndStepId(analysisLogId: string, stepId: string): Promise<AnalysisStep | null>
  createStepEvent(
    input: Omit<StepEvent, 'id' | 'createdAt'> & { createdAt?: string },
  ): Promise<StepEvent>
  getStepEvents(analysisLogId: string, stepId: string): Promise<StepEvent[]>
}

export interface TaskResultRepository {
  createTaskResult(taskId: string, result: unknown, analysisLogId?: string): Promise<TaskResult>
  getLatestTaskResult(taskId: string): Promise<TaskResult | null>
  getTaskResultVersions(taskId: string): Promise<TaskResult[]>
  getTaskResultByVersion(taskId: string, version: number): Promise<TaskResult | null>
}

export interface ScenarioKnowledgeRepository {
  accumulateScenarioKnowledge(
    scenarioType: string,
    items: Array<{ type: string; dimension: string; confidence: number }>,
  ): Promise<void>
  getTopKnowledge(scenarioType: string, limit: number): Promise<ScenarioKnowledge[]>
  getScenarioKnowledge?(
    scenarioType: string,
    limit?: number,
    version?: string,
  ): Promise<ScenarioKnowledge[]>
  getTopRiskTypesByScenario?(
    scenarioType: string,
    limit?: number,
    version?: string,
  ): Promise<string[]>
  getKnowledgeStats?(): Promise<{ total: number; byScenario: Record<string, number> }>
  applyTimeDecay(): Promise<void>
  recalculateWeightedFrequencies(): Promise<void>
  pruneLowQualityKnowledge(threshold?: number): Promise<number>
}

export interface UserRepository {
  findOrCreateUser(openid: string, nickname?: string, avatar?: string): Promise<User>
  getUserById(id: number): Promise<User | null>
}

export interface PreferenceRepository {
  getUserPreference(userId: number | null, sessionId: string | null, key: string): Promise<unknown>
  setUserPreference(
    userId: number | null,
    sessionId: string | null,
    key: string,
    value: unknown,
  ): Promise<void>
}

export interface SourceRepository {
  createSource(
    userId: number | null,
    sessionId: string | null,
    type: string,
    name: string,
    content: string,
    meta?: string,
  ): Promise<Source>
  getSourcesByUser(userId: number | null, sessionId?: string | null): Promise<Source[]>
  getSourceById(id: string): Promise<Source | null>
  getSourceIds?(sourceIds: string[]): Promise<string[]>
  deleteSource(userId: number | null, sessionId: string | null, id: string): Promise<boolean>
}

export interface TaskRepository {
  createTask(
    userId: number | null,
    sessionId: string | null,
    title: string,
    scenarioType?: string,
  ): Promise<Task>
  getTaskById(userId: number | null, sessionId: string | null, id: string): Promise<Task | null>
  getTasksByUser(userId: number | null, sessionId: string | null): Promise<Task[]>
  updateTask(
    userId: number | null,
    sessionId: string | null,
    id: string,
    data: Partial<Task>,
  ): Promise<Task | null>
  deleteTask(userId: number | null, sessionId: string | null, id: string): Promise<boolean>
  getTaskChecklistState(taskId: string): Promise<unknown | null>
  updateTaskChecklistState(taskId: string, state: unknown): Promise<void>
}

export interface ShareRepository {
  createShare(
    userId: number | null,
    sessionId: string | null,
    taskId: string,
    title: string,
    snapshotData: unknown,
    expiresAt?: string,
  ): Promise<Share & { url: string }>
  getShareByToken(token: string): Promise<(Share & { task: Task | null; result: unknown }) | null>
  getShareById(userId: number | null, sessionId: string | null, id: string): Promise<Share | null>
  getSharesByUser(userId: number | null, sessionId: string | null): Promise<Share[]>
  getSharesByTask(taskId: string): Promise<Share[]>
  deleteShare(userId: number | null, sessionId: string | null, id: string): Promise<boolean>
  incrementShareView?(id: string): Promise<boolean>
  generateShareToken?(): string
}
