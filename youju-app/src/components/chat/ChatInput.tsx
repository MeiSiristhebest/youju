import { Check, ChevronDown, FileText, Link, Search, Send, Square } from 'lucide-react'
import { type KeyboardEvent, type ReactNode, useEffect, useMemo, useRef, useState } from 'react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { TYPE_LABELS } from '../../constants/workspace'
import { useChatStore } from '../../stores/useChatStore'
import { useSourceStore } from '../../stores/useSourceStore'
import type { ContextScope, SourceType } from '../../types'

export interface ChatInputProps {
  onSend: (content: string) => void
  onStop: () => void
  isStreaming: boolean
  disabled?: boolean
  /** 初始值（用于推荐问题点击填入输入框，配合父级 key 重挂载） */
  defaultValue?: string
}

// 上下文范围选项
const SCOPE_OPTIONS: { value: ContextScope; label: string; desc: string }[] = [
  { value: 'all', label: '全部素材', desc: '在所有素材中检索' },
  { value: 'current', label: '当前任务素材', desc: '使用当前会话关联的素材' },
  { value: 'custom', label: '指定素材', desc: '手动选择参与检索的素材' },
]

const MAX_TEXTAREA_HEIGHT = 200

const SOURCE_TYPE_ICONS: Record<SourceType, ReactNode> = {
  chat: <FileText size={14} strokeWidth={1.5} />,
  doc: <FileText size={14} strokeWidth={1.5} />,
  web: <Link size={14} strokeWidth={1.5} />,
  screenshot: <FileText size={14} strokeWidth={1.5} />,
  contract: <FileText size={14} strokeWidth={1.5} />,
  other: <FileText size={14} strokeWidth={1.5} />,
}

