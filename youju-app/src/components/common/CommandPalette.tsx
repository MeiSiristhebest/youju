import {
  AlertTriangle,
  ChevronRight,
  Clock,
  FileText,
  History,
  LayoutDashboard,
  Lightbulb,
  ListChecks,
  MessageCircle,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  Plus,
  Share2,
  Sparkles,
  Sun,
  Upload,
  Workflow,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { SCENARIOS } from '../../constants/workspace'
import { useChat } from '../../hooks/useChat'
import { matchCommand } from '../../lib/pinyin'
import { jsonStorage } from '../../lib/storage'
import { useAnalysisStore, useUIPreferenceStore } from '../../stores'
import { useChatDraftStore } from '../../stores/useChatDraftStore'
import { useSourceStore } from '../../stores/useSourceStore'
import type { ScenarioType } from '../../types'
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from '../ui/command'

interface CommandPaletteProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  onNavigate?: (destination: string) => void
  onNewAnalysis?: (scenarioId: ScenarioType) => void
  onUploadSource?: () => void
  onExportReport?: () => void
  onCopyShareLink?: () => void
  sidebarCollapsed: boolean
  onToggleSidebar: () => void
  sourcePanelCollapsed: boolean
  onToggleSourcePanel: () => void
  contextPanelCollapsed: boolean
  onToggleContextPanel: () => void
}

type CommandGroupKey =
  | 'recent'
  | 'navigation'
  | 'actions'
  | 'ai'
  | 'scenarios'
  | 'chat_ask'
  | 'recent_chats'

interface CommandItemData {
  id: string
  group: CommandGroupKey
  title: string
  description?: string
  icon: React.ComponentType<{ size?: number; className?: string }>
  shortcut?: string
  keywords?: string[]
  action?: () => void
  hasSubmenu?: boolean
  submenuGroup?: CommandGroupKey
  submenuScenario?: string
}

const RECENT_KEY = 'recent_commands'
const MAX_RECENT = 5

// 对话场景预设问题（与 ChatEmpty 保持一致，供命令面板子菜单使用）
interface ChatScenarioQuestions {
  id: string
  label: string
  questions: string[]
}

const CHAT_SCENARIOS: ChatScenarioQuestions[] = [
  {
    id: 'contract',
    label: '合同场景',
    questions: [
      '这份合同的关键风险是什么？',
      '合同中有哪些不合理的条款？',
      '请对比甲乙双方的权利义务',
    ],
  },
  {
    id: 'tender',
    label: '招标场景',
    questions: [
      '投标文件是否响应了所有招标要求？',
      '有哪些潜在的废标风险？',
      '请对比技术参数偏离表',
    ],
  },
  {
    id: 'report',
    label: '报告场景',
    questions: ['报告中提到的关键数据有哪些？', '请总结报告的主要结论', '报告中存在哪些数据矛盾？'],
  },
]

const DEFAULT_CHAT_QUESTIONS = [
  '请总结已上传素材的主要内容',
  '素材中存在哪些风险点？',
  '请对比多份文档的差异',
]

function loadRecentCommands(): string[] {
  if (typeof window === 'undefined') return []
  return jsonStorage.getItem<string[]>(RECENT_KEY) || []
}

function saveRecentCommand(commandId: string) {
  if (typeof window === 'undefined') return
  const recent = loadRecentCommands()
  const filtered = recent.filter((id) => id !== commandId)
  filtered.unshift(commandId)
  const trimmed = filtered.slice(0, MAX_RECENT)
  jsonStorage.setItem(RECENT_KEY, trimmed)
}

