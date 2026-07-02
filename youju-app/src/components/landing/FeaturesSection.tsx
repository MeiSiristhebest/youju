import { Gauge, Layers, ShieldCheck } from 'lucide-react'
import { AnimateIn } from '../ui/AnimateIn'
import { SectionTitle } from '../ui/SectionTitle'

const features = [
  {
    num: '01',
    title: '多源证据聚合',
    desc: '自动检索并整合不同来源的证据材料，建立完整的事实画像。支持文档、网页、音频等多种格式。',
    icon: <Layers size={22} strokeWidth={1.5} />,
    color: 'accent',
  },
  {
    num: '02',
    title: '智能冲突检测',
    desc: '交叉比对证据中的矛盾陈述与不一致信息，高亮标记潜在冲突点，辅助研判判断。',
    icon: <ShieldCheck size={22} strokeWidth={1.5} />,
    color: 'accent-secondary',
  },
  {
    num: '03',
    title: '增量式推理',
    desc: '采用逐步推理机制，每一步结论都可追溯至原始证据。透明、可控、可解释。',
    icon: <Gauge size={22} strokeWidth={1.5} />,
    color: 'accent-tertiary',
  },
]

const colorMap: Record<
  string,
  {
    text: string
    bg: string
    border: string
    hoverBg: string
    hoverText: string
    hoverBorder: string
    underline: string
  }
> = {
  accent: {
    text: 'text-accent',
    bg: 'bg-accent-bg',
    border: 'border-accent-faint',
    hoverBg: 'group-hover:bg-accent',
    hoverText: 'group-hover:text-paper',
    hoverBorder: 'group-hover:border-accent',
    underline: 'bg-accent',
  },
  'accent-secondary': {
    text: 'text-accent-secondary',
    bg: 'bg-accent-secondary-bg',
    border: 'border-accent-secondary-faint',
    hoverBg: 'group-hover:bg-accent-secondary',
    hoverText: 'group-hover:text-paper',
    hoverBorder: 'group-hover:border-accent-secondary',
    underline: 'bg-accent-secondary',
  },
  'accent-tertiary': {
    text: 'text-accent-tertiary',
    bg: 'bg-accent-tertiary-bg',
    border: 'border-accent-tertiary-faint',
    hoverBg: 'group-hover:bg-accent-tertiary',
    hoverText: 'group-hover:text-paper',
    hoverBorder: 'group-hover:border-accent-tertiary',
    underline: 'bg-accent-tertiary',
  },
}

export function FeaturesSection() {
  return (
    <section id="features" className="relative py-28 px-6 lg:px-10 border-t border-rule">
      <div className="max-w-7xl mx-auto">
        <AnimateIn>
          <SectionTitle
            eyebrow="核心能力"
            title="核心功能"
            description="三大核心能力，构建从证据到结论的完整推理链条"
          />
        </AnimateIn>

        <div className="grid md:grid-cols-3 gap-0 border-x border-t border-rule group-container">
          {features.map((f, i) => {
            const c = colorMap[f.color]
            return (
              <AnimateIn key={i} delay={i * 0.1}>
                <div
                  className={`relative p-8 lg:p-10 border-b border-rule md:border-b-0 md:border-r ${
                    i === 2 ? 'md:border-r-0' : ''
                  } transition-colors duration-500 ease-out hover:bg-paper-dark/60 group cursor-default`}
                >
                  <div className="flex items-start justify-between mb-8">
                    <div
                      className={`w-11 h-11 rounded-[2px] ${c.bg} ${c.border} border flex items-center justify-center ${c.text} ${c.hoverBg} ${c.hoverText} ${c.hoverBorder} group-hover:scale-105 transition-transform transition-colors duration-500 ease-out`}
                    >
                      {f.icon}
                    </div>
                    <span className="font-mono text-xs text-ink-faint group-hover:text-accent transition-colors duration-500">
                      {f.num}
                    </span>
                  </div>
                  <h3 className="font-display text-2xl font-medium mb-4 tracking-tight group-hover:tracking-normal transition-letter-spacing duration-500">
                    {f.title}
                  </h3>
                  <p className="text-sm text-ink-muted leading-relaxed">{f.desc}</p>
                  <div
                    className={`mt-8 h-px w-12 ${c.underline} origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-700 ease-out`}
                  />
                </div>
              </AnimateIn>
            )
          })}
        </div>
      </div>
    </section>
  )
}
