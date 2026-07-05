import {
  ChevronDown,
  Copy,
  Download,
  FileDown,
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

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function markdownToHtml(markdown: string, title: string): string {
  let html = escapeHtml(markdown)

  html = html.replace(/```([\s\S]*?)```/g, (_match, code) => {
    return `<pre style="background:#f5f4ed;border:1px solid #e8e6dc;border-radius:4pt;padding:10pt 12pt;font-family:'JetBrains Mono','Courier New',monospace;font-size:9pt;line-height:1.5;white-space:pre-wrap;word-wrap:break-word;color:#3d3d3a;">${code}</pre>`
  })

  html = html.replace(
    /^# (.+)$/gm,
    "<h1 style=\"font-family:'TsangerJinKai02','Source Han Serif SC','Songti SC',serif;font-size:20pt;color:#141413;border-bottom:1px solid #e8e6dc;padding-bottom:8pt;margin-top:20pt;margin-bottom:12pt;font-weight:500;\">$1</h1>",
  )
  html = html.replace(
    /^## (.+)$/gm,
    "<h2 style=\"font-family:'TsangerJinKai02','Source Han Serif SC','Songti SC',serif;font-size:15pt;color:#141413;border-left:3px solid #1B365D;padding-left:8pt;margin-top:18pt;margin-bottom:10pt;font-weight:500;\">$1</h2>",
  )
  html = html.replace(
    /^### (.+)$/gm,
    "<h3 style=\"font-family:'TsangerJinKai02','Source Han Serif SC','Songti SC',serif;font-size:13pt;color:#141413;margin-top:14pt;margin-bottom:8pt;font-weight:500;\">$1</h3>",
  )

  html = html.replace(/^> (.+)$/gm, (_match, text) => {
    return `<blockquote style="border-left:3px solid #1B365D;padding:6pt 12pt;margin:8pt 0;color:#504e49;background:#f0f3f8;border-radius:0 4pt 4pt 0;">${text}</blockquote>`
  })

  html = html.replace(
    /\*\*(.+?)\*\*/g,
    '<strong style="color:#141413;font-weight:600;">$1</strong>',
  )
  html = html.replace(/\*(.+?)\*/g, '<em style="color:#3d3d3a;">$1</em>')
  html = html.replace(
    /`(.+?)`/g,
    "<code style=\"background:#f5f4ed;padding:1pt 4pt;border-radius:2pt;font-family:'JetBrains Mono','Courier New',monospace;font-size:8.5pt;color:#1B365D;\">$1</code>",
  )

  const lines = html.split('\n')
  const htmlLines: string[] = []
  let inTable = false
  let _tableHeaderProcessed = false
  let tableRows: string[] = []
  let inList = false
  let listType: 'ul' | 'ol' | null = null
  let listItems: string[] = []

  const flushList = () => {
    if (listItems.length > 0 && listType) {
      htmlLines.push(`<${listType} style="margin:8pt 0;padding-left:24pt;color:#3d3d3a;">`)
      listItems.forEach((item) => {
        htmlLines.push(`<li style="margin:4pt 0;line-height:1.6;">${item}</li>`)
      })
      htmlLines.push(`</${listType}>`)
    }
    listItems = []
    listType = null
    inList = false
  }

  const flushTable = () => {
    if (tableRows.length > 0) {
      htmlLines.push(
        '<table style="width:100%;border-collapse:collapse;margin:10pt 0;font-size:10pt;">',
      )
      tableRows.forEach((row, i) => {
        const cells = row.split('|').filter((c) => c.trim() !== '')
        const tag = i === 0 ? 'th' : 'td'
        const bgColor = i === 0 ? '#f0f3f8' : i % 2 === 0 ? '#faf9f5' : '#ffffff'
        htmlLines.push('<tr>')
        cells.forEach((cell) => {
          htmlLines.push(
            `<${tag} style="border:1px solid #e8e6dc;padding:6pt 10pt;text-align:left;vertical-align:top;background:${bgColor};${
              i === 0 ? 'font-weight:600;color:#1B365D;' : 'color:#3d3d3a;'
            }">${cell.trim()}</${tag}>`,
          )
        })
        htmlLines.push('</tr>')
      })
      htmlLines.push('</table>')
    }
    tableRows = []
    inTable = false
    _tableHeaderProcessed = false
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trimmed = line.trim()

    if (trimmed.match(/^\|.+\|$/)) {
      if (trimmed.match(/^\|[\s\-:]+\|$/)) {
        _tableHeaderProcessed = true
        continue
      }
      if (!inTable) {
        flushList()
        inTable = true
      }
      tableRows.push(trimmed)
      continue
    } else if (inTable) {
      flushTable()
    }

    if (trimmed.match(/^-\s+.+/)) {
      if (!inList || listType !== 'ul') {
        flushList()
        inList = true
        listType = 'ul'
      }
      listItems.push(trimmed.replace(/^-\s+/, ''))
      continue
    } else if (trimmed.match(/^\d+\.\s+.+/)) {
      if (!inList || listType !== 'ol') {
        flushList()
        inList = true
        listType = 'ol'
      }
      listItems.push(trimmed.replace(/^\d+\.\s+/, ''))
      continue
    } else if (inList) {
      flushList()
    }

    if (trimmed === '') {
      htmlLines.push('')
    } else if (
      !trimmed.startsWith('<h') &&
      !trimmed.startsWith('<pre') &&
      !trimmed.startsWith('</pre') &&
      !trimmed.startsWith('<blockquote') &&
      !trimmed.startsWith('</blockquote') &&
      !trimmed.startsWith('<table') &&
      !trimmed.startsWith('</table') &&
      !trimmed.startsWith('<ul') &&
      !trimmed.startsWith('</ul') &&
      !trimmed.startsWith('<ol') &&
      !trimmed.startsWith('</ol') &&
      !trimmed.startsWith('<li') &&
      !trimmed.startsWith('</li') &&
      !trimmed.startsWith('<tr') &&
      !trimmed.startsWith('</tr') &&
      !trimmed.startsWith('<th') &&
      !trimmed.startsWith('</th') &&
      !trimmed.startsWith('<td') &&
      !trimmed.startsWith('</td')
    ) {
      htmlLines.push(
        `<p style="margin:8pt 0;line-height:1.7;color:#3d3d3a;font-size:10.5pt;">${line}</p>`,
      )
    } else {
      htmlLines.push(line)
    }
  }

  flushList()
  flushTable()

  html = htmlLines.join('\n')
  html = html.replace(/\n{3,}/g, '\n\n')

  return `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <meta charset="utf-8">
      <title>${escapeHtml(title)}</title>
      <!--[if gte mso 9]>
      <xml>
        <w:WordDocument>
          <w:View>Print</w:View>
          <w:Zoom>100</w:Zoom>
          <w:DoNotOptimizeForBrowser/>
        </w:WordDocument>
      </xml>
      <![endif]-->
      <style>
        @page {
          size: A4;
          margin: 2.5cm 2cm;
        }
        body {
          font-family: "PingFang SC", "Microsoft YaHei", "Source Han Sans SC", sans-serif;
          font-size: 10.5pt;
          line-height: 1.7;
          color: #3d3d3a;
          background: #ffffff;
        }
        h1, h2, h3, h4, h5, h6 {
          font-family: "TsangerJinKai02", "Source Han Serif SC", "Songti SC", "STSong", serif;
          color: #141413;
        }
        a { color: #1B365D; text-decoration: none; }
        hr {
          border: none;
          border-top: 1px solid #e8e6dc;
          margin: 20pt 0;
        }
        .page-break { page-break-before: always; }
      </style>
    </head>
    <body>
      ${html}
    </body>
    </html>
  `
}

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
    } catch (_err) {
      showToast('导出失败，请重试', 'error')
    }
    setIsOpen(false)
  }

  const handleExportWord = async () => {
    try {
      const markdown = generateReportMarkdown(result, sources)
      const htmlContent = markdownToHtml(markdown, title)
      const blob = new Blob([htmlContent], { type: 'application/msword;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${title}-${new Date().toISOString().slice(0, 10)}.doc`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      showToast('Word 报告已下载', 'success')
    } catch (_err) {
      showToast('导出失败，请重试', 'error')
    }
    setIsOpen(false)
  }

  const handleCopyReport = async () => {
    try {
      const text = generateReportText(result, sources)
      const markdown = generateReportMarkdown(result, sources)

      if (navigator.clipboard && window.ClipboardItem) {
        const htmlContent = markdownToHtml(markdown, title)
        const blobHtml = new Blob([htmlContent], { type: 'text/html' })
        const blobText = new Blob([text], { type: 'text/plain' })
        const clipboardItem = new ClipboardItem({
          'text/html': blobHtml,
          'text/plain': blobText,
        })
        await navigator.clipboard.write([clipboardItem])
      } else {
        await navigator.clipboard.writeText(text)
      }

      showToast('完整报告已复制到剪贴板', 'success')
    } catch (_err) {
      try {
        const text = generateReportText(result, sources)
        const textarea = document.createElement('textarea')
        textarea.value = text
        textarea.style.position = 'fixed'
        textarea.style.opacity = '0'
        document.body.appendChild(textarea)
        textarea.select()
        document.execCommand('copy')
        document.body.removeChild(textarea)
        showToast('完整报告已复制到剪贴板', 'success')
      } catch (_fallbackErr) {
        showToast('复制失败，请手动复制', 'error')
      }
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
              onClick={handleExportWord}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-xs text-ink hover:bg-paper-dark transition-colors cursor-pointer"
            >
              <FileDown size={14} strokeWidth={1.5} className="text-ink-faint" />
              <div>
                <div className="font-medium">导出为 Word</div>
                <div className="text-[10px] text-ink-faint mt-0.5">下载 .doc 格式文件</div>
              </div>
            </button>
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
