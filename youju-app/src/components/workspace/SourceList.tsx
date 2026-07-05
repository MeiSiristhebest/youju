import { useGSAP } from '@gsap/react'
import {
  Check,
  ChevronDown,
  Edit3,
  FileText,
  Filter,
  Link,
  Loader2,
  RefreshCw,
  Search,
  Trash2,
  X,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { TYPE_LABELS } from '../../constants/workspace'
import { gsap } from '../../lib/gsap'
import type { Source, SourceStatus, SourceType } from '../../types'
import { SourceEmptyState } from './SourceEmptyState'

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
    color: 'text-danger',
    bgColor: 'bg-danger-bg/60',
    dotColor: 'bg-danger',
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
        className="w-6 h-6 rounded-md flex items-center justify-center text-ink-faint hover:text-danger hover:bg-danger-bg/30 transition-colors"
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

export interface SourceListProps {
  sources: Source[]
  selectedSource: string | null
  onSelectSource: (id: string | null) => void
  onDeleteSource: (id: string) => void
  onReparseSource: (id: string) => void
  onEditSource: (source: Source) => void
}

export function SourceList({
  sources,
  selectedSource,
  onSelectSource,
  onDeleteSource,
  onReparseSource,
  onEditSource,
}: SourceListProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState<SourceType | 'all'>('all')
  const [sortType, setSortType] = useState<SortType>('newest')
  const [showSortDropdown, setShowSortDropdown] = useState(false)
  const sortDropdownRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const hasAnimated = useRef(false)
  const [expandedSourceId, setExpandedSourceId] = useState<string | null>(null)

  useGSAP(
    () => {
      const isMobile = window.matchMedia('(max-width: 768px)').matches
      if (isMobile || hasAnimated.current || sources.length === 0) return

      hasAnimated.current = true

      gsap.from('[data-source-item]', {
        y: 12,
        opacity: 0,
        stagger: 0.05,
        duration: 0.4,
        ease: 'power3.out',
        delay: 0.3,
      })
    },
    { scope: listRef, dependencies: [sources.length] },
  )

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

    const getTime = (v: string | number | undefined): number => {
      if (!v) return 0
      if (typeof v === 'number') return v
      return new Date(v).getTime()
    }

    switch (sortType) {
      case 'newest':
        result.sort((a, b) => getTime(b.createdAt) - getTime(a.createdAt))
        break
      case 'oldest':
        result.sort((a, b) => getTime(a.createdAt) - getTime(b.createdAt))
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

  const _hasActiveFilters = searchQuery.trim() !== '' || filterType !== 'all'

  const clearFilters = () => {
    setSearchQuery('')
    setFilterType('all')
  }

  if (sources.length === 0) return null

  return (
    <>
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

      <div ref={listRef} className="flex-1 min-h-0 overflow-y-auto">
        {filteredAndSortedSources.length === 0 ? (
          <SourceEmptyState onClearFilters={clearFilters} />
        ) : (
          <div className="divide-y divide-rule">
            {filteredAndSortedSources.map((s) => {
              const status: SourceStatus = s.status || 'ready'
              const isExpanded = expandedSourceId === s.id

              return (
                <div
                  key={s.id}
                  data-source-item
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
                          onDelete={() => onDeleteSource(s.id)}
                          onReparse={() => onReparseSource(s.id)}
                          onEdit={() => onEditSource(s)}
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
    </>
  )
}
