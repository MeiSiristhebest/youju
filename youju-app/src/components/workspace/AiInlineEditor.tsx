import { Check, RefreshCw, Sparkles, Undo2, X } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

interface DiffSegment {
  type: 'unchanged' | 'added' | 'removed'
  value: string
}

interface AiInlineEditorProps {
  originalText: string
  riskId: string
  onConfirm: (newText: string, instruction: string) => void
  onClose: () => void
  size?: 'sm' | 'md'
}

const PRESET_INSTRUCTIONS = [
  { id: 'concise', label: '更精炼', description: '精简描述' },
  { id: 'formal', label: '更正式', description: '正式语气' },
  { id: 'evidence', label: '加入证据引用', description: '添加证据来源' },
  { id: 'casual', label: '更口语化', description: '口语化表达' },
]

function computeDiff(original: string, modified: string): DiffSegment[] {
  const result: DiffSegment[] = []

  if (original === modified) {
    return [{ type: 'unchanged', value: original }]
  }

  const origChars = original.split('')
  const modChars = modified.split('')

  let i = 0
  let j = 0

  while (i < origChars.length && j < modChars.length) {
    if (origChars[i] === modChars[j]) {
      let endI = i
      let endJ = j
      while (
        endI < origChars.length &&
        endJ < modChars.length &&
        origChars[endI] === modChars[endJ]
      ) {
        endI++
        endJ++
      }
      result.push({ type: 'unchanged', value: original.slice(i, endI) })
      i = endI
      j = endJ
    } else {
      let foundMatch = false
      for (
        let lookAhead = 1;
        lookAhead < Math.min(origChars.length - i, modChars.length - j, 20);
        lookAhead++
      ) {
        if (origChars[i + lookAhead] === modChars[j]) {
          result.push({ type: 'removed', value: original.slice(i, i + lookAhead) })
          i += lookAhead
          foundMatch = true
          break
        }
        if (origChars[i] === modChars[j + lookAhead]) {
          result.push({ type: 'added', value: modified.slice(j, j + lookAhead) })
          j += lookAhead
          foundMatch = true
          break
        }
      }
      if (!foundMatch) {
        result.push({ type: 'removed', value: origChars[i] })
        result.push({ type: 'added', value: modChars[j] })
        i++
        j++
      }
    }
  }

  if (i < origChars.length) {
    result.push({ type: 'removed', value: original.slice(i) })
  }
  if (j < modChars.length) {
    result.push({ type: 'added', value: modified.slice(j) })
  }

  return result
}

function mockRewrite(text: string, instruction: string): string {
  switch (instruction) {
    case '更精炼': {
      const sentences = text.split(/[。！？.!?]/).filter((s) => s.trim())
      if (sentences.length <= 1) return text
      const keySentences = sentences.slice(0, Math.max(1, Math.ceil(sentences.length * 0.6)))
      return `${keySentences.join('。')}。`
    }
    case '更正式': {
      return text
        .replace(/我们/g, '我方')
        .replace(/你们/g, '贵方')
        .replace(/觉得/g, '认为')
        .replace(/可能/g, '存在一定可能性')
        .replace(/有点/g, '在一定程度上')
        .replace(/问题/g, '事项')
        .replace(/搞清楚/g, '予以明确')
        .replace(/看看/g, '审阅')
    }
    case '加入证据引用': {
      return `${text}（根据相关材料显示，以上结论有相应证据支持。）`
    }
    case '更口语化': {
      return text
        .replace(/我方/g, '咱们这边')
        .replace(/贵方/g, '你们那边')
        .replace(/认为/g, '觉得')
        .replace(/存在一定可能性/g, '可能')
        .replace(/在一定程度上/g, '有点')
        .replace(/事项/g, '事儿')
        .replace(/予以明确/g, '搞清楚')
        .replace(/审阅/g, '看看')
    }
    default: {
      if (instruction.includes('缩短') || instruction.includes('精简')) {
        const sentences = text.split(/[。！？.!?]/).filter((s) => s.trim())
        if (sentences.length <= 1) return text
        return `${sentences.slice(0, Math.max(1, Math.ceil(sentences.length * 0.5))).join('。')}。`
      }
      if (instruction.includes('扩展') || instruction.includes('详细')) {
        return (
          text +
          '此外，需要注意的是该事项可能涉及多方利益，建议进行充分的沟通和协调，以确保各方达成共识。'
        )
      }
      return `【AI 重写】${text}`
    }
  }
}

