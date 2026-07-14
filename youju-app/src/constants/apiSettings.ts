/**
 * API 设置面板共享数据（mock 占位）
 *
 * ApiSettingsPanel 和 ApiSettingsContent 共用此数据。
 * 后续接入真实 API 后替换为接口拉取。
 */

export interface ApiKey {
  id: string
  name: string
  key: string
  createdAt: string
  lastUsed: string
  scopes: string[]
}

export interface WebhookEndpoint {
  id: string
  name: string
  url: string
  events: string[]
  active: boolean
  createdAt: string
}

export const MOCK_API_KEYS: ApiKey[] = [
  {
    id: 'ak1',
    name: '生产环境密钥',
    key: 'sk-youju-prod-xxxxxxxxxxxxxxxxxxxx',
    createdAt: '2024-01-15',
    lastUsed: '2 小时前',
    scopes: ['read', 'write', 'analyze'],
  },
  {
    id: 'ak2',
    name: '测试环境密钥',
    key: 'sk-youju-test-xxxxxxxxxxxxxxxxxxxx',
    createdAt: '2024-03-20',
    lastUsed: '3 天前',
    scopes: ['read', 'analyze'],
  },
]

export const MOCK_WEBHOOKS: WebhookEndpoint[] = [
  {
    id: 'wh1',
    name: '分析完成通知',
    url: 'https://api.example.com/webhooks/analysis-complete',
    events: ['analysis.completed', 'analysis.failed'],
    active: true,
    createdAt: '2024-02-10',
  },
  {
    id: 'wh2',
    name: '团队协作通知',
    url: 'https://api.example.com/webhooks/team',
    events: ['team.member_added'],
    active: false,
    createdAt: '2024-04-05',
  },
]

export const AVAILABLE_EVENTS = [
  { id: 'analysis.completed', label: '分析完成', description: '当分析任务完成时触发' },
  { id: 'analysis.failed', label: '分析失败', description: '当分析任务失败时触发' },
  { id: 'analysis.incremental', label: '增量分析完成', description: '当增量分析完成时触发' },
  { id: 'team.member_added', label: '成员加入', description: '当有新成员加入团队时触发' },
  { id: 'team.member_removed', label: '成员移除', description: '当成员被移除时触发' },
  { id: 'billing.subscription_changed', label: '订阅变更', description: '当订阅状态变更时触发' },
]
