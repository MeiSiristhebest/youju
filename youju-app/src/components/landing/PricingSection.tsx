import { useGSAP } from '@gsap/react'
import { Check, X } from 'lucide-react'
import { useRef } from 'react'
import { PRICING_PLANS } from '../../constants/pricing'
import { gsap } from '../../lib/gsap'
import { cn } from '../../lib/utils'
import { SectionTitle } from '../ui/SectionTitle'

interface PricingSectionProps {
  onStart: () => void
}

export function PricingSection({ onStart }: PricingSectionProps) {
  const sectionRef = useRef<HTMLElement>(null)

  useGSAP(
    () => {
      const cards = gsap.utils.toArray<HTMLElement>('[data-price-card]')
      if (cards.length === 0) return

      gsap.to(cards, {
        y: 0,
        opacity: 1,
        stagger: { each: 0.12, from: 'center' },
        duration: 0.9,
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
      id="pricing"
      className="relative py-24 lg:py-32 px-6 lg:px-12 bg-paper-dark/30"
    >
      <div className="mx-auto max-w-7xl">
        <SectionTitle
          variant="centered"
          eyebrow="PRICING"
          title="简单透明的定价"
          description="所有付费方案均支持 7 天免费试用，无需信用卡。"
        />

        <div className="mt-16 grid md:grid-cols-3 gap-5 lg:gap-6">
          {PRICING_PLANS.map((plan) => (
            <div
              key={plan.id}
              data-price-card
              className={cn(
                'gsap-reveal relative rounded-lg p-6 lg:p-8 flex flex-col',
                plan.highlighted
                  ? 'border-2 border-accent bg-paper shadow-lg'
                  : 'border border-rule/60 bg-paper/60',
              )}
            >
              {plan.highlighted && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-accent text-paper text-[10px] font-mono uppercase tracking-wider">
                  推荐
                </div>
              )}

              <div className="mb-6">
                <h3 className="font-display text-xl font-medium text-ink">{plan.name}</h3>
                <p className="mt-1 text-xs text-ink-muted">{plan.description}</p>
              </div>

              <div className="mb-6 flex items-baseline gap-1">
                <span className="font-display text-4xl lg:text-5xl font-light text-ink tracking-tight">
                  {plan.price === 0 ? '¥0' : `¥${plan.price}`}
                </span>
                <span className="text-sm text-ink-muted">{plan.priceUnit}</span>
              </div>

              <ul className="flex-1 space-y-3 mb-6">
                {plan.features.map((f) => (
                  <li key={f.text} className="flex items-start gap-2 text-sm">
                    {f.included ? (
                      <Check className="shrink-0 w-4 h-4 text-accent mt-0.5" />
                    ) : (
                      <X className="shrink-0 w-4 h-4 text-ink-faint mt-0.5" />
                    )}
                    <span className={f.included ? 'text-ink' : 'text-ink-faint line-through'}>
                      {f.text}
                    </span>
                  </li>
                ))}
              </ul>

              <button
                type="button"
                onClick={onStart}
                className={cn(
                  'w-full h-11 rounded-md text-sm font-medium transition-colors',
                  plan.highlighted
                    ? 'bg-accent text-paper hover:bg-accent-soft'
                    : 'bg-paper-dark/60 text-ink border border-rule hover:bg-paper-dark',
                )}
              >
                {plan.cta}
              </button>
            </div>
          ))}
        </div>

        <p className="mt-8 text-center text-xs text-ink-faint">
          所有方案均支持 7 天免费试用 · 无需信用卡 · 随时取消
        </p>
      </div>
    </section>
  )
}
