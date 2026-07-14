import { ChevronRight, Lock, Shield, Trash2 } from 'lucide-react'
import { useEffect } from 'react'
import { preferenceApi } from '../../../services/preferenceApi'
import { useUIPreferenceStore } from '../../../stores/useUIPreferenceStore'
import { useToast } from '../../common/Toast'
import { SectionTitle, SelectRow, SettingRow, Toggle } from './shared'

export function PrivacyTab() {
  const { privacySecuritySettings, updatePrivacySecuritySettings } = useUIPreferenceStore()
  const { showToast } = useToast()

  // 组件挂载时从后端加载设置
  useEffect(() => {
    preferenceApi
      .getPrivacySettings()
      .then((settings) => {
        updatePrivacySecuritySettings({
          autoDeleteEnabled: settings.autoDeleteHistory,
          autoDeleteDays: settings.retentionDays,
          analyticsOptOut: !settings.allowAnalytics,
          shareUsageData: settings.shareUsageData,
        })
      })
      .catch(() => {
        // 加载失败时使用本地默认值
      })
  }, [])

  // 更新设置时同步到后端
  const handlePrivacyUpdate = async (updates: Partial<typeof privacySecuritySettings>) => {
    updatePrivacySecuritySettings(updates)

    // 映射到后端字段名
    const backendUpdates: Record<string, boolean | number> = {}
    if ('autoDeleteEnabled' in updates)
      backendUpdates.autoDeleteHistory = updates.autoDeleteEnabled!
    if ('autoDeleteDays' in updates) backendUpdates.retentionDays = updates.autoDeleteDays!
    if ('analyticsOptOut' in updates) backendUpdates.allowAnalytics = !updates.analyticsOptOut!
    if ('shareUsageData' in updates) backendUpdates.shareUsageData = updates.shareUsageData!

    try {
      await preferenceApi.setPrivacySettings(backendUpdates)
    } catch {
      showToast('保存设置失败，请重试', 'error')
    }
  }

  return (
    <div className="space-y-8">
      <SectionTitle
        icon={<Lock size={16} strokeWidth={1.5} />}
        title="数据保留"
        description="配置你的数据保留策略"
      />
      <div className="bg-paper-dark/30 border border-rule/50 rounded-lg divide-y divide-rule/40 px-4 py-3">
        <SelectRow
          label="数据保留期限"
          description="分析数据在服务器上保留的时间"
          value={privacySecuritySettings.dataRetention}
          options={[
            { value: '30days', label: '30 天' },
            { value: '90days', label: '90 天' },
            { value: '180days', label: '180 天' },
            { value: '1year', label: '1 年' },
            { value: 'forever', label: '永久保留' },
          ]}
          onChange={(v) => updatePrivacySecuritySettings({ dataRetention: v as any })}
        />
      </div>

      <SectionTitle
        icon={<Trash2 size={16} strokeWidth={1.5} />}
        title="自动删除"
        description="配置数据自动删除规则"
      />
      <div className="bg-paper-dark/30 border border-rule/50 rounded-lg p-4 space-y-4">
        <SettingRow
          label="启用自动删除"
          description="超过保留期限的分析数据将被自动删除"
          action={
            <Toggle
              checked={privacySecuritySettings.autoDeleteEnabled}
              onChange={(v) => handlePrivacyUpdate({ autoDeleteEnabled: v })}
            />
          }
        />
        {privacySecuritySettings.autoDeleteEnabled && (
          <div>
            <label className="text-xs text-ink font-medium block mb-2">
              自动删除天数：{privacySecuritySettings.autoDeleteDays} 天
            </label>
            <input
              type="range"
              min={30}
              max={365}
              step={30}
              value={privacySecuritySettings.autoDeleteDays}
              onChange={(e) => handlePrivacyUpdate({ autoDeleteDays: Number(e.target.value) })}
              className="w-full h-1.5 bg-paper-dark rounded-full appearance-none cursor-pointer accent-accent"
            />
          </div>
        )}
      </div>

      <SectionTitle
        icon={<Shield size={16} strokeWidth={1.5} />}
        title="安全与隐私"
        description="保护你的数据安全"
      />
      <div className="bg-paper-dark/30 border border-rule/50 rounded-lg divide-y divide-rule/40 px-4 py-3">
        <SettingRow
          label="本地加密存储"
          description="使用本地加密存储敏感数据（实验性功能）"
          action={
            <Toggle
              checked={privacySecuritySettings.localEncryption}
              onChange={(v) => updatePrivacySecuritySettings({ localEncryption: v })}
            />
          }
        />
        <SettingRow
          label="退出使用统计"
          description="不收集匿名使用数据以改进产品"
          action={
            <Toggle
              checked={privacySecuritySettings.analyticsOptOut}
              onChange={(v) => handlePrivacyUpdate({ analyticsOptOut: v })}
            />
          }
        />
      </div>

      <div className="bg-accent-bg/20 border border-accent-faint/40 rounded-lg p-4">
        <h4 className="text-xs font-semibold text-accent mb-2">API 密钥管理</h4>
        <p className="text-[11px] text-ink-faint mb-3">
          管理你的 API 密钥，用于调用分析服务和 Webhook 集成
        </p>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 text-[11px] font-medium text-accent hover:text-accent-tertiary transition-colors"
        >
          打开 API 设置
          <ChevronRight size={12} strokeWidth={1.5} />
        </button>
      </div>
    </div>
  )
}
