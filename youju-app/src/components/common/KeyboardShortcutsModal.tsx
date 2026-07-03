import { Keyboard, X } from 'lucide-react'
import { useEffect } from 'react'
import { cn } from '@/lib/utils'

interface ShortcutItem {
  keys: string[]
  description: string
}

interface ShortcutGroup {
  title: string
  items: ShortcutItem[]
}

const shortcutGroups: ShortcutGroup[] = [
  {
    title: '全局快捷键',
    items: [
      { keys: ['Ctrl', 'Enter'], description: '开始分析（有材料时）' },
      { keys: ['Ctrl', 'K'], description: '打开添加材料弹窗' },
      { keys: ['Ctrl', 'S'], description: '保存/导出' },
      { keys: ['Esc'], description: '关闭当前弹窗/模态框' },
      { keys: ['?'], description: '打开快捷键面板' },
    ],
  },
  {
    title: '结果面板',
    items: [
      { keys: ['1'], description: '切换到风险清单' },
      { keys: ['2'], description: '切换到检查清单' },
      { keys: ['3'], description: '切换到统一版本' },
      { keys: ['4'], description: '切换到关键要素' },
      { keys: ['5'], description: '切换到风险关联' },
      { keys: ['6'], description: '切换到AI思考/维度管理' },
      { keys: ['J'], description: '上一个风险' },
      { keys: ['K'], description: '下一个风险' },
      { keys: ['Space'], description: '展开/收起当前选中的风险' },
    ],
  },
]

function KeyCap({ children }: { children: React.ReactNode }) {
  return (
    <kbd
      className={cn(
        'inline-flex items-center justify-center min-w-[28px] h-7 px-2',
        'bg-paper-dark border border-rule rounded-md',
        'text-[11px] font-mono font-medium text-ink',
        'shadow-sm',
      )}
    >
      {children}
    </kbd>
  )
}

interface KeyboardShortcutsModalProps {
  isOpen: boolean
  onClose: () => void
}

export function KeyboardShortcutsModal({ isOpen, onClose }: KeyboardShortcutsModalProps) {
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[2000] flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="快捷键参考"
        className="bg-paper border border-rule rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden shadow-2xl flex flex-col"
      >
        <div className="px-6 py-5 border-b border-rule flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-accent-bg flex items-center justify-center text-accent">
              <Keyboard size={18} strokeWidth={1.5} />
            </div>
            <div>
              <h3 className="text-base font-semibold text-ink font-display tracking-tight">
                快捷键参考
              </h3>
              <p className="text-[11px] text-ink-faint mt-0.5">提升操作效率，快速完成常用操作</p>
            </div>
          </div>
          <button
            type="button"
            className="w-8 h-8 bg-transparent border-none text-ink-faint cursor-pointer rounded-lg flex items-center justify-center hover:bg-paper-dark hover:text-ink transition-colors"
            onClick={onClose}
            aria-label="关闭"
          >
            <X size={16} strokeWidth={1.5} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {shortcutGroups.map((group) => (
            <div key={group.title}>
              <h4 className="text-xs font-semibold text-ink-faint uppercase tracking-wide mb-3 font-mono">
                {group.title}
              </h4>
              <div className="space-y-1.5">
                {group.items.map((item) => (
                  <div
                    key={item.description}
                    className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-paper-dark/50 transition-colors"
                  >
                    <span className="text-xs text-ink">{item.description}</span>
                    <div className="flex items-center gap-1">
                      {item.keys.map((key, idx) => (
                        <span key={idx} className="flex items-center gap-1">
                          {idx > 0 && <span className="text-ink-faint text-[10px]">+</span>}
                          <KeyCap>{key}</KeyCap>
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="px-6 py-4 border-t border-rule shrink-0 bg-paper/50">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-ink-faint">
              提示：在输入框中编辑时，单键快捷键将暂时禁用
            </span>
            <button
              type="button"
              className="px-4 py-1.5 rounded-md text-xs font-medium bg-ink text-paper hover:bg-accent transition-colors cursor-pointer"
              onClick={onClose}
            >
              知道了
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
