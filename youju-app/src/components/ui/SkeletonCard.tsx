import { cn } from '@/lib/utils'
import { Skeleton } from './skeleton'

interface SkeletonCardProps {
  className?: string
  children?: React.ReactNode
}

export function SkeletonCard({ className, children }: SkeletonCardProps) {
  return (
    <div
      className={cn('rounded-lg border border-rule bg-paper/[0.02] p-3 animate-pulse', className)}
    >
      {children}
    </div>
  )
}

interface SkeletonLineProps {
  className?: string
  width?: string | number
}

export function SkeletonLine({ className, width }: SkeletonLineProps) {
  return (
    <Skeleton
      className={cn('h-3 rounded', className)}
      style={{ width: typeof width === 'number' ? `${width}px` : width }}
    />
  )
}

interface SkeletonTextProps {
  lines?: number
  lastLineWidth?: string | number
  className?: string
}

export function SkeletonText({ lines = 3, lastLineWidth = '60%', className }: SkeletonTextProps) {
  return (
    <div className={cn('space-y-2', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className="h-3 rounded"
          style={{
            width:
              i === lines - 1
                ? typeof lastLineWidth === 'number'
                  ? `${lastLineWidth}px`
                  : lastLineWidth
                : '100%',
          }}
        />
      ))}
    </div>
  )
}
