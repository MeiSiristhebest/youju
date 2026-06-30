// 有据 - 完整产品体验
import { useState, useEffect } from 'react'

type SourceType = 'chat' | 'doc' | 'web' | 'screenshot' | 'contract'
type RiskLevel = 'critical' | 'warning' | 'info'
type ScenarioType = 'job' | 'rent' | 'homework' | 'purchase'

// 分享页面组件
interface SharedReport {
  title: string
  scenarioType: string
  createdAt: string
  viewCount: number
  expiresAt: string | null
  result: {
    summary: { critical: number; warning: number; info: number; total: number }
    risks: Risk[]
    checklist: ChecklistItem[]
    alignedVersion: string
    extractedEntities: ExtractedEntities
  }
}

interface Source {
  id: string
  type: SourceType
  name: string
  content: string
  meta?: string
}

interface Evidence {
  sourceName: string
  sourceType: string
  quote: string
  confidence?: number
}

interface Risk {
  id: string
  level: RiskLevel
  type: string
  title: string
  description: string
  dimension?: string
  sources: string[]
  evidence?: Evidence[]
}

interface ChecklistItem {
  id: string
  text: string
  hasDraft: boolean
  checked: boolean
  riskType?: string
  dimension?: string
}

interface ReasoningStep {
  step: string
  result: string
}

interface AnalyzeResult {
  summary: { critical: number; warning: number; info: number; total: number }
  risks: Risk[]
  checklist: ChecklistItem[]
  alignedVersion: string
  extractedEntities?: ExtractedEntities
  riskRelations?: RiskRelations
  reasoningTrace?: ReasoningStep[]
  uncertainties?: string[]
  scenario?: {
    type: string
    description: string
    keyDimensions: string[]
  }
  meta?: {
    durationMs: number
    isMock: boolean
    sourceCount: number
    sourceIds?: string[]
    isIncremental?: boolean
    newRiskCount?: number
  }
  debugInfo?: {
    model: string
    tokenPrompt: number
    tokenCompletion: number
    tokenTotal: number
    rawOutput: string
    systemPromptPreview: string
    userPromptPreview: string
    isMock?: boolean
  }
  preferences?: {
    riskWeights?: {
      dimensionWeights: Record<string, number>
      typeWeights: Record<string, number>
      totalChecks: number
      lastUpdated: string
    }
    draftStyle?: {
      formality: number
      friendliness: number
      conciseness: number
      directness: number
      totalCopies: number
      totalEdits: number
      lastUpdated: string
      preferredTone?: string
    }
  }
}

interface ExtractedEntities {
  dates: { value: string; source: string }[]
  amounts: { value: string; source: string }[]
  terms: { value: string; source: string }[]
  promises: { value: string; source: string }[]
}

interface RiskRelations {
  associations: RiskAssociation[]
  relatedRiskIds: { [riskId: string]: string[] }
  conflictPairs: ConflictPair[]
}

interface RiskAssociation {
  sourceName: string
  sourceType: string
  riskIds: string[]
  riskCount: number
  isConflict: boolean
}

interface ConflictPair {
  risk1Id: string
  risk2Id: string
  reason: string
}

interface TaskRecord {
  id: string
  title: string
  scenarioType: string
  sourceCount: number
  createdAt: string
}

interface Scenario {
  id: ScenarioType
  name: string
  icon: string
  description: string
  sourceCount: number
}

// 预置场景数据（元数据，材料数据从后端获取）
const SCENARIOS: Scenario[] = [
  {
    id: 'job',
    name: '求职 Offer 确认',
    icon: '💼',
    description: '核对 HR 口头承诺与正式 Offer 是否一致',
    sourceCount: 3
  },
  {
    id: 'rent',
    name: '租房签约',
    icon: '🏠',
    description: '核对中介承诺与合同条款是否一致',
    sourceCount: 2
  },
  {
    id: 'homework',
    name: '作业/申请提交',
    icon: '📚',
    description: '核对提交要求与材料是否一致',
    sourceCount: 2
  },
]

const ANALYSIS_STEPS = [
  { key: 'scenario', name: '场景识别', desc: '理解材料内容，识别场景类型' },
  { key: 'parsing', name: '解析材料', desc: '提取每份材料的关键信息' },
  { key: 'dimensions', name: '维度发现', desc: '自动发现需要比对的重要维度' },
  { key: 'extraction', name: '跨源提取', desc: '从各材料中提取对应维度的值' },
  { key: 'detection', name: '差异检测', desc: '比对冲突、承诺、缺失信息' },
  { key: 'validation', name: '证据校验', desc: '验证每个结论的证据链' },
  { key: 'output', name: '生成报告', desc: '整理分析结果和检查清单' },
]

const TYPE_ICONS: Record<SourceType, string> = {
  chat: '💬', doc: '📄', web: '🌐', screenshot: '🖼', contract: '📝'
}

const TYPE_LABELS: Record<SourceType, string> = {
  chat: '聊天记录', doc: '文档', web: '网页', screenshot: '截图', contract: '合同'
}

