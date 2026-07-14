import { ArrowDown, ArrowUp, Eye, EyeOff, Plus, Star, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import type { AnalysisDimension, DimensionPriority } from '../../types'
import { Button } from '../ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog'

interface DimensionPanelProps {
  dimensions: AnalysisDimension[]
  onToggleEnabled: (dimensionId: string) => void
  onUpdateWeight: (dimensionId: string, weight: number) => void
  onMoveDimension: (dimensionId: string, direction: 'up' | 'down') => void
  onAddCustomDimension: (name: string, description: string, priority: DimensionPriority) => void
  onRemoveCustomDimension: (dimensionId: string) => void
  onResetWeights: () => void
  showAddDialog: boolean
  onShowAddDialogChange: (show: boolean) => void
}

function StarRating({
  value,
  onChange,
  disabled = false,
}: {
  value: number
  onChange?: (value: number) => void
  disabled?: boolean
}) {
  const [hoverValue, setHoverValue] = useState<number | null>(null)
  const displayValue = hoverValue ?? value

  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={disabled}
          onClick={() => onChange?.(star)}
          onMouseEnter={() => !disabled && setHoverValue(star)}
          onMouseLeave={() => setHoverValue(null)}
          className={cn(
            'p-0.5 transition-colors cursor-pointer',
            disabled ? 'cursor-default opacity-60' : 'hover:scale-110',
          )}
          aria-label={`${star} 星权重`}
        >
          <Star
            size={14}
            className={cn(
              'transition-colors',
              star <= displayValue ? 'text-accent-tertiary fill-accent-tertiary' : 'text-ink-faint',
            )}
          />
        </button>
      ))}
    </div>
  )
}

