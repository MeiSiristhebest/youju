import { CheckSquare, Square } from 'lucide-react'
import { cn, formatDimensionName } from '@/lib/utils'
import { useAnalysisStore } from '../../../stores'

export function CheckListArea() {
  const checklist = useAnalysisStore((state) => state.checklist)
  const toggleCheckItem = useAnalysisStore((state) => state.toggleCheckItem)

  const checkedCount = checklist.filter((item) => item.checked).length
  const totalCount = checklist.length
  const progressPercent = totalCount > 0 ? (checkedCount / totalCount) * 100 : 0

  return (
    <div>
      <div className="px-4 py-3 border-b border-rule bg-paper/[0.02]">
        <div className="flex items-center justify-between">
          <span className="text-xs text-ink-muted">
            已完成 <span className="text-ink font-medium">{checkedCount}</span> / 共 {totalCount} 项
          </span>
          <div className="w-24 h-1.5 bg-paper-dark rounded-full overflow-hidden">
            <div
              className="h-full bg-accent rounded-full transition-[width] duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>
      <div className="divide-y divide-rule">
        {totalCount === 0 ? (
          <div className="flex flex-col items-center justify-center text-center py-16 px-4">
            <div className="w-16 h-16 mb-4 rounded-full bg-paper-dark flex items-center justify-center text-ink-faint border border-rule">
              <CheckSquare size={28} strokeWidth={1.5} />
            </div>
            <p className="text-sm font-medium text-ink mb-1">暂无检查项</p>
            <p className="text-xs text-ink-faint">检查清单将在分析后生成</p>
          </div>
        ) : (
          checklist.map((item) => (
            <div
              key={item.id}
              className={cn(
                'px-4 py-3 flex items-start gap-3 transition-all duration-200',
                item.checked ? 'opacity-60' : '',
              )}
            >
              <button
                type="button"
                onClick={() => toggleCheckItem(item.id)}
                className={cn(
                  'shrink-0 mt-0.5 cursor-pointer transition-colors duration-200 bg-transparent border-none p-0',
                  item.checked ? 'text-accent' : 'text-ink-faint hover:text-ink-muted',
                )}
              >
                {item.checked ? (
                  <CheckSquare size={18} strokeWidth={1.5} />
                ) : (
                  <Square size={18} strokeWidth={1.5} />
                )}
              </button>
              <div className="flex-1 min-w-0">
                <div
                  className={cn(
                    'text-xs leading-relaxed mb-1.5',
                    item.checked ? 'line-through text-ink-faint' : 'text-ink',
                  )}
                >
                  {item.text}
                </div>
                {/* ChecklistItem 不再包含 riskType 和 dimension 字段 */}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
