import { useGSAP } from '@gsap/react'
import { Check, X } from 'lucide-react'
import { useRef } from 'react'
import { gsap } from '../../lib/gsap'
import { SectionTitle } from '../ui/SectionTitle'

const comparisons = [
  {
    aspect: '信息梳理',
    traditional: '逐页阅读、人工摘录、依赖经验',
    youju: 'AI 自动提取关键要素，结构化呈现',
  },
  {
    aspect: '冲突检测',
    traditional: '肉眼比对，遗漏多、易疲劳',
    youju: '7 步交叉验证，标记每一处风险点',
  },
  {
    aspect: '证据溯源',
    traditional: '难以回溯原文，结论与证据脱节',
    youju: '每条结论可点击溯源到原文位置',
  },
  {
    aspect: '时间成本',
    traditional: '数小时甚至数天',
    youju: '分钟级完成',
  },
  {
    aspect: '风险覆盖',
    traditional: '依赖个人经验，维度有限',
    youju: '从材料内容动态发现维度，系统化覆盖',
  },
  {
    aspect: '协作分享',
    traditional: '口头沟通、截图粘贴',
    youju: '可导出结构化报告，附带证据链',
  },
]

export function ComparisonSection() {
  const sectionRef = useRef<HTMLElement>(null)

  useGSAP(
    () => {
      const leftCol = sectionRef.current?.querySelector('[data-col-left]')
      const rightCol = sectionRef.current?.querySelector('[data-col-right]')
      const vsBadge = sectionRef.current?.querySelector('[data-vs]')
      const rows = gsap.utils.toArray<HTMLElement>('[data-compare-row]')

      if (leftCol) {
        gsap.to(leftCol, {
          x: 0,
          opacity: 1,
          duration: 1,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: sectionRef.current,
            start: 'top 70%',
            once: true,
          },
        })
      }

      if (rightCol) {
        gsap.to(rightCol, {
          x: 0,
          opacity: 1,
          duration: 1,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: sectionRef.current,
            start: 'top 70%',
            once: true,
          },
        })
      }

      if (vsBadge) {
        gsap.to(vsBadge, {
          scale: 1,
          rotate: 0,
          opacity: 1,
          duration: 0.8,
          ease: 'back.out(1.7)',
          delay: 0.3,
          scrollTrigger: {
            trigger: sectionRef.current,
            start: 'top 70%',
            once: true,
          },
        })
      }

      if (rows.length > 0) {
        gsap.to(rows, {
          y: 0,
          opacity: 1,
          stagger: 0.08,
          duration: 0.6,
          ease: 'power3.out',
          delay: 0.4,
          scrollTrigger: {
            trigger: sectionRef.current,
            start: 'top 60%',
            once: true,
          },
        })
      }
    },
    { scope: sectionRef },
  )

  return (
    <section ref={sectionRef} id="comparison" className="relative py-24 lg:py-32 px-6 lg:px-12">
      <div className="mx-auto max-w-7xl">
        <SectionTitle
          variant="centered"
          eyebrow="BEFORE / AFTER"
          title="传统方式 vs 有据"
          description="同一份材料，不同方法，结果差异一目了然。"
        />

        <div className="mt-16 grid lg:grid-cols-2 gap-6 lg:gap-12 relative">
          {/* VS 装饰 */}
          <div
            data-vs
            style={{ opacity: 0, transform: 'scale(0) rotate(-15deg)' }}
            className="hidden lg:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 w-16 h-16 rounded-full bg-paper border-2 border-accent items-center justify-center font-display text-2xl font-medium text-accent rotate-[-5deg]"
          >
            VS
          </div>

          {/* 左列：传统方式 */}
          <div
            data-col-left
            className="gsap-reveal-left rounded-lg border border-rule/50 bg-paper-dark/40 p-6 lg:p-8"
          >
            <div className="flex items-center gap-2 mb-6">
              <span className="text-xs font-mono tracking-widest text-ink-faint uppercase">
                Traditional
              </span>
              <div className="flex-1 h-px bg-rule" />
            </div>
            <h3 className="font-display text-2xl font-medium text-ink-muted mb-6">传统方式</h3>
            <div className="space-y-3">
              {comparisons.map((c, i) => (
                <div
                  key={c.aspect}
                  data-compare-row
                  className="gsap-reveal flex items-start gap-3 py-2"
                >
                  <div className="shrink-0 w-5 h-5 rounded-full bg-danger/10 flex items-center justify-center mt-0.5">
                    <X className="w-3 h-3 text-danger" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-mono text-ink-faint">
                      0{i + 1} · {c.aspect}
                    </div>
                    <div className="text-sm text-ink-muted leading-relaxed mt-0.5">
                      {c.traditional}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 右列：有据 */}
          <div
            data-col-right
            className="gsap-reveal-right rounded-lg border-2 border-accent/40 bg-accent-bg/30 p-6 lg:p-8 relative"
          >
            <div className="flex items-center gap-2 mb-6">
              <span className="text-xs font-mono tracking-widest text-accent uppercase">YOUJU</span>
              <div className="flex-1 h-px bg-accent/30" />
            </div>
            <h3 className="font-display text-2xl font-medium text-ink mb-6">有据</h3>
            <div className="space-y-3">
              {comparisons.map((c, i) => (
                <div
                  key={c.aspect}
                  data-compare-row
                  className="gsap-reveal flex items-start gap-3 py-2"
                >
                  <div className="shrink-0 w-5 h-5 rounded-full bg-accent/15 flex items-center justify-center mt-0.5">
                    <Check className="w-3 h-3 text-accent" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-mono text-accent/70">
                      0{i + 1} · {c.aspect}
                    </div>
                    <div className="text-sm text-ink leading-relaxed mt-0.5">{c.youju}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
