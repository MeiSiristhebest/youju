import type { ElementType, ReactNode } from 'react'
import { useInView } from '../../hooks/useInView'

interface AnimateInProps {
  children: ReactNode
  delay?: number
  duration?: number
  y?: number
  className?: string
  as?: ElementType
}

export function AnimateIn({
  children,
  delay = 0,
  duration = 0.9,
  y = 24,
  className = '',
  as = 'div',
}: AnimateInProps) {
  const { ref, inView } = useInView()
  const Tag = as as any

  return (
    <Tag
      ref={ref}
      className={className}
      style={{
        opacity: inView ? 1 : 0,
        transform: inView ? 'translateY(0)' : `translateY(${y}px)`,
        transition: `opacity ${duration}s cubic-bezier(0.33, 1, 0.68, 1) ${delay}s, transform ${duration}s cubic-bezier(0.33, 1, 0.68, 1) ${delay}s`,
      }}
    >
      {children}
    </Tag>
  )
}
