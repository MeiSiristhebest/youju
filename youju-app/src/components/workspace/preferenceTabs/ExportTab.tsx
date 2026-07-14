import { Download, FileText, Settings, Shield } from 'lucide-react'
import { cn } from '../../../lib/utils'
import { useUIPreferenceStore } from '../../../stores/useUIPreferenceStore'
import type { PrintStyle } from '../../print/PrintReport'
import { SectionTitle, SelectRow, SettingRow, Toggle } from './shared'

// 报告风格选项，与 PrintStyle 保持一致
const REPORT_STYLE_OPTIONS: { value: PrintStyle; label: string; desc: string }[] = [
  { value: 'standard', label: '标准报告', desc: '分章节详细展示' },
  { value: 'equity', label: '研报风格', desc: '专业正式研报风' },
  { value: 'one-pager', label: '一页摘要', desc: '紧凑单页概览' },
  { value: 'brief', label: '简报备忘', desc: '备忘录式简报' },
  { value: 'letter', label: '正式函件', desc: '信件格式发送' },
  { value: 'list', label: '风险清单', desc: '表格化风险列表' },
]

export function ExportTab() {
  const { exportSettings, updateExportSettings } = useUIPreferenceStore()

  return (
    <div className="space-y-8">
      <SectionTitle
        icon={<Download size={16} strokeWidth={1.5} />}
        title="导出格式"
        description="配置报告的默认导出格式"
      />
      <div className="bg-paper-dark/30 border border-rule/50 rounded-lg divide-y divide-rule/40 px-4 py-3">
        <SelectRow
          label="默认导出格式"
          description="导出报告时默认使用的文件格式"
          value={exportSettings.defaultFormat}
          options={[
            { value: 'pdf', label: 'PDF 文档' },
            { value: 'docx', label: 'Word 文档' },
            { value: 'markdown', label: 'Markdown' },
            { value: 'html', label: 'HTML 网页' },
          ]}
          onChange={(v) => updateExportSettings({ defaultFormat: v as any })}
        />
      </div>

      <SectionTitle
        icon={<FileText size={16} strokeWidth={1.5} />}
        title="报告风格"
        description="选择导出报告的内容呈现方式"
      />
      <div className="bg-paper-dark/30 border border-rule/50 rounded-lg p-4">
        <div className="grid grid-cols-2 gap-2">
          {REPORT_STYLE_OPTIONS.map((style) => (
            <button
              key={style.value}
              type="button"
              onClick={() => updateExportSettings({ reportStyle: style.value })}
              className={cn(
                'p-3 rounded-lg text-left cursor-pointer transition-all duration-200 border',
                exportSettings.reportStyle === style.value
                  ? 'bg-accent/10 text-ink border-accent/50'
                  : 'bg-paper text-ink-muted border-rule/60 hover:bg-paper-dark hover:text-ink',
              )}
            >
              <p className="text-xs font-medium">{style.label}</p>
              <p className="text-[10px] text-ink-faint mt-0.5">{style.desc}</p>
            </button>
          ))}
        </div>
      </div>

      <SectionTitle
        icon={<Settings size={16} strokeWidth={1.5} />}
        title="报告内容"
        description="配置导出报告包含的内容"
      />
      <div className="bg-paper-dark/30 border border-rule/50 rounded-lg divide-y divide-rule/40 px-4 py-3">
        <SettingRow
          label="包含证据来源"
          description="在报告中包含风险对应的证据原文"
          action={
            <Toggle
              checked={exportSettings.includeEvidence}
              onChange={(v) => updateExportSettings({ includeEvidence: v })}
            />
          }
        />
        <SettingRow
          label="包含图表"
          description="在报告中包含可视化图表"
          action={
            <Toggle
              checked={exportSettings.includeCharts}
              onChange={(v) => updateExportSettings({ includeCharts: v })}
            />
          }
        />
      </div>

      <SectionTitle
        icon={<Shield size={16} strokeWidth={1.5} />}
        title="水印设置"
        description="为导出的报告添加水印"
      />
      <div className="bg-paper-dark/30 border border-rule/50 rounded-lg p-4 space-y-4">
        <SettingRow
          label="启用水印"
          description="在导出的报告中添加水印"
          action={
            <Toggle
              checked={exportSettings.watermarkEnabled}
              onChange={(v) => updateExportSettings({ watermarkEnabled: v })}
            />
          }
        />
        {exportSettings.watermarkEnabled && (
          <div>
            <label className="text-xs text-ink font-medium block mb-2">水印文字</label>
            <input
              type="text"
              value={exportSettings.watermarkText}
              onChange={(e) => updateExportSettings({ watermarkText: e.target.value })}
              placeholder="输入水印文字"
              className="w-full px-3 py-2 bg-paper border border-rule/60 rounded-md text-xs text-ink placeholder:text-ink-faint focus:outline-none focus:border-accent/50"
            />
          </div>
        )}
      </div>
    </div>
  )
}
