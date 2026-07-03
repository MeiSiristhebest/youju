import {
  AlertTriangle,
  Calendar,
  Check,
  ChevronDown,
  ChevronLeft,
  Edit3,
  File,
  FileCheck,
  FileText,
  Filter,
  Lightbulb,
  Link,
  Loader2,
  Maximize2,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Target,
  Trash2,
  Users,
  X,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { TYPE_LABELS } from '../../constants/workspace'
import { useTranslation } from '../../i18n'
import { type IntentAnalysisResult, useSourceStore } from '../../stores/useSourceStore'
import type { ScenarioType, Source, SourceStatus, SourceType } from '../../types'

interface SourcePanelProps {
  sources: Source[]
  selectedSource: string | null
  onSelectSource: (id: string | null) => void
  onAddSource: () => void
  currentScenario: ScenarioType | null
  onDeleteSource?: (id: string) => void
  onReparseSource?: (id: string) => void
  onEditSource?: (id: string) => void
  onOpenSourceDetail?: (source: Source) => void
  onCollapse?: () => void
}

const typeIcons: Record<SourceType, ReactNode> = {
  chat: <FileText size={14} strokeWidth={1.5} />,
  doc: <FileText size={14} strokeWidth={1.5} />,
  web: <Link size={14} strokeWidth={1.5} />,
  screenshot: <FileText size={14} strokeWidth={1.5} />,
  contract: <FileText size={14} strokeWidth={1.5} />,
}

const statusConfig: Record<
  SourceStatus,
  { label: string; color: string; bgColor: string; dotColor: string }
> = {
  uploading: {
    label: '上传中',
    color: 'text-info',
    bgColor: 'bg-info-bg/60',
    dotColor: 'bg-info',
  },
  parsing: {
    label: '解析中',
    color: 'text-warning',
    bgColor: 'bg-warning-bg/60',
    dotColor: 'bg-warning',
  },
  ready: {
    label: '已就绪',
    color: 'text-success',
    bgColor: 'bg-success-bg/60',
    dotColor: 'bg-success',
  },
  error: {
    label: '解析失败',
    color: 'text-error',
    bgColor: 'bg-danger-bg/60',
    dotColor: 'bg-error',
  },
}

type SortType = 'newest' | 'oldest' | 'name-asc' | 'type'

const SORT_OPTIONS: { value: SortType; label: string }[] = [
  { value: 'newest', label: '添加时间（新→旧）' },
  { value: 'oldest', label: '添加时间（旧→新）' },
  { value: 'name-asc', label: '名称（A-Z）' },
  { value: 'type', label: '按类型' },
]

const FILTER_TYPES: (SourceType | 'all')[] = ['all', 'chat', 'doc', 'web', 'screenshot', 'contract']

function highlightText(text: string, keyword: string): ReactNode {
  if (!keyword.trim()) return text
  const regex = new RegExp(`(${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
  const parts = text.split(regex)
  return parts.map((part, i) =>
    regex.test(part) ? (
      <mark key={i} className="bg-accent/20 text-accent font-medium rounded px-0.5">
        {part}
      </mark>
    ) : (
      part
    ),
  )
}

function SourceStatusBadge({ status, progress }: { status: SourceStatus; progress?: number }) {
  const config = statusConfig[status]
  const isProcessing = status === 'uploading' || status === 'parsing'

  return (
    <div className="flex items-center gap-1.5">
      {isProcessing ? (
        <Loader2 size={10} className={cn(config.color, 'animate-spin')} strokeWidth={2} />
      ) : status === 'ready' ? (
        <Check size={10} className={config.color} strokeWidth={2.5} />
      ) : (
        <div className={cn('w-2 h-2 rounded-full', config.dotColor)} />
      )}
      <span className={cn('text-[10px] font-medium', config.color)}>{config.label}</span>
      {isProcessing && progress !== undefined && (
        <span className="text-[10px] text-ink-faint font-mono">{progress}%</span>
      )}
    </div>
  )
}

function ProgressBar({ status, progress }: { status: SourceStatus; progress?: number }) {
  const isProcessing = status === 'uploading' || status === 'parsing'
  if (!isProcessing) return null

  const percent = progress ?? 0

  return (
    <div className="w-full h-1 bg-paper-dark rounded-full overflow-hidden mt-1.5">
      <div
        className={cn(
          'h-full rounded-full transition-all duration-500 ease-out',
          status === 'uploading' ? 'bg-info' : 'bg-warning',
        )}
        style={{ width: `${percent}%` }}
      />
    </div>
  )
}

function ParsedSummaryCard({ source }: { source: Source }) {
  const summary = source.parsedSummary
  if (!summary) return null

  return (
    <div className="mt-2 p-2.5 bg-paper-dark/80 rounded-lg border border-rule/60 space-y-2 animate-[fadeIn_0.2s_ease-out]">
      <div className="flex items-center gap-1.5">
        <Sparkles size={11} className="text-accent" strokeWidth={1.5} />
        <span className="text-[10px] font-medium text-accent">AI 解析摘要</span>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-start gap-1.5">
          <File size={10} className="text-ink-faint mt-0.5 shrink-0" strokeWidth={1.5} />
          <div className="text-[10px] text-ink-muted">
            <span className="text-ink-faint">文档类型：</span>
            <span className="text-ink">{summary.docType}</span>
          </div>
        </div>

        {summary.parties.length > 0 && (
          <div className="flex items-start gap-1.5">
            <Users size={10} className="text-ink-faint mt-0.5 shrink-0" strokeWidth={1.5} />
            <div className="text-[10px] text-ink-muted">
              <span className="text-ink-faint">涉及方：</span>
              <span className="text-ink">{summary.parties.join('、')}</span>
            </div>
          </div>
        )}

        {summary.keyDates.length > 0 && (
          <div className="flex items-start gap-1.5">
            <Calendar size={10} className="text-ink-faint mt-0.5 shrink-0" strokeWidth={1.5} />
            <div className="text-[10px] text-ink-muted">
              <span className="text-ink-faint">关键日期：</span>
              <span className="text-ink">{summary.keyDates.join('、')}</span>
            </div>
          </div>
        )}

        <div className="pt-1 border-t border-rule/40">
          <p className="text-[10px] text-ink-muted leading-relaxed">{summary.summary}</p>
        </div>
      </div>
    </div>
  )
}

function SourceItemActions({
  source,
  onDelete,
  onReparse,
  onEdit,
}: {
  source: Source
  onDelete: () => void
  onReparse: () => void
  onEdit: () => void
}) {
  const isProcessing = source.status === 'uploading' || source.status === 'parsing'

  return (
    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
      <button
        type="button"
        className="w-6 h-6 rounded-md flex items-center justify-center text-ink-faint hover:text-ink hover:bg-paper transition-colors"
        onClick={(e) => {
          e.stopPropagation()
          onReparse()
        }}
        disabled={isProcessing}
        title="重新解析"
        aria-label="重新解析"
      >
        <RefreshCw size={12} strokeWidth={1.5} className={cn(isProcessing && 'animate-spin')} />
      </button>
      <button
        type="button"
        className="w-6 h-6 rounded-md flex items-center justify-center text-ink-faint hover:text-ink hover:bg-paper transition-colors"
        onClick={(e) => {
          e.stopPropagation()
          onEdit()
        }}
        title="编辑"
        aria-label="编辑材料"
      >
        <Edit3 size={12} strokeWidth={1.5} />
      </button>
      <button
        type="button"
        className="w-6 h-6 rounded-md flex items-center justify-center text-ink-faint hover:text-error hover:bg-error-bg/30 transition-colors"
        onClick={(e) => {
          e.stopPropagation()
          onDelete()
        }}
        disabled={isProcessing}
        title="删除"
        aria-label="删除材料"
      >
        <Trash2 size={12} strokeWidth={1.5} />
      </button>
    </div>
  )
}

export function SourcePanel({
  sources,
  selectedSource,
  onSelectSource,
  onAddSource,
  currentScenario,
  onDeleteSource,
  onReparseSource,
  onEditSource,
  onOpenSourceDetail,
  onCollapse,
}: SourcePanelProps) {
  const { t } = useTranslation()
  const selectedSourceData = sources.find((s) => s.id === selectedSource)
  const {
    scenarioDescription,
    analyzingIntent,
    intentAnalysis,
    setScenarioDescription,
    setAnalyzingIntent,
    setIntentAnalysis,
    editingSourceId,
    setEditingSourceId,
    updateSource,
  } = useSourceStore()
  const isCustomScenario = currentScenario === 'custom'
  const [descInput, setDescInput] = useState(scenarioDescription)
  const [expandedSourceId, setExpandedSourceId] = useState<string | null>(null)
  const [editingContent, setEditingContent] = useState('')

  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState<SourceType | 'all'>('all')
  const [sortType, setSortType] = useState<SortType>('newest')
  const [showSortDropdown, setShowSortDropdown] = useState(false)
  const sortDropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (sortDropdownRef.current && !sortDropdownRef.current.contains(e.target as Node)) {
        setShowSortDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = { all: sources.length }
    for (const s of sources) {
      counts[s.type] = (counts[s.type] || 0) + 1
    }
    return counts
  }, [sources])

  const filteredAndSortedSources = useMemo(() => {
    let result = [...sources]

    if (filterType !== 'all') {
      result = result.filter((s) => s.type === filterType)
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      result = result.filter(
        (s) => s.name.toLowerCase().includes(query) || s.content.toLowerCase().includes(query),
      )
    }

    switch (sortType) {
      case 'newest':
        result.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
        break
      case 'oldest':
        result.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0))
        break
      case 'name-asc':
        result.sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'))
        break
      case 'type':
        result.sort((a, b) => a.type.localeCompare(b.type))
        break
    }

    return result
  }, [sources, searchQuery, filterType, sortType])

  const hasActiveFilters = searchQuery.trim() !== '' || filterType !== 'all'

  const clearFilters = () => {
    setSearchQuery('')
    setFilterType('all')
  }

  const handleStartEdit = (source: Source) => {
    setEditingSourceId(source.id)
    setEditingContent(source.content)
  }

  const handleSaveEdit = (sourceId: string) => {
    updateSource(sourceId, { content: editingContent })
    setEditingSourceId(null)
    setEditingContent('')
  }

  const handleCancelEdit = () => {
    setEditingSourceId(null)
    setEditingContent('')
  }

  const handleDelete = (sourceId: string) => {
    if (onDeleteSource) {
      onDeleteSource(sourceId)
    }
  }

  const handleReparse = (sourceId: string) => {
    if (onReparseSource) {
      onReparseSource(sourceId)
    }
  }

  const mockIntentAnalysis = async (description: string): Promise<IntentAnalysisResult> => {
    await new Promise((resolve) => setTimeout(resolve, 1500))

    const descLower = description.toLowerCase()

    let scenarioType = '自定义分析'
    let summary = '基于您描述的场景，AI 将从多个维度对材料进行交叉验证，识别潜在的冲突与风险。'
    let keyDimensions = ['关键信息一致性', '承诺兑现情况', '条款完整性', '风险提示']
    let suggestedSources = ['相关合同/协议', '聊天记录', '官方文档', '补充说明材料']
    let riskAreas = ['信息不一致风险', '口头承诺未写入', '关键条款缺失']

    if (descLower.includes('买房') || descLower.includes('购房') || descLower.includes('楼盘')) {
      scenarioType = '购房决策分析'
      summary =
        '您正在进行购房相关的决策分析。AI 将帮您对比不同房源的信息一致性，识别销售承诺与合同条款的差异。'
      keyDimensions = ['价格与优惠', '交付时间', '配套设施', '产权信息', '违约责任', '物业费用']
      suggestedSources = ['购房合同', '销售聊天记录', '楼盘宣传资料', '定金/订金收据', '样板间照片']
      riskAreas = ['口头承诺与合同不一致', '交付时间模糊', '赠送面积无书面约定', '学区承诺未落实']
    } else if (descLower.includes('装修') || descLower.includes('装饰')) {
      scenarioType = '装修合同审核'
      summary = '您正在进行装修相关的材料审核。AI 将帮您对比报价单、合同与口头承诺的一致性。'
      keyDimensions = ['报价明细', '材料品牌型号', '工期', '付款节点', '增项条款', '质保条款']
      suggestedSources = ['装修合同', '报价单', '材料清单', '设计师沟通记录', '样板间/效果图']
      riskAreas = ['低价切入后期增项', '材料品牌模糊', '工期延误责任不清', '付款比例不合理']
    } else if (descLower.includes('保险') || descLower.includes('理赔')) {
      scenarioType = '保险条款分析'
      summary =
        '您正在进行保险相关的分析。AI 将帮您理解保险条款，识别保障范围与免责条款的关键差异。'
      keyDimensions = ['保障范围', '免责条款', '理赔条件', '保费与保额', '续保条款', '等待期']
      suggestedSources = ['保险合同', '销售沟通记录', '产品宣传页', '健康告知记录', '保费收据']
      riskAreas = ['销售误导', '免责条款未告知', '健康告知争议', '理赔条件模糊']
    } else if (
      descLower.includes('合作') ||
      descLower.includes('合伙') ||
      descLower.includes('创业')
    ) {
      scenarioType = '商业合作分析'
      summary =
        '您正在进行商业合作相关的分析。AI 将帮您对比合作协议中的权利义务分配，识别潜在的合作风险。'
      keyDimensions = ['股权/利润分配', '出资义务', '决策机制', '退出机制', '竞业限制', '违约责任']
      suggestedSources = ['合作协议', '股东协议', '公司章程', '沟通记录', '财务预测']
      riskAreas = ['权利义务不对等', '退出机制不清', '决策僵局', '知识产权归属不明']
    } else if (
      descLower.includes('留学') ||
      descLower.includes('申请') ||
      descLower.includes('学校')
    ) {
      scenarioType = '留学申请核对'
      summary = '您正在进行留学申请相关的材料核对。AI 将帮您检查申请要求与准备材料的一致性。'
      keyDimensions = [
        '申请截止日期',
        '材料清单',
        '语言成绩要求',
        'GPA 要求',
        '文书要求',
        '费用信息',
      ]
      suggestedSources = ['学校官网截图', '中介沟通记录', '申请指南', '成绩单', '语言成绩报告']
      riskAreas = ['中介信息与官网不一致', '截止日期记错', '材料清单遗漏', '费用信息不透明']
    }

    return {
      scenarioType,
      summary,
      keyDimensions,
      suggestedSources,
      riskAreas,
    }
  }

  const handleAnalyzeIntent = async () => {
    if (!descInput.trim()) return

    setScenarioDescription(descInput)
    setAnalyzingIntent(true)
    setIntentAnalysis(null)

    try {
      const result = await mockIntentAnalysis(descInput)
      setIntentAnalysis(result)
    } finally {
      setAnalyzingIntent(false)
    }
  }

  return (
    <div
      id="tour-source-panel"
      className="w-full bg-paper border-r border-rule flex flex-col shrink-0 h-full overflow-hidden"
    >
      <div className="px-3.5 py-3 border-b border-rule flex justify-between items-center">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-ink font-medium">
            {t('source.materials')}
          </span>
          <span className="text-[10px] text-ink-faint bg-paper-dark px-2 py-0.5 rounded-full font-mono">
            {sources.length}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {onCollapse && (
            <button
              type="button"
              className="w-7 h-7 rounded-lg flex items-center justify-center text-xs cursor-pointer border border-rule/60 bg-paper-dark/60 text-ink-muted hover:bg-paper-dark hover:text-ink transition-colors duration-200"
              onClick={onCollapse}
              aria-label="折叠面板"
              title="折叠面板"
            >
              <ChevronLeft size={15} strokeWidth={1.5} />
            </button>
          )}
          <button
            type="button"
            className="w-7 h-7 rounded-lg flex items-center justify-center text-xs cursor-pointer border border-rule/60 bg-paper-dark/60 text-ink-muted hover:bg-paper-dark hover:text-ink transition-colors duration-200"
            onClick={onAddSource}
            aria-label={t('source.addMaterial')}
          >
            <Plus size={15} strokeWidth={1.5} />
          </button>
        </div>
      </div>

      {isCustomScenario && (
        <div className="px-3.5 py-3 border-b border-rule bg-paper-dark/30 shrink-0">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles size={14} className="text-accent" strokeWidth={1.5} />
            <span className="text-xs font-medium text-ink">{t('source.describeYourScenario')}</span>
          </div>
          <textarea
            value={descInput}
            onChange={(e) => setDescInput(e.target.value)}
            placeholder={t('source.scenarioPlaceholder')}
            className="w-full h-20 px-3 py-2 text-xs bg-paper border border-rule rounded-lg resize-none text-ink placeholder:text-ink-faint focus:outline-none focus:border-accent/50"
          />
          <button
            type="button"
            onClick={handleAnalyzeIntent}
            disabled={!descInput.trim() || analyzingIntent}
            className={cn(
              'mt-2 w-full py-2 rounded-lg text-xs font-medium cursor-pointer transition-all duration-200 flex items-center justify-center gap-1.5',
              !descInput.trim() || analyzingIntent
                ? 'bg-paper-dark text-ink-faint cursor-not-allowed'
                : 'bg-accent text-paper hover:bg-accent/90',
            )}
          >
            {analyzingIntent ? (
              <>
                <div className="w-3 h-3 border-2 border-paper/30 border-t-paper rounded-full animate-spin" />
                {t('source.aiUnderstanding')}
              </>
            ) : (
              <>
                <Lightbulb size={13} strokeWidth={1.5} />
                {t('source.aiAnalyzeIntent')}
              </>
            )}
          </button>

          {intentAnalysis && (
            <div className="mt-3 space-y-3 animate-[fadeIn_0.3s_ease-out] max-h-60 overflow-y-auto">
              <div className="p-3 bg-accent-bg/50 border border-accent-faint rounded-lg">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Target size={12} className="text-accent" strokeWidth={1.5} />
                  <span className="text-xs font-medium text-accent">
                    {intentAnalysis.scenarioType}
                  </span>
                </div>
                <p className="text-xs text-ink-muted leading-relaxed">{intentAnalysis.summary}</p>
              </div>

              <div>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <FileCheck size={12} className="text-ink-faint" strokeWidth={1.5} />
                  <span className="text-[11px] font-medium text-ink-muted">
                    {t('source.suggestedDimensions')}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {intentAnalysis.keyDimensions.map((dim, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 text-[10px] bg-paper-dark text-ink-muted rounded-full border border-rule/60"
                    >
                      {dim}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <FileText size={12} className="text-ink-faint" strokeWidth={1.5} />
                  <span className="text-[11px] font-medium text-ink-muted">
                    {t('source.suggestedSources')}
                  </span>
                </div>
                <ul className="space-y-1">
                  {intentAnalysis.suggestedSources.map((src, idx) => (
                    <li key={idx} className="text-[11px] text-ink-faint flex items-center gap-1.5">
                      <span className="w-1 h-1 rounded-full bg-ink-faint/50 shrink-0" />
                      {src}
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <AlertTriangle size={12} className="text-warning" strokeWidth={1.5} />
                  <span className="text-[11px] font-medium text-warning">
                    {t('source.potentialRisks')}
                  </span>
                </div>
                <ul className="space-y-1">
                  {intentAnalysis.riskAreas.map((risk, idx) => (
                    <li key={idx} className="text-[11px] text-ink-faint flex items-center gap-1.5">
                      <span className="w-1 h-1 rounded-full bg-warning/60 shrink-0" />
                      {risk}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      )}

      {sources.length > 0 && (
        <div className="px-3.5 py-2.5 border-b border-rule space-y-2.5 shrink-0">
          <div className="relative">
            <Search
              size={14}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-faint"
              strokeWidth={1.5}
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索材料名称或内容..."
              className="w-full pl-8 pr-8 py-2 text-xs bg-paper-dark border border-rule/60 rounded-lg text-ink placeholder:text-ink-faint focus:outline-none focus:border-accent/50 transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center text-ink-faint hover:text-ink-muted transition-colors"
                aria-label="清空搜索"
              >
                <X size={12} strokeWidth={2} />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 flex-1 overflow-x-auto scrollbar-hide">
              {FILTER_TYPES.map((type) => {
                const count = typeCounts[type] || 0
                const isActive = filterType === type
                const label = type === 'all' ? '全部' : TYPE_LABELS[type]
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setFilterType(type)}
                    className={cn(
                      'shrink-0 px-2 py-1 text-[10px] font-medium rounded-md transition-colors duration-200 flex items-center gap-1',
                      isActive
                        ? 'bg-accent/15 text-accent'
                        : 'text-ink-faint hover:text-ink-muted hover:bg-paper-dark',
                    )}
                  >
                    {label}
                    <span
                      className={cn(
                        'text-[9px] font-mono',
                        isActive ? 'text-accent/70' : 'text-ink-faint/60',
                      )}
                    >
                      {count}
                    </span>
                  </button>
                )
              })}
            </div>

            <div className="relative shrink-0" ref={sortDropdownRef}>
              <button
                type="button"
                onClick={() => setShowSortDropdown(!showSortDropdown)}
                className="flex items-center gap-1 px-2 py-1 text-[10px] text-ink-faint hover:text-ink-muted hover:bg-paper-dark rounded-md transition-colors"
                aria-label="排序"
              >
                <Filter size={12} strokeWidth={1.5} />
                <ChevronDown
                  size={10}
                  className={cn(
                    'transition-transform duration-200',
                    showSortDropdown && 'rotate-180',
                  )}
                  strokeWidth={2}
                />
              </button>

              {showSortDropdown && (
                <div className="absolute right-0 top-full mt-1 w-40 bg-paper border border-rule rounded-lg shadow-lg z-10 overflow-hidden animate-[fadeIn_0.15s_ease-out]">
                  {SORT_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => {
                        setSortType(option.value)
                        setShowSortDropdown(false)
                      }}
                      className={cn(
                        'w-full px-3 py-2 text-left text-[11px] transition-colors',
                        sortType === option.value
                          ? 'bg-accent/10 text-accent'
                          : 'text-ink-muted hover:bg-paper-dark hover:text-ink',
                      )}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 min-h-0 overflow-y-auto">
        {sources.length === 0 ? (
          <div className="px-3 py-10 text-center">
            <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-paper-dark flex items-center justify-center text-ink-faint">
              <FileText size={20} strokeWidth={1.5} />
            </div>
            <p className="text-xs text-ink-faint mb-3">{t('source.noMaterials')}</p>
            <button
              type="button"
              className="px-4 py-2 bg-accent-bg border border-accent-faint text-accent rounded-full text-xs font-medium cursor-pointer hover:bg-accent-faint transition-colors duration-200"
              onClick={onAddSource}
            >
              {t('source.addMaterial')}
            </button>
          </div>
        ) : filteredAndSortedSources.length === 0 ? (
          <div className="px-3 py-10 text-center">
            <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-paper-dark flex items-center justify-center text-ink-faint">
              <Search size={20} strokeWidth={1.5} />
            </div>
            <p className="text-xs text-ink-faint mb-1">没有找到匹配的材料</p>
            <p className="text-[10px] text-ink-faint/70 mb-4">试试其他关键词或清除筛选条件</p>
            <button
              type="button"
              className="px-4 py-2 bg-accent-bg border border-accent-faint text-accent rounded-full text-xs font-medium cursor-pointer hover:bg-accent-faint transition-colors duration-200"
              onClick={clearFilters}
            >
              清除筛选
            </button>
          </div>
        ) : (
          <div className="divide-y divide-rule">
            {filteredAndSortedSources.map((s) => {
              const status: SourceStatus = s.status || 'ready'
              const isExpanded = expandedSourceId === s.id

              return (
                <div
                  key={s.id}
                  className={cn(
                    'group px-3 py-2.5 cursor-pointer transition-colors duration-200',
                    selectedSource === s.id ? 'bg-paper-dark' : 'hover:bg-paper-dark/50',
                  )}
                  onClick={() => {
                    onSelectSource(selectedSource === s.id ? null : s.id)
                    if (status === 'ready') {
                      setExpandedSourceId(isExpanded ? null : s.id)
                    }
                  }}
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className={cn(
                        'w-7 h-7 rounded-md flex items-center justify-center shrink-0',
                        selectedSource === s.id
                          ? 'bg-accent text-paper'
                          : 'bg-paper-dark text-ink-muted',
                      )}
                    >
                      {typeIcons[s.type as SourceType]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-xs font-medium text-ink truncate">
                          {highlightText(s.name, searchQuery)}
                        </div>
                        <SourceItemActions
                          source={s}
                          onDelete={() => handleDelete(s.id)}
                          onReparse={() => handleReparse(s.id)}
                          onEdit={() => handleStartEdit(s)}
                        />
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-ink-faint">
                          {TYPE_LABELS[s.type as SourceType]}
                        </span>
                        <span className="text-ink-faint/40">·</span>
                        <SourceStatusBadge status={status} progress={s.progress} />
                      </div>
                      <ProgressBar status={status} progress={s.progress} />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {selectedSourceData && (
        <div
          className="border-t border-rule bg-paper-dark flex flex-col shrink-0"
          style={{ maxHeight: '45vh' }}
        >
          <div className="px-3 py-2.5 flex items-center justify-between border-b border-rule shrink-0">
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-ink truncate">
                {selectedSourceData.name}
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs text-ink-faint">
                  {TYPE_LABELS[selectedSourceData.type as SourceType]}
                </span>
                <span className="text-ink-faint/40">·</span>
                <SourceStatusBadge
                  status={selectedSourceData.status || 'ready'}
                  progress={selectedSourceData.progress}
                />
              </div>
            </div>
            <div className="flex items-center gap-1">
              {onOpenSourceDetail && (
                <button
                  type="button"
                  className="w-6 h-6 rounded-md flex items-center justify-center text-ink-muted bg-paper-dark/60 hover:text-ink hover:bg-paper transition-colors"
                  onClick={() => onOpenSourceDetail(selectedSourceData)}
                  aria-label="放大查看"
                  title="放大查看"
                >
                  <Maximize2 size={12} strokeWidth={1.5} />
                </button>
              )}
              {editingSourceId !== selectedSourceData.id ? (
                <button
                  type="button"
                  className="w-6 h-6 rounded-md flex items-center justify-center text-ink-muted bg-paper-dark/60 hover:text-ink hover:bg-paper transition-colors"
                  onClick={() => handleStartEdit(selectedSourceData)}
                  aria-label="编辑材料"
                  title="编辑"
                >
                  <Edit3 size={12} strokeWidth={1.5} />
                </button>
              ) : (
                <button
                  type="button"
                  className="w-6 h-6 rounded-md flex items-center justify-center text-success bg-paper-dark/60 hover:bg-paper transition-colors"
                  onClick={() => handleSaveEdit(selectedSourceData.id)}
                  aria-label="保存编辑"
                  title="保存"
                >
                  <Check size={12} strokeWidth={2} />
                </button>
              )}
              <button
                type="button"
                className="w-6 h-6 rounded-md flex items-center justify-center text-ink-muted bg-paper-dark/60 hover:text-ink hover:bg-paper transition-colors"
                onClick={() => onSelectSource(null)}
                aria-label="关闭预览"
              >
                <X size={12} strokeWidth={1.5} />
              </button>
            </div>
          </div>

          <div className="flex-1 p-4 overflow-y-auto" style={{ minHeight: 0 }}>
            {editingSourceId === selectedSourceData.id ? (
              <textarea
                value={editingContent}
                onChange={(e) => setEditingContent(e.target.value)}
                className="w-full h-full min-h-[120px] bg-paper border border-rule rounded-lg p-3 text-base text-ink leading-relaxed resize-none focus:outline-none focus:border-accent/50 font-body"
                placeholder="编辑材料内容..."
              />
            ) : (
              <div className="text-base text-ink-muted leading-relaxed whitespace-pre-wrap font-body">
                {selectedSourceData.content}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
