import { Skeleton } from '@/components/ui/skeleton'

export function ContextPanelSkeleton() {
  const evidenceCount = 2

  return (
    <div className="w-full bg-paper flex flex-col shrink-0 h-full overflow-hidden">
      <div className="px-4 py-3 border-b border-rule">
        <div className="flex items-center justify-between mb-3">
          <Skeleton className="h-3 w-16 rounded" />
          <div className="flex items-center gap-1">
            <Skeleton className="w-6 h-6 rounded-md" />
            <Skeleton className="w-6 h-6 rounded-md" />
            <Skeleton className="w-6 h-6 rounded-md" />
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Skeleton className="h-5 w-16 rounded" />
          <Skeleton className="h-5 w-16 rounded" />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        <div className="space-y-2">
          <div className="flex items-center gap-2 mb-2">
            <Skeleton className="h-5 w-12 rounded-md" />
          </div>
          <Skeleton className="h-4 w-full rounded" />
          <Skeleton className="h-4 w-5/6 rounded" />
          <div className="space-y-1.5 pt-1">
            <Skeleton className="h-3 w-full rounded" />
            <Skeleton className="h-3 w-4/5 rounded" />
            <Skeleton className="h-3 w-3/4 rounded" />
          </div>
        </div>

        <div className="space-y-2 pt-2">
          <div className="flex items-center justify-between">
            <Skeleton className="h-2.5 w-8 rounded" />
            <Skeleton className="h-2.5 w-16 rounded" />
          </div>
          <div className="flex items-center justify-between">
            <Skeleton className="h-2.5 w-8 rounded" />
            <Skeleton className="h-2.5 w-12 rounded" />
          </div>
          <div className="flex items-center justify-between">
            <Skeleton className="h-2.5 w-16 rounded" />
            <Skeleton className="h-2.5 w-8 rounded" />
          </div>
          <div className="pt-1.5 border-t border-rule/50 space-y-1.5">
            <div className="flex items-center justify-between">
              <Skeleton className="h-2.5 w-12 rounded" />
              <Skeleton className="h-2.5 w-8 rounded" />
            </div>
            <Skeleton className="w-full h-2 rounded-full" />
          </div>
        </div>

        <div className="space-y-2.5">
          <Skeleton className="h-3.5 w-24 rounded" />
          <div className="space-y-2.5">
            {Array.from({ length: evidenceCount }).map((_, i) => (
              <div key={i} className="rounded-lg border border-rule bg-paper/[0.02] p-2.5">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Skeleton className="w-3 h-3 rounded shrink-0" />
                    <Skeleton className="h-2.5 w-20 rounded" />
                  </div>
                  <Skeleton className="h-4 w-8 rounded" />
                </div>
                <div className="pl-2 border-l-2 border-accent/40 space-y-1">
                  <Skeleton className="h-2.5 w-full rounded" />
                  <Skeleton className="h-2.5 w-5/6 rounded" />
                  <Skeleton className="h-2.5 w-2/3 rounded" />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-2.5">
          <Skeleton className="h-3.5 w-20 rounded" />
          <div className="space-y-1.5">
            <Skeleton className="w-full h-8 rounded-md" />
            <Skeleton className="w-full h-8 rounded-md" />
          </div>
        </div>

        <div className="space-y-2.5">
          <Skeleton className="h-3.5 w-12 rounded" />
          <div className="flex gap-2">
            <Skeleton className="flex-1 h-7 rounded-md" />
            <Skeleton className="flex-1 h-7 rounded-md" />
          </div>
        </div>

        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <Skeleton className="h-3.5 w-12 rounded" />
            <Skeleton className="h-2 w-16 rounded" />
          </div>
          <Skeleton className="w-full h-28 rounded-md" />
        </div>
      </div>
    </div>
  )
}
