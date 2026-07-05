import { useGSAP } from '@gsap/react'
import { useRef } from 'react'
import { gsap } from '../../lib/gsap'
import { AnimatedCounter } from '../ui/AnimatedCounter'
import { SectionTitle } from '../ui/SectionTitle'

const stats = [
  {
    value: 7,
    suffix: '',
    label: '步 AI 推理流水线',
    description: '场景识别到报告生成的完整链路',
  },
  {
    value: 100,
    suffix: '%',
    label: '证据可溯源',
    description: '每条结论都能回到原文',
  },
  {
    value: 3,
    suffix: '+',
    label: '多源交叉验证',
    description: '聊天 / 合同 / 邮件 同步比对',
  },
  {
    value: 60,
    prefix: '<',
    suffix: 's',
    label: '平均分析耗时',
    description: '从上传到出报告，分钟级',
  },
]

export function StatsSection() {
  const sectionRef = useRef<HTMLElement>(null)

  useGSAP(
    () => {
      const cards = gsap.utils.toArray<HTMLElement>('[data-stat-card]')
      if (cards.length === 0) return

      gsap.from(cards, {
        y: 40,
        opacity: 0,
        stagger: 0.12,
        duration: 0.9,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: sectionRef.current,
          start: 'top 75%',
          once: true,
        },
      })
    },
    { scope: sectionRef },
  )

  return (
    <section ref={sectionRef} id="stats" className="relative py-24 lg:py-32 px-6 lg:px-12">
      <div className="mx-auto max-w-7xl">
        <SectionTitle
          variant="centered"
          eyebrow="BY THE NUMBERS"
          title="数据说话"
          description="核心指标基于 demo 场景测试，实际效果取决于材料数量和复杂度。"
        />

        <div className="mt-16 grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
          {stats.map((stat, i) => (
            <div
              key={stat.label}
              data-stat-card
              className="group relative rounded-lg border border-rule/50 bg-paper/40 backdrop-blur-md p-6 lg:p-8 transition-colors hover:border-accent/40"
            >
              <div className="font-display text-5xl lg:text-6xl font-light text-ink tracking-tight">
                <AnimatedCounter
                  value={stat.value}
                  prefix={stat.prefix}
                  suffix={stat.suffix}
                  duration={2}
                />
              </div>
              <div className="mt-4 text-sm font-medium text-ink">{stat.label}</div>
              <div className="mt-1 text-xs text-ink-muted leading-relaxed">{stat.description}</div>
              <div className="absolute top-0 right-0 text-[10px] font-mono text-ink-faint/40 p-2">
                0{i + 1}
              </div>
            </div>
          ))}
        </div>

        <p className="mt-8 text-center text-xs text-ink-faint">
          数据基于 demo 场景测试，实际效果取决于材料数量和复杂度
        </p>
      </div>
    </section>
  )
}
