import { useGSAP } from '@gsap/react'
import { EyeOff, Lock, Shield, Trash2 } from 'lucide-react'
import { useRef } from 'react'
import { gsap } from '../../lib/gsap'

const features = [
  {
    icon: Lock,
    title: '端到端加密',
    description: '数据传输全程 TLS 加密，材料上传与分析结果均加密存储，第三方无法窃听。',
  },
  {
    icon: Shield,
    title: '数据隔离',
    description: '每个用户的数据独立隔离，互不可见。基于 user_id / session_id 的访问控制。',
  },
  {
    icon: Trash2,
    title: '自主删除',
    description: '随时一键删除分析记录与原始材料，删除后数据不留痕、不备份、不可恢复。',
  },
  {
    icon: EyeOff,
    title: '开源透明',
    description: '核心推理流程开源可审查，AI 提示词版本化管理，每条结论可溯源到具体步骤。',
  },
]

export function SecuritySection() {
  const sectionRef = useRef<HTMLElement>(null)

  useGSAP(
    () => {
      const cards = gsap.utils.toArray<HTMLElement>('[data-security-card]')
      if (cards.length === 0) return

      gsap.to(cards, {
        y: 0,
        opacity: 1,
        stagger: { each: 0.1, from: 'end' },
        duration: 0.8,
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
      id="security"
      className="relative py-24 lg:py-32 px-6 lg:px-12 bg-ink text-paper"
    >
      {/* 背景纹理 */}
      <div
        className="absolute inset-0 opacity-[0.04] pointer-events-none"
        style={{
          backgroundImage:
            'radial-gradient(circle at 30% 20%, var(--accent) 0%, transparent 50%), radial-gradient(circle at 70% 80%, var(--accent) 0%, transparent 50%)',
        }}
      />

      <div className="relative mx-auto max-w-7xl">
        <div className="text-center mb-16">
          <span className="text-[11px] font-mono tracking-[0.2em] uppercase text-accent">
            — SECURITY & PRIVACY
          </span>
          <h2 className="mt-4 font-display text-4xl lg:text-5xl font-medium tracking-tight text-balance">
            你的数据，归你所有
          </h2>
          <p className="mt-5 text-sm text-paper/70 leading-relaxed max-w-2xl mx-auto">
            我们采用业界标准的安全措施保护你的数据，并承诺不收集、不出售、不用于训练。
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-5 lg:gap-6">
          {features.map((f) => {
            const Icon = f.icon
            return (
              <div
                key={f.title}
                data-security-card
                className="gsap-reveal rounded-lg border border-paper/15 bg-paper/5 backdrop-blur-sm p-6 lg:p-8"
              >
                <div className="flex items-start gap-4">
                  <div className="shrink-0 w-11 h-11 rounded-md bg-accent/15 flex items-center justify-center text-accent">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-display text-lg font-medium text-paper">{f.title}</h3>
                    <p className="mt-2 text-sm text-paper/70 leading-relaxed">{f.description}</p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        <p className="mt-12 text-center text-sm text-paper/60 italic">
          我们不会收集、出售或用于训练你的任何数据
        </p>
      </div>
    </section>
  )
}
