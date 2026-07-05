import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

export function SourcePanelSkeleton() {
  const itemCount = 4

  return (
    <div className="w-full bg-paper flex flex-col shrink-0 h-full overflow-hidden">
      <div className="px-3.5 py-2.5 border-b border-rule flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-16 rounded" />
          <Skeleton className="h-4 w-6 rounded-full" />
        </div>
        <div className="flex items-center gap-1">
          <Skeleton className="w-6 h-6 rounded-md" />
          <Skeleton className="w-6 h-6 rounded-md" />
        </div>
      </div>

      <div className="px-3.5 py-2.5 border-b border-rule space-y-2.5 shrink-0">
        <div className="relative">
          <Skeleton className="w-full h-8 rounded-lg" />
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 flex-1 overflow-x-auto scrollbar-hide">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-5 w-12 rounded-md shrink-0" />
            ))}
          </div>
          <Skeleton className="w-8 h-5 rounded-md shrink-0" />
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="divide-y divide-rule">
          {Array.from({ length: itemCount }).map((_, i) => (
            <div key={i} className="group px-3 py-2.5">
              <div className="flex items-center gap-2.5">
                <Skeleton className="w-7 h-7 rounded-md shrink-0" />
                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <Skeleton
                      className={cn(
                        'h-3 rounded',
                        i % 3 === 0 ? 'w-3/4' : i % 3 === 1 ? 'w-2/3' : 'w-5/6',
                      )}
                    />
                    <Skeleton className="w-16 h-4 rounded" />
                  </div>
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-2.5 w-12 rounded" />
                    <Skeleton className="w-1 h-1 rounded-full bg-paper-dark" />
                    <Skeleton className="h-2.5 w-10 rounded" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
