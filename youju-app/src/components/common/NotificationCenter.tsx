import { AlertTriangle, Bell, Check, CheckCheck, Settings, Sparkles, Trash2, X } from 'lucide-react'
import { useState } from 'react'
import { cn } from '../../lib/utils'

export interface Notification {
  id: string
  type: 'info' | 'success' | 'warning' | 'error'
  title: string
  description: string
  time: string
  read: boolean
  category: 'analysis' | 'team' | 'billing' | 'system'
}

const MOCK_NOTIFICATIONS: Notification[] = [
  {
    id: 'n1',
    type: 'success',
    title: '分析完成',
    description: '案件事实梳理分析已完成，共发现 5 个风险点',
    time: '2 分钟前',
    read: false,
    category: 'analysis',
  },
  {
    id: 'n2',
    type: 'info',
    title: '团队成员加入',
    description: '李明 已加入你的团队「法务部」',
    time: '1 小时前',
    read: false,
    category: 'team',
  },
  {
    id: 'n3',
    type: 'warning',
    title: '用量提醒',
    description: '本月分析次数已使用 85%，即将达到套餐上限',
    time: '3 小时前',
    read: false,
    category: 'billing',
  },
  {
    id: 'n4',
    type: 'info',
    title: '新增分析维度',
    description: '新增「证据链完整性」分析维度，可在设置中开启',
    time: '昨天',
    read: true,
    category: 'system',
  },
  {
    id: 'n5',
    type: 'success',
    title: '增量分析完成',
    description: '补充材料后增量分析已完成，新增 2 个风险点',
    time: '昨天',
    read: true,
    category: 'analysis',
  },
  {
    id: 'n6',
    type: 'error',
    title: '分析失败',
    description: '文献综述分析失败：文件格式不支持，请转换后重试',
    time: '2 天前',
    read: true,
    category: 'analysis',
  },
]

interface NotificationCenterProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
}

export function NotificationCenter({ isOpen, onOpenChange }: NotificationCenterProps) {
  const [notifications, setNotifications] = useState<Notification[]>(MOCK_NOTIFICATIONS)
  const [filter, setFilter] = useState<'all' | 'unread'>('all')

  const unreadCount = notifications.filter((n) => !n.read).length
  const filtered = filter === 'unread' ? notifications.filter((n) => !n.read) : notifications

  const markAsRead = (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)))
  }

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
  }

  const clearAll = () => {
    setNotifications([])
  }

  const getTypeIcon = (type: Notification['type']) => {
    switch (type) {
      case 'success':
        return <Check size={14} className="text-success" />
      case 'warning':
        return <AlertTriangle size={14} className="text-warning" />
      case 'error':
        return <X size={14} className="text-danger" />
      default:
        return <Sparkles size={14} className="text-accent" />
    }
  }

  if (!isOpen) return null

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm"
        onClick={() => onOpenChange(false)}
      />
      <div className="fixed top-14 right-5 z-50 w-80 sm:w-96 bg-paper border border-rule rounded-xl shadow-2xl shadow-black/10 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
        <div className="flex items-center justify-between px-4 py-3 border-b border-rule">
          <div className="flex items-center gap-2">
            <Bell size={14} strokeWidth={1.5} className="text-ink" />
            <span className="text-sm font-medium text-ink">通知中心</span>
            {unreadCount > 0 && (
              <span className="text-[10px] font-medium text-paper bg-accent px-1.5 py-0.5 rounded-full">
                {unreadCount}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={markAllAsRead}
              className="p-1.5 rounded-md text-ink-faint hover:text-ink hover:bg-paper-dark transition-colors"
              title="全部已读"
            >
              <CheckCheck size={13} strokeWidth={1.5} />
            </button>
            <button
              type="button"
              onClick={clearAll}
              className="p-1.5 rounded-md text-ink-faint hover:text-danger hover:bg-paper-dark transition-colors"
              title="清空全部"
            >
              <Trash2 size={13} strokeWidth={1.5} />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-1 px-3 py-2 border-b border-rule/60">
          {(['all', 'unread'] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={cn(
                'px-2.5 py-1 rounded-md text-xs font-medium transition-colors',
                filter === f
                  ? 'bg-paper-dark text-ink border border-rule/60'
                  : 'text-ink-faint hover:text-ink-muted hover:bg-paper-dark/60',
              )}
            >
              {f === 'all' ? '全部' : `未读 ${unreadCount > 0 ? `(${unreadCount})` : ''}`}
            </button>
          ))}
        </div>

        <div className="max-h-96 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Bell size={32} strokeWidth={1} className="text-ink-faint mb-2" />
              <p className="text-xs text-ink-faint">暂无通知</p>
            </div>
          ) : (
            <ul className="divide-y divide-rule/40">
              {filtered.map((notification) => (
                <li
                  key={notification.id}
                  className={cn(
                    'px-4 py-3 cursor-pointer transition-colors hover:bg-paper-dark/50',
                    !notification.read && 'bg-accent-bg/30',
                  )}
                  onClick={() => markAsRead(notification.id)}
                >
                  <div className="flex gap-3">
                    <div
                      className={cn(
                        'w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5',
                        notification.type === 'success' &&
                          'bg-success-bg border border-success-faint',
                        notification.type === 'warning' &&
                          'bg-warning-bg border border-warning-faint',
                        notification.type === 'error' && 'bg-danger-bg border border-danger-faint',
                        notification.type === 'info' && 'bg-accent-bg border border-accent-faint',
                      )}
                    >
                      {getTypeIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-0.5">
                        <span className="text-xs font-medium text-ink truncate">
                          {notification.title}
                        </span>
                        <span className="text-[10px] text-ink-faint shrink-0">
                          {notification.time}
                        </span>
                      </div>
                      <p className="text-[11px] text-ink-muted line-clamp-2 leading-relaxed">
                        {notification.description}
                      </p>
                    </div>
                    {!notification.read && (
                      <div className="w-2 h-2 rounded-full bg-accent shrink-0 mt-2" />
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="px-4 py-2.5 border-t border-rule/60 bg-paper-dark/30">
          <button
            type="button"
            className="w-full flex items-center justify-center gap-1.5 text-[11px] text-ink-muted hover:text-ink transition-colors"
          >
            <Settings size={11} strokeWidth={1.5} />
            通知设置
          </button>
        </div>
      </div>
    </>
  )
}
