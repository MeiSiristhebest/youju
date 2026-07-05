import { ChevronRight, Clock, LayoutGrid, Search, Sparkles, Star, Tag, X } from 'lucide-react'
import { useState } from 'react'
import { SCENARIOS } from '../../constants/workspace'
import { cn } from '../../lib/utils'
import type { ScenarioType } from '../../types'

interface TemplateMarketProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  onApplyTemplate?: (scenarioId: ScenarioType) => void
}

const CATEGORIES = ['全部', '专业场景', '个人事务']

export function TemplateMarket({ isOpen, onOpenChange, onApplyTemplate }: TemplateMarketProps) {
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

  if (!isOpen) return null

  return (
    <div className="h-full flex flex-col bg-paper border-l border-rule">
      <div className="flex items-center justify-between px-4 py-3 border-b border-rule">
        <div className="flex items-center gap-2">
          <LayoutGrid size={14} strokeWidth={1.5} className="text-ink" />
          <span className="text-sm font-medium text-ink">模板市场</span>
        </div>
        <button
          type="button"
          onClick={() => onOpenChange(false)}
          className="p-1 rounded-md text-ink-faint hover:text-ink hover:bg-paper-dark transition-colors"
        >
          <X size={14} strokeWidth={1.5} />
        </button>
      </div>

      <div className="p-3 border-b border-rule/60">
        <div className="relative mb-3">
          <Search
            size={13}
            strokeWidth={1.5}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-faint"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索模板..."
            className="w-full pl-8 pr-3 py-2 bg-paper-dark border border-rule/60 rounded-md text-xs text-ink placeholder:text-ink-faint focus:outline-none focus:border-accent/50"
          />
        </div>
        <div className="flex items-center gap-1 mb-3">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setActiveCategory(cat)}
              className={cn(
                'px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors',
                activeCategory === cat
                  ? 'bg-paper-dark text-ink border border-rule/60'
                  : 'text-ink-faint hover:text-ink-muted hover:bg-paper-dark/60',
              )}
            >
              {cat}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1">
          <span className="text-[10px] text-ink-faint mr-1">排序：</span>
          {(['featured', 'popular', 'recent'] as const).map((sort) => (
            <button
              key={sort}
              type="button"
              onClick={() => setSortBy(sort)}
              className={cn(
                'inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium transition-colors',
                sortBy === sort
                  ? 'text-accent bg-accent-bg'
                  : 'text-ink-faint hover:text-ink-muted',
              )}
            >
              {sort === 'featured' && <Star size={9} />}
              {sort === 'popular' && <Sparkles size={9} />}
              {sort === 'recent' && <Clock size={9} />}
              {sort === 'featured' ? '精选' : sort === 'popular' ? '热门' : '最新'}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {sortedScenarios.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Search size={28} strokeWidth={1} className="text-ink-faint mb-2" />
            <p className="text-xs text-ink-faint">没有找到匹配的模板</p>
          </div>
        ) : (
          <div className="space-y-2">
            {sortedScenarios.map((scenario) => {
              const Icon = scenario.iconComponent
              return (
                <div
                  key={scenario.id}
                  className="group p-3 bg-paper-dark/40 border border-rule/50 rounded-xl hover:border-accent/40 hover:bg-accent-bg/10 transition-all cursor-pointer"
                  onClick={() => {
                    onApplyTemplate?.(scenario.id as ScenarioType)
                    onOpenChange(false)
                  }}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-paper-dark to-paper border border-rule/60 flex items-center justify-center text-ink-muted group-hover:text-accent group-hover:from-accent-bg group-hover:to-accent-bg/50 group-hover:border-accent-faint transition-all shrink-0">
                      <Icon size={16} strokeWidth={1.5} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-1">
                        <h4 className="text-xs font-medium text-ink truncate">{scenario.name}</h4>
                        {scenario.featured && (
                          <span className="text-[9px] font-medium text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full shrink-0">
                            精选
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-ink-faint line-clamp-2 leading-relaxed mb-2">
                        {scenario.description}
                      </p>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center gap-1 text-[9px] text-ink-faint">
                            <Tag size={9} />
                            {scenario.sourceCount} 份示例材料
                          </span>
                          <span className="text-[9px] text-ink-faint/60">·</span>
                          <span className="text-[9px] text-ink-faint">{scenario.category}</span>
                        </div>
                        <button
                          type="button"
                          className="inline-flex items-center gap-0.5 text-[10px] font-medium text-accent opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          使用模板
                          <ChevronRight size={10} strokeWidth={1.5} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div className="px-4 py-3 border-t border-rule/60 bg-paper-dark/30">
        <div className="flex items-center justify-between">
          <div className="text-[10px] text-ink-faint">共 {sortedScenarios.length} 个模板</div>
          <button
            type="button"
            className="inline-flex items-center gap-1 text-[10px] font-medium text-accent hover:text-accent-tertiary transition-colors"
          >
            <Sparkles size={10} strokeWidth={1.5} />
            提交自定义模板
          </button>
        </div>
      </div>
    </div>
  )
}
