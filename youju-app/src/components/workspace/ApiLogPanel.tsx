import { ChevronDown, ChevronUp, Search, Trash2, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useApiLogsStore } from '../../stores'
import type { ApiLogEntry } from '../../stores/useApiLogsStore'

interface ApiLogPanelProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
}

const getStatusColor = (statusCode: number): string => {
  if (statusCode >= 200 && statusCode < 300) return 'text-emerald-500 bg-emerald-500/10'
  if (statusCode >= 400 && statusCode < 500) return 'text-amber-500 bg-amber-500/10'
  if (statusCode >= 500) return 'text-red-500 bg-red-500/10'
  return 'text-ink-faint bg-paper-dark'
}

const getMethodColor = (method: string): string => {
  switch (method) {
    case 'GET':
      return 'text-blue-500'
    case 'POST':
      return 'text-emerald-500'
    case 'PUT':
      return 'text-amber-500'
    case 'DELETE':
      return 'text-red-500'
    case 'PATCH':
      return 'text-purple-500'
    default:
      return 'text-ink-faint'
  }
}

const formatTime = (timestamp: number): string => {
  const date = new Date(timestamp)
  const hours = date.getHours().toString().padStart(2, '0')
  const minutes = date.getMinutes().toString().padStart(2, '0')
  const seconds = date.getSeconds().toString().padStart(2, '0')
  const ms = date.getMilliseconds().toString().padStart(3, '0')
  return `${hours}:${minutes}:${seconds}.${ms}`
}

