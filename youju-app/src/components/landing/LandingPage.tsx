import { useEffect, useState } from 'react'
import { CtaSection } from './CtaSection'
import { FeaturesSection } from './FeaturesSection'
import { HeroSection } from './HeroSection'
import { LandingFooter } from './LandingFooter'
import { LandingNav } from './LandingNav'
import { PrinciplesSection } from './PrinciplesSection'
import { ScenesSection } from './ScenesSection'

interface LandingPageProps {
  onStart: () => void
}

export function LandingPage({ onStart }: LandingPageProps) {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div className="relative min-h-dvh bg-paper text-ink overflow-x-hidden">
      <div className="paper-texture" />

      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-ink focus:text-paper focus:rounded-[2px] focus:text-sm"
      >
        跳转到主内容
      </a>

      <LandingNav scrolled={scrolled} onStart={onStart} />

      <main id="main-content">
        <HeroSection onStart={onStart} />
        <FeaturesSection />
        <ScenesSection />
        <PrinciplesSection />
        <CtaSection onStart={onStart} />
      </main>

      <LandingFooter />
    </div>
  )
}
