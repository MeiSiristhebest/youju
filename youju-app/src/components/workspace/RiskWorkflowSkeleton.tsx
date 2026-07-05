import { Skeleton } from '@/components/ui/skeleton'

export function RiskWorkflowSkeleton() {
  const riskCount = 5

  return (
    <div className="w-64 bg-paper border-r border-rule flex flex-col shrink-0 h-full overflow-hidden">
      <div className="px-4 py-3 border-b border-rule">
        <Skeleton className="h-3 w-20 rounded mb-2" />
        <div className="flex items-center justify-between mb-2">
          <Skeleton className="h-3 w-24 rounded" />
          <Skeleton className="h-3 w-8 rounded" />
        </div>
        <Skeleton className="w-full h-1.5 rounded-full" />
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="divide-y divide-rule">
          {Array.from({ length: riskCount }).map((_, i) => (
            <div key={i} className="px-4 py-3">
              <div className="flex gap-2.5 items-start">
                <Skeleton className="w-5 h-5 rounded-md shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0 space-y-1.5">
                  <Skeleton className={`h-3 rounded ${i % 2 === 0 ? 'w-full' : 'w-5/6'}`} />
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-4 w-12 rounded" />
                    <Skeleton className="h-2.5 w-16 rounded" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="px-4 py-3 border-t border-rule bg-paper/[0.02]">
        <Skeleton className="h-3 w-24 rounded" />
      </div>
    </div>
  )
}
