import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  FileCheck,
  GitBranch,
  LayoutDashboard,
  LayoutGrid,
  MessageCircle,
  Sparkles,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'
import { cn } from '@/lib/utils'
import { useAnalysisStore, useSourceStore } from '../../stores'
import type { ScenarioType } from '../../types'
import { ChatPanel } from '../chat/ChatPanel'
import { ScrollProgress } from '../common/ScrollProgress'
import { AnalysisDashboard } from './AnalysisDashboard'
import { DimensionPanel } from './DimensionPanel'
import { ResultPanelSkeleton } from './ResultPanelSkeleton'
import { AlignedVersionArea } from './results/AlignedVersionArea'
import { CheckListArea } from './results/CheckListArea'
import { EntitiesView } from './results/EntitiesView'
import { IncrementalBanner } from './results/IncrementalBanner'
import { RelationsView } from './results/RelationsView'
import { ResultWelcome } from './results/ResultWelcome'
import { RisksView } from './results/RisksView'
import { TraceView } from './results/TraceView'
import { StepControlPanel } from './StepControlPanel'

type ResultTab =
  | 'overview'
  | 'risks'
  | 'checklist'
  | 'aligned'
  | 'entities'
  | 'relations'
  | 'trace'
  | 'dimensions'
  | 'chat'

interface ResultPanelProps {
  hasSources?: boolean
  onAnalyze: () => void
  onLoadScenario?: (scenarioId: ScenarioType) => void
  onAddSource?: () => void
  onEvidenceClick?: (sourceId: string, quote: string) => void
  onCancel?: () => void
  isLoading?: boolean
}

