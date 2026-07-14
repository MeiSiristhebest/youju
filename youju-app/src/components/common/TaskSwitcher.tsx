import { useQueryClient } from '@tanstack/react-query'
import {
  AlertCircle,
  BookOpen,
  Briefcase,
  CheckCircle2,
  Clock,
  FileText,
  Gavel,
  GraduationCap,
  Home,
  Loader2,
  Newspaper,
  XCircle,
} from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'
import { SCENARIOS } from '../../constants/workspace'
import { useTasks } from '../../hooks/useTasks'
import { matchCommand } from '../../lib/pinyin'
import { useAnalysisStore, useSourceStore } from '../../stores'
import { useWorkspaceTabsStore, type WorkspaceTab } from '../../stores/useWorkspaceTabsStore'
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '../ui/command'

interface TaskSwitcherProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
}

const statusConfig: Record<
  WorkspaceTab['status'],
  {
    label: string
    icon: React.ComponentType<{ size?: number; className?: string }>
    className: string
  }
> = {
  idle: { label: '待分析', icon: Clock, className: 'text-muted-foreground' },
  analyzing: { label: '分析中', icon: Loader2, className: 'text-info' },
  completed: { label: '已完成', icon: CheckCircle2, className: 'text-success' },
  failed: { label: '失败', icon: XCircle, className: 'text-danger' },
  cancelled: { label: '已取消', icon: AlertCircle, className: 'text-muted-foreground' },
}

const scenarioIconMap: Record<
  string,
  React.ComponentType<{ size?: number; className?: string }>
> = {
  legal_case: Gavel,
  academic_research: BookOpen,
  due_diligence: Briefcase,
  fact_check: Newspaper,
  job_offer: Briefcase,
  rental: Home,
  homework: GraduationCap,
  custom: FileText,
}

function formatDate(timestamp: number): string {
  const now = Date.now()
  const diff = now - timestamp
  const minute = 60 * 1000
  const hour = 60 * minute
  const day = 24 * hour

  if (diff < minute) return '刚刚'
  if (diff < hour) return `${Math.floor(diff / minute)} 分钟前`
  if (diff < day) return `${Math.floor(diff / hour)} 小时前`
  if (diff < 7 * day) return `${Math.floor(diff / day)} 天前`

  const date = new Date(timestamp)
  return `${date.getMonth() + 1}/${date.getDate()}`
}

