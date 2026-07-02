import { ArrowRight } from 'lucide-react'
import { Button } from '../custom/Button'
import { AnimateIn } from '../ui/AnimateIn'

interface CtaSectionProps {
  onStart: () => void
}

export function CtaSection({ onStart }: CtaSectionProps) {
  return (
    <section className="relative py-36 px-6 lg:px-10 bg-ink text-paper overflow-hidden">
      {/* Subtle texture */}
      <div className="absolute inset-0 opacity-[0.03]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,var(--accent)_0%,transparent_50%)]" />
      </div>

      <div className="max-w-4xl mx-auto text-center relative z-10">
        <AnimateIn>
          <span className="text-[11px] font-mono tracking-[0.25em] uppercase text-accent-faint">
            — 开始你的推理
          </span>
        </AnimateIn>
        <AnimateIn delay={0.1}>
          <h2 className="mt-6 font-display text-[clamp(2.5rem,6vw,4.5rem)] font-medium tracking-tight leading-[1.05] text-balance">
            从证据出发，
            <br />
            <span className="italic font-light text-accent-faint">接近事实的真相</span>
          </h2>
        </AnimateIn>
        <AnimateIn delay={0.25}>
          <p className="mt-8 text-base text-ink-faint max-w-lg mx-auto leading-relaxed">
            上传你的材料，让有据帮你梳理事实脉络、识别信息冲突、输出可信结论。
          </p>
        </AnimateIn>
        <AnimateIn delay={0.4}>
          <div className="mt-12 flex justify-center">
            <Button
              variant="secondary"
              size="lg"
              onClick={onStart}
              className="bg-paper text-ink border-paper hover:bg-accent-faint hover:border-accent-faint hover:scale-105 transition-transform transition-colors duration-500"
              iconRight={<ArrowRight size={16} strokeWidth={1.5} />}
            >
              立即开始使用
            </Button>
          </div>
        </AnimateIn>
      </div>

      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-ink-faint/30 to-transparent" />
      <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-ink-faint/30 to-transparent" />
    </section>
  )
}
