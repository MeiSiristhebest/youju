import { useQuery } from '@tanstack/react-query'
import {
  Check,
  Info,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Server,
  Sparkles,
  Trash2,
  X,
  Zap,
} from 'lucide-react'
import { useState } from 'react'
import { cn } from '../../lib/utils'
import {
  fetchModelList,
  fetchProviderPresets,
  type ModelItem,
  type ModelProvider,
  testModelConnection,
} from '../../services/modelConfigApi'
import {
  type ModelConfig,
  type ModelConfigType,
  useModelConfigStore,
} from '../../stores/useModelConfigStore'

const PROVIDER_LABELS: Record<ModelProvider, string> = {
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  gemini: 'Google Gemini',
  deepseek: 'DeepSeek',
  zhipu: '智谱 AI',
  moonshot: 'Moonshot (Kimi)',
  qwen: '通义千问',
  volcengine: '火山引擎 (豆包)',
  qianfan: '百度千帆 (文心)',
  yi: '零一万物 (Yi)',
  spark: '讯飞星火',
  openrouter: 'OpenRouter',
  agnes: 'Agnes AI',
  custom: '自定义',
}

/**
 * 厂商预设兜底数据
 *
 * 同步约定：此列表须与后端 youju-server/src/domain/registry/modelRegistry.ts
 * 的 PROVIDER_PRESETS 保持一致。新增厂商时需同步修改两处。
 * 正常运行时通过 /api/v1/models/presets 动态拉取，此常量仅在 API 不可用时降级使用。
 */
const PROVIDER_PRESETS_FALLBACK: Record<
  ModelProvider,
  { baseURL: string; model: string; name: string }
> = {
  openai: { name: 'OpenAI GPT-5.5', baseURL: 'https://api.openai.com/v1', model: 'gpt-5.5' },
  anthropic: {
    name: 'Anthropic Claude',
    baseURL: 'https://api.anthropic.com/v1',
    model: 'claude-sonnet-5',
  },
  gemini: {
    name: 'Gemini 3.5 Flash',
    baseURL: 'https://generativelanguage.googleapis.com/v1beta',
    model: 'gemini-3.5-flash',
  },
  deepseek: {
    name: 'DeepSeek V4',
    baseURL: 'https://api.deepseek.com',
    model: 'deepseek-v4-flash',
  },
  zhipu: {
    name: '智谱 GLM-5.2',
    baseURL: 'https://open.bigmodel.cn/api/paas/v4',
    model: 'glm-5.2',
  },
  moonshot: { name: 'Kimi K2.5', baseURL: 'https://api.moonshot.cn/v1', model: 'kimi-k2.5' },
  qwen: {
    name: '通义千问 Qwen3.6',
    baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    model: 'qwen3.6-max-preview',
  },
  volcengine: {
    name: '豆包 Seed 1.6',
    baseURL: 'https://ark.cn-beijing.volces.com/api/v3',
    model: 'doubao-seed-1-6-251015',
  },
  qianfan: {
    name: '文心 ERNIE 4.5',
    baseURL: 'https://qianfan.baidubce.com/v2',
    model: 'ernie-4.5-turbo-128k',
  },
  yi: { name: '零一万物 Yi-Light', baseURL: 'https://api.lingyiwanwu.com/v1', model: 'yi-light' },
  spark: {
    name: '讯飞星火 4.0 Ultra',
    baseURL: 'https://spark-api-open.xf-yun.com/v1',
    model: '4.0Ultra',
  },
  openrouter: {
    name: 'OpenRouter',
    baseURL: 'https://openrouter.ai/api/v1',
    model: 'anthropic/claude-sonnet-5',
  },
  agnes: {
    name: 'Agnes 2.0 Flash',
    baseURL: 'https://apihub.agnes-ai.com/v1',
    model: 'agnes-2.0-flash',
  },
  custom: { name: '', baseURL: '', model: '' },
}

const EMBEDDING_PRESETS_FALLBACK: Record<
  ModelProvider,
  { baseURL: string; model: string; name: string }
