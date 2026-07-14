import { ChevronRight, Clock, FileText, Search, Settings, Sparkles, Users, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { SCENARIOS } from '../../constants/workspace'
import { useTranslation } from '../../i18n'
import { cn } from '../../lib/utils'

interface GlobalSearchProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  onNavigate?: (destination: string) => void
}

interface SearchItem {
  id: string
  type: 'scenario' | 'recent' | 'action' | 'settings'
  title: string
  description?: string
  icon: any
  shortcut?: string
}

const RECENT_ITEMS: SearchItem[] = [
  {
    id: 'recent_1',
    type: 'recent',
    title: 'XX公司尽职调查',
    description: '昨天 · 12 份材料',
    icon: Clock,
  },
  {
    id: 'recent_2',
    type: 'recent',
    title: '劳动纠纷案件分析',
    description: '3 天前 · 5 份材料',
    icon: Clock,
  },
]

export function GlobalSearch({ isOpen, onOpenChange, onNavigate }: GlobalSearchProps) {
  const { t } = useTranslation()
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus()
      setQuery('')
      setSelectedIndex(0)
    }
  }, [isOpen])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        onOpenChange(!isOpen)
      }
      if (e.key === 'Escape' && isOpen) {
        onOpenChange(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onOpenChange])

  const actionItems: SearchItem[] = [
    {
      id: 'action_new',
      type: 'action',
      title: t('search.newAnalysis'),
      description: t('search.newAnalysisDesc'),
      icon: Sparkles,
      shortcut: 'N',
    },
    {
      id: 'action_upload',
      type: 'action',
      title: t('search.uploadMaterial'),
      description: t('search.uploadMaterialDesc'),
      icon: FileText,
      shortcut: 'U',
    },
  ]

  const settingsItems: SearchItem[] = [
    {
      id: 'settings_team',
      type: 'settings',
      title: t('search.teamManagement'),
      description: t('search.teamManagementDesc'),
      icon: Users,
      shortcut: 'T',
    },
    {
      id: 'settings_api',
      type: 'settings',
      title: t('search.apiSettings'),
      description: t('search.apiSettingsDesc'),
      icon: Settings,
      shortcut: 'A',
    },
  ]

  const scenarioItems: SearchItem[] = SCENARIOS.filter((s) => s.id !== 'custom').map((s) => ({
    id: s.id,
    type: 'scenario' as const,
    title: s.name,
    description: s.description,
    icon: s.iconComponent,
  }))

  const allItems = [...scenarioItems, ...RECENT_ITEMS, ...actionItems, ...settingsItems]

  const filtered = query.trim()
    ? allItems.filter(
        (item) =>
          item.title.toLowerCase().includes(query.toLowerCase()) ||
          item.description?.toLowerCase().includes(query.toLowerCase()),
      )
    : [...RECENT_ITEMS, ...scenarioItems.slice(0, 4), ...actionItems]

  const groupedItems = filtered.reduce(
    (acc, item) => {
      const group =
        item.type === 'recent'
          ? t('search.recent')
          : item.type === 'scenario'
            ? t('search.scenarios')
            : item.type === 'action'
              ? t('search.actions')
              : t('search.settings')
      if (!acc[group]) acc[group] = []
      acc[group].push(item)
      return acc
    },
    {} as Record<string, SearchItem[]>,
  )

  const flatItems = Object.values(groupedItems).flat()

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex((prev) => Math.min(prev + 1, flatItems.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex((prev) => Math.max(prev - 1, 0))
    } else if (e.key === 'Enter' && flatItems[selectedIndex]) {
      e.preventDefault()
      onNavigate?.(flatItems[selectedIndex].id)
      onOpenChange(false)
    }
  }

  if (!isOpen) return null

  let currentGroupIndex = -1

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
        onClick={() => onOpenChange(false)}
      />
      <div className="fixed top-[20%] left-1/2 -translate-x-1/2 z-50 w-full max-w-lg bg-paper border border-rule rounded-2xl shadow-2xl shadow-black/20 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-rule">
          <Search size={16} strokeWidth={1.5} className="text-ink-faint" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setSelectedIndex(0)
            }}
            onKeyDown={handleKeyDown}
            placeholder={t('search.placeholder')}
            className="flex-1 bg-transparent text-sm text-ink placeholder:text-ink-faint focus:outline-none"
          />
          <div className="flex items-center gap-1 text-[10px] text-ink-faint font-mono">
            <kbd className="px-1.5 py-0.5 bg-paper-dark border border-rule/60 rounded text-[10px]">
              ESC
            </kbd>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="p-1 rounded-md text-ink-faint hover:text-ink hover:bg-paper-dark transition-colors"
          >
            <X size={14} strokeWidth={1.5} />
          </button>
        </div>

        <div className="max-h-80 overflow-y-auto py-2">
          {flatItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Search size={28} strokeWidth={1} className="text-ink-faint mb-2" />
              <p className="text-xs text-ink-faint">{t('search.noResults')}</p>
            </div>
          ) : (
            Object.entries(groupedItems).map(([group, items]) => {
              currentGroupIndex++
              const groupStartIndex = Object.entries(groupedItems)
                .slice(0, currentGroupIndex)
                .reduce((sum, [, gItems]) => sum + gItems.length, 0)

              return (
                <div key={group} className="mb-1">
                  <div className="px-4 py-1.5 text-[10px] font-medium text-ink-faint uppercase tracking-[0.15em] font-mono">
                    {group}
                  </div>
                  <ul>
                    {items.map((item, idx) => {
                      const globalIndex = groupStartIndex + idx
                      const Icon = item.icon
                      return (
                        <li key={item.id}>
                          <button
                            type="button"
                            onClick={() => {
                              onNavigate?.(item.id)
                              onOpenChange(false)
                            }}
                            className={cn(
                              'w-full flex items-center gap-3 px-4 py-2 text-left transition-colors',
                              selectedIndex === globalIndex
                                ? 'bg-paper-dark text-ink'
                                : 'text-ink-muted hover:bg-paper-dark/50 hover:text-ink',
                            )}
                          >
                            <div
                              className={cn(
                                'w-7 h-7 rounded-lg flex items-center justify-center shrink-0',
                                item.type === 'scenario' &&
                                  'bg-accent-bg border border-accent-faint text-accent',
                                item.type === 'recent' &&
                                  'bg-paper-dark border border-rule/60 text-ink-muted',
                                item.type === 'action' &&
                                  'bg-success-bg border border-success-faint text-success',
                                item.type === 'settings' &&
                                  'bg-paper-dark border border-rule/60 text-ink-muted',
                              )}
                            >
                              <Icon size={14} strokeWidth={1.5} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-xs font-medium truncate">{item.title}</div>
                              {item.description && (
                                <div className="text-[10px] text-ink-faint truncate">
                                  {item.description}
                                </div>
                              )}
                            </div>
                            {item.shortcut && (
                              <kbd className="px-1.5 py-0.5 bg-paper-dark border border-rule/60 rounded text-[10px] text-ink-faint font-mono shrink-0">
                                {item.shortcut}
                              </kbd>
                            )}
                            <ChevronRight
                              size={12}
                              strokeWidth={1.5}
                              className={cn(
                                'shrink-0 transition-opacity',
                                selectedIndex === globalIndex ? 'opacity-100' : 'opacity-0',
                              )}
                            />
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              )
            })
          )}
        </div>

        <div className="flex items-center justify-between px-4 py-2.5 border-t border-rule bg-paper-dark/30">
          <div className="flex items-center gap-4 text-[10px] text-ink-faint">
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 bg-paper border border-rule/60 rounded text-[9px] font-mono">
                ↑↓
              </kbd>
              {t('search.navigation')}
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 bg-paper border border-rule/60 rounded text-[9px] font-mono">
                ↵
              </kbd>
              {t('search.select')}
            </span>
          </div>
          <span className="text-[10px] text-ink-faint font-mono">
            {flatItems.length} {t('search.results')}
          </span>
        </div>
      </div>
    </>
  )
}
