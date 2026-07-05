import { useGSAP } from '@gsap/react'
import { useRef } from 'react'
import { gsap, ScrollTrigger } from '../../lib/gsap'
import { cn } from '../../lib/utils'

type SplitVariant = 'fadeUp' | 'reveal' | 'blurIn'

interface SplitTextProps {
  text: string
  as?: 'h1' | 'h2' | 'h3' | 'p' | 'span' | 'div'
  className?: string
  delay?: number
  stagger?: number
  variant?: SplitVariant
  trigger?: boolean // 是否需要 ScrollTrigger 触发，默认 true
}

// 判断是否支持 Intl.Segmenter
const supportsSegmenter = typeof Intl !== 'undefined' && 'Segmenter' in Intl

// 拆分文本为段（中文按字、英文按词）
function segmentText(text: string): string[] {
  if (supportsSegmenter) {
    try {
      const segmenter = new Intl.Segmenter('zh', { granularity: 'grapheme' })
      return Array.from(segmenter.segment(text)).map((s) => s.segment)
    } catch {
      // fallback
    }
  }
  // fallback：按字符拆分
  return Array.from(text)
}

const variantProps: Record<SplitVariant, { from: gsap.TweenVars; to: gsap.TweenVars }> = {
  fadeUp: {
    from: { y: 60, opacity: 0 },
    to: { y: 0, opacity: 1 },
  },
  reveal: {
    from: { y: '110%', opacity: 0 },
    to: { y: '0%', opacity: 1 },
  },
  blurIn: {
    from: { y: 30, opacity: 0, filter: 'blur(12px)' },
    to: { y: 0, opacity: 1, filter: 'blur(0px)' },
  },
}

export function SplitText({
  text,
  as: Tag = 'div',
  className,
  delay = 0,
  stagger = 0.04,
  variant = 'fadeUp',
  trigger = true,
}: SplitTextProps) {
  const containerRef = useRef<HTMLElement>(null)
  const segments = segmentText(text)

  useGSAP(
    () => {
      const chars = gsap.utils.toArray<HTMLElement>(
        containerRef.current?.querySelectorAll('[data-split-char]') ?? [],
      )
      if (chars.length === 0) return

      const props = variantProps[variant]
      gsap.set(chars, props.from)

      const tween = gsap.to(chars, {
        ...props.to,
        delay,
        stagger,
        ease: 'power3.out',
        duration: 0.8,
      })

      if (trigger && containerRef.current) {
        ScrollTrigger.create({
          trigger: containerRef.current,
          start: 'top 85%',
          once: true,
          animation: tween,
        })
      }
    },
    { scope: containerRef },
  )

  return (
    <Tag ref={containerRef as any} className={cn(className)} aria-label={text}>
      {segments.map((seg, i) => (
        <span
          key={`${seg}-${i}`}
          data-split-char
          aria-hidden="true"
          style={{
            display: 'inline-block',
            willChange: 'transform, opacity, filter',
            whiteSpace: seg === ' ' ? 'pre' : 'normal',
          }}
        >
          {seg}
        </span>
      ))}
    </Tag>
  )
}
