import { Keyboard } from 'lucide-react'
import { SectionTitle } from './shared'

export function ShortcutsTab() {
  const shortcutGroups = [
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

  return (
    <div className="space-y-8">
      <SectionTitle
        icon={<Keyboard size={16} strokeWidth={1.5} />}
        title="键盘快捷键"
        description="使用键盘快捷键提升操作效率"
      />

      {shortcutGroups.map((group) => (
        <div key={group.title}>
          <h4 className="text-[11px] font-semibold text-ink-faint uppercase tracking-wide mb-2 font-mono">
            {group.title}
          </h4>
          <div className="bg-paper-dark/30 border border-rule/50 rounded-lg divide-y divide-rule/40 px-4 py-3">
            {group.items.map((item) => (
              <div
                key={item.description}
                className="flex items-center justify-between py-2 first:pt-0 last:pb-0"
              >
                <span className="text-xs text-ink">{item.description}</span>
                <div className="flex items-center gap-1">
                  {item.keys.map((key, idx) => (
                    <span key={idx} className="flex items-center gap-1">
                      {idx > 0 && <span className="text-ink-faint text-[10px]">+</span>}
                      <kbd className="inline-flex items-center justify-center min-w-[24px] h-6 px-1.5 bg-paper border border-rule rounded text-[10px] font-mono font-medium text-ink shadow-sm">
                        {key}
                      </kbd>
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      <div className="bg-paper-dark/20 rounded-lg p-3">
        <p className="text-[10px] text-ink-faint">
          提示：在输入框中编辑时，单键快捷键将暂时禁用，以避免与正常输入冲突。
        </p>
      </div>
    </div>
  )
}