export function ChatInput({ onSend, onStop, isStreaming, disabled, defaultValue }: ChatInputProps) {
  const [value, setValue] = useState(defaultValue ?? '')
  const [scopeOpen, setScopeOpen] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)

  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const scopeRef = useRef<HTMLDivElement>(null)

  const contextScope = useChatStore((s) => s.contextScope)
  const selectedSourceIds = useChatStore((s) => s.selectedSourceIds)
  const setContextScope = useChatStore((s) => s.setContextScope)
  const setSelectedSourceIds = useChatStore((s) => s.setSelectedSourceIds)

  // textarea 自适应高度：内容增长时增高，最大 200px
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, MAX_TEXTAREA_HEIGHT)}px`
  }, [value])

  // 点击外部关闭范围下拉
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (scopeRef.current && !scopeRef.current.contains(e.target as Node)) {
        setScopeOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const canSend = value.trim().length > 0 && !disabled && !isStreaming

  const handleSend = () => {
    const trimmed = value.trim()
    if (!trimmed || isStreaming || disabled) return
    onSend(trimmed)
    setValue('')
  }

  // Enter 发送 / Shift+Enter 换行；输入法组合状态不触发
  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleScopeSelect = (scope: ContextScope) => {
    if (scope === 'custom') {
      setScopeOpen(false)
      setPickerOpen(true)
      return
    }
    setContextScope(scope)
    setScopeOpen(false)
  }

  const currentScopeOption = SCOPE_OPTIONS.find((o) => o.value === contextScope) ?? SCOPE_OPTIONS[0]

  return (
    <div className="rounded-2xl border border-rule bg-paper shadow-sm overflow-hidden">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        placeholder="输入问题，Enter 发送，Shift+Enter 换行"
        aria-label="聊天输入框"
        rows={1}
        style={{ maxHeight: MAX_TEXTAREA_HEIGHT }}
        className="block w-full resize-none bg-transparent px-4 pt-3 pb-2 text-base text-ink placeholder:text-ink-faint focus:outline-none disabled:opacity-50"
      />

      <div className="flex items-center justify-between gap-2 border-t border-rule/60 px-3 py-2">
        {/* 上下文范围选择器 */}
        <div ref={scopeRef} className="relative shrink-0">
          <button
            type="button"
            onClick={() => setScopeOpen((v) => !v)}
            disabled={disabled}
            aria-haspopup="listbox"
            aria-expanded={scopeOpen}
            aria-label="选择上下文范围"
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-sm text-ink-muted bg-paper-dark border border-rule/60 hover:border-accent/40 hover:text-ink rounded-lg transition-colors disabled:opacity-50 disabled:hover:bg-paper-dark disabled:hover:border-rule/60"
          >
            <Search size={13} strokeWidth={1.75} className="shrink-0 text-ink-faint" />
            <span className="text-[11px] text-ink-faint shrink-0">检索范围</span>
            <span className="max-w-[120px] truncate font-medium">{currentScopeOption.label}</span>
            {contextScope === 'custom' && selectedSourceIds.length > 0 && (
              <span className="inline-flex items-center justify-center min-w-[16px] h-4 px-1 text-[10px] font-mono rounded-full bg-accent text-paper">
                {selectedSourceIds.length}
              </span>
            )}
            <ChevronDown
              size={13}
              strokeWidth={2}
              className={cn('transition-transform duration-200', scopeOpen && 'rotate-180')}
            />
          </button>

          {scopeOpen && (
            <div
              role="listbox"
              className="absolute bottom-full left-0 mb-1 w-56 bg-paper border border-rule rounded-lg shadow-lg z-10 overflow-hidden animate-[fadeIn_0.15s_ease-out]"
            >
              {SCOPE_OPTIONS.map((option) => {
                const isActive = contextScope === option.value
                return (
                  <button
                    key={option.value}
                    type="button"
                    role="option"
                    aria-selected={isActive}
                    onClick={() => handleScopeSelect(option.value)}
                    className={cn(
                      'w-full flex items-start gap-2 px-3 py-2 text-left transition-colors',
                      isActive ? 'bg-accent-bg/60' : 'hover:bg-paper-dark',
                    )}
                  >
                    <div className="flex-1 min-w-0">
                      <div
                        className={cn('text-xs font-medium', isActive ? 'text-accent' : 'text-ink')}
                      >
                        {option.label}
                      </div>
                      <div className="text-[10px] text-ink-faint mt-0.5">{option.desc}</div>
                    </div>
                    {isActive && (
                      <Check size={14} className="text-accent shrink-0 mt-0.5" strokeWidth={2} />
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* 发送 / 停止按钮：流式过程中切换为停止（danger 色 + Square 图标） */}
        {isStreaming ? (
          <button
            type="button"
            onClick={onStop}
            aria-label="停止生成"
            className="inline-flex items-center justify-center gap-1.5 px-3 h-8 rounded-lg bg-danger text-paper text-xs font-medium hover:bg-danger/90 transition-colors"
          >
            <Square size={12} className="fill-current" strokeWidth={2} />
            停止
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSend}
            disabled={!canSend}
            aria-label="发送消息"
            className="inline-flex items-center justify-center gap-1.5 px-3 h-8 rounded-lg bg-accent text-paper text-xs font-medium hover:bg-accent/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Send size={12} strokeWidth={2} />
            发送
          </button>
        )}
      </div>

      <SourcePickerDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        selectedIds={selectedSourceIds}
        onConfirm={(ids) => {
          setSelectedSourceIds(ids)
          setContextScope('custom')
        }}
      />
    </div>
  )
}

// ====== 素材多选弹窗（复用 SourcePanel 列表样式 + shadcn Dialog） ======
interface SourcePickerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedIds: string[]
  onConfirm: (ids: string[]) => void
}

function SourcePickerDialog({
  open,
  onOpenChange,
  selectedIds,
  onConfirm,
}: SourcePickerDialogProps) {
  const sources = useSourceStore((s) => s.sources)
  const [draft, setDraft] = useState<Set<string>>(new Set(selectedIds))
  const [query, setQuery] = useState('')

  // 打开时同步已选状态
  useEffect(() => {
    if (open) {
      setDraft(new Set(selectedIds))
      setQuery('')
    }
  }, [open, selectedIds])

  const filtered = useMemo(() => {
    if (!query.trim()) return sources
    const q = query.toLowerCase()
    return sources.filter(
      (s) => s.name.toLowerCase().includes(q) || s.content.toLowerCase().includes(q),
    )
  }, [sources, query])

  const toggle = (id: string) => {
    setDraft((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const handleConfirm = () => {
    onConfirm(Array.from(draft))
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>选择检索素材</DialogTitle>
          <DialogDescription>勾选参与 RAG 检索的素材，未勾选则视为全部素材。</DialogDescription>
        </DialogHeader>

        {/* 搜索框 */}
        <div className="relative">
          <Search
            size={14}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-faint"
            strokeWidth={1.5}
          />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜索素材名称或内容..."
            className="w-full pl-8 pr-3 py-2 text-xs bg-paper-dark border border-rule/60 rounded-lg text-ink placeholder:text-ink-faint focus:outline-none focus:border-accent/50"
          />
        </div>

        {/* 素材列表（复用 SourcePanel 列表样式） */}
        <div className="max-h-72 min-h-32 overflow-y-auto -mx-1 px-1 divide-y divide-rule/60">
          {filtered.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-xs text-ink-faint">
                {sources.length === 0 ? '暂无可用素材' : '没有匹配的素材'}
              </p>
            </div>
          ) : (
            filtered.map((source) => {
              const isSelected = draft.has(source.id)
              return (
                <button
                  key={source.id}
                  type="button"
                  onClick={() => toggle(source.id)}
                  aria-pressed={isSelected}
                  className={cn(
                    'w-full flex items-center gap-2.5 px-2 py-2 text-left transition-colors',
                    isSelected ? 'bg-accent-bg/40' : 'hover:bg-paper-dark/60',
                  )}
                >
                  <div
                    className={cn(
                      'w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors',
                      isSelected
                        ? 'bg-accent border-accent text-paper'
                        : 'border-rule text-transparent',
                    )}
                  >
                    {isSelected && <Check size={10} strokeWidth={3} />}
                  </div>
                  <div
                    className={cn(
                      'w-7 h-7 rounded-md flex items-center justify-center shrink-0',
                      isSelected ? 'bg-accent text-paper' : 'bg-paper-dark text-ink-muted',
                    )}
                  >
                    {SOURCE_TYPE_ICONS[source.type as SourceType] ?? (
                      <FileText size={14} strokeWidth={1.5} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-ink truncate">{source.name}</div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-ink-faint">
                        {TYPE_LABELS[source.type as SourceType] ?? source.type}
                      </span>
                      {source.charCount != null && (
                        <>
                          <span className="text-ink-faint/40">·</span>
                          <span className="text-[10px] text-ink-faint font-mono">
                            {source.charCount}字
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </button>
              )
            })
          )}
        </div>

        <DialogFooter>
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-3 text-xs text-ink-muted">
              <span>
                已选 <span className="font-mono text-accent">{draft.size}</span> / {sources.length}
              </span>
              {draft.size > 0 && (
                <button
                  type="button"
                  onClick={() => setDraft(new Set())}
                  className="text-ink-faint hover:text-ink-muted underline-offset-2 hover:underline"
                >
                  清空
                </button>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
                取消
              </Button>
              <Button size="sm" onClick={handleConfirm}>
                <Check data-icon="inline-start" strokeWidth={2} />
                确认
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
