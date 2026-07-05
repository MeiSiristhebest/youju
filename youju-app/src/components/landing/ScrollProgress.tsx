import { useGSAP } from '@gsap/react'
import { useRef } from 'react'
import { gsap, ScrollTrigger } from '../../lib/gsap'

export function ScrollProgress() {
  const barRef = useRef<HTMLDivElement>(null)

  useGSAP(
    () => {
      const bar = barRef.current
      if (!bar) return

      // 初始宽度 0
      gsap.set(bar, { scaleX: 0, transformOrigin: 'left center' })

      // 使用 quickTo 实现平滑更新（无抖动）
      const scaleXTo = gsap.quickTo(bar, 'scaleX', {
        duration: 0.1,
        ease: 'power1.out',
      })

      const st = ScrollTrigger.create({
        start: 0,
        end: 'max',
        onUpdate: (self) => {
          scaleXTo(self.progress)
        },
      })

      return () => {
        st.kill()
      }
    },
    { scope: barRef },
  )

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[60] h-[2px] bg-rule/30 pointer-events-none"
      aria-hidden="true"
    >
      <div ref={barRef} className="h-full bg-accent origin-left will-change-transform" />
    </div>
  )
}
