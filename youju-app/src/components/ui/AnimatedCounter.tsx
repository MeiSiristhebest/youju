import { useGSAP } from '@gsap/react'
import { useRef } from 'react'
import { gsap, ScrollTrigger } from '../../lib/gsap'
import { cn } from '../../lib/utils'

interface AnimatedCounterProps {
  value: number
  duration?: number
  decimals?: number
  prefix?: string
  suffix?: string
  className?: string
  start?: number
  trigger?: boolean
}

export function AnimatedCounter({
  value,
  duration = 2,
  decimals = 0,
  prefix = '',
  suffix = '',
  className,
  start = 0,
  trigger = true,
}: AnimatedCounterProps) {
  const ref = useRef<HTMLSpanElement>(null)
  const counterRef = useRef({ val: start })

  useGSAP(
    () => {
      const el = ref.current
      if (!el) return

      const tween = gsap.to(counterRef.current, {
        val: value,
        duration,
        ease: 'power3.out',
        paused: trigger,
        onUpdate: () => {
          el.textContent = `${prefix}${counterRef.current.val.toFixed(decimals)}${suffix}`
        },
      })

      if (trigger) {
        ScrollTrigger.create({
          trigger: el,
          start: 'top 85%',
          once: true,
          onEnter: () => tween.play(),
        })
      }
    },
    { scope: ref },
  )

  return (
    <span ref={ref} className={cn(className)} aria-label={`${prefix}${value}${suffix}`}>
      {`${prefix}${start.toFixed(decimals)}${suffix}`}
    </span>
  )
}
