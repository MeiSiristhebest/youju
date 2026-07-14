import { useEffect } from 'react'
import { PageTransition } from './components/common/PageTransition'
import { ToastProvider } from './components/common/Toast'
import { SkipLink } from './components/ui/SkipLink'
import { useShareUtils } from './hooks/useShare'
import { I18nProvider, useTranslation } from './i18n'
import { HomePage } from './pages/HomePage'
import { SharePage } from './pages/SharePage'
import { WorkspacePage } from './pages/WorkspacePage'
import { useAnalysisStore, useUIPreferenceStore } from './stores'

function AppContent() {
  const { page, theme, setPage, generalSettings } = useUIPreferenceStore()
  const { loadSharedReport, sharedReport, shareError } = useShareUtils()
  const { result } = useAnalysisStore()
  const { setLanguage } = useTranslation()

  useEffect(() => {
    const root = document.documentElement
    if (theme === 'dark') {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
  }, [theme])

  useEffect(() => {
    if (generalSettings.language) {
      setLanguage(generalSettings.language)
    }
  }, [generalSettings.language, setLanguage])

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
    <ToastProvider>
      <div className="min-h-screen bg-paper">
        <SkipLink targetId="main-content" />
        <main id="main-content">
          <PageTransition key={page}>
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
          </PageTransition>
        </main>
      </div>
    </ToastProvider>
  )
}

export function App() {
  return (
    <I18nProvider>
      <AppContent />
    </I18nProvider>
  )
}
