import { useGSAP } from '@gsap/react'
import { useRef } from 'react'
import { gsap } from '../../lib/gsap'
import { SectionTitle } from '../ui/SectionTitle'

const steps = [
  {
    num: '01',
    name: '场景识别',
    description: 'AI 自动识别材料类型（offer / 合同 / 卷宗 / 邮件），匹配最适配的分析框架。',
    tag: 'Scenario Discovery',
  },
  {
    num: '02',
    name: '输入解析',
    description: '解析 PDF / Word / 图片 / URL 多源材料，提取结构化文本与元数据。',
    tag: 'Input Parsing',
  },
  {
    num: '03',
    name: '维度提取',
    description: '从材料内容动态发现关键比对维度（金额 / 时间 / 责任 / 承诺），非预定义。',
    tag: 'Dimension Discovery',
  },
  {
    num: '04',
    name: '要素提取',
    description: '跨源提取每个维度的具体表述，保留原文片段供后续引用。',
    tag: 'Cross-Source Extract',
  },
  {
    num: '05',
    name: '冲突检测',
    description: '识别直接矛盾、未记录承诺、系统性缺失三类风险，附置信度评分。',
    tag: 'Conflict Detection',
  },
  {
    num: '06',
    name: '结果校验',
    description: '自检循环：AI 复核每条结论是否能在原文找到对应证据，不通过则重跑。',
    tag: 'Self-Check Loop',
  },
  {
    num: '07',
    name: '报告生成',
    description: '输出结构化结论 + 风险列表 + 证据链，每条判断可点击溯源到原文。',
    tag: 'Final Output',
  },
]

export function HowItWorksSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const lineRef = useRef<HTMLDivElement>(null)

  useGSAP(
    () => {
      const section = sectionRef.current
      const line = lineRef.current
      if (!section || !line) return

      // timeline 连线随滚动绘制
      gsap.to(line, {
        scaleY: 1,
        ease: 'none',
        scrollTrigger: {
          trigger: section,
          start: 'top 60%',
          end: 'bottom 80%',
          scrub: 1,
        },
      })

      // 每个步骤随滚动激活
      const stepEls = gsap.utils.toArray<HTMLElement>('[data-step]')
      stepEls.forEach((step) => {
        const num = step.querySelector('[data-step-num]')
        const content = step.querySelector('[data-step-content]')

        gsap.to(content ?? step, {
          x: 0,
          opacity: 1,
          duration: 0.8,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: step,
            start: 'top 80%',
            once: true,
          },
        })

        if (num) {
          gsap.to(num, {
            color: 'var(--accent)',
            scrollTrigger: {
              trigger: step,
              start: 'top 70%',
              end: 'bottom 70%',
              scrub: true,
            },
          })
        }
      })
    },
    { scope: sectionRef },
  )

  return (
    <section
      ref={sectionRef}
      id="how-it-works"
      className="relative py-24 lg:py-32 px-6 lg:px-12 bg-paper-dark/30"
    >
      <div className="mx-auto max-w-7xl">
        <SectionTitle
          variant="centered"
          eyebrow="THE PIPELINE"
          title="7 步推理流水线"
          description="从材料上传到报告生成，每一步可追溯、可重放、可干预。"
        />

        <div className="mt-20 relative">
          {/* timeline 连线 */}
          <div className="absolute left-[7px] lg:left-1/2 lg:-translate-x-1/2 top-2 bottom-2 w-px bg-rule">
            <div
              ref={lineRef}
              className="absolute inset-0 bg-accent origin-top"
              style={{ transform: 'scaleY(0)' }}
            />
          </div>

          <div className="space-y-12 lg:space-y-16">
            {steps.map((step, i) => (
              <div
                key={step.num}
                data-step
                className={`relative flex flex-col lg:flex-row gap-4 lg:gap-12 ${
                  i % 2 === 1 ? 'lg:flex-row-reverse' : ''
                }`}
              >
                {/* 编号节点 */}
                <div className="flex items-center gap-4 lg:flex-1 lg:items-start">
                  <div className="relative z-10 flex items-center justify-center w-4 h-4 rounded-full bg-paper border-2 border-rule">
                    <div className="w-1.5 h-1.5 rounded-full bg-accent" />
                  </div>
                  <div
                    data-step-num
                    className="font-mono text-xs tracking-widest text-ink-faint lg:hidden"
                  >
                    {step.num}
                  </div>
                </div>

                {/* 内容卡 */}
                <div
                  data-step-content
                  className={`lg:flex-1 gsap-reveal-right ${i % 2 === 1 ? 'lg:text-left' : 'lg:text-right'}`}
                >
                  <div className="inline-block max-w-md rounded-lg border border-rule/60 bg-paper/60 backdrop-blur-sm p-5 lg:p-6">
                    <div className="flex items-center justify-between gap-3 mb-2">
                      <div
                        data-step-num
                        className="font-mono text-xs tracking-widest text-ink-faint hidden lg:block"
                      >
                        {step.num}
                      </div>
                      <span className="text-[10px] font-mono uppercase tracking-wider text-accent/80 px-2 py-0.5 rounded-full border border-accent/30">
                        {step.tag}
                      </span>
                    </div>
                    <h3 className="font-display text-xl lg:text-2xl font-medium text-ink">
                      {step.name}
                    </h3>
                    <p className="mt-2 text-sm text-ink-muted leading-relaxed">
                      {step.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
