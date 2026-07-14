import {
  AlertTriangle,
  CheckCircle,
  FileCheck,
  FileText,
  LayoutGrid,
  Search,
  Sparkles,
  Target,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAnalysisStore } from '../../../stores'

const STEP_LABELS = [
  { name: '场景识别', desc: '分析材料类型和场景', icon: <Target size={16} strokeWidth={1.5} /> },
  { name: '材料解析', desc: '提取关键信息和要素', icon: <FileText size={16} strokeWidth={1.5} /> },
  { name: '维度提取', desc: '识别对比维度', icon: <LayoutGrid size={16} strokeWidth={1.5} /> },
  { name: '要素提取', desc: '提取各维度信息', icon: <Search size={16} strokeWidth={1.5} /> },
  {
    name: '冲突检测',
    desc: '检测不一致和风险',
    icon: <AlertTriangle size={16} strokeWidth={1.5} />,
  },
  { name: '结果校验', desc: '自我验证和修正', icon: <CheckCircle size={16} strokeWidth={1.5} /> },
  { name: '报告生成', desc: '生成最终分析报告', icon: <FileCheck size={16} strokeWidth={1.5} /> },
]

interface StepProgressStepperProps {
  onCancel?: () => void
}

export function StepProgressStepper({ onCancel }: StepProgressStepperProps) {
  const streaming = useAnalysisStore((state) => state.streaming)
  const streamProgress = useAnalysisStore((state) => state.streamProgress)
  const analysisStep = useAnalysisStore((state) => state.analysisStep)
  const streamError = useAnalysisStore((state) => state.streamError)

  const progressPercent =
    streamProgress || Math.min(100, Math.round((analysisStep + 1) * (100 / 7)))

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center max-w-md mx-auto h-full my-auto">
      <div className="w-16 h-16 rounded-2xl bg-accent-bg flex items-center justify-center text-accent mb-6 animate-pulse">
        <Sparkles size={32} />
      </div>
      <h3 className="text-base font-semibold text-ink mb-2">
        {streaming ? 'AI 正在分析证据材料…' : '正在解析并提取材料…'}
      </h3>
      <p className="text-xs text-ink-faint mb-6 leading-relaxed">
        有据正在调用底层的多源推理
        Pipeline，对您提供的聊天记录、文档和网页进行交叉要素比对，生成可溯源的排雷检查报告。
      </p>

      {/* 进度条 */}
      <div className="w-full bg-paper-dark h-1.5 rounded-full overflow-hidden mb-8 border border-rule/50">
        <div
          className="bg-accent h-full transition-all duration-300 ease-out"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* 步骤列表 */}
      <div className="w-full text-left space-y-4 mb-6">
        {STEP_LABELS.map((step, idx) => {
          const isActive = idx === analysisStep
          const isCompleted = idx < analysisStep
          const _isPending = idx > analysisStep

          return (
            <div
              key={step.name}
              className={cn(
                'flex items-start gap-3 p-3 rounded-lg border transition-all duration-300',
                isActive
                  ? 'bg-paper border-accent shadow-sm scale-[1.02]'
                  : 'bg-transparent border-transparent opacity-60',
              )}
            >
              <div
                className={cn(
                  'w-7 h-7 rounded-lg flex items-center justify-center shrink-0',
                  isCompleted
                    ? 'bg-success-bg text-success'
                    : isActive
                      ? 'bg-accent-bg text-accent animate-pulse'
                      : 'bg-paper-dark text-ink-faint',
                )}
              >
                {isCompleted ? <CheckCircle size={14} /> : step.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div
                  className={cn(
                    'text-xs font-semibold',
                    isActive ? 'text-accent' : isCompleted ? 'text-ink' : 'text-ink-muted',
                  )}
                >
                  {step.name}
                  {isActive && (
                    <span className="text-[10px] font-normal text-accent/80 ml-2">
                      运行中 ({Math.round(progressPercent)}%)
                    </span>
                  )}
                </div>
                <div className="text-[10px] text-ink-faint mt-0.5">{step.desc}</div>
              </div>
            </div>
          )
        })}
      </div>

      {streamError && (
        <div className="w-full p-3 rounded-lg bg-danger-bg/50 border border-danger/20 text-danger text-[11px] text-left mb-4 flex gap-2 items-start animate-fade-in">
          <AlertTriangle size={14} className="shrink-0 mt-0.5" />
          <div>{streamError}</div>
        </div>
      )}

      {onCancel && (
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border border-rule rounded-lg text-xs font-medium text-ink-muted hover:text-ink hover:bg-paper-dark transition-all duration-200"
        >
          取消分析
        </button>
      )}
    </div>
  )
}
