import { useGSAP } from '@gsap/react'
import {
  File,
  FileCode,
  FileImage,
  FileJson,
  FileText,
  FileText as FileTextIcon,
  FolderOpen,
  Globe,
  Image,
  Upload,
  X,
} from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { fileParser } from '../../algorithms/fileParser'
import { TYPE_LABELS } from '../../constants/workspace'
import { gsap } from '../../lib/gsap'
import { cn } from '../../lib/utils'
import { ocrService } from '../../services/ocrService'
import { sourceApi } from '../../services/sourceApi'
import { useSourceStore } from '../../stores/useSourceStore'
import type { ParsedSource, Source, SourceType } from '../../types'

interface ParsedFileEntry {
  file: File
  parsed: ParsedSource
  type: SourceType
}

type AddSourceTab = 'text' | 'file' | 'url' | 'screenshot' | 'history'

interface AddSourceModalProps {
  isOpen: boolean
  onClose: () => void
  onAddSource: (source: Source) => void
  defaultType?: SourceType
  initialFiles?: File[]
}

const MAX_FILE_SIZE = 10 * 1024 * 1024

const SUPPORTED_FORMATS = [
  { extension: '.txt', label: '纯文本', icon: FileTextIcon },
  { extension: '.md', label: 'Markdown', icon: FileTextIcon },
  { extension: '.html', label: 'HTML', icon: FileCode },
  { extension: '.json', label: 'JSON', icon: FileJson },
  { extension: '.pdf', label: 'PDF', icon: File },
  { extension: '.docx', label: 'Word', icon: File },
  { extension: '.png/.jpg', label: '图片', icon: FileImage },
]