export function TaskSwitcher({ isOpen, onOpenChange }: TaskSwitcherProps) {
  const [search, setSearch] = useState('')

  const queryClient = useQueryClient()
  const { tasks: taskHistory } = useTasks()
  const { setSources, setCurrentScenario, setCurrentTask, setSelectedSourceId, isDemo } =
    useSourceStore()
  const { setResult, setAnalyzing, setAnalysisStep, setSelectedRisk, setChecklist, setDimensions } =
    useAnalysisStore()

  const activeTabId = useWorkspaceTabsStore((state) => state.activeTabId)
  const openTab = useWorkspaceTabsStore((state) => state.openTab)

  const recentTabs = useMemo(() => {
    return taskHistory.map((task) => ({
      id: task.id,
      taskId: task.id,
      scenario: task.scenarioType as WorkspaceTab['scenario'],
      scenarioName: task.title,
      status: 'completed' as WorkspaceTab['status'],
      sourceCount: task.sourceCount,
      riskCount: 0,
      createdAt: new Date(task.createdAt).getTime(),
      lastOpenedAt: Date.now(),
    }))
  }, [taskHistory])

  const filteredTabs = useMemo(() => {
    if (!search.trim()) return recentTabs
    const q = search.trim().toLowerCase()
    return recentTabs.filter((tab) => {
      if (matchCommand(q, tab.scenarioName)) return true
      const scenarioInfo = SCENARIOS.find((s) => s.id === tab.scenario)
      if (scenarioInfo && matchCommand(q, scenarioInfo.name)) return true
      if (scenarioInfo && matchCommand(q, scenarioInfo.description)) return true
      return false
    })
  }, [search, recentTabs])

  const handleSelect = useCallback(
    async (taskId: string) => {
      const tab = recentTabs.find((t) => t.id === taskId)
      if (!tab) return

      const scenarioInfo = SCENARIOS.find((s) => s.id === tab.scenario)
      const tabName = scenarioInfo?.name || tab.scenarioName
      openTab(tab.scenario, tabName)

      setSelectedSourceId(null)
      setResult(null)
      setAnalyzing(false)
      setAnalysisStep(0)
      setSelectedRisk(null)
      setChecklist([])
      setDimensions([])

      setCurrentTask({ id: tab.taskId || tab.id, title: tab.scenarioName })
      setCurrentScenario(tab.scenario)

      queryClient.setQueryData(['sources', tab.taskId || tab.id], [])
      queryClient.invalidateQueries({ queryKey: ['sources', tab.taskId || tab.id] })

      onOpenChange(false)
    },
    [
      recentTabs,
      openTab,
      setSelectedSourceId,
      setResult,
      setAnalyzing,
      setAnalysisStep,
      setSelectedRisk,
      setChecklist,
      setDimensions,
      setCurrentTask,
      setCurrentScenario,
      queryClient,
      onOpenChange,
    ],
  )

  const getScenarioIcon = useCallback((scenario: string) => {
    return scenarioIconMap[scenario] || FileText
  }, [])

  return (
    <CommandDialog
      open={isOpen}
      onOpenChange={onOpenChange}
      title="任务切换"
      description="快速切换到其他分析任务"
    >
      <Command filter={(_value, _search) => 1} className="max-h-[70vh]">
        <CommandInput placeholder="搜索任务..." value={search} onValueChange={setSearch} />
        <CommandList>
          <CommandEmpty>没有找到匹配的任务</CommandEmpty>
          {filteredTabs.length > 0 && (
            <CommandGroup heading="最近使用">
              {filteredTabs.map((tab) => {
                const Icon = getScenarioIcon(tab.scenario)
                const StatusIcon = statusConfig[tab.status].icon
                const statusInfo = statusConfig[tab.status]
                const isActive = tab.id === activeTabId

                return (
                  <CommandItem
                    key={tab.id}
                    onSelect={() => handleSelect(tab.id)}
                    className="relative py-2 pl-3"
                  >
                    {isActive && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 bg-accent rounded-r-full" />
                    )}
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-accent/10 text-accent mr-2">
                      <Icon size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">
                        {tab.scenarioName}
                        {isActive && (
                          <span className="ml-2 text-xs text-accent font-normal">（当前）</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                        <span className="flex items-center gap-1">
                          <Clock size={10} />
                          {formatDate(tab.createdAt)}
                        </span>
                        <span className={`flex items-center gap-1 ${statusInfo.className}`}>
                          <StatusIcon
                            size={10}
                            className={tab.status === 'analyzing' ? 'animate-spin' : ''}
                          />
                          {statusInfo.label}
                        </span>
                        <span className="flex items-center gap-1">
                          <FileText size={10} />
                          {tab.sourceCount} 材料
                        </span>
                        {tab.riskCount > 0 && (
                          <span className="flex items-center gap-1 text-accent-secondary">
                            <AlertCircle size={10} />
                            {tab.riskCount} 风险
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="ml-auto flex items-center gap-1 text-xs text-muted-foreground">
                      <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">
                        Enter
                      </kbd>
                    </div>
                  </CommandItem>
                )
              })}
            </CommandGroup>
          )}
        </CommandList>
        <div className="flex items-center justify-between px-3 py-2 border-t border-border/50 text-xs text-muted-foreground">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 bg-muted rounded text-[10px] font-mono">↑↓</kbd>
              导航
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 bg-muted rounded text-[10px] font-mono">↵</kbd>
              切换
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 bg-muted rounded text-[10px] font-mono">Esc</kbd>
              关闭
            </span>
          </div>
          <span className="font-mono">{filteredTabs.length} 个任务</span>
        </div>
      </Command>
    </CommandDialog>
  )
}
