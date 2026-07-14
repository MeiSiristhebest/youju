import { ArrowRight, Moon, Sparkles, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useUIPreferenceStore } from '../../stores'

interface LandingNavProps {
  scrolled: boolean
  onStart: () => void
}

export function LandingNav({ scrolled, onStart }: LandingNavProps) {
  const { theme, toggleTheme } = useUIPreferenceStore()

  return (
    <nav className="fixed top-4 left-0 right-0 z-50 px-4" aria-label="主导航">
      <div
        className={`max-w-5xl mx-auto transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] ${
          scrolled
            ? 'bg-paper/80 backdrop-blur-xl border border-rule shadow-lg'
            : 'bg-transparent border border-transparent'
        } rounded-full px-4 md:px-6 py-2.5`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-ink rounded-full flex items-center justify-center">
              <Sparkles size={16} className="text-paper" strokeWidth={1.5} />
            </div>
            <span className="font-display text-lg font-semibold tracking-tight">有据</span>
          </div>

          <div className="hidden md:flex items-center gap-1 text-sm">
            <a
              href="#features"
              className="px-4 py-2 rounded-full text-ink-muted bg-paper-dark/50 hover:text-ink hover:bg-paper-dark transition-colors duration-300"
            >
              功能
            </a>
            <a
              href="#scenes"
              className="px-4 py-2 rounded-full text-ink-muted bg-paper-dark/50 hover:text-ink hover:bg-paper-dark transition-colors duration-300"
            >
              场景
            </a>
            <a
              href="#principle"
              className="px-4 py-2 rounded-full text-ink-muted bg-paper-dark/50 hover:text-ink hover:bg-paper-dark transition-colors duration-300"
            >
              原理
            </a>
            <a
              href="#pricing"
              className="px-4 py-2 rounded-full text-ink-muted bg-paper-dark/50 hover:text-ink hover:bg-paper-dark transition-colors duration-300"
            >
              定价
            </a>
            <a
              href="#faq"
              className="px-4 py-2 rounded-full text-ink-muted bg-paper-dark/50 hover:text-ink hover:bg-paper-dark transition-colors duration-300"
            >
              FAQ
            </a>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleTheme}
              className="w-9 h-9 flex items-center justify-center rounded-full text-ink-muted bg-paper-dark/50 hover:text-ink hover:bg-paper-dark transition-colors duration-300"
              aria-label="切换主题"
            >
              {theme === 'light' ? (
                <Moon size={16} strokeWidth={1.5} />
              ) : (
                <Sun size={16} strokeWidth={1.5} />
              )}
            </button>
            <Button onClick={onStart} size="sm" className="rounded-full">
              开始使用
              <span className="ml-2 w-6 h-6 rounded-full bg-paper/20 flex items-center justify-center">
                <ArrowRight size={12} strokeWidth={1.5} />
              </span>
            </Button>
          </div>
        </div>
      </div>
    </nav>
  )
}
