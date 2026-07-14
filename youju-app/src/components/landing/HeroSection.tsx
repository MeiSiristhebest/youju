import { useGSAP } from '@gsap/react'
import { ArrowRight, ChevronRight } from 'lucide-react'
import { useRef } from 'react'
import { gsap } from '../../lib/gsap'
import { MagneticButton } from '../ui/MagneticButton'
import { Marquee } from '../ui/Marquee'
import { SplitText } from '../ui/SplitText'

interface HeroSectionProps {
  onStart: () => void
}

const stats = [
  { num: '7', label: '步推理' },
  { num: '多源', label: '交叉验证' },
  { num: '100%', label: '证据可追溯' },
]

const marqueeItems = [
  '多源证据',
  '冲突检测',
  '增量推理',
  '证据溯源',
  '事实核查',
  '风险排雷',
  '透明可控',
]

/**
 * 浮动证据卡片 — 桌面端展示简化风险检测卡片
 */
function FloatingEvidenceCard() {
  return (
    <div
      data-hero-floating
      className="hidden lg:block absolute right-10 top-1/2 w-[340px]"
      style={{
        opacity: 0,
        transform: 'translateY(-50%) translateX(60px) rotate(5deg)',
        animation: 'float-y 6s ease-in-out infinite',
      }}
    >
      <div
        className="relative rounded-lg border border-rule/60 bg-paper/95 p-5 shadow-xl"
        style={{ transform: 'rotate(-2deg)' }}
      >
        {/* 光晕 */}
        <div className="absolute -inset-2 bg-accent/10 rounded-lg blur-xl -z-10" />

        <div className="flex items-center justify-between mb-3">
          <span className="text-[10px] font-mono uppercase tracking-wider text-accent">
            Risk Detected
          </span>
          <span className="text-[10px] font-mono text-ink-faint">#001</span>
        </div>

        <div className="font-display text-base font-medium text-ink mb-2">年终奖承诺未写入合同</div>

        <div className="space-y-2 mb-3">
          <div className="rounded-md bg-warning-bg/40 border border-warning/20 p-2">
            <div className="text-[9px] font-mono text-warning uppercase tracking-wider mb-0.5">
              聊天记录
            </div>
            <div className="text-xs text-ink leading-snug">
              "年终奖按 2 个月发放" — HR, 2026-03-15
            </div>
          </div>
          <div className="rounded-md bg-danger-bg/30 border border-danger/20 p-2">
            <div className="text-[9px] font-mono text-danger uppercase tracking-wider mb-0.5">
              合同条款
            </div>
            <div className="text-xs text-ink-muted leading-snug">未提及年终奖相关条款</div>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-rule/40">
          <span className="text-[10px] font-mono text-ink-faint">confidence</span>
          <span className="text-xs font-mono font-medium text-accent">92%</span>
        </div>
      </div>
    </div>
  )
}

