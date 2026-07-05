import { useGSAP } from '@gsap/react'
import { useRef } from 'react'
import { gsap } from '../../lib/gsap'

const principles = [
  {
    num: 'Ⅰ',
    title: '证据优先',
    desc: '一切结论基于证据。没有证据支持的判断不进入最终报告。每一条陈述都可溯源至原始出处。',
  },
  {
    num: 'Ⅱ',
    title: '增量审慎',
    desc: '推理逐步推进，每一步只在证据充分时得出阶段性结论。宁可悬置判断，不做无根据的推测。',
  },
  {
    num: 'Ⅲ',
    title: '透明可控',
    desc: '完整展示推理链路与置信度评估。用户可审查每一步逻辑，随时介入调整方向与权重。',
  },
]

export function PrinciplesSection() {
  const sectionRef = useRef<HTMLElement>(null)

  useGSAP(
    () => {
      // 背景大字视差：随滚动 y 偏移
      gsap.to('[data-principle-bg-text]', {
        y: -120,
        ease: 'none',
        scrollTrigger: {
          trigger: sectionRef.current,
          start: 'top bottom',
          end: 'bottom top',
          scrub: 1,
        },
      })

      // 原则逐条揭示
      gsap.from('[data-principle]', {
        y: 40,
        opacity: 0,
        stagger: 0.15,
        duration: 0.8,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: '[data-principles-list]',
          start: 'top 80%',
          once: true,
        },
      })
    },
    { scope: sectionRef },
  )

  return (
    <section
      ref={sectionRef}
      id="principle"
      className="relative py-28 px-6 lg:px-10 overflow-hidden"
    >
      {/* 背景大字 */}
      <div
        data-principle-bg-text
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 flex items-center justify-center z-0 select-none"
      >
        <span className="font-display text-[20rem] lg:text-[28rem] text-ink/[0.03] font-bold leading-none">
          有据
        </span>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-5 gap-16">
          {/* 左侧 sticky 标题 */}
          <div className="lg:col-span-2 lg:sticky lg:top-32 lg:self-start">
            <span className="text-[11px] font-mono tracking-[0.2em] uppercase text-accent">
              — 我们的信念
            </span>
            <h2 className="mt-4 font-display text-4xl lg:text-5xl font-medium tracking-tight leading-tight">
              设计原则
            </h2>
            <div className="mt-8 h-px w-16 bg-accent" />
            <p className="mt-6 text-sm text-ink-muted leading-relaxed max-w-xs">
              我们相信事实的可靠性来自严谨的过程。三条原则贯穿每一行代码与每一次推理。
            </p>
          </div>

          {/* 右侧原则列表 */}
          <div data-principles-list className="lg:col-span-3 space-y-10">
            {principles.map((principle, i) => (
              <div
                key={i}
                data-principle
                className="flex gap-6 pb-10 border-b border-rule last:border-b-0 last:pb-0"
              >
                <span className="font-display text-3xl text-accent font-light leading-none mt-1">
                  {principle.num}
                </span>
                <div>
                  <h3 className="font-display text-2xl font-medium mb-3 tracking-tight">
                    {principle.title}
                  </h3>
                  <p className="text-ink-muted leading-relaxed">{principle.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