export function AddSourceModal({
  isOpen,
  onClose,
  onAddSource,
  defaultType = 'chat',
  initialFiles,
}: AddSourceModalProps) {
  const [activeTab, setActiveTab] = useState<AddSourceTab>('text')
  const [sourceType, setSourceType] = useState<SourceType>(defaultType)
  const [sourceName, setSourceName] = useState('')
  const [sourceContent, setSourceContent] = useState('')
  const [sourceUrl, setSourceUrl] = useState('')
  const [uploading, setUploading] = useState(false)
  const [fileDragOver, setFileDragOver] = useState(false)
  const [ocrProgress, setOcrProgress] = useState('')
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null)
  const [parsingStatus, setParsingStatus] = useState<string>('')
  const [parsedResult, setParsedResult] = useState<ParsedSource | null>(null)
  const [parseError, setParseError] = useState<string>('')
  const [selectedHistorySource, setSelectedHistorySource] = useState<Source | null>(null)
  const [parsedFiles, setParsedFiles] = useState<ParsedFileEntry[]>([])
  const [historySources, setHistorySources] = useState<Source[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)
  const overlayRef = useRef<HTMLDivElement>(null)
  const modalRef = useRef<HTMLDivElement>(null)

  const currentTaskId = useSourceStore((state) => state.currentTaskId)

  // 加载历史材料（全局查询，不按会话关联）
  useEffect(() => {
    if (!isOpen || activeTab !== 'history') return
    setLoadingHistory(true)
    sourceApi
      .listSources(undefined, true)
      .then((sources) => {
        // 按 content 去重，保留最新的一条（listSources 已按 id DESC 返回）
        const seen = new Set<string>()
        const deduped = sources.filter((s) => {
          const key = s.content
          if (seen.has(key)) return false
          seen.add(key)
          return true
        })
        setHistorySources(deduped)
      })
      .catch(() => setHistorySources([]))
      .finally(() => setLoadingHistory(false))
  }, [isOpen, activeTab])

  const resetAndClose = () => {
    setActiveTab('text')
    setSourceType(defaultType)
    setSourceName('')
    setSourceContent('')
    setSourceUrl('')
    setOcrProgress('')
    setScreenshotPreview(null)
    setParsingStatus('')
    setParsedResult(null)
    setParseError('')
    setParsedFiles([])
    setSelectedHistorySource(null)
    onClose()
  }

  useEffect(() => {
    if (isOpen && initialFiles && initialFiles.length > 0) {
      setActiveTab('file')
      handleParseMultipleFiles(initialFiles)
    }
  }, [isOpen, initialFiles])

  useGSAP(
    () => {
      if (!isOpen) return

      const isMobile = window.matchMedia('(max-width: 768px)').matches
      if (isMobile) return

      gsap.fromTo(
        modalRef.current,
        { scale: 0.96, opacity: 0 },
        { scale: 1, opacity: 1, duration: 0.25, ease: 'back.out(1.4)' },
      )

      gsap.fromTo(
        overlayRef.current,
        { opacity: 0 },
        { opacity: 1, duration: 0.2, ease: 'power2.out' },
      )
    },
    { scope: overlayRef, dependencies: [isOpen] },
  )

  const handleAddText = async () => {
    if (!sourceName || !sourceContent) return
    setUploading(true)
    try {
      const source = await sourceApi.addTextSource({
        type: sourceType,
        name: sourceName,
        content: sourceContent,
        taskId: currentTaskId ?? undefined,
      })
      onAddSource(source)
      resetAndClose()
    } finally {
      setUploading(false)
    }
  }

  const handleParseFile = useCallback(
    async (file: File) => {
      if (file.size > MAX_FILE_SIZE) {
        setParseError(`${file.name} 超过限制（最大 10MB）`)
        setTimeout(() => setParseError(''), 3000)
        return
      }

      setParseError('')
      setParsingStatus(`正在解析 ${file.name}…`)

      const fileType = fileParser.detectFileType(file)
      const fileTypeLabel = fileParser.getFileTypeLabel(fileType)

      if (fileType === 'unknown') {
        setParseError(`${file.name}：不支持的文件格式`)
        setParsingStatus('')
        setTimeout(() => setParseError(''), 3000)
        return
      }

      setParsingStatus(`正在解析 ${fileTypeLabel}：${file.name}…`)

      try {
        const result = await fileParser.parseFile(file)
        setParsedFiles((prev) => {
          // 去重：同名且同大小的文件不重复追加
          const exists = prev.some((e) => e.file.name === file.name && e.file.size === file.size)
          if (exists) {
            setParseError(`${file.name} 已在列表中`)
            setTimeout(() => setParseError(''), 3000)
            return prev
          }
          return [...prev, { file, parsed: result, type: sourceType }]
        })
        setParsingStatus(`${file.name} 解析完成（${result.meta.charCount} 字符）`)
        setTimeout(() => setParsingStatus(''), 3000)
      } catch (_error) {
        setParseError(`${file.name} 解析失败`)
        setParsingStatus('')
        setTimeout(() => setParseError(''), 3000)
      }
    },
    [sourceType],
  )

  const handleParseMultipleFiles = useCallback(
    async (files: FileList | File[]) => {
      const fileArray = Array.from(files)
      if (fileArray.length === 0) return

      // 单文件时保持原有行为（显示预览编辑区）
      if (fileArray.length === 1) {
        const file = fileArray[0]
        setParseError('')
        setParsingStatus('正在检测文件类型…')

        if (file.size > MAX_FILE_SIZE) {
          setParseError('文件大小超过限制（最大 10MB）')
          setTimeout(() => setParseError(''), 3000)
          return
        }

        const fileType = fileParser.detectFileType(file)
        const fileTypeLabel = fileParser.getFileTypeLabel(fileType)

        if (fileType === 'unknown') {
          setParseError('不支持的文件格式')
          setParsingStatus('')
          setTimeout(() => setParseError(''), 3000)
          return
        }

        setParsingStatus(`正在解析 ${fileTypeLabel}…`)

        try {
          const result = await fileParser.parseFile(file)
          setParsedResult(result)
          setSourceContent(result.text)
          setSourceName(file.name.replace(/\.[^.]+$/, '') || '解析文件')
          setParsingStatus(`解析完成（${result.meta.charCount} 字符，${result.meta.lineCount} 行）`)
          setTimeout(() => setParsingStatus(''), 3000)
        } catch (_error) {
          setParseError('文件解析失败')
          setParsingStatus('')
          setTimeout(() => setParseError(''), 3000)
        }
        return
      }

      // 多文件模式：逐个解析，添加到列表
      setParsedResult(null)
      for (const file of fileArray) {
        await handleParseFile(file)
      }
    },
    [handleParseFile],
  )

  const handleAddFile = async (file: File) => {
    if (!file) return
    setUploading(true)
    try {
      const source = await sourceApi.uploadFile(
        file,
        sourceType,
        sourceName || undefined,
        currentTaskId ?? undefined,
      )
      onAddSource(source)
      resetAndClose()
    } finally {
      setUploading(false)
    }
  }

  const handleAddMultipleFiles = async () => {
    if (parsedFiles.length === 0) return
    setUploading(true)
    try {
      for (const entry of parsedFiles) {
        const source = await sourceApi.addTextSource({
          type: entry.type,
          name: entry.file.name.replace(/\.[^.]+$/, '') || '解析文件',
          content: entry.parsed.text,
          taskId: currentTaskId ?? undefined,
        })
        onAddSource(source)
      }
      resetAndClose()
    } finally {
      setUploading(false)
    }
  }

  const handleAddHistorySource = async () => {
    if (!selectedHistorySource) return
    setUploading(true)
    try {
      const source = await sourceApi.addTextSource({
        type: selectedHistorySource.type,
        name: selectedHistorySource.name,
        content: selectedHistorySource.content,
        taskId: currentTaskId ?? undefined,
      })
      onAddSource(source)
      resetAndClose()
    } finally {
      setUploading(false)
    }
  }

  const handleAddUrl = async () => {
    if (!sourceUrl) return
    setUploading(true)
    try {
      const source = await sourceApi.addUrlSource({
        url: sourceUrl,
        type: sourceType,
        name: sourceName || undefined,
        taskId: currentTaskId ?? undefined,
      })
      onAddSource(source)
      resetAndClose()
    } finally {
      setUploading(false)
    }
  }

  const handleRecognizeScreenshot = async (file: File) => {
    if (!file.type.startsWith('image/')) return

    setUploading(true)
    setOcrProgress('正在加载 OCR 引擎…')
    setScreenshotPreview(URL.createObjectURL(file))

    const statusMap: Record<string, string> = {
      'loading tesseract core': '加载识别核心…',
      'initializing tesseract': '初始化引擎…',
      'loading language traineddata': '加载中文语言包…',
      'initializing api': '准备识别…',
      'recognizing text': '识别文字中…',
    }

    try {
      const result = await ocrService.recognize(file, (status, progress) => {
        const statusText = statusMap[status] || status
        if (status === 'recognizing text') {
          setOcrProgress(`${statusText} ${Math.round(progress * 100)}%`)
        } else {
          setOcrProgress(statusText)
        }
      })

      const text = result.text.trim()
      const confidence = result.confidence || 0

      if (text.length === 0) {
        setOcrProgress('未识别到文字，请尝试更清晰的截图')
        setTimeout(() => setOcrProgress(''), 3000)
        return
      }

      setSourceContent(text)
      setSourceName(file.name.replace(/\.[^.]+$/, '') || '截图识别文本')
      setActiveTab('text')
      setOcrProgress(`识别完成（置信度 ${Math.round(confidence)}%），可在左侧编辑确认`)
      setTimeout(() => setOcrProgress(''), 4000)
    } catch (err) {
      console.error('OCR error:', err)
      setOcrProgress('识别失败，请尝试其他方式（如手动粘贴文字）')
    } finally {
      setUploading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div
      ref={overlayRef}
      role="button"
      tabIndex={-1}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm grid place-items-center z-[1000] p-5"
      onClick={(e) => {
        if (e.target === e.currentTarget) resetAndClose()
      }}
    >
      <div
        ref={modalRef}
        className="bg-paper border border-rule rounded-xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-lg"
      >
        <div className="px-5 py-4 border-b border-rule flex justify-between items-center shrink-0">
          <h3 className="text-base font-semibold text-ink font-display tracking-tight">添加材料</h3>
          <button
            type="button"
            className="w-8 h-8 bg-transparent border-none text-ink-faint cursor-pointer rounded-lg flex items-center justify-center hover:bg-paper-dark hover:text-ink transition-colors duration-200"
            onClick={resetAndClose}
            aria-label="关闭"
          >
            <X size={16} strokeWidth={1.5} />
          </button>
        </div>

        <div className="p-5 overflow-y-auto">
          <div
            className="flex gap-1 mb-5 bg-paper-dark p-1 rounded-lg"
            role="tablist"
            aria-label="添加材料方式"
          >
            {[
              { key: 'text', label: '粘贴文本', icon: FileText },
              { key: 'file', label: '上传文件', icon: Upload },
              { key: 'screenshot', label: '截图识别', icon: Image },
              { key: 'url', label: '网页链接', icon: Globe },
              { key: 'history', label: '历史材料', icon: FolderOpen },
            ].map((tab) => (
              <button
                key={tab.key}
                type="button"
                role="tab"
                aria-selected={activeTab === tab.key}
                aria-controls={`panel-${tab.key}`}
                id={`tab-${tab.key}`}
                className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-transparent border-none cursor-pointer font-inherit rounded-lg text-xs font-medium transition-colors duration-200 hover:text-ink ${
                  activeTab === tab.key ? 'bg-paper text-ink shadow-sm' : 'text-ink-faint'
                }`}
                onClick={() => setActiveTab(tab.key as AddSourceTab)}
              >
                <tab.icon size={13} strokeWidth={1.5} />
                {tab.label}
              </button>
            ))}
          </div>

          {activeTab !== 'history' && (
            <div className="mb-4">
              <span className="block text-xs text-ink-faint mb-2 font-medium font-mono tracking-wide uppercase">
                材料类型
              </span>
              <div className="grid grid-cols-5 gap-2">
                {(['chat', 'doc', 'web', 'contract', 'screenshot'] as SourceType[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    className={`flex flex-col items-center gap-1.5 px-2 py-3 bg-paper-dark border rounded-lg text-xs cursor-pointer font-inherit transition-colors duration-200 hover:border-ink-faint hover:text-ink ${
                      sourceType === t
                        ? 'bg-accent-bg border-accent-faint text-accent'
                        : 'border-rule text-ink-muted'
                    }`}
                    onClick={() => setSourceType(t)}
                  >
                    <FileText size={18} strokeWidth={1.5} />
                    <span>{TYPE_LABELS[t]}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'text' && (
            <div role="tabpanel" id="panel-text" aria-labelledby="tab-text" className="space-y-4">
              <div>
                <label
                  htmlFor="source-name-text"
                  className="block text-xs text-ink-faint mb-2 font-medium font-mono tracking-wide uppercase"
                >
                  材料名称
                </label>
                <input
                  id="source-name-text"
                  type="text"
                  className="w-full px-3.5 py-2.5 bg-paper border border-rule rounded-lg text-sm text-ink font-inherit transition-colors duration-200 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/20"
                  placeholder="如：HR 微信沟通记录"
                  value={sourceName}
                  onChange={(e) => setSourceName(e.target.value)}
                />
              </div>
              <div>
                <label
                  htmlFor="source-content"
                  className="block text-xs text-ink-faint mb-2 font-medium font-mono tracking-wide uppercase"
                >
                  材料内容
                </label>
                <textarea
                  id="source-content"
                  className="w-full px-3.5 py-2.5 bg-paper border border-rule rounded-lg text-sm text-ink font-inherit transition-colors duration-200 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/20 resize-y leading-relaxed"
                  placeholder="粘贴聊天记录、文档内容等…"
                  rows={8}
                  value={sourceContent}
                  onChange={(e) => setSourceContent(e.target.value)}
                />
              </div>
            </div>
          )}

          {activeTab === 'file' && (
            <div role="tabpanel" id="panel-file" aria-labelledby="tab-file" className="space-y-4">
              <div>
                <label
                  htmlFor="source-name-file"
                  className="block text-xs text-ink-faint mb-2 font-medium font-mono tracking-wide uppercase"
                >
                  材料名称（可选）
                </label>
                <input
                  id="source-name-file"
                  type="text"
                  className="w-full px-3.5 py-2.5 bg-paper border border-rule rounded-lg text-sm text-ink font-inherit transition-colors duration-200 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/20"
                  placeholder="留空则使用文件名"
                  value={sourceName}
                  onChange={(e) => setSourceName(e.target.value)}
                />
              </div>

              <div>
                <span
                  className="block text-xs text-ink-faint mb-2 font-medium font-mono tracking-wide uppercase"
                  id="file-upload-label"
                >
                  选择文件
                </span>
                <div
                  className={`border-2 border-dashed border-rule rounded-lg p-10 text-center transition-colors duration-200 hover:border-accent hover:bg-accent-bg/30 ${
                    fileDragOver ? 'border-accent bg-accent-bg' : ''
                  } ${parseError ? 'border-danger' : ''}`}
                  onDragOver={(e) => {
                    e.preventDefault()
                    setFileDragOver(true)
                  }}
                  onDragLeave={() => setFileDragOver(false)}
                  onDrop={(e) => {
                    e.preventDefault()
                    setFileDragOver(false)
                    const files = e.dataTransfer.files
                    if (files && files.length > 0) handleParseMultipleFiles(files)
                  }}
                  role="group"
                  aria-label="文件上传区域"
                >
                  <input
                    type="file"
                    id="file-upload-modal"
                    multiple
                    onChange={(e) =>
                      e.target.files &&
                      e.target.files.length > 0 &&
                      handleParseMultipleFiles(e.target.files)
                    }
                    accept=".txt,.md,.markdown,.html,.htm,.json,.pdf,.doc,.docx,.png,.jpg,.jpeg,.gif,.bmp,.webp"
                    style={{ display: 'none' }}
                  />
                  <label htmlFor="file-upload-modal" className="block cursor-pointer">
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-12 h-12 mb-3 rounded-full bg-paper-dark flex items-center justify-center text-accent">
                        <Upload size={22} strokeWidth={1.5} />
                      </div>
                      <p className="text-sm text-ink mb-1 font-medium">点击选择文件或拖拽到此处</p>
                      <p className="text-xs text-ink-faint">支持多种格式，最大 10MB</p>
                    </div>
                  </label>
                </div>

                {parseError && (
                  <div className="mt-3 text-xs text-danger font-medium">{parseError}</div>
                )}
                {parsingStatus && (
                  <div className="mt-3 text-xs text-accent font-medium">{parsingStatus}</div>
                )}
              </div>

              {parsedResult && (
                <div className="mb-4 bg-paper-dark rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-xs font-medium text-ink-faint uppercase tracking-wide">
                      解析结果预览
                    </h4>
                    <div className="flex gap-3 text-xs text-ink-muted">
                      <span>{parsedResult.meta.fileTypeLabel}</span>
                      <span>{(parsedResult.meta.fileSize / 1024).toFixed(1)} KB</span>
                      <span>{parsedResult.meta.charCount} 字符</span>
                    </div>
                  </div>
                  <textarea
                    className="w-full px-3 py-2 bg-paper border border-rule rounded-lg text-sm text-ink font-inherit resize-y leading-relaxed"
                    rows={5}
                    value={parsedResult.text}
                    onChange={(e) => {
                      setSourceContent(e.target.value)
                      setParsedResult({ ...parsedResult, text: e.target.value })
                    }}
                  />
                  <div className="mt-3 flex justify-end">
                    <button
                      type="button"
                      className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium cursor-pointer border-none bg-ink text-paper hover:bg-accent transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      onClick={() => handleAddFile(parsedResult.file)}
                      disabled={uploading || !sourceName || !parsedResult.text}
                    >
                      {uploading ? '添加中…' : '确认添加'}
                    </button>
                  </div>
                </div>
              )}

              {parsedFiles.length > 0 && (
                <div className="mb-4 bg-paper-dark rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-xs font-medium text-ink-faint uppercase tracking-wide">
                      已解析文件（{parsedFiles.length}）
                    </h4>
                    <button
                      type="button"
                      className="text-xs text-ink-faint hover:text-danger"
                      onClick={() => setParsedFiles([])}
                    >
                      清空
                    </button>
                  </div>
                  <div className="mb-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs text-ink-faint">批量设置类型</label>
                      <span className="text-xs text-ink-faint/70">（也可逐个调整</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {(Object.entries(TYPE_LABELS) as [SourceType, string][]).map(
                        ([type, label]) => (
                          <button
                            key={type}
                            type="button"
                            className={cn(
                              'px-2.5 py-1 rounded-md text-xs font-medium transition-all duration-150 border',
                              'bg-paper border-rule text-ink-muted hover:text-ink hover:border-ink-faint',
                            )}
                            onClick={() => {
                              setParsedFiles((prev) => prev.map((e) => ({ ...e, type })))
                            }}
                          >
                            全设为{label}
                          </button>
                        ),
                      )}
                    </div>
                  </div>
                  <div className="space-y-2 max-h-[260px] overflow-y-auto">
                    {parsedFiles.map((entry, i) => (
                      <div key={i} className="p-2 bg-paper rounded border border-rule">
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2 min-w-0">
                            <FileText
                              size={14}
                              className="text-accent shrink-0"
                              strokeWidth={1.5}
                            />
                            <span className="text-sm text-ink truncate">{entry.file.name}</span>
                            <span className="text-xs text-ink-faint shrink-0">
                              {entry.parsed.meta.charCount} 字符
                            </span>
                          </div>
                          <button
                            type="button"
                            className="text-xs text-ink-faint hover:text-danger shrink-0 ml-2"
                            onClick={() =>
                              setParsedFiles((prev) => prev.filter((_, idx) => idx !== i))
                            }
                          >
                            移除
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {(Object.entries(TYPE_LABELS) as [SourceType, string][]).map(
                            ([type, label]) => (
                              <button
                                key={type}
                                type="button"
                                className={cn(
                                  'px-2 py-0.5 rounded text-xs font-medium transition-all duration-150 border',
                                  entry.type === type
                                    ? 'bg-accent-bg border-accent/40 text-accent'
                                    : 'bg-paper-dark border-rule text-ink-faint hover:text-ink hover:border-ink-faint',
                                )}
                                onClick={() => {
                                  setParsedFiles((prev) =>
                                    prev.map((e, idx) => (idx === i ? { ...e, type } : e)),
                                  )
                                }}
                              >
                                {label}
                              </button>
                            ),
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 flex justify-end">
                    <button
                      type="button"
                      className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium cursor-pointer border-none bg-ink text-paper hover:bg-accent transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      onClick={handleAddMultipleFiles}
                      disabled={uploading}
                    >
                      {uploading ? '添加中…' : `批量添加（${parsedFiles.length} 个文件）`}
                    </button>
                  </div>
                </div>
              )}

              <div className="mb-4 bg-accent-bg/20 rounded-lg p-4">
                <h4 className="text-xs font-medium text-accent uppercase tracking-wide mb-3">
                  支持的文件格式
                </h4>
                <div className="grid grid-cols-4 gap-2">
                  {SUPPORTED_FORMATS.map((format) => (
                    <div
                      key={format.extension}
                      className="flex items-center gap-2 text-xs text-ink-muted"
                    >
                      <format.icon size={14} strokeWidth={1.5} />
                      <span>{format.label}</span>
                    </div>
                  ))}
                </div>
                <p className="mt-3 text-xs text-ink-faint">
                  提示：PDF / Word
                  文档通过后端专业库真实解析，文本类文件在浏览器端直接解析。图片请使用"截图识别"进行
                  OCR。
                </p>
              </div>
            </div>
          )}

          {activeTab === 'screenshot' && (
            <div role="tabpanel" id="panel-screenshot" aria-labelledby="tab-screenshot">
              <div className="mb-4">
                <span
                  className="block text-xs text-ink-faint mb-2 font-medium font-mono tracking-wide uppercase"
                  id="screenshot-upload-label"
                >
                  截图内容
                </span>
                {screenshotPreview ? (
                  <div className="bg-paper-dark rounded-lg p-4 text-center">
                    <img
                      src={screenshotPreview}
                      alt="截图预览"
                      className="max-w-full max-h-[300px] rounded-lg border border-rule mx-auto"
                    />
                    <div className="mt-3 text-xs text-accent font-medium">{ocrProgress}</div>
                  </div>
                ) : (
                  <div
                    className={`border-2 border-dashed border-rule rounded-lg p-10 text-center transition-colors duration-200 cursor-default hover:border-accent hover:bg-accent-bg/30 ${
                      fileDragOver ? 'border-accent bg-accent-bg' : ''
                    }`}
                    onPaste={(e) => {
                      const items = e.clipboardData.items
                      for (const item of items) {
                        if (item.type.startsWith('image/')) {
                          const file = item.getAsFile()
                          if (file) handleRecognizeScreenshot(file)
                          break
                        }
                      }
                    }}
                    onDragOver={(e) => {
                      e.preventDefault()
                      setFileDragOver(true)
                    }}
                    onDragLeave={() => setFileDragOver(false)}
                    onDrop={(e) => {
                      e.preventDefault()
                      setFileDragOver(false)
                      const file = e.dataTransfer.files[0]
                      if (file?.type.startsWith('image/')) {
                        handleRecognizeScreenshot(file)
                      }
                    }}
                    role="group"
                    aria-label="截图识别区域，支持粘贴截图或拖拽图片"
                  >
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-12 h-12 mb-3 rounded-full bg-paper-dark flex items-center justify-center text-accent">
                        <Image size={22} strokeWidth={1.5} />
                      </div>
                      <p className="text-sm text-ink mb-1 font-medium">
                        粘贴截图（Ctrl+V）或拖拽图片到这里
                      </p>
                      <p className="text-xs text-ink-faint">支持微信截图、网页截图、手机截图等</p>
                      <input
                        type="file"
                        id="screenshot-upload-modal"
                        accept="image/*"
                        onChange={(e) =>
                          e.target.files?.[0] && handleRecognizeScreenshot(e.target.files[0])
                        }
                        style={{ display: 'none' }}
                      />
                      <label
                        htmlFor="screenshot-upload-modal"
                        className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium cursor-pointer border bg-paper text-ink border-rule hover:bg-paper-dark hover:border-ink-faint transition-colors duration-200"
                        style={{ marginTop: '12px' }}
                      >
                        或点击选择图片
                      </label>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'url' && (
            <div role="tabpanel" id="panel-url" aria-labelledby="tab-url" className="space-y-4">
              <div>
                <label
                  htmlFor="source-name-url"
                  className="block text-xs text-ink-faint mb-2 font-medium font-mono tracking-wide uppercase"
                >
                  材料名称（可选）
                </label>
                <input
                  id="source-name-url"
                  type="text"
                  className="w-full px-3.5 py-2.5 bg-paper border border-rule rounded-lg text-sm text-ink font-inherit transition-colors duration-200 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/20"
                  placeholder="留空则使用URL"
                  value={sourceName}
                  onChange={(e) => setSourceName(e.target.value)}
                />
              </div>
              <div>
                <label
                  htmlFor="source-url"
                  className="block text-xs text-ink-faint mb-2 font-medium font-mono tracking-wide uppercase"
                >
                  网页链接
                </label>
                <input
                  id="source-url"
                  type="url"
                  className="w-full px-3.5 py-2.5 bg-paper border border-rule rounded-lg text-sm text-ink font-inherit transition-colors duration-200 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/20"
                  placeholder="https://example.com"
                  value={sourceUrl}
                  onChange={(e) => setSourceUrl(e.target.value)}
                />
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div
              role="tabpanel"
              id="panel-history"
              aria-labelledby="tab-history"
              className="space-y-4"
            >
              <div className="flex items-center justify-center">
                <span className="text-xs text-ink-faint font-medium font-mono tracking-wide uppercase">
                  历史材料（{historySources.length}）
                </span>
              </div>

              {loadingHistory ? (
                <div className="flex flex-col items-center justify-center text-center py-8">
                  <div className="w-5 h-5 border-2 border-accent/30 border-t-accent rounded-full animate-spin mb-2" />
                  <span className="text-xs text-ink-muted">加载中…</span>
                </div>
              ) : historySources.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center py-8">
                  <FolderOpen size={32} className="text-ink-faint mb-3" strokeWidth={1.5} />
                  <p className="text-sm text-ink-muted">暂无历史材料</p>
                  <p className="text-xs text-ink-faint mt-1">添加材料后可在这里查看和复用</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {historySources.map((source) => (
                    <div
                      key={source.id}
                      className={`p-3 rounded-lg border cursor-pointer transition-all duration-200 ${
                        selectedHistorySource?.id === source.id
                          ? 'border-accent bg-accent-bg/30'
                          : 'border-rule bg-paper-dark/30 hover:border-accent/50 hover:bg-paper-dark/50'
                      }`}
                      onClick={() => setSelectedHistorySource(source)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <FileText size={14} className="text-accent" strokeWidth={1.5} />
                          <span className="text-sm font-medium text-ink">{source.name}</span>
                          <span className="px-1.5 py-0.5 text-[10px] bg-paper text-ink-faint rounded border border-rule">
                            {TYPE_LABELS[source.type] || source.type}
                          </span>
                        </div>
                        {source.charCount && (
                          <span className="text-xs text-ink-faint">{source.charCount} 字符</span>
                        )}
                      </div>
                      <p className="text-xs text-ink-muted line-clamp-2">
                        {source.content.slice(0, 100)}...
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {selectedHistorySource && (
                <div className="p-4 bg-accent-bg/50 border border-accent-faint rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-xs font-medium text-accent uppercase tracking-wide">
                      材料详情
                    </h4>
                    <button
                      type="button"
                      onClick={() => setSelectedHistorySource(null)}
                      className="text-xs text-ink-faint hover:text-ink"
                    >
                      关闭
                    </button>
                  </div>
                  <div className="space-y-2 mb-4">
                    <div>
                      <label className="block text-[11px] text-ink-faint mb-1">名称</label>
                      <input
                        type="text"
                        className="w-full px-2 py-1.5 bg-paper border border-rule rounded text-sm text-ink"
                        value={selectedHistorySource.name}
                        onChange={(e) => {
                          setSelectedHistorySource({
                            ...selectedHistorySource,
                            name: e.target.value,
                          })
                        }}
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-ink-faint mb-1">类型</label>
                      <select
                        className="w-full px-2 py-1.5 bg-paper border border-rule rounded text-sm text-ink"
                        value={selectedHistorySource.type}
                        onChange={(e) => {
                          setSelectedHistorySource({
                            ...selectedHistorySource,
                            type: e.target.value as SourceType,
                          })
                        }}
                      >
                        {(['chat', 'doc', 'web', 'contract', 'screenshot'] as SourceType[]).map(
                          (t) => (
                            <option key={t} value={t}>
                              {TYPE_LABELS[t]}
                            </option>
                          ),
                        )}
                      </select>
                    </div>
                  </div>
                  <div className="mb-4">
                    <label className="block text-[11px] text-ink-faint mb-1">内容预览</label>
                    <textarea
                      className="w-full px-2 py-1.5 bg-paper border border-rule rounded text-xs text-ink resize-none"
                      rows={6}
                      value={selectedHistorySource.content}
                      onChange={(e) => {
                        setSelectedHistorySource({
                          ...selectedHistorySource,
                          content: e.target.value,
                        })
                      }}
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      className="px-3 py-1.5 rounded text-xs font-medium border border-rule text-ink-muted hover:bg-paper-dark"
                      onClick={() => {
                        setSourceName(selectedHistorySource.name)
                        setSourceContent(selectedHistorySource.content)
                        setSourceType(selectedHistorySource.type)
                        setSelectedHistorySource(null)
                        setActiveTab('text')
                      }}
                    >
                      编辑后添加
                    </button>
                    <button
                      type="button"
                      className="px-3 py-1.5 rounded text-xs font-medium border-none bg-accent text-paper hover:bg-accent/80 disabled:opacity-50"
                      onClick={handleAddHistorySource}
                      disabled={uploading}
                    >
                      {uploading ? '添加中…' : '直接添加到当前任务'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-3 mt-4">
            <button
              type="button"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium cursor-pointer border bg-paper-dark/60 text-ink-muted border-rule hover:bg-paper-dark hover:text-ink transition-colors duration-200"
              onClick={resetAndClose}
            >
              取消
            </button>
            {activeTab === 'text' && !parsedResult && (
              <button
                type="button"
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium cursor-pointer border-none bg-ink text-paper hover:bg-accent transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={handleAddText}
                disabled={uploading || !sourceName || !sourceContent}
              >
                {uploading ? '添加中…' : '添加材料'}
              </button>
            )}
            {activeTab === 'url' && (
              <button
                type="button"
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium cursor-pointer border-none bg-ink text-paper hover:bg-accent transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={handleAddUrl}
                disabled={uploading || !sourceUrl}
              >
                {uploading ? '添加中…' : '添加材料'}
              </button>
            )}
            {activeTab === 'screenshot' && sourceContent && (
              <button
                type="button"
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium cursor-pointer border-none bg-ink text-paper hover:bg-accent transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={handleAddText}
                disabled={uploading || !sourceName || !sourceContent}
              >
                添加材料
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
