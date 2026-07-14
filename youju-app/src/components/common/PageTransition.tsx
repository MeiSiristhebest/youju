import { useGSAP } from '@gsap/react'
import { useRef } from 'react'
import { gsap } from '../../lib/gsap'

interface PageTransitionProps {
  children: React.ReactNode
}

export function PageTransition({ children }: PageTransitionProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useGSAP(
    () => {
      const container = containerRef.current
      if (!container) return

      gsap.fromTo(
        container,
        { opacity: 0, y: 8 },
        { opacity: 1, y: 0, duration: 0.3, ease: 'power2.out' },
      )
    },
    { scope: containerRef },
  )

  return (
    <div ref={containerRef} style={{ opacity: 0 }}>
      {children}
    </div>
  )
}
