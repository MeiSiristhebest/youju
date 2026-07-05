import { AlertTriangle, FileCheck, FileText, Lightbulb, Sparkles, Target } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { useTranslation } from '../../i18n'
import { analyzeIntent } from '../../services/intentAnalysis'
import { useSourceStore } from '../../stores/useSourceStore'

export function SourceScenarioSection() {
  const { t } = useTranslation()
  const {
    scenarioDescription,
    analyzingIntent,
    intentAnalysis,
    setScenarioDescription,
    setAnalyzingIntent,
    setIntentAnalysis,
  } = useSourceStore()
  const [descInput, setDescInput] = useState(scenarioDescription)

  const handleAnalyzeIntent = async () => {
    if (!descInput.trim()) return

    setScenarioDescription(descInput)
    setAnalyzingIntent(true)
    setIntentAnalysis(null)

    try {
      const result = await analyzeIntent(descInput)
      setIntentAnalysis(result)
    } finally {
      setAnalyzingIntent(false)
    }
  }

  return (
    <div className="px-3.5 py-3 border-b border-rule bg-paper-dark/30 shrink-0">
      <div className="flex items-center gap-2 mb-2">
        <Sparkles size={14} className="text-accent" strokeWidth={1.5} />
        <span className="text-xs font-medium text-ink">{t('source.describeYourScenario')}</span>
      </div>
      <textarea
        value={descInput}
        onChange={(e) => setDescInput(e.target.value)}
        placeholder={t('source.scenarioPlaceholder')}
        className="w-full h-20 px-3 py-2 text-xs bg-paper border border-rule rounded-lg resize-none text-ink placeholder:text-ink-faint focus:outline-none focus:border-accent/50"
      />
      <button
        type="button"
        onClick={handleAnalyzeIntent}
        disabled={!descInput.trim() || analyzingIntent}
        className={cn(
          'mt-2 w-full py-2 rounded-lg text-xs font-medium cursor-pointer transition-all duration-200 flex items-center justify-center gap-1.5',
          !descInput.trim() || analyzingIntent
            ? 'bg-paper-dark text-ink-faint cursor-not-allowed'
            : 'bg-accent text-paper hover:bg-accent/90',
        )}
      >
        {analyzingIntent ? (
          <>
            <div className="w-3 h-3 border-2 border-paper/30 border-t-paper rounded-full animate-spin" />
            {t('source.aiUnderstanding')}
          </>
        ) : (
          <>
            <Lightbulb size={13} strokeWidth={1.5} />
            {t('source.aiAnalyzeIntent')}
          </>
        )}
      </button>

      {intentAnalysis && (
        <div className="mt-3 space-y-3 animate-[fadeIn_0.3s_ease-out] max-h-60 overflow-y-auto">
          <div className="p-3 bg-accent-bg/50 border border-accent-faint rounded-lg">
            <div className="flex items-center gap-1.5 mb-1.5">
              <Target size={12} className="text-accent" strokeWidth={1.5} />
              <span className="text-xs font-medium text-accent">{intentAnalysis.scenarioType}</span>
            </div>
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
              <FileText size={12} className="text-ink-faint" strokeWidth={1.5} />
              <span className="text-[11px] font-medium text-ink-muted">
                {t('source.suggestedSources')}
              </span>
            </div>
            <ul className="space-y-1">
              {intentAnalysis.suggestedSources.map((src, idx) => (
                <li key={idx} className="text-[11px] text-ink-faint flex items-center gap-1.5">
                  <span className="w-1 h-1 rounded-full bg-ink-faint/50 shrink-0" />
                  {src}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <div className="flex items-center gap-1.5 mb-1.5">
              <AlertTriangle size={12} className="text-warning" strokeWidth={1.5} />
              <span className="text-[11px] font-medium text-warning">
                {t('source.potentialRisks')}
              </span>
            </div>
            <ul className="space-y-1">
              {intentAnalysis.riskAreas.map((risk, idx) => (
                <li key={idx} className="text-[11px] text-ink-faint flex items-center gap-1.5">
                  <span className="w-1 h-1 rounded-full bg-warning/60 shrink-0" />
                  {risk}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}
