import { useMutation, useQueryClient } from '@tanstack/react-query'
import { type IncrementalPrediction, incrementalEngine } from '../algorithms/incrementalEngine'
import { DEMO_RESULTS } from '../constants/demoData'
import { analysisApi } from '../services/analysisApi'
import { apiClient } from '../services/apiClient'
import { useAnalysisStore, useSourceStore } from '../stores'
import type {
  AnalysisDimension,
  AnalyzeResult,
  ChecklistItem,
  DimensionPriority,
  Risk,
  RiskStatus,
  Source,
} from '../types'

const MAX_RETRY_COUNT = 3
const PING_INTERVAL_MS = 30000
const TIMEOUT_MS = 120000

const ANALYSIS_STEPS = [
  { key: 'scenario', name: '场景识别', desc: '理解材料内容，识别场景类型' },
  { key: 'parsing', name: '解析材料', desc: '提取每份材料的关键信息' },
  { key: 'dimensions', name: '维度发现', desc: '自动发现需要比对的重要维度' },
  { key: 'extraction', name: '跨源提取', desc: '从各材料中提取对应维度的值' },
  { key: 'detection', name: '差异检测', desc: '比对冲突、承诺、缺失信息' },
  { key: 'validation', name: '证据校验', desc: '验证每个结论的证据链' },
  { key: 'output', name: '生成报告', desc: '整理分析结果和检查清单' },
]

