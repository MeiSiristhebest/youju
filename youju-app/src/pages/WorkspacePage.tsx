import { ChevronRight, Menu, UploadCloud } from 'lucide-react'
import type { DragEvent } from 'react'
import { useState } from 'react'
import { AddSourceModal } from '../components/modals/AddSourceModal'
import { DraftModal } from '../components/modals/DraftModal'
import { LoginModal } from '../components/modals/LoginModal'
import { ShareModal } from '../components/modals/ShareModal'
import { ContextPanel } from '../components/workspace/ContextPanel'
import { HistoryPanel } from '../components/workspace/HistoryPanel'
import { MonitorPanel } from '../components/workspace/MonitorPanel'
import { PreferencePanel } from '../components/workspace/PreferencePanel'
import { ResultPanel } from '../components/workspace/ResultPanel'
import { SourcePanel } from '../components/workspace/SourcePanel'
import { WorkspaceSidebar } from '../components/workspace/WorkspaceSidebar'
import { WorkspaceTopBar } from '../components/workspace/WorkspaceTopBar'
import { DEMO_RESULTS, DEMO_SOURCES, DEMO_SYS_STATS } from '../constants/demoData'
import { SCENARIOS } from '../constants/workspace'
import { useAnalysis } from '../hooks/useAnalysis'
import { useAuth } from '../hooks/useAuth'
import { useShareUtils } from '../hooks/useShare'
import { useSources } from '../hooks/useSources'
import { useTasks } from '../hooks/useTasks'
import { shareApi } from '../services/shareApi'
import { useAnalysisStore, useSourceStore, useTaskStore, useUIPreferenceStore } from '../stores'
import type { ScenarioType, Source, TaskRecord } from '../types'

interface WorkspacePageProps {
  onGoHome: () => void
}