export default function App() {
  const [page, setPage] = useState<'home' | 'workspace' | 'share'>('home')
  const [currentScenario, setCurrentScenario] = useState<ScenarioType | null>(null)
  const [sources, setSources] = useState<Source[]>([])
  const [result, setResult] = useState<AnalyzeResult | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [analysisStep, setAnalysisStep] = useState(0)
  const [activeTab, setActiveTab] = useState<'risks' | 'checklist' | 'aligned' | 'entities' | 'relations' | 'trace'>('risks')
  const [highlightedRisk, setHighlightedRisk] = useState<string | null>(null)
  const [highlightedEvidence, setHighlightedEvidence] = useState<{ sourceId: string; quote: string } | null>(null)
  const [selectedSource, setSelectedSource] = useState<string | null>(null)
  const [checklist, setChecklist] = useState<ChecklistItem[]>([])
  const [showDraft, setShowDraft] = useState(false)
  const [draftText, setDraftText] = useState('')
  const [generatingDraft, setGeneratingDraft] = useState(false)
  const [copied, setCopied] = useState(false)
  const [selectedRisk, setSelectedRisk] = useState<Risk | null>(null)
  const [showDebug, setShowDebug] = useState(false)
  const [debugTab, setDebugTab] = useState<'info' | 'stats'>('info')
  const [sysStats, setSysStats] = useState<any>(null)
  const [loadingStats, setLoadingStats] = useState(false)
  const [riskFeedback, setRiskFeedback] = useState<Record<string, 'accurate' | 'inaccurate'>>({})
  const [showAddSource, setShowAddSource] = useState(false)
  const [addSourceTab, setAddSourceTab] = useState<'text' | 'file' | 'url' | 'screenshot'>('text')
  const [newSourceType, setNewSourceType] = useState<SourceType>('chat')
  const [newSourceName, setNewSourceName] = useState('')
  const [newSourceContent, setNewSourceContent] = useState('')
  const [newSourceUrl, setNewSourceUrl] = useState('')
  const [uploading, setUploading] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [fileDragOver, setFileDragOver] = useState(false)
  const [ocrProgress, setOcrProgress] = useState('')
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null)
  const [taskHistory, setTaskHistory] = useState<TaskRecord[]>([])
  const [showHistory, setShowHistory] = useState(false)
  const [savingTask, setSavingTask] = useState(false)
  const [taskSaved, setTaskSaved] = useState(false)
  const [user, setUser] = useState<{ id: number; nickname: string; avatar: string } | null>(null)
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('youju_token'))
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [loggingIn, setLoggingIn] = useState(false)
  const [showShareModal, setShowShareModal] = useState(false)
  const [shareLink, setShareLink] = useState<string>('')
  const [shareExpired, setShareExpired] = useState<string>('')
  const [creatingShare, setCreatingShare] = useState(false)
  const [sharedReport, setSharedReport] = useState<SharedReport | null>(null)
  const [shareError, setShareError] = useState<string>('')
  const [sessionId, setSessionId] = useState<string | null>(() => localStorage.getItem('youju_session_id'))

  // 初始化sessionId
  useEffect(() => {
    if (!sessionId) {
      const newSessionId = `anon_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
      localStorage.setItem('youju_session_id', newSessionId)
      setSessionId(newSessionId)
    }
  }, [])

  // 检查是否是分享页面
  useEffect(() => {
    const path = window.location.pathname
    if (path.startsWith('/share/')) {
      const shareToken = path.replace('/share/', '')
      if (shareToken) {
        loadSharedReport(shareToken)
      }
    }
  }, [])

  // 带认证的fetch封装
  const authFetch = (url: string, options: RequestInit = {}) => {
    const headers = new Headers(options.headers || {})
    if (token) {
      headers.set('Authorization', `Bearer ${token}`)
    } else if (sessionId) {
      headers.set('X-Session-Id', sessionId)
    }
    return fetch(url, { ...options, headers })
  }

  // 微信登录
  const handleWechatLogin = async () => {
    setLoggingIn(true)
    try {
      const mockCode = 'mock_' + Date.now()
      const res = await fetch('/api/auth/wechat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: mockCode })
      })
      const data = await res.json()
      if (data.code === 200) {
        const { token: newToken, user: userData } = data.data
        setToken(newToken)
        setUser(userData)
        localStorage.setItem('youju_token', newToken)
        setShowLoginModal(false)
        fetchTaskHistory()
      }
    } catch {
      console.error('Login failed')
    } finally {
      setLoggingIn(false)
    }
  }

  // 退出登录
  const handleLogout = () => {
    setToken(null)
    setUser(null)
    localStorage.removeItem('youju_token')
    setTaskHistory([])
  }

  // 分享报告
  const handleShare = async () => {
    // 需要先保存任务才能分享
    if (!result) {
      alert('请先保存任务后再分享')
      return
    }
    
    // 如果还没有保存，先保存
    if (!taskSaved && !currentScenario) {
      await saveTask()
    }
    
    // 获取当前任务ID
    const currentTaskId = taskHistory.find(t => 
      t.title === (currentScenario 
        ? SCENARIOS.find(s => s.id === currentScenario)?.name 
        : `分析任务 ${new Date().toLocaleDateString()}`)
    )?.id
    
    if (!currentTaskId && !taskSaved) {
      alert('请先保存任务后再分享')
      return
    }
    
    // 查找最近保存的任务ID
    let taskId = currentTaskId
    if (!taskId && taskHistory.length > 0) {
      taskId = taskHistory[0].id
    }
    
    if (!taskId) {
      alert('请先保存任务后再分享')
      return
    }
    
    setCreatingShare(true)
    try {
      const res = await authFetch(`/api/share/${taskId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expiresInDays: 7 })
      })
      const data = await res.json()
      if (data.code === 200) {
        // 构建完整分享链接
        const baseUrl = window.location.origin
        const fullUrl = `${baseUrl}/share/${data.data.token}`
        setShareLink(fullUrl)
        setShareExpired(data.data.expiresAt ? new Date(data.data.expiresAt).toLocaleString() : '永久有效')
        setShowShareModal(true)
      } else {
        alert(data.msg || '创建分享链接失败')
      }
    } catch {
      alert('创建分享链接失败，请重试')
    } finally {
      setCreatingShare(false)
    }
  }

  // 复制分享链接
  const copyShareLink = () => {
    navigator.clipboard.writeText(shareLink).then(() => {
      alert('分享链接已复制到剪贴板')
    })
  }

  // 加载分享报告
  const loadSharedReport = async (token: string) => {
    setPage('share')
    try {
      const res = await fetch(`/api/share/${token}`)
      const data = await res.json()
      if (data.code === 200) {
        setSharedReport(data.data)
        setResult(data.data.result)
        setChecklist(data.data.result.checklist.map((c: any) => ({ ...c, checked: false })))
      } else {
        setShareError(data.msg || '分享不存在或已过期')
      }
    } catch {
      setShareError('加载分享失败，请检查网络连接')
    }
  }

  // 检查登录状态
  const checkLoginStatus = async () => {
    if (!token) return
    try {
      const res = await authFetch('/api/user/info')
      const data = await res.json()
      if (data.code === 200) {
        setUser(data.data)
      } else {
        setToken(null)
        localStorage.removeItem('youju_token')
      }
    } catch {
      setToken(null)
      localStorage.removeItem('youju_token')
    }
  }

  useEffect(() => {
    checkLoginStatus()
  }, [token])

  // 加载场景示例数据（从后端API获取）
  const loadScenario = async (scenarioId: ScenarioType) => {
    const scenario = SCENARIOS.find(s => s.id === scenarioId)
    if (!scenario) return
    
    setCurrentScenario(scenarioId)
    setSources([])
    setResult(null)
    setChecklist([])
    setPage('workspace')
    
    try {
      const res = await authFetch(`/api/scenarios/${scenarioId}/init`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
      const data = await res.json()
      if (data.code === 200) {
        setSources(data.data.sources)
      }
    } catch (e) {
      console.error('Failed to init scenario:', e)
    }
  }

  // 获取历史任务列表
  const fetchTaskHistory = async () => {
    try {
      const res = await authFetch('/api/tasks')
      const data = await res.json()
      if (data.code === 200) {
        setTaskHistory(data.data)
      }
    } catch {
      console.error('Failed to fetch tasks')
    }
  }

  // 加载历史任务
  const loadTask = async (taskId: string) => {
    try {
      const res = await authFetch(`/api/tasks/${taskId}`)
      const data = await res.json()
      if (data.code === 200) {
        setCurrentScenario(null)
        setSources([])
        setResult(data.data.result)
        setChecklist(data.data.result.checklist.map((c: ChecklistItem) => ({ ...c, checked: false })))
        setPage('workspace')
        setShowHistory(false)
      }
    } catch {
      console.error('Failed to load task')
    }
  }

  // 删除历史任务
  const deleteTask = async (taskId: string) => {
    try {
      await authFetch(`/api/tasks/${taskId}`, { method: 'DELETE' })
      setTaskHistory(taskHistory.filter(t => t.id !== taskId))
    } catch {
      console.error('Failed to delete task')
    }
  }

  // 保存任务
  const saveTask = async () => {
    if (sources.length === 0 || !result) return
    setSavingTask(true)
    try {
      const title = currentScenario 
        ? SCENARIOS.find(s => s.id === currentScenario)?.name || '分析任务'
        : newSourceName || `分析任务 ${new Date().toLocaleDateString()}`
      
      const res = await authFetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          scenarioType: currentScenario || 'custom',
          sourceIds: sources.map(s => s.id)
        })
      })
      const data = await res.json()
      if (data.code === 200) {
        setTaskSaved(true)
        setTimeout(() => setTaskSaved(false), 2000)
        fetchTaskHistory()
      }
    } catch {
      console.error('Failed to save task')
    } finally {
      setSavingTask(false)
    }
  }

  // 开始分析
  const analyze = async () => {
    if (sources.length === 0) return

    setAnalyzing(true)
    setResult(null)
    setAnalysisStep(0)

    const stepDuration = 300
    const timers: ReturnType<typeof setTimeout>[] = []

    for (let i = 0; i < ANALYSIS_STEPS.length; i++) {
      const timer = setTimeout(() => {
        setAnalysisStep(i + 1)
      }, stepDuration * (i + 1))
      timers.push(timer)
    }

    try {
      const sourceIds = sources.map(s => s.id)
      let endpoint = '/api/analyze'
      let body: any = { sourceIds, scenarioType: currentScenario }

      if (result && result.meta && result.meta.sourceIds) {
        const existingIds = result.meta.sourceIds as string[]
        const newIds = sourceIds.filter(id => !existingIds.includes(id))
        if (newIds.length > 0 && newIds.length < sourceIds.length) {
          endpoint = '/api/analyze/incremental'
          body = {
            existingResult: result,
            newSourceIds: newIds,
            scenarioType: currentScenario
          }
        }
      }

      const res = await authFetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
      const data = await res.json()
      if (data.code === 200) {
        const dataWithSourceIds = {
          ...data.data,
          meta: {
            ...data.data.meta,
            sourceIds: sourceIds
          }
        }
        setResult(dataWithSourceIds)
        setChecklist(data.data.checklist.map((c: ChecklistItem) => ({ ...c, checked: false })))
        setAnalysisStep(ANALYSIS_STEPS.length)
      }
    } finally {
      timers.forEach(t => clearTimeout(t))
      setAnalyzing(false)
    }
  }

  // 添加文本材料
  const addTextSource = async () => {
    if (!newSourceName || !newSourceContent) return
    setUploading(true)
    try {
      const res = await authFetch('/api/sources/text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: newSourceType, name: newSourceName, content: newSourceContent })
      })
      const data = await res.json()
      if (data.code === 200) {
        setSources([...sources, data.data])
        setShowAddSource(false)
        setNewSourceName('')
        setNewSourceContent('')
      }
    } finally {
      setUploading(false)
    }
  }

  // 添加文件材料
  const addFileSource = async (file: File) => {
    if (!file) return
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('type', newSourceType)
      formData.append('name', newSourceName || file.name)
      const res = await authFetch('/api/sources/upload', {
        method: 'POST',
        body: formData
      })
      const data = await res.json()
      if (data.code === 200) {
        setSources([...sources, data.data])
        setShowAddSource(false)
        setNewSourceName('')
      }
    } finally {
      setUploading(false)
    }
  }

  // 截图OCR识别
  const recognizeScreenshot = async (file: File) => {
    if (!file.type.startsWith('image/')) return

    setUploading(true)
    setOcrProgress('正在加载 OCR 引擎...')
    setScreenshotPreview(URL.createObjectURL(file))

    const statusMap: Record<string, string> = {
      'loading tesseract core': '加载识别核心...',
      'initializing tesseract': '初始化引擎...',
      'loading language traineddata': '加载中文语言包...',
      'initializing api': '准备识别...',
      'recognizing text': '识别文字中...'
    }

    try {
      const Tesseract = await import('tesseract.js')

      const result = await Tesseract.recognize(file, 'chi_sim+eng', {
        logger: (m) => {
          const statusText = statusMap[m.status] || m.status
          if (m.status === 'recognizing text') {
            setOcrProgress(`${statusText} ${Math.round(m.progress * 100)}%`)
          } else {
            setOcrProgress(statusText)
          }
        }
      })

      const text = result.data.text.trim()
      const confidence = result.data.confidence || 0
      
      if (text.length === 0) {
        setOcrProgress('未识别到文字，请尝试更清晰的截图')
        setTimeout(() => setOcrProgress(''), 3000)
        return
      }

      setNewSourceContent(text)
      setNewSourceName(file.name.replace(/\.[^.]+$/, '') || '截图识别文本')
      setAddSourceTab('text')
      setOcrProgress(`识别完成（置信度 ${Math.round(confidence)}%），可在左侧编辑确认`)
      setTimeout(() => setOcrProgress(''), 4000)
    } catch (err) {
      console.error('OCR error:', err)
      setOcrProgress('识别失败，请尝试其他方式（如手动粘贴文字）')
    } finally {
      setUploading(false)
    }
  }

  // 添加URL材料
  const addUrlSource = async () => {
    if (!newSourceUrl) return
    setUploading(true)
    try {
      const res = await authFetch('/api/sources/url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: newSourceUrl, type: newSourceType, name: newSourceName })
      })
      const data = await res.json()
      if (data.code === 200) {
        setSources([...sources, data.data])
        setShowAddSource(false)
        setNewSourceUrl('')
        setNewSourceName('')
      }
    } finally {
      setUploading(false)
    }
  }

  // 删除材料
  const deleteSource = async (id: string) => {
    setDeletingId(id)
    try {
      await authFetch(`/api/sources/${id}`, { method: 'DELETE' })
      setSources(sources.filter(s => s.id !== id))
      if (result) setResult(null)
    } finally {
      setDeletingId(null)
    }
  }

  // 生成话术 - 统一调用后端API
  const generateDraft = async (risk: Risk) => {
    setGeneratingDraft(true)
    setShowDraft(true)
    setDraftText('')
    setSelectedRisk(risk)
    
    try {
      const res = await authFetch('/api/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ risk, context: sources.map(s => s.content).join('\n\n') })
      })
      const data = await res.json()
      if (data.code === 200) {
        setDraftText(data.data.draft)
      }
    } catch {
      // 失败时降级到模板
      setDraftText(`【关于"${risk.title}"的确认】

您好，

在确认之前，我想核实一下以下事项：

关于「${risk.title}」：
${risk.description}

涉及的材料：${(risk.evidence?.map(e => e.sourceName) || risk.sources).join('、')}

请问实际情况是怎样的？能否以书面形式确认一下？

期待您的回复，谢谢！`)
    } finally {
      setGeneratingDraft(false)
    }
  }

  // 提交风险反馈
  const submitFeedback = async (riskId: string, feedback: 'accurate' | 'inaccurate') => {
    setRiskFeedback(prev => ({ ...prev, [riskId]: feedback }))
    try {
      await authFetch('/api/feedback/risk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ riskId, feedback })
      })
    } catch {
      // 静默失败
    }
  }

  // 生成报告文本
  const generateReportText = (r: AnalyzeResult, srcs: Source[]): string => {
    const lines = [
      '═'.repeat(50),
      '「有据」信息对齐分析报告',
      '═'.repeat(50),
      '',
      `生成时间：${new Date().toLocaleString()}`,
      '',
      '【一、材料概览】',
      ...srcs.map(s => `- ${s.name}（${s.meta}）`),
      '',
      '【二、风险摘要】',
      `严重风险：${r.summary.critical} 个`,
      `需要确认：${r.summary.warning} 个`,
      `提示信息：${r.summary.info} 个`,
      '',
      '【三、风险点详情】',
      ...r.risks.map((risk, i) => `
${i + 1}. 【${risk.level === 'critical' ? '⚠️ 严重' : risk.level === 'warning' ? '⚡ 需要确认' : '✓ 提示'}】${risk.title}
   类型：${risk.type === 'conflict' ? '直接矛盾' : risk.type === 'promise' ? '承诺未落文字' : risk.type === 'missing' ? '信息缺失' : '信息提示'}
   说明：${risk.description}
   来源：${(risk.evidence?.map(e => e.sourceName) || risk.sources).join('、')}
`),
      '',
    ]

    if (r.alignedVersion) {
      lines.push('【四、统一版本参照】')
      lines.push(r.alignedVersion)
      lines.push('')
    }

    if (r.extractedEntities && (r.extractedEntities.dates.length > 0 || r.extractedEntities.amounts.length > 0)) {
      lines.push('【五、关键要素提取】')
      if (r.extractedEntities.dates.length > 0) {
        lines.push('日期要素：')
        r.extractedEntities.dates.forEach(d => lines.push(`  - ${d.value}（来源：${d.source}）`))
      }
      if (r.extractedEntities.amounts.length > 0) {
        lines.push('金额要素：')
        r.extractedEntities.amounts.forEach(a => lines.push(`  - ${a.value}（来源：${a.source}）`))
      }
      if (r.extractedEntities.terms.length > 0) {
        lines.push('条款要素：')
        r.extractedEntities.terms.forEach(t => lines.push(`  - ${t.value}（来源：${t.source}）`))
      }
      if (r.extractedEntities.promises.length > 0) {
        lines.push('承诺要素（口头）：')
        r.extractedEntities.promises.forEach(p => lines.push(`  - ${p.value}（来源：${p.source}）`))
      }
      lines.push('')
    }

    lines.push('─'.repeat(50))
    lines.push('由「有据」生成 - 有据可依，有据可查')
    lines.push('─'.repeat(50))

    return lines.join('\n')
  }

  // 生成 Markdown 格式报告
  const generateReportMarkdown = (r: AnalyzeResult, srcs: Source[]): string => {
    const lines = [
      '# 「有据」信息对齐分析报告',
      '',
      `> 生成时间：${new Date().toLocaleString()}`,
      '',
      '## 一、材料概览',
      '',
      ...srcs.map(s => `- **${s.name}**（${s.meta || s.type}）`),
      '',
      '## 二、风险摘要',
      '',
      `| 等级 | 数量 |`,
      `|------|------|`,
      `| 🔴 严重风险 | ${r.summary.critical} |`,
      `| 🟡 需要确认 | ${r.summary.warning} |`,
      `| 🔵 提示信息 | ${r.summary.info} |`,
      '',
      '## 三、风险点详情',
      '',
      ...r.risks.map((risk, i) => `
### ${i + 1}. ${risk.level === 'critical' ? '🔴' : risk.level === 'warning' ? '🟡' : '🔵'} ${risk.title}

- **类型**：${risk.type === 'conflict' ? '直接矛盾' : risk.type === 'promise' ? '承诺未落文字' : risk.type === 'missing' ? '信息缺失' : '信息提示'}
- **说明**：${risk.description}
- **来源**：${(risk.evidence?.map(e => e.sourceName) || risk.sources).join('、')}
`),
      '',
    ]

    if (r.alignedVersion) {
      lines.push('## 四、统一版本参照')
      lines.push('')
      lines.push('```')
      lines.push(r.alignedVersion)
      lines.push('```')
      lines.push('')
    }

    if (r.checklist && r.checklist.length > 0) {
      lines.push('## 五、检查清单')
      lines.push('')
      r.checklist.forEach(item => {
        lines.push(`- [ ] ${item.text}`)
      })
      lines.push('')
    }

    if (r.extractedEntities && (r.extractedEntities.dates.length > 0 || r.extractedEntities.amounts.length > 0)) {
      lines.push('## 六、关键要素提取')
      lines.push('')
      if (r.extractedEntities.dates.length > 0) {
        lines.push('### 📅 日期要素')
        lines.push('')
        r.extractedEntities.dates.forEach(d => lines.push(`- ${d.value}（来源：${d.source}）`))
        lines.push('')
      }
      if (r.extractedEntities.amounts.length > 0) {
        lines.push('### 💰 金额要素')
        lines.push('')
        r.extractedEntities.amounts.forEach(a => lines.push(`- ${a.value}（来源：${a.source}）`))
        lines.push('')
      }
      if (r.extractedEntities.terms.length > 0) {
        lines.push('### 📝 条款要素')
        lines.push('')
        r.extractedEntities.terms.forEach(t => lines.push(`- ${t.value}（来源：${t.source}）`))
        lines.push('')
      }
      if (r.extractedEntities.promises.length > 0) {
        lines.push('### 💬 承诺要素（口头）')
        lines.push('')
        r.extractedEntities.promises.forEach(p => lines.push(`- ${p.value}（来源：${p.source}）`))
        lines.push('')
      }
    }

    lines.push('---')
    lines.push('')
    lines.push('*由「有据」生成 - 有据可依，有据可查*')

    return lines.join('\n')
  }

  const toggleCheck = (id: string) => {
    const newChecklist = checklist.map(c => c.id === id ? { ...c, checked: !c.checked } : c)
    setChecklist(newChecklist)
    
    const item = checklist.find(c => c.id === id)
    const newChecked = !item?.checked
    
    // 同步到后端
    const checkedIds = newChecklist.filter(c => c.checked).map(c => c.id)
    const currentTaskId = taskHistory.find(t => 
      t.title === (currentScenario 
        ? SCENARIOS.find(s => s.id === currentScenario)?.name 
        : `分析任务 ${new Date().toLocaleDateString()}`)
    )?.id
    
    if (currentTaskId) {
      authFetch(`/api/tasks/${currentTaskId}/checklist`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ checkedItems: checkedIds })
      }).catch(console.error)
    }
    
    // 记录偏好学习：风险权重
    if (item?.riskType) {
      authFetch('/api/preferences/checklist-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          riskType: item.riskType,
          dimension: item.dimension,
          checked: newChecked
        })
      }).catch(console.error)
    }
  }

  const checkedCount = checklist.filter(c => c.checked).length
  const scenario = SCENARIOS.find(s => s.id === currentScenario)

  const handleRiskFeedback = (riskId: string, riskType: string, isAccurate: boolean) => {
    setRiskFeedback(prev => ({
      ...prev,
      [riskId]: isAccurate ? 'accurate' : 'inaccurate'
    }))
    
    authFetch('/api/preferences/risk-feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ riskId, riskType, isAccurate })
    }).catch(console.error)
  }

  const loadSysStats = async () => {
    if (loadingStats) return
    setLoadingStats(true)
    try {
      const res = await authFetch('/api/admin/stats')
      const data = await res.json()
      if (data.code === 200) {
        setSysStats(data.data)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoadingStats(false)
    }
  }
  const [globalDragOver, setGlobalDragOver] = useState(false)

  // 处理全局拖拽文件
  const handleGlobalDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    setGlobalDragOver(false)
    
    if (page !== 'workspace') {
      setPage('workspace')
      setCurrentScenario(null)
    }
    
    const files = Array.from(e.dataTransfer.files)
    if (files.length === 0) return

    setShowAddSource(true)
    
    for (const file of files) {
      if (file.type.startsWith('image/')) {
        setAddSourceTab('screenshot')
        await recognizeScreenshot(file)
      } else {
        setAddSourceTab('file')
        await addFileSource(file)
      }
    }
  }

  return (
    <div 
      className="min-h-screen bg-[#0a0a0f]"
      onDragOver={e => { e.preventDefault(); setGlobalDragOver(true) }}
      onDragLeave={() => setGlobalDragOver(false)}
      onDrop={handleGlobalDrop}
    >
      {/* 首页导航栏 - 营销风格 */}
      {page === 'home' && (
        <nav className="fixed top-0 left-0 right-0 z-50 h-16 bg-[rgba(10,10,15,0.85)] backdrop-blur-xl border-b border-[#2a2a36] flex items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2.5 cursor-pointer bg-transparent border-none" onClick={() => setPage('home')}>
              <div className="w-9 h-9 bg-gradient-to-br from-indigo-500 via-purple-500 to-fuchsia-500 rounded-xl grid place-items-center text-lg font-bold text-white">据</div>
              <div className="text-xl font-semibold tracking-tight text-white">有据</div>
            </button>
          </div>
          <div className="flex items-center gap-6">
            <a href="#features" className="text-[#a0a0b0] text-sm no-underline transition-colors hover:text-white">功能介绍</a>
            <a href="#scenarios" className="text-[#a0a0b0] text-sm no-underline transition-colors hover:text-white">使用场景</a>
            <button 
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium cursor-pointer border-none bg-gradient-to-br from-indigo-500 via-purple-500 to-fuchsia-500 text-white shadow-lg shadow-indigo-500/30 hover:shadow-xl hover:shadow-indigo-500/40 hover:-translate-y-0.5 transition-all"
              onClick={() => setPage('workspace')}
            >
              立即体验
            </button>
          </div>
        </nav>
      )}

      {/* 首页 - 产品落地页 */}
      {page === 'home' && (
        <div className="bg-[#050507] min-h-screen text-white overflow-hidden">
          {/* 背景光晕 */}
          <div className="fixed inset-0 pointer-events-none overflow-hidden">
            <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-indigo-500/[0.08] rounded-full blur-[120px]"></div>
            <div className="absolute top-1/3 right-1/4 w-[500px] h-[500px] bg-purple-500/[0.06] rounded-full blur-[100px]"></div>
            <div className="absolute bottom-1/4 left-1/3 w-[400px] h-[400px] bg-fuchsia-500/[0.05] rounded-full blur-[80px]"></div>
          </div>

          {/* Hero */}
          <section className="relative py-28 md:py-40 px-6">
            <div className="max-w-6xl mx-auto">
              <div className="text-center max-w-4xl mx-auto">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/[0.04] border border-white/[0.08] rounded-full text-xs text-gray-400 mb-8 backdrop-blur-sm">
                  <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full"></span>
                  AI 驱动的信息对齐工作台
                </div>
                <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold mb-8 leading-[1.05] tracking-tight">
                  提交之前
                  <br/>
                  <span className="bg-gradient-to-r from-indigo-300 via-purple-300 to-fuchsia-300 bg-clip-text text-transparent">先把依据对齐</span>
                </h1>
                <p className="text-lg md:text-xl text-gray-400 leading-relaxed mb-10 max-w-2xl mx-auto">
                  把分散在聊天记录、截图、网页、文档、合同里的信息整合起来，
                  自动找出冲突和缺失，让你在签约、提交前真正看清风险。
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
                  <button 
                    className="group inline-flex items-center gap-2 px-7 py-3.5 rounded-full text-sm font-medium bg-white text-black cursor-pointer border-none hover:bg-gray-100 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
                    onClick={() => setPage('workspace')}
                  >
                    立即开始
                    <span className="w-7 h-7 rounded-full bg-black/10 flex items-center justify-center text-sm group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform">
                      →
                    </span>
                  </button>
                  <button 
                    className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full text-sm font-medium bg-white/[0.04] border border-white/[0.08] text-gray-300 cursor-pointer hover:bg-white/[0.08] hover:text-white transition-all duration-300"
                    onClick={() => loadScenario('job')}
                  >
                    查看演示
                  </button>
                </div>
              </div>

              {/* 产品预览 */}
              <div className="relative max-w-5xl mx-auto">
                <div className="absolute inset-0 bg-gradient-to-t from-[#050507] via-transparent to-transparent z-10 pointer-events-none" style={{ height: '40%', bottom: 0, top: 'auto' }}></div>
                <div className="bg-[#0a0a0f] border border-white/[0.06] rounded-[2rem] p-2 shadow-2xl">
                  <div className="bg-[#0d0d14] rounded-[calc(2rem-0.5rem)] overflow-hidden">
                    <div className="flex items-center gap-3 px-5 py-3 border-b border-white/[0.04]">
                      <div className="flex gap-2">
                        <div className="w-3 h-3 rounded-full bg-rose-500/40"></div>
                        <div className="w-3 h-3 rounded-full bg-amber-500/40"></div>
                        <div className="w-3 h-3 rounded-full bg-emerald-500/40"></div>
                      </div>
                      <div className="text-xs text-gray-500 ml-4">有据 · 分析工作台</div>
                    </div>
                    <div className="flex h-[420px]">
                      <div className="w-48 bg-[#0a0a0f] border-r border-white/[0.04] p-3 flex flex-col gap-1">
                        <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-indigo-500/10 text-indigo-400 text-xs font-medium">
                          <span>📊</span> 分析工作台
                        </div>
                        <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-gray-500 text-xs hover:bg-white/[0.02]">
                          <span>📜</span> 历史记录
                        </div>
                        <div className="h-px bg-white/[0.04] my-2"></div>
                        <div className="text-[10px] text-gray-600 px-3 mb-1 uppercase tracking-wider">场景</div>
                        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.03] text-white text-xs">
                          <span>💼</span> 求职 Offer
                        </div>
                        <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-gray-500 text-xs hover:bg-white/[0.02]">
                          <span>🏠</span> 租房签约
                        </div>
                        <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-gray-500 text-xs hover:bg-white/[0.02]">
                          <span>📚</span> 作业提交
                        </div>
                      </div>
                      <div className="flex-1 flex flex-col">
                        <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.04]">
                          <span className="text-sm font-medium">求职 Offer 确认</span>
                          <span className="text-xs text-gray-500">2 份材料</span>
                        </div>
                        <div className="flex-1 flex p-4 gap-4">
                          <div className="w-40 bg-[#0a0a0f] border border-white/[0.04] rounded-xl p-3 flex flex-col gap-2">
                            <div className="text-xs font-medium mb-1">材料</div>
                            <div className="px-2.5 py-2 rounded-lg bg-white/[0.03] border border-white/[0.04]">
                              <div className="text-xs text-white">HR聊天记录</div>
                              <div className="text-[10px] text-gray-500">聊天记录</div>
                            </div>
                            <div className="px-2.5 py-2 rounded-lg bg-white/[0.03] border border-white/[0.04]">
                              <div className="text-xs text-white">正式录用通知</div>
                              <div className="text-[10px] text-gray-500">文档</div>
                            </div>
                          </div>
                          <div className="flex-1 bg-[#0a0a0f] border border-white/[0.04] rounded-xl p-4 overflow-hidden">
                            <div className="flex gap-4 mb-4">
                              <span className="text-xs text-indigo-400 font-medium pb-2 border-b border-indigo-500/30">风险清单</span>
                              <span className="text-xs text-gray-500 pb-2">风险关联</span>
                              <span className="text-xs text-gray-500 pb-2">AI思考</span>
                            </div>
                            <div className="space-y-3">
                              <div className="p-3 rounded-lg bg-rose-500/[0.06] border border-rose-500/15">
                                <div className="text-xs font-medium text-rose-400 mb-1">薪资金额存在重大冲突</div>
                                <div className="text-[11px] text-gray-500">聊天记录说25k/月，Offer写30万年薪...</div>
                              </div>
                              <div className="p-3 rounded-lg bg-rose-500/[0.06] border border-rose-500/15">
                                <div className="text-xs font-medium text-rose-400 mb-1">试用期薪资不符</div>
                                <div className="text-[11px] text-gray-500">口头承诺试用期薪资不打折...</div>
                              </div>
                              <div className="p-3 rounded-lg bg-amber-500/[0.06] border border-amber-500/15">
                                <div className="text-xs font-medium text-amber-400 mb-1">"每年两次调薪"未落实</div>
                                <div className="text-[11px] text-gray-500">Offer 中未提及调薪机制...</div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* 信任 Logo 墙 */}
          <section className="relative py-20 px-6 border-t border-white/[0.04]">
            <div className="max-w-5xl mx-auto">
              <p className="text-center text-xs text-gray-600 uppercase tracking-[0.2em] mb-10">
                适用于各种关键决策场景
              </p>
              <div className="flex items-center justify-center gap-12 flex-wrap opacity-40">
                <span className="text-lg font-semibold text-gray-400">求职入职</span>
                <span className="text-lg font-semibold text-gray-400">租房签约</span>
                <span className="text-lg font-semibold text-gray-400">合同审核</span>
                <span className="text-lg font-semibold text-gray-400">作业提交</span>
                <span className="text-lg font-semibold text-gray-400">需求对齐</span>
                <span className="text-lg font-semibold text-gray-400">方案对比</span>
              </div>
            </div>
          </section>

          {/* 功能一：AI 自动分析 */}
          <section className="relative py-32 px-6 border-t border-white/[0.04]">
            <div className="max-w-6xl mx-auto">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
                <div>
                  <div className="text-xs text-indigo-400 font-medium uppercase tracking-[0.15em] mb-4">
                    核心能力
                  </div>
                  <h2 className="text-4xl md:text-5xl font-bold mb-6 leading-tight tracking-tight">
                    AI 自动发现
                    <br/>
                    <span className="text-gray-500">冲突与缺失</span>
                  </h2>
                  <p className="text-base text-gray-400 leading-relaxed mb-8">
                    不再需要逐字比对多份材料。上传后 AI 自动提取关键要素，
                    跨源交叉核验，找出矛盾点和未落实的承诺。
                  </p>
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-indigo-500/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-indigo-400 text-xs">✓</span>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-white mb-1">直接矛盾检测</div>
                        <div className="text-xs text-gray-500">同一信息在不同材料中说法不一致</div>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-amber-500/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-amber-400 text-xs">!</span>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-white mb-1">口头承诺未落文字</div>
                        <div className="text-xs text-gray-500">聊天里说过，但正式文件里没写</div>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-purple-500/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-purple-400 text-xs">?</span>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-white mb-1">重要信息缺失</div>
                        <div className="text-xs text-gray-500">应该有的关键条款完全没提到</div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="relative">
                  <div className="bg-[#0a0a0f] border border-white/[0.06] rounded-2xl p-1.5">
                    <div className="bg-[#0d0d14] rounded-[1.6rem] p-6">
                      <div className="flex items-center gap-2 mb-6">
                        <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
                        <span className="text-xs text-gray-500">AI 分析中</span>
                      </div>
                      <div className="space-y-4">
                        <div className="flex items-center gap-3">
                          <div className="w-7 h-7 rounded-full bg-indigo-500/15 flex items-center justify-center text-xs text-indigo-400 font-medium">1</div>
                          <div className="flex-1 h-1 bg-white/[0.04] rounded-full overflow-hidden">
                            <div className="h-full w-full bg-indigo-500/40 rounded-full"></div>
                          </div>
                          <span className="text-xs text-gray-500">场景识别</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="w-7 h-7 rounded-full bg-indigo-500/15 flex items-center justify-center text-xs text-indigo-400 font-medium">2</div>
                          <div className="flex-1 h-1 bg-white/[0.04] rounded-full overflow-hidden">
                            <div className="h-full w-full bg-indigo-500/40 rounded-full"></div>
                          </div>
                          <span className="text-xs text-gray-500">要素提取</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="w-7 h-7 rounded-full bg-indigo-500/15 flex items-center justify-center text-xs text-indigo-400 font-medium">3</div>
                          <div className="flex-1 h-1 bg-white/[0.04] rounded-full overflow-hidden">
                            <div className="h-full w-3/4 bg-indigo-500/40 rounded-full"></div>
                          </div>
                          <span className="text-xs text-white">交叉核验</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="w-7 h-7 rounded-full bg-white/[0.04] flex items-center justify-center text-xs text-gray-600 font-medium">4</div>
                          <div className="flex-1 h-1 bg-white/[0.04] rounded-full"></div>
                          <span className="text-xs text-gray-600">生成报告</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* 功能二：证据链溯源 */}
          <section className="relative py-32 px-6 border-t border-white/[0.04]">
            <div className="max-w-6xl mx-auto">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
                <div className="relative order-2 lg:order-1">
                  <div className="bg-[#0a0a0f] border border-white/[0.06] rounded-2xl overflow-hidden">
                    <div className="px-5 py-3 border-b border-white/[0.04] flex items-center justify-between">
                      <span className="text-sm font-medium">薪资金额冲突</span>
                      <span className="text-xs text-rose-400 px-2 py-0.5 bg-rose-500/10 rounded-full">严重</span>
                    </div>
                    <div className="p-5">
                      <p className="text-sm text-gray-400 mb-5">
                        聊天记录中 HR 说月薪 25k，但正式 Offer 写的是年薪 30 万（折合月薪 2.5 万），
                        需确认是否包含年终奖。
                      </p>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 rounded-xl bg-rose-500/[0.04] border border-rose-500/10">
                          <div className="text-xs text-rose-400 mb-2 flex items-center gap-1.5">
                            <span>A</span> HR聊天记录
                          </div>
                          <p className="text-xs text-gray-400 leading-relaxed">
                            "月薪25k，另外每年有2-3个月年终奖..."
                          </p>
                        </div>
                        <div className="p-4 rounded-xl bg-amber-500/[0.04] border border-amber-500/10">
                          <div className="text-xs text-amber-400 mb-2 flex items-center gap-1.5">
                            <span>B</span> 正式Offer
                          </div>
                          <p className="text-xs text-gray-400 leading-relaxed">
                            "年薪：30万元（固定）试用期：6个月..."
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="order-1 lg:order-2">
                  <div className="text-xs text-purple-400 font-medium uppercase tracking-[0.15em] mb-4">
                    证据链
                  </div>
                  <h2 className="text-4xl md:text-5xl font-bold mb-6 leading-tight tracking-tight">
                    每一条结论
                    <br/>
                    <span className="text-gray-500">都有出处</span>
                  </h2>
                  <p className="text-base text-gray-400 leading-relaxed mb-8">
                    所有风险点都附带原文引用和来源材料。点击证据即可跳转到原文位置，
                    让你快速核实，而不是盲目相信 AI。
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <span className="px-4 py-2 rounded-full text-xs bg-white/[0.03] border border-white/[0.06] text-gray-400">
                      原文引用
                    </span>
                    <span className="px-4 py-2 rounded-full text-xs bg-white/[0.03] border border-white/[0.06] text-gray-400">
                      来源定位
                    </span>
                    <span className="px-4 py-2 rounded-full text-xs bg-white/[0.03] border border-white/[0.06] text-gray-400">
                      冲突并排对比
                    </span>
                    <span className="px-4 py-2 rounded-full text-xs bg-white/[0.03] border border-white/[0.06] text-gray-400">
                      置信度标注
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* 功能三：场景模板 */}
          <section className="relative py-32 px-6 border-t border-white/[0.04]">
            <div className="max-w-6xl mx-auto">
              <div className="text-center mb-16">
                <div className="text-xs text-emerald-400 font-medium uppercase tracking-[0.15em] mb-4">
                  即用场景
                </div>
                <h2 className="text-4xl md:text-5xl font-bold mb-5 tracking-tight">
                  选择你的场景
                </h2>
                <p className="text-base text-gray-500 max-w-xl mx-auto">
                  内置多种常见场景模板，加载示例材料一键开始，也可以完全自定义
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {SCENARIOS.map(s => (
                  <button
                    key={s.id}
                    className="group text-left bg-[#0a0a0f] border border-white/[0.06] rounded-2xl p-6 hover:border-white/[0.12] transition-all duration-300 hover:-translate-y-1 cursor-pointer"
                    onClick={() => loadScenario(s.id)}
                  >
                    <div className="w-12 h-12 rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-2xl mb-5 group-hover:scale-110 transition-transform">
                      {s.icon}
                    </div>
                    <h3 className="text-lg font-semibold mb-2 text-white group-hover:text-indigo-300 transition-colors">{s.name}</h3>
                    <p className="text-sm text-gray-500 mb-5 leading-relaxed">{s.description}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-600">{s.sourceCount} 份示例材料</span>
                      <span className="text-xs text-indigo-400 flex items-center gap-1 group-hover:gap-2 transition-all">
                        开始
                        <span>→</span>
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* CTA */}
          <section className="relative py-32 px-6 border-t border-white/[0.04]">
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="text-4xl md:text-5xl font-bold mb-6 tracking-tight">
                准备好
                <span className="bg-gradient-to-r from-indigo-300 via-purple-300 to-fuchsia-300 bg-clip-text text-transparent">对齐你的依据</span>
                了吗？
              </h2>
              <p className="text-base text-gray-500 mb-10 max-w-lg mx-auto">
                只需几分钟，帮你看清那些容易被忽略的风险
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button 
                  className="group inline-flex items-center gap-2 px-8 py-4 rounded-full text-sm font-medium bg-white text-black cursor-pointer border-none hover:bg-gray-100 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
                  onClick={() => setPage('workspace')}
                >
                  免费开始使用
                  <span className="w-7 h-7 rounded-full bg-black/10 flex items-center justify-center text-sm group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform">
                    →
                  </span>
                </button>
              </div>
            </div>
          </section>

          {/* Footer */}
          <footer className="relative py-16 px-6 border-t border-white/[0.04]">
            <div className="max-w-6xl mx-auto">
              <div className="flex flex-col md:flex-row justify-between items-start gap-10">
                <div>
                  <div className="flex items-center gap-2.5 mb-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 via-purple-500 to-fuchsia-500 rounded-lg grid place-items-center text-sm font-bold text-white">据</div>
                    <span className="text-lg font-semibold">有据</span>
                  </div>
                  <p className="text-sm text-gray-500 max-w-xs">让每一次确认都有凭有据</p>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-12">
                  <div>
                    <h4 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-4">产品</h4>
                    <div className="space-y-3">
                      <button className="block text-sm text-gray-500 hover:text-white cursor-pointer bg-transparent border-none p-0 transition-colors" onClick={() => setPage('workspace')}>工作台</button>
                      <button className="block text-sm text-gray-500 hover:text-white cursor-pointer bg-transparent border-none p-0 transition-colors">场景</button>
                      <button className="block text-sm text-gray-500 hover:text-white cursor-pointer bg-transparent border-none p-0 transition-colors">定价</button>
                    </div>
                  </div>
                  <div>
                    <h4 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-4">资源</h4>
                    <div className="space-y-3">
                      <button className="block text-sm text-gray-500 hover:text-white cursor-pointer bg-transparent border-none p-0 transition-colors">文档</button>
                      <button className="block text-sm text-gray-500 hover:text-white cursor-pointer bg-transparent border-none p-0 transition-colors">更新日志</button>
                      <button className="block text-sm text-gray-500 hover:text-white cursor-pointer bg-transparent border-none p-0 transition-colors">反馈</button>
                    </div>
                  </div>
                  <div>
                    <h4 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-4">公司</h4>
                    <div className="space-y-3">
                      <button className="block text-sm text-gray-500 hover:text-white cursor-pointer bg-transparent border-none p-0 transition-colors">关于</button>
                      <button className="block text-sm text-gray-500 hover:text-white cursor-pointer bg-transparent border-none p-0 transition-colors">隐私</button>
                      <button className="block text-sm text-gray-500 hover:text-white cursor-pointer bg-transparent border-none p-0 transition-colors">条款</button>
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-16 pt-8 border-t border-white/[0.04] flex flex-col md:flex-row justify-between items-center gap-4">
                <p className="text-xs text-gray-600">© 2025 有据. 保留所有权利.</p>
                <div className="flex items-center gap-4">
                  <button className="text-gray-600 hover:text-white cursor-pointer bg-transparent border-none text-sm transition-colors">GitHub</button>
                  <button className="text-gray-600 hover:text-white cursor-pointer bg-transparent border-none text-sm transition-colors">Twitter</button>
                </div>
              </div>
            </div>
          </footer>
        </div>
      )}

      {/* 工作台 - 标准 SaaS UI 结构：Sidebar + TopBar + Main + RightPanel */}
      {page === 'workspace' && (
        <div className="flex h-screen bg-[#050507] text-white overflow-hidden">
          {/* 左侧：对象入口系统（Object Entry System） */}
          <aside className="w-60 bg-[#0a0a0f] border-r border-white/[0.06] flex flex-col flex-shrink-0">
            {/* Logo + 工作区切换 */}
            <div className="h-14 px-4 flex items-center gap-2.5 border-b border-white/[0.06]">
              <button 
                className="flex items-center gap-2.5 cursor-pointer bg-transparent border-none hover:opacity-80 transition-opacity"
                onClick={() => setPage('home')}
              >
                <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 via-purple-500 to-fuchsia-500 rounded-lg grid place-items-center text-sm font-bold text-white">据</div>
                <span className="text-base font-semibold text-white">有据</span>
              </button>
            </div>

            {/* 新建按钮 */}
            <div className="px-3 py-3 border-b border-white/[0.06]">
              <button 
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium bg-white text-black cursor-pointer border-none hover:bg-gray-100 transition-all duration-200"
                onClick={() => { setCurrentScenario(null); setSources([]); setResult(null); setSelectedRisk(null); }}
              >
                <span>+</span> 新建分析
              </button>
            </div>

            {/* 主导航 */}
            <div className="px-2 py-3 space-y-0.5">
              <div className="text-[11px] font-semibold text-gray-600 uppercase tracking-[0.1em] px-2.5 mb-2">工作区</div>
              <button 
                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm font-medium bg-indigo-500/10 text-indigo-400 cursor-pointer border border-transparent"
              >
                <span className="text-sm">📊</span>
                分析工作台
              </button>
              <button 
                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm font-medium text-gray-500 hover:bg-white/[0.03] hover:text-white cursor-pointer border border-transparent transition-all"
                onClick={() => { fetchTaskHistory(); setShowHistory(true); }}
              >
                <span className="text-sm">📜</span>
                历史记录
              </button>
            </div>

            {/* 分隔线 */}
            <div className="px-3">
              <div className="h-px bg-white/[0.06]"></div>
            </div>

            {/* 场景模板 - 对象入口 */}
            <div className="px-2 py-3 flex-1 overflow-y-auto">
              <div className="text-[11px] font-semibold text-gray-600 uppercase tracking-[0.1em] px-2.5 mb-2 flex items-center justify-between">
                <span>场景模板</span>
              </div>
              <div className="space-y-0.5">
                {SCENARIOS.map(s => (
                  <button
                    key={s.id}
                    className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm cursor-pointer transition-all ${
                      currentScenario === s.id 
                        ? 'bg-white/[0.05] text-white border border-white/[0.06]' 
                        : 'text-gray-500 hover:bg-white/[0.03] hover:text-white border border-transparent'
                    }`}
                    onClick={() => loadScenario(s.id)}
                  >
                    <span className="text-sm">{s.icon}</span>
                    <span className="flex-1 text-left truncate">{s.name}</span>
                  </button>
                ))}
                <button
                  className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm cursor-pointer transition-all ${
                    currentScenario === null 
                      ? 'bg-white/[0.05] text-white border border-white/[0.06]' 
                      : 'text-gray-500 hover:bg-white/[0.03] hover:text-white border border-transparent'
                  }`}
                  onClick={() => { setCurrentScenario(null); setSources([]); setResult(null); setSelectedRisk(null); }}
                >
                  <span className="text-sm">✏️</span>
                  <span className="flex-1 text-left truncate">自定义</span>
                </button>
              </div>
            </div>

            {/* 底部：用户/设置 */}
            <div className="px-2 py-2 border-t border-white/[0.06]">
              {user ? (
                <div className="flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-white/[0.03] cursor-pointer transition-all">
                  <img 
                    src={user.avatar} 
                    alt={user.nickname}
                    className="w-7 h-7 rounded-full border border-white/[0.08]"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-white truncate">{user.nickname}</div>
                    <div className="text-[11px] text-gray-600 truncate">{user.phone}</div>
                  </div>
                  <button 
                    className="text-gray-600 hover:text-white cursor-pointer bg-transparent border-none text-sm"
                    onClick={handleLogout}
                  >
                    ⏻
                  </button>
                </div>
              ) : (
                <button 
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium bg-gradient-to-r from-indigo-500 to-purple-500 text-white cursor-pointer border-none"
                  onClick={() => setShowLoginModal(true)}
                >
                  登录 / 注册
                </button>
              )}
            </div>
          </aside>

          {/* 右侧主区域：TopBar + Main + RightPanel */}
          <div className="flex-1 flex flex-col overflow-hidden min-w-0">
            {/* Top Bar：搜索 + 全局操作 */}
            <header className="h-14 bg-[#0a0a0f] border-b border-white/[0.06] flex items-center justify-between px-5 flex-shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <h1 className="text-sm font-semibold text-white truncate">
                  {scenario ? scenario.name : '自定义分析'}
                </h1>
                {scenario && (
                  <span className="text-[11px] text-gray-500 bg-white/[0.03] px-2 py-0.5 rounded-md border border-white/[0.06] flex-shrink-0">
                    {sources.length} 份材料
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button 
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer border-none bg-transparent text-gray-400 hover:bg-white/[0.04] hover:text-white transition-all border border-transparent"
                  onClick={() => setPage('home')}
                >
                  返回首页
                </button>
                {result && (
                  <button 
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer border-none bg-white/[0.04] text-gray-300 hover:bg-white/[0.08] hover:text-white transition-all border border-white/[0.06]"
                    onClick={() => setShowShareModal(true)}
                  >
                    分享
                  </button>
                )}
                <button 
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium cursor-pointer border-none bg-white text-black hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  onClick={analyze}
                  disabled={analyzing || sources.length === 0}
                >
                  {analyzing ? '分析中...' : '开始分析'}
                </button>
              </div>
            </header>

            {/* 主工作区：三栏布局 - 材料列表 | 风险详情 | 上下文面板 */}
            <div className="flex-1 overflow-hidden flex">
              {/* 第一栏：材料列表（List） */}
              <div className="w-56 bg-[#0a0a0f] border-r border-white/[0.06] flex flex-col flex-shrink-0">
                <div className="px-3.5 py-2.5 border-b border-white/[0.06] flex justify-between items-center">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold text-white">材料</span>
                    <span className="text-[11px] text-gray-600">{sources.length}</span>
                  </div>
                  <button 
                    className="w-5 h-5 rounded-md flex items-center justify-center text-xs cursor-pointer border-none bg-transparent text-gray-500 hover:bg-white/[0.06] hover:text-white transition-all"
                    onClick={() => setShowAddSource(true)}
                  >
                    +
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto p-1.5 space-y-1">
                  {sources.length === 0 ? (
                    <div className="px-3 py-8 text-center">
                      <p className="text-[11px] text-gray-600 mb-3">暂无材料</p>
                      <button 
                        className="px-3 py-1.5 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-md text-xs font-medium cursor-pointer hover:bg-indigo-500/20 transition-all"
                        onClick={() => setShowAddSource(true)}
                      >
                        添加材料
                      </button>
                    </div>
                  ) : (
                    sources.map((s) => (
                      <button
                        key={s.id}
                        className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-md text-left cursor-pointer transition-all ${
                          selectedSource === s.id 
                            ? 'bg-indigo-500/10 border border-indigo-500/20' 
                            : 'hover:bg-white/[0.03] border border-transparent'
                        }`}
                        onClick={() => setSelectedSource(selectedSource === s.id ? null : s.id)}
                      >
                        <span className="text-sm">{TYPE_ICONS[s.type]}</span>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-medium text-white truncate">{s.name}</div>
                          <div className="text-[10px] text-gray-600 truncate">{TYPE_LABELS[s.type]}</div>
                        </div>
                      </button>
                    ))
                  )}
                </div>
                {selectedSource && (() => {
                  const source = sources.find(s => s.id === selectedSource)
                  if (!source) return null
                  return (
                    <div className="border-t border-white/[0.06] p-3 max-h-[40%] overflow-y-auto bg-[#08080c]">
                      <div className="text-xs font-semibold text-white mb-1.5 truncate">{source.name}</div>
                      <div className="text-[10px] text-gray-600 mb-2.5">{TYPE_LABELS[source.type]}</div>
                      <div className="text-[11px] text-gray-500 leading-relaxed whitespace-pre-wrap">
                        {source.content}
                      </div>
                    </div>
                  )
                })()}
              </div>

              {/* 第二栏：风险详情（Detail - 工作流核心） */}
              <div className="flex-1 flex flex-col overflow-hidden min-w-0">
                {analyzing ? (
                  <div className="flex-1 flex flex-col items-center justify-center p-8">
                    <div className="w-12 h-12 rounded-full border-2 border-white/[0.06] border-t-indigo-500 animate-spin mb-5"></div>
                    <div className="text-base font-semibold text-white mb-1.5">
                      {ANALYSIS_STEPS[analysisStep - 1]?.name || '准备中...'}
                    </div>
                    <div className="text-xs text-gray-500 mb-5 max-w-sm text-center">
                      {ANALYSIS_STEPS[analysisStep - 1]?.desc || ''}
                    </div>
                    <div className="w-64 h-1 bg-white/[0.06] rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-300"
                        style={{ width: `${(analysisStep / ANALYSIS_STEPS.length) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                ) : result ? (
                  <>
                    {/* 标签页导航 */}
                    <div className="px-4 py-2.5 border-b border-white/[0.06] flex items-center gap-0.5 flex-shrink-0">
                      {[
                        { key: 'risks', label: '风险清单' },
                        { key: 'relations', label: '风险关联' },
                        { key: 'trace', label: 'AI 思考' },
                      ].map(tab => (
                        <button
                          key={tab.key}
                          className={`px-3 py-1.5 rounded-md text-xs font-medium cursor-pointer transition-all ${
                            activeTab === tab.key
                              ? 'bg-white/[0.05] text-white border border-white/[0.06]'
                              : 'text-gray-500 hover:text-white hover:bg-white/[0.03] border border-transparent'
                          }`}
                          onClick={() => setActiveTab(tab.key as any)}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>

                    {/* 标签页内容 */}
                    <div className="flex-1 overflow-y-auto p-4">
                      {/* 风险清单视图 */}
                      {activeTab === 'risks' && (
                        <div className="space-y-2.5">
                          {result.risks.length === 0 ? (
                            <div className="text-center py-12">
                              <div className="text-3xl mb-3">✅</div>
                              <p className="text-sm text-gray-500">没有发现风险</p>
                            </div>
                          ) : (
                            result.risks.map(risk => (
                              <button 
                                key={risk.id}
                                onClick={() => setSelectedRisk(selectedRisk?.id === risk.id ? null : risk)}
                                className={`w-full text-left rounded-xl p-4 border transition-all cursor-pointer ${
                                  selectedRisk?.id === risk.id
                                    ? 'bg-white/[0.04] border-white/[0.1] ring-1 ring-white/[0.08]'
                                    : risk.level === 'critical'
                                      ? 'bg-rose-500/[0.04] border-rose-500/10 hover:bg-rose-500/[0.06]'
                                      : risk.level === 'warning'
                                        ? 'bg-amber-500/[0.04] border-amber-500/10 hover:bg-amber-500/[0.06]'
                                        : 'bg-emerald-500/[0.03] border-emerald-500/10 hover:bg-emerald-500/[0.05]'
                                }`}
                              >
                                <div className="flex gap-3 items-start">
                                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-xs ${
                                    risk.level === 'critical' 
                                      ? 'bg-rose-500/15 text-rose-400' 
                                      : risk.level === 'warning' 
                                        ? 'bg-amber-500/15 text-amber-400' 
                                        : 'bg-emerald-500/15 text-emerald-400'
                                  }`}>
                                    {risk.level === 'critical' ? '!' : risk.level === 'warning' ? '⚡' : '✓'}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className={`text-sm font-semibold mb-1 ${
                                      risk.level === 'critical' ? 'text-rose-400' : 
                                      risk.level === 'warning' ? 'text-amber-400' : 
                                      'text-emerald-400'
                                    }`}>{risk.title}</div>
                                    <div className="text-[11px] text-gray-600 mb-1.5">
                                      {risk.type === 'conflict' ? '直接矛盾' : 
                                       risk.type === 'promise' ? '承诺未落文字' : 
                                       risk.type === 'missing' ? '信息缺失' : '信息提示'}
                                      {risk.dimension && ` · ${risk.dimension}`}
                                    </div>
                                    <div className="text-xs text-gray-500 leading-relaxed line-clamp-2">{risk.description}</div>
                                  </div>
                                </div>
                              </button>
                            ))
                          )}
                        </div>
                      )}

                      {/* 风险关联视图 */}
                      {activeTab === 'relations' && result.riskRelations && (
                        <div className="space-y-4">
                          <div>
                            <h4 className="text-xs font-semibold text-white mb-3">按材料查看风险</h4>
                            <div className="space-y-2">
                              {result.riskRelations.associations.map((assoc: any) => (
                                <div key={assoc.sourceName} className="rounded-lg p-3 bg-white/[0.02] border border-white/[0.06]">
                                  <div className="flex items-center gap-2 mb-2">
                                    <span>{TYPE_ICONS[assoc.sourceType as SourceType] || '📄'}</span>
                                    <span className="text-xs font-medium text-white">{assoc.sourceName}</span>
                                    <span className="text-[11px] text-gray-600">{assoc.riskCount} 个风险</span>
                                  </div>
                                  <div className="flex flex-wrap gap-1.5">
                                    {assoc.riskIds.map((riskId: string) => {
                                      const risk = result.risks.find(r => r.id === riskId)
                                      if (!risk) return null
                                      return (
                                        <span 
                                          key={riskId}
                                          className={`px-2 py-1 rounded-md text-[11px] cursor-pointer hover:opacity-80 transition-opacity ${
                                            risk.level === 'critical'
                                              ? 'bg-rose-500/10 text-rose-400'
                                              : risk.level === 'warning'
                                                ? 'bg-amber-500/10 text-amber-400'
                                                : 'bg-emerald-500/10 text-emerald-400'
                                          }`}
                                          onClick={() => setSelectedRisk(risk)}
                                        >
                                          {risk.title.length > 12 ? risk.title.substring(0, 12) + '...' : risk.title}
                                        </span>
                                      )
                                    })}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* AI 思考视图 */}
                      {activeTab === 'trace' && result.reasoningTrace && (
                        <div className="space-y-2.5">
                          {result.reasoningTrace.map((step: any, idx: number) => (
                            <div key={idx} className="rounded-lg bg-white/[0.02] border border-white/[0.06] p-3.5">
                              <div className="flex items-center gap-2.5 mb-2">
                                <div className="w-5 h-5 rounded-full bg-indigo-500/15 text-indigo-400 flex items-center justify-center text-[11px] font-medium">
                                  {idx + 1}
                                </div>
                                <div className="text-xs font-medium text-white">{step.title || step.name || step.step || `步骤 ${idx + 1}`}</div>
                              </div>
                              {(step.description || step.result) && (
                                <p className="text-xs text-gray-500 pl-7.5 leading-relaxed">{step.description || step.result}</p>
                              )}
                              {step.content && (
                                <div className="mt-2 pl-7.5">
                                  <pre className="text-[11px] text-gray-600 bg-black/30 p-2.5 rounded-md overflow-x-auto whitespace-pre-wrap">{step.content}</pre>
                                </div>
                              )}
                            </div>
                          ))}
                          
                          {result.debugInfo && (
                            <div className="mt-5 rounded-lg border border-white/[0.06] bg-white/[0.02] overflow-hidden">
                              <div className="px-3.5 py-2.5 border-b border-white/[0.06] flex items-center justify-between">
                                <span className="text-xs font-medium text-white">开发者调试信息</span>
                              </div>
                              <div className="p-3.5 space-y-2 text-[11px]">
                                <div className="flex justify-between">
                                  <span className="text-gray-600">模型</span>
                                  <span className="text-gray-500 font-mono">{result.debugInfo.model}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Prompt Tokens</span>
                                  <span className="text-gray-500 font-mono">{result.debugInfo.tokenPrompt}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Completion Tokens</span>
                                  <span className="text-gray-500 font-mono">{result.debugInfo.tokenCompletion}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Total Tokens</span>
                                  <span className="text-gray-500 font-mono">{result.debugInfo.tokenTotal}</span>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                    <div className="text-4xl mb-4">🔍</div>
                    <h3 className="text-lg font-semibold text-white mb-2">准备好分析了吗？</h3>
                    <p className="text-xs text-gray-500 mb-5 max-w-sm">
                      添加材料后点击"开始分析"，AI 将自动识别冲突、缺失和风险
                    </p>
                    <button 
                      className="px-5 py-2.5 bg-white text-black rounded-lg text-xs font-medium cursor-pointer border-none hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                      onClick={analyze}
                      disabled={sources.length === 0}
                    >
                      {sources.length === 0 ? '请先添加材料' : '开始分析'}
                    </button>
                  </div>
                )}
              </div>

              {/* 第三栏：上下文面板（Context Inspector - 对象解释系统） */}
              <div className="w-72 bg-[#0a0a0f] border-l border-white/[0.06] flex flex-col flex-shrink-0">
                {selectedRisk ? (
                  <>
                    <div className="px-4 py-3 border-b border-white/[0.06]">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold text-white">风险详情</span>
                        <button 
                          className="w-5 h-5 rounded-md flex items-center justify-center text-xs cursor-pointer border-none bg-transparent text-gray-500 hover:bg-white/[0.06] hover:text-white transition-all"
                          onClick={() => setSelectedRisk(null)}
                        >
                          ×
                        </button>
                      </div>
                      <div className={`inline-block px-2 py-0.5 rounded text-[10px] font-medium ${
                        selectedRisk.level === 'critical' ? 'bg-rose-500/15 text-rose-400' :
                        selectedRisk.level === 'warning' ? 'bg-amber-500/15 text-amber-400' :
                        'bg-emerald-500/15 text-emerald-400'
                      }`}>
                        {selectedRisk.level === 'critical' ? '严重' : selectedRisk.level === 'warning' ? '警告' : '提示'}
                      </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-5">
                      {/* 标题和描述 */}
                      <div>
                        <h3 className="text-sm font-semibold text-white mb-2 leading-snug">{selectedRisk.title}</h3>
                        <p className="text-xs text-gray-500 leading-relaxed">{selectedRisk.description}</p>
                      </div>

                      {/* 属性 */}
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] text-gray-600">类型</span>
                          <span className="text-[11px] text-gray-400">
                            {selectedRisk.type === 'conflict' ? '直接矛盾' : 
                             selectedRisk.type === 'promise' ? '承诺未落文字' : 
                             selectedRisk.type === 'missing' ? '信息缺失' : '信息提示'}
                          </span>
                        </div>
                        {selectedRisk.dimension && (
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] text-gray-600">维度</span>
                            <span className="text-[11px] text-gray-400">{selectedRisk.dimension}</span>
                          </div>
                        )}
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] text-gray-600">涉及材料</span>
                          <span className="text-[11px] text-gray-400">{selectedRisk.sources?.length || 0} 份</span>
                        </div>
                      </div>

                      {/* 证据链 */}
                      {selectedRisk.evidence && selectedRisk.evidence.length > 0 && (
                        <div>
                          <h4 className="text-[11px] font-semibold text-white mb-2.5 flex items-center gap-1.5">
                            <span>📎</span> 证据 ({selectedRisk.evidence.length})
                          </h4>
                          <div className="space-y-2">
                            {selectedRisk.evidence.map((ev: any, idx: number) => (
                              <div key={idx} className="rounded-lg bg-[#07070b] border border-white/[0.06] p-2.5">
                                <div className="text-[10px] text-gray-500 mb-1.5 flex items-center gap-1">
                                  <span>{TYPE_ICONS[ev.sourceType as SourceType] || '📄'}</span>
                                  {ev.sourceName}
                                </div>
                                <p className="text-[11px] text-gray-400 leading-relaxed italic">"{ev.quote}"</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* 建议动作 */}
                      <div>
                        <h4 className="text-[11px] font-semibold text-white mb-2.5 flex items-center gap-1.5">
                          <span>💡</span> 建议动作
                        </h4>
                        <div className="space-y-1.5">
                          <button 
                            className="w-full text-left px-3 py-2 rounded-md text-[11px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 cursor-pointer hover:bg-indigo-500/20 transition-all"
                            onClick={() => generateDraft(selectedRisk)}
                          >
                            生成沟通话术
                          </button>
                          <button className="w-full text-left px-3 py-2 rounded-md text-[11px] bg-white/[0.03] text-gray-400 border border-white/[0.06] cursor-pointer hover:bg-white/[0.06] transition-all">
                            标记为已处理
                          </button>
                        </div>
                      </div>

                      {/* 用户反馈 */}
                      <div>
                        <h4 className="text-[11px] font-semibold text-white mb-2.5 flex items-center gap-1.5">
                          <span>👤</span> 反馈
                        </h4>
                        <div className="flex gap-2">
                          <button 
                            className={`flex-1 py-1.5 rounded-md text-[11px] cursor-pointer transition-all border ${
                              riskFeedback[selectedRisk.id] === 'accurate'
                                ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20'
                                : 'bg-white/[0.03] text-gray-500 border-white/[0.06] hover:bg-white/[0.06] hover:text-gray-300'
                            }`}
                            onClick={() => submitFeedback(selectedRisk.id, 'accurate')}
                          >
                            ✓ 准确
                          </button>
                          <button 
                            className={`flex-1 py-1.5 rounded-md text-[11px] cursor-pointer transition-all border ${
                              riskFeedback[selectedRisk.id] === 'inaccurate'
                                ? 'bg-rose-500/15 text-rose-400 border-rose-500/20'
                                : 'bg-white/[0.03] text-gray-500 border-white/[0.06] hover:bg-white/[0.06] hover:text-gray-300'
                            }`}
                            onClick={() => submitFeedback(selectedRisk.id, 'inaccurate')}
                          >
                            ✗ 不准
                          </button>
                        </div>
                      </div>
                    </div>
                  </>
                ) : result ? (
                  <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                    <div className="text-2xl mb-2.5 opacity-40">👈</div>
                    <p className="text-xs text-gray-600">点击左侧风险查看详情</p>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                    <div className="text-2xl mb-2.5 opacity-40">🔍</div>
                    <p className="text-xs text-gray-600">开始分析后查看风险详情</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 添加材料弹窗 */}
      {showAddSource && (
        <div className="fixed inset-0 bg-black/80 grid place-items-center z-[1000] p-5" onClick={() => setShowAddSource(false)}>
          <div className="bg-[#1a1a24] border border-[#2a2a36] rounded-2xl w-full max-w-2xl max-h-[90vh]" onClick={e => e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-[#2a2a36] flex justify-between items-center">
              <h3 className="text-base font-semibold text-white">添加材料</h3>
              <button className="w-8 h-8 bg-none border-none text-[#606070] text-xl cursor-pointer rounded-lg grid place-items-center hover:bg-[#0a0a0f] hover:text-white" onClick={() => setShowAddSource(false)}>×</button>
            </div>
            <div className="p-5">
              <div className="flex gap-1 mb-5 bg-[#0a0a0f] p-1 rounded-xl">
                <button
                  className={`flex-1 px-4 py-2.5 bg-none border-none cursor-pointer font-inherit rounded-lg transition-all hover:text-white ${addSourceTab === 'text' ? 'bg-[#1a1a24] text-white' : 'text-[#a0a0b0]'}`}
                  onClick={() => setAddSourceTab('text')}
                >
                  粘贴文本
                </button>
                <button
                  className={`flex-1 px-4 py-2.5 bg-none border-none cursor-pointer font-inherit rounded-lg transition-all hover:text-white ${addSourceTab === 'file' ? 'bg-[#1a1a24] text-white' : 'text-[#a0a0b0]'}`}
                  onClick={() => setAddSourceTab('file')}
                >
                  上传文件
                </button>
                <button
                  className={`flex-1 px-4 py-2.5 bg-none border-none cursor-pointer font-inherit rounded-lg transition-all hover:text-white ${addSourceTab === 'screenshot' ? 'bg-[#1a1a24] text-white' : 'text-[#a0a0b0]'}`}
                  onClick={() => setAddSourceTab('screenshot')}
                >
                  截图识别
                </button>
                <button
                  className={`flex-1 px-4 py-2.5 bg-none border-none cursor-pointer font-inherit rounded-lg transition-all hover:text-white ${addSourceTab === 'url' ? 'bg-[#1a1a24] text-white' : 'text-[#a0a0b0]'}`}
                  onClick={() => setAddSourceTab('url')}
                >
                  网页链接
                </button>
              </div>

              <div className="mb-4">
                <label className="block text-xs text-[#a0a0b0] mb-2 font-medium">材料类型</label>
                <div className="grid grid-cols-5 gap-2">
                  {['chat', 'doc', 'web', 'contract', 'screenshot'].map(t => (
                    <button
                      key={t}
                      className={`flex flex-col items-center gap-1 px-2 py-3 bg-[#0a0a0f] border rounded-xl text-xs cursor-pointer font-inherit transition-all hover:border-[#606070] hover:text-white ${newSourceType === t ? 'bg-indigo-500/10 border-indigo-500 text-indigo-400' : 'border-[#2a2a36] text-[#a0a0b0]'}`}
                      onClick={() => setNewSourceType(t as SourceType)}
                    >
                      <span className="text-xl">{TYPE_ICONS[t as SourceType]}</span>
                      <span>{TYPE_LABELS[t as SourceType]}</span>
                    </button>
                  ))}
                </div>
              </div>

              {addSourceTab === 'text' && (
                <>
                  <div className="mb-4">
                    <label className="block text-xs text-[#a0a0b0] mb-2 font-medium">材料名称</label>
                    <input
                      type="text"
                      className="w-full px-3.5 py-3 bg-[#0a0a0f] border border-[#2a2a36] rounded-xl text-sm text-white font-inherit transition-all focus:outline-none focus:border-indigo-500 focus:shadow-lg focus:shadow-indigo-500/10"
                      placeholder="如：HR 微信沟通记录"
                      value={newSourceName}
                      onChange={e => setNewSourceName(e.target.value)}
                    />
                  </div>
                  <div className="mb-4">
                    <label className="block text-xs text-[#a0a0b0] mb-2 font-medium">材料内容</label>
                    <textarea
                      className="w-full px-3.5 py-3 bg-[#0a0a0f] border border-[#2a2a36] rounded-xl text-sm text-white font-inherit transition-all focus:outline-none focus:border-indigo-500 focus:shadow-lg focus:shadow-indigo-500/10 resize-y leading-relaxed"
                      placeholder="粘贴聊天记录、文档内容等..."
                      rows={8}
                      value={newSourceContent}
                      onChange={e => setNewSourceContent(e.target.value)}
                    />
                  </div>
                </>
              )}

              {addSourceTab === 'file' && (
                <>
                  <div className="mb-4">
                    <label className="block text-xs text-[#a0a0b0] mb-2 font-medium">材料名称（可选）</label>
                    <input
                      type="text"
                      className="w-full px-3.5 py-3 bg-[#0a0a0f] border border-[#2a2a36] rounded-xl text-sm text-white font-inherit transition-all focus:outline-none focus:border-indigo-500 focus:shadow-lg focus:shadow-indigo-500/10"
                      placeholder="留空则使用文件名"
                      value={newSourceName}
                      onChange={e => setNewSourceName(e.target.value)}
                    />
                  </div>
                  <div className="mb-4">
                    <label className="block text-xs text-[#a0a0b0] mb-2 font-medium">选择文件</label>
                    <div
                      className={`border-2 border-dashed border-[#2a2a36] rounded-xl p-10 text-center transition-all hover:border-indigo-500 hover:bg-indigo-500/5 ${fileDragOver ? 'border-indigo-500 bg-indigo-500/10 scale-[1.02]' : ''}`}
                      onDragOver={e => { e.preventDefault(); setFileDragOver(true) }}
                      onDragLeave={() => setFileDragOver(false)}
                      onDrop={e => {
                        e.preventDefault()
                        setFileDragOver(false)
                        const file = e.dataTransfer.files[0]
                        if (file) addFileSource(file)
                      }}
                    >
                      <input
                        type="file"
                        id="file-upload"
                        onChange={e => e.target.files?.[0] && addFileSource(e.target.files[0])}
                        accept=".txt,.pdf,.doc,.docx,.md"
                        style={{ display: 'none' }}
                      />
                      <label htmlFor="file-upload" className="block cursor-pointer">
                        <div className="text-4xl mb-3">📁</div>
                        <p className="text-sm text-white mb-1">点击选择文件或拖拽到此处</p>
                        <p className="text-xs text-[#606070]">支持 TXT、PDF、Word、Markdown 等格式</p>
                      </label>
                    </div>
                  </div>
                </>
              )}

              {addSourceTab === 'screenshot' && (
                <>
                  <div className="mb-4">
                    <label className="block text-xs text-[#a0a0b0] mb-2 font-medium">截图内容</label>
                    {screenshotPreview ? (
                      <div className="bg-[#0a0a0f] rounded-xl p-4 text-center">
                        <img src={screenshotPreview} alt="截图预览" className="max-w-full max-h-[300px] rounded-lg border border-[#2a2a36]" />
                        <div className="mt-3 text-xs text-indigo-400">{ocrProgress}</div>
                      </div>
                    ) : (
                      <div
                        className={`border-2 border-dashed border-[#2a2a36] rounded-xl p-10 text-center transition-all cursor-default hover:border-indigo-500 hover:bg-indigo-500/5 ${fileDragOver ? 'border-indigo-500 bg-indigo-500/10 scale-[1.02]' : ''}`}
                        onPaste={(e) => {
                          const items = e.clipboardData.items
                          for (const item of items) {
                            if (item.type.startsWith('image/')) {
                              const file = item.getAsFile()
                              if (file) recognizeScreenshot(file)
                              break
                            }
                          }
                        }}
                        onDragOver={e => { e.preventDefault(); setFileDragOver(true) }}
                        onDragLeave={() => setFileDragOver(false)}
                        onDrop={e => {
                          e.preventDefault()
                          setFileDragOver(false)
                          const file = e.dataTransfer.files[0]
                          if (file && file.type.startsWith('image/')) {
                            recognizeScreenshot(file)
                          }
                        }}
                      >
                        <div className="text-5xl mb-3">🖼️</div>
                        <p className="text-sm text-white mb-1">粘贴截图（Ctrl+V）或拖拽图片到这里</p>
                        <p className="text-xs text-[#606070]">支持微信截图、网页截图、手机截图等</p>
                        <input
                          type="file"
                          id="screenshot-upload"
                          accept="image/*"
                          onChange={e => e.target.files?.[0] && recognizeScreenshot(e.target.files[0])}
                          style={{ display: 'none' }}
                        />
                        <label htmlFor="screenshot-upload" className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium cursor-pointer border bg-[#1a1a24] text-white border-[#2a2a36] hover:bg-[#22222e] hover:border-[#606070] mt-3" style={{ marginTop: '12px', cursor: 'pointer' }}>
                          或点击选择图片
                        </label>
                      </div>
                    )}
                  </div>
                </>
              )}

              {addSourceTab === 'url' && (
                <>
                  <div className="mb-4">
                    <label className="block text-xs text-[#a0a0b0] mb-2 font-medium">材料名称（可选）</label>
                    <input
                      type="text"
                      className="w-full px-3.5 py-3 bg-[#0a0a0f] border border-[#2a2a36] rounded-xl text-sm text-white font-inherit transition-all focus:outline-none focus:border-indigo-500 focus:shadow-lg focus:shadow-indigo-500/10"
                      placeholder="留空则使用URL"
                      value={newSourceName}
                      onChange={e => setNewSourceName(e.target.value)}
                    />
                  </div>
                  <div className="mb-4">
                    <label className="block text-xs text-[#a0a0b0] mb-2 font-medium">网页链接</label>
                    <input
                      type="url"
                      className="w-full px-3.5 py-3 bg-[#0a0a0f] border border-[#2a2a36] rounded-xl text-sm text-white font-inherit transition-all focus:outline-none focus:border-indigo-500 focus:shadow-lg focus:shadow-indigo-500/10"
                      placeholder="https://example.com"
                      value={newSourceUrl}
                      onChange={e => setNewSourceUrl(e.target.value)}
                    />
                  </div>
                </>
              )}

              <div className="flex justify-end gap-3 mt-4">
                <button className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium cursor-pointer border bg-[#1a1a24] text-white border-[#2a2a36] hover:bg-[#22222e] hover:border-[#606070]" onClick={() => setShowAddSource(false)}>取消</button>
                {addSourceTab === 'text' && (
                  <button
                    className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium cursor-pointer border-none bg-gradient-to-br from-indigo-500 via-purple-500 to-fuchsia-500 text-white shadow-lg shadow-indigo-500/30 hover:shadow-xl hover:shadow-indigo-500/40 disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={addTextSource}
                    disabled={uploading || !newSourceName || !newSourceContent}
                  >
                    {uploading ? '添加中...' : '添加材料'}
                  </button>
                )}
                {addSourceTab === 'url' && (
                  <button
                    className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium cursor-pointer border-none bg-gradient-to-br from-indigo-500 via-purple-500 to-fuchsia-500 text-white shadow-lg shadow-indigo-500/30 hover:shadow-xl hover:shadow-indigo-500/40 disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={addUrlSource}
                    disabled={uploading || !newSourceUrl}
                  >
                    {uploading ? '添加中...' : '添加材料'}
                  </button>
                )}
                {addSourceTab === 'screenshot' && newSourceContent && (
                  <button
                    className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium cursor-pointer border-none bg-gradient-to-br from-indigo-500 via-purple-500 to-fuchsia-500 text-white shadow-lg shadow-indigo-500/30 hover:shadow-xl hover:shadow-indigo-500/40 disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={addTextSource}
                    disabled={uploading || !newSourceName || !newSourceContent}
                  >
                    添加材料
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      {/* 登录弹窗 */}
      {showLoginModal && (
        <div className="fixed inset-0 z-[1000] bg-black/60 backdrop-blur-sm flex items-center justify-center" onClick={() => setShowLoginModal(false)}>
          <div 
            className="bg-[#14141f] border border-[#2a2a36] rounded-2xl p-8 w-[380px] shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 via-purple-500 to-fuchsia-500 rounded-2xl mx-auto mb-4 grid place-items-center text-2xl font-bold text-white">据</div>
              <h2 className="text-xl font-semibold text-white mb-2">登录 有据</h2>
              <p className="text-sm text-[#a0a0b0]">登录后可保存任务和云端同步</p>
            </div>
            
            <button
              className="w-full flex items-center justify-center gap-3 bg-[#07c160] hover:bg-[#06ad56] text-white py-3.5 rounded-xl font-medium transition-all cursor-pointer border-none mb-4 disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={handleWechatLogin}
              disabled={loggingIn}
            >
              <span className="text-xl">💬</span>
              {loggingIn ? '登录中...' : '微信扫码登录'}
            </button>
            
            <div className="text-center text-xs text-[#666]">
              登录即表示同意用户协议和隐私政策
            </div>
          </div>
        </div>
      )}

      {/* 分享弹窗 */}
      {showShareModal && (
        <div className="fixed inset-0 z-[1000] bg-black/60 backdrop-blur-sm flex items-center justify-center" onClick={() => setShowShareModal(false)}>
          <div 
            className="bg-[#14141f] border border-[#2a2a36] rounded-2xl p-8 w-[480px] shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 via-purple-500 to-fuchsia-500 rounded-2xl mx-auto mb-4 grid place-items-center text-2xl">🔗</div>
              <h2 className="text-xl font-semibold text-white mb-2">分享报告</h2>
              <p className="text-sm text-[#a0a0b0]">将报告分享给相关方查看</p>
            </div>
            
            <div className="mb-6">
              <label className="block text-xs text-[#a0a0b0] mb-2 font-medium">分享链接</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  className="flex-1 px-3.5 py-3 bg-[#0a0a0f] border border-[#2a2a36] rounded-xl text-sm text-white"
                  value={shareLink}
                  readOnly
                  onClick={(e) => (e.target as HTMLInputElement).select()}
                />
                <button
                  className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-medium cursor-pointer border-none bg-gradient-to-br from-indigo-500 via-purple-500 to-fuchsia-500 text-white shadow-lg shadow-indigo-500/30 hover:shadow-xl hover:shadow-indigo-500/40 transition-all"
                  onClick={copyShareLink}
                >
                  复制
                </button>
              </div>
            </div>
            
            <div className="flex items-center gap-2 mb-6 px-4 py-3 bg-[#0a0a0f] rounded-xl border border-[#2a2a36]">
              <span className="text-sm text-[#a0a0b0]">有效期至：</span>
              <span className="text-sm text-white font-medium">{shareExpired}</span>
            </div>
            
            <div className="text-center text-xs text-[#606070] mb-4">
              分享链接有效期为 7 天，过期后自动失效
            </div>
            
            <div className="flex justify-center gap-3">
              <button
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-medium cursor-pointer border bg-[#1a1a24] text-white border-[#2a2a36] hover:bg-[#22222e] transition-all"
                onClick={() => setShowShareModal(false)}
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 全局拖拽提示遮罩 */}
      {globalDragOver && (
        <div className="fixed inset-0 z-[2000] bg-indigo-500/20 backdrop-blur-sm border-4 border-dashed border-indigo-400 pointer-events-none">
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="text-6xl mb-4">📁</div>
            <div className="text-2xl font-semibold text-white">释放文件以添加材料</div>
            <div className="text-sm text-white/70 mt-2">支持 TXT、PDF、Word、图片等多种格式</div>
          </div>
        </div>
      )}

      {/* 分享页面 */}
      {page === 'share' && (
        <main className="pt-16 min-h-screen bg-[#0a0a0f]">
          {/* 分享页头部 */}
          <div className="px-10 py-6 border-b border-[#2a2a36]">
            <div className="flex items-center justify-between max-w-4xl mx-auto">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 via-purple-500 to-fuchsia-500 rounded-xl grid place-items-center text-lg font-bold text-white">据</div>
                <div>
                  <h1 className="text-lg font-semibold text-white">分享的报告</h1>
                  {sharedReport && (
                    <p className="text-xs text-[#606070]">来自「有据」信息对齐分析</p>
                  )}
                </div>
              </div>
              <button
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium cursor-pointer border-none bg-gradient-to-br from-indigo-500 via-purple-500 to-fuchsia-500 text-white shadow-lg shadow-indigo-500/30 hover:shadow-xl hover:shadow-indigo-500/40 transition-all"
                onClick={() => window.location.href = '/'}
              >
                前往有据 →
              </button>
            </div>
          </div>

          {shareError ? (
            <div className="flex flex-col items-center justify-center min-h-[calc(100vh-100px)] p-10">
              <div className="text-6xl mb-4 opacity-50">🔗</div>
              <h2 className="text-xl font-semibold text-white mb-2">无法加载分享</h2>
              <p className="text-sm text-[#a0a0b0] mb-6">{shareError}</p>
              <button
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-medium cursor-pointer border bg-[#1a1a24] text-white border-[#2a2a36] hover:bg-[#22222e] transition-all"
                onClick={() => window.location.href = '/'}
              >
                前往首页
              </button>
            </div>
          ) : sharedReport && result ? (
            <div className="max-w-4xl mx-auto p-6">
              {/* 报告标题 */}
              <div className="mb-6 p-6 bg-[#1a1a24] border border-[#2a2a36] rounded-2xl">
                <h2 className="text-xl font-semibold text-white mb-2">{sharedReport.title}</h2>
                <div className="flex gap-4 text-xs text-[#606070]">
                  <span>创建于 {new Date(sharedReport.createdAt).toLocaleString()}</span>
                  <span>·</span>
                  <span>已被查看 {sharedReport.viewCount} 次</span>
                  {sharedReport.expiresAt && (
                    <>
                      <span>·</span>
                      <span>有效期至 {new Date(sharedReport.expiresAt).toLocaleString()}</span>
                    </>
                  )}
                </div>
              </div>

              {/* 风险摘要 */}
              <div className="mb-6 p-6 bg-[#1a1a24] border border-[#2a2a36] rounded-2xl">
                <h3 className="text-base font-semibold text-white mb-4">风险摘要</h3>
                <div className="flex gap-4">
                  <div className="flex-1 text-center p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
                    <div className="text-2xl font-bold text-red-400">{result.summary.critical}</div>
                    <div className="text-xs text-[#606070] mt-1">严重风险</div>
                  </div>
                  <div className="flex-1 text-center p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                    <div className="text-2xl font-bold text-amber-400">{result.summary.warning}</div>
                    <div className="text-xs text-[#606070] mt-1">待确认</div>
                  </div>
                  <div className="flex-1 text-center p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                    <div className="text-2xl font-bold text-emerald-400">{result.summary.info}</div>
                    <div className="text-xs text-[#606070] mt-1">信息提示</div>
                  </div>
                </div>
              </div>

              {/* 风险列表 */}
              <div className="mb-6 p-6 bg-[#1a1a24] border border-[#2a2a36] rounded-2xl">
                <h3 className="text-base font-semibold text-white mb-4">风险详情</h3>
                <div className="flex flex-col gap-4">
                  {result.risks.map(risk => (
                    <div key={risk.id} className={`p-4 rounded-xl border ${
                      risk.level === 'critical'
                        ? 'bg-red-500/5 border-red-500/20'
                        : risk.level === 'warning'
                          ? 'bg-amber-500/5 border-amber-500/20'
                          : 'bg-emerald-500/5 border-emerald-500/20'
                    }`}>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-lg">
                          {risk.level === 'critical' ? '⚠️' : risk.level === 'warning' ? '⚡' : '✓'}
                        </span>
                        <span className={`text-sm font-medium ${
                          risk.level === 'critical' ? 'text-red-400' : risk.level === 'warning' ? 'text-amber-400' : 'text-emerald-400'
                        }`}>
                          {risk.title}
                        </span>
                      </div>
                      <p className="text-xs text-[#a0a0b0] mb-2">{risk.description}</p>
                      <div className="flex flex-wrap gap-1">
                        {(risk.evidence?.map(e => e.sourceName) || risk.sources).map(s => (
                          <span key={s} className="text-xs px-2 py-0.5 bg-[#0a0a0f] rounded text-[#606070]">{s}</span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 对齐版本 */}
              {result.alignedVersion && (
                <div className="mb-6 p-6 bg-[#1a1a24] border border-[#2a2a36] rounded-2xl">
                  <h3 className="text-base font-semibold text-white mb-4">统一版本参照</h3>
                  <pre className="text-xs text-[#a0a0b0] whitespace-pre-wrap bg-[#0a0a0f] p-4 rounded-xl border border-[#2a2a36]">
                    {result.alignedVersion}
                  </pre>
                </div>
              )}

              {/* 检查清单 */}
              {result.checklist && result.checklist.length > 0 && (
                <div className="mb-6 p-6 bg-[#1a1a24] border border-[#2a2a36] rounded-2xl">
                  <h3 className="text-base font-semibold text-white mb-4">检查清单</h3>
                  <div className="flex flex-col gap-2">
                    {result.checklist.map(item => (
                      <div key={item.id} className="flex items-center gap-3 px-4 py-3 bg-[#0a0a0f] rounded-xl">
                        <div className="w-5 h-5 border-2 border-[#2a2a36] rounded flex items-center justify-center">
                        </div>
                        <span className="text-sm text-white">{item.text}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 底部提示 */}
              <div className="text-center py-8 border-t border-[#2a2a36]">
                <p className="text-sm text-[#606070] mb-4">
                  此报告由「有据」生成 · 有据可依，有据可查
                </p>
                <button
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-medium cursor-pointer border-none bg-gradient-to-br from-indigo-500 via-purple-500 to-fuchsia-500 text-white shadow-lg shadow-indigo-500/30 hover:shadow-xl hover:shadow-indigo-500/40 transition-all"
                  onClick={() => window.location.href = '/'}
                >
                  使用有据分析您自己的材料 →
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center min-h-[calc(100vh-100px)] p-10">
              <div className="w-8 h-8 border-2 border-[#2a2a36] border-t-indigo-500 rounded-full animate-spin mb-4"></div>
              <p className="text-sm text-[#a0a0b0]">正在加载分享内容...</p>
            </div>
          )}
        </main>
      )}
    </div>
  )
}