export const useAnalysis = (sources: Source[]) => {
  const { currentScenario } = useSourceStore()
  const _queryClient = useQueryClient()
  const {
    result,
    analyzing,
    analysisStep,
    activeTab,
    highlightedRisk,
    highlightedEvidence,
    checklist,
    selectedRisk,
    showDraft,
    draftText,
    generatingDraft,
    showDebug,
    debugTab,
    riskFeedback,
    streaming,
    streamProgress,
    streamError,
    incrementalPrediction,
    cacheHit,
    lastAnalysisDuration,
    showIncrementalBanner,
    forceFullAnalysis,
    previousResult,
    dimensions,
    showAddDimensionDialog,
    riskStatusFilter,
    riskStatuses,
    riskNotes,
    setResult,
    setAnalyzing,
    setAnalysisStep,
    setActiveTab,
    setHighlightedRisk,
    setHighlightedEvidence,
    setChecklist,
    toggleCheckItem,
    setSelectedRisk,
    setShowDraft,
    setDraftText,
    setGeneratingDraft,
    setShowDebug,
    setDebugTab,
    setRiskFeedback,
    setStreaming,
    setStreamProgress,
    setStreamError,
    setIncrementalPrediction,
    setCacheHit,
    setLastAnalysisDuration,
    setShowIncrementalBanner,
    setForceFullAnalysis,
    setPreviousResult,
    resetAnalysis,
    setDimensions,
    toggleDimensionEnabled,
    updateDimensionWeight,
    moveDimension,
    addCustomDimension,
    removeCustomDimension,
    resetDimensionWeights,
    setShowAddDimensionDialog,
    setRiskStatusFilter,
    setRiskStatus,
    setRiskNotes,
    getRiskStatus,
    getRiskNotes,
  } = useAnalysisStore()

  const predictIncrementalChanges = (): IncrementalPrediction | null => {
    if (!result?.meta?.sourceIds) return null

    const oldSourceIds = result.meta.sourceIds as string[]
    const oldSources = sources.filter((s) => oldSourceIds.includes(s.id))
    const prediction = incrementalEngine.predictChanges(oldSources, sources, result)
    return prediction
  }

  const analyzeMutation = useMutation({
    mutationFn: async (params?: {
      onSuccess?: (result: AnalyzeResult) => void
      forceFull?: boolean
    }): Promise<AnalyzeResult> => {
      if (sources.length === 0) throw new Error('No sources')

      const startTime = Date.now()
      const forceFull = params?.forceFull || forceFullAnalysis

      setAnalyzing(true)
      setAnalysisStep(0)
      setIncrementalPrediction(null)
      setCacheHit(false)
      setShowIncrementalBanner(true)

      const previousResultSnapshot = result
      if (result) {
        setPreviousResult(result)
      }

      const sourceIds = sources.map((s) => s.id)
      const cacheKey = incrementalEngine.generateCacheKey(sources, currentScenario)
      const cachedResult = incrementalEngine.getCachedResult(cacheKey)

      if (cachedResult && !forceFull) {
        setCacheHit(true)
        setResult(cachedResult)
        setDimensions(cachedResult.dimensions || [])
        setChecklist(cachedResult.checklist.map((c: ChecklistItem) => ({ ...c, checked: false })))
        setAnalyzing(false)
        setLastAnalysisDuration(Date.now() - startTime)
        params?.onSuccess?.(cachedResult)
        return cachedResult
      }

      const isDemo = sources.some((s) => s.id.startsWith('demo_'))

      const oldSourceIds = previousResultSnapshot?.meta?.sourceIds as string[] | undefined
      const oldSources = oldSourceIds ? sources.filter((s) => oldSourceIds.includes(s.id)) : []
      const isIncremental = !!(
        !forceFull &&
        previousResultSnapshot &&
        oldSourceIds &&
        (() => {
          const newIds = sourceIds.filter((id) => !oldSourceIds.includes(id))
          return newIds.length > 0 && newIds.length < sourceIds.length
        })()
      )

      if (isIncremental && previousResultSnapshot) {
        const prediction = incrementalEngine.predictChanges(
          oldSources,
          sources,
          previousResultSnapshot,
        )
        setIncrementalPrediction(prediction)
      }

      if (isDemo) {
        const demoResult = DEMO_RESULTS[currentScenario as string]
        if (demoResult) {
          const totalSteps = ANALYSIS_STEPS.length
          const stepDuration = isIncremental ? 500 : 800
          for (let i = 0; i < totalSteps; i++) {
            const stepStartProgress = (i / totalSteps) * 100
            const stepEndProgress = ((i + 1) / totalSteps) * 100
            const subSteps = 10
            for (let j = 0; j < subSteps; j++) {
              await new Promise((resolve) => setTimeout(resolve, stepDuration / subSteps))
              const subProgress = (j + 1) / subSteps
              const progress =
                stepStartProgress + (stepEndProgress - stepStartProgress) * subProgress
              setStreamProgress(progress)
            }
            setAnalysisStep(i + 1)
          }
          setStreamProgress(100)
          await new Promise((resolve) => setTimeout(resolve, 300))

          let finalResult: AnalyzeResult

          if (isIncremental && previousResultSnapshot && !forceFull) {
            const mergedResult = incrementalEngine.mergeResults(previousResultSnapshot, demoResult)
            const changes = incrementalEngine.compareRisks(previousResultSnapshot, demoResult)
            const prediction = incrementalEngine.predictChanges(
              oldSources,
              sources,
              previousResultSnapshot,
            )
            const accuracy = incrementalEngine.calculatePredictionAccuracy(prediction, changes)

            finalResult = {
              ...mergedResult,
              meta: {
                ...mergedResult.meta,
                durationMs: Date.now() - startTime,
                isMock: true,
                sourceCount: sources.length,
              },
              incrementalMeta: {
                ...mergedResult.incrementalMeta,
                durationMs: Date.now() - startTime,
                previousSourceCount: previousResultSnapshot.meta?.sourceCount || 0,
                newSourceCount: sources.length,
                prediction: {
                  estimatedNewRiskCount: prediction.estimatedNewRiskCount,
                  estimatedUpdatedRiskCount: prediction.estimatedUpdatedRiskCount,
                  estimatedAffectedDimensions: prediction.estimatedAffectedDimensions,
                  accuracy,
                },
              },
            }
          } else {
            finalResult = {
              ...demoResult,
              meta: {
                ...demoResult.meta,
                durationMs: Date.now() - startTime,
                isMock: true,
                sourceCount: sources.length,
                isIncremental: false,
              },
            }
          }

          incrementalEngine.cacheResults(cacheKey, finalResult)
          setResult(finalResult)
          setDimensions(finalResult.dimensions || [])
          setChecklist(finalResult.checklist.map((c: ChecklistItem) => ({ ...c, checked: false })))
          setAnalyzing(false)
          setLastAnalysisDuration(Date.now() - startTime)
          setForceFullAnalysis(false)
          params?.onSuccess?.(finalResult)
          return finalResult
        } else {
          setAnalyzing(false)
          throw new Error('Demo result not found')
        }
      }

      const abortController = new AbortController()

      try {
        const finalResult = await streamAnalyze({
          sourceIds,
          scenarioType: currentScenario,
          onStepStart: (_stepId, _stepName, stepIndex) => {
            setAnalysisStep(stepIndex + 1)
          },
          onStepComplete: (_stepId, _stepName, stepIndex) => {
            setAnalysisStep(stepIndex + 1)
          },
          onProgress: (progress, _message) => {
            setStreamProgress(progress)
          },
          abortController,
          isIncremental,
        })

        if (isIncremental && previousResultSnapshot) {
          const mergedResult = incrementalEngine.mergeResults(previousResultSnapshot, finalResult)
          const changes = incrementalEngine.compareRisks(previousResultSnapshot, finalResult)
          const prediction = incrementalEngine.predictChanges(
            oldSources,
            sources,
            previousResultSnapshot,
          )
          const accuracy = incrementalEngine.calculatePredictionAccuracy(prediction, changes)

          const resultWithAccuracy: AnalyzeResult = {
            ...mergedResult,
            incrementalMeta: {
              ...mergedResult.incrementalMeta,
              durationMs: Date.now() - startTime,
              previousSourceCount: previousResultSnapshot.meta?.sourceCount || 0,
              newSourceCount: sources.length,
              prediction: {
                estimatedNewRiskCount: prediction.estimatedNewRiskCount,
                estimatedUpdatedRiskCount: prediction.estimatedUpdatedRiskCount,
                estimatedAffectedDimensions: prediction.estimatedAffectedDimensions,
                accuracy,
              },
            },
          }

          incrementalEngine.cacheResults(cacheKey, resultWithAccuracy)
          setResult(resultWithAccuracy)
          setDimensions(resultWithAccuracy.dimensions || [])
          setChecklist(
            resultWithAccuracy.checklist.map((c: ChecklistItem) => ({ ...c, checked: false })),
          )
          setLastAnalysisDuration(Date.now() - startTime)
          setForceFullAnalysis(false)
          params?.onSuccess?.(resultWithAccuracy)
          return resultWithAccuracy
        }

        incrementalEngine.cacheResults(cacheKey, finalResult)
        setResult(finalResult)
        setDimensions(finalResult.dimensions || [])
        setChecklist(finalResult.checklist.map((c: ChecklistItem) => ({ ...c, checked: false })))
        setAnalysisStep(ANALYSIS_STEPS.length)
        setLastAnalysisDuration(Date.now() - startTime)
        setForceFullAnalysis(false)
        params?.onSuccess?.(finalResult)
        return finalResult
      } finally {
        setAnalyzing(false)
        abortController.abort()
      }
    },
  })

  async function streamAnalyze(params: {
    sourceIds: string[]
    scenarioType: string | null
    onStepStart?: (stepId: string, stepName: string, stepIndex: number) => void
    onStepComplete?: (
      stepId: string,
      stepName: string,
      stepIndex: number,
      partialResult: unknown,
    ) => void
    onProgress?: (progress: number, message?: string) => void
    abortController?: AbortController
    isIncremental?: boolean
  }): Promise<AnalyzeResult> {
    const {
      sourceIds,
      scenarioType,
      onStepStart,
      onStepComplete,
      onProgress,
      abortController = new AbortController(),
      isIncremental = false,
    } = params

    const token = localStorage.getItem('youju_token')
    const sessionId = localStorage.getItem('youju_session_id')
    const url = isIncremental ? '/api/analyze/incremental/stream' : '/api/analyze/stream'

    let retryCount = 0
    let currentAnalysisLogId: string | null = null
    let lastPingTime = Date.now()
    let pingInterval: ReturnType<typeof setInterval> | null = null
    let timeoutTimer: ReturnType<typeof setTimeout> | null = null
    let lastProgress = 0
    let totalSteps = ANALYSIS_STEPS.length

    const log = (
      level: 'info' | 'warn' | 'error',
      message: string,
      details?: Record<string, any>,
    ) => {
      const prefix = isIncremental ? '[Incremental Stream]' : '[Analyze Stream]'
      const logFn =
        level === 'error' ? console.error : level === 'warn' ? console.warn : console.log
      logFn(`${prefix} ${message}`, details || '')
    }

    const parseSSEEvents = (
      buffer: string,
    ): { events: Array<{ event: string; data: string }>; remaining: string } => {
      const events: Array<{ event: string; data: string }> = []
      let current = buffer

      while (true) {
        const eventEndIndex = current.indexOf('\n\n')
        if (eventEndIndex === -1) break

        const eventBlock = current.substring(0, eventEndIndex)
        current = current.substring(eventEndIndex + 2)

        let eventName = 'message'
        const dataLines: string[] = []

        for (const line of eventBlock.split('\n')) {
          if (line.startsWith('event: ')) {
            eventName = line.substring(7).trim()
          } else if (line.startsWith('data: ')) {
            dataLines.push(line.substring(6))
          }
        }

        if (dataLines.length > 0) {
          events.push({ event: eventName, data: dataLines.join('\n') })
        }
      }

      return { events, remaining: current }
    }

    const _sendPing = () => {
      if (abortController.signal.aborted) {
        if (pingInterval) clearInterval(pingInterval)
        return
      }
      const _pingData = `event: ping\ndata: {}\n\n`
      const _encoder = new TextEncoder()
      abortController.signal.addEventListener(
        'abort',
        () => {
          if (pingInterval) clearInterval(pingInterval)
        },
        { once: true },
      )
    }

    const createRequest = async () => {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      }
      if (token) headers.Authorization = `Bearer ${token}`
      else if (sessionId) headers['X-Session-Id'] = sessionId

      const body: Record<string, any> = { sourceIds, scenarioType }
      if (isIncremental && result?.meta?.sourceIds) {
        body.existingResult = result
        const existingIds = result.meta.sourceIds as string[]
        body.newSourceIds = sourceIds.filter((id) => !existingIds.includes(id))
      }

      log('info', `Creating request to ${url}`, { bodySize: JSON.stringify(body).length })

      return fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: abortController.signal,
      })
    }

    const processStream = async (response: Response): Promise<AnalyzeResult | null> => {
      if (!response.ok) {
        throw new Error(`Stream request failed: ${response.status} ${response.statusText}`)
      }

      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error('No response body')
      }

      const decoder = new TextDecoder()
      let pendingBuffer = ''
      let finalResult: AnalyzeResult | null = null

      lastPingTime = Date.now()
      if (timeoutTimer) clearTimeout(timeoutTimer)
      timeoutTimer = setTimeout(() => {
        log('error', 'Stream timeout')
        abortController.abort(new Error('Stream timeout'))
      }, TIMEOUT_MS)

      pingInterval = setInterval(() => {
        const now = Date.now()
        if (now - lastPingTime > PING_INTERVAL_MS * 2) {
          log('warn', 'No ping received, connection may be stale')
        }
        lastPingTime = now
      }, PING_INTERVAL_MS)

      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) {
            log('info', 'Stream reader done')
            break
          }

          lastPingTime = Date.now()
          if (timeoutTimer) {
            clearTimeout(timeoutTimer)
            timeoutTimer = setTimeout(() => {
              log('error', 'Stream timeout')
              abortController.abort(new Error('Stream timeout'))
            }, TIMEOUT_MS)
          }

          pendingBuffer += decoder.decode(value, { stream: true })
          const { events, remaining } = parseSSEEvents(pendingBuffer)
          pendingBuffer = remaining

          for (const { event, data } of events) {
            try {
              const parsed = JSON.parse(data)
              switch (event) {
                case 'init':
                  currentAnalysisLogId = parsed.analysisLogId
                  totalSteps = parsed.totalSteps || ANALYSIS_STEPS.length
                  log('info', 'Stream initialized', {
                    analysisLogId: currentAnalysisLogId,
                    totalSteps,
                  })
                  break

                case 'step_start': {
                  log('info', 'Step started', {
                    stepId: parsed.stepId,
                    stepName: parsed.stepName,
                    stepIndex: parsed.stepIndex,
                  })
                  onStepStart?.(parsed.stepId, parsed.stepName, parsed.stepIndex)
                  const stepStartProgress = (parsed.stepIndex / totalSteps) * 100
                  lastProgress = stepStartProgress
                  onProgress?.(stepStartProgress, `正在${parsed.stepName}...`)
                  break
                }

                case 'step_progress': {
                  log('info', 'Step progress', {
                    stepId: parsed.stepId,
                    progress: parsed.progress,
                    message: parsed.message,
                  })
                  const stepProgress =
                    ((parsed.stepIndex + parsed.progress / 100) / totalSteps) * 100
                  lastProgress = Math.max(lastProgress, stepProgress)
                  onProgress?.(lastProgress, parsed.message)
                  break
                }

                case 'step_complete': {
                  log('info', 'Step completed', {
                    stepId: parsed.stepId,
                    stepName: parsed.stepName,
                    stepIndex: parsed.stepIndex,
                  })
                  onStepComplete?.(
                    parsed.stepId,
                    parsed.stepName,
                    parsed.stepIndex,
                    parsed.partialResult,
                  )
                  const stepCompleteProgress = ((parsed.stepIndex + 1) / totalSteps) * 100
                  lastProgress = stepCompleteProgress
                  onProgress?.(stepCompleteProgress, `${parsed.stepName}完成`)
                  break
                }

                case 'complete':
                  finalResult = parsed.result as AnalyzeResult
                  if (currentAnalysisLogId && finalResult.meta) {
                    finalResult.meta.analysisLogId = currentAnalysisLogId
                  }
                  log('info', 'Analysis complete', { resultId: finalResult.meta?.analysisLogId })
                  onProgress?.(100, '分析完成')
                  break

                case 'error': {
                  const errorMsg = parsed.message || 'Analysis failed'
                  log('error', 'Analysis error', {
                    code: parsed.code,
                    message: errorMsg,
                    analysisLogId: parsed.analysisLogId,
                  })
                  if (parsed.analysisLogId) {
                    localStorage.setItem('youju_last_failed_analysis_log', parsed.analysisLogId)
                  }
                  throw new Error(errorMsg)
                }

                case 'ping':
                  log('info', 'Ping received')
                  break

                default:
                  log('warn', 'Unknown event type', { event })
              }
            } catch (e) {
              if (event === 'error') throw e
              log('warn', 'Failed to parse event data', { event, error: (e as Error).message })
            }
          }
        }

        return finalResult
      } finally {
        if (pingInterval) clearInterval(pingInterval)
        if (timeoutTimer) clearTimeout(timeoutTimer)
        reader.releaseLock()
      }
    }

    while (retryCount < MAX_RETRY_COUNT) {
      try {
        log('info', `Connecting (attempt ${retryCount + 1}/${MAX_RETRY_COUNT})`)
        setStreaming(true)
        setStreamError(null)

        const response = await createRequest()
        const finalResult = await processStream(response)

        if (finalResult) {
          log('info', 'Analysis successful')
          setResult(finalResult)
          setStreaming(false)
          return finalResult
        }

        throw new Error('Stream ended without final result')
      } catch (error) {
        const err = error as Error
        log('error', `Stream error: ${err.message}`, { retryCount })

        if (err.name === 'AbortError') {
          log('info', 'Stream aborted')
          setStreaming(false)
          throw new Error('分析已取消')
        }

        retryCount++
        if (retryCount >= MAX_RETRY_COUNT) {
          log('error', 'Max retry count exceeded')
          setStreamError(err.message)
          setStreaming(false)
          throw err
        }

        const delay = 2 ** retryCount * 1000
        log('info', `Retrying in ${delay}ms`)
        await new Promise((resolve) => setTimeout(resolve, delay))
      }
    }

    throw new Error('Analysis failed after maximum retries')
  }

  const generateDraftMutation = useMutation({
    mutationFn: (risk: Risk) => {
      const context = sources.map((s) => s.content).join('\n\n')
      return analysisApi.generateDraft({ risk, context })
    },
    onMutate: (risk) => {
      setGeneratingDraft(true)
      setShowDraft(true)
      setDraftText('')
      setSelectedRisk(risk)
    },
    onSuccess: (data) => {
      setDraftText(data.draft)
    },
    onError: (_, risk) => {
      setDraftText(`【关于"${risk.title}"的确认】

您好，

在确认之前，我想核实一下以下事项：

关于「${risk.title}」：
${risk.description}

涉及的材料：${(risk.evidence?.map((e) => e.sourceName) || risk.sources).join('、')}

请问实际情况是怎样的？能否以书面形式确认一下？

期待您的回复，谢谢！`)
    },
    onSettled: () => {
      setGeneratingDraft(false)
    },
  })

  const submitFeedbackMutation = useMutation({
    mutationFn: (params: { riskId: string; feedback: 'accurate' | 'inaccurate' }) =>
      analysisApi.submitRiskFeedback(params),
    onMutate: ({ riskId, feedback }) => {
      setRiskFeedback(riskId, feedback)
    },
  })

  const resumeAnalysisMutation = useMutation({
    mutationFn: async (analysisLogId: string): Promise<AnalyzeResult> => {
      if (sources.length === 0) throw new Error('No sources')

      setAnalyzing(true)
      setAnalysisStep(0)

      const sourceIds = sources.map((s) => s.id)
      const resumedResult = await apiClient.post<AnalyzeResult>('/api/analyze/resume', {
        analysisLogId,
        sourceIds,
      })

      setResult(resumedResult)
      setDimensions(resumedResult.dimensions || [])
      setChecklist(
        resumedResult.checklist?.map((c: ChecklistItem) => ({ ...c, checked: false })) || [],
      )
      return resumedResult
    },
    onSettled: () => {
      setAnalyzing(false)
    },
  })

  const getLastFailedAnalysisLog = (): string | null => {
    return localStorage.getItem('youju_last_failed_analysis_log')
  }

  const clearFailedAnalysisLog = () => {
    localStorage.removeItem('youju_last_failed_analysis_log')
  }

  const sortedRisks = (() => {
    if (!result?.risks || dimensions.length === 0) {
      const risks = result?.risks || []
      if (riskStatusFilter === 'all') return risks
      return risks.filter((r) => getRiskStatus(r.id) === riskStatusFilter)
    }
    const dimensionWeightMap = new Map(dimensions.map((d) => [d.name, d.weight]))
    let filtered = [...result.risks]
    if (riskStatusFilter !== 'all') {
      filtered = filtered.filter((r) => getRiskStatus(r.id) === riskStatusFilter)
    }
    return filtered.sort((a, b) => {
      const weightA = dimensionWeightMap.get(a.dimension || '') || 0
      const weightB = dimensionWeightMap.get(b.dimension || '') || 0
      if (weightB !== weightA) return weightB - weightA
      const levelOrder = { critical: 3, warning: 2, info: 1 }
      return (
        (levelOrder[b.level as keyof typeof levelOrder] || 0) -
        (levelOrder[a.level as keyof typeof levelOrder] || 0)
      )
    })
  })()

  const riskStatusCounts = (() => {
    if (!result?.risks) return { all: 0, pending: 0, processing: 0, resolved: 0, ignored: 0 }
    const counts = { all: result.risks.length, pending: 0, processing: 0, resolved: 0, ignored: 0 }
    result.risks.forEach((r) => {
      const status = getRiskStatus(r.id)
      counts[status]++
    })
    return counts
  })()

  const pendingRisks = (() => {
    if (!result?.risks) return []
    const dimensionWeightMap = new Map(dimensions.map((d) => [d.name, d.weight]))
    return result.risks
      .filter((r) => {
        const status = getRiskStatus(r.id)
        return status === 'pending' || status === 'processing'
      })
      .sort((a, b) => {
        const weightA = dimensionWeightMap.get(a.dimension || '') || 0
        const weightB = dimensionWeightMap.get(b.dimension || '') || 0
        if (weightB !== weightA) return weightB - weightA
        const levelOrder = { critical: 3, warning: 2, info: 1 }
        return (
          (levelOrder[b.level as keyof typeof levelOrder] || 0) -
          (levelOrder[a.level as keyof typeof levelOrder] || 0)
        )
      })
  })()

  const totalUnresolved = (() => {
    if (!result?.risks) return 0
    return result.risks.filter((r) => {
      const status = getRiskStatus(r.id)
      return status === 'pending' || status === 'processing'
    }).length
  })()

  return {
    result,
    analyzing,
    analysisStep,
    activeTab,
    highlightedRisk,
    highlightedEvidence,
    checklist,
    selectedRisk,
    showDraft,
    draftText,
    generatingDraft,
    showDebug,
    debugTab,
    riskFeedback,
    streaming,
    streamProgress,
    streamError,
    incrementalPrediction,
    cacheHit,
    lastAnalysisDuration,
    showIncrementalBanner,
    forceFullAnalysis,
    previousResult,
    dimensions,
    sortedRisks,
    showAddDimensionDialog,
    riskStatusFilter,
    riskStatusCounts,
    pendingRisks,
    totalUnresolved,
    ANALYSIS_STEPS,
    analyze: analyzeMutation.mutate,
    analyzeFull: (params?: { onSuccess?: (result: AnalyzeResult) => void }) =>
      analyzeMutation.mutate({ ...params, forceFull: true }),
    isAnalyzing: analyzeMutation.isPending,
    cancelAnalysis: () => {
      analyzeMutation.reset()
      setAnalyzing(false)
      setStreaming(false)
      setStreamError(null)
    },
    generateDraft: generateDraftMutation.mutate,
    isGeneratingDraft: generateDraftMutation.isPending,
    submitFeedback: submitFeedbackMutation.mutate,
    resetAnalysis,
    setActiveTab,
    setHighlightedRisk,
    setHighlightedEvidence,
    setChecklist,
    toggleCheckItem,
    setSelectedRisk,
    setShowDraft,
    setShowDebug,
    setDebugTab,
    setShowIncrementalBanner,
    setForceFullAnalysis,
    resumeAnalysis: resumeAnalysisMutation.mutate,
    isResuming: resumeAnalysisMutation.isPending,
    getLastFailedAnalysisLog,
    clearFailedAnalysisLog,
    predictIncrementalChanges,
    toggleDimensionEnabled,
    updateDimensionWeight,
    moveDimension,
    addCustomDimension,
    removeCustomDimension,
    resetDimensionWeights,
    setShowAddDimensionDialog,
    setRiskStatusFilter,
    setRiskStatus,
    setRiskNotes,
    getRiskStatus,
    getRiskNotes,
  }
}
