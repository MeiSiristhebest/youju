import { useGSAP } from '@gsap/react'
import { CheckCircle2, FileText, Gauge, Layers, MessageSquare, ShieldCheck } from 'lucide-react'
import { useRef } from 'react'
import { gsap } from '../../lib/gsap'
import { SectionTitle } from '../ui/SectionTitle'

export function FeaturesSection() {
  const sectionRef = useRef<HTMLElement>(null)

  useGSAP(
    () => {
      const cards = gsap.utils.toArray<HTMLElement>('[data-bento-card]')
      if (cards.length === 0) return

      gsap.to(cards, {
        y: 0,
        opacity: 1,
        stagger: { each: 0.15, from: 'start' },
        duration: 0.9,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: sectionRef.current,
          start: 'top 70%',
          once: true,
        },
      })
    },
    { scope: sectionRef },
  )

  return (
    <section
      ref={sectionRef}
      id="features"
      className="relative py-24 lg:py-32 px-6 lg:px-12 border-t border-rule"
    >
      <div className="mx-auto max-w-7xl">
        <SectionTitle
          eyebrow="核心能力"
          title="三大核心能力"
          description="从证据聚合到冲突检测再到增量推理，构建从材料到结论的完整推理链条。"
        />

        {/* Bento Grid */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6 auto-rows-[minmax(200px,auto)]">
          {/* 大卡片 2x2：多源证据聚合 + 内嵌材料列表 */}
          <div
            data-bento-card
            className="md:col-span-2 md:row-span-2 group relative rounded-lg border border-rule/60 bg-paper/60 p-6 lg:p-8 transition-colors hover:border-accent/40 overflow-hidden gsap-reveal"
          >
            <div className="flex items-start justify-between mb-6">
              <div className="w-12 h-12 rounded-md bg-accent-bg text-accent border border-accent-faint flex items-center justify-center">
                <Layers className="w-5 h-5" strokeWidth={1.5} />
              </div>
              <span className="font-mono text-xs text-ink-faint">01</span>
            </div>

            <h3 className="font-display text-2xl lg:text-3xl font-medium text-ink mb-3">
              多源证据聚合
            </h3>
            <p className="text-sm text-ink-muted leading-relaxed max-w-md">
              上传聊天记录、合同文档、邮件截图，AI 自动解析并提取关键信息。支持文本、PDF、图片、URL
              多种格式。
            </p>

            {/* 内嵌材料列表演示 */}
            <div className="mt-6 space-y-2">
              <div className="flex items-center gap-3 p-3 rounded-md bg-paper-dark/50 border border-rule/40">
                <div className="shrink-0 w-8 h-8 rounded bg-accent-secondary-bg text-accent-secondary flex items-center justify-center">
                  <MessageSquare className="w-4 h-4" strokeWidth={1.5} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-ink truncate">HR 微信聊天记录.png</div>
                  <div className="text-[10px] font-mono text-ink-faint">图片 · 156KB · 已解析</div>
                </div>
                <CheckCircle2 className="w-4 h-4 text-accent" />
              </div>

              <div className="flex items-center gap-3 p-3 rounded-md bg-paper-dark/50 border border-rule/40">
                <div className="shrink-0 w-8 h-8 rounded bg-accent-bg text-accent flex items-center justify-center">
                  <FileText className="w-4 h-4" strokeWidth={1.5} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-ink truncate">劳动合同.pdf</div>
                  <div className="text-[10px] font-mono text-ink-faint">PDF · 2.3MB · 已解析</div>
                </div>
                <CheckCircle2 className="w-4 h-4 text-accent" />
              </div>

              <div className="flex items-center gap-3 p-3 rounded-md bg-warning-bg/30 border border-warning/30">
                <div className="shrink-0 w-8 h-8 rounded bg-warning/15 text-warning flex items-center justify-center">
                  <FileText className="w-4 h-4" strokeWidth={1.5} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-ink truncate">offer 邮件.eml</div>
                  <div className="text-[10px] font-mono text-warning">邮件 · 89KB · 含冲突</div>
                </div>
                <span className="text-[10px] font-mono text-warning">!</span>
              </div>
            </div>
          </div>

          {/* 中卡片 1x2：智能冲突检测 + 内嵌冲突高亮 */}
          <div
            data-bento-card
            className="md:col-span-1 md:row-span-2 group relative rounded-lg border border-rule/60 bg-paper/60 p-6 lg:p-8 transition-colors hover:border-accent-secondary/40 overflow-hidden gsap-reveal"
          >
            <div className="flex items-start justify-between mb-6">
              <div className="w-12 h-12 rounded-md bg-accent-secondary-bg text-accent-secondary border border-accent-secondary-faint flex items-center justify-center">
                <ShieldCheck className="w-5 h-5" strokeWidth={1.5} />
              </div>
              <span className="font-mono text-xs text-ink-faint">02</span>
            </div>

            <h3 className="font-display text-xl lg:text-2xl font-medium text-ink mb-3">
              智能冲突检测
            </h3>
            <p className="text-sm text-ink-muted leading-relaxed">
              自动识别口头承诺与书面合同的矛盾、时间线冲突、信息缺失，标记每一处风险点。
            </p>

            {/* 内嵌冲突高亮文本 */}
            <div className="mt-6 space-y-3">
              <div className="p-3 rounded-md bg-warning-bg/40 border border-warning/20">
                <div className="text-[9px] font-mono text-warning uppercase tracking-wider mb-1">
                  聊天记录
                </div>
                <p className="text-xs text-ink leading-snug">
                  "年终奖按 <span className="bg-warning/30 px-1 rounded">2 个月</span>发放"
                </p>
              </div>

              <div className="text-center text-[10px] font-mono text-ink-faint">⋮ vs ⋮</div>

              <div className="p-3 rounded-md bg-danger-bg/30 border border-danger/20">
                <div className="text-[9px] font-mono text-danger uppercase tracking-wider mb-1">
                  合同条款
                </div>
                <p className="text-xs text-ink-muted leading-snug">
                  <span className="bg-danger/20 px-1 rounded line-through decoration-danger/50">
                    年终奖
                  </span>{' '}
                  未在合同中体现
                </p>
              </div>
            </div>
          </div>

          {/* 宽卡片 3x1：增量式推理 + 内嵌 7 步进度条 */}
          <div
            data-bento-card
            className="md:col-span-3 group relative rounded-lg border border-rule/60 bg-paper/60 p-6 lg:p-8 transition-colors hover:border-accent-tertiary/40 overflow-hidden gsap-reveal"
          >
            <div className="flex flex-col lg:flex-row gap-6 lg:gap-12">
              <div className="lg:w-1/3">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 rounded-md bg-accent-tertiary-bg text-accent-tertiary border border-accent-tertiary-faint flex items-center justify-center">
                    <Gauge className="w-5 h-5" strokeWidth={1.5} />
                  </div>
                  <span className="font-mono text-xs text-ink-faint">03</span>
                </div>

                <h3 className="font-display text-xl lg:text-2xl font-medium text-ink mb-3">
                  增量式推理
                </h3>
                <p className="text-sm text-ink-muted leading-relaxed">
                  7 步推理流水线：场景识别 → 输入解析 → 维度提取 → 要素提取 → 冲突检测 → 结果校验 →
                  报告生成。每步可追溯。
                </p>
              </div>

              {/* 内嵌 7 步进度条 */}
              <div className="lg:flex-1 grid grid-cols-7 gap-1.5">
                {['场景', '解析', '维度', '要素', '冲突', '校验', '报告'].map((step, i) => (
                  <div key={step} className="group/step relative flex flex-col items-center">
                    <div
                      className="w-full h-1.5 rounded-full bg-rule group-hover/step:bg-accent-tertiary transition-colors step-glow-bar"
                      style={{ animationDelay: `${i * 0.3}s` }}
                    />
                    <div className="mt-2 text-[9px] font-mono text-ink-faint group-hover/step:text-ink transition-colors">
                      {step}
                    </div>
                    <div className="text-[8px] font-mono text-ink-faint/60">0{i + 1}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* step-glow 统一动画 */}
      <style>{`
        @keyframes step-glow { 0%, 100% { opacity: 0.4; } 50% { opacity: 1; } }
        .step-glow-bar { animation: step-glow 3s ease-in-out infinite; }
      `}</style>
    </section>
  )
}
