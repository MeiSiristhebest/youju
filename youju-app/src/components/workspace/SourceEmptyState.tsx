import { Search } from 'lucide-react'

export interface SourceEmptyStateProps {
  onClearFilters: () => void
}

export function SourceEmptyState({ onClearFilters }: SourceEmptyStateProps) {
  return (
    <div className="h-full flex flex-col items-center justify-center text-center px-3">
      <div className="w-12 h-12 mb-4 rounded-full bg-paper-dark flex items-center justify-center text-ink-faint">
        <Search size={20} strokeWidth={1.5} />
      </div>
      <p className="text-xs text-ink-faint mb-1">没有找到匹配的材料</p>
      <p className="text-[10px] text-ink-faint/70 mb-4">试试其他关键词或清除筛选条件</p>
      <button
        type="button"
        className="px-4 py-2 bg-accent-bg border border-accent-faint text-accent rounded-full text-xs font-medium cursor-pointer hover:bg-accent-faint transition-colors duration-200"
        onClick={onClearFilters}
      >
        清除筛选
      </button>
    </div>
  )
}
