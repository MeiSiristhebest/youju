import { Check, Plus, Server, Trash2, X, Zap } from 'lucide-react'
import { useEffect, useState } from 'react'
import {
  type CreateModelConfigRequest,
  createModelConfig,
  deleteModelConfig,
  listModelConfigs,
  type ModelProvider,
  setDefaultModelConfig,
  testModelConnection,
  type UserModelConfig,
  updateModelConfig,
} from '../../services/modelConfigApi'

const PROVIDER_LABELS: Record<ModelProvider, string> = {
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  deepseek: 'DeepSeek',
  zhipu: '智谱 AI',
  moonshot: 'Moonshot',
  qwen: '通义千问',
  custom: '自定义',
}

const PROVIDER_PRESETS: Record<ModelProvider, { baseURL: string; model: string }> = {
  openai: { baseURL: 'https://api.openai.com/v1', model: 'gpt-4o-mini' },
  anthropic: { baseURL: 'https://api.anthropic.com/v1', model: 'claude-3-5-sonnet-20241022' },
  deepseek: { baseURL: 'https://api.deepseek.com/v1', model: 'deepseek-chat' },
  zhipu: { baseURL: 'https://open.bigmodel.cn/api/paas/v4', model: 'glm-4-flash' },
  moonshot: { baseURL: 'https://api.moonshot.cn/v1', model: 'moonshot-v1-8k' },
  qwen: { baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1', model: 'qwen-turbo' },
  custom: { baseURL: '', model: '' },
}

interface ModelSettingsPanelProps {
  onClose: () => void
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
  baseURL: PROVIDER_PRESETS.openai.baseURL,
  model: PROVIDER_PRESETS.openai.model,
  isDefault: false,
}

export function ModelSettingsPanel({ onClose }: ModelSettingsPanelProps) {
  const [configs, setConfigs] = useState<UserModelConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)

  useEffect(() => {
    loadConfigs()
  }, [])

  const loadConfigs = async () => {
    try {
      setLoading(true)
      const data = await listModelConfigs()
      setConfigs(data)
    } catch (err) {
      console.error('Failed to load model configs:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleProviderChange = (provider: ModelProvider) => {
    const preset = PROVIDER_PRESETS[provider]
    setForm((prev) => ({
      ...prev,
      provider,
      baseURL: preset.baseURL || prev.baseURL,
      model: preset.model || prev.model,
    }))
  }

  const handleAddClick = () => {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setTestResult(null)
    setShowForm(true)
  }

  const handleEditClick = (config: UserModelConfig) => {
    setEditingId(config.id)
    setForm({
      name: config.name,
      provider: config.provider,
      apiKey: '',
      baseURL: config.baseURL,
      model: config.model,
      isDefault: config.isDefault,
    })
    setTestResult(null)
    setShowForm(true)
  }

  const handleCancel = () => {
    setShowForm(false)
    setEditingId(null)
    setTestResult(null)
  }

  const handleTest = async () => {
    if (!form.apiKey && !editingId) {
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
        apiKey: form.apiKey || 'placeholder',
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
      const error = err as { response?: { data?: { msg?: string } }; message?: string }
      setTestResult({
        success: false,
        message: error?.response?.data?.msg || error.message || '测试失败',
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
      const data: CreateModelConfigRequest = {
        name: form.name,
        provider: form.provider,
        apiKey: form.apiKey,
        baseURL: form.baseURL,
        model: form.model,
        isDefault: form.isDefault,
      }
      if (editingId) {
        await updateModelConfig(editingId, data)
      } else {
        await createModelConfig(data)
      }
      await loadConfigs()
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

  const handleDelete = async (id: string) => {
    if (!confirm('确定删除该模型配置？')) return
    try {
      await deleteModelConfig(id)
      await loadConfigs()
    } catch (err) {
      console.error('Delete failed:', err)
    }
  }

  const handleSetDefault = async (id: string) => {
    try {
      await setDefaultModelConfig(id)
      await loadConfigs()
    } catch (err) {
      console.error('Set default failed:', err)
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm grid place-items-center z-[1000] p-5"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
      role="button"
      tabIndex={-1}
    >
      <div className="bg-paper border border-rule rounded-xl w-full max-w-lg max-h-[85vh] overflow-hidden flex flex-col">
        <div className="px-5 py-4 border-b border-rule flex justify-between items-center">
          <div>
            <h3 className="text-base font-semibold text-ink font-display tracking-tight flex items-center gap-2">
              <Server size={16} strokeWidth={1.5} />
              模型设置
            </h3>
            <p className="text-[11px] text-ink-faint mt-0.5">
              配置自定义 AI 模型，支持 OpenAI 兼容接口
            </p>
          </div>
          <button
            type="button"
            className="w-8 h-8 bg-none border-none text-ink-faint cursor-pointer rounded-lg grid place-items-center hover:bg-paper-dark hover:text-ink transition-colors duration-200"
            onClick={onClose}
          >
            <X size={16} strokeWidth={1.5} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="w-8 h-8 border-2 border-rule border-t-accent rounded-full animate-spin mb-4" />
              <p className="text-xs text-ink-faint">加载中...</p>
            </div>
          ) : (
            <div className="p-5 space-y-4">
              {configs.length > 0 && (
                <div className="space-y-2">
                  {configs.map((config) => (
                    <div
                      key={config.id}
                      className={`p-3 rounded-lg border transition-colors ${
                        config.isDefault
                          ? 'border-accent/50 bg-accent/5'
                          : 'border-rule bg-paper-dark/30 hover:border-rule/80'
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
                              onClick={() => handleSetDefault(config.id)}
                            >
                              <Check size={14} strokeWidth={1.5} />
                            </button>
                          )}
                          <button
                            type="button"
                            title="编辑"
                            className="w-7 h-7 grid place-items-center text-ink-faint hover:text-ink hover:bg-paper-dark rounded-md transition-colors cursor-pointer"
                            onClick={() => handleEditClick(config)}
                          >
                            <Zap size={14} strokeWidth={1.5} />
                          </button>
                          <button
                            type="button"
                            title="删除"
                            className="w-7 h-7 grid place-items-center text-ink-faint hover:text-red-500 hover:bg-paper-dark rounded-md transition-colors cursor-pointer"
                            onClick={() => handleDelete(config.id)}
                          >
                            <Trash2 size={14} strokeWidth={1.5} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {configs.length === 0 && !showForm && (
                <div className="text-center py-10">
                  <Server size={32} strokeWidth={1} className="mx-auto text-ink-faint mb-3" />
                  <p className="text-xs text-ink-faint mb-3">暂无模型配置</p>
                  <p className="text-[10px] text-ink-faint/70">
                    添加自定义模型后，分析将使用您配置的模型
                  </p>
                </div>
              )}

              {showForm ? (
                <div className="space-y-4 pt-2 border-t border-rule">
                  <h4 className="text-xs font-semibold text-ink">
                    {editingId ? '编辑模型配置' : '添加模型配置'}
                  </h4>

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
                  </div>

                  <div>
                    <label className="text-[11px] text-ink-muted mb-1 block">
                      API Key{' '}
                      {editingId && <span className="text-ink-faint">（不修改请留空）</span>}
                    </label>
                    <input
                      type="password"
                      value={form.apiKey}
                      onChange={(e) => setForm({ ...form, apiKey: e.target.value })}
                      placeholder="sk-..."
                      className="w-full px-3 py-2 text-xs bg-paper border border-rule rounded-lg text-ink placeholder:text-ink-faint focus:outline-none focus:border-accent transition-colors font-mono"
                    />
                  </div>

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

                  <div>
                    <label className="text-[11px] text-ink-muted mb-1 block">模型名称</label>
                    <input
                      type="text"
                      value={form.model}
                      onChange={(e) => setForm({ ...form, model: e.target.value })}
                      placeholder="gpt-4o-mini"
                      className="w-full px-3 py-2 text-xs bg-paper border border-rule rounded-lg text-ink placeholder:text-ink-faint focus:outline-none focus:border-accent transition-colors font-mono"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="isDefault"
                      checked={form.isDefault}
                      onChange={(e) => setForm({ ...form, isDefault: e.target.checked })}
                      className="w-3.5 h-3.5 accent-accent cursor-pointer"
                    />
                    <label
                      htmlFor="isDefault"
                      className="text-[11px] text-ink-muted cursor-pointer"
                    >
                      设为默认模型
                    </label>
                  </div>

                  {testResult && (
                    <div
                      className={`px-3 py-2 rounded-lg text-[11px] ${
                        testResult.success
                          ? 'bg-green-500/10 text-green-600 border border-green-500/20'
                          : 'bg-red-500/10 text-red-600 border border-red-500/20'
                      }`}
                    >
                      {testResult.message}
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
                <button
                  type="button"
                  onClick={handleAddClick}
                  className="w-full px-3 py-2.5 text-xs font-medium bg-paper-dark text-ink-muted border border-dashed border-rule rounded-lg hover:bg-paper-dark/80 hover:text-ink hover:border-accent/50 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Plus size={14} strokeWidth={1.5} />
                  添加模型配置
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
