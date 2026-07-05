import { HelpCircle, Keyboard, X } from 'lucide-react'
import { useEffect } from 'react'
import { cn } from '@/lib/utils'
import { useUIPreferenceStore } from '@/stores'

interface ShortcutItem {
  keys: string[]
  description: string
  isChord?: boolean
}

interface ShortcutGroup {
  title: string
  items: ShortcutItem[]
}

const shortcutGroups: ShortcutGroup[] = [
  {
    title: '全局',
    items: [
      { keys: ['Ctrl', 'Enter'], description: '开始分析（有材料时）' },
      { keys: ['Ctrl', 'K'], description: '命令面板 / AI 重写选中风险' },
      { keys: ['Ctrl', 'Shift', 'P'], description: '打开命令面板' },
      { keys: ['Ctrl', 'Shift', 'K'], description: '打开命令面板' },
      { keys: ['Ctrl', 'T'], description: '任务切换器' },
      { keys: ['Ctrl', 'J'], description: '切换到 AI 对话' },
      { keys: ['Ctrl', 'S'], description: '导出报告' },
      { keys: ['Esc'], description: '关闭当前弹窗/模态框' },
      { keys: ['?'], description: '打开快捷键面板' },
    ],
  },
  {
    title: '导航',
    items: [
      { keys: ['G', 'S'], description: '聚焦材料面板', isChord: true },
      { keys: ['G', 'R'], description: '聚焦风险面板', isChord: true },
    ],
  },
  {
    title: '面板',
    items: [
      { keys: ['Ctrl', 'B'], description: '切换侧边栏折叠' },
      { keys: ['['], description: '折叠/展开左侧材料面板' },
      { keys: [']'], description: '折叠/展开右侧上下文面板' },
    ],
  },
  {
    title: '操作',
    items: [
      { keys: ['N'], description: '添加材料' },
      { keys: ['E'], description: '导出报告' },
      { keys: ['S'], description: '保存任务' },
    ],
  },
  {
    title: '结果面板',
    items: [
      { keys: ['1'], description: '切换到风险排雷' },
      { keys: ['2'], description: '切换到检查清单' },
      { keys: ['3'], description: '切换到对齐共识' },
      { keys: ['4'], description: '切换到要素提取' },
      { keys: ['5'], description: '切换到证据链条' },
      { keys: ['6'], description: '切换到维度调权' },
      { keys: ['7'], description: '切换到思考过程' },
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
  const _customShortcuts = useUIPreferenceStore((s) => s.customShortcuts)

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
                      {item.isChord ? (
                        <>
                          <KeyCap>{item.keys[0]}</KeyCap>
                          <span className="text-ink-faint text-[10px] mx-1">然后</span>
                          <KeyCap>{item.keys[1]}</KeyCap>
                        </>
                      ) : (
                        item.keys.map((key, idx) => (
                          <span key={idx} className="flex items-center gap-1">
                            {idx > 0 && <span className="text-ink-faint text-[10px]">+</span>}
                            <KeyCap>{key}</KeyCap>
                          </span>
                        ))
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="px-6 py-4 border-t border-rule shrink-0 bg-paper/50">
          <div className="flex items-center justify-between">
            <button
              type="button"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-ink-muted hover:text-ink hover:bg-paper-dark transition-colors cursor-pointer"
              onClick={() => {
                useUIPreferenceStore.getState().restartProductTour()
                onClose()
              }}
            >
              <HelpCircle size={12} strokeWidth={1.5} />
              重新开始引导
            </button>
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