export function CommandPalette({
  isOpen,
  onOpenChange,
  onNavigate,
  onNewAnalysis,
  onUploadSource,
  onExportReport,
  onCopyShareLink,
  sidebarCollapsed,
  onToggleSidebar,
  sourcePanelCollapsed,
  onToggleSourcePanel,
  contextPanelCollapsed,
  onToggleContextPanel,
}: CommandPaletteProps) {
  const [search, setSearch] = useState('')
  const [activeSubmenu, setActiveSubmenu] = useState<CommandGroupKey | null>(null)
  const [askScenario, setAskScenario] = useState<string | null>(null)
  const [recentIds, setRecentIds] = useState<string[]>([])

  const toggleTheme = useUIPreferenceStore((s) => s.toggleTheme)
  const theme = useUIPreferenceStore((s) => s.theme)
  const setActiveTab = useAnalysisStore((s) => s.setActiveTab)
  const selectedRisk = useAnalysisStore((s) => s.selectedRisk)
  const setAiEditorTargetRiskId = useAnalysisStore((s) => s.setAiEditorTargetRiskId)
  const currentTaskId = useSourceStore((s) => s.currentTaskId)
  const { conversations, createConversation, selectConversation } = useChat(
    currentTaskId ?? undefined,
  )
  const setPendingQuestion = useChatDraftStore((s) => s.setPendingQuestion)

  useEffect(() => {
    if (isOpen) {
      setRecentIds(loadRecentCommands())
      setSearch('')
      setActiveSubmenu(null)
      setAskScenario(null)
    }
  }, [isOpen])

  const navigationCommands: CommandItemData[] = useMemo(
    () => [
      {
        id: 'nav_risks',
        group: 'navigation',
        title: '跳转到风险排雷',
        description: '查看风险检测结果',
        icon: AlertTriangle,
        keywords: ['风险', '排雷', 'risks', 'fxpl'],
        action: () => {
          setActiveTab('risks')
          onNavigate?.('risks')
        },
      },
      {
        id: 'nav_trace',
        group: 'navigation',
        title: '跳转到思考过程',
        description: '查看 AI 分析步骤',
        icon: Workflow,
        keywords: ['思考', '过程', 'trace', 'skgc'],
        action: () => {
          setActiveTab('trace')
          onNavigate?.('trace')
        },
      },
      {
        id: 'nav_checklist',
        group: 'navigation',
        title: '跳转到证据清单',
        description: '查看检查清单和证据',
        icon: ListChecks,
        keywords: ['证据', '清单', 'checklist', 'zqqd'],
        action: () => {
          setActiveTab('checklist')
          onNavigate?.('checklist')
        },
      },
      {
        id: 'nav_history',
        group: 'navigation',
        title: '跳转到历史记录',
        description: '查看历史分析记录',
        icon: History,
        keywords: ['历史', '记录', 'history', 'lsjl'],
        action: () => {
          onNavigate?.('history')
        },
      },
      {
        id: 'nav_sources',
        group: 'navigation',
        title: '跳转到材料面板',
        description: '查看和管理分析材料',
        icon: FileText,
        keywords: ['材料', '面板', 'sources', 'clmb'],
        action: () => {
          if (sourcePanelCollapsed) {
            onToggleSourcePanel()
          }
          onNavigate?.('sources')
        },
      },
      {
        id: 'nav_context',
        group: 'navigation',
        title: '跳转到上下文面板',
        description: '查看上下文和设置',
        icon: LayoutDashboard,
        keywords: ['上下文', '面板', 'context', 'sxwmb'],
        action: () => {
          if (contextPanelCollapsed) {
            onToggleContextPanel()
          }
          onNavigate?.('context')
        },
      },
    ],
    [
      setActiveTab,
      sourcePanelCollapsed,
      contextPanelCollapsed,
      onToggleSourcePanel,
      onToggleContextPanel,
      onNavigate,
    ],
  )

  const actionCommands: CommandItemData[] = useMemo(
    () => [
      {
        id: 'action_new_analysis',
        group: 'actions',
        title: '新建分析',
        description: '选择场景开始新分析',
        icon: Plus,
        shortcut: 'N',
        keywords: ['新建', '分析', 'new', 'xjfx'],
        hasSubmenu: true,
        submenuGroup: 'scenarios',
      },
      {
        id: 'action_upload',
        group: 'actions',
        title: '上传材料',
        description: '添加新的分析材料',
        icon: Upload,
        shortcut: 'U',
        keywords: ['上传', '材料', 'upload', 'sccj'],
        action: () => onUploadSource?.(),
      },
      {
        id: 'action_export',
        group: 'actions',
        title: '导出报告',
        description: '导出分析报告',
        icon: FileText,
        shortcut: 'E',
        keywords: ['导出', '报告', 'export', 'dcbg'],
        action: () => onExportReport?.(),
      },
      {
        id: 'action_toggle_theme',
        group: 'actions',
        title: theme === 'dark' ? '切换到亮色主题' : '切换到暗色主题',
        description: '切换明/暗主题',
        icon: theme === 'dark' ? Sun : Moon,
        shortcut: 'T',
        keywords: ['主题', '切换', '明暗', 'theme', 'qhzt'],
        action: () => toggleTheme(),
      },
      {
        id: 'action_toggle_sidebar',
        group: 'actions',
        title: sidebarCollapsed ? '展开侧边栏' : '折叠侧边栏',
        description: '显示/隐藏左侧导航',
        icon: sidebarCollapsed ? PanelLeftOpen : PanelLeftClose,
        shortcut: '\\',
        keywords: ['侧边栏', '折叠', '展开', 'sidebar', 'zdcbl'],
        action: () => onToggleSidebar(),
      },
      {
        id: 'action_toggle_source_panel',
        group: 'actions',
        title: sourcePanelCollapsed ? '展开材料面板' : '折叠材料面板',
        description: '显示/隐藏左侧材料面板',
        icon: sourcePanelCollapsed ? PanelLeftOpen : PanelLeftClose,
        keywords: ['材料', '面板', '折叠', '展开', 'clmb'],
        action: () => onToggleSourcePanel(),
      },
      {
        id: 'action_toggle_context_panel',
        group: 'actions',
        title: contextPanelCollapsed ? '展开上下文面板' : '折叠上下文面板',
        description: '显示/隐藏右侧上下文面板',
        icon: contextPanelCollapsed ? PanelRightOpen : PanelRightClose,
        keywords: ['上下文', '面板', '折叠', '展开', 'sxwmb'],
        action: () => onToggleContextPanel(),
      },
      {
        id: 'action_share',
        group: 'actions',
        title: '复制分享链接',
        description: '生成分享链接',
        icon: Share2,
        shortcut: 'S',
        keywords: ['分享', '链接', '复制', 'share', 'fzfxlj'],
        action: () => onCopyShareLink?.(),
      },
    ],
    [
      theme,
      sidebarCollapsed,
      sourcePanelCollapsed,
      contextPanelCollapsed,
      toggleTheme,
      onToggleSidebar,
      onToggleSourcePanel,
      onToggleContextPanel,
      onUploadSource,
      onExportReport,
      onCopyShareLink,
    ],
  )

  const aiCommands: CommandItemData[] = useMemo(
    () => [
      {
        id: 'ai_rewrite',
        group: 'ai',
        title: 'AI 重写当前风险',
        description: selectedRisk ? `重写「${selectedRisk.title}」的描述` : '请先选择一个风险',
        icon: Sparkles,
        keywords: ['AI', '重写', '风险', 'ai cx'],
        action: () => {
          if (selectedRisk) {
            setAiEditorTargetRiskId(selectedRisk.id)
          }
        },
      },
      {
        id: 'ai_summary',
        group: 'ai',
        title: 'AI 总结当前分析',
        description: '生成分析摘要',
        icon: Lightbulb,
        keywords: ['AI', '总结', '分析', 'ai zj'],
        action: () => {
          // 占位，后续完善
        },
      },
      {
        id: 'ai_chat_new',
        group: 'ai',
        title: '新建 AI 对话',
        description: '创建新的对话会话',
        icon: Plus,
        keywords: ['AI', '对话', '新建', 'chat', 'xjdh', 'ai dh'],
        action: () => {
          createConversation({})
          setActiveTab('chat')
        },
      },
      {
        id: 'ai_chat_open',
        group: 'ai',
        title: '打开 AI 对话',
        description: '切换到 AI 对话面板',
        icon: MessageCircle,
        keywords: ['AI', '对话', '打开', 'chat', 'dkdh', 'ai dh'],
        action: () => {
          setActiveTab('chat')
        },
      },
      ...CHAT_SCENARIOS.map(
        (s): CommandItemData => ({
          id: `ai_chat_ask_${s.id}`,
          group: 'ai',
          title: `向 AI 提问 - ${s.label}`,
          description: `查看${s.label}预设问题`,
          icon: MessageCircle,
          keywords: ['AI', '提问', '问题', s.id, s.label, 'chat', 'ai tw'],
          hasSubmenu: true,
          submenuGroup: 'chat_ask',
          submenuScenario: s.id,
        }),
      ),
    ],
    [selectedRisk, setAiEditorTargetRiskId, createConversation, setActiveTab],
  )

  // 预设问题子菜单：按当前选择的场景动态生成
  const questionCommands: CommandItemData[] = useMemo(() => {
    if (!askScenario) return []
    const scenario = CHAT_SCENARIOS.find((s) => s.id === askScenario)
    const questions = scenario?.questions ?? DEFAULT_CHAT_QUESTIONS
    return questions.map(
      (q, idx): CommandItemData => ({
        id: `ai_chat_question_${askScenario}_${idx}`,
        group: 'chat_ask',
        title: q,
        icon: MessageCircle,
        keywords: ['AI', '提问', '问题', askScenario, 'chat'],
        action: () => {
          createConversation({ scenarioType: askScenario })
          setActiveTab('chat')
          setPendingQuestion(q)
        },
      }),
    )
  }, [askScenario, createConversation, setActiveTab, setPendingQuestion])

  // 最近对话：取最近 5 条会话，点击切换到对应会话 + chat tab
  const recentConversationCommands: CommandItemData[] = useMemo(
    () =>
      conversations
        .slice()
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        .slice(0, 5)
        .map(
          (c): CommandItemData => ({
            id: `ai_chat_recent_${c.id}`,
            group: 'recent_chats',
            title: c.title || '未命名对话',
            description: `更新于 ${new Date(c.updatedAt).toLocaleString()}`,
            icon: MessageCircle,
            keywords: ['AI', '对话', '会话', 'recent', 'chat', 'zjdh'],
            action: () => {
              selectConversation(c.id)
              setActiveTab('chat')
            },
          }),
        ),
    [conversations, selectConversation, setActiveTab],
  )

  const scenarioCommands: CommandItemData[] = useMemo(
    () =>
      SCENARIOS.filter((s) => s.id !== 'custom').map((s) => ({
        id: `scenario_${s.id}`,
        group: 'scenarios' as CommandGroupKey,
        title: s.name,
        description: s.description,
        icon: s.iconComponent,
        keywords: [s.id, s.category],
        action: () => {
          onNewAnalysis?.(s.id as ScenarioType)
        },
      })),
    [onNewAnalysis],
  )

  const allCommands = useMemo<CommandItemData[]>(() => {
    if (activeSubmenu === 'scenarios') {
      return scenarioCommands
    }
    if (activeSubmenu === 'chat_ask') {
      return questionCommands
    }
    // 默认视图：合并最近对话，使其在 recent_chats 分组中展示
    return [...navigationCommands, ...actionCommands, ...aiCommands, ...recentConversationCommands]
  }, [
    activeSubmenu,
    navigationCommands,
    actionCommands,
    aiCommands,
    scenarioCommands,
    questionCommands,
    recentConversationCommands,
  ])

  const filteredCommands = useMemo(() => {
    if (!search.trim()) {
      if (activeSubmenu) {
        return allCommands
      }
      return allCommands
    }
    const q = search.trim().toLowerCase()
    return allCommands.filter((cmd) => {
      if (matchCommand(q, cmd.title)) return true
      if (cmd.description && matchCommand(q, cmd.description)) return true
      if (cmd.keywords?.some((k) => matchCommand(q, k))) return true
      return false
    })
  }, [search, allCommands, activeSubmenu])

  const groupedCommands = useMemo(() => {
    const groups: Record<CommandGroupKey, CommandItemData[]> = {
      recent: [],
      navigation: [],
      actions: [],
      ai: [],
      scenarios: [],
      chat_ask: [],
      recent_chats: [],
    }

    if (activeSubmenu) {
      groups[activeSubmenu] = filteredCommands
      return groups
    }

    const recentCmdMap = new Map(allCommands.map((c) => [c.id, c]))
    const recentCmds = recentIds
      .map((id) => recentCmdMap.get(id))
      .filter((c): c is CommandItemData => !!c)
    groups.recent = recentCmds

    for (const cmd of filteredCommands) {
      if (recentCmds.some((r) => r.id === cmd.id)) continue
      if (!groups[cmd.group]) {
        groups[cmd.group] = []
      }
      groups[cmd.group].push(cmd)
    }

    return groups
  }, [filteredCommands, recentIds, allCommands, activeSubmenu])

  const handleSelect = useCallback(
    (cmd: CommandItemData) => {
      if (cmd.hasSubmenu && cmd.submenuGroup) {
        setActiveSubmenu(cmd.submenuGroup)
        if (cmd.submenuScenario) {
          setAskScenario(cmd.submenuScenario)
        }
        setSearch('')
        return
      }
      cmd.action?.()
      // 子菜单内的问题项与最近会话项不计入命令历史
      if (cmd.group !== 'chat_ask' && cmd.group !== 'recent_chats') {
        saveRecentCommand(cmd.id)
      }
      onOpenChange(false)
    },
    [onOpenChange],
  )

  const handleBack = useCallback(() => {
    setActiveSubmenu(null)
    setAskScenario(null)
    setSearch('')
  }, [])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowRight' && activeSubmenu === null) {
        // 可以在这里添加进入子菜单的逻辑
      }
      if (e.key === 'ArrowLeft' && activeSubmenu !== null) {
        e.preventDefault()
        handleBack()
      }
    },
    [activeSubmenu, handleBack],
  )

  const groupLabels: Record<CommandGroupKey, string> = {
    recent: '最近使用',
    navigation: '导航',
    actions: '操作',
    ai: 'AI 功能',
    scenarios: '选择场景',
    chat_ask: '预设问题',
    recent_chats: '最近对话',
  }

  return (
    <CommandDialog
      open={isOpen}
      onOpenChange={onOpenChange}
      title="命令面板"
      description="搜索命令或输入操作"
    >
      <Command onKeyDown={handleKeyDown} filter={(_value, _search) => 1}>
        <CommandInput
          placeholder={
            activeSubmenu === 'chat_ask'
              ? '搜索预设问题...'
              : activeSubmenu
                ? '搜索场景...'
                : '搜索命令、跳转、操作...'
          }
          value={search}
          onValueChange={setSearch}
        />
        <CommandList>
          <CommandEmpty>没有找到匹配结果</CommandEmpty>

          {activeSubmenu && (
            <CommandGroup heading={groupLabels[activeSubmenu]}>
              {groupedCommands[activeSubmenu].map((cmd) => {
                const Icon = cmd.icon
                return (
                  <CommandItem key={cmd.id} onSelect={() => handleSelect(cmd)}>
                    <Icon size={16} className="mr-2" />
                    <div className="flex flex-col">
                      <span>{cmd.title}</span>
                      {cmd.description && (
                        <span className="text-xs text-muted-foreground">{cmd.description}</span>
                      )}
                    </div>
                    {cmd.shortcut && <CommandShortcut>{cmd.shortcut}</CommandShortcut>}
                  </CommandItem>
                )
              })}
            </CommandGroup>
          )}

          {!activeSubmenu && (
            <>
              {groupedCommands.recent.length > 0 && (
                <>
                  <CommandGroup heading="最近使用">
                    {groupedCommands.recent.map((cmd) => {
                      const _Icon = cmd.icon
                      return (
                        <CommandItem key={cmd.id} onSelect={() => handleSelect(cmd)}>
                          <Clock size={16} className="mr-2" />
                          <div className="flex flex-col">
                            <span>{cmd.title}</span>
                            {cmd.description && (
                              <span className="text-xs text-muted-foreground">
                                {cmd.description}
                              </span>
                            )}
                          </div>
                          {cmd.shortcut && <CommandShortcut>{cmd.shortcut}</CommandShortcut>}
                        </CommandItem>
                      )
                    })}
                  </CommandGroup>
                  <CommandSeparator />
                </>
              )}

              {groupedCommands.recent_chats.length > 0 && (
                <>
                  <CommandGroup heading="最近对话">
                    {groupedCommands.recent_chats.map((cmd) => {
                      const Icon = cmd.icon
                      return (
                        <CommandItem key={cmd.id} onSelect={() => handleSelect(cmd)}>
                          <Icon size={16} className="mr-2" />
                          <div className="flex flex-col">
                            <span>{cmd.title}</span>
                            {cmd.description && (
                              <span className="text-xs text-muted-foreground">
                                {cmd.description}
                              </span>
                            )}
                          </div>
                        </CommandItem>
                      )
                    })}
                  </CommandGroup>
                  <CommandSeparator />
                </>
              )}

              {groupedCommands.navigation.length > 0 && (
                <CommandGroup heading="导航">
                  {groupedCommands.navigation.map((cmd) => {
                    const Icon = cmd.icon
                    return (
                      <CommandItem key={cmd.id} onSelect={() => handleSelect(cmd)}>
                        <Icon size={16} className="mr-2" />
                        <div className="flex flex-col">
                          <span>{cmd.title}</span>
                          {cmd.description && (
                            <span className="text-xs text-muted-foreground">{cmd.description}</span>
                          )}
                        </div>
                        {cmd.shortcut && <CommandShortcut>{cmd.shortcut}</CommandShortcut>}
                      </CommandItem>
                    )
                  })}
                </CommandGroup>
              )}

              {groupedCommands.actions.length > 0 && (
                <CommandGroup heading="操作">
                  {groupedCommands.actions.map((cmd) => {
                    const Icon = cmd.icon
                    return (
                      <CommandItem key={cmd.id} onSelect={() => handleSelect(cmd)}>
                        <Icon size={16} className="mr-2" />
                        <div className="flex flex-col">
                          <span>{cmd.title}</span>
                          {cmd.description && (
                            <span className="text-xs text-muted-foreground">{cmd.description}</span>
                          )}
                        </div>
                        {cmd.hasSubmenu && <ChevronRight size={16} className="ml-auto" />}
                        {cmd.shortcut && !cmd.hasSubmenu && (
                          <CommandShortcut>{cmd.shortcut}</CommandShortcut>
                        )}
                      </CommandItem>
                    )
                  })}
                </CommandGroup>
              )}

              {groupedCommands.ai.length > 0 && (
                <CommandGroup heading="AI 功能">
                  {groupedCommands.ai.map((cmd) => {
                    const Icon = cmd.icon
                    return (
                      <CommandItem key={cmd.id} onSelect={() => handleSelect(cmd)}>
                        <Icon size={16} className="mr-2" />
                        <div className="flex flex-col">
                          <span>{cmd.title}</span>
                          {cmd.description && (
                            <span className="text-xs text-muted-foreground">{cmd.description}</span>
                          )}
                        </div>
                        {cmd.hasSubmenu && <ChevronRight size={16} className="ml-auto" />}
                        {cmd.shortcut && !cmd.hasSubmenu && (
                          <CommandShortcut>{cmd.shortcut}</CommandShortcut>
                        )}
                      </CommandItem>
                    )
                  })}
                </CommandGroup>
              )}
            </>
          )}
        </CommandList>
      </Command>
    </CommandDialog>
  )
}
