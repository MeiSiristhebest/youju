import { AnimateIn } from '../ui/AnimateIn'

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
  return (
    <section id="principle" className="relative py-28 px-6 lg:px-10">
      <div className="max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-5 gap-16">
          <AnimateIn>
            <div className="lg:col-span-2">
              <span className="text-[11px] font-mono tracking-[0.2em] uppercase text-accent">
                — 我们的信念
              </span>
              <h2 className="mt-4 font-display text-4xl lg:text-5xl font-medium tracking-tight leading-tight">
                设计原则
              </h2>
              <div className="mt-8 h-px w-16 bg-accent" />
            </div>
          </AnimateIn>

          <div className="lg:col-span-3 space-y-10">
            {principles.map((principle, i) => (
              <AnimateIn key={i} delay={i * 0.12}>
                <div className="flex gap-6 pb-10 border-b border-rule last:border-b-0 last:pb-0">
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
              </AnimateIn>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
