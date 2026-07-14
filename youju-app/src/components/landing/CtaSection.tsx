import { useGSAP } from '@gsap/react'
import { ArrowRight } from 'lucide-react'
import { useRef } from 'react'
import { gsap } from '../../lib/gsap'
import { MagneticButton } from '../ui/MagneticButton'
import { Marquee } from '../ui/Marquee'
import { SplitText } from '../ui/SplitText'

interface CtaSectionProps {
  onStart: () => void
}

const ctaMarqueeItems = ['开始推理', '事实溯源', '证据优先', '透明可控', '增量审慎']

export function CtaSection({ onStart }: CtaSectionProps) {
  const sectionRef = useRef<HTMLElement>(null)

  useGSAP(
    () => {
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: sectionRef.current,
          start: 'top 75%',
          once: true,
        },
      })
      tl.to('[data-cta-eyebrow]', { y: 0, opacity: 1, duration: 0.6 })
        .to('[data-cta-subtitle]', { y: 0, opacity: 1, duration: 0.7 }, '-=0.2')
        .to('[data-cta-button]', { y: 0, opacity: 1, duration: 0.6 }, '-=0.3')
        .to('[data-cta-marquee]', { opacity: 1, duration: 0.6 }, '-=0.3')
    },
    { scope: sectionRef },
  )

  return (
    <section
      ref={sectionRef}
      className="relative py-36 px-6 lg:px-10 bg-ink text-paper overflow-hidden"
    >
      {/* 动态背景：脉冲光斑 */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full"
          style={{
            background:
              'radial-gradient(circle, rgba(44, 95, 74, 0.25) 0%, rgba(31, 115, 80, 0.1) 40%, transparent 70%)',
            filter: 'blur(40px)',
            animation: 'cta-pulse 6s ease-in-out infinite',
          }}
        />
      </div>

      <div className="max-w-4xl mx-auto text-center relative z-10">
        <div data-cta-eyebrow className="gsap-reveal">
          <span className="text-[11px] font-mono tracking-[0.25em] uppercase text-accent-faint">
            — 开始你的推理
          </span>
        </div>

        <h2 className="mt-6 font-display text-[clamp(2.5rem,6vw,4.5rem)] font-medium tracking-tight leading-[1.05] text-balance">
          <SplitText text="从证据出发，" as="span" variant="fadeUp" className="block" />
          <SplitText
            text="接近事实的真相"
            as="span"
            variant="fadeUp"
            delay={0.2}
            className="block italic font-light text-accent-faint"
          />
        </h2>

        <p
          data-cta-subtitle
          className="gsap-reveal mt-8 text-base text-ink-faint max-w-lg mx-auto leading-relaxed"
        >
          上传你的材料，让有据帮你梳理事实脉络、识别信息冲突、输出可信结论。
        </p>

        <div data-cta-button className="gsap-reveal mt-12 flex justify-center">
          <MagneticButton onClick={onStart} iconRight={<ArrowRight size={16} strokeWidth={1.5} />}>
            立即开始使用
          </MagneticButton>
        </div>
      </div>

      {/* 底部跑马灯 */}
      <div
        data-cta-marquee
        className="absolute bottom-0 left-0 right-0 py-4 border-t border-paper/10"
        style={{ opacity: 0 }}
      >
        <Marquee
          items={ctaMarqueeItems}
          speed={36}
          className="text-xs font-mono uppercase tracking-widest text-paper/40"
          separator={<span className="text-accent/40 mx-6">·</span>}
        />
      </div>

      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-ink-faint/30 to-transparent" />
    </section>
  )
}
