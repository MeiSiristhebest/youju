import { Skeleton } from '@/components/ui/skeleton'

export function ResultPanelSkeleton() {
  const tabCount = 5
  const _treeItemCount = 6

  return (
    <div className="flex-1 flex flex-col h-full bg-paper border-l border-rule relative">
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex border-b border-rule bg-paper-dark/30 shrink-0 overflow-x-auto px-2">
          {Array.from({ length: tabCount }).map((_, i) => (
            <div key={i} className="px-4 py-3.5">
              <Skeleton className="h-3 w-16 rounded" />
            </div>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="space-y-3">
            <Skeleton className="h-4 w-32 rounded" />

            <div className="space-y-2 pl-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Skeleton className="w-4 h-4 rounded-md" />
                    <Skeleton
                      className={`h-3 rounded ${i === 0 ? 'w-2/3' : i === 1 ? 'w-3/4' : 'w-1/2'}`}
                    />
                    <Skeleton className="h-4 w-10 rounded ml-auto" />
                  </div>

                  {i < 2 && (
                    <div className="pl-6 space-y-1.5">
                      {Array.from({ length: 2 + (i % 2) }).map((_, j) => (
                        <div
                          key={j}
                          className="flex items-center gap-2 py-1.5 px-2 rounded-md bg-paper-dark/30"
                        >
                          <Skeleton className="w-3 h-3 rounded" />
                          <Skeleton
                            className={
                              'h-2.5 rounded flex-1 ' +
                              (j % 2 === 0 ? 'max-w-[80%]' : 'max-w-[60%]')
                            }
                          />
                          <Skeleton className="h-4 w-8 rounded shrink-0" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <Skeleton className="h-4 w-28 rounded" />
            <div className="grid grid-cols-2 gap-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="rounded-lg border border-rule bg-paper/[0.02] p-3">
                  <div className="relative">
                    <Skeleton className="h-2.5 w-12 rounded absolute top-0 right-0" />
                    <Skeleton className="h-3 w-20 rounded pr-12" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
