import { useCallback, useRef, useState } from 'react'

interface ResizerProps {
  onResize: (delta: number) => void
  className?: string
}

export function Resizer({ onResize, className = '' }: ResizerProps) {
  const isDraggingRef = useRef(false)
  const startXRef = useRef(0)
  const onResizeRef = useRef(onResize)
  onResizeRef.current = onResize
  const [isHovered, setIsHovered] = useState(false)
  const [isDragging, setIsDragging] = useState(false)

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    isDraggingRef.current = true
    startXRef.current = e.clientX
    setIsDragging(true)
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return
      const delta = e.clientX - startXRef.current
      onResizeRef.current(delta)
      startXRef.current = e.clientX
    }

    const handleMouseUp = () => {
      isDraggingRef.current = false
      setIsDragging(false)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }, [])

  return (
    <div
      className={`relative flex-shrink-0 cursor-col-resize group h-full ${className}`}
      style={{ width: '12px' }}
      onMouseDown={handleMouseDown}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="absolute inset-y-0 left-0 right-0" />
      <div
        className={`absolute inset-y-0 left-1/2 -translate-x-1/2 transition-all duration-150 ${
          isDragging
            ? 'w-1 bg-accent shadow-[0_0_8px_rgba(var(--accent-rgb),0.5)]'
            : isHovered
              ? 'w-0.5 bg-accent/60'
              : 'w-px bg-rule'
        }`}
      />
      <div
        className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full transition-all duration-150 flex items-center justify-center ${
          isDragging || isHovered
            ? 'opacity-100 w-4 h-10 bg-accent shadow-lg'
            : 'opacity-0 w-3 h-8 bg-rule/50'
        }`}
      >
        <div className="flex flex-col gap-1">
          <div className="w-0.5 h-0.5 rounded-full bg-white/80" />
          <div className="w-0.5 h-0.5 rounded-full bg-white/80" />
          <div className="w-0.5 h-0.5 rounded-full bg-white/80" />
        </div>
      </div>
    </div>
  )
}

interface ResizablePanelProps {
  width: number
  minWidth?: number
  maxWidth?: number
  onWidthChange: (width: number) => void
  children: React.ReactNode
  className?: string
}

export function ResizablePanel({
  width,
  minWidth = 240,
  maxWidth = 600,
  onWidthChange,
  children,
  className = '',
}: ResizablePanelProps) {
  const handleResize = useCallback(
    (delta: number) => {
      const newWidth = Math.max(minWidth, Math.min(maxWidth, width + delta))
      onWidthChange(newWidth)
    },
    [width, minWidth, maxWidth, onWidthChange],
  )

  return (
    <>
      <div
        className={`flex-shrink-0 overflow-hidden h-full ${className}`}
        style={{ width: `${width}px` }}
      >
        {children}
      </div>
      <Resizer onResize={handleResize} />
    </>
  )
}