function DimensionItem({
  dimension,
  isFirst,
  isLast,
  onToggleEnabled,
  onUpdateWeight,
  onMoveDimension,
  onRemove,
}: {
  dimension: AnalysisDimension
  isFirst: boolean
  isLast: boolean
  onToggleEnabled: () => void
  onUpdateWeight: (weight: number) => void
  onMoveDimension: (direction: 'up' | 'down') => void
  onRemove?: () => void
}) {
  return (
    <div
      className={cn(
        'px-4 py-3 border-b border-rule transition-all duration-200',
        !dimension.enabled && 'opacity-60',
      )}
    >
      <div className="flex items-center gap-3">
        <div className="flex flex-col gap-1 shrink-0">
          <button
            type="button"
            onClick={() => onMoveDimension('up')}
            disabled={isFirst}
            className={cn(
              'p-1 rounded text-ink-faint hover:text-ink hover:bg-paper-dark transition-colors cursor-pointer',
              isFirst && 'opacity-30 cursor-not-allowed',
            )}
            title="上移"
          >
            <ArrowUp size={14} strokeWidth={1.5} />
          </button>
          <button
            type="button"
            onClick={() => onMoveDimension('down')}
            disabled={isLast}
            className={cn(
              'p-1 rounded text-ink-faint hover:text-ink hover:bg-paper-dark transition-colors cursor-pointer',
              isLast && 'opacity-30 cursor-not-allowed',
            )}
            title="下移"
          >
            <ArrowDown size={14} strokeWidth={1.5} />
          </button>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-medium text-ink truncate">{dimension.name}</span>
            {dimension.isCustom && (
              <span className="px-1.5 py-0.5 rounded text-[9px] bg-accent-bg text-accent border border-accent/20 shrink-0">
                自定义
              </span>
            )}
            {dimension.riskCount > 0 && (
              <span className="px-1.5 py-0.5 rounded text-[10px] bg-danger-bg/50 text-danger font-mono shrink-0">
                {dimension.riskCount} 个风险
              </span>
            )}
          </div>
          {dimension.description && (
            <p className="text-[11px] text-ink-faint line-clamp-1">{dimension.description}</p>
          )}
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <StarRating
            value={dimension.weight}
            onChange={onUpdateWeight}
            disabled={!dimension.enabled}
          />

          <button
            type="button"
            onClick={onToggleEnabled}
            className={cn(
              'p-1.5 rounded-lg transition-colors cursor-pointer',
              dimension.enabled
                ? 'text-accent hover:bg-accent-bg'
                : 'text-ink-faint hover:text-ink-muted hover:bg-paper-dark',
            )}
            title={dimension.enabled ? '隐藏维度' : '显示维度'}
          >
            {dimension.enabled ? (
              <Eye size={16} strokeWidth={1.5} />
            ) : (
              <EyeOff size={16} strokeWidth={1.5} />
            )}
          </button>

          {dimension.isCustom && (
            <button
              type="button"
              onClick={onRemove}
              className="p-1.5 rounded-lg text-ink-faint hover:text-danger hover:bg-danger-bg/30 transition-colors cursor-pointer"
              title="删除维度"
            >
              <Trash2 size={16} strokeWidth={1.5} />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function AddDimensionDialog({
  open,
  onOpenChange,
  onAdd,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAdd: (name: string, description: string, priority: DimensionPriority) => void
}) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState<DimensionPriority>('medium')

  const handleSubmit = () => {
    if (!name.trim()) return
    onAdd(name.trim(), description.trim(), priority)
    setName('')
    setDescription('')
    setPriority('medium')
    onOpenChange(false)
  }

  const priorityOptions: { value: DimensionPriority; label: string; color: string }[] = [
    { value: 'high', label: '高', color: 'bg-danger-bg text-danger border-danger/30' },
    { value: 'medium', label: '中', color: 'bg-warning-bg text-warning border-warning/30' },
    { value: 'low', label: '低', color: 'bg-success-bg text-success border-success/30' },
  ]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>添加自定义维度</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <label className="block text-xs font-medium text-ink mb-1.5">
              维度名称 <span className="text-danger">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例如：工作环境、团队氛围..."
              className="w-full px-3 py-2 text-sm rounded-lg border border-rule bg-paper text-ink placeholder:text-ink-faint focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-ink mb-1.5">维度描述</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="简要描述这个维度关注什么..."
              rows={2}
              className="w-full px-3 py-2 text-sm rounded-lg border border-rule bg-paper text-ink placeholder:text-ink-faint focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-colors resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-ink mb-2">关注程度</label>
            <div className="flex gap-2">
              {priorityOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setPriority(opt.value)}
                  className={cn(
                    'flex-1 px-3 py-2 rounded-lg text-xs font-medium border transition-all cursor-pointer',
                    priority === opt.value
                      ? `${opt.color} ring-2 ring-offset-1 ring-offset-paper`
                      : 'bg-paper-dark text-ink-muted border-rule hover:border-ink-faint hover:text-ink',
                  )}
                >
                  {opt.label}关注
                </button>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button variant="default" onClick={handleSubmit} disabled={!name.trim()}>
            添加维度
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function DimensionPanel({
  dimensions,
  onToggleEnabled,
  onUpdateWeight,
  onMoveDimension,
  onAddCustomDimension,
  onRemoveCustomDimension,
  onResetWeights,
  showAddDialog,
  onShowAddDialogChange,
}: DimensionPanelProps) {
  const sortedDimensions = [...dimensions].sort((a, b) => a.order - b.order)

  const enabledCount = dimensions.filter((d) => d.enabled).length
  const customCount = dimensions.filter((d) => d.isCustom).length

  return (
    <div className="h-full flex flex-col">
      <div className="px-4 py-3 border-b border-rule bg-paper/[0.02]">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h4 className="text-sm font-semibold text-ink">分析维度管理</h4>
            <p className="text-[11px] text-ink-faint mt-0.5">
              共 {dimensions.length} 个维度，已启用 {enabledCount} 个
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onResetWeights}
              className="px-2.5 py-1.5 text-[11px] text-ink-muted hover:text-ink bg-paper-dark hover:bg-paper-dark/80 rounded-md transition-colors cursor-pointer border border-rule/60"
            >
              重置权重
            </button>
            <button
              type="button"
              onClick={() => onShowAddDialogChange(true)}
              className="px-2.5 py-1.5 text-[11px] text-paper bg-accent hover:bg-accent/90 rounded-md transition-colors cursor-pointer flex items-center gap-1"
            >
              <Plus size={12} strokeWidth={2} />
              添加维度
            </button>
          </div>
        </div>

        <div className="flex items-center gap-4 text-[10px] text-ink-faint">
          <div className="flex items-center gap-1">
            <Star size={10} className="text-accent-tertiary fill-accent-tertiary" />
            <span>权重影响风险排序</span>
          </div>
          <div className="flex items-center gap-1">
            <Eye size={10} />
            <span>控制维度是否显示</span>
          </div>
          {customCount > 0 && (
            <div className="flex items-center gap-1">
              <span className="px-1.5 py-0.5 rounded bg-accent-bg text-accent text-[9px]">
                {customCount} 个自定义
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {sortedDimensions.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center py-16 px-4">
            <div className="w-16 h-16 mb-4 rounded-full bg-paper-dark flex items-center justify-center text-ink-faint border border-rule">
              <Star size={28} strokeWidth={1.5} />
            </div>
            <p className="text-sm font-medium text-ink mb-1">暂无分析维度</p>
            <p className="text-xs text-ink-faint">分析后将自动生成维度，您也可以自定义添加</p>
          </div>
        ) : (
          <div>
            {sortedDimensions.map((dim, index) => (
              <DimensionItem
                key={dim.id}
                dimension={dim}
                isFirst={index === 0}
                isLast={index === sortedDimensions.length - 1}
                onToggleEnabled={() => onToggleEnabled(dim.id)}
                onUpdateWeight={(weight) => onUpdateWeight(dim.id, weight)}
                onMoveDimension={(direction) => onMoveDimension(dim.id, direction)}
                onRemove={dim.isCustom ? () => onRemoveCustomDimension(dim.id) : undefined}
              />
            ))}
          </div>
        )}
      </div>

      <AddDimensionDialog
        open={showAddDialog}
        onOpenChange={onShowAddDialogChange}
        onAdd={onAddCustomDimension}
      />
    </div>
  )
}
