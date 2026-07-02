import { Clock, RefreshCw, TrendingDown, TrendingUp, Zap } from 'lucide-react'
import type { IncrementalPrediction } from '../../algorithms/incrementalEngine'

interface IncrementalMeta {
  affectedSteps?: string[]
  recomputedSteps?: string[]
  reusedSteps?: string[]
  change?: {
    added: string[]
    removed: string[]
    modified: string[]
  }
  isIncremental?: boolean
  isFullRecompute?: boolean
  newRiskCount?: number
}

interface IncrementalDetailPanelProps {
  meta: IncrementalMeta
  prediction?: IncrementalPrediction | null
  cacheHit?: boolean
  lastAnalysisDuration?: number
  previousDuration?: number
}

export function IncrementalDetailPanel({
  meta,
  prediction,
  cacheHit = false,
  lastAnalysisDuration = 0,
  previousDuration = 0,
}: IncrementalDetailPanelProps) {
  const {
    affectedSteps = [],
    recomputedSteps = [],
    reusedSteps = [],
    change,
    isIncremental = false,
    isFullRecompute = false,
    newRiskCount,
  } = meta

  const addedCount = change?.added.length ?? 0
  const removedCount = change?.removed.length ?? 0
  const modifiedCount = change?.modified.length ?? 0
  const hasChanges = addedCount > 0 || removedCount > 0 || modifiedCount > 0

  const hasPrediction = prediction?.isIncremental
  const timeSavedPercent =
    previousDuration > 0 && lastAnalysisDuration > 0
      ? Math.round((1 - lastAnalysisDuration / previousDuration) * 100)
      : 0
  const isFaster = timeSavedPercent > 0

  return (
    <div className="bg-paper border border-rule rounded-xl p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-semibold text-ink font-display tracking-tight">增量分析</h3>
        {isFullRecompute ? (
          <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-danger-bg text-danger border border-danger/20">
            完整重算
          </span>
        ) : isIncremental ? (
          <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-accent-bg text-accent border border-accent-faint">
            增量更新
          </span>
        ) : cacheHit ? (
          <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-success-bg text-success border border-success/20 flex items-center gap-1">
            <Zap className="w-3 h-3" />
            缓存命中
          </span>
        ) : null}
      </div>

      {cacheHit && (
        <div className="mb-4 px-3 py-2 rounded-lg bg-success-bg/50 border border-success/20">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-success shrink-0" />
            <span className="text-xs text-success font-medium">结果已从缓存加载，跳过分析过程</span>
          </div>
        </div>
      )}

      {(lastAnalysisDuration > 0 || previousDuration > 0) && (
        <div className="mb-4 px-3 py-2 rounded-lg bg-paper border border-rule">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-ink-faint shrink-0" />
              <span className="text-xs text-ink-faint">分析耗时</span>
            </div>
            <div className="text-right">
              <span className="text-xs font-semibold text-ink">
                {lastAnalysisDuration > 0 ? `${(lastAnalysisDuration / 1000).toFixed(1)}s` : '--'}
              </span>
              {previousDuration > 0 && (
                <div className="flex items-center justify-end gap-1">
                  {isFaster ? (
                    <TrendingDown className="w-3 h-3 text-success" />
                  ) : (
                    <TrendingUp className="w-3 h-3 text-warning" />
                  )}
                  <span className={`text-[10px] ${isFaster ? 'text-success' : 'text-warning'}`}>
                    {isFaster ? '-' : '+'}
                    {Math.abs(timeSavedPercent)}%
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {hasPrediction && prediction && (
        <div className="mb-4 px-3 py-2 rounded-lg bg-accent-bg/30 border border-accent-faint">
          <div className="flex items-center gap-2 mb-2">
            <RefreshCw className="w-4 h-4 text-accent shrink-0" />
            <span className="text-xs text-accent font-medium">变化预测</span>
          </div>
          <div className="space-y-1.5">
            {prediction.estimatedRecomputedSteps.length > 0 && (
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-accent shrink-0" />
                <span className="text-[11px] text-ink-faint">
                  预计重算步骤：{prediction.estimatedRecomputedSteps.join('、')}
                </span>
              </div>
            )}
            {prediction.estimatedAffectedRiskCount > 0 && (
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-warning shrink-0" />
                <span className="text-[11px] text-ink-faint">
                  预计受影响风险：{prediction.estimatedAffectedRiskCount} 个
                </span>
              </div>
            )}
            {prediction.estimatedNewRiskCount > 0 && (
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-danger shrink-0" />
                <span className="text-[11px] text-ink-faint">
                  预计新增风险：{prediction.estimatedNewRiskCount} 个
                </span>
              </div>
            )}
            {prediction.estimatedTimeSavingPercent > 0 && (
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-success shrink-0" />
                <span className="text-[11px] text-success">
                  预计节省时间：{prediction.estimatedTimeSavingPercent}%
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {hasChanges && (
        <div className="mb-4">
          <div className="text-[11px] text-ink-faint mb-2">材料变更</div>
          <div className="flex gap-3">
            {addedCount > 0 && (
              <div className="flex-1 text-center py-2 rounded-lg bg-success-bg border border-success/20">
                <div className="text-base font-semibold text-success">+{addedCount}</div>
                <div className="text-[10px] text-ink-faint">新增</div>
              </div>
            )}
            {removedCount > 0 && (
              <div className="flex-1 text-center py-2 rounded-lg bg-danger-bg border border-danger/20">
                <div className="text-base font-semibold text-danger">-{removedCount}</div>
                <div className="text-[10px] text-ink-faint">删除</div>
              </div>
            )}
            {modifiedCount > 0 && (
              <div className="flex-1 text-center py-2 rounded-lg bg-warning-bg border border-warning/20">
                <div className="text-base font-semibold text-warning">~{modifiedCount}</div>
                <div className="text-[10px] text-ink-faint">修改</div>
              </div>
            )}
          </div>
        </div>
      )}

      {newRiskCount !== undefined && newRiskCount > 0 && (
        <div className="mb-4 px-3 py-2 rounded-lg bg-danger-bg border border-danger/20">
          <span className="text-xs text-danger font-medium">+{newRiskCount} 个新风险</span>
        </div>
      )}

      {(affectedSteps.length > 0 || recomputedSteps.length > 0 || reusedSteps.length > 0) && (
        <div>
          <div className="text-[11px] text-ink-faint mb-2">步骤影响</div>
          <div className="space-y-1.5">
            {affectedSteps.length > 0 && (
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-danger shrink-0" />
                <span className="text-[11px] text-danger">受影响：</span>
                <span className="text-[11px] text-ink-faint">{affectedSteps.join('、')}</span>
              </div>
            )}
            {recomputedSteps.length > 0 && (
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-warning shrink-0" />
                <span className="text-[11px] text-warning">需重算：</span>
                <span className="text-[11px] text-ink-faint">{recomputedSteps.join('、')}</span>
              </div>
            )}
            {reusedSteps.length > 0 && (
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-success shrink-0" />
                <span className="text-[11px] text-success">可复用：</span>
                <span className="text-[11px] text-ink-faint">{reusedSteps.join('、')}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {!hasChanges &&
        !hasPrediction &&
        !cacheHit &&
        !lastAnalysisDuration &&
        affectedSteps.length === 0 &&
        recomputedSteps.length === 0 &&
        reusedSteps.length === 0 && (
          <div className="text-center py-4">
            <p className="text-[11px] text-ink-faint">暂无增量分析数据</p>
          </div>
        )}
    </div>
  )
}
