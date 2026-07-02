import { useEffect } from 'react'
import { SkipLink } from './components/ui/SkipLink'
import { useShareUtils } from './hooks/useShare'
import { HomePage } from './pages/HomePage'
import { SharePage } from './pages/SharePage'
import { WorkspacePage } from './pages/WorkspacePage'
import { useAnalysisStore, useUIPreferenceStore } from './stores'

export function App() {
  const { page, theme, setPage } = useUIPreferenceStore()
  const { loadSharedReport, sharedReport, shareError } = useShareUtils()
  const { result } = useAnalysisStore()

  useEffect(() => {
    const root = document.documentElement
    if (theme === 'dark') {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
  }, [theme])

  useEffect(() => {
    const path = window.location.pathname
    if (path.startsWith('/share/')) {
      const shareToken = path.replace('/share/', '')
      if (shareToken) {
        loadSharedReport(shareToken)
      }
    }
  }, [loadSharedReport])

  const handleGoHome = () => setPage('home')
  const handleGoWorkspace = () => setPage('workspace')

  return (
    <div className="min-h-screen bg-paper">
      <SkipLink targetId="main-content" />
      <main id="main-content">
        {page === 'home' && <HomePage onStart={handleGoWorkspace} />}
        {page === 'workspace' && <WorkspacePage onGoHome={handleGoHome} />}
        {page === 'share' && (
          <SharePage
            sharedReport={sharedReport}
            result={result}
            error={shareError || ''}
            loading={!sharedReport && !shareError}
          />
        )}
      </main>
    </div>
  )
}
