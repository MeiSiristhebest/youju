import { useEffect, useRef, useState } from 'react'

interface UseInViewOptions extends IntersectionObserverInit {
  triggerOnce?: boolean
}

export function useInView(options: UseInViewOptions = {}) {
  const { triggerOnce = true, ...observerOptions } = options
  const ref = useRef<HTMLDivElement>(null)
  const [inView, setInView] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true)
          if (triggerOnce) observer.unobserve(el)
        } else if (!triggerOnce) {
          setInView(false)
        }
      },
      { threshold: 0.15, ...observerOptions },
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [
    triggerOnce,
    observerOptions.threshold,
    observerOptions.root,
    observerOptions.rootMargin,
    observerOptions,
  ])

  return { ref, inView }
}