export function HeroSection({ onStart }: HeroSectionProps) {
  const sectionRef = useRef<HTMLElement>(null)

  useGSAP(
    () => {
      const section = sectionRef.current
      if (!section) return

      const tl = gsap.timeline({ delay: 0.2 })

      tl.to('[data-hero-eyebrow]', { y: 0, opacity: 1, duration: 0.6 })
        .to('[data-hero-subtitle]', { y: 0, opacity: 1, duration: 0.7 }, '-=0.4')
        .to('[data-hero-cta]', { y: 0, opacity: 1, duration: 0.6 }, '-=0.3')
        .to('[data-hero-stats]', { y: 0, opacity: 1, duration: 0.6 }, '-=0.2')
        .to('[data-hero-floating]', { x: 0, opacity: 1, rotate: -2, duration: 1 }, '-=0.8')
        .to('[data-hero-scroll-hint]', { y: 0, opacity: 1, duration: 0.5 }, '-=0.3')

      // 背景层视差滚动（GSAP 直接操作 DOM，避免 React 重渲染）
      gsap.set('[data-hero-bg-inner]', { scale: 1.1 })
      gsap.to('[data-hero-bg-inner]', {
        yPercent: 15,
        ease: 'none',
        scrollTrigger: {
          trigger: section,
          start: 'top top',
          end: 'bottom top',
          scrub: 1,
        },
      })

      // 内容层视差 + 渐隐（跟随滚动自然淡出）
      gsap.to('[data-hero-content]', {
        yPercent: 8,
        opacity: 0,
        ease: 'none',
        scrollTrigger: {
          trigger: section,
          start: 'top top',
          end: '50% top',
          scrub: 1,
        },
      })
    },
    { scope: sectionRef },
  )

  return (
    <section ref={sectionRef} className="relative min-h-[100svh] flex items-center overflow-hidden">
      {/* 动态背景层 */}
      <div className="absolute inset-0 z-0" data-hero-bg>
        <div className="absolute inset-0" data-hero-bg-inner>
          {/* 第一层：暖色纸质渐变基底 */}
          <div className="absolute inset-0 bg-gradient-to-br from-paper-dark via-paper to-paper-deep" />

          {/* 第二层：光斑/光晕动画层 — 松青主光斑 */}
          <div className="absolute inset-0 overflow-hidden">
            <div
              className="absolute top-[10%] right-[5%] w-[700px] h-[700px] rounded-full hero-glow-1"
              style={{
                background:
                  'radial-gradient(circle, rgba(44, 95, 74, 0.18) 0%, rgba(31, 115, 80, 0.08) 40%, transparent 70%)',
                filter: 'blur(40px)',
              }}
            />

            {/* 次光斑 - 左下暖陶色 */}
            <div
              className="absolute bottom-[15%] left-[10%] w-[500px] h-[500px] rounded-full hero-glow-2"
              style={{
                background:
                  'radial-gradient(circle, rgba(183, 65, 14, 0.12) 0%, rgba(248, 175, 117, 0.06) 45%, transparent 70%)',
                filter: 'blur(30px)',
              }}
            />

            {/* 第三光斑 - 中部偏右琥珀金 */}
            <div
              className="absolute top-[40%] right-[25%] w-[400px] h-[400px] rounded-full hero-glow-3"
              style={{
                background:
                  'radial-gradient(circle, rgba(180, 83, 9, 0.1) 0%, rgba(252, 211, 77, 0.05) 50%, transparent 75%)',
                filter: 'blur(25px)',
              }}
            />

            <div
              className="absolute inset-0 hero-ambient-flicker"
              style={{
                background:
                  'radial-gradient(ellipse at 30% 60%, rgba(84, 171, 125, 0.04) 0%, transparent 60%)',
              }}
            />
          </div>

          {/* 第三层：纸张纹理噪点 */}
          <div
            className="absolute inset-0 opacity-[0.03] mix-blend-multiply hero-paper-noise"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
              backgroundSize: '300px 300px',
            }}
          />

          <div
            className="absolute inset-0"
            style={{
              background:
                'radial-gradient(ellipse at center, transparent 40%, rgba(28, 25, 23, 0.08) 100%)',
            }}
          />
        </div>

        {/* 渐变遮罩 */}
        <div className="absolute inset-0 bg-gradient-to-r from-paper via-paper/70 to-transparent hero-overlay-breathe" />
        <div className="absolute inset-0 bg-paper/10" />
      </div>

      {/* 浮动证据卡片（桌面端） */}
      <FloatingEvidenceCard />

      {/* 内容层 */}
      <div className="relative z-10 w-full px-6 lg:px-10 pt-28" data-hero-content>
        <div className="max-w-7xl mx-auto">
          <div className="max-w-2xl">
            <div data-hero-eyebrow className="gsap-reveal">
              <div className="flex items-center gap-3 mb-8">
                <span className="text-[11px] font-mono tracking-[0.2em] uppercase text-accent">
                  有据 YOUJU · 2026
                </span>
                <span className="h-px flex-1 max-w-[60px] bg-rule" />
                <span className="text-[11px] font-mono text-ink-faint">证据推理 · 事实核查</span>
              </div>
            </div>

            <h1
              data-hero-title
              className="font-display text-[clamp(2.5rem,6vw,5rem)] font-medium leading-[0.95] tracking-tight text-balance"
            >
              <SplitText
                text="让每一个结论"
                as="span"
                variant="fadeUp"
                trigger={false}
                className="block"
              />
              <SplitText
                text="都有据可查"
                as="span"
                variant="fadeUp"
                trigger={false}
                delay={0.2}
                className="block italic text-accent font-light"
              />
            </h1>

            <p
              data-hero-subtitle
              className="gsap-reveal mt-8 max-w-lg text-base text-ink-muted leading-relaxed"
            >
              上传材料，AI 自动梳理事实脉络、标记矛盾承诺、生成可溯源的结论。每一条判断都有据可查。
            </p>

            <div data-hero-cta className="gsap-reveal mt-10 flex flex-wrap items-center gap-4">
              <MagneticButton
                onClick={onStart}
                iconRight={<ArrowRight size={16} strokeWidth={1.5} />}
              >
                立即开始
              </MagneticButton>
              <a
                href="#features"
                className="flex items-center gap-2 text-sm text-ink-muted hover:text-ink transition-colors"
              >
                了解更多
                <ChevronRight size={15} strokeWidth={1.5} />
              </a>
            </div>
          </div>

          <div
            data-hero-stats
            className="gsap-reveal mt-24 pt-8 border-t border-rule/50 grid grid-cols-3 gap-8 max-w-2xl"
          >
            {stats.map((stat, i) => (
              <div key={i}>
                <div className="font-display text-3xl lg:text-4xl font-light text-ink tracking-tight">
                  {stat.num}
                </div>
                <div className="mt-2 text-[11px] font-mono uppercase tracking-wider text-ink-faint">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 滚动指示器 */}
      <div
        data-hero-scroll-hint
        className="absolute bottom-24 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
        style={{
          opacity: 0,
          transform: 'translateX(-50%) translateY(-10px)',
          animation: 'scroll-hint 2s ease-in-out infinite',
        }}
      >
        <span className="text-[10px] font-mono uppercase tracking-widest text-ink-faint">
          Scroll
        </span>
        <div className="w-px h-8 bg-gradient-to-b from-ink-faint to-transparent" />
      </div>

      {/* 底部跑马灯 */}
      <div className="absolute bottom-0 left-0 right-0 py-4 border-t border-rule/40 bg-paper/80">
        <Marquee
          items={marqueeItems}
          speed={40}
          className="text-xs font-mono uppercase tracking-widest text-ink-muted"
        />
      </div>

      {/* 底部强调光晕 */}
      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-accent/5 rounded-full blur-3xl pointer-events-none translate-x-1/3 translate-y-1/3" />
    </section>
  )
}
