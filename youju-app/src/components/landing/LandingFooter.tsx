import { Sparkles } from 'lucide-react'

const footerLinks = [
  { label: '功能', href: '#features' },
  { label: '场景', href: '#scenes' },
  { label: '原理', href: '#principle' },
  { label: '定价', href: '#pricing' },
  { label: 'FAQ', href: '#faq' },
  { label: '安全', href: '#security' },
]

const techStack = ['React 19', 'TailwindCSS v4', 'GSAP', 'Fraunces']

export function LandingFooter() {
  return (
    <footer className="py-10 px-6 lg:px-10 border-t border-rule">
      <div className="max-w-7xl mx-auto">
        {/* 上行：品牌 + 导航链接 */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 bg-ink rounded-[2px] flex items-center justify-center">
              <Sparkles size={14} className="text-paper" strokeWidth={1.5} />
            </div>
            <span className="font-display text-base font-semibold">有据</span>
            <span className="text-xs font-mono text-ink-faint tracking-wider">YOUJU</span>
          </div>
          <nav className="flex flex-wrap items-center gap-x-5 gap-y-2" aria-label="页脚导航">
            {footerLinks.map((l) => (
              <a
                key={l.href}
                href={l.href}
                className="text-xs text-ink-muted hover:text-accent transition-colors"
              >
                {l.label}
              </a>
            ))}
          </nav>
        </div>

        {/* 分隔线 */}
        <div className="my-6 h-px bg-rule" />

        {/* 下行：版权 + 技术栈标签 */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="text-xs font-mono text-ink-faint">© 2026 · 让每一个结论都有据可查</div>
          <div className="flex flex-wrap items-center gap-2">
            {techStack.map((t) => (
              <span
                key={t}
                className="px-2 py-1 rounded-[2px] bg-paper-dark/60 text-[10px] font-mono text-ink-faint border border-rule/40"
              >
                {t}
              </span>
            ))}
          </div>
        </div>
      </div>
    </footer>
  )
}
