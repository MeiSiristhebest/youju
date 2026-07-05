import { Calendar, DollarSign, LayoutGrid, MessageCircle, ScrollText } from 'lucide-react'
import { useAnalysisStore } from '../../../stores'

interface EntitySectionProps {
  title: string
  icon: React.ReactNode
  iconClassName: string
  items?: { value: string; source: string }[]
}

function EntitySection({ title, icon, iconClassName, items }: EntitySectionProps) {
  if (!items || items.length === 0) return null

  return (
    <div>
      <h4 className="text-xs font-semibold text-ink mb-3 flex items-center gap-1.5">
        <span className={iconClassName}>{icon}</span>
        {title}
      </h4>
      <div className="grid grid-cols-2 gap-2">
        {items.map((entity, idx) => (
          <div key={idx} className="rounded-lg border border-rule bg-paper/[0.02] p-3">
            <div className="relative">
              <span className="text-[10px] text-ink-faint font-mono absolute top-0 right-0">
                {entity.source}
              </span>
              <div className="text-xs text-ink font-medium pr-12">{entity.value}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function EntitiesView() {
  const result = useAnalysisStore((state) => state.result)
  const entities = result?.extractedEntities

  if (!entities) return null

  const hasAnyEntities =
    (entities.dates && entities.dates.length > 0) ||
    (entities.amounts && entities.amounts.length > 0) ||
    (entities.terms && entities.terms.length > 0) ||
    (entities.promises && entities.promises.length > 0)

  return (
    <div className="p-4 space-y-5">
      <EntitySection
        title="日期"
        icon={<Calendar size={13} strokeWidth={1.5} />}
        iconClassName="text-accent"
        items={entities.dates}
      />

      <EntitySection
        title="金额"
        icon={<DollarSign size={13} strokeWidth={1.5} />}
        iconClassName="text-success"
        items={entities.amounts}
      />

      <EntitySection
        title="条款"
        icon={<ScrollText size={13} strokeWidth={1.5} />}
        iconClassName="text-warning"
        items={entities.terms}
      />

      <EntitySection
        title="承诺"
        icon={<MessageCircle size={13} strokeWidth={1.5} />}
        iconClassName="text-accent-tertiary"
        items={entities.promises}
      />

      {!hasAnyEntities && (
        <div className="text-center py-16 px-4">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-paper-dark flex items-center justify-center text-ink-faint border border-rule">
            <LayoutGrid size={28} strokeWidth={1.5} />
          </div>
          <p className="text-sm font-medium text-ink mb-1">暂无关键要素</p>
          <p className="text-xs text-ink-faint">关键要素将在分析后提取</p>
        </div>
      )}
    </div>
  )
}
