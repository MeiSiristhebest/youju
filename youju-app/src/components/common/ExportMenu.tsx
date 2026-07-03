import {
  ChevronDown,
  Copy,
  Download,
  FileText,
  FileText as FileTextIcon,
  Layout,
  LayoutGrid,
  List,
  Mail,
  Printer,
  TrendingUp,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { generateReportMarkdown, generateReportText } from '@/lib/reportGenerator'
import { cn } from '@/lib/utils'
import type { AnalyzeResult, Source } from '@/types'
import { PrintPreviewModal } from '../print/PrintPreviewModal'
import type { PrintStyle } from '../print/PrintReport'
import { useToast } from './Toast'

interface ExportMenuProps {
  result: AnalyzeResult
  sources: Source[]
  title?: string
  isOpen?: boolean
  onOpenChange?: (open: boolean) => void
  printStyle: PrintStyle
  onPrintStyleChange: (style: PrintStyle) => void
}

const STYLE_OPTIONS: { value: PrintStyle; label: string; desc: string; icon: typeof Layout }[] = [
  { value: 'standard', label: '标准报告', desc: '分章节详细展示', icon: Layout },
  { value: 'equity', label: '研报风格', desc: '专业正式研报风', icon: TrendingUp },
  { value: 'one-pager', label: '一页摘要', desc: '紧凑单页概览', icon: LayoutGrid },
  { value: 'brief', label: '简报备忘', desc: '备忘录式简报', icon: FileTextIcon },
  { value: 'letter', label: '正式函件', desc: '信件格式发送', icon: Mail },
  { value: 'list', label: '风险清单', desc: '表格化风险列表', icon: List },
]

export function ExportMenu({
  result,
  sources,
  title = '分析报告',
  isOpen: controlledOpen,
  onOpenChange,
  printStyle,
  onPrintStyleChange,
}: ExportMenuProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const [pdfMenuOpen, setPdfMenuOpen] = useState(false)
  const [previewStyle, setPreviewStyle] = useState<PrintStyle>('standard')
  const [showPreview, setShowPreview] = useState(false)
  const { showToast } = useToast()
  const menuRef = useRef<HTMLDivElement>(null)
  const pdfButtonRef = useRef<HTMLButtonElement>(null)

  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen

  const setIsOpen = (open: boolean) => {
    if (controlledOpen === undefined) {
      setInternalOpen(open)
    }
    if (onOpenChange) {
      onOpenChange(open)
    }
    if (!open) {
      setPdfMenuOpen(false)
    }
  }

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  const handleExportPDF = (style: PrintStyle) => {
    onPrintStyleChange(style)
    setPreviewStyle(style)
    setIsOpen(false)
    setShowPreview(true)
  }

  const handleExportMarkdown = async () => {
    try {
      const markdown = generateReportMarkdown(result, sources)
      const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${title}-${new Date().toISOString().slice(0, 10)}.md`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      showToast('Markdown 报告已下载', 'success')
    } catch (err) {
      showToast('导出失败，请重试', 'error')
    }
    setIsOpen(false)
  }

  const handleCopyReport = async () => {
    try {
      const text = generateReportText(result, sources)
      await navigator.clipboard.writeText(text)
      showToast('完整报告已复制到剪贴板', 'success')
    } catch (err) {
      showToast('复制失败，请手动复制', 'error')
    }
    setIsOpen(false)
  }

  const currentStyle = STYLE_OPTIONS.find((s) => s.value === printStyle) || STYLE_OPTIONS[0]

  return (
    <>
      <div className="relative" ref={menuRef}>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium cursor-pointer border border-rule/60 bg-paper-dark/60 text-ink-muted hover:bg-paper-dark hover:text-ink transition-colors duration-200"
        >
          <Download size={13} strokeWidth={1.5} />
          导出
          <ChevronDown size={11} strokeWidth={1.5} />
        </button>

        {isOpen && (
          <div className="absolute right-0 top-full mt-1 w-64 bg-paper border border-rule rounded-lg shadow-lg z-50 overflow-hidden animate-[fadeIn_0.15s_ease-out]">
            {/* PDF Export — click to expand style list inline */}
            <button
              ref={pdfButtonRef}
              type="button"
              onClick={() => setPdfMenuOpen(!pdfMenuOpen)}
              className="w-full flex items-center justify-between gap-3 px-4 py-2.5 text-left text-xs text-ink hover:bg-paper-dark transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <Printer size={14} strokeWidth={1.5} className="text-ink-faint" />
                <div>
                  <div className="font-medium">导出为 PDF</div>
                  <div className="text-[10px] text-ink-faint mt-0.5">
                    当前风格：{currentStyle.label}
                  </div>
                </div>
              </div>
              <ChevronDown
                size={12}
                strokeWidth={1.5}
                className={cn(
                  'text-ink-faint transition-transform duration-200',
                  pdfMenuOpen && 'rotate-180',
                )}
              />
            </button>

            {/* Inline style list — expands below the PDF button */}
            {pdfMenuOpen && (
              <div className="border-t border-rule bg-paper-dark/30">
                <div className="px-3 py-2 border-b border-rule bg-paper-dark/50">
                  <div className="text-[10px] font-medium text-ink-faint uppercase tracking-wider">
                    选择打印风格
                  </div>
                </div>
                <div className="py-1 max-h-80 overflow-y-auto">
                  {STYLE_OPTIONS.map((style) => {
                    const Icon = style.icon
                    const isActive = printStyle === style.value
                    return (
                      <button
                        key={style.value}
                        type="button"
                        onClick={() => handleExportPDF(style.value)}
                        className={cn(
                          'w-full flex items-center gap-3 px-3 py-2 text-left text-xs transition-colors cursor-pointer',
                          isActive ? 'bg-accent/10 text-ink' : 'text-ink hover:bg-paper-dark',
                        )}
                      >
                        <Icon
                          size={14}
                          strokeWidth={1.5}
                          className={isActive ? 'text-accent' : 'text-ink-faint'}
                        />
                        <div>
                          <div className="font-medium">{style.label}</div>
                          <div className="text-[10px] text-ink-faint mt-0.5">{style.desc}</div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            <div className="h-px bg-rule" />
            <button
              type="button"
              onClick={handleExportMarkdown}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-xs text-ink hover:bg-paper-dark transition-colors cursor-pointer"
            >
              <FileText size={14} strokeWidth={1.5} className="text-ink-faint" />
              <div>
                <div className="font-medium">导出为 Markdown</div>
                <div className="text-[10px] text-ink-faint mt-0.5">下载 .md 格式文件</div>
              </div>
            </button>
            <div className="h-px bg-rule" />
            <button
              type="button"
              onClick={handleCopyReport}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-xs text-ink hover:bg-paper-dark transition-colors cursor-pointer"
            >
              <Copy size={14} strokeWidth={1.5} className="text-ink-faint" />
              <div>
                <div className="font-medium">复制完整报告</div>
                <div className="text-[10px] text-ink-faint mt-0.5">复制文本到剪贴板</div>
              </div>
            </button>
          </div>
        )}
      </div>

      {/* 打印预览模态框 */}
      {showPreview && (
        <PrintPreviewModal
          result={result}
          sources={sources}
          title={title}
          initialStyle={previewStyle}
          onClose={() => setShowPreview(false)}
          onStyleChange={(style) => {
            setPreviewStyle(style)
            onPrintStyleChange(style)
          }}
        />
      )}
    </>
  )
}
