import { CloudUpload, Info, ShieldCheck, Sparkles } from 'lucide-react'
import type { ReactNode } from 'react'
import { useTranslation } from '@/i18n'
import { cn } from '@/lib/utils'
import { MagneticButton } from '../ui/MagneticButton'

interface WorkspaceEmptyProps {
  type: 'sources' | 'risk' | 'context' | 'result'
  onAction?: () => void
  actionLabel?: string
  title?: string
  description?: string
  learnMoreUrl?: string
  className?: string
}

interface EmptyStateConfig {
  icon: ReactNode
  title: string
  description: string
  actionLabel?: string
  learnMore?: boolean
}

export function WorkspaceEmpty({
  type,
  onAction,
  actionLabel,
  title,
  description,
  learnMoreUrl,
  className,
}: WorkspaceEmptyProps) {
  const { t } = useTranslation()

  const emptyStateConfigs: Record<WorkspaceEmptyProps['type'], EmptyStateConfig> = {
    sources: {
      icon: <CloudUpload size={48} strokeWidth={1.2} />,
      title: t('empty.uploadFirstMaterial'),
      description: t('empty.uploadMaterialDesc'),
      actionLabel: t('empty.uploadMaterial'),
      learnMore: true,
    },
    risk: {
      icon: <ShieldCheck size={48} strokeWidth={1.2} />,
      title: t('empty.noPendingRisks'),
      description: t('empty.noPendingRisksDesc'),
      actionLabel: t('empty.startAnalysis'),
      learnMore: true,
    },
    context: {
      icon: <Info size={48} strokeWidth={1.2} />,
      title: t('empty.selectRisk'),
      description: t('empty.selectRiskDesc'),
    },
    result: {
      icon: <Sparkles size={48} strokeWidth={1.2} />,
      title: t('empty.createFirstAnalysis'),
      description: t('empty.createFirstAnalysisDesc'),
      actionLabel: t('empty.newAnalysis'),
      learnMore: true,
    },
  }

  const config = emptyStateConfigs[type]

  const displayTitle = title ?? config.title
  const displayDescription = description ?? config.description
  const displayActionLabel = actionLabel ?? config.actionLabel
  const showLearnMore = config.learnMore !== false

  return (
    <div
      className={cn(
        'h-full flex flex-col items-center justify-center text-center px-6 w-full',
        className,
      )}
    >
      <div className="w-16 h-16 mb-5 rounded-2xl bg-paper-dark border border-rule/60 flex items-center justify-center text-ink-muted transition-all duration-300 group-hover:scale-105">
        {config.icon}
      </div>

      <h3 className="text-lg font-display font-medium text-ink tracking-tight mb-2">
        {displayTitle}
      </h3>

      <p className="text-sm text-ink-muted leading-relaxed max-w-xs mb-6">{displayDescription}</p>

      {displayActionLabel && onAction && (
        <MagneticButton
          variant="primary"
          size="md"
          onClick={onAction}
          className="rounded-full px-5 py-2.5 h-auto hover:bg-accent hover:shadow-lg hover:shadow-accent/20 active:scale-[0.98]"
          strength={0.4}
          radius={120}
        >
          {displayActionLabel}
        </MagneticButton>
      )}

      {showLearnMore && learnMoreUrl && (
        <a
          href={learnMoreUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 text-sm text-accent underline underline-offset-4 hover:opacity-80 transition-opacity duration-200"
        >
          {t('empty.learnMore')}
        </a>
      )}
    </div>
  )
}
