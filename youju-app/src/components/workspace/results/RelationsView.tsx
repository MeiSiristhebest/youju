import { AlertTriangle, FileText, GitBranch, ScrollText } from 'lucide-react'
import { useAnalysisStore } from '../../../stores'
import type { Conflict, ConflictPair, RiskAssociation, ValidationResult } from '../../../types'
import { ConfidenceBar } from '../../ui/ConfidenceBar'

interface RelationsViewProps {
  onEvidenceClick?: (sourceId: string, quote: string) => void
}

export function RelationsView({ onEvidenceClick }: RelationsViewProps) {
  const result = useAnalysisStore((state) => state.result)
  const onSelectRisk = useAnalysisStore((state) => state.setSelectedRisk)

  if (!result?.riskRelations) return null

  const { conflictPairs, associations, relatedRiskIds, validationResults } = result.riskRelations

  return (
    <div className="p-4 space-y-5">
      {conflictPairs && conflictPairs.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-ink mb-3 flex items-center gap-1.5">
            <AlertTriangle size={13} strokeWidth={1.5} className="text-danger" />
            冲突风险对
          </h4>
          <div className="space-y-2">
            {conflictPairs.map((pair: ConflictPair, idx: number) => {
              const risk1 = result.risks.find((r) => r.id === pair.risk1Id)
              const risk2 = result.risks.find((r) => r.id === pair.risk2Id)
              if (!risk1 || !risk2) return null
              return (
                <div key={idx} className="rounded-lg border border-danger/20 bg-danger-bg/30 p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <button
                      type="button"
                      className="px-2 py-1 rounded-md text-[11px] bg-danger-bg text-danger cursor-pointer hover:opacity-80 transition-opacity border-none"
                      onClick={() => onSelectRisk(risk1)}
                    >
                      {risk1.title.length > 10 ? `${risk1.title.substring(0, 10)}…` : risk1.title}
                    </button>
                    <div className="text-danger text-xs">⇄</div>
                    <button
                      type="button"
                      className="px-2 py-1 rounded-md text-[11px] bg-danger-bg text-danger cursor-pointer hover:opacity-80 transition-opacity border-none"
                      onClick={() => onSelectRisk(risk2)}
                    >
                      {risk2.title.length > 10 ? `${risk2.title.substring(0, 10)}…` : risk2.title}
                    </button>
                  </div>
                  <p className="text-[11px] text-ink-faint leading-relaxed text-left">
                    {pair.reason}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div>
        <h4 className="text-xs font-semibold text-ink mb-3 flex items-center gap-1.5">
          <FileText size={13} strokeWidth={1.5} className="text-ink-faint" />
          按材料查看风险
        </h4>
        <div className="space-y-2.5">
          {associations.map((assoc: RiskAssociation) => (
            <div
              key={assoc.sourceName}
              className="rounded-lg border border-rule bg-paper/[0.02] p-3 text-left"
            >
              <div className="flex items-center justify-between mb-2.5">
                <div className="flex items-center gap-2">
                  <FileText size={13} strokeWidth={1.5} className="text-ink-faint" />
                  <span className="text-xs font-medium text-ink">{assoc.sourceName}</span>
                </div>
                <span className="text-[10px] text-ink-faint font-mono px-1.5 py-0.5 bg-paper-dark rounded">
                  {assoc.riskCount} 个风险
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {assoc.riskIds.map((riskId: string) => {
                  const risk = result.risks.find((r) => r.id === riskId)
                  if (!risk) return null
                  return (
                    <button
                      key={riskId}
                      type="button"
                      className={`px-2 py-1 rounded-md text-[11px] cursor-pointer hover:opacity-80 transition-opacity border-none ${
                        risk.level === 'critical'
                          ? 'bg-danger-bg text-danger'
                          : risk.level === 'warning'
                            ? 'bg-warning-bg text-warning'
                            : 'bg-success-bg text-success'
                      }`}
                      onClick={() => onSelectRisk(risk)}
                    >
                      {risk.title.length > 12 ? `${risk.title.substring(0, 12)}…` : risk.title}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {relatedRiskIds && Object.keys(relatedRiskIds).length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-ink mb-3 flex items-center gap-1.5">
            <GitBranch size={13} strokeWidth={1.5} className="text-ink-faint" />
            风险关联网络
          </h4>
          <div className="space-y-2">
            {Object.entries(relatedRiskIds).map(([riskId, relatedIds]: [string, string[]]) => {
              const risk = result.risks.find((r) => r.id === riskId)
              if (!risk || relatedIds.length === 0) return null
              return (
                <div
                  key={riskId}
                  className="rounded-lg border border-rule bg-paper/[0.02] p-2.5 text-left"
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <button
                      type="button"
                      className={`px-2 py-0.5 rounded text-[11px] font-medium cursor-pointer hover:opacity-80 transition-opacity border-none ${
                        risk.level === 'critical'
                          ? 'bg-danger-bg text-danger'
                          : risk.level === 'warning'
                            ? 'bg-warning-bg text-warning'
                            : 'bg-success-bg text-success'
                      }`}
                      onClick={() => onSelectRisk(risk)}
                    >
                      {risk.title.length > 10 ? `${risk.title.substring(0, 10)}…` : risk.title}
                    </button>
                    <span className="text-[10px] text-ink-faint">关联风险</span>
                  </div>
                  <div className="flex flex-wrap gap-1 pl-1">
                    {relatedIds.map((relId: string) => {
                      const relRisk = result.risks.find((r) => r.id === relId)
                      if (!relRisk) return null
                      return (
                        <button
                          key={relId}
                          type="button"
                          className="px-1.5 py-0.5 rounded text-[10px] bg-paper-dark text-ink-muted cursor-pointer hover:text-ink transition-colors border border-rule/60"
                          onClick={() => onSelectRisk(relRisk)}
                        >
                          {relRisk.title.length > 8
                            ? `${relRisk.title.substring(0, 8)}…`
                            : relRisk.title}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {validationResults && validationResults.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-ink mb-3 flex items-center gap-1.5">
            <ScrollText size={13} strokeWidth={1.5} className="text-accent" />
            证据链验证结果
          </h4>
          <div className="space-y-2.5">
            {validationResults?.map((validation: ValidationResult) => {
              const risk = result.risks.find((r) => r.id === validation.riskId)
              if (!risk) return null
              return (
                <div
                  key={validation.riskId}
                  className="rounded-lg border border-rule bg-paper/[0.02] p-3 text-left"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        className={`px-2 py-0.5 rounded text-[11px] font-medium cursor-pointer hover:opacity-80 transition-opacity border-none ${
                          risk.level === 'critical'
                            ? 'bg-danger-bg text-danger'
                            : risk.level === 'warning'
                              ? 'bg-warning-bg text-warning'
                              : 'bg-success-bg text-success'
                        }`}
                        onClick={() => onSelectRisk(risk)}
                      >
                        {risk.title.length > 15 ? `${risk.title.substring(0, 15)}…` : risk.title}
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-ink-faint">
                        证据: {validation.evidenceCount}/{risk.sources.length}
                      </span>
                      {validation.confidence !== undefined && (
                        <ConfidenceBar confidence={validation.confidence} size="sm" />
                      )}
                    </div>
                  </div>
                  {validation.missingSources && validation.missingSources.length > 0 && (
                    <div className="text-[10px] text-warning mb-1.5">
                      <span className="font-medium">缺失证据来源：</span>
                      {validation.missingSources.join(', ')}
                    </div>
                  )}
                  {validation.conflicts && validation.conflicts.length > 0 && (
                    <div className="space-y-1">
                      {validation.conflicts.map((conflict: Conflict, idx: number) => (
                        <div
                          key={idx}
                          className="text-[10px] text-danger-bg bg-danger-bg/20 rounded px-2 py-1"
                        >
                          <span className="font-medium">冲突[{conflict.dimension}]</span>
                          <span className="ml-1">{conflict.conflictingSources.join(' vs ')}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
