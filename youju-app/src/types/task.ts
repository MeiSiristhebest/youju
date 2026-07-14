export interface TaskRecord {
  id: string
  title: string
  scenarioType?: string
  sourceCount: number
  createdAt: string
}

export interface Task {
  id: string
  userId: number | null
  sessionId: string | null
  title: string
  scenarioType?: string
  sourceIds: string[]
  result: unknown
  status?: string
  riskCount?: number
  createdAt: string
  updatedAt?: string
}
