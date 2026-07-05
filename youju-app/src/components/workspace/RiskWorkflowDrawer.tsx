import { useGSAP } from '@gsap/react'
import { X } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { gsap } from '../../lib/gsap'
import type { Risk, RiskStatus } from '../../types'
import { RiskWorkflowPanel } from './RiskWorkflowPanel'

interface RiskWorkflowDrawerProps {
  isOpen: boolean
  onClose: () => void
  risks: Risk[]
  totalCount: number
  unresolvedCount: number
  selectedRiskId: string | null
  onSelectRisk: (risk: Risk) => void
  getRiskStatus: (riskId: string) => RiskStatus
  isLoading?: boolean
}

export function RiskWorkflowDrawer({
  isOpen,
  onClose,
  risks,
  totalCount,
  unresolvedCount,
  selectedRiskId,
  onSelectRisk,
  getRiskStatus,
  isLoading = false,
}: RiskWorkflowDrawerProps) {
  const drawerRef = useRef<HTMLDivElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)
  const resolvedCount = totalCount - unresolvedCount
  const progressPercent = totalCount > 0 ? (resolvedCount / totalCount) * 100 : 0

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [isOpen, onClose])

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  useGSAP(
    () => {
      if (!drawerRef.current || !overlayRef.current) return

      if (isOpen) {
        gsap.fromTo(
          overlayRef.current,
          { opacity: 0 },
          { opacity: 1, duration: 0.3, ease: 'power2.out' },
        )
        gsap.fromTo(
          drawerRef.current,
          { x: '100%' },
          { x: '0%', duration: 0.35, ease: 'power3.out' },
        )
      } else {
        gsap.to(overlayRef.current, {
          opacity: 0,
          duration: 0.25,
          ease: 'power2.in',
        })
        gsap.to(drawerRef.current, {
          x: '100%',
          duration: 0.3,
          ease: 'power3.in',
        })
      }
    },
    { dependencies: [isOpen] },
  )

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[60] md:hidden">
      <div ref={overlayRef} className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div
        ref={drawerRef}
        className="absolute top-0 right-0 bottom-0 w-[85vw] max-w-sm bg-paper shadow-2xl flex flex-col overflow-hidden"
      >
        <div className="px-4 py-3 border-b border-rule shrink-0">
          <div className="flex items-center justify-between mb-2">
            <div className="text-base font-medium text-ink font-display tracking-tight">
              待处理清单
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-md flex items-center justify-center text-ink-muted hover:bg-paper-dark hover:text-ink transition-colors cursor-pointer"
              aria-label="关闭"
            >
              <X size={16} strokeWidth={1.5} />
            </button>
          </div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-ink-muted">
              已处理 <span className="text-ink font-medium">{resolvedCount}</span> / {totalCount}
            </span>
            <span className="text-[10px] text-success font-mono">
              {Math.round(progressPercent)}%
            </span>
          </div>
          <div className="w-full h-1.5 bg-paper-dark rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-success to-accent rounded-full transition-[width] duration-500 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
        <div className="flex-1 overflow-hidden">
          <RiskWorkflowPanel
            risks={risks}
            totalCount={totalCount}
            unresolvedCount={unresolvedCount}
            selectedRiskId={selectedRiskId}
            onSelectRisk={(risk) => {
              onSelectRisk(risk)
            }}
            getRiskStatus={getRiskStatus}
            isLoading={isLoading}
            variant="drawer"
            showHeader={false}
          />
        </div>
      </div>
    </div>
  )
}
