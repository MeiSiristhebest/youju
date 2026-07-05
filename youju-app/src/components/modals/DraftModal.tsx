import { Check, Copy, RefreshCw, Sparkles, ThumbsUp } from 'lucide-react'
import { useState } from 'react'
import { Button } from '../ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog'

interface DraftModalProps {
  isOpen: boolean
  onClose: () => void
  draftText: string
  generating: boolean
  riskTitle: string
  onRegenerate: () => void
  onAdopt: (text: string) => void
}

export function DraftModal({
  isOpen,
  onClose,
  draftText,
  generating,
  riskTitle,
  onRegenerate,
  onAdopt,
}: DraftModalProps) {
  const [copied, setCopied] = useState(false)
  const [adopted, setAdopted] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(draftText)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (e) {
      console.error(e)
    }
  }

  const handleAdopt = () => {
    onAdopt(draftText)
    setAdopted(true)
    setTimeout(() => setAdopted(false), 2000)
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[560px] p-0 gap-0">
        <DialogHeader className="px-5 py-4 border-b border-rule flex flex-row items-center justify-between space-y-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-accent-bg flex items-center justify-center text-accent">
              <Sparkles size={16} strokeWidth={1.5} />
            </div>
            <div>
              <DialogTitle className="text-sm font-semibold text-ink font-display tracking-tight">
                沟通话术
              </DialogTitle>
              <DialogDescription className="text-[11px] text-ink-faint">
                关于「{riskTitle}」的确认
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-5 max-h-[60vh]">
          {generating ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-12 h-12 rounded-full bg-accent-bg flex items-center justify-center mb-4 animate-pulse">
                <Sparkles size={20} strokeWidth={1.5} className="text-accent" />
              </div>
              <p className="text-sm font-medium text-ink mb-1">正在生成话术…</p>
              <p className="text-xs text-ink-faint">AI 正在根据风险内容生成沟通话术</p>
            </div>
          ) : (
            <div className="bg-paper-dark/40 border border-rule rounded-lg p-4">
              <pre className="text-xs text-ink leading-relaxed whitespace-pre-wrap font-sans">
                {draftText}
              </pre>
            </div>
          )}
        </div>

        <DialogFooter className="px-5 py-3.5 border-t border-rule flex items-center justify-between sm:justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={onRegenerate}
            disabled={generating}
            data-icon="inline-start"
          >
            <RefreshCw size={13} strokeWidth={1.5} />
            重新生成
          </Button>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopy}
              disabled={generating || !draftText}
              data-icon="inline-start"
            >
              {copied ? (
                <Check size={13} strokeWidth={1.5} />
              ) : (
                <Copy size={13} strokeWidth={1.5} />
              )}
              {copied ? '已复制' : '复制'}
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={handleAdopt}
              disabled={generating || !draftText}
              data-icon="inline-start"
            >
              {adopted ? (
                <Check size={13} strokeWidth={1.5} />
              ) : (
                <ThumbsUp size={13} strokeWidth={1.5} />
              )}
              {adopted ? '已采纳' : '采纳'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
