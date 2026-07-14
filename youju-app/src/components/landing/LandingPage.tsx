import { useEffect, useState } from 'react'
import { ScrollTrigger } from '../../lib/gsap'
import { Marquee } from '../ui/Marquee'
import { ComparisonSection } from './ComparisonSection'
import { CtaSection } from './CtaSection'
import { FaqSection } from './FaqSection'
import { FeaturesSection } from './FeaturesSection'
import { FormatsSection } from './FormatsSection'
import { HeroSection } from './HeroSection'
import { HowItWorksSection } from './HowItWorksSection'
import { LandingFooter } from './LandingFooter'
import { LandingNav } from './LandingNav'
import { PricingSection } from './PricingSection'
import { PrinciplesSection } from './PrinciplesSection'
import { ScenesSection } from './ScenesSection'
import { ScrollProgress } from './ScrollProgress'
import { SecuritySection } from './SecuritySection'
import { StatsSection } from './StatsSection'
import { TestimonialsSection } from './TestimonialsSection'

interface LandingPageProps {
  onStart: () => void
}

const dividerItems = [
  '多源证据',
  '冲突检测',
  '增量推理',
  '证据溯源',
  '事实核查',
  '风险排雷',
  '透明可控',
]

function MarqueeDivider() {
  return (
    <div className="py-3 border-y border-rule bg-paper/60">
      <Marquee
        items={dividerItems}
        speed={40}
        className="text-xs font-mono uppercase tracking-widest text-ink-muted"
      />
    </div>
  )
}

export function LandingPage({ onStart }: LandingPageProps) {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    // 所有 section 挂载后刷新 ScrollTrigger 位置
    const id = requestAnimationFrame(() => ScrollTrigger.refresh())
    return () => cancelAnimationFrame(id)
  }, [])

  return (
    <div className="relative min-h-dvh bg-paper text-ink overflow-x-hidden">
      <div className="paper-texture" />
      <ScrollProgress />

      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-ink focus:text-paper focus:rounded-[2px] focus:text-sm"
      >
        跳转到主内容
      </a>

      <LandingNav scrolled={scrolled} onStart={onStart} />

      <main id="main-content">
        <HeroSection onStart={onStart} />
        <MarqueeDivider />
        <StatsSection />
        <FeaturesSection />
        <MarqueeDivider />
        <HowItWorksSection />
        <MarqueeDivider />
        <ScenesSection onStart={onStart} />
        <ComparisonSection />
        <FormatsSection />
        <TestimonialsSection />
        <PrinciplesSection />
        <PricingSection onStart={onStart} />
        <FaqSection />
        <SecuritySection />
        <CtaSection onStart={onStart} />
      </main>

      <LandingFooter />
    </div>
  )
}
