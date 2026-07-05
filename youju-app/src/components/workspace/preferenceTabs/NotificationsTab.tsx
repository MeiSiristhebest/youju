import { Bell, Mail } from 'lucide-react'
import { useUIPreferenceStore } from '../../../stores/useUIPreferenceStore'
import { SectionTitle, SettingRow, Toggle } from './shared'

export function NotificationsTab() {
  const { notificationSettings, updateNotificationSettings } = useUIPreferenceStore()

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
              onChange={(v) => updateNotificationSettings({ emailNotification: v })}
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
              onChange={(v) => updateNotificationSettings({ analysisCompleteReminder: v })}
            />
          }
        />
        <SettingRow
          label="每周摘要"
          description="每周发送一次分析统计摘要"
          action={
            <Toggle
              checked={notificationSettings.weeklyDigest}
              onChange={(v) => updateNotificationSettings({ weeklyDigest: v })}
            />
          }
        />
      </div>
    </div>
  )
}
