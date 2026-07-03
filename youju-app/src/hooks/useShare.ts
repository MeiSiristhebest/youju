import { SCENARIOS } from '../constants/workspace'
import { shareApi } from '../services/shareApi'
import { useAnalysisStore, useSourceStore, useUIPreferenceStore } from '../stores'
import type { ChecklistItem } from '../types'

export function useShareUtils() {
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
        const stored = localStorage.getItem(`youju_share_${token}`)
        if (stored) {
          const data = JSON.parse(stored)
          if (data.expiresAt && new Date(data.expiresAt) < new Date()) {
            setShareError('分享已过期')
            localStorage.removeItem(`youju_share_${token}`)
            return
          }
          data.viewCount = (data.viewCount || 0) + 1
          localStorage.setItem(`youju_share_${token}`, JSON.stringify(data))
          setShareViewCount(data.viewCount)
          setSharedReport(data)
          setResult(data.result)
          setChecklist(
            data.result.checklist?.map((c: ChecklistItem) => ({ ...c, checked: false })) || [],
          )
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
    localStorage.setItem(`youju_share_${mockToken}`, JSON.stringify(mockSharedReport))

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
  }
}
