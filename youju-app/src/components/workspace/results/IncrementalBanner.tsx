import { RefreshCw } from 'lucide-react'
import { useAnalysisStore } from '../../../stores'

export function IncrementalBanner() {
  const showIncrementalBanner = useAnalysisStore((state) => state.showIncrementalBanner)
  const incrementalPrediction = useAnalysisStore((state) => state.incrementalPrediction)
  const forceFullAnalysis = useAnalysisStore((state) => state.forceFullAnalysis)
  const setForceFullAnalysis = useAnalysisStore((state) => state.setForceFullAnalysis)
  const onDismissIncrementalBanner = useAnalysisStore((state) => state.setShowIncrementalBanner)

  if (!showIncrementalBanner || !incrementalPrediction) return null

  return (
    <div className="bg-accent-bg/40 border-b border-accent/10 px-4 py-3 flex items-center justify-between animate-fade-in shrink-0">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-accent-bg text-accent flex items-center justify-center animate-pulse">
          <RefreshCw size={15} strokeWidth={1.5} />
        </div>
        <div className="text-left">
          <h4 className="text-xs font-semibold text-ink">检测到源材料有细微变更</h4>
          <p className="text-[10px] text-ink-faint">
            AI 预测本次仅有 {incrementalPrediction.estimatedRecomputedSteps.length}{' '}
            个步骤会受影响。推荐采用增量合并以提升速度。
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <label className="flex items-center gap-1.5 cursor-pointer text-[10px] font-medium text-ink-muted">
          <input
            type="checkbox"
            checked={!forceFullAnalysis}
            onChange={(e) => setForceFullAnalysis(!e.target.checked)}
            className="rounded border-rule text-accent focus:ring-accent"
          />
          启用增量分析
        </label>
        <button
          type="button"
          onClick={() => onDismissIncrementalBanner(false)}
          className="p-1 rounded-md text-ink-faint hover:text-ink cursor-pointer bg-transparent border-none"
        >
          关闭
        </button>
      </div>
    </div>
  )
}
