import { ChevronRight } from 'lucide-react'
import { AnimateIn } from '../ui/AnimateIn'
import { SectionTitle } from '../ui/SectionTitle'
import { Tag } from '../ui/Tag'

const scenes = [
  {
    tag: '法律合规',
    title: '案件事实梳理',
    desc: '从卷宗材料中快速提炼关键事实、时间线与争议焦点，辅助律师高效准备庭审。',
  },
  {
    tag: '学术研究',
    title: '文献综述分析',
    desc: '对比不同研究的结论与方法，识别共识与分歧，生成结构化的研究现状综述。',
  },
  {
    tag: '商业决策',
    title: '尽职调查辅助',
    desc: '整合多方信源对目标公司进行背景核查，识别潜在风险与不一致信息。',
  },
  {
    tag: '新闻调查',
    title: '事实核查报告',
    desc: '交叉验证多条信源的真实性与一致性，输出可溯源的事实核查结论。',
  },
]

export function ScenesSection() {
  return (
    <section
      id="scenes"
      className="relative py-28 px-6 lg:px-10 bg-paper-dark/30 border-y border-rule"
    >
      <div className="max-w-7xl mx-auto">
        <AnimateIn>
          <SectionTitle
            variant="centered"
            title="应用场景"
            description="适用于需要严谨事实判断的专业工作场景"
          />
        </AnimateIn>

        <div className="grid md:grid-cols-2 gap-0 border-x border-t border-rule">
          {scenes.map((scene, i) => (
            <AnimateIn key={i} delay={i * 0.08}>
              <div
                className={`relative p-8 lg:p-10 border-b border-rule md:border-r ${
                  i % 2 === 1 ? 'md:border-r-0' : ''
                } hover:bg-paper/60 transition-colors duration-300 group cursor-pointer`}
              >
                <div className="flex items-start justify-between mb-6">
                  <Tag variant="accent">{scene.tag}</Tag>
                  <ChevronRight
                    size={18}
                    className="text-ink-faint group-hover:text-accent group-hover:translate-x-1 transition-all duration-300"
                    strokeWidth={1.5}
                  />
                </div>
                <h3 className="font-display text-2xl font-medium mb-3 tracking-tight">
                  {scene.title}
                </h3>
                <p className="text-sm text-ink-muted leading-relaxed max-w-md">{scene.desc}</p>
              </div>
            </AnimateIn>
          ))}
        </div>
      </div>
    </section>
  )
}
