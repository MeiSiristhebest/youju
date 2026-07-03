export type SourceType = 'chat' | 'doc' | 'web' | 'screenshot' | 'contract'
export type RiskLevel = 'critical' | 'warning' | 'info'
export type ScenarioType = 'job' | 'rent' | 'homework' | 'purchase' | 'custom'

export interface Scenario {
  id: ScenarioType
  name: string
  icon: string
  description: string
  sourceCount: number
}

export interface ApiResponse<T = unknown> {
  code: number
  data: T
  msg?: string
}

export interface User {
  id: number
  nickname: string
  avatar: string
  phone?: string
}