const formatDuration = (ms: number): string => {
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(2)}s`
}

const JsonView = ({ data }: { data: unknown }) => {
  const [expanded, setExpanded] = useState(true)

  const formatJson = (obj: unknown, indent = 0): string => {
    const spaces = '  '.repeat(indent)
    if (obj === null) return 'null'
    if (obj === undefined) return 'undefined'
    if (typeof obj === 'string') return `"${obj}"`
    if (typeof obj === 'number' || typeof obj === 'boolean') return String(obj)
    if (Array.isArray(obj)) {
      if (obj.length === 0) return '[]'
      const items = obj.map((item) => `${spaces}  ${formatJson(item, indent + 1)}`).join(',\n')
      return `[\n${items}\n${spaces}]`
    }
    if (typeof obj === 'object') {
      const entries = Object.entries(obj as Record<string, unknown>)
      if (entries.length === 0) return '{}'
      const items = entries
        .map(([key, value]) => `${spaces}  "${key}": ${formatJson(value, indent + 1)}`)
        .join(',\n')
      return `{\n${items}\n${spaces}}`
    }
    return String(obj)
  }

  return (
    <div className="rounded-lg bg-paper-dark/50 border border-rule/60 overflow-hidden">
      <button
        type="button"
        className="w-full flex items-center justify-between px-3 py-2 text-xs text-ink-muted hover:bg-paper-dark transition-colors cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <span className="font-mono text-[10px] uppercase tracking-wider text-ink-faint">JSON</span>
        {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
      </button>
      {expanded && (
        <pre className="px-3 py-2 text-xs font-mono text-ink overflow-x-auto max-h-64 overflow-y-auto">
          <code>{formatJson(data)}</code>
        </pre>
      )}
    </div>
  )
}

const LogDetail = ({ log }: { log: ApiLogEntry }) => {
  return (
    <div className="px-4 py-3 bg-paper-dark/30 border-t border-rule/40 space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <div className="text-[10px] font-mono uppercase tracking-wider text-ink-faint mb-1">
            时间
          </div>
          <div className="text-xs text-ink font-mono">
            {new Date(log.timestamp).toLocaleString('zh-CN')}
          </div>
        </div>
        <div>
          <div className="text-[10px] font-mono uppercase tracking-wider text-ink-faint mb-1">
            耗时
          </div>
          <div className="text-xs text-ink font-mono">{formatDuration(log.durationMs)}</div>
        </div>
      </div>

      {log.requestBody !== undefined && log.requestBody !== null && (
        <div>
          <div className="text-[10px] font-mono uppercase tracking-wider text-ink-faint mb-2">
            请求体
          </div>
          <JsonView data={log.requestBody} />
        </div>
      )}

      {log.responseBody !== undefined && log.responseBody !== null && (
        <div>
          <div className="text-[10px] font-mono uppercase tracking-wider text-ink-faint mb-2">
            响应体
          </div>
          <JsonView data={log.responseBody} />
        </div>
      )}

      {log.error && (
        <div>
          <div className="text-[10px] font-mono uppercase tracking-wider text-red-500 mb-2">
            错误
          </div>
          <div className="px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-500 font-mono">
            {log.error}
          </div>
        </div>
      )}
    </div>
  )
}

export function ApiLogPanel({ isOpen, onOpenChange }: ApiLogPanelProps) {
  const {
    logs,
    clearLogs,
    statusFilter,
    searchQuery,
    selectedLogId,
    setStatusFilter,
    setSearchQuery,
    setSelectedLogId,
  } = useApiLogsStore()

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      if (statusFilter === '2xx' && !(log.statusCode >= 200 && log.statusCode < 300)) return false
      if (statusFilter === '4xx' && !(log.statusCode >= 400 && log.statusCode < 500)) return false
      if (statusFilter === '5xx' && !(log.statusCode >= 500)) return false
      if (searchQuery && !log.path.toLowerCase().includes(searchQuery.toLowerCase())) return false
      return true
    })
  }, [logs, statusFilter, searchQuery])

  const handleLogClick = (logId: string) => {
    setSelectedLogId(selectedLogId === logId ? null : logId)
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[1000]"
      onClick={(e) => {
        if (e.target === e.currentTarget) onOpenChange(false)
      }}
      role="button"
      tabIndex={-1}
    >
      <div className="absolute top-0 right-0 bottom-0 w-full max-w-2xl bg-paper border-l border-rule shadow-2xl flex flex-col animate-[slideInRight_0.2s_ease-out]">
        <div className="px-5 py-4 border-b border-rule flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <h3 className="text-base font-semibold text-ink font-display tracking-tight">
              API 日志
            </h3>
            <span className="px-2 py-0.5 text-[10px] font-mono bg-paper-dark text-ink-faint rounded-md">
              {logs.length}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              className="w-8 h-8 flex items-center justify-center text-ink-faint hover:text-ink hover:bg-paper-dark rounded-lg transition-colors cursor-pointer"
              onClick={clearLogs}
              title="清空日志"
              aria-label="清空日志"
            >
              <Trash2 size={14} strokeWidth={1.5} />
            </button>
            <button
              type="button"
              className="w-8 h-8 flex items-center justify-center text-ink-faint hover:text-ink hover:bg-paper-dark rounded-lg transition-colors cursor-pointer"
              onClick={() => onOpenChange(false)}
              title="关闭"
              aria-label="关闭"
            >
              <X size={16} strokeWidth={1.5} />
            </button>
          </div>
        </div>

        <div className="px-4 py-3 border-b border-rule/60 space-y-3 shrink-0">
          <div className="relative">
            <Search
              size={14}
              strokeWidth={1.5}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint"
            />
            <input
              type="text"
              placeholder="搜索路径..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-paper-dark border border-rule rounded-lg text-ink placeholder-ink-faint focus:outline-none focus:border-accent/50 font-mono"
            />
          </div>

          <div className="flex items-center gap-1">
            {(['all', '2xx', '4xx', '5xx'] as const).map((filter) => (
              <button
                key={filter}
                type="button"
                className={`px-3 py-1 text-xs font-mono rounded-md cursor-pointer transition-colors ${
                  statusFilter === filter
                    ? 'bg-accent/10 text-accent'
                    : 'text-ink-faint hover:text-ink hover:bg-paper-dark'
                }`}
                onClick={() => setStatusFilter(filter)}
              >
                {filter === 'all' ? '全部' : filter}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filteredLogs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-12 h-12 rounded-full bg-paper-dark flex items-center justify-center mb-4">
                <Search size={20} strokeWidth={1.5} className="text-ink-faint" />
              </div>
              <p className="text-sm text-ink-muted mb-1">暂无日志</p>
              <p className="text-xs text-ink-faint">
                {logs.length === 0 ? 'API 调用会显示在这里' : '没有匹配的日志'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-rule/40">
              {filteredLogs.map((log) => (
                <div key={log.id}>
                  <button
                    type="button"
                    className="w-full px-4 py-3 flex items-center gap-3 hover:bg-paper-dark/50 cursor-pointer transition-colors text-left"
                    onClick={() => handleLogClick(log.id)}
                  >
                    <span
                      className={`text-[10px] font-mono font-bold w-12 ${getMethodColor(log.method)}`}
                    >
                      {log.method}
                    </span>
                    <span className="flex-1 text-xs text-ink font-mono truncate">{log.path}</span>
                    <span
                      className={`px-1.5 py-0.5 text-[10px] font-mono font-medium rounded ${getStatusColor(log.statusCode)}`}
                    >
                      {log.statusCode}
                    </span>
                    <span className="text-[10px] text-ink-faint font-mono w-16 text-right">
                      {formatDuration(log.durationMs)}
                    </span>
                    <span className="text-[10px] text-ink-faint font-mono w-20 text-right">
                      {formatTime(log.timestamp)}
                    </span>
                  </button>
                  {selectedLogId === log.id && <LogDetail log={log} />}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="px-4 py-2 border-t border-rule/60 shrink-0">
          <p className="text-[10px] text-ink-faint text-center font-mono">
            最多保留 {logs.length > 0 ? useApiLogsStore.getState().maxLogs : 50} 条记录
          </p>
        </div>
      </div>
    </div>
  )
}
