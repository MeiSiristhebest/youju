import { CheckCircle, Sparkles, Upload, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'
import { SCENARIOS } from '../../../constants/workspace'
import type { ScenarioType } from '../../../types'
import { MagneticButton } from '../../ui/MagneticButton'

interface ResultWelcomeProps {
  onLoadScenario?: (scenarioId: ScenarioType) => void
  onAddSource?: () => void
}

export function ResultWelcome({ onLoadScenario, onAddSource }: ResultWelcomeProps) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 md:p-8 overflow-y-auto my-auto">
      <div className="w-full max-w-lg mx-auto">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 mb-4 rounded-2xl bg-gradient-to-br from-accent to-accent-tertiary text-paper border border-accent/20">
            <Sparkles size={28} strokeWidth={1.5} />
          </div>
          <div className="text-[10px] font-mono text-accent tracking-widest uppercase mb-2">
            欢迎使用有据
          </div>
          <h2 className="text-xl sm:text-2xl font-semibold text-ink mb-2 font-display tracking-tight">
            3 步开始你的分析
          </h2>
          <p className="text-xs text-ink-faint max-w-sm mx-auto leading-relaxed">
            多源证据交叉验证，帮你从碎片化信息中梳理事实、识别冲突
          </p>
        </div>

        <div className="space-y-3 mb-8 text-left">
          {[
            {
              step: 1,
              icon: <Upload size={18} strokeWidth={1.5} />,
              title: '上传材料',
              desc: '聊天记录、文档、网页、截图，支持多种格式',
              color: 'bg-accent-bg text-accent border-accent-faint',
            },
            {
              step: 2,
              icon: <Zap size={18} strokeWidth={1.5} />,
              title: 'AI 自动分析',
              desc: '智能识别冲突、承诺缺失和潜在风险',
              color: 'bg-warning-bg text-warning border-warning/20',
            },
            {
              step: 3,
              icon: <CheckCircle size={18} strokeWidth={1.5} />,
              title: '查看结论',
              desc: '每条结论都可溯源，证据链清晰可见',
              color: 'bg-success-bg text-success border-success/20',
            },
          ].map((item) => (
            <div
              key={item.step}
              className="flex items-start gap-3 p-3 sm:p-4 rounded-xl bg-paper-dark/40 border border-rule/50 hover:border-rule transition-all duration-300"
            >
              <div
                className={cn(
                  'w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border',
                  item.color,
                )}
              >
                {item.icon}
              </div>
              <div className="flex-1 min-w-0 pt-0.5">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-mono text-ink-faint">0{item.step}</span>
                  <h4 className="text-sm font-medium text-ink">{item.title}</h4>
                </div>
                <p className="text-xs text-ink-faint leading-relaxed">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mb-8">
          <MagneticButton
            variant="primary"
            size="md"
            onClick={() => onLoadScenario?.('legal_case')}
            iconLeft={<Sparkles size={16} strokeWidth={1.5} />}
            className="w-full bg-gradient-to-r from-accent to-accent-tertiary border-none hover:opacity-90 shadow-lg shadow-accent/20 rounded-xl h-auto py-3"
            strength={0.3}
            radius={100}
          >
            快速体验
          </MagneticButton>
          <MagneticButton
            variant="secondary"
            size="md"
            onClick={onAddSource}
            iconLeft={<Upload size={16} strokeWidth={1.5} />}
            className="w-full rounded-xl h-auto py-3 hover:bg-ink hover:text-paper"
            strength={0.3}
            radius={100}
          >
            自己上传材料
          </MagneticButton>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="flex-1 h-px bg-rule/60" />
            <span className="text-[10px] font-mono text-ink-faint tracking-wider uppercase">
              场景模板
            </span>
            <div className="flex-1 h-px bg-rule/60" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
            {SCENARIOS.filter((s) => s.featured).map((scenario) => {
              const Icon = scenario.iconComponent
              return (
                <button
                  key={scenario.id}
                  type="button"
                  onClick={() => onLoadScenario?.(scenario.id as ScenarioType)}
                  className="group p-3 sm:p-4 rounded-xl bg-paper-dark/30 border border-rule/50 hover:border-accent/50 hover:bg-accent-bg/20 cursor-pointer transition-all duration-200 text-left"
                >
                  <div className="w-8 h-8 rounded-lg bg-paper-dark border border-rule/60 flex items-center justify-center text-ink-muted group-hover:text-accent group-hover:bg-accent-bg group-hover:border-accent-faint transition-all duration-200 mb-2">
                    <Icon size={16} strokeWidth={1.5} />
                  </div>
                  <h5 className="text-xs font-medium text-ink mb-1 truncate">{scenario.name}</h5>
                  <p className="text-[10px] text-ink-faint line-clamp-2 leading-relaxed">
                    {scenario.description}
                  </p>
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
