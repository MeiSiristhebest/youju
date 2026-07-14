import { Bell, Mail } from 'lucide-react'
import { useEffect } from 'react'
import { preferenceApi } from '../../../services/preferenceApi'
import { useUIPreferenceStore } from '../../../stores/useUIPreferenceStore'
import { useToast } from '../../common/Toast'
import { SectionTitle, SettingRow, Toggle } from './shared'

export function NotificationsTab() {
  const { notificationSettings, updateNotificationSettings } = useUIPreferenceStore()
  const { showToast } = useToast()

  // 组件挂载时从后端加载设置
  useEffect(() => {
    preferenceApi
      .getNotificationSettings()
      .then((settings) => {
        updateNotificationSettings({
          emailNotification: settings.emailNotifications,
          analysisCompleteReminder: settings.analysisComplete,
          weeklyDigest: settings.weeklyDigest,
          productUpdates: settings.productUpdates,
        })
      })
      .catch(() => {
        // 加载失败时使用本地默认值
      })
  }, [])

  // 更新设置时同步到后端
  const handleUpdate = async (updates: Partial<typeof notificationSettings>) => {
    updateNotificationSettings(updates)

    // 映射到后端字段名
    const backendUpdates: Record<string, boolean> = {}
    if ('emailNotification' in updates)
      backendUpdates.emailNotifications = updates.emailNotification!
    if ('analysisCompleteReminder' in updates)
      backendUpdates.analysisComplete = updates.analysisCompleteReminder!
    if ('weeklyDigest' in updates) backendUpdates.weeklyDigest = updates.weeklyDigest!
    if ('productUpdates' in updates) backendUpdates.productUpdates = updates.productUpdates!

    try {
      await preferenceApi.setNotificationSettings(backendUpdates)
    } catch {
      showToast('保存设置失败，请重试', 'error')
    }
  }

  return (
    <div className="space-y-8">
      <SectionTitle
        icon={<Bell size={16} strokeWidth={1.5} />}
        title="通知方式"
        description="选择你希望接收通知的方式"
      />
      <div className="bg-paper-dark/30 border border-rule/50 rounded-lg divide-y divide-rule/40 px-4 py-3">
        <SettingRow
          label="邮件通知"
          description="接收重要更新和分析结果的邮件通知"
          action={
            <Toggle
              checked={notificationSettings.emailNotification}
              onChange={(v) => handleUpdate({ emailNotification: v })}
            />
          }
        />
        <SettingRow
          label="桌面通知"
          description="在浏览器中显示桌面通知（需授权）"
          action={
            <Toggle
              checked={notificationSettings.desktopNotification}
              onChange={(v) => updateNotificationSettings({ desktopNotification: v })}
            />
          }
        />
        <SettingRow
          label="通知声音"
          description="收到通知时播放提示音"
          action={
            <Toggle
              checked={notificationSettings.soundEnabled}
              onChange={(v) => updateNotificationSettings({ soundEnabled: v })}
            />
          }
        />
      </div>

      <SectionTitle
        icon={<Mail size={16} strokeWidth={1.5} />}
        title="通知内容"
        description="选择你希望接收哪些类型的通知"
      />
      <div className="bg-paper-dark/30 border border-rule/50 rounded-lg divide-y divide-rule/40 px-4 py-3">
        <SettingRow
          label="分析完成提醒"
          description="分析任务完成时立即通知"
          action={
            <Toggle
              checked={notificationSettings.analysisCompleteReminder}
              onChange={(v) => handleUpdate({ analysisCompleteReminder: v })}
            />
          }
        />
        <SettingRow
          label="每周摘要"
          description="每周发送一次分析统计摘要"
          action={
            <Toggle
              checked={notificationSettings.weeklyDigest}
              onChange={(v) => handleUpdate({ weeklyDigest: v })}
            />
          }
        />
        <SettingRow
          label="产品更新"
          description="接收新功能发布和重要更新通知"
          action={
            <Toggle
              checked={notificationSettings.productUpdates ?? true}
              onChange={(v) => handleUpdate({ productUpdates: v })}
            />
          }
        />
      </div>
    </div>
  )
}
