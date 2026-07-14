import { CheckCircle2, Play, Sparkles, Upload, Zap } from 'lucide-react'
import { SCENARIOS } from '../../../constants/workspace'
import type { ScenarioType } from '../../../types'

interface ResultWelcomeProps {
  onLoadScenario?: (scenarioId: ScenarioType) => void
  onAddSource?: () => void
  onAnalyze?: () => void
  hasSources?: boolean
}

export function ResultWelcome({
  onLoadScenario,
  onAddSource,
  onAnalyze,
  hasSources = false,
}: ResultWelcomeProps) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 md:p-8 overflow-y-auto my-auto">
      <div className="w-full max-w-xl mx-auto">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-12 h-12 mb-4 rounded-lg bg-paper-dark text-ink border border-rule/60">
            <Sparkles size={22} strokeWidth={1.5} />
          </div>
          <h2 className="text-xl font-semibold text-ink mb-2 font-display tracking-tight">
            快速开始
          </h2>
          <p className="text-sm text-ink-faint max-w-sm mx-auto">
            多源证据交叉验证，帮你从碎片化信息中梳理事实、识别冲突
          </p>
        </div>

        <div className="mb-10">
          <h3 className="text-sm font-medium text-ink mb-4 px-1">使用流程</h3>
          <div className="space-y-1">
            {[
              {
                step: 1,
                icon: <Upload size={18} strokeWidth={1.5} />,
                title: '上传材料',
                desc: '聊天记录、文档、网页、截图，支持多种格式',
              },
              {
                step: 2,
                icon: <Zap size={18} strokeWidth={1.5} />,
                title: 'AI 自动分析',
                desc: '智能识别冲突、承诺缺失和潜在风险',
              },
              {
                step: 3,
                icon: <CheckCircle2 size={18} strokeWidth={1.5} />,
                title: '查看结论',
                desc: '每条结论都可溯源，证据链清晰可见',
              },
            ].map((item) => (
              <div
                key={item.step}
                className="flex items-center gap-3 px-3 py-3 rounded-md hover:bg-paper-dark/60 transition-colors"
              >
                <div className="w-8 h-8 rounded-md flex items-center justify-center shrink-0 bg-paper-dark text-ink-muted border border-rule/60">
                  {item.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-ink-faint tabular-nums">0{item.step}</span>
                    <span className="text-sm font-medium text-ink">{item.title}</span>
                  </div>
                  <p className="text-xs text-ink-faint mt-0.5">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 mb-10 px-1">
          {hasSources ? (
            <button
              type="button"
              onClick={onAnalyze}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium text-paper bg-accent hover:bg-accent-soft transition-colors"
            >
              <Play size={16} strokeWidth={1.5} />
              开始分析
            </button>
          ) : (
            <button
              type="button"
              onClick={onAddSource}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium text-paper bg-accent hover:bg-accent-soft transition-colors"
            >
              <Upload size={16} strokeWidth={1.5} />
              上传材料开始分析
            </button>
          )}
        </div>

        <div>
          <h3 className="text-sm font-medium text-ink mb-3 px-1">场景模板</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
            {SCENARIOS.filter((s) => s.featured).map((scenario) => {
              const Icon = scenario.iconComponent
              return (
                <button
                  key={scenario.id}
                  type="button"
                  onClick={() => onLoadScenario?.(scenario.id as ScenarioType)}
                  className="group flex items-start gap-3 p-3 rounded-md hover:bg-paper-dark/60 transition-colors text-left"
                >
                  <div className="w-9 h-9 rounded-md flex items-center justify-center shrink-0 bg-paper-dark text-ink-muted group-hover:text-accent group-hover:bg-accent-bg border border-rule/60 group-hover:border-accent-faint transition-colors">
                    <Icon size={18} strokeWidth={1.5} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h5 className="text-sm font-medium text-ink mb-0.5 truncate">
                      {scenario.name}
                    </h5>
                    <p className="text-xs text-ink-faint line-clamp-2 leading-relaxed">
                      {scenario.description}
                    </p>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
