import { useCallback, useRef, useState } from 'react'

interface ResizerProps {
  onResize: (delta: number) => void
  className?: string
  width?: number
  minWidth?: number
  maxWidth?: number
}

export function Resizer({
  onResize,
  className = '',
  width,
  minWidth = 240,
  maxWidth = 600,
}: ResizerProps) {
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

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    const step = e.shiftKey ? 40 : 8
    let delta = 0
    if (e.key === 'ArrowLeft') delta = -step
    else if (e.key === 'ArrowRight') delta = step
    else return
    e.preventDefault()
    onResizeRef.current(delta)
  }, [])

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label="调整面板宽度"
      aria-valuenow={width}
      aria-valuemin={minWidth}
      aria-valuemax={maxWidth}
      tabIndex={0}
      className={`relative flex-shrink-0 cursor-col-resize group h-full focus:outline-none focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2 ${className}`}
      style={{ width: '4px' }}
      onMouseDown={handleMouseDown}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onKeyDown={handleKeyDown}
    >
      <div className="absolute inset-y-0 -left-1 -right-1" />
      <div
        className={`absolute inset-y-0 left-1/2 -translate-x-1/2 transition-all duration-100 ease-out ${
          isDragging ? 'w-px bg-accent' : isHovered ? 'w-px bg-accent/50' : 'w-[0.5px] bg-rule/60'
        }`}
      />
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
      <Resizer onResize={handleResize} width={width} minWidth={minWidth} maxWidth={maxWidth} />
    </>
  )
}
