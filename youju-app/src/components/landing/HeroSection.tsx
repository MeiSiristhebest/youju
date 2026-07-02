import { ArrowRight, ChevronRight } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { useScrollY } from '../../hooks/useScrollY'
import { Button } from '../custom/Button'
import { AnimateIn } from '../ui/AnimateIn'

interface HeroSectionProps {
  onStart: () => void
}

const stats = [
  { num: '3+', label: '证据维度' },
  { num: '12', label: '推理步骤' },
  { num: '100%', label: '结论可溯源' },
]

/**
 * 纸张颗粒动画 Canvas 组件
 * 模拟胶片颗粒/纸张纹理的细微变化
 * 仅在桌面端启用，移动端降级为静态
 */
function GrainCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number>(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const isMobile = window.matchMedia('(max-width: 768px)').matches
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    if (isMobile || prefersReducedMotion) {
      return
    }

    const resizeCanvas = () => {
      const dpr = window.devicePixelRatio || 1
      canvas.width = canvas.offsetWidth * dpr
      canvas.height = canvas.offsetHeight * dpr
      ctx.scale(dpr, dpr)
    }

    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)

    let frameCount = 0
    const drawGrain = () => {
      frameCount++

      if (frameCount % 3 !== 0) {
        animationRef.current = requestAnimationFrame(drawGrain)
        return
      }

      const w = canvas.offsetWidth
      const h = canvas.offsetHeight
      const imageData = ctx.createImageData(w, h)
      const data = imageData.data

      for (let i = 0; i < data.length; i += 4) {
        const value = Math.random() * 255
        data[i] = value
        data[i + 1] = value
        data[i + 2] = value
        data[i + 3] = Math.random() * 15
      }

      ctx.putImageData(imageData, 0, 0)
      animationRef.current = requestAnimationFrame(drawGrain)
    }

    drawGrain()

    return () => {
      window.removeEventListener('resize', resizeCanvas)
      cancelAnimationFrame(animationRef.current)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none mix-blend-overlay"
      style={{ opacity: 0.08 }}
    />
  )
}

export function HeroSection({ onStart }: HeroSectionProps) {
  const scrollY = useScrollY()

  return (
    <section className="relative min-h-[100svh] flex items-center overflow-hidden">
      {/* 动态背景层 */}
      <div className="absolute inset-0 z-0">
        <div
          className="absolute inset-0 scale-110"
          style={{ transform: `scale(1.1) translateY(${scrollY * 0.15}px)` }}
        >
          {/* 第一层：暖色纸质渐变基底 */}
          <div className="absolute inset-0 bg-gradient-to-br from-paper-dark via-paper to-paper-deep" />

          {/* 第二层：光斑/光晕动画层 */}
          <div className="absolute inset-0 overflow-hidden">
            {/* 主光斑 - 右上暖橙色 */}
            <div
              className="absolute top-[10%] right-[5%] w-[700px] h-[700px] rounded-full hero-glow-1"
              style={{
                background:
                  'radial-gradient(circle, rgba(194, 65, 12, 0.18) 0%, rgba(234, 88, 12, 0.08) 40%, transparent 70%)',
                filter: 'blur(40px)',
              }}
            />

            {/* 次光斑 - 左下琥珀色 */}
            <div
              className="absolute bottom-[15%] left-[10%] w-[500px] h-[500px] rounded-full hero-glow-2"
              style={{
                background:
                  'radial-gradient(circle, rgba(234, 88, 12, 0.12) 0%, rgba(251, 146, 60, 0.06) 45%, transparent 70%)',
                filter: 'blur(30px)',
              }}
            />

            {/* 第三光斑 - 中部偏右淡金色 */}
            <div
              className="absolute top-[40%] right-[25%] w-[400px] h-[400px] rounded-full hero-glow-3"
              style={{
                background:
                  'radial-gradient(circle, rgba(251, 191, 36, 0.1) 0%, rgba(252, 211, 77, 0.05) 50%, transparent 75%)',
                filter: 'blur(25px)',
              }}
            />

            {/* 环境光微妙波动 */}
            <div
              className="absolute inset-0 hero-ambient-flicker"
              style={{
                background:
                  'radial-gradient(ellipse at 30% 60%, rgba(251, 146, 60, 0.04) 0%, transparent 60%)',
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

          {/* Canvas 颗粒动画层（桌面端启用） */}
          <GrainCanvas />

          {/* 柔和暗角效果 */}
          <div
            className="absolute inset-0"
            style={{
              background:
                'radial-gradient(ellipse at center, transparent 40%, rgba(28, 25, 23, 0.08) 100%)',
            }}
          />
        </div>

        {/* 渐变遮罩 - 保证文字可读性 */}
        <div className="absolute inset-0 bg-gradient-to-r from-paper via-paper/70 to-transparent hero-overlay-breathe" />
        <div className="absolute inset-0 bg-paper/10" />
      </div>

      {/* 内容层 */}
      <div
        className="relative z-10 w-full px-6 lg:px-10 pt-28"
        style={{ transform: `translateY(${scrollY * 0.08}px)`, opacity: 1 - scrollY / 600 }}
      >
        <div className="max-w-7xl mx-auto">
          <div className="max-w-2xl">
            <AnimateIn>
              <div className="flex items-center gap-3 mb-8">
                <span className="text-[11px] font-mono tracking-[0.2em] uppercase text-accent">
                  Issue 01 · 2026
                </span>
                <span className="h-px flex-1 max-w-[60px] bg-rule" />
                <span className="text-[11px] font-mono text-ink-faint">证据推理 · 事实核查</span>
              </div>
            </AnimateIn>

            <AnimateIn delay={0.1}>
              <h1 className="font-display text-[clamp(2.5rem,6vw,5rem)] font-medium leading-[0.95] tracking-tight text-balance">
                让每一个结论
                <br />
                <span className="italic text-accent font-light">都有据可查</span>
              </h1>
            </AnimateIn>

            <AnimateIn delay={0.25}>
              <p className="mt-8 max-w-lg text-base text-ink-muted leading-relaxed">
                基于多源证据交叉验证的增量式推理工具。
                从碎片化信息中梳理事实、识别冲突、渐进逼近真相。
              </p>
            </AnimateIn>

            <AnimateIn delay={0.4}>
              <div className="mt-10 flex flex-wrap items-center gap-4">
                <Button
                  size="lg"
                  onClick={onStart}
                  iconRight={<ArrowRight size={16} strokeWidth={1.5} />}
                >
                  立即开始
                </Button>
                <a
                  href="#features"
                  className="flex items-center gap-2 text-sm text-ink-muted hover:text-ink transition-colors"
                >
                  了解更多
                  <ChevronRight size={15} strokeWidth={1.5} />
                </a>
              </div>
            </AnimateIn>
          </div>

          <AnimateIn delay={0.55}>
            <div className="mt-24 pt-8 border-t border-rule/50 grid grid-cols-3 gap-8 max-w-2xl">
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
          </AnimateIn>
        </div>
      </div>

      {/* 底部强调光晕 */}
      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-accent/5 rounded-full blur-3xl pointer-events-none translate-x-1/3 translate-y-1/3" />
    </section>
  )
}
