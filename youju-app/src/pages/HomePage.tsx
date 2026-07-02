import { lazy, Suspense } from 'react'

const LandingPage = lazy(() =>
  import('../components/landing/LandingPage').then((m) => ({ default: m.LandingPage })),
)

const PageFallback = () => (
  <div className="min-h-screen grid place-items-center bg-paper">
    <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
  </div>
)

interface HomePageProps {
  onStart: () => void
}

export function HomePage({ onStart }: HomePageProps) {
  return (
    <Suspense fallback={<PageFallback />}>
      <LandingPage onStart={onStart} />
    </Suspense>
  )
}
