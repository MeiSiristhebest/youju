import { useGSAP } from '@gsap/react'
import { Quote } from 'lucide-react'
import { useRef } from 'react'
import { gsap } from '../../lib/gsap'
import { SectionTitle } from '../ui/SectionTitle'

const testimonials = [
  {
    quote: '用有据核对了 offer 和合同，发现 HR 承诺的年终奖没写进合同。避免了入职后的纠纷。',
    role: '求职者',
    initial: '求',
    context: '入职 offer 核对',
  },
  {
    quote: '案件卷宗几十页材料，10 分钟就梳理出了时间线和争议焦点。比助理快了整整一天。',
    role: '执业律师',
    initial: '律',
    context: '案件卷宗梳理',
  },
  {
    quote: '租房时中介口头说的和合同不一样，有据直接标出了 3 处冲突。省了后面很多麻烦。',
    role: '租房者',
    initial: '租',
    context: '租房合同核查',
  },
]

export function TestimonialsSection() {
  const sectionRef = useRef<HTMLElement>(null)

  useGSAP(
    () => {
      const cards = gsap.utils.toArray<HTMLElement>('[data-testimonial-card]')
      if (cards.length === 0) return

      gsap.to(cards, {
        y: 0,
        opacity: 1,
        stagger: 0.15,
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
    <section ref={sectionRef} id="testimonials" className="relative py-24 lg:py-32 px-6 lg:px-12">
      <div className="mx-auto max-w-7xl">
        <SectionTitle
          variant="centered"
          eyebrow="USE CASES"
          title="用户的真实场景"
          description="以下为概念证言，用于说明典型使用场景，不代表真实用户反馈。"
        />

        <div className="mt-16 grid md:grid-cols-3 gap-5 lg:gap-6">
          {testimonials.map((t, i) => (
            <div
              key={i}
              data-testimonial-card
              className="gsap-reveal relative rounded-lg border border-rule/50 bg-paper/40 backdrop-blur-md p-6 lg:p-8 flex flex-col"
            >
              <Quote className="absolute top-4 right-4 w-10 h-10 text-accent/15" />

              <div className="flex-1">
                <p className="font-display text-base lg:text-lg leading-relaxed text-ink">
                  "{t.quote}"
                </p>
              </div>

              <div className="mt-6 pt-6 border-t border-rule/40 flex items-center gap-3">
                <div className="shrink-0 w-10 h-10 rounded-full bg-accent text-paper flex items-center justify-center font-display text-sm font-medium">
                  {t.initial}
                </div>
                <div>
                  <div className="text-sm font-medium text-ink">{t.role}</div>
                  <div className="text-[11px] font-mono text-ink-faint mt-0.5">{t.context}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <p className="mt-8 text-center text-xs text-ink-faint italic">
          概念证言 · 用于说明典型使用场景
        </p>
      </div>
    </section>
  )
}