> = {
  openai: {
    name: 'OpenAI text-embedding-3-large',
    baseURL: 'https://api.openai.com/v1',
    model: 'text-embedding-3-large',
  },
  anthropic: { name: '', baseURL: '', model: '' },
  gemini: {
    name: 'Gemini Embedding',
    baseURL: 'https://generativelanguage.googleapis.com/v1beta',
    model: 'embedding-001',
  },
  deepseek: {
    name: 'DeepSeek Embedding',
    baseURL: 'https://api.deepseek.com',
    model: 'deepseek-embedding',
  },
  zhipu: {
    name: '智谱 Embedding',
    baseURL: 'https://open.bigmodel.cn/api/paas/v4',
    model: 'embedding-3',
  },
  moonshot: {
    name: 'Kimi Embedding',
    baseURL: 'https://api.moonshot.cn/v1',
    model: 'moonshot-embedding',
  },
  qwen: {
    name: '通义千问 Embedding',
    baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    model: 'text-embedding-v3',
  },
  volcengine: {
    name: '豆包 Embedding',
    baseURL: 'https://ark.cn-beijing.volces.com/api/v3',
    model: 'doubao-embedding',
  },
  qianfan: {
    name: '文心 Embedding',
    baseURL: 'https://qianfan.baidubce.com/v2',
    model: 'embedding-v1',
  },
  yi: {
    name: '零一万物 Embedding',
    baseURL: 'https://api.lingyiwanwu.com/v1',
    model: 'yi-embedding',
  },
  spark: {
    name: '讯飞星火 Embedding',
    baseURL: 'https://spark-api-open.xf-yun.com/v1',
    model: 'embedding',
  },
  openrouter: {
    name: 'OpenRouter Embedding',
    baseURL: 'https://openrouter.ai/api/v1',
    model: 'openai/text-embedding-3-large',
  },
  agnes: { name: 'Agnes Embedding', baseURL: 'https://apihub.agnes-ai.com/v1', model: 'bge-m3' },
  custom: { name: '', baseURL: '', model: '' },
}

interface FormState {
  name: string
  provider: ModelProvider
  apiKey: string
  baseURL: string
  model: string
  isDefault: boolean
}

const EMPTY_FORM: FormState = {
  name: '',
  provider: 'openai',
  apiKey: '',
  baseURL: PROVIDER_PRESETS_FALLBACK.openai.baseURL,
  model: PROVIDER_PRESETS_FALLBACK.openai.model,
  isDefault: false,
}

interface ModelSettingsContentProps {
  onClose?: () => void
  className?: string
}

