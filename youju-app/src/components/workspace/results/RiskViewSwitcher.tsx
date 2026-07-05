import { Layers, LayoutGrid, List, TreePine } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { RiskViewType } from '@/stores/useUIPreferenceStore'
import { useUIPreferenceStore } from '@/stores/useUIPreferenceStore'

const viewOptions: Array<{ id: RiskViewType; label: string; icon: React.ReactNode }> = [
  { id: 'tree', label: '树状视图', icon: <TreePine size={14} strokeWidth={1.5} /> },
  { id: 'list', label: '列表视图', icon: <List size={14} strokeWidth={1.5} /> },
  { id: 'kanban', label: '看板视图', icon: <LayoutGrid size={14} strokeWidth={1.5} /> },
  { id: 'grouped', label: '分组视图', icon: <Layers size={14} strokeWidth={1.5} /> },
]

export function RiskViewSwitcher() {
  const riskView = useUIPreferenceStore((state) => state.riskView)
  const setRiskView = useUIPreferenceStore((state) => state.setRiskView)

  return (
    <div className="flex items-center gap-0.5 p-0.5 rounded-md bg-paper-dark/50 border border-rule/60">
      {viewOptions.map((view) => (
        <button
          key={view.id}
          type="button"
          onClick={() => setRiskView(view.id)}
          title={view.label}
          className={cn(
            'p-1.5 rounded text-ink-faint hover:text-ink hover:bg-paper-dark transition-all duration-200 cursor-pointer border-none',
            riskView === view.id && 'bg-paper text-ink shadow-sm',
          )}
        >
          {view.icon}
        </button>
      ))}
    </div>
  )
}
