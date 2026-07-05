import { useGSAP } from '@gsap/react'
import { useRef, useState } from 'react'
import { gsap } from '../../lib/gsap'

interface ScrollProgressProps {
  scroller?: HTMLElement | null
  className?: string
}

export function ScrollProgress({ scroller, className = '' }: ScrollProgressProps) {
  const barRef = useRef<HTMLDivElement>(null)
  const [scrollable, setScrollable] = useState(false)

  useGSAP(
    () => {
      const bar = barRef.current
      if (!bar) return

      gsap.set(bar, { scaleX: 0, transformOrigin: 'left center' })

      const scaleXTo = gsap.quickTo(bar, 'scaleX', {
        duration: 0.1,
        ease: 'power1.out',
      })

      const updateScrollable = () => {
        if (scroller) {
          setScrollable(scroller.scrollHeight > scroller.clientHeight)
        } else {
          setScrollable(document.documentElement.scrollHeight > window.innerHeight)
        }
      }

      updateScrollable()

      const onScroll = () => {
        if (scroller) {
          const progress = scroller.scrollTop / (scroller.scrollHeight - scroller.clientHeight)
          scaleXTo(Math.max(0, Math.min(1, progress)))
        } else {
          const scrollTop = window.scrollY || document.documentElement.scrollTop
          const docHeight = document.documentElement.scrollHeight - window.innerHeight
          const progress = docHeight > 0 ? scrollTop / docHeight : 0
          scaleXTo(Math.max(0, Math.min(1, progress)))
        }
      }

      const target = scroller || window
      target.addEventListener('scroll', onScroll, { passive: true })
      window.addEventListener('resize', updateScrollable)

      if (scroller) {
        const resizeObserver = new ResizeObserver(updateScrollable)
        resizeObserver.observe(scroller)
        return () => {
          target.removeEventListener('scroll', onScroll)
          window.removeEventListener('resize', updateScrollable)
          resizeObserver.disconnect()
        }
      }

      return () => {
        target.removeEventListener('scroll', onScroll)
        window.removeEventListener('resize', updateScrollable)
      }
    },
    { dependencies: [scroller], scope: barRef },
  )

  if (!scrollable) return null

  return (
    <div
      className={`h-[2px] bg-rule/30 pointer-events-none overflow-hidden ${className}`}
      aria-hidden="true"
    >
      <div ref={barRef} className="h-full bg-accent origin-left will-change-transform" />
    </div>
  )
}
