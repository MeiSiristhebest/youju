import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'

export interface TourStep {
  id: string
  target: string
  title: string
  description: string
  placement?: 'top' | 'bottom' | 'left' | 'right'
  highlightPadding?: number
}

interface ProductTourProps {
  steps: TourStep[]
  isOpen: boolean
  onClose: () => void
  onComplete?: () => void
  localStorageKey?: string
}

export function ProductTour({
  steps,
  isOpen,
  onClose,
  onComplete,
  localStorageKey,
}: ProductTourProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [position, setPosition] = useState({ top: 0, left: 0, width: 0, height: 0 })
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 })
  const [isAnimating, setIsAnimating] = useState(false)
  const highlightRef = useRef<HTMLDivElement>(null)

  const step = steps[currentStep]

  useEffect(() => {
    if (!isOpen || !step) return

    const updatePosition = () => {
      const element = document.querySelector(step.target)
      if (!element) return

      const rect = element.getBoundingClientRect()
      const padding = step.highlightPadding ?? 8

      setPosition({
        top: rect.top - padding,
        left: rect.left - padding,
        width: rect.width + padding * 2,
        height: rect.height + padding * 2,
      })

      const placement = step.placement ?? 'bottom'
      const tooltipWidth = 320
      const tooltipHeight = 160
      const gap = 12

      let tooltipTop = 0
      let tooltipLeft = 0

      switch (placement) {
        case 'top':
          tooltipTop = rect.top - tooltipHeight - gap
          tooltipLeft = rect.left + rect.width / 2 - tooltipWidth / 2
          break
        case 'bottom':
          tooltipTop = rect.bottom + gap
          tooltipLeft = rect.left + rect.width / 2 - tooltipWidth / 2
          break
        case 'left':
          tooltipTop = rect.top + rect.height / 2 - tooltipHeight / 2
          tooltipLeft = rect.left - tooltipWidth - gap
          break
        case 'right':
          tooltipTop = rect.top + rect.height / 2 - tooltipHeight / 2
          tooltipLeft = rect.right + gap
          break
      }

      const viewportWidth = window.innerWidth
      const viewportHeight = window.innerHeight

      if (tooltipLeft < 16) tooltipLeft = 16
      if (tooltipLeft + tooltipWidth > viewportWidth - 16) {
        tooltipLeft = viewportWidth - tooltipWidth - 16
      }
      if (tooltipTop < 16) tooltipTop = 16
      if (tooltipTop + tooltipHeight > viewportHeight - 16) {
        tooltipTop = viewportHeight - tooltipHeight - 16
      }

      setTooltipPosition({ top: tooltipTop, left: tooltipLeft })
    }

    setIsAnimating(true)
    updatePosition()

    const timer = setTimeout(() => setIsAnimating(false), 300)

    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)

    return () => {
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
      clearTimeout(timer)
    }
  }, [currentStep, isOpen, step])

  useEffect(() => {
    if (!isOpen) {
      setCurrentStep(0)
    }
  }, [isOpen])

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      handleComplete()
    }
  }

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleComplete = () => {
    if (localStorageKey) {
      localStorage.setItem(localStorageKey, 'true')
    }
    onComplete?.()
    onClose()
  }

  const handleSkip = () => {
    if (localStorageKey) {
      localStorage.setItem(localStorageKey, 'true')
    }
    onClose()
  }

  const isLast = currentStep === steps.length - 1
  const isFirst = currentStep === 0

  const _overlayPaths = useMemo(() => {
    const { top, left, width, height } = position
    const vw = window.innerWidth
    const vh = window.innerHeight
    return {
      top: `M0 0 H${vw} V${top} H0 Z`,
      bottom: `M0 ${top + height} H${vw} V${vh} H0 Z`,
      left: `M0 ${top} H${left} V${top + height} H0 Z`,
      right: `M${left + width} ${top} H${vw} V${top + height} H${left + width} Z`,
    }
  }, [position])

  if (!isOpen || !step) return null

  return createPortal(
    <div className="fixed inset-0 z-50 pointer-events-none">
      <svg
        className="absolute inset-0 w-full h-full pointer-events-auto"
        style={{ pointerEvents: 'none' }}
        role="presentation"
        aria-hidden="true"
      >
        <defs>
          <mask id="tour-mask">
            <rect width="100%" height="100%" fill="white" />
            <rect
              x={position.left}
              y={position.top}
              width={position.width}
              height={position.height}
              rx={12}
              ry={12}
              fill="black"
            />
          </mask>
        </defs>
        <rect
          width="100%"
          height="100%"
          fill="rgba(0, 0, 0, 0.5)"
          mask="url(#tour-mask)"
          style={{ pointerEvents: 'auto' }}
          onClick={handleSkip}
        />
      </svg>

      <div
        ref={highlightRef}
        className={cn(
          'absolute rounded-xl border-2 border-accent transition-all duration-300 ease-out pointer-events-none',
          isAnimating ? 'opacity-0' : 'opacity-100',
        )}
        style={{
          top: position.top,
          left: position.left,
          width: position.width,
          height: position.height,
          boxShadow: '0 0 0 4px rgba(59, 130, 246, 0.2)',
        }}
      />

      <div
        className={cn(
          'absolute rounded-2xl shadow-2xl border border-rule/60 p-5 transition-all duration-300 ease-out pointer-events-auto backdrop-blur-xl bg-paper/80',
          isAnimating ? 'opacity-0 scale-95' : 'opacity-100 scale-100',
        )}
        style={{
          top: tooltipPosition.top,
          left: tooltipPosition.left,
          width: 320,
        }}
      >
        <button
          type="button"
          onClick={handleSkip}
          className="absolute top-3 right-3 w-6 h-6 rounded-md flex items-center justify-center text-ink-faint hover:text-ink hover:bg-paper-dark transition-colors cursor-pointer"
          aria-label="关闭引导"
        >
          <X size={14} strokeWidth={1.5} />
        </button>

        <div className="mb-3">
          <span className="text-[10px] font-mono text-accent bg-accent-bg px-2 py-0.5 rounded-full">
            {currentStep + 1} / {steps.length}
          </span>
        </div>

        <h3 className="text-base font-semibold text-ink mb-2 pr-6 font-display tracking-tight">
          {step.title}
        </h3>
        <p className="text-xs text-ink-muted leading-relaxed mb-4">{step.description}</p>

        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={handleSkip}
            className="text-xs text-ink-faint hover:text-ink transition-colors cursor-pointer"
          >
            跳过引导
          </button>

          <div className="flex items-center gap-2">
            {!isFirst && (
              <button
                type="button"
                onClick={handlePrev}
                className="w-8 h-8 rounded-lg flex items-center justify-center border border-rule/60 text-ink-muted hover:text-ink hover:bg-paper-dark transition-colors cursor-pointer"
                aria-label="上一步"
              >
                <ChevronLeft size={16} strokeWidth={1.5} />
              </button>
            )}
            <button
              type="button"
              onClick={handleNext}
              className="h-8 px-4 rounded-lg bg-accent text-paper text-xs font-medium flex items-center gap-1 hover:bg-accent/90 transition-colors cursor-pointer"
            >
              {isLast ? '完成' : '下一步'}
              {!isLast && <ChevronRight size={14} strokeWidth={1.5} />}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-center gap-1.5 mt-4">
          {steps.map((_, idx) => (
            <div
              key={idx}
              className={cn(
                'h-1 rounded-full transition-all duration-300',
                idx === currentStep ? 'w-6 bg-accent' : 'w-1.5 bg-rule',
              )}
            />
          ))}
        </div>
      </div>
    </div>,
    document.body,
  )
}
