import {
  Check,
  Clock,
  Code2,
  Copy,
  Eye,
  EyeOff,
  Globe,
  Key,
  Plus,
  Trash2,
  Webhook,
  X,
} from 'lucide-react'
import { useState } from 'react'
import { cn } from '../../lib/utils'

interface ApiKey {
  id: string
  name: string
  key: string
  createdAt: string
  lastUsed: string
  scopes: string[]
}

interface WebhookEndpoint {
  id: string
  name: string
  url: string
  events: string[]
  active: boolean
  createdAt: string
}

const MOCK_API_KEYS: ApiKey[] = [
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

const MOCK_WEBHOOKS: WebhookEndpoint[] = [
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

const AVAILABLE_EVENTS = [
  { id: 'analysis.completed', label: '分析完成', description: '当分析任务完成时触发' },
  { id: 'analysis.failed', label: '分析失败', description: '当分析任务失败时触发' },
  { id: 'analysis.incremental', label: '增量分析完成', description: '当增量分析完成时触发' },
  { id: 'team.member_added', label: '成员加入', description: '当有新成员加入团队时触发' },
  { id: 'team.member_removed', label: '成员移除', description: '当成员被移除时触发' },
  { id: 'billing.subscription_changed', label: '订阅变更', description: '当订阅状态变更时触发' },
]

interface ApiSettingsPanelProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
}

export function ApiSettingsPanel({ isOpen, onOpenChange }: ApiSettingsPanelProps) {
  const [activeTab, setActiveTab] = useState<'api-keys' | 'webhooks'>('api-keys')
  const [apiKeys, setApiKeys] = useState<ApiKey[]>(MOCK_API_KEYS)
  const [webhooks, setWebhooks] = useState<WebhookEndpoint[]>(MOCK_WEBHOOKS)
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set())
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const [showNewKeyModal, setShowNewKeyModal] = useState(false)
  const [newKeyName, setNewKeyName] = useState('')

  const toggleKeyVisibility = (id: string) => {
    setVisibleKeys((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const copyKey = async (key: string, id: string) => {
    await navigator.clipboard?.writeText(key)
    setCopiedKey(id)
    setTimeout(() => setCopiedKey(null), 2000)
  }

  const deleteKey = (id: string) => {
    setApiKeys((prev) => prev.filter((k) => k.id !== id))
  }

  const toggleWebhook = (id: string) => {
    setWebhooks((prev) => prev.map((w) => (w.id === id ? { ...w, active: !w.active } : w)))
  }

  const deleteWebhook = (id: string) => {
    setWebhooks((prev) => prev.filter((w) => w.id !== id))
  }

  const createNewKey = () => {
    if (!newKeyName.trim()) return
    const newKey: ApiKey = {
      id: `ak_${Date.now()}`,
      name: newKeyName,
      key: `sk-youju-${Math.random().toString(36).slice(2, 26)}`,
      createdAt: new Date().toISOString().split('T')[0],
      lastUsed: '从未使用',
      scopes: ['read', 'analyze'],
    }
    setApiKeys((prev) => [...prev, newKey])
    setNewKeyName('')
    setShowNewKeyModal(false)
  }

  if (!isOpen) return null

  return (
    <div className="h-full flex flex-col bg-paper border-l border-rule">
      <div className="flex items-center justify-between px-4 py-3 border-b border-rule">
        <div className="flex items-center gap-2">
          <Code2 size={14} strokeWidth={1.5} className="text-ink" />
          <span className="text-sm font-medium text-ink">API 与 Webhook</span>
        </div>
        <button
          type="button"
          onClick={() => onOpenChange(false)}
          className="p-1 rounded-md text-ink-faint hover:text-ink hover:bg-paper-dark transition-colors"
        >
          <X size={14} strokeWidth={1.5} />
        </button>
      </div>

      <div className="flex items-center gap-1 px-3 py-2 border-b border-rule/60">
        <button
          type="button"
          onClick={() => setActiveTab('api-keys')}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-medium transition-colors',
            activeTab === 'api-keys'
              ? 'bg-paper-dark text-ink border border-rule/60'
              : 'text-ink-faint hover:text-ink-muted hover:bg-paper-dark/60',
          )}
        >
          <Key size={11} strokeWidth={1.5} />
          API Key
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('webhooks')}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-medium transition-colors',
            activeTab === 'webhooks'
              ? 'bg-paper-dark text-ink border border-rule/60'
              : 'text-ink-faint hover:text-ink-muted hover:bg-paper-dark/60',
          )}
        >
          <Webhook size={11} strokeWidth={1.5} />
          Webhook
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {activeTab === 'api-keys' && (
          <div className="p-3">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-[11px] text-ink-muted">管理你的 API 密钥，用于调用分析服务</p>
              </div>
              <button
                type="button"
                onClick={() => setShowNewKeyModal(true)}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[11px] font-medium bg-accent text-paper hover:bg-accent-tertiary transition-colors"
              >
                <Plus size={11} strokeWidth={1.5} />
                新建密钥
              </button>
            </div>

            {showNewKeyModal && (
              <div className="p-3 bg-accent-bg/30 border border-accent-faint/50 rounded-lg mb-3 animate-in fade-in slide-in-from-top-2 duration-200">
                <p className="text-[11px] font-medium text-ink mb-2">创建新的 API 密钥</p>
                <input
                  type="text"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  placeholder="输入密钥名称"
                  className="w-full px-3 py-2 bg-paper border border-rule/60 rounded-md text-xs text-ink placeholder:text-ink-faint focus:outline-none focus:border-accent/50 mb-2"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={createNewKey}
                    className="flex-1 py-1.5 bg-accent text-paper rounded-md text-[11px] font-medium hover:bg-accent-tertiary transition-colors"
                  >
                    创建
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowNewKeyModal(false)}
                    className="px-3 py-1.5 bg-paper-dark text-ink-muted rounded-md text-[11px] font-medium hover:text-ink transition-colors"
                  >
                    取消
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-2">
              {apiKeys.map((apiKey) => (
                <div
                  key={apiKey.id}
                  className="p-3 bg-paper-dark/40 border border-rule/50 rounded-lg group hover:border-rule/80 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs font-medium text-ink truncate">{apiKey.name}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <code className="flex-1 px-2 py-1 bg-paper border border-rule/60 rounded text-[10px] text-ink-muted font-mono truncate">
                          {visibleKeys.has(apiKey.id) ? apiKey.key : '••••••••••••••••••••'}
                        </code>
                        <button
                          type="button"
                          onClick={() => toggleKeyVisibility(apiKey.id)}
                          className="p-1 rounded text-ink-faint hover:text-ink hover:bg-paper transition-colors"
                          title={visibleKeys.has(apiKey.id) ? '隐藏' : '显示'}
                        >
                          {visibleKeys.has(apiKey.id) ? (
                            <EyeOff size={12} strokeWidth={1.5} />
                          ) : (
                            <Eye size={12} strokeWidth={1.5} />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => copyKey(apiKey.key, apiKey.id)}
                          className="p-1 rounded text-ink-faint hover:text-accent hover:bg-accent-bg transition-colors"
                          title="复制"
                        >
                          {copiedKey === apiKey.id ? (
                            <Check size={12} strokeWidth={1.5} className="text-success" />
                          ) : (
                            <Copy size={12} strokeWidth={1.5} />
                          )}
                        </button>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => deleteKey(apiKey.id)}
                      className="p-1 rounded text-ink-faint opacity-0 group-hover:opacity-100 hover:text-danger hover:bg-danger-bg transition-all"
                    >
                      <Trash2 size={12} strokeWidth={1.5} />
                    </button>
                  </div>
                  <div className="flex items-center gap-3 text-[10px] text-ink-faint">
                    <span className="flex items-center gap-1">
                      <Clock size={9} strokeWidth={1.5} />
                      最后使用：{apiKey.lastUsed}
                    </span>
                    <span>·</span>
                    <span>创建于 {apiKey.createdAt}</span>
                  </div>
                  <div className="flex items-center gap-1 mt-2">
                    {apiKey.scopes.map((scope) => (
                      <span
                        key={scope}
                        className="px-1.5 py-0.5 bg-paper border border-rule/60 rounded text-[9px] text-ink-muted font-mono"
                      >
                        {scope}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 p-3 bg-paper-dark/30 border border-rule/40 rounded-lg">
              <p className="text-[11px] font-medium text-ink mb-1.5">API 文档</p>
              <p className="text-[10px] text-ink-faint leading-relaxed mb-2">
                查看完整的 API 文档，了解如何集成分析服务到你的工作流中。
              </p>
              <button
                type="button"
                className="inline-flex items-center gap-1 text-[10px] font-medium text-accent hover:text-accent-tertiary transition-colors"
              >
                <Globe size={10} strokeWidth={1.5} />
                查看 API 文档
              </button>
            </div>
          </div>
        )}

        {activeTab === 'webhooks' && (
          <div className="p-3">
            <div className="mb-3">
              <p className="text-[11px] text-ink-muted">配置 Webhook 端点，实时接收事件通知</p>
            </div>

            <div className="space-y-2">
              {webhooks.map((webhook) => (
                <div
                  key={webhook.id}
                  className="p-3 bg-paper-dark/40 border border-rule/50 rounded-lg group hover:border-rule/80 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <div
                        className={cn(
                          'w-2 h-2 rounded-full',
                          webhook.active ? 'bg-success' : 'bg-ink-faint',
                        )}
                      />
                      <h4 className="text-xs font-medium text-ink">{webhook.name}</h4>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => toggleWebhook(webhook.id)}
                        className={cn(
                          'w-8 h-4 rounded-full relative transition-colors',
                          webhook.active ? 'bg-accent' : 'bg-paper-dark border border-rule/60',
                        )}
                      >
                        <div
                          className={cn(
                            'absolute top-0.5 w-3 h-3 bg-paper rounded-full shadow transition-all',
                            webhook.active ? 'left-4' : 'left-0.5',
                          )}
                        />
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteWebhook(webhook.id)}
                        className="p-1 rounded text-ink-faint opacity-0 group-hover:opacity-100 hover:text-danger hover:bg-danger-bg transition-all"
                      >
                        <Trash2 size={12} strokeWidth={1.5} />
                      </button>
                    </div>
                  </div>
                  <code className="block px-2 py-1.5 bg-paper border border-rule/60 rounded text-[10px] text-ink-muted font-mono truncate mb-2">
                    {webhook.url}
                  </code>
                  <div className="flex flex-wrap gap-1">
                    {webhook.events.map((event) => (
                      <span
                        key={event}
                        className="px-1.5 py-0.5 bg-accent-bg/50 border border-accent-faint/40 rounded text-[9px] text-accent font-mono"
                      >
                        {event}
                      </span>
                    ))}
                  </div>
                </div>
              ))}

              <button
                type="button"
                className="w-full p-3 border border-dashed border-rule/60 rounded-lg text-[11px] text-ink-faint hover:text-ink hover:border-rule hover:bg-paper-dark/30 transition-all flex items-center justify-center gap-1.5"
              >
                <Plus size={12} strokeWidth={1.5} />
                添加 Webhook 端点
              </button>
            </div>

            <div className="mt-4">
              <p className="text-[10px] font-medium text-ink-faint uppercase tracking-[0.15em] font-mono mb-2">
                可用事件
              </p>
              <div className="space-y-1.5">
                {AVAILABLE_EVENTS.map((event) => (
                  <div
                    key={event.id}
                    className="p-2 bg-paper-dark/30 rounded-md border border-rule/40"
                  >
                    <code className="text-[10px] text-accent font-mono">{event.id}</code>
                    <p className="text-[10px] text-ink-faint mt-0.5">{event.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
