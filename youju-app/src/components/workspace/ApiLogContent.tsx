import {
  ArrowLeft,
  Check,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  Copy,
  Search,
  Trash2,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { useApiLogsStore } from '../../stores'
import type { ApiLogEntry } from '../../stores/useApiLogsStore'

const getStatusColor = (statusCode: number): string => {
  if (statusCode >= 200 && statusCode < 300) return 'text-success bg-success-bg'
  if (statusCode >= 400 && statusCode < 500) return 'text-warning bg-warning-bg'
  if (statusCode >= 500) return 'text-danger bg-danger-bg'
  return 'text-ink-faint bg-paper-dark'
}

const getMethodColor = (method: string): string => {
  switch (method) {
    case 'GET':
      return 'text-info'
    case 'POST':
      return 'text-accent'
    case 'PUT':
      return 'text-accent-secondary'
    case 'DELETE':
      return 'text-danger'
    case 'PATCH':
      return 'text-accent-tertiary'
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

const CopyButton = ({ text, label }: { text: string; label?: string }) => {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // ignore
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="flex items-center gap-1 text-[10px] text-ink-faint hover:text-accent transition-colors"
      title={label || '复制'}
    >
      {copied ? <Check size={11} className="text-success" /> : <Copy size={11} />}
      {copied ? '已复制' : label || '复制'}
    </button>
  )
}

const JsonView = ({ data, label }: { data: unknown; label?: string }) => {
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

  const jsonText = formatJson(data)

  return (
    <div className="rounded-lg bg-paper-dark/50 border border-rule/60 overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2">
        <button
          type="button"
          className="flex items-center gap-2 text-xs text-ink-muted hover:bg-transparent cursor-pointer"
          onClick={() => setExpanded(!expanded)}
        >
          <span className="font-mono text-[10px] uppercase tracking-wider text-ink-faint">
            {label || 'JSON'}
          </span>
          {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </button>
        <CopyButton text={jsonText} label="复制" />
      </div>
      {expanded && (
        <pre className="px-3 py-2 text-xs font-mono text-ink overflow-x-auto max-h-64 overflow-y-auto border-t border-rule/30">
          <code>{jsonText}</code>
        </pre>
      )}
    </div>
  )
}

const LogDetail = ({ log }: { log: ApiLogEntry }) => {
  const fullLogText = `[${log.method}] ${log.path}
状态: ${log.statusCode}
耗时: ${formatDuration(log.durationMs)}
时间: ${new Date(log.timestamp).toLocaleString('zh-CN')}
${
  log.requestBody !== undefined && log.requestBody !== null
    ? `\n--- 请求体 ---\n${JSON.stringify(log.requestBody, null, 2)}`
    : ''
}
${
  log.responseBody !== undefined && log.responseBody !== null
    ? `\n--- 响应体 ---\n${JSON.stringify(log.responseBody, null, 2)}`
    : ''
}
${log.error ? `\n--- 错误 ---\n${log.error}` : ''}`.trim()

  return (
    <div className="px-4 py-3 bg-paper-dark/30 border-t border-rule/40 space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-[10px] font-mono uppercase tracking-wider text-ink-faint">
          日志详情
        </div>
        <CopyButton text={fullLogText} label="复制全部" />
      </div>

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
          <JsonView data={log.requestBody} label="请求体" />
        </div>
      )}

      {log.responseBody !== undefined && log.responseBody !== null && (
        <div>
          <div className="text-[10px] font-mono uppercase tracking-wider text-ink-faint mb-2">
            响应体
          </div>
          <JsonView data={log.responseBody} label="响应体" />
        </div>
      )}

      {log.error && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="text-[10px] font-mono uppercase tracking-wider text-danger">错误</div>
            <CopyButton text={log.error} label="复制错误" />
          </div>
          <div className="px-3 py-2 rounded-lg bg-danger-bg border border-danger/20 text-xs text-danger font-mono">
            {log.error}
          </div>
        </div>
      )}
    </div>
  )
}

interface ApiLogContentProps {
  onClose?: () => void
}

export function ApiLogContent({ onClose }: ApiLogContentProps) {
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

  const [copyAllCopied, setCopyAllCopied] = useState(false)

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

  const generateAllLogsText = (logEntries: ApiLogEntry[]): string => {
    return logEntries
      .map((log, index) => {
        const header = `=== 日志 ${index + 1} / ${logEntries.length} ===`
        const body = `[${log.method}] ${log.path}
状态: ${log.statusCode}
耗时: ${formatDuration(log.durationMs)}
时间: ${new Date(log.timestamp).toLocaleString('zh-CN')}
${
  log.requestBody !== undefined && log.requestBody !== null
    ? `\n--- 请求体 ---\n${JSON.stringify(log.requestBody, null, 2)}`
    : ''
}
${
  log.responseBody !== undefined && log.responseBody !== null
    ? `\n--- 响应体 ---\n${JSON.stringify(log.responseBody, null, 2)}`
    : ''
}
${log.error ? `\n--- 错误 ---\n${log.error}` : ''}`.trim()
        return `${header}\n${body}`
      })
      .join('\n\n')
  }

  const handleCopyAll = async () => {
    try {
      const text = generateAllLogsText(filteredLogs)
      await navigator.clipboard.writeText(text)
      setCopyAllCopied(true)
      setTimeout(() => setCopyAllCopied(false), 2000)
    } catch {
      // ignore
    }
  }

  return (
    <div className="h-full flex flex-col bg-paper">
      <div className="px-5 py-4 border-b border-rule flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          {onClose && (
            <button
              type="button"
              className="flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium text-ink-muted hover:text-ink hover:bg-paper-dark/50 transition-colors shrink-0"
              onClick={onClose}
            >
              <ArrowLeft size={14} strokeWidth={1.5} />
              返回
            </button>
          )}
          <h3 className="text-base font-semibold text-ink font-display tracking-tight">API 日志</h3>
          <span className="px-2 py-0.5 text-[10px] font-mono bg-paper-dark text-ink-faint rounded-md">
            {logs.length}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-lg transition-colors cursor-pointer ${
              copyAllCopied
                ? 'bg-success/10 text-success'
                : 'text-ink-faint hover:text-ink hover:bg-paper-dark'
            }`}
            onClick={handleCopyAll}
            disabled={filteredLogs.length === 0}
            title={`复制可见的 ${filteredLogs.length} 条日志`}
            aria-label="复制可见日志"
          >
            {copyAllCopied ? (
              <Check size={14} strokeWidth={1.5} />
            ) : (
              <ClipboardList size={14} strokeWidth={1.5} />
            )}
            {copyAllCopied ? '已复制' : '复制全部'}
          </button>
          <button
            type="button"
            className="w-8 h-8 flex items-center justify-center text-ink-faint hover:text-ink hover:bg-paper-dark rounded-lg transition-colors cursor-pointer"
            onClick={clearLogs}
            title="清空日志"
            aria-label="清空日志"
          >
            <Trash2 size={14} strokeWidth={1.5} />
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

      <div className="flex-1 overflow-y-auto flex flex-col">
        {filteredLogs.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center">
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

      <div className="px-4 py-2 border-t border-rule/60 shrink-0 flex items-center justify-between">
        <p className="text-[10px] text-ink-faint font-mono">
          显示 {filteredLogs.length} / 共 {logs.length} 条
        </p>
        <p className="text-[10px] text-ink-faint font-mono">
          最多保留 {useApiLogsStore.getState().maxLogs} 条
        </p>
      </div>
    </div>
  )
}
