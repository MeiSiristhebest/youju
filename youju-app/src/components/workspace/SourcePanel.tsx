import { ChevronLeft, Plus } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from '../../i18n'
import { useSourceStore } from '../../stores/useSourceStore'
import type { ScenarioType, Source } from '../../types'
import { SourceList } from './SourceList'
import { SourcePanelSkeleton } from './SourcePanelSkeleton'
import { SourcePreview } from './SourcePreview'
import { SourceScenarioSection } from './SourceScenarioSection'
import { WorkspaceEmpty } from './WorkspaceEmpty'

interface SourcePanelProps {
  sources: Source[]
  selectedSource: string | null
  onSelectSource: (id: string | null) => void
  onAddSource: () => void
  currentScenario: ScenarioType | null
  onDeleteSource?: (id: string) => void
  onReparseSource?: (id: string) => void
  onEditSource?: (id: string) => void
  onOpenSourceDetail?: (source: Source) => void
  onCollapse?: () => void
  isLoading?: boolean
}

export function SourcePanel({
  sources,
  selectedSource,
  onSelectSource,
  onAddSource,
  currentScenario,
  onDeleteSource,
  onReparseSource,
  onOpenSourceDetail,
  onCollapse,
  isLoading = false,
}: SourcePanelProps) {
  const { t } = useTranslation()
  const selectedSourceData = sources.find((s) => s.id === selectedSource)
  const { editingSourceId, setEditingSourceId, updateSource } = useSourceStore()
  const isCustomScenario = currentScenario === 'custom'
  const [editingContent, setEditingContent] = useState('')

  const handleStartEdit = (source: Source) => {
    setEditingSourceId(source.id)
    setEditingContent(source.content)
    onSelectSource(source.id)
  }

  const handleSaveEdit = (sourceId: string) => {
    updateSource(sourceId, { content: editingContent })
    setEditingSourceId(null)
    setEditingContent('')
  }

  const handleDelete = (sourceId: string) => {
    if (onDeleteSource) {
      onDeleteSource(sourceId)
    }
  }

  const handleReparse = (sourceId: string) => {
    if (onReparseSource) {
      onReparseSource(sourceId)
    }
  }

  return isLoading ? (
    <SourcePanelSkeleton />
  ) : (
    <div
      id="tour-source-panel"
      className="w-full bg-paper flex flex-col shrink-0 h-full overflow-hidden animate-[fadeIn_0.2s_ease-out]"
    >
      <div className="px-3.5 py-2.5 border-b border-rule flex justify-between items-center">
        <div className="flex items-center gap-2">
          <span className="text-base font-medium text-ink font-display tracking-tight">
            {t('source.materials')}
          </span>
          <span className="text-[10px] text-ink-faint bg-paper-dark px-1.5 py-0.5 rounded-full font-mono">
            {sources.length}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {onCollapse && (
            <button
              type="button"
              className="w-6 h-6 rounded-md flex items-center justify-center text-xs cursor-pointer border border-transparent bg-transparent text-ink-faint hover:bg-paper-dark hover:text-ink-muted transition-colors duration-200"
              onClick={onCollapse}
              aria-label="折叠面板"
              title="折叠面板"
            >
              <ChevronLeft size={14} strokeWidth={1.5} />
            </button>
          )}
          <button
            id="tour-add-source-btn"
            type="button"
            className="w-6 h-6 rounded-md flex items-center justify-center text-xs cursor-pointer border border-transparent bg-transparent text-ink-faint hover:bg-paper-dark hover:text-ink-muted transition-colors duration-200"
            onClick={onAddSource}
            aria-label={t('source.addMaterial')}
            title={t('source.addMaterial')}
          >
            <Plus size={14} strokeWidth={1.5} />
          </button>
        </div>
      </div>

      {isCustomScenario && <SourceScenarioSection />}

      {sources.length === 0 ? (
        <div className="flex-1 min-h-0 overflow-y-auto">
          <WorkspaceEmpty
            type="sources"
            onAction={onAddSource}
            actionLabel={t('source.addMaterial')}
          />
        </div>
      ) : (
        <SourceList
          sources={sources}
          selectedSource={selectedSource}
          onSelectSource={onSelectSource}
          onDeleteSource={handleDelete}
          onReparseSource={handleReparse}
          onEditSource={handleStartEdit}
        />
      )}

      {selectedSourceData && (
        <SourcePreview
          source={selectedSourceData}
          onClose={() => onSelectSource(null)}
          onOpenDetail={
            onOpenSourceDetail ? () => onOpenSourceDetail(selectedSourceData) : undefined
          }
          editingSourceId={editingSourceId}
          editingContent={editingContent}
          onStartEdit={() => handleStartEdit(selectedSourceData)}
          onSaveEdit={() => handleSaveEdit(selectedSourceData.id)}
          onEditingContentChange={setEditingContent}
        />
      )}
    </div>
  )
}
