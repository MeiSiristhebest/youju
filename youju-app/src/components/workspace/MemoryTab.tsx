import { Brain, Loader2, Plus, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { cn } from '../../lib/utils'
import { chatApi } from '../../services/chatApi'
import type { ChatMemory } from '../../types'

// SubTask 22.5: 长期记忆管理区
// 显示当前用户/会话的所有记忆列表，支持查看 / 删除 / 添加
// 调用 /api/v1/chat/memory 端点（前端代理路径 /api/chat/memory）

function formatRelativeTime(iso: string): string {
  const date = new Date(iso)
  const now = Date.now()
  const diffMs = now - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  const diffHour = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHour / 24)
  if (diffMin < 1) return '刚刚'
  if (diffMin < 60) return `${diffMin} 分钟前`
  if (diffHour < 24) return `${diffHour} 小时前`
  if (diffDay < 30) return `${diffDay} 天前`
  return date.toLocaleDateString('zh-CN')
}

export function MemoryTab() {
  const [memories, setMemories] = useState<ChatMemory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [newContent, setNewContent] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const loadMemories = async () => {
    setLoading(true)
    setError(null)
    try {
      const list = await chatApi.listMemories()
      // 按 createdAt 降序排列（最新在前）
      list.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      setMemories(list)
    } catch (e) {
      setError(e instanceof Error ? e.message : '加载记忆失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadMemories()
  }, [])

  const handleAdd = async () => {
    const content = newContent.trim()
    if (!content) return
    setSubmitting(true)
    setError(null)
    try {
      const created = await chatApi.createMemory(content)
      // 乐观更新：直接插入到列表头部
      setMemories((prev) => [
        {
          id: created.id,
          userId: null,
          sessionId: null,
          content: created.content,
          createdAt: created.createdAt,
        },
        ...prev,
      ])
      setNewContent('')
    } catch (e) {
      setError(e instanceof Error ? e.message : '添加记忆失败')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    setDeletingId(id)
    setError(null)
    try {
      await chatApi.deleteMemory(id)
      setMemories((prev) => prev.filter((m) => m.id !== id))
    } catch (e) {
      setError(e instanceof Error ? e.message : '删除记忆失败')
    } finally {
      setDeletingId(null)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Ctrl/Cmd + Enter 快速提交
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault()
      void handleAdd()
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex items-start gap-3 mb-3">
        <div className="w-8 h-8 rounded-lg bg-accent-bg flex items-center justify-center text-accent shrink-0">
          <Brain size={16} strokeWidth={1.5} />
        </div>
        <div>
          <h4 className="text-sm font-semibold text-ink">长期记忆</h4>
          <p className="text-[11px] text-ink-faint mt-0.5">
            跨会话保留的用户偏好，会在新对话开始时自动注入系统提示
          </p>
        </div>
      </div>

      {/* 添加记忆输入区 */}
      <div className="bg-paper-dark/30 border border-rule/50 rounded-lg p-4">
        <label className="text-xs text-ink font-medium block mb-2">添加新记忆</label>
        <textarea
          value={newContent}
          onChange={(e) => setNewContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="例如：用户偏好使用简洁的中文回答；用户关注合同违约金条款..."
          maxLength={2000}
          rows={3}
          className="w-full px-3 py-2 bg-paper border border-rule/60 rounded-md text-xs text-ink placeholder:text-ink-faint focus:outline-none focus:border-accent/50 resize-y min-h-[60px] max-h-[160px]"
        />
        <div className="flex items-center justify-between mt-2">
          <span className="text-[10px] text-ink-faint">{newContent.length}/2000</span>
          <button
            type="button"
            onClick={() => void handleAdd()}
            disabled={!newContent.trim() || submitting}
            className={cn(
              'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-medium transition-colors',
              !newContent.trim() || submitting
                ? 'bg-paper-dark text-ink-faint cursor-not-allowed'
                : 'bg-accent text-paper hover:bg-accent-tertiary cursor-pointer',
            )}
          >
            {submitting ? (
              <Loader2 size={12} strokeWidth={1.5} className="animate-spin" />
            ) : (
              <Plus size={12} strokeWidth={1.5} />
            )}
            添加记忆
          </button>
        </div>
        <p className="text-[10px] text-ink-faint mt-2">提示：Ctrl + Enter 快速提交</p>
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="bg-danger-bg border border-danger/20 rounded-lg p-3">
          <p className="text-[11px] text-danger">{error}</p>
        </div>
      )}

      {/* 记忆列表 */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-[11px] font-semibold text-ink-faint uppercase tracking-wide font-mono">
            已保存的记忆
          </h4>
          <span className="text-[10px] text-ink-faint">{memories.length} 条</span>
        </div>

        {loading ? (
          <div className="bg-paper-dark/30 border border-rule/50 rounded-lg p-6 flex items-center justify-center">
            <Loader2 size={16} strokeWidth={1.5} className="animate-spin text-ink-faint" />
            <span className="text-xs text-ink-faint ml-2">加载中...</span>
          </div>
        ) : memories.length === 0 ? (
          <div className="bg-paper-dark/30 border border-rule/50 rounded-lg p-6 text-center">
            <p className="text-xs text-ink-faint">暂无长期记忆</p>
            <p className="text-[10px] text-ink-faint mt-1">
              添加记忆后，系统会在新对话中自动检索相关记忆并注入上下文
            </p>
          </div>
        ) : (
          <div className="bg-paper-dark/30 border border-rule/50 rounded-lg divide-y divide-rule/40">
            {memories.map((memory) => (
              <div key={memory.id} className="flex items-start gap-3 px-4 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-ink whitespace-pre-wrap break-words">
                    {memory.content}
                  </p>
                  <p className="text-[10px] text-ink-faint mt-1">
                    {formatRelativeTime(memory.createdAt)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void handleDelete(memory.id)}
                  disabled={deletingId === memory.id}
                  aria-label="删除记忆"
                  className={cn(
                    'shrink-0 w-7 h-7 grid place-items-center rounded-md transition-colors',
                    deletingId === memory.id
                      ? 'text-ink-faint cursor-not-allowed'
                      : 'text-ink-faint hover:text-danger hover:bg-danger-bg cursor-pointer',
                  )}
                >
                  {deletingId === memory.id ? (
                    <Loader2 size={12} strokeWidth={1.5} className="animate-spin" />
                  ) : (
                    <Trash2 size={12} strokeWidth={1.5} />
                  )}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 说明区 */}
      <div className="bg-accent-bg/20 border border-accent-faint/40 rounded-lg p-4">
        <h4 className="text-xs font-semibold text-accent mb-2">工作原理</h4>
        <ul className="text-[11px] text-ink-faint space-y-1 list-disc list-inside">
          <li>每次新对话发送消息时，系统会检索 Top 3 相关记忆</li>
          <li>检索基于向量相似度（BGE-M3 1024 维 embedding）</li>
          <li>记忆以"用户偏好记忆"格式注入系统提示，影响 AI 回答风格</li>
          <li>记忆受 tenant 隔离：登录用户按 user_id 隔离，匿名用户按 session_id 隔离</li>
        </ul>
      </div>
    </div>
  )
}
