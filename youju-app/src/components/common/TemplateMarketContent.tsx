import { ArrowLeft, ChevronRight, Clock, Search, Sparkles, Star, Tag } from 'lucide-react'
import { useState } from 'react'
import { SCENARIOS } from '../../constants/workspace'
import { cn } from '../../lib/utils'
import type { ScenarioType } from '../../types'

interface TemplateMarketContentProps {
  onApplyTemplate?: (scenarioId: ScenarioType) => void
  onClose?: () => void
}

const CATEGORIES = ['全部', '专业场景', '个人事务']

export function TemplateMarketContent({ onApplyTemplate, onClose }: TemplateMarketContentProps) {
  const [activeCategory, setActiveCategory] = useState('全部')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<'featured' | 'recent' | 'popular'>('featured')

  const filteredScenarios = SCENARIOS.filter((s) => s.id !== 'custom').filter((s) => {
    if (activeCategory !== '全部' && s.category !== activeCategory) return false
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      return s.name.toLowerCase().includes(q) || s.description.toLowerCase().includes(q)
    }
    return true
  })

  const sortedScenarios = [...filteredScenarios].sort((a, b) => {
    if (sortBy === 'featured') {
      if (a.featured && !b.featured) return -1
      if (!a.featured && b.featured) return 1
      return 0
    }
    if (sortBy === 'popular') return b.sourceCount - a.sourceCount
    return 0
  })

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-rule/60">
        <div className="flex items-center gap-3 mb-4">
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium text-ink-muted hover:text-ink hover:bg-paper-dark/50 transition-colors shrink-0"
            >
              <ArrowLeft size={14} strokeWidth={1.5} />
              返回
            </button>
          )}
          <h2 className="text-sm font-medium text-ink">模板市场</h2>
        </div>
        <div className="relative mb-4">
          <Search
            size={14}
            strokeWidth={1.5}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索模板..."
            className="w-full pl-10 pr-4 py-2.5 bg-paper-dark border border-rule/60 rounded-lg text-sm text-ink placeholder:text-ink-faint focus:outline-none focus:border-accent/50"
          />
        </div>
        <div className="flex items-center gap-2 mb-4">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setActiveCategory(cat)}
              className={cn(
                'px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
                activeCategory === cat
                  ? 'bg-paper-dark text-ink border border-rule/60'
                  : 'text-ink-faint hover:text-ink-muted hover:bg-paper-dark/60',
              )}
            >
              {cat}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-ink-faint">排序：</span>
          {(['featured', 'popular', 'recent'] as const).map((sort) => (
            <button
              key={sort}
              type="button"
              onClick={() => setSortBy(sort)}
              className={cn(
                'inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-colors',
                sortBy === sort
                  ? 'text-accent bg-accent-bg'
                  : 'text-ink-faint hover:text-ink-muted',
              )}
            >
              {sort === 'featured' && <Star size={11} />}
              {sort === 'popular' && <Sparkles size={11} />}
              {sort === 'recent' && <Clock size={11} />}
              {sort === 'featured' ? '精选' : sort === 'popular' ? '热门' : '最新'}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col">
        {sortedScenarios.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <Search size={32} strokeWidth={1} className="text-ink-faint mb-3" />
            <p className="text-sm text-ink-faint">没有找到匹配的模板</p>
            <p className="text-xs text-ink-faint/60 mt-1">尝试调整筛选条件或搜索关键词</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {sortedScenarios.map((scenario) => {
              const Icon = scenario.iconComponent
              return (
                <button
                  key={scenario.id}
                  type="button"
                  className="group p-4 bg-paper-dark/40 border border-rule/50 rounded-xl hover:border-accent/40 hover:bg-accent-bg/10 transition-all w-full text-left"
                  onClick={() => {
                    onApplyTemplate?.(scenario.id as ScenarioType)
                    onClose?.()
                  }}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-paper-dark to-paper border border-rule/60 flex items-center justify-center text-ink-muted group-hover:text-accent group-hover:from-accent-bg group-hover:to-accent-bg/50 group-hover:border-accent-faint transition-all shrink-0">
                      <Icon size={18} strokeWidth={1.5} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        <h4 className="text-sm font-medium text-ink truncate">{scenario.name}</h4>
                        {scenario.featured && (
                          <span className="text-xs font-medium text-accent-tertiary bg-accent-tertiary-bg px-2 py-0.5 rounded-full shrink-0">
                            精选
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-ink-faint line-clamp-2 leading-relaxed mb-3">
                        {scenario.description}
                      </p>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center gap-1 text-xs text-ink-faint">
                            <Tag size={11} />
                            {scenario.sourceCount} 份示例材料
                          </span>
                          <span className="text-xs text-ink-faint/60">·</span>
                          <span className="text-xs text-ink-faint">{scenario.category}</span>
                        </div>
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-accent opacity-0 group-hover:opacity-100 transition-opacity">
                          使用模板
                          <ChevronRight size={12} strokeWidth={1.5} />
                        </span>
                      </div>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>

      <div className="px-4 py-3 border-t border-rule/60 bg-paper-dark/30">
        <div className="flex items-center justify-between">
          <div className="text-xs text-ink-faint">共 {sortedScenarios.length} 个模板</div>
          <button
            type="button"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-accent hover:text-accent-tertiary transition-colors"
          >
            <Sparkles size={12} strokeWidth={1.5} />
            提交自定义模板
          </button>
        </div>
      </div>
    </div>
  )
}