export function ResultPanel({
  hasSources = false,
  onAnalyze,
  onLoadScenario,
  onAddSource,
  onEvidenceClick,
  onCancel,
  isLoading = false,
}: ResultPanelProps) {
  const [scrollContainer, setScrollContainer] = useState<HTMLDivElement | null>(null)
  const tabsScrollRef = useRef<HTMLDivElement>(null)
  const result = useAnalysisStore((state) => state.result)
  const analyzing = useAnalysisStore((state) => state.analyzing)
  const activeTab = useAnalysisStore((state) => state.activeTab)
  const setActiveTab = useAnalysisStore((state) => state.setActiveTab)

  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)
  const [isHoveringTabs, setIsHoveringTabs] = useState(false)

  useEffect(() => {
    const el = tabsScrollRef.current
    if (!el) return

    const checkOverflow = () => {
      const hasOverflow = el.scrollWidth > el.clientWidth
      const isAtStart = el.scrollLeft <= 1
      const isAtEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 1
      setCanScrollLeft(hasOverflow && !isAtStart)
      setCanScrollRight(hasOverflow && !isAtEnd)
    }

    // 延迟检查：确保字体、图标渲染完成，容器尺寸稳定后再判断溢出
    const rafId = requestAnimationFrame(() => {
      checkOverflow()
      const timer = setTimeout(checkOverflow, 150)
      return () => clearTimeout(timer)
    })

    el.addEventListener('scroll', checkOverflow, { passive: true })
    window.addEventListener('resize', checkOverflow)

    const observer = new ResizeObserver(checkOverflow)
    observer.observe(el)

    return () => {
      cancelAnimationFrame(rafId)
      el.removeEventListener('scroll', checkOverflow)
      window.removeEventListener('resize', checkOverflow)
      observer.disconnect()
    }
  }, [activeTab])

  const dimensions = useAnalysisStore((state) => state.dimensions)
  const showAddDimensionDialog = useAnalysisStore((state) => state.showAddDimensionDialog)
  const onToggleDimensionEnabled = useAnalysisStore((state) => state.toggleDimensionEnabled)
  const onUpdateDimensionWeight = useAnalysisStore((state) => state.updateDimensionWeight)
  const onMoveDimension = useAnalysisStore((state) => state.moveDimension)
  const onAddCustomDimension = useAnalysisStore((state) => state.addCustomDimension)
  const onRemoveCustomDimension = useAnalysisStore((state) => state.removeCustomDimension)
  const onResetDimensionWeights = useAnalysisStore((state) => state.resetDimensionWeights)
  const onShowAddDimensionDialogChange = useAnalysisStore(
    (state) => state.setShowAddDimensionDialog,
  )

  const resultShortcuts = useMemo(
    () => [
      {
        key: '0',
        group: '分析结果',
        description: '切换到概览仪表盘',
        handler: () => setActiveTab('overview'),
      },
      {
        key: '1',
        group: '分析结果',
        description: '切换到风险排雷',
        handler: () => setActiveTab('risks'),
      },
      {
        key: '2',
        group: '分析结果',
        description: '切换到检查清单',
        handler: () => setActiveTab('checklist'),
      },
      {
        key: '3',
        group: '分析结果',
        description: '切换到对齐共识',
        handler: () => setActiveTab('aligned'),
      },
      {
        key: '4',
        group: '分析结果',
        description: '切换到要素提取',
        handler: () => setActiveTab('entities'),
      },
      {
        key: '5',
        group: '分析结果',
        description: '切换到证据链条',
        handler: () => setActiveTab('relations'),
      },
      {
        key: '6',
        group: '分析结果',
        description: '切换到维度调权',
        handler: () => setActiveTab('dimensions'),
      },
      {
        key: '7',
        group: '分析结果',
        description: '切换到思考过程',
        handler: () => setActiveTab('trace'),
      },
    ],
    [setActiveTab],
  )

  useKeyboardShortcuts({
    shortcuts: resultShortcuts,
    enabled: !!result && !analyzing,
  })

  const currentScenario = useSourceStore((s) => s.currentScenario)
  const currentTaskId = useSourceStore((s) => s.currentTaskId)

  const tabs: Array<{ id: ResultTab; label: string; icon: React.ReactNode }> = [
    {
      id: 'overview',
      label: '概览',
      icon: <LayoutDashboard size={16} strokeWidth={1.5} />,
    },
    {
      id: 'risks',
      label: '风险排雷',
      icon: <AlertTriangle size={16} strokeWidth={1.5} />,
    },
    {
      id: 'checklist',
      label: '检查清单',
      icon: <FileCheck size={16} strokeWidth={1.5} />,
    },
    {
      id: 'aligned',
      label: '对齐共识',
      icon: <FileCheck size={16} strokeWidth={1.5} />,
    },
    {
      id: 'entities',
      label: '要素提取',
      icon: <LayoutGrid size={16} strokeWidth={1.5} />,
    },
    {
      id: 'relations',
      label: '证据链条',
      icon: <GitBranch size={16} strokeWidth={1.5} />,
    },
    {
      id: 'dimensions',
      label: '维度调权',
      icon: <LayoutGrid size={16} strokeWidth={1.5} />,
    },
    {
      id: 'trace',
      label: '思考过程',
      icon: <Sparkles size={16} strokeWidth={1.5} />,
    },
    {
      id: 'chat',
      label: 'AI 对话',
      icon: <MessageCircle size={16} strokeWidth={1.5} />,
    },
  ]

  if (isLoading) {
    return <ResultPanelSkeleton />
  }

  if (analyzing) {
    return (
      <div className="flex-1 flex flex-col h-full bg-paper border-l border-rule relative">
        <StepControlPanel onCancel={onCancel} />
      </div>
    )
  }

  const showTabs = result || activeTab === 'chat'

  return (
    <div className="flex-1 flex flex-col h-full bg-paper border-l border-rule relative animate-[fadeIn_0.2s_ease-out]">
      {showTabs ? (
        <div className="flex-1 flex flex-col overflow-hidden">
          {result && <IncrementalBanner />}

          <div
            className="relative flex border-b border-rule bg-paper-dark/30 shrink-0"
            onMouseEnter={() => setIsHoveringTabs(true)}
            onMouseLeave={() => setIsHoveringTabs(false)}
          >
            {/* 左侧渐变遮罩 + 左箭头 */}
            <div
              className={cn(
                'pointer-events-none absolute left-0 top-0 bottom-0 w-10 z-10 transition-opacity duration-200',
                canScrollLeft ? 'opacity-100' : 'opacity-0',
              )}
              style={{ background: 'linear-gradient(to right, var(--paper-dark), transparent)' }}
            />
            {canScrollLeft && (
              <button
                type="button"
                onClick={() => {
                  const el = tabsScrollRef.current
                  if (el) el.scrollBy({ left: -200, behavior: 'smooth' })
                }}
                className={cn(
                  'absolute left-1 top-1/2 -translate-y-1/2 z-20 w-6 h-6 rounded-md flex items-center justify-center bg-paper border border-rule/60 text-ink-muted hover:text-ink hover:border-ink-faint shadow-sm transition-all duration-200',
                  isHoveringTabs ? 'opacity-100' : 'opacity-0',
                )}
                aria-label="向左滚动"
              >
                <ChevronLeft size={14} strokeWidth={2} />
              </button>
            )}

            <div
              ref={tabsScrollRef}
              className="flex overflow-x-auto scrollbar-thin flex-1 px-1"
              id="result-tabs-scroll"
            >
              {tabs.map((tab) => {
                if (!result && tab.id !== 'chat') return null
                return (
                  <button
                    key={tab.id}
                    id={
                      tab.id === 'risks'
                        ? 'tour-risks-tab'
                        : tab.id === 'overview'
                          ? 'tour-overview-tab'
                          : undefined
                    }
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      'shrink-0 flex items-center gap-2 px-3.5 py-2.5 text-sm font-medium border-b-2 transition-all duration-200 cursor-pointer bg-transparent border-transparent text-ink-muted hover:text-ink hover:bg-paper-dark/10',
                      activeTab === tab.id ? 'border-accent text-accent bg-paper' : '',
                    )}
                  >
                    {tab.icon}
                    {tab.label}
                  </button>
                )
              })}
            </div>

            {/* 右侧渐变遮罩 + 右箭头 */}
            <div
              className={cn(
                'pointer-events-none absolute right-0 top-0 bottom-0 w-10 z-10 transition-opacity duration-200',
                canScrollRight ? 'opacity-100' : 'opacity-0',
              )}
              style={{ background: 'linear-gradient(to left, var(--paper-dark), transparent)' }}
            />
            {canScrollRight && (
              <button
                type="button"
                onClick={() => {
                  const el = tabsScrollRef.current
                  if (el) el.scrollBy({ left: 200, behavior: 'smooth' })
                }}
                className={cn(
                  'absolute right-1 top-1/2 -translate-y-1/2 z-20 w-6 h-6 rounded-md flex items-center justify-center bg-paper border border-rule/60 text-ink-muted hover:text-ink hover:border-ink-faint shadow-sm transition-all duration-200',
                  isHoveringTabs ? 'opacity-100' : 'opacity-0',
                )}
                aria-label="向右滚动"
              >
                <ChevronRight size={14} strokeWidth={2} />
              </button>
            )}
          </div>

          {activeTab === 'chat' ? (
            <ChatPanel
              taskId={currentTaskId || undefined}
              scenarioType={currentScenario || undefined}
              className="flex-1"
            />
          ) : result ? (
            <>
              <ScrollProgress scroller={scrollContainer} />
              <div ref={setScrollContainer} className="flex-1 overflow-y-auto flex flex-col">
                {activeTab === 'overview' && result && <AnalysisDashboard result={result} />}
                {activeTab === 'risks' && <RisksView onEvidenceClick={onEvidenceClick} />}
                {activeTab === 'checklist' && <CheckListArea />}
                {activeTab === 'aligned' && <AlignedVersionArea />}
                {activeTab === 'dimensions' && (
                  <DimensionPanel
                    dimensions={dimensions}
                    onToggleEnabled={onToggleDimensionEnabled}
                    onUpdateWeight={onUpdateDimensionWeight}
                    onMoveDimension={onMoveDimension}
                    onAddCustomDimension={onAddCustomDimension}
                    onRemoveCustomDimension={onRemoveCustomDimension}
                    onResetWeights={onResetDimensionWeights}
                    showAddDialog={showAddDimensionDialog}
                    onShowAddDialogChange={onShowAddDimensionDialogChange}
                  />
                )}
                {activeTab === 'entities' && <EntitiesView />}
                {activeTab === 'relations' && <RelationsView onEvidenceClick={onEvidenceClick} />}
                {activeTab === 'trace' && <TraceView />}
              </div>
            </>
          ) : (
            <ResultWelcome
              onLoadScenario={onLoadScenario}
              onAddSource={onAddSource}
              onAnalyze={onAnalyze}
              hasSources={hasSources}
            />
          )}
        </div>
      ) : (
        <ResultWelcome onLoadScenario={onLoadScenario} onAddSource={onAddSource} />
      )}
    </div>
  )
}