export function ModelSettingsContent({ onClose, className }: ModelSettingsContentProps) {
  const configs = useModelConfigStore((s) => s.configs)
  const addConfig = useModelConfigStore((s) => s.addConfig)
  const updateConfig = useModelConfigStore((s) => s.updateConfig)
  const deleteConfig = useModelConfigStore((s) => s.deleteConfig)
  const setDefault = useModelConfigStore((s) => s.setDefault)
  const loading = false
  const [activeTab, setActiveTab] = useState<ModelConfigType>('llm')
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)
  const [fetchingModels, setFetchingModels] = useState(false)
  const [availableModels, setAvailableModels] = useState<ModelItem[]>([])
  const [showModelDropdown, setShowModelDropdown] = useState(false)
  const [modelSearchQuery, setModelSearchQuery] = useState('')

  const currentTypeConfigs = configs.filter((c) => c.configType === activeTab)
  const currentPresets =
    activeTab === 'llm' ? PROVIDER_PRESETS_FALLBACK : EMBEDDING_PRESETS_FALLBACK
  const defaultForm =
    activeTab === 'llm'
      ? EMPTY_FORM
      : {
          ...EMPTY_FORM,
          baseURL: EMBEDDING_PRESETS_FALLBACK.openai.baseURL,
          model: EMBEDDING_PRESETS_FALLBACK.openai.model,
        }

  // 从后端拉取厂商预设（静态数据，永久缓存）
  const { data: presetsData } = useQuery({
    queryKey: ['model-presets'],
    queryFn: fetchProviderPresets,
    staleTime: Infinity,
  })

  // 将数组转为 Record 便于按 provider 查找；未加载时使用 fallback
  const providerPresets: Record<ModelProvider, { baseURL: string; model: string; name: string }> =
    (() => {
      if (!presetsData) return currentPresets
      const record = { ...currentPresets }
      for (const p of presetsData) {
        record[p.provider] = { name: p.name, baseURL: p.baseURL, model: p.defaultModel }
      }
      return record
    })()

  const filteredModels = availableModels.filter((m) => {
    if (!modelSearchQuery) return true
    const query = modelSearchQuery.toLowerCase()
    return m.id.toLowerCase().includes(query) || (m.name && m.name.toLowerCase().includes(query))
  })

  const handleProviderChange = (provider: ModelProvider) => {
    const preset = providerPresets[provider]
    setForm((prev) => ({
      ...prev,
      provider,
      name: preset.name || prev.name,
      baseURL: preset.baseURL || prev.baseURL,
      model: preset.model || prev.model,
    }))
  }

  const handleAddClick = () => {
    setEditingId(null)
    setForm(defaultForm)
    setTestResult(null)
    setAvailableModels([])
    setModelSearchQuery('')
    setShowModelDropdown(false)
    setShowForm(true)
  }

  const handleEditClick = (config: ModelConfig) => {
    setEditingId(config.id)
    setForm({
      name: config.name,
      provider: config.provider,
      apiKey: config.apiKey,
      baseURL: config.baseURL,
      model: config.model,
      isDefault: config.isDefault,
    })
    setTestResult(null)
    setAvailableModels([])
    setModelSearchQuery('')
    setShowModelDropdown(false)
    setShowForm(true)
  }

  const handleTabChange = (tab: ModelConfigType) => {
    setActiveTab(tab)
    setShowForm(false)
    setEditingId(null)
    setTestResult(null)
  }

  const handleCancel = () => {
    setShowForm(false)
    setEditingId(null)
    setTestResult(null)
  }

  const handleFetchModels = async () => {
    if (!form.apiKey) {
      setTestResult({ success: false, message: '请先输入 API Key' })
      return
    }
    if (!form.baseURL) {
      setTestResult({ success: false, message: '请先填写 Base URL' })
      return
    }
    try {
      setFetchingModels(true)
      setShowModelDropdown(false)
      setModelSearchQuery('')

      const models = await fetchModelList({
        provider: form.provider,
        apiKey: form.apiKey,
        baseURL: form.baseURL,
      })
      setAvailableModels(models)
      setShowModelDropdown(models.length > 0)
      if (models.length === 0) {
        setTestResult({ success: false, message: '未找到可用模型' })
      } else {
        setTestResult({
          success: true,
          message: `已加载 ${models.length} 个模型，可在输入框中搜索或点击选择`,
        })
      }
    } catch (err) {
      const error = err as {
        response?: { data?: { msg?: string; error?: string } }
        message?: string
      }
      const errMsg =
        error?.response?.data?.msg ||
        error?.response?.data?.error ||
        error.message ||
        '获取模型列表失败'
      setTestResult({
        success: false,
        message: errMsg,
      })
    } finally {
      setFetchingModels(false)
    }
  }

  const handleSelectModel = (modelId: string) => {
    setForm({ ...form, model: modelId })
    setModelSearchQuery('')
    setShowModelDropdown(false)
  }

  const handleTest = async () => {
    if (!form.apiKey) {
      setTestResult({ success: false, message: '请输入 API Key' })
      return
    }
    if (!form.baseURL || !form.model) {
      setTestResult({ success: false, message: '请填写 Base URL 和模型名称' })
      return
    }
    try {
      setTesting(true)
      setTestResult(null)

      const result = await testModelConnection({
        provider: form.provider,
        apiKey: form.apiKey,
        baseURL: form.baseURL,
        model: form.model,
      })
      if (result.success) {
        setTestResult({
          success: true,
          message: `连接成功！模型: ${result.model}，延迟: ${result.latencyMs}ms`,
        })
      } else {
        setTestResult({ success: false, message: result.error || '连接失败' })
      }
    } catch (err) {
      const error = err as {
        response?: { data?: { msg?: string; error?: string } }
        message?: string
      }
      const errMsg =
        error?.response?.data?.msg || error?.response?.data?.error || error.message || '测试失败'
      setTestResult({
        success: false,
        message: errMsg,
      })
    } finally {
      setTesting(false)
    }
  }

  const handleSave = async () => {
    if (!form.name.trim()) {
      alert('请输入配置名称')
      return
    }
    if (!editingId && !form.apiKey) {
      alert('请输入 API Key')
      return
    }
    if (!form.baseURL || !form.model) {
      alert('请填写 Base URL 和模型名称')
      return
    }

    try {
      setSaving(true)
      if (editingId) {
        updateConfig(editingId, {
          name: form.name,
          provider: form.provider,
          apiKey: form.apiKey,
          baseURL: form.baseURL,
          model: form.model,
          isDefault: form.isDefault,
        })
      } else {
        addConfig({
          name: form.name,
          provider: form.provider,
          apiKey: form.apiKey,
          baseURL: form.baseURL,
          model: form.model,
          modelMappings: [],
          configType: activeTab,
          isDefault: form.isDefault,
        })
      }
      setShowForm(false)
      setEditingId(null)
      setTestResult(null)
    } catch (err) {
      const error = err as { response?: { data?: { msg?: string } } }
      alert(error?.response?.data?.msg || '保存失败')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = (id: string) => {
    if (!confirm('确定删除该模型配置？')) return
    deleteConfig(id)
  }

  const handleSetDefault = (id: string) => {
    setDefault(id)
  }

  return (
    <div className={cn('h-full flex flex-col', className)}>
      <div className="px-5 py-4 border-b border-rule shrink-0">
        <div className="flex items-center gap-3">
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium text-ink-muted hover:text-ink hover:bg-paper-dark/50 transition-colors shrink-0"
            >
              <X size={14} strokeWidth={1.5} />
              关闭
            </button>
          )}
          <div>
            <h3 className="text-base font-semibold text-ink font-display tracking-tight flex items-center gap-2">
              <Server size={16} strokeWidth={1.5} />
              模型设置
            </h3>
            <p className="text-[11px] text-ink-faint mt-0.5">
              配置自定义 AI 模型，支持 OpenAI 兼容接口
            </p>
          </div>
        </div>
        <div className="flex gap-1 mt-4 bg-paper-dark/50 p-0.5 rounded-lg">
          <button
            type="button"
            onClick={() => handleTabChange('llm')}
            className={cn(
              'flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-medium transition-colors',
              activeTab === 'llm' ? 'bg-paper text-ink shadow-sm' : 'text-ink-muted hover:text-ink',
            )}
          >
            <Zap size={14} strokeWidth={1.5} />
            对话模型
          </button>
          <button
            type="button"
            onClick={() => handleTabChange('embedding')}
            className={cn(
              'flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-medium transition-colors',
              activeTab === 'embedding'
                ? 'bg-paper text-ink shadow-sm'
                : 'text-ink-muted hover:text-ink',
            )}
          >
            <Sparkles size={14} strokeWidth={1.5} />
            向量模型
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto flex flex-col">
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center">
            <div className="w-8 h-8 border-2 border-rule border-t-accent rounded-full animate-spin mb-4" />
            <p className="text-xs text-ink-faint">加载中...</p>
          </div>
        ) : currentTypeConfigs.length > 0 || showForm ? (
          <div className="p-5 space-y-4">
            {currentTypeConfigs.length > 0 && (
              <div className="space-y-2">
                {currentTypeConfigs.map((config) => (
                  <div
                    key={config.id}
                    onClick={() => handleEditClick(config)}
                    className={`p-3 rounded-lg border transition-colors text-left w-full ${
                      config.isDefault
                        ? 'border-accent/50 bg-accent/5'
                        : 'border-rule bg-paper-dark/30 hover:border-rule/80 hover:bg-paper-dark/50 cursor-pointer'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-ink truncate">
                            {config.name}
                          </span>
                          {config.isDefault && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent text-paper font-medium">
                              默认
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-ink-faint mt-0.5">
                          {PROVIDER_LABELS[config.provider] || config.provider} · {config.model}
                        </div>
                        <div className="text-[10px] text-ink-faint font-mono truncate mt-0.5">
                          {config.baseURL}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {!config.isDefault && (
                          <button
                            type="button"
                            title="设为默认"
                            className="w-7 h-7 grid place-items-center text-ink-faint hover:text-accent hover:bg-paper-dark rounded-md transition-colors cursor-pointer"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleSetDefault(config.id)
                            }}
                          >
                            <Check size={14} strokeWidth={1.5} />
                          </button>
                        )}
                        <button
                          type="button"
                          title="编辑"
                          className="w-7 h-7 grid place-items-center text-ink-faint hover:text-ink hover:bg-paper-dark rounded-md transition-colors cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleEditClick(config)
                          }}
                        >
                          <Pencil size={14} strokeWidth={1.5} />
                        </button>
                        <button
                          type="button"
                          title="删除"
                          className="w-7 h-7 grid place-items-center text-ink-faint hover:text-danger hover:bg-paper-dark rounded-md transition-colors cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDelete(config.id)
                          }}
                        >
                          <Trash2 size={14} strokeWidth={1.5} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {showForm ? (
              <div
                className={`space-y-4 ${currentTypeConfigs.length > 0 ? 'pt-2 border-t border-rule' : ''}`}
              >
                <h4 className="text-xs font-semibold text-ink">
                  {editingId ? '编辑模型配置' : '添加模型配置'}
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[11px] text-ink-muted mb-1 block">配置名称</label>
                    <input
                      type="text"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="如：我的 GPT-4"
                      className="w-full px-3 py-2 text-xs bg-paper border border-rule rounded-lg text-ink placeholder:text-ink-faint focus:outline-none focus:border-accent transition-colors"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-ink-muted mb-1 block">服务商</label>
                    <select
                      value={form.provider}
                      onChange={(e) => handleProviderChange(e.target.value as ModelProvider)}
                      className="w-full px-3 py-2 text-xs bg-paper border border-rule rounded-lg text-ink focus:outline-none focus:border-accent transition-colors cursor-pointer"
                    >
                      {Object.entries(PROVIDER_LABELS).map(([key, label]) => (
                        <option key={key} value={key}>
                          {label}
                        </option>
                      ))}
                    </select>
                    {(form.provider === 'volcengine' ||
                      form.provider === 'spark' ||
                      form.provider === 'gemini') && (
                      <p className="text-[10px] text-ink-faint mt-1 flex items-center gap-1">
                        <Info size={10} />
                        兼容模式已启用：system 消息将合并到 user 消息中
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="text-[11px] text-ink-muted mb-1 block">
                    API Key {editingId && <span className="text-ink-faint">（不修改请留空）</span>}
                  </label>
                  <input
                    type="password"
                    value={form.apiKey}
                    onChange={(e) => setForm({ ...form, apiKey: e.target.value })}
                    placeholder="sk-..."
                    className="w-full px-3 py-2 text-xs bg-paper border border-rule rounded-lg text-ink placeholder:text-ink-faint focus:outline-none focus:border-accent transition-colors font-mono"
                  />
                  {form.provider === 'volcengine' && (
                    <p className="text-[10px] text-ink-faint mt-1 flex items-center gap-1">
                      <Info size={10} />
                      请使用「火山方舟 API Key 管理」中的专用 API Key，不是 Access Key（AK/SK）
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[11px] text-ink-muted mb-1 block">Base URL</label>
                    <input
                      type="text"
                      value={form.baseURL}
                      onChange={(e) => setForm({ ...form, baseURL: e.target.value })}
                      placeholder="https://api.openai.com/v1"
                      className="w-full px-3 py-2 text-xs bg-paper border border-rule rounded-lg text-ink placeholder:text-ink-faint focus:outline-none focus:border-accent transition-colors font-mono"
                    />
                  </div>

                  <div className="relative">
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] text-ink-muted">模型名称</label>
                      <button
                        type="button"
                        onClick={handleFetchModels}
                        disabled={fetchingModels}
                        className="flex items-center gap-1 text-[10px] text-accent hover:text-accent/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {fetchingModels ? (
                          <Loader2 size={11} className="animate-spin" />
                        ) : (
                          <RefreshCw size={11} />
                        )}
                        获取模型列表
                      </button>
                    </div>
                    <input
                      type="text"
                      value={form.model}
                      onChange={(e) => {
                        const value = e.target.value
                        setForm({ ...form, model: value })
                        setModelSearchQuery(value)
                        if (availableModels.length > 0) {
                          setShowModelDropdown(true)
                        }
                      }}
                      onFocus={() => {
                        if (availableModels.length > 0) {
                          setShowModelDropdown(true)
                        }
                      }}
                      placeholder="如：gpt-5.5"
                      className="w-full px-3 py-2 text-xs bg-paper border border-rule rounded-lg text-ink placeholder:text-ink-faint focus:outline-none focus:border-accent transition-colors font-mono"
                    />
                    {form.provider === 'volcengine' && (
                      <p className="text-[10px] text-ink-faint mt-1 flex items-center gap-1">
                        <Info size={10} />
                        请填写 Model ID 或接入点 Endpoint ID，可点击「获取模型列表」查看
                      </p>
                    )}
                    {showModelDropdown && availableModels.length > 0 && (
                      <div className="absolute top-full left-0 right-0 mt-1 max-h-60 overflow-y-auto bg-paper border border-rule rounded-lg shadow-xl z-50">
                        {filteredModels.length > 0 ? (
                          filteredModels.map((m) => (
                            <button
                              key={m.id}
                              type="button"
                              onClick={() => handleSelectModel(m.id)}
                              className={`w-full text-left px-3 py-2 text-xs hover:bg-accent/10 transition-colors font-mono ${
                                form.model === m.id ? 'bg-accent/10 text-accent' : 'text-ink'
                              }`}
                            >
                              <div className="truncate">{m.name || m.id}</div>
                              {m.name && m.name !== m.id && (
                                <div className="text-[10px] text-ink-faint truncate">{m.id}</div>
                              )}
                            </button>
                          ))
                        ) : (
                          <div className="px-3 py-2 text-xs text-ink-faint">没有匹配的模型</div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isDefault"
                    checked={form.isDefault}
                    onChange={(e) => setForm({ ...form, isDefault: e.target.checked })}
                    className="w-3.5 h-3.5 accent-accent cursor-pointer"
                  />
                  <label htmlFor="isDefault" className="text-[11px] text-ink-muted cursor-pointer">
                    设为默认模型
                  </label>
                </div>

                {testResult && (
                  <div
                    className={`px-3 py-2 rounded-lg text-[11px] ${
                      testResult.success
                        ? 'bg-success-bg text-success border border-success/20'
                        : 'bg-danger-bg text-danger border border-danger/20'
                    }`}
                  >
                    <div className="whitespace-pre-wrap break-words">{testResult.message}</div>
                  </div>
                )}

                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleTest}
                    disabled={testing}
                    className="flex-1 px-3 py-2 text-xs font-medium bg-paper-dark text-ink-muted border border-rule rounded-lg hover:bg-paper-dark/80 hover:text-ink transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {testing ? '测试中...' : '测试连接'}
                  </button>
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="px-3 py-2 text-xs font-medium bg-paper-dark text-ink-muted border border-rule rounded-lg hover:bg-paper-dark/80 hover:text-ink transition-colors cursor-pointer"
                  >
                    取消
                  </button>
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving}
                    className="px-4 py-2 text-xs font-medium bg-accent text-paper border border-accent rounded-lg hover:bg-accent/90 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {saving ? '保存中...' : '保存'}
                  </button>
                </div>
              </div>
            ) : (
              currentTypeConfigs.length > 0 && (
                <button
                  type="button"
                  onClick={handleAddClick}
                  className="w-full px-3 py-2.5 text-xs font-medium bg-paper-dark text-ink-muted border border-dashed border-rule rounded-lg hover:bg-paper-dark/80 hover:text-ink hover:border-accent/50 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Plus size={14} strokeWidth={1.5} />
                  添加模型配置
                </button>
              )
            )}
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-5 text-center">
            <Server size={32} strokeWidth={1} className="text-ink-faint mb-3" />
            <p className="text-xs text-ink-faint mb-2">
              暂无{activeTab === 'llm' ? '对话模型' : '向量模型'}配置
            </p>
            <p className="text-[10px] text-ink-faint/70 mb-5">
              {activeTab === 'llm'
                ? '添加自定义模型后，分析将使用您配置的模型'
                : '添加向量模型配置后，长期记忆和语义搜索将使用您配置的嵌入模型'}
            </p>
            <button
              type="button"
              onClick={handleAddClick}
              className="w-full max-w-xs px-3 py-2.5 text-xs font-medium bg-paper-dark text-ink-muted border border-dashed border-rule rounded-lg hover:bg-paper-dark/80 hover:text-ink hover:border-accent/50 transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Plus size={14} strokeWidth={1.5} />
              添加模型配置
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
