import { Sparkles } from 'lucide-react'

export function LandingFooter() {
  return (
    <footer className="py-10 px-6 lg:px-10 border-t border-rule">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 bg-ink rounded-[2px] flex items-center justify-center">
            <Sparkles size={14} className="text-paper" strokeWidth={1.5} />
          </div>
          <span className="font-display text-base font-semibold">有据</span>
          <span className="text-xs font-mono text-ink-faint tracking-wider">YOUJU</span>
        </div>
        <div className="text-xs font-mono text-ink-faint">© 2026 · 让每一个结论都有据可查</div>
      </div>
    </footer>
  )
}