export function WorkspacePage({ onGoHome }: WorkspacePageProps) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const [mobileContextOpen, setMobileContextOpen] = useState(false)

  const {
    sources,
    selectedSourceId,
    showAddSource,
    currentScenario,
    setSelectedSourceId,
    setShowAddSource,
    loadScenario: _loadScenario,
    deleteSource: _deleteSource,
    refetchSources,
  } = useSources()

  const {
    result,
    analyzing,
    analysisStep,
    activeTab,
    checklist,
    selectedRisk,
    showDraft: _showDraft,
    draftText: _draftText,
    generatingDraft: _generatingDraft,
    riskFeedback,
    streaming,
    streamProgress,
    streamError,
    analyze,
    generateDraft,
    submitFeedback,
    cancelAnalysis,
    resetAnalysis,
    setActiveTab,
    setSelectedRisk,
    toggleCheckItem,
    setChecklist,
  } = useAnalysis(sources)

  const {
    user,
    login,
    logout,
    loggingIn,
    emailLogin,
    register,
    fetchWechatQrCode,
    startWechatPolling,
    stopWechatPolling,
    qrCodeUrl,
    pollingStatus,
    pollingMessage,
    emailLoginError,
    registerError,
  } = useAuth()

  const {
    tasks: taskHistory,
    showHistory: _showHistory,
    setShowHistory,
    createTask,
    deleteTask: _deleteTask,
    refetchTasks,
    getTask,
  } = useTasks()

  const {
    showLoginModal,
    showShareModal,
    loadingStats,
    globalDragOver,
    showPreferencePanel,
    showMonitorPanel,
    setShowLoginModal,
    setShowShareModal,
    setShowPreferencePanel,
    setShowMonitorPanel,
    setGlobalDragOver,
  } = useUIPreferenceStore()

  const {
    copyShareLink,
    shareLink,
    shareExpired,
    creatingShare,
    setCreatingShare,
    createDemoShare,
    setShareLink,
    setShareExpired,
  } = useShareUtils()
  const { taskSaved, setTaskSaved, setSavingTask } = useTaskStore()
  const { setResult } = useAnalysisStore()
  const { setCurrentScenario } = useSourceStore()

  const handleFeedback = (riskId: string, feedback: 'accurate' | 'inaccurate') => {
    submitFeedback({ riskId, feedback })
  }

  const handleLoadScenario = async (scenarioId: ScenarioType) => {
    const demoSources = DEMO_SOURCES[scenarioId]

    const {
      setSources,
      setSelectedSourceId,
      setIsDemo,
      setCurrentScenario: setCurrentScenarioInStore,
    } = useSourceStore.getState()
    const { setResult, setAnalyzing, setAnalysisStep, setSelectedRisk, setChecklist } =
      useAnalysisStore.getState()

    setSelectedSourceId(null)
    setResult(null)
    setAnalyzing(false)
    setAnalysisStep(0)
    setSelectedRisk(null)
    setChecklist([])
    setIsDemo(true)

    if (demoSources) {
      setSources(demoSources)
      setCurrentScenarioInStore(scenarioId)
    }

    setMobileSidebarOpen(false)
  }

  const handleShowHistory = () => {
    refetchTasks()
    setShowHistory(true)
  }

  const handleSelectHistory = async (task: TaskRecord) => {
    setShowHistory(false)
    const scenarioType = task.scenarioType as ScenarioType

    const {
      setSources,
      setSelectedSourceId,
      setIsDemo,
      setCurrentScenario: setCurrentScenarioInStore,
    } = useSourceStore.getState()
    const { setResult, setAnalyzing, setAnalysisStep, setSelectedRisk, setChecklist } =
      useAnalysisStore.getState()

    setSelectedSourceId(null)
    setResult(null)
    setAnalyzing(true)
    setAnalysisStep(0)
    setSelectedRisk(null)
    setChecklist([])

    if (DEMO_SOURCES[scenarioType]) {
      setIsDemo(true)
      setSources(DEMO_SOURCES[scenarioType])
      setCurrentScenarioInStore(scenarioType)

      const demoResult = DEMO_RESULTS[scenarioType]
      if (demoResult) {
        await new Promise((resolve) => setTimeout(resolve, 500))
        setResult(demoResult)
        setChecklist(demoResult.checklist?.map((c: any) => ({ ...c, checked: false })) || [])
      }
      setAnalyzing(false)
    } else {
      setIsDemo(false)
      setCurrentScenarioInStore(scenarioType)

      const taskDetail = await getTask(task.id)
      if (taskDetail) {
        setResult(taskDetail.result)
        setChecklist(taskDetail.result.checklist?.map((c: any) => ({ ...c, checked: false })) || [])
      }
      setAnalyzing(false)
    }
  }

  const handleDeleteHistory = (taskId: string) => {
    _deleteTask(taskId)
  }

  const handleNewAnalysis = () => {
    const {
      setSources,
      setIsDemo,
      setCurrentScenario: setCurrentScenarioInStore,
    } = useSourceStore.getState()
    setSources([])
    setIsDemo(false)
    setCurrentScenarioInStore(null)
    resetAnalysis()
    setSelectedRisk(null)
    setMobileSidebarOpen(false)
  }

  const saveTask = async () => {
    if (sources.length === 0 || !result) return
    setSavingTask(true)
    try {
      const title = currentScenario
        ? SCENARIOS.find((s) => s.id === currentScenario)?.name || '分析任务'
        : sources[0]?.name || `分析任务 ${new Date().toLocaleDateString()}`

      createTask(
        {
          title,
          scenarioType: currentScenario || 'custom',
          sourceIds: sources.map((s) => s.id),
        },
        {
          onSuccess: () => {
            setTaskSaved(true)
            setTimeout(() => setTaskSaved(false), 2000)
            refetchTasks()
          },
        },
      )
    } finally {
      setSavingTask(false)
    }
  }

  const handleAnalyze = () => {
    const isDemoMode = sources.some((s) => s.id.startsWith('demo_'))

    analyze({
      onSuccess: async (_result) => {
        if (!isDemoMode && !currentScenario) {
          await saveTask()
        }
      },
    })
  }

  const handleShare = async () => {
    if (!result) {
      alert('请先完成分析后再分享')
      return
    }

    const isDemoMode = sources.some((s: Source) => s.id.startsWith('demo_'))

    setCreatingShare(true)
    try {
      if (isDemoMode) {
        createDemoShare()
        setShowShareModal(true)
      } else {
        if (!taskSaved && !currentScenario) {
          await saveTask()
        }

        const currentTaskId =
          taskHistory.length > 0
            ? taskHistory.find(
                (t) =>
                  t.title ===
                  (currentScenario
                    ? SCENARIOS.find((s) => s.id === currentScenario)?.name
                    : `分析任务 ${new Date().toLocaleDateString()}`),
              )?.id
            : undefined

        if (!currentTaskId && !taskSaved) {
          alert('请先保存任务后再分享')
          return
        }

        let taskId = currentTaskId
        if (!taskId && taskHistory.length > 0) {
          taskId = taskHistory[0].id
        }

        if (!taskId) {
          alert('请先保存任务后再分享')
          return
        }

        const shareResult = await shareApi.createShare({ taskId, expiresInDays: 7 })
        const baseUrl = window.location.origin
        const fullUrl = `${baseUrl}/share/${shareResult.token}`
        setShareLink(fullUrl)
        setShareExpired(
          shareResult.expiresAt ? new Date(shareResult.expiresAt).toLocaleString() : '永久有效',
        )
        setShowShareModal(true)
      }
    } catch (error) {
      console.error('Failed to create share:', error)
      alert('创建分享链接失败，请重试')
    } finally {
      setCreatingShare(false)
    }
  }

  const _toggleCheck = async (id: string) => {
    toggleCheckItem(id)

    const item = checklist.find((c) => c.id === id)
    const newChecked = !item?.checked

    const checkedIds = checklist.filter((c) => c.checked).map((c) => c.id)
    const currentTaskId =
      taskHistory.length > 0
        ? taskHistory.find(
            (t) =>
              t.title ===
              (currentScenario
                ? SCENARIOS.find((s) => s.id === currentScenario)?.name
                : `分析任务 ${new Date().toLocaleDateString()}`),
          )?.id
        : undefined

    const tasks: Promise<Response>[] = []
    if (currentTaskId) {
      tasks.push(
        fetch(`/api/tasks/${currentTaskId}/checklist`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ checkedItems: checkedIds }),
        }),
      )
    }
    if (item?.riskType) {
      tasks.push(
        fetch('/api/preferences/checklist-action', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            riskType: item.riskType,
            dimension: item.dimension,
            checked: newChecked,
          }),
        }),
      )
    }

    const results = await Promise.allSettled(tasks)
    for (const r of results) {
      if (r.status === 'rejected') console.error(r.reason)
    }
  }

  const scenario = SCENARIOS.find((s) => s.id === currentScenario)

  const _handleRiskFeedback = async (riskId: string, riskType: string, isAccurate: boolean) => {
    submitFeedback({ riskId, feedback: isAccurate ? 'accurate' : 'inaccurate' })

    try {
      await fetch('/api/preferences/risk-feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ riskId, riskType, isAccurate }),
      })
    } catch (e) {
      console.error(e)
    }
  }

  const _loadSysStats = async () => {
    if (loadingStats) return
    const { setLoadingStats, setSysStats } = useUIPreferenceStore.getState()
    setLoadingStats(true)
    try {
      const res = await fetch('/api/admin/stats')
      const data = await res.json()
      if (data.code === 200) {
        setSysStats(data.data)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoadingStats(false)
    }
  }

  const handleGlobalDrop = async (e: DragEvent) => {
    e.preventDefault()
    setGlobalDragOver(false)

    const files = Array.from(e.dataTransfer.files)
    if (files.length === 0) return

    setShowAddSource(true)
  }

  const handleAddSource = (_source: Source) => {
    refetchSources()
  }

  const handleSelectRisk = (risk: any) => {
    setSelectedRisk(risk)
    if (window.innerWidth < 1024) {
      setMobileContextOpen(true)
    }
  }

  return (
    <div
      className="flex h-screen bg-paper text-ink overflow-hidden relative"
      role="button"
      tabIndex={-1}
      onDragOver={(e) => {
        e.preventDefault()
        setGlobalDragOver(true)
      }}
      onDragLeave={() => setGlobalDragOver(false)}
      onDrop={handleGlobalDrop}
    >
      {/* 移动端侧边栏遮罩 */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* 侧边栏 - 桌面端固定，移动端抽屉 */}
      <div
        className={`fixed md:relative inset-y-0 left-0 z-50 md:z-auto transform transition-transform duration-300 ease-out ${
          mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <WorkspaceSidebar
          currentScenario={currentScenario}
          user={user}
          onGoHome={() => {
            onGoHome()
            setMobileSidebarOpen(false)
          }}
          onNewAnalysis={handleNewAnalysis}
          onLoadScenario={(id) => handleLoadScenario(id as ScenarioType)}
          onShowHistory={handleShowHistory}
          onShowLogin={() => setShowLoginModal(true)}
          onLogout={logout}
          onShowPreference={() => setShowPreferencePanel(true)}
          onShowMonitor={() => setShowMonitorPanel(true)}
        />
      </div>

      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* 顶部栏 - 移动端添加菜单按钮 */}
        <div className="relative">
          <WorkspaceTopBar
            scenario={scenario}
            sourcesLength={sources.length}
            analyzing={analyzing}
            hasResult={!!result}
            onGoHome={onGoHome}
            onShowShare={handleShare}
            onAnalyze={handleAnalyze}
          />
          {/* 移动端菜单按钮 - 绝对定位在左侧 */}
          <button
            className="absolute left-3 top-1/2 -translate-y-1/2 md:hidden p-2 text-ink-muted hover:text-ink transition-colors"
            onClick={() => setMobileSidebarOpen(true)}
          >
            <Menu size={20} strokeWidth={1.5} />
          </button>
        </div>

        <div className="flex-1 overflow-hidden flex relative">
          {/* SourcePanel - 响应式宽度 */}
          <div className="hidden sm:block flex-shrink-0">
            <SourcePanel
              sources={sources}
              selectedSource={selectedSourceId}
              onSelectSource={setSelectedSourceId}
              onAddSource={() => setShowAddSource(true)}
            />
          </div>

          {/* ResultPanel - 主内容区 */}
          <div className="flex-1 min-w-0 overflow-hidden">
            <ResultPanel
              analyzing={analyzing}
              analysisStep={analysisStep}
              result={result}
              activeTab={activeTab as any}
              selectedRisk={selectedRisk}
              checklist={checklist}
              incrementalMeta={result?.meta?.isIncremental ? result.incrementalMeta : undefined}
              onTabChange={(tab) => setActiveTab(tab as any)}
              onSelectRisk={handleSelectRisk}
              onToggleCheck={toggleCheckItem}
              onAnalyze={handleAnalyze}
              canAnalyze={sources.length > 0}
              streaming={streaming}
              streamProgress={streamProgress}
              streamError={streamError}
              onCancel={cancelAnalysis}
            />
          </div>

          {/* ContextPanel - 桌面端固定，移动端底部抽屉 */}
          <div className="hidden lg:block flex-shrink-0">
            <ContextPanel
              selectedRisk={selectedRisk}
              hasResult={!!result}
              riskFeedback={riskFeedback}
              onClose={() => setSelectedRisk(null)}
              onGenerateDraft={generateDraft}
              onFeedback={handleFeedback}
            />
          </div>

          {/* 移动端 ContextPanel 触发按钮 */}
          {selectedRisk && (
            <button
              className="lg:hidden fixed bottom-6 right-6 z-30 w-12 h-12 rounded-full bg-accent text-paper shadow-lg flex items-center justify-center hover:bg-accent-soft transition-colors"
              onClick={() => setMobileContextOpen(true)}
            >
              <ChevronRight size={20} strokeWidth={2} />
            </button>
          )}
        </div>
      </div>

      {/* 移动端 ContextPanel 抽屉 */}
      {mobileContextOpen && (
        <div className="fixed inset-0 z-[60] lg:hidden">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setMobileContextOpen(false)}
          />
          <div className="absolute bottom-0 left-0 right-0 max-h-[85vh] bg-paper rounded-t-2xl shadow-2xl overflow-hidden flex flex-col">
            <div className="flex-1 overflow-y-auto">
              <ContextPanel
                selectedRisk={selectedRisk}
                hasResult={!!result}
                riskFeedback={riskFeedback}
                onClose={() => setMobileContextOpen(false)}
                onGenerateDraft={generateDraft}
                onFeedback={handleFeedback}
              />
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      <AddSourceModal
        isOpen={showAddSource}
        onClose={() => setShowAddSource(false)}
        onAddSource={handleAddSource}
      />

      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        loggingIn={loggingIn}
        onWechatLogin={login}
        onEmailLogin={emailLogin}
        onRegister={register}
        onFetchQrCode={fetchWechatQrCode}
        onStartPolling={startWechatPolling}
        onStopPolling={stopWechatPolling}
        qrCodeUrl={qrCodeUrl}
        pollingStatus={pollingStatus}
        pollingMessage={pollingMessage}
        emailLoginError={emailLoginError}
        registerError={registerError}
      />

      <ShareModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        shareLink={shareLink}
        shareExpired={shareExpired}
        onCopy={copyShareLink}
        copied={false}
        creatingShare={creatingShare}
      />

      <HistoryPanel
        isOpen={_showHistory}
        tasks={taskHistory}
        onClose={() => setShowHistory(false)}
        onSelectTask={handleSelectHistory}
        onDeleteTask={handleDeleteHistory}
      />

      {showPreferencePanel && (
        <PreferencePanel
          onClose={() => setShowPreferencePanel(false)}
          prefs={sources.some((s) => s.id.startsWith('demo_')) ? result?.preferences : undefined}
        />
      )}

      {showMonitorPanel && (
        <MonitorPanel
          onClose={() => setShowMonitorPanel(false)}
          stats={sources.some((s) => s.id.startsWith('demo_')) ? DEMO_SYS_STATS : undefined}
        />
      )}

      <DraftModal
        isOpen={_showDraft}
        onClose={() => useAnalysisStore.getState().setShowDraft(false)}
        draftText={_draftText}
        generating={_generatingDraft}
        riskTitle={selectedRisk?.title || ''}
        onRegenerate={() => {
          if (selectedRisk) {
            generateDraft(selectedRisk)
          }
        }}
        onAdopt={(text) => {
          console.log('Adopted draft:', text)
        }}
      />

      {globalDragOver && (
        <div className="fixed inset-0 z-[2000] bg-paper/90 backdrop-blur-md border-4 border-dashed border-accent pointer-events-none">
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="w-20 h-20 rounded-full bg-accent-bg flex items-center justify-center mb-5 border border-accent-faint">
              <UploadCloud size={36} strokeWidth={1.5} className="text-accent" />
            </div>
            <div className="text-xl font-semibold text-ink font-display tracking-tight">
              释放文件以添加材料
            </div>
            <div className="text-sm text-ink-muted mt-2 font-body">
              支持 TXT、PDF、Word、图片等多种格式
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