export function AiInlineEditor({
  originalText,
  riskId,
  onConfirm,
  onClose,
  size = 'md',
}: AiInlineEditorProps) {
  const [instruction, setInstruction] = useState('')
  const [modifiedText, setModifiedText] = useState(originalText)
  const [isGenerating, setIsGenerating] = useState(false)
  const [diff, setDiff] = useState<DiffSegment[]>([])
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const generateRewrite = useCallback((text: string, instr: string) => {
    setIsGenerating(true)
    setDiff([])

    setTimeout(() => {
      const result = mockRewrite(text, instr)
      setModifiedText(result)
      setDiff(computeDiff(text, result))
      setIsGenerating(false)
    }, 600)
  }, [])

  const handlePresetClick = (preset: string) => {
    setInstruction(preset)
    generateRewrite(originalText, preset)
  }

  const handleGenerate = () => {
    if (!instruction.trim()) return
    generateRewrite(originalText, instruction.trim())
  }

  const handleConfirm = () => {
    onConfirm(modifiedText, instruction || 'AI 重写')
  }

  const handleUndo = () => {
    setModifiedText(originalText)
    setDiff([])
  }

  const handleRegenerate = () => {
    if (!instruction.trim()) return
    generateRewrite(originalText, instruction.trim())
  }

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus()
    }
  }, [])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        onClose()
      }
      if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
        const target = e.target as HTMLElement
        if (target.tagName === 'INPUT') {
          e.preventDefault()
          e.stopPropagation()
          handleGenerate()
        } else if (diff.length > 0) {
          e.preventDefault()
          e.stopPropagation()
          handleConfirm()
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown, true)
    return () => document.removeEventListener('keydown', handleKeyDown, true)
  }, [onClose, instruction, diff.length, modifiedText])

  const hasChanges = diff.length > 0 && diff.some((d) => d.type !== 'unchanged')

  return (
    <div
      ref={containerRef}
      className={cn(
        'border border-accent/30 rounded-lg bg-accent-bg/30 overflow-hidden animate-[fadeIn_0.2s_ease-out]',
        size === 'sm' ? 'mt-2' : 'mt-3',
      )}
    >
      <div className="px-3 py-2.5 border-b border-accent/20 bg-accent-bg/50">
        <div className="flex items-center gap-2">
          <div className="flex-1 relative">
            <Sparkles
              size={14}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-accent"
            />
            <input
              ref={inputRef}
              type="text"
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              placeholder="输入重写指令，例如：更精炼、更正式..."
              className={cn(
                'w-full pl-8 pr-20 py-1.5 rounded-md text-xs bg-paper border border-rule/60 text-ink placeholder:text-ink-faint focus:outline-none focus:border-accent/50 transition-colors',
                size === 'sm' ? 'text-[11px] py-1 pl-7' : '',
              )}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                  e.preventDefault()
                  handleGenerate()
                }
              }}
            />
            <button
              type="button"
              onClick={handleGenerate}
              disabled={isGenerating || !instruction.trim()}
              className={cn(
                'absolute right-1 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded text-[10px] font-medium transition-colors cursor-pointer',
                isGenerating || !instruction.trim()
                  ? 'bg-paper-dark text-ink-faint cursor-not-allowed'
                  : 'bg-accent text-paper hover:bg-accent-soft',
              )}
            >
              {isGenerating ? '生成中...' : '执行'}
            </button>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-6 h-6 rounded flex items-center justify-center text-ink-faint hover:text-ink hover:bg-paper-dark transition-colors cursor-pointer shrink-0"
            aria-label="关闭"
          >
            <X size={14} />
          </button>
        </div>

        <div className="flex items-center gap-1.5 mt-2 flex-wrap">
          {PRESET_INSTRUCTIONS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => handlePresetClick(preset.label)}
              disabled={isGenerating}
              className={cn(
                'px-2 py-0.5 rounded text-[10px] border transition-colors cursor-pointer',
                instruction === preset.label
                  ? 'bg-accent-bg border-accent/40 text-accent'
                  : 'bg-paper/50 border-rule/50 text-ink-muted hover:border-accent/30 hover:text-ink',
              )}
              title={preset.description}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {hasChanges && (
        <>
          <div className="px-3 py-2 border-b border-accent/10">
            <div className="flex items-center gap-3 text-[10px]">
              <div className="flex items-center gap-1 text-ink-faint">
                <span className="w-2 h-2 rounded-sm bg-danger/30"></span>
                <span>原文</span>
              </div>
              <div className="flex items-center gap-1 text-ink-faint">
                <span className="w-2 h-2 rounded-sm bg-success/30"></span>
                <span>AI 重写</span>
              </div>
            </div>
          </div>

          <div className="px-3 py-2.5 max-h-48 overflow-y-auto">
            <p className={cn('leading-relaxed', size === 'sm' ? 'text-[11px]' : 'text-xs')}>
              {diff.map((segment, idx) => {
                if (segment.type === 'unchanged') {
                  return (
                    <span key={idx} className="text-ink-muted">
                      {segment.value}
                    </span>
                  )
                }
                if (segment.type === 'removed') {
                  return (
                    <span
                      key={idx}
                      className="bg-danger/15 text-danger line-through rounded px-0.5"
                    >
                      {segment.value}
                    </span>
                  )
                }
                return (
                  <span key={idx} className="bg-success/20 text-success rounded px-0.5">
                    {segment.value}
                  </span>
                )
              })}
            </p>
          </div>

          <div className="px-3 py-2 border-t border-accent/10 bg-accent-bg/20 flex items-center justify-between">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleUndo}
                className="flex items-center gap-1 px-2 py-1 rounded text-[10px] text-ink-muted hover:text-ink hover:bg-paper-dark transition-colors cursor-pointer"
              >
                <Undo2 size={12} />
                撤销
              </button>
              <button
                type="button"
                onClick={handleRegenerate}
                disabled={isGenerating || !instruction.trim()}
                className={cn(
                  'flex items-center gap-1 px-2 py-1 rounded text-[10px] transition-colors cursor-pointer',
                  isGenerating || !instruction.trim()
                    ? 'text-ink-faint cursor-not-allowed'
                    : 'text-ink-muted hover:text-ink hover:bg-paper-dark',
                )}
              >
                <RefreshCw size={12} className={isGenerating ? 'animate-spin' : ''} />
                重新生成
              </button>
            </div>
            <button
              type="button"
              onClick={handleConfirm}
              className="flex items-center gap-1 px-3 py-1 rounded text-[10px] font-medium bg-accent text-paper hover:bg-accent-soft transition-colors cursor-pointer"
            >
              <Check size={12} />
              确认 (Enter)
            </button>
          </div>
        </>
      )}

      {!hasChanges && !isGenerating && (
        <div className="px-3 py-4 text-center">
          <p className="text-[11px] text-ink-faint">选择预设指令或输入自定义指令开始重写</p>
        </div>
      )}

      {isGenerating && (
        <div className="px-3 py-4 text-center">
          <div className="inline-flex items-center gap-2">
            <RefreshCw size={14} className="text-accent animate-spin" />
            <span className="text-[11px] text-ink-muted">AI 正在重写...</span>
          </div>
        </div>
      )}
    </div>
  )
}
