import { useGSAP } from '@gsap/react'
import {
  ArrowRight,
  BookOpen,
  Briefcase,
  ChevronRight,
  Gavel,
  GraduationCap,
  Home,
  Newspaper,
} from 'lucide-react'
import { useRef } from 'react'
import { gsap } from '../../lib/gsap'
import { SectionTitle } from '../ui/SectionTitle'
import { Tag } from '../ui/Tag'

interface Scene {
  tag: string
  title: string
  desc: string
  icon: React.ReactNode
}

interface SceneCategory {
  name: string
  description: string
  scenes: Scene[]
}

const sceneCategories: SceneCategory[] = [
  {
    name: '专业场景',
    description: '适用于需要严谨事实判断的专业工作场景',
    scenes: [
      {
        tag: '法律合规',
        title: '案件事实梳理',
        desc: '从卷宗材料中快速提炼关键事实、时间线与争议焦点，辅助律师高效准备庭审。',
        icon: <Gavel size={22} strokeWidth={1.5} />,
      },
      {
        tag: '学术研究',
        title: '文献综述分析',
        desc: '对比不同研究的结论与方法，识别共识与分歧，生成结构化的研究现状综述。',
        icon: <BookOpen size={22} strokeWidth={1.5} />,
      },
      {
        tag: '商业决策',
        title: '尽职调查辅助',
        desc: '整合多方信源对目标公司进行背景核查，识别潜在风险与不一致信息。',
        icon: <Briefcase size={22} strokeWidth={1.5} />,
      },
      {
        tag: '新闻调查',
        title: '事实核查报告',
        desc: '交叉验证多条信源的真实性与一致性，输出可溯源的事实核查结论。',
        icon: <Newspaper size={22} strokeWidth={1.5} />,
      },
    ],
  },
  {
    name: '个人事务',
    description: '日常生活中需要核对信息一致性的实用场景',
    scenes: [
      {
        tag: '求职 Offer',
        title: '求职 Offer 确认',
        desc: '核对 HR 口头承诺与正式 Offer、劳动合同是否一致，避免入职踩坑。',
        icon: <Briefcase size={22} strokeWidth={1.5} />,
      },
      {
        tag: '租房签约',
        title: '租房签约审核',
        desc: '核对中介口头承诺与合同条款的差异，保障租房权益不受损。',
        icon: <Home size={22} strokeWidth={1.5} />,
      },
      {
        tag: '作业核查',
        title: '作业要求核查',
        desc: '对照作业要求检查提交内容的完整性，确保不遗漏关键要求。',
        icon: <GraduationCap size={22} strokeWidth={1.5} />,
      },
    ],
  },
]

interface ScenesSectionProps {
  onStart: () => void
}

export function ScenesSection({ onStart }: ScenesSectionProps) {
  const sectionRef = useRef<HTMLElement>(null)

  useGSAP(
    () => {
      const cards = gsap.utils.toArray<HTMLElement>('[data-scene-card]')
      if (cards.length === 0) return

      gsap.to(cards, {
        y: 0,
        opacity: 1,
        stagger: { each: 0.1, from: 'start' },
        duration: 0.8,
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
    <section
      ref={sectionRef}
      id="scenes"
      className="relative py-28 px-6 lg:px-10 bg-paper-dark/30 border-y border-rule"
    >
      <div className="max-w-7xl mx-auto">
        <SectionTitle
          variant="centered"
          eyebrow="SCENES"
          title="应用场景"
          description="从专业工作到日常生活，让每一个判断都有据可查"
        />

        <div className="space-y-20 mt-16">
          {sceneCategories.map((category, ci) => (
            <div key={category.name}>
              <div className="flex items-end justify-between mb-8">
                <div>
                  <div className="flex items-center gap-3">
                    <span className="text-[11px] font-mono tracking-[0.2em] uppercase text-accent">
                      0{ci + 1}
                    </span>
                    <span className="h-px w-8 bg-rule" />
                    <h3 className="font-display text-2xl font-medium tracking-tight">
                      {category.name}
                    </h3>
                  </div>
                  <p className="mt-3 text-sm text-ink-muted">{category.description}</p>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-0 border-x border-t border-rule">
                {category.scenes.map((scene, si) => (
                  <div
                    key={si}
                    data-scene-card
                    className={`relative p-8 lg:p-10 border-b border-rule md:border-r group cursor-pointer transition-all duration-300 hover:bg-paper/60 hover:-translate-y-1 hover:shadow-lg gsap-reveal ${
                      si % 2 === 1 ||
                      (category.scenes.length % 2 === 1 && si === category.scenes.length - 1)
                        ? 'md:border-r-0'
                        : ''
                    }`}
                  >
                    <div className="flex items-start justify-between mb-6">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-[2px] bg-accent-bg border border-accent-faint flex items-center justify-center text-accent group-hover:bg-accent group-hover:text-paper group-hover:border-accent transition-all duration-300 group-hover:scale-110 group-hover:-rotate-3">
                          {scene.icon}
                        </div>
                        <Tag variant="accent">{scene.tag}</Tag>
                      </div>
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
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* 底部 accent 下划线 + 暗示文字 */}
        <div className="mt-20 flex flex-col items-center gap-4">
          <div className="h-px w-16 bg-accent" />
          <button
            type="button"
            onClick={onStart}
            className="inline-flex items-center gap-2 text-sm text-ink-muted hover:text-accent transition-colors"
          >
            上传材料，开始分析
            <ArrowRight size={14} strokeWidth={1.5} />
          </button>
        </div>
      </div>
    </section>
  )
}
