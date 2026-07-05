import { type SetupWorker, setupWorker } from 'msw/browser'
import { analysisHandlers } from './handlers/analysis'
import { miscHandlers } from './handlers/misc'
import { sourceHandlers } from './handlers/sources'

let workerInstance: SetupWorker | null = null
let initPromise: Promise<void> | null = null

export function getWorker() {
  if (!workerInstance) {
    workerInstance = setupWorker(...analysisHandlers, ...sourceHandlers, ...miscHandlers)
  }
  return workerInstance
}

export async function initMockServiceWorker(): Promise<void> {
  if (typeof window === 'undefined') return

  const enabled = import.meta.env.VITE_ENABLE_MOCK !== 'false'

  if (!enabled) {
    console.info('[MSW] Mock service worker is disabled.')
    return
  }

  if (initPromise) {
    return initPromise
  }

  initPromise = (async () => {
    try {
      const worker = getWorker()
      await worker.start({
        onUnhandledRequest: 'bypass',
        quiet: false,
      })
      console.info('[MSW] Mock service worker started successfully.')
    } catch (error) {
      console.error('[MSW] Failed to start mock service worker:', error)
      initPromise = null
    }
  })()

  return initPromise
}
