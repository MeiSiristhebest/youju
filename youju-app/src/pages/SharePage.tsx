import { lazy, Suspense } from 'react'

const SharePageComponent = lazy(() =>
  import('../components/SharePage').then((m) => ({ default: m.SharePage })),
)

const PageFallback = () => (
  <div className="min-h-screen grid place-items-center bg-paper">
    <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
  </div>
)

interface SharePageProps {
  sharedReport: any
  result: any
  error: string | null
  loading: boolean
}

export function SharePage({ sharedReport, result, error, loading }: SharePageProps) {
  return (
    <Suspense fallback={<PageFallback />}>
      <SharePageComponent
        sharedReport={sharedReport}
        result={result}
        error={error || ''}
        loading={loading}
      />
    </Suspense>
  )
}
