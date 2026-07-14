import { ArrowRight, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

// 按场景类型推荐的问题
const RECOMMENDED_QUESTIONS: Record<string, string[]> = {
  legal_case: [
    '请梳理案件的关键时间线',
    '双方的主要争议焦点是什么？',
    '有哪些事实存在矛盾或证据不足？',
  ],
  academic_research: [
    '这些文献的主要研究结论是什么？',
    '不同研究之间存在哪些分歧？',
    '请对比各文献的研究方法',
  ],
  due_diligence: [
    '目标公司存在哪些潜在风险？',
    '各方信息是否存在不一致？',
    '请总结尽职调查的关键发现',
  ],
  fact_check: ['哪些陈述之间存在矛盾？', '各信源的可信度如何？', '请交叉验证关键事实的一致性'],
  job_offer: [
    'HR 的口头承诺是否都体现在 Offer 中？',
    'Offer 中有哪些需要注意的条款？',
    '请对比聊天记录与正式 Offer 的差异',
  ],
  rental: [
    '中介承诺与合同条款是否一致？',
    '合同中有哪些不合理或缺失的条款？',
    '请对比聊天记录与租房合同的差异',
  ],
  homework: [
    '提交内容是否覆盖了所有作业要求？',
    '有哪些要求尚未满足？',
    '请对比作业要求与提交内容的差异',
  ],
  custom: ['请总结已上传素材的主要内容', '素材中存在哪些风险点？', '请对比多份文档的差异'],
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
