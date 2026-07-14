import { AlertTriangle, FileCheck, FileText, RefreshCw, Sparkles, Target } from 'lucide-react'
import { useTranslation } from '../../i18n'
import { analyzeIntent } from '../../services/intentAnalysis'
import { useSourceStore } from '../../stores/useSourceStore'

export function SourceScenarioSection() {
  const { t } = useTranslation()
  const {
    analyzingIntent,
    intentAnalysis,
    setAnalyzingIntent,
    setIntentAnalysis,
    sources,
    setScenarioDescription,
  } = useSourceStore()

  const handleReanalyzeIntent = async () => {
    if (sources.length === 0) return

    const allContent = sources.map((s) => `${s.name}: ${s.content.slice(0, 500)}`).join('\n\n')

    setAnalyzingIntent(true)
    setIntentAnalysis(null)

    try {
      const result = await analyzeIntent(allContent)
      setIntentAnalysis(result)
      setScenarioDescription(allContent)
    } finally {
      setAnalyzingIntent(false)
    }
  }

  return (
    <div className="px-3.5 py-3 border-b border-rule bg-paper-dark/30 shrink-0">
      {intentAnalysis && sources.length > 0 ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target size={14} className="text-accent" strokeWidth={1.5} />
              <span className="text-xs font-medium text-accent">{intentAnalysis.scenarioType}</span>
            </div>
            <button
              type="button"
              onClick={handleReanalyzeIntent}
              disabled={analyzingIntent || sources.length === 0}
              className="w-6 h-6 rounded-md flex items-center justify-center text-xs text-ink-faint hover:text-accent hover:bg-paper transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              title="重新分析意图"
            >
              <RefreshCw size={12} className={analyzingIntent ? 'animate-spin' : ''} />
            </button>
          </div>

          <div className="p-2.5 bg-accent-bg/50 border border-accent-faint rounded-lg">
            <p className="text-xs text-ink-muted leading-relaxed">{intentAnalysis.summary}</p>
          </div>

          <div>
            <div className="flex items-center gap-1.5 mb-1.5">
              <FileCheck size={12} className="text-ink-faint" strokeWidth={1.5} />
              <span className="text-[11px] font-medium text-ink-muted">
                {t('source.suggestedDimensions')}
              </span>
            </div>
            <div className="flex flex-wrap gap-1">
              {intentAnalysis.keyDimensions.map((dim, idx) => (
                <span
                  key={idx}
                  className="px-2 py-0.5 text-[10px] bg-paper-dark text-ink-muted rounded-full border border-rule/60"
                >
                  {dim}
                </span>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center gap-1.5 mb-1.5">
              <AlertTriangle size={12} className="text-warning" strokeWidth={1.5} />
              <span className="text-[11px] font-medium text-warning">
                {t('source.potentialRisks')}
              </span>
            </div>
            <ul className="space-y-1 max-h-24 overflow-y-auto">
              {intentAnalysis.riskAreas.map((risk, idx) => (
                <li key={idx} className="text-[11px] text-ink-faint flex items-center gap-1.5">
                  <span className="w-1 h-1 rounded-full bg-warning/60 shrink-0" />
                  {risk}
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : analyzingIntent ? (
        <div className="flex flex-col items-center justify-center py-4">
          <div className="w-4 h-4 border-2 border-accent/30 border-t-accent rounded-full animate-spin mb-2" />
          <span className="text-xs text-ink-muted">{t('source.aiUnderstanding')}</span>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-3 text-center">
          <Sparkles size={16} className="text-ink-faint mb-2" strokeWidth={1.5} />
          <span className="text-xs text-ink-faint">{t('source.addMaterialsToAnalyze')}</span>
        </div>
      )}
    </div>
  )
}
