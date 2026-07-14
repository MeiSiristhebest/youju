import type { Evidence } from '../../types'

interface ConflictCompareViewProps {
  risk: {
    title: string
    dimension?: string
    evidence: Evidence[]
  }
}

const TYPE_ICONS: Record<string, string> = {
  chat: '\uD83D\uDCAC',
  doc: '\uD83D\uDCC4',
  web: '\uD83C\uDF10',
  screenshot: '\uD83D\uDDBC',
  contract: '\uD83D\uDCDD',
}

export function ConflictCompareView({ risk }: ConflictCompareViewProps) {
  const { title, dimension, evidence } = risk

  return (
    <div className="bg-paper border border-rule rounded-xl overflow-hidden">
      {/* 头部 */}
      <div className="px-4 py-3 border-b border-rule flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-danger text-xs font-semibold">{title}</span>
          {dimension && (
            <span className="text-[10px] px-2 py-0.5 rounded bg-paper-dark text-ink-faint border border-rule">
              {dimension}
            </span>
          )}
        </div>
        <span className="text-[10px] text-danger px-2 py-0.5 rounded-full bg-danger-bg border border-danger-faint">
          冲突
        </span>
      </div>

      {/* 并排对比 */}
      <div className="p-4">
        {evidence.length < 2 ? (
          <div className="text-center py-4">
            <p className="text-[11px] text-ink-faint">证据不足，无法对比</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {evidence.map((ev, idx) => (
              <div key={idx} className="rounded-lg bg-danger-bg border border-danger-faint p-3">
                {/* 来源标识 */}
                <div className="flex items-center gap-1.5 mb-2">
                  <span className="text-xs">{TYPE_ICONS[ev.sourceType] || '\uD83D\uDCC4'}</span>
                  <span className="text-[11px] text-danger font-medium truncate">
                    {ev.sourceName}
                  </span>
                </div>

                {/* 引用内容 - 冲突高亮 */}
                <div className="bg-danger-bg border-l-2 border-danger pl-3 py-1.5">
                  <p className="text-[11px] text-ink-muted leading-relaxed italic">"{ev.quote}"</p>
                </div>

                {/* 置信度 */}
                {ev.confidence !== undefined && (
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-[10px] text-ink-faint">置信度</span>
                    <div className="flex items-center gap-1.5">
                      <div className="w-12 h-1 bg-paper-dark rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            ev.confidence < 0.5
                              ? 'bg-danger'
                              : ev.confidence < 0.8
                                ? 'bg-warning'
                                : 'bg-success'
                          }`}
                          style={{ width: `${ev.confidence * 100}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-ink-faint font-mono">
                        {Math.round(ev.confidence * 100)}%
                      </span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
