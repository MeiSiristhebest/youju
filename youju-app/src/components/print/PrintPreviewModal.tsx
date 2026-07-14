import {
  FileText as FileTextIcon,
  Layout,
  LayoutGrid,
  List,
  Mail,
  Printer,
  TrendingUp,
  X,
} from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import type { AnalyzeResult, Source } from '@/types'
import type { PrintStyle } from './PrintReport'
import { PrintReport } from './PrintReport'

interface PrintPreviewModalProps {
  result: AnalyzeResult
  sources: Source[]
  title?: string
  initialStyle?: PrintStyle
  onClose: () => void
  onStyleChange?: (style: PrintStyle) => void
}

const STYLE_OPTIONS: { value: PrintStyle; label: string; desc: string; icon: typeof Layout }[] = [
  { value: 'standard', label: '标准报告', desc: '分章节详细展示', icon: Layout },
  { value: 'equity', label: '研报风格', desc: '专业正式研报风', icon: TrendingUp },
  { value: 'one-pager', label: '一页摘要', desc: '紧凑单页概览', icon: LayoutGrid },
  { value: 'brief', label: '简报备忘', desc: '备忘录式简报', icon: FileTextIcon },
  { value: 'letter', label: '正式函件', desc: '信件格式发送', icon: Mail },
  { value: 'list', label: '风险清单', desc: '表格化风险列表', icon: List },
]

/**
 * 安全化 result 数据，填充缺失字段防止 undefined
 */
function safeResult(result: AnalyzeResult): AnalyzeResult {
  return {
    ...result,
    summary: {
      critical: result.summary?.critical ?? 0,
      warning: result.summary?.warning ?? 0,
      info: result.summary?.info ?? 0,
      total: result.summary?.total ?? result.risks?.length ?? 0,
    },
    risks: (result.risks || []).map((risk) => ({
      ...risk,
      title: risk.title || '未命名风险',
      description: risk.description || '',
      level: risk.level || 'info',
      type: risk.type || 'info',
      sources: risk.sources || [],
      evidence: (risk.evidence || []).map((ev) => ({
        ...ev,
        sourceName: ev.sourceName || '未知来源',
        quote: ev.quote || '',
      })),
    })),
    checklist: result.checklist || [],
    alignedVersion: result.alignedVersion || '',
  }
}

export function PrintPreviewModal({
  result,
  sources,
  title = '信息对齐分析报告',
  initialStyle = 'standard',
  onClose,
  onStyleChange,
}: PrintPreviewModalProps) {
  const [currentStyle, setCurrentStyle] = useState<PrintStyle>(initialStyle)
  const [printing, setPrinting] = useState(false)

  const safe = safeResult(result)
  const currentOption = STYLE_OPTIONS.find((s) => s.value === currentStyle) || STYLE_OPTIONS[0]

  const handlePrint = useCallback(() => {
    setPrinting(true)
    setTimeout(() => {
      try {
        window.print()
      } catch (err) {
        console.error('[PrintPreview] print error:', err)
      } finally {
        setTimeout(() => setPrinting(false), 500)
      }
    }, 200)
  }, [])

  // ESC 关闭
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !printing) {
        onClose()
      }
      // Ctrl/Cmd + P 打印
      if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        e.preventDefault()
        handlePrint()
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [printing, onClose, handlePrint])

  const handleStyleChange = (style: PrintStyle) => {
    setCurrentStyle(style)
    onStyleChange?.(style)
  }

  return createPortal(
    <div className="print-preview-overlay fixed inset-0 z-[9999] flex flex-col bg-ink/90 backdrop-blur-sm">
      {/* 工具栏 */}
      <div className="print-preview-toolbar shrink-0 flex items-center justify-between px-6 py-3 bg-paper border-b border-rule">
        {/* 左侧：标题 */}
        <div className="flex items-center gap-3 min-w-0">
          <span
            className="text-[10px] font-mono font-semibold tracking-widest uppercase text-accent shrink-0"
            style={{ letterSpacing: '0.1em' }}
          >
            Kami Print
          </span>
          <span className="text-rule">·</span>
          <span className="text-xs text-ink-muted truncate">{title}</span>
        </div>

        {/* 中间：风格选择器 */}
        <div className="flex items-center gap-1 bg-paper-dark/60 rounded-lg p-1 border border-rule/60">
          {STYLE_OPTIONS.map((opt) => {
            const Icon = opt.icon
            const isActive = currentStyle === opt.value
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => handleStyleChange(opt.value)}
                title={opt.label}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-medium transition-all duration-200 cursor-pointer ${
                  isActive
                    ? 'bg-ink text-paper shadow-sm'
                    : 'text-ink-muted hover:bg-paper hover:text-ink'
                }`}
              >
                <Icon size={12} strokeWidth={1.5} />
                <span className="hidden sm:inline">{opt.label}</span>
              </button>
            )
          })}
        </div>

        {/* 右侧：操作按钮 */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-medium cursor-pointer bg-accent text-accent-foreground hover:opacity-90 transition-opacity duration-200"
          >
            <Printer size={13} strokeWidth={1.5} />
            打印 / 导出 PDF
          </button>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center justify-center w-8 h-8 rounded-md text-ink-muted hover:bg-paper-dark hover:text-ink transition-colors cursor-pointer"
            title="关闭 (ESC)"
          >
            <X size={16} strokeWidth={1.5} />
          </button>
        </div>
      </div>

      {/* 预览区域 */}
      <div className="print-preview-scroll flex-1 overflow-auto flex justify-center py-8 px-4">
        <div
          className="print-preview-page"
          style={{
            width: '210mm',
            minHeight: '297mm',
            background: '#f5f4ed',
            boxShadow: '0 4pt 24pt rgba(0, 0, 0, 0.05)',
          }}
        >
          <PrintReport result={safe} sources={sources} title={title} style={currentStyle} />
        </div>
      </div>

      {/* 底部信息栏 */}
      <div className="print-preview-footer shrink-0 flex items-center justify-between px-6 py-2 bg-paper border-t border-rule">
        <div className="flex items-center gap-3 text-[10px] text-ink-faint font-mono">
          <span>当前风格：{currentOption.label}</span>
          <span>·</span>
          <span>{currentOption.desc}</span>
        </div>
        <div className="text-[10px] text-ink-faint font-mono">ESC 关闭 · Ctrl+P 打印</div>
      </div>
    </div>,
    document.body,
  )
}
