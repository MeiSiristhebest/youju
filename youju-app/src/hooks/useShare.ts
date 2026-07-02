import { SCENARIOS } from '../constants/workspace'
import { shareApi } from '../services/shareApi'
import { useAnalysisStore, useSourceStore, useUIPreferenceStore } from '../stores'

export function useShareUtils() {
  const {
    shareLink,
    shareExpired,
    creatingShare,
    sharedReport,
    shareError,
    copied,
    setShareLink,
    setShareExpired,
    setCreatingShare,
    setSharedReport,
    setShareError,
    setCopied: _setCopied,
  } = useUIPreferenceStore()

  const { result, setResult, setChecklist } = useAnalysisStore()
  const { sources, currentScenario } = useSourceStore()

  const copyShareLink = async () => {
    try {
      await navigator.clipboard.writeText(shareLink)
      alert('分享链接已复制到剪贴板')
    } catch (e) {
      console.error(e)
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
          setSharedReport(data)
          setResult(data.result)
          setChecklist(data.result.checklist?.map((c: any) => ({ ...c, checked: false })) || [])
        } else {
          setShareError('分享不存在或已过期')
        }
      } else {
        const sharedReportData = await shareApi.getSharedReport(token)
        if (sharedReportData.expiresAt && new Date(sharedReportData.expiresAt) < new Date()) {
          setShareError('分享已过期')
          return
        }
        setSharedReport(sharedReportData)
        setResult(sharedReportData.result)
        setChecklist(
          sharedReportData.result.checklist?.map((c: any) => ({ ...c, checked: false })) || [],
        )
      }
    } catch (error) {
      console.error('Failed to load shared report:', error)
      setShareError('加载分享失败，请检查网络连接')
    }
  }

  const createDemoShare = () => {
    const mockToken = `demo_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    const fullUrl = `${window.location.origin}/share/${mockToken}`

    const mockSharedReport = {
      id: mockToken,
      title: currentScenario
        ? SCENARIOS.find((s) => s.id === currentScenario)?.name || '分析报告'
        : '分析报告',
      result,
      sources,
      createdAt: new Date().toISOString(),
      expiresAt: expiresAt.toISOString(),
      viewCount: 0,
    }
    localStorage.setItem(`youju_share_${mockToken}`, JSON.stringify(mockSharedReport))

    setShareLink(fullUrl)
    setShareExpired(expiresAt.toLocaleString())
  }

  return {
    shareLink,
    shareExpired,
    creatingShare,
    sharedReport,
    shareError,
    copied,
    copyShareLink,
    loadSharedReport,
    createDemoShare,
    setShareLink,
    setShareExpired,
    setCreatingShare,
    setSharedReport,
    setShareError,
  }
}
