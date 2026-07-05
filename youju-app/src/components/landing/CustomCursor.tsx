import { useGSAP } from '@gsap/react'
import { useEffect, useRef } from 'react'
import { gsap } from '../../lib/gsap'

export function CustomCursor() {
  const outerRef = useRef<HTMLDivElement>(null)
  const innerRef = useRef<HTMLDivElement>(null)
  const visibleRef = useRef(false)

  // 检测是否为桌面端
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (window.matchMedia('(max-width: 1023px)').matches) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    // 隐藏原生光标（仅在桌面端落地页）
    document.body.style.cursor = 'none'

    return () => {
      document.body.style.cursor = ''
    }
  }, [])

  useGSAP(
    () => {
      const outer = outerRef.current
      const inner = innerRef.current
      if (!outer || !inner) return

      // 移动端禁用
      if (window.matchMedia('(max-width: 1023px)').matches) return
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

      // 外圈：弹性跟随（quickTo）
      const xTo = gsap.quickTo(outer, 'x', {
        duration: 0.5,
        ease: 'power3.out',
      })
      const yTo = gsap.quickTo(outer, 'y', {
        duration: 0.5,
        ease: 'power3.out',
      })

      // 内圈：即时跟随
      const xInnerTo = gsap.quickTo(inner, 'x', {
        duration: 0.1,
        ease: 'power1.out',
      })
      const yInnerTo = gsap.quickTo(inner, 'y', {
        duration: 0.1,
        ease: 'power1.out',
      })

      const onMouseMove = (e: MouseEvent) => {
        xTo(e.clientX)
        yTo(e.clientY)
        xInnerTo(e.clientX)
        yInnerTo(e.clientY)

        if (!visibleRef.current) {
          visibleRef.current = true
          gsap.to([outer, inner], {
            opacity: 1,
            duration: 0.2,
          })
        }
      }

      const onMouseLeave = () => {
        visibleRef.current = false
        gsap.to([outer, inner], { opacity: 0, duration: 0.2 })
      }

      // 悬停可交互元素时外圈放大
      const onMouseOver = (e: MouseEvent) => {
        const target = e.target as HTMLElement
        const isInteractive = target.closest(
          'a, button, [role="button"], input, textarea, select, [data-cursor="hover"]',
        )
        if (isInteractive) {
          gsap.to(outer, {
            width: 56,
            height: 56,
            borderColor: 'var(--accent)',
            duration: 0.3,
            ease: 'power2.out',
          })
        } else {
          gsap.to(outer, {
            width: 32,
            height: 32,
            borderColor: 'var(--ink)',
            duration: 0.3,
            ease: 'power2.out',
          })
        }
      }

      window.addEventListener('mousemove', onMouseMove)
      window.addEventListener('mouseover', onMouseOver)
      document.body.addEventListener('mouseleave', onMouseLeave)

      // 初始隐藏
      gsap.set([outer, inner], { opacity: 0 })

      return () => {
        window.removeEventListener('mousemove', onMouseMove)
        window.removeEventListener('mouseover', onMouseOver)
        document.body.removeEventListener('mouseleave', onMouseLeave)
      }
    },
    { scope: outerRef },
  )

  return (
    <div
      className="pointer-events-none fixed top-0 left-0 z-[100] hidden lg:block"
      aria-hidden="true"
    >
      <div
        ref={outerRef}
        className="fixed top-0 left-0 -translate-x-1/2 -translate-y-1/2 rounded-full border border-ink mix-blend-difference"
        style={{ width: 32, height: 32, marginLeft: -16, marginTop: -16 }}
      />
      <div
        ref={innerRef}
        className="fixed top-0 left-0 -translate-x-1/2 -translate-y-1/2 rounded-full bg-ink mix-blend-difference"
        style={{ width: 6, height: 6, marginLeft: -3, marginTop: -3 }}
      />
    </div>
  )
}
