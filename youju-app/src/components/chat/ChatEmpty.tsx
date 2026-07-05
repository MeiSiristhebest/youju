import { ArrowRight, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

// 按场景类型推荐的问题
const RECOMMENDED_QUESTIONS: Record<string, string[]> = {
  contract: [
    '这份合同的关键风险是什么？',
    '合同中有哪些不合理的条款？',
    '请对比甲乙双方的权利义务',
  ],
  tender: ['投标文件是否响应了所有招标要求？', '有哪些潜在的废标风险？', '请对比技术参数偏离表'],
  report: ['报告中提到的关键数据有哪些？', '请总结报告的主要结论', '报告中存在哪些数据矛盾？'],
}

// 默认推荐问题（无 scenarioType 时）
const DEFAULT_QUESTIONS = [
  '请总结已上传素材的主要内容',
  '素材中存在哪些风险点？',
  '请对比多份文档的差异',
]

interface ChatEmptyProps {
  onPickQuestion?: (question: string) => void
  scenarioType?: string
  className?: string
}

export function ChatEmpty({ onPickQuestion, scenarioType, className }: ChatEmptyProps) {
  // 按 scenarioType 动态选择推荐问题，无匹配时使用默认
  const questions = (scenarioType && RECOMMENDED_QUESTIONS[scenarioType]) || DEFAULT_QUESTIONS

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center px-6 py-10 w-full h-full',
        className,
      )}
    >
      {/* 图标 */}
      <div className="w-16 h-16 mb-5 rounded-2xl bg-paper-dark border border-rule/60 flex items-center justify-center text-accent">
        <Sparkles size={32} strokeWidth={1.2} />
      </div>

      {/* 标题 */}
      <h3 className="text-lg font-display font-medium text-ink tracking-tight mb-2">
        开始与 AI 对话
      </h3>

      {/* 副标题：引导用户选择素材后提问 */}
      <p className="text-sm text-ink-muted leading-relaxed max-w-sm mb-8">
        选择素材后开始提问，AI 将基于文档内容回答
      </p>

      {/* 推荐问题卡片 */}
      <div className="w-full max-w-md space-y-2">
        {questions.map((question) => (
          <button
            key={question}
            type="button"
            onClick={() => onPickQuestion?.(question)}
            className="group w-full flex items-center justify-between gap-3 px-4 py-3 text-left text-sm text-ink-muted bg-paper border border-rule rounded-lg hover:border-accent/40 hover:bg-paper-dark/50 hover:text-ink transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
            aria-label={`提问：${question}`}
          >
            <span className="flex-1">{question}</span>
            <ArrowRight
              size={14}
              strokeWidth={1.5}
              className="shrink-0 text-ink-faint group-hover:text-accent transition-colors"
            />
          </button>
        ))}
      </div>
    </div>
  )
}
