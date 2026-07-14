import { Calendar, DollarSign, LayoutGrid, MessageCircle, ScrollText } from 'lucide-react'
import { formatDimensionName } from '../../../lib/utils'
import { useAnalysisStore } from '../../../stores'

interface EntitySectionProps {
  title: string
  icon: React.ReactNode
  iconClassName: string
  items?: Array<{
    value: string
    dimension?: string
    evidence?: { sourceName?: string; sourceType?: string; quote?: string }
  }>
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
          <div
            key={idx}
            className="rounded-lg border border-rule bg-paper/[0.02] p-3 flex flex-col"
          >
            <div className="text-xs text-ink font-medium leading-relaxed break-all flex-1">
              {entity.value}
            </div>
            <div className="mt-2 flex items-center gap-1.5 flex-wrap">
              {entity.dimension && (
                <span className="text-[10px] text-ink-faint bg-paper-dark px-1.5 py-0.5 rounded shrink-0">
                  {formatDimensionName(entity.dimension)}
                </span>
              )}
              {entity.evidence?.sourceName && (
                <span className="text-[10px] text-accent-tertiary bg-accent-bg/20 px-1.5 py-0.5 rounded shrink-0">
                  {entity.evidence.sourceName}
                </span>
              )}
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
        items={entities.dates as any[]}
      />

      <EntitySection
        title="金额"
        icon={<DollarSign size={13} strokeWidth={1.5} />}
        iconClassName="text-success"
        items={entities.amounts as any[]}
      />

      <EntitySection
        title="条款"
        icon={<ScrollText size={13} strokeWidth={1.5} />}
        iconClassName="text-warning"
        items={entities.terms as any[]}
      />

      <EntitySection
        title="承诺"
        icon={<MessageCircle size={13} strokeWidth={1.5} />}
        iconClassName="text-accent-tertiary"
        items={entities.promises as any[]}
      />

      {!hasAnyEntities && (
        <div className="flex flex-col items-center justify-center text-center py-16 px-4">
          <div className="w-16 h-16 mb-4 rounded-full bg-paper-dark flex items-center justify-center text-ink-faint border border-rule">
            <LayoutGrid size={28} strokeWidth={1.5} />
          </div>
          <p className="text-sm font-medium text-ink mb-1">暂无关键要素</p>
          <p className="text-xs text-ink-faint">关键要素将在分析后提取</p>
        </div>
      )}
    </div>
  )
}
