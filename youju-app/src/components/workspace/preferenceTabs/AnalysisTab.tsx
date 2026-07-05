import { BarChart3, Brain, Settings } from 'lucide-react'
import { useUIPreferenceStore } from '../../../stores/useUIPreferenceStore'
import { SectionTitle, SelectRow, SettingRow, Slider, Toggle } from './shared'

export function AnalysisTab() {
  const { analysisSettings, updateAnalysisSettings } = useUIPreferenceStore()

  return (
    <div className="space-y-8">
      <SectionTitle
        icon={<Brain size={16} strokeWidth={1.5} />}
        title="AI 模型设置"
        description="配置分析使用的 AI 模型"
      />
      <div className="bg-paper-dark/30 border border-rule/50 rounded-lg divide-y divide-rule/40 px-4 py-3">
        <SelectRow
          label="默认分析模型"
          description="选择默认使用的 AI 模型进行分析"
          value={analysisSettings.defaultModel}
          options={[
            { value: 'gpt-4o', label: 'GPT-4o (推荐)' },
            { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
            { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' },
            { value: 'claude-sonnet', label: 'Claude Sonnet' },
            { value: 'claude-opus', label: 'Claude Opus' },
          ]}
          onChange={(v) => updateAnalysisSettings({ defaultModel: v })}
        />
      </div>

      <SectionTitle
        icon={<BarChart3 size={16} strokeWidth={1.5} />}
        title="分析参数"
        description="调整分析的灵敏度和准确度"
      />
      <div className="bg-paper-dark/30 border border-rule/50 rounded-lg p-4">
        <Slider
          label="置信度阈值"
          value={analysisSettings.confidenceThreshold}
          onChange={(v) => updateAnalysisSettings({ confidenceThreshold: v })}
          min={0}
          max={100}
          unit="%"
        />
        <p className="text-[10px] text-ink-faint">
          低于此阈值的风险将标记为&quot;待确认&quot;，建议设置在 60-80% 之间
        </p>
      </div>

      <SectionTitle
        icon={<Settings size={16} strokeWidth={1.5} />}
        title="分析行为"
        description="配置分析过程中的自动化行为"
      />
      <div className="bg-paper-dark/30 border border-rule/50 rounded-lg divide-y divide-rule/40 px-4 py-3">
        <SettingRow
          label="自动保存分析结果"
          description="分析完成后自动保存到历史记录"
          action={
            <Toggle
              checked={analysisSettings.autoSave}
              onChange={(v) => updateAnalysisSettings({ autoSave: v })}
            />
          }
        />
        <SettingRow
          label="启用增量分析"
          description="新增材料时基于上一次结果进行增量分析"
          action={
            <Toggle
              checked={analysisSettings.incrementalAnalysis}
              onChange={(v) => updateAnalysisSettings({ incrementalAnalysis: v })}
            />
          }
        />
        <SettingRow
          label="自动结果校验"
          description="分析完成后自动进行自我验证和修正"
          action={
            <Toggle
              checked={analysisSettings.autoValidate}
              onChange={(v) => updateAnalysisSettings({ autoValidate: v })}
            />
          }
        />
      </div>
    </div>
  )
}
