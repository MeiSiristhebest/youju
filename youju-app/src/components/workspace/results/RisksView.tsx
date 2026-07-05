import { useUIPreferenceStore } from '../../../stores/useUIPreferenceStore'
import { RiskGroupedView } from './RiskGroupedView'
import { RiskKanbanView } from './RiskKanbanView'
import { RiskListView } from './RiskListView'
import { RiskTree } from './RiskTree'
import { RiskViewSwitcher } from './RiskViewSwitcher'

interface RisksViewProps {
  onEvidenceClick?: (sourceId: string, quote: string) => void
}

export function RisksView({ onEvidenceClick }: RisksViewProps) {
  const riskView = useUIPreferenceStore((state) => state.riskView)

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="px-4 py-2 border-b border-rule bg-paper/[0.02] flex items-center justify-end shrink-0">
        <RiskViewSwitcher />
      </div>
      <div key={riskView} className="flex-1 overflow-hidden animate-[fadeIn_0.2s_ease-out]">
        {riskView === 'tree' && <RiskTree onEvidenceClick={onEvidenceClick} />}
        {riskView === 'list' && <RiskListView onEvidenceClick={onEvidenceClick} />}
        {riskView === 'kanban' && <RiskKanbanView onEvidenceClick={onEvidenceClick} />}
        {riskView === 'grouped' && <RiskGroupedView onEvidenceClick={onEvidenceClick} />}
      </div>
    </div>
  )
}
