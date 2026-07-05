import { DEMO_RESULTS, DEMO_SOURCES } from '@/constants/demoData'
import type { Source } from '@/types'
import type { AnalyzeResult } from '@/types/analysis'

const SOURCES_KEY = 'youju_mock_sources'
const RESULTS_KEY = 'youju_mock_results'
const PREFERENCES_KEY = 'youju_mock_preferences'

interface MockDB {
  sources: Source[]
  results: Record<string, AnalyzeResult>
  preferences: Record<string, any>
}

function loadDB(): MockDB {
  try {
    const sourcesStr = localStorage.getItem(SOURCES_KEY)
    const resultsStr = localStorage.getItem(RESULTS_KEY)
    const prefsStr = localStorage.getItem(PREFERENCES_KEY)

    if (sourcesStr && resultsStr) {
      return {
        sources: JSON.parse(sourcesStr),
        results: JSON.parse(resultsStr),
        preferences: prefsStr ? JSON.parse(prefsStr) : {},
      }
    }
  } catch (_e) {
    // ignore
  }

  const defaultSources: Source[] = [...DEMO_SOURCES.job_offer, ...DEMO_SOURCES.rental.slice(0, 1)]

  return {
    sources: defaultSources,
    results: {},
    preferences: {},
  }
}

function saveDB(db: MockDB) {
  try {
    localStorage.setItem(SOURCES_KEY, JSON.stringify(db.sources))
    localStorage.setItem(RESULTS_KEY, JSON.stringify(db.results))
    localStorage.setItem(PREFERENCES_KEY, JSON.stringify(db.preferences))
  } catch (_e) {
    // ignore
  }
}

export const mockDB = {
  _db: loadDB(),

  getSources(): Source[] {
    return this._db.sources
  },

  addSource(source: Source): Source {
    this._db.sources.push(source)
    saveDB(this._db)
    return source
  },

  removeSource(id: string): boolean {
    const idx = this._db.sources.findIndex((s) => s.id === id)
    if (idx >= 0) {
      this._db.sources.splice(idx, 1)
      saveDB(this._db)
      return true
    }
    return false
  },

  getSourceById(id: string): Source | undefined {
    return this._db.sources.find((s) => s.id === id)
  },

  clearSources(): void {
    this._db.sources = []
    saveDB(this._db)
  },

  saveResult(key: string, result: AnalyzeResult): void {
    this._db.results[key] = result
    saveDB(this._db)
  },

  getResult(key: string): AnalyzeResult | undefined {
    return this._db.results[key]
  },

  getPreferences(): Record<string, any> {
    return this._db.preferences
  },

  updatePreferences(patch: Record<string, any>): void {
    this._db.preferences = { ...this._db.preferences, ...patch }
    saveDB(this._db)
  },

  reset(): void {
    localStorage.removeItem(SOURCES_KEY)
    localStorage.removeItem(RESULTS_KEY)
    localStorage.removeItem(PREFERENCES_KEY)
    this._db = loadDB()
  },
}

export function getScenarioResult(scenarioId: string): AnalyzeResult | undefined {
  return DEMO_RESULTS[scenarioId]
}

export function getScenarioSources(scenarioId: string): Source[] {
  return DEMO_SOURCES[scenarioId] || []
}
