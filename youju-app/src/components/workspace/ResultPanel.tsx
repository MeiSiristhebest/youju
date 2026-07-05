import {
  AlertTriangle,
  FileCheck,
  GitBranch,
  LayoutDashboard,
  LayoutGrid,
  Sparkles,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'
import { cn } from '@/lib/utils'
import { useAnalysisStore } from '../../stores'
import type { ScenarioType } from '../../types'
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
import { WorkspaceEmpty } from './WorkspaceEmpty'

type ResultTab =
  | 'overview'
  | 'risks'
  | 'checklist'
  | 'aligned'
  | 'entities'
  | 'relations'
  | 'trace'
  | 'dimensions'

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
  const result = useAnalysisStore((state) => state.result)
  const analyzing = useAnalysisStore((state) => state.analyzing)
  const activeTab = useAnalysisStore((state) => state.activeTab)
  const setActiveTab = useAnalysisStore((state) => state.setActiveTab)

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

  const tabs: Array<{ id: ResultTab; label: string; icon: React.ReactNode }> = [
    {
      id: 'overview',
      label: '概览',
      icon: <LayoutDashboard size={14} strokeWidth={1.5} />,
    },
    {
      id: 'risks',
      label: '风险排雷',
      icon: <AlertTriangle size={14} strokeWidth={1.5} />,
    },
    {
      id: 'checklist',
      label: '检查清单',
      icon: <FileCheck size={14} strokeWidth={1.5} />,
    },
    {
      id: 'aligned',
      label: '对齐共识',
      icon: <FileCheck size={14} strokeWidth={1.5} />,
    },
    {
      id: 'entities',
      label: '要素提取',
      icon: <LayoutGrid size={14} strokeWidth={1.5} />,
    },
    {
      id: 'relations',
      label: '证据链条',
      icon: <GitBranch size={14} strokeWidth={1.5} />,
    },
    {
      id: 'dimensions',
      label: '维度调权',
      icon: <LayoutGrid size={14} strokeWidth={1.5} />,
    },
    {
      id: 'trace',
      label: '思考过程',
      icon: <Sparkles size={14} strokeWidth={1.5} />,
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

  return (
    <div className="flex-1 flex flex-col h-full bg-paper border-l border-rule relative animate-[fadeIn_0.2s_ease-out]">
      {result ? (
        <div className="flex-1 flex flex-col overflow-hidden">
          <IncrementalBanner />

          <div className="flex border-b border-rule bg-paper-dark/30 shrink-0 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                id={tab.id === 'risks' ? 'tour-risks-tab' : undefined}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex items-center gap-1.5 px-4 py-3.5 text-base font-medium border-b-2 transition-all duration-200 cursor-pointer bg-transparent border-transparent text-ink-muted hover:text-ink hover:bg-paper-dark/10 font-display tracking-tight',
                  activeTab === tab.id ? 'border-accent text-accent bg-paper' : '',
                )}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

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
        </div>
      ) : hasSources ? (
        <WorkspaceEmpty type="result" onAction={onAnalyze} actionLabel="开始分析" />
      ) : (
        <ResultWelcome onLoadScenario={onLoadScenario} onAddSource={onAddSource} />
      )}
    </div>
  )
}
