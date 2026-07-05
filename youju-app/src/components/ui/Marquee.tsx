import type { ReactNode } from 'react'
import { cn } from '../../lib/utils'

interface MarqueeProps {
  children?: ReactNode
  direction?: 'left' | 'right'
  speed?: number // 滚动一圈秒数，默认 30s
  pauseOnHover?: boolean
  className?: string
  separator?: ReactNode // 项目之间的分隔符，默认 ·
  items?: string[] // 简化用法：传入字符串数组
}

export function Marquee({
  children,
  direction = 'left',
  speed = 30,
  pauseOnHover = true,
  className,
  separator = <span className="text-accent/40 mx-6">·</span>,
  items,
}: MarqueeProps) {
  const content = items
    ? items.map((item, i) => (
        <span key={`${item}-${i}`} className="inline-flex items-center">
          <span>{item}</span>
          {separator}
        </span>
      ))
    : children

  return (
    <div
      className={cn(
        'group relative flex w-full overflow-hidden',
        pauseOnHover && '[&:hover_>div]:[animation-play-state:paused]',
        className,
      )}
      aria-hidden="true"
    >
      <div
        className="flex shrink-0 items-center justify-around whitespace-nowrap"
        style={{
          animation: `marquee-${direction} ${speed}s linear infinite`,
        }}
      >
        {content}
      </div>
      <div
        className="flex shrink-0 items-center justify-around whitespace-nowrap"
        style={{
          animation: `marquee-${direction} ${speed}s linear infinite`,
        }}
        aria-hidden="true"
      >
        {content}
      </div>
    </div>
  )
}
