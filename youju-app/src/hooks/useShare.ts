import { useMutation, useQueryClient } from '@tanstack/react-query'
import { SCENARIOS } from '../constants/workspace'
import { jsonStorage, storage } from '../lib/storage'
import { shareApi } from '../services/shareApi'
import { useAnalysisStore, useSourceStore, useUIPreferenceStore } from '../stores'
import type { AnalyzeResult, ChecklistItem, SharedReport } from '../types'

export function useShareUtils() {
  const _queryClient = useQueryClient()

  const {
    shareLink,
    shareExpired,
    creatingShare,
    sharedReport,
    shareError,
    copied,
    shareViewCount,
    setShareLink,
    setShareExpired,
    setCreatingShare,
    setSharedReport,
    setShareError,
    setCopied: _setCopied,
    setShareViewCount,
  } = useUIPreferenceStore()

  const { result, setResult, setChecklist } = useAnalysisStore()
  const { sources, currentScenario } = useSourceStore()

  const createShareMutation = useMutation({
    mutationFn: shareApi.createShare,
    onMutate: () => {
      setCreatingShare(true)
    },
    onSuccess: (data) => {
      const baseUrl = window.location.origin
      const fullUrl = `${baseUrl}/share/${data.token}`
      setShareLink(fullUrl)
      setShareExpired(data.expiresAt ? new Date(data.expiresAt).toLocaleString() : '永久有效')
      setShareViewCount(0)
    },
    onSettled: () => {
      setCreatingShare(false)
    },
  })

  const _loadSharedReportMutation = useMutation({
    mutationFn: (token: string) => shareApi.getSharedReport(token),
    onMutate: () => {
      setShareError('')
    },
    onSuccess: (sharedReportData) => {
      if (sharedReportData.expiresAt && new Date(sharedReportData.expiresAt) < new Date()) {
        setShareError('分享已过期')
        return
      }
      setShareViewCount(sharedReportData.viewCount || 0)
      setSharedReport(sharedReportData)
      setResult(sharedReportData.result)
      setChecklist(
        sharedReportData.result.checklist?.map((c: ChecklistItem) => ({
          ...c,
          checked: false,
        })) || [],
      )
    },
    onError: () => {
      setShareError('加载分享失败，请检查网络连接')
    },
  })

  const copyShareLink = async () => {
    try {
      await navigator.clipboard.writeText(shareLink)
      return true
    } catch (e) {
      console.error(e)
      return false
    }
  }

  const loadSharedReport = async (token: string) => {
    const { setPage } = useUIPreferenceStore.getState()
    setPage('share')
    try {
      if (token.startsWith('demo_')) {
        const shareKey = `share_${token}`
        const data = jsonStorage.getItem<SharedReport>(shareKey)
        if (data) {
          if (data.expiresAt && new Date(data.expiresAt) < new Date()) {
            setShareError('分享已过期')
            storage.removeItem(shareKey)
            return
          }
          data.viewCount = (data.viewCount || 0) + 1
          jsonStorage.setItem(shareKey, data)
          setShareViewCount(data.viewCount)
          setSharedReport(data)
          setResult(data.result)
          setChecklist(data.result.checklist?.map((c) => ({ ...c, checked: false })) || [])
        } else {
          setShareError('分享不存在或已过期')
        }
      } else {
        const sharedReportData = await shareApi.getSharedReport(token)
        if (sharedReportData.expiresAt && new Date(sharedReportData.expiresAt) < new Date()) {
          setShareError('分享已过期')
          return
        }
        setShareViewCount(sharedReportData.viewCount || 0)
        setSharedReport(sharedReportData)
        setResult(sharedReportData.result)
        setChecklist(
          sharedReportData.result.checklist?.map((c: ChecklistItem) => ({
            ...c,
            checked: false,
          })) || [],
        )
      }
    } catch (error) {
      console.error('Failed to load shared report:', error)
      setShareError('加载分享失败，请检查网络连接')
    }
  }

  const createDemoShare = (expiresInDays: number | null = 7) => {
    const mockToken = `demo_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
    const expiresAt = expiresInDays
      ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
      : null
    const fullUrl = `${window.location.origin}/share/${mockToken}`

    const mockSharedReport = {
      id: mockToken,
      title: currentScenario
        ? SCENARIOS.find((s) => s.id === currentScenario)?.name || '分析报告'
        : '分析报告',
      result,
      sources,
      createdAt: new Date().toISOString(),
      expiresAt: expiresAt ? expiresAt.toISOString() : null,
      viewCount: 0,
    }
    jsonStorage.setItem(`share_${mockToken}`, mockSharedReport)

    setShareLink(fullUrl)
    setShareExpired(expiresAt ? expiresAt.toLocaleString() : '永久有效')
    setShareViewCount(0)
  }

  return {
    shareLink,
    shareExpired,
    creatingShare,
    sharedReport,
    shareError,
    copied,
    shareViewCount,
    copyShareLink,
    loadSharedReport,
    createDemoShare,
    setShareLink,
    setShareExpired,
    setCreatingShare,
    setSharedReport,
    setShareError,
    setShareViewCount,
    createShare: createShareMutation.mutate,
    createShareAsync: createShareMutation.mutateAsync,
    isCreatingShare: createShareMutation.isPending,
    createShareError: createShareMutation.error,
  }
}
