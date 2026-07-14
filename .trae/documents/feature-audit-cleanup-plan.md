# 功能审计与清理计划

## 概述

从AI产品经理角度审视"有据"项目，清理重复/占位UI，把真实功能接上正确入口。

## 当前状态分析

### 问题1: WorkspaceTabs 占位功能

| 功能 | 当前状态 | 真实实现位置 |
|------|----------|--------------|
| +号新建分析 | `showToast('新建分析功能开发中')` | `useWorkspaceHandlers.handleNewAnalysis()` |
| 右键导出报告 | `showToast('导出功能开发中')` | `ExportMenu` 组件（WorkspaceTopBar 已接） |
| 右键重新加载 | `showToast('重新加载功能开发中')` | 需实现：重新分析当前任务 |

### 问题2: AnalysisTab 重复设置

`analysisSettings.defaultModel` 设置项只写 localStorage，后端不读。用户改了没效果。真实模型配置在 `ModelSettingsContent`。

### 问题3: ExportTab 死设置

`exportSettings` 的所有字段（`defaultFormat`/`reportStyle`/`watermarkText`/`includeEvidence`/`includeCharts`）都不被 `ExportMenu` 读取。

### 问题4: 通知/隐私设置前端孤立

`NotificationsTab` 和 `PrivacyTab` 的设置只存在前端，后端 `PreferenceService` 不存储也不读取。

### 问题5: 纯展示面板无提示

`BillingContent`/`ApiSettingsContent`/`TeamPanelContent` 是纯UI预览，但用户不知道是"即将上线"。

---

## 用户决策

1. **WorkspaceTabs右键功能** → B: 接上真实实现
2. **AnalysisTab默认分析模型** → A: 删除
3. **ExportTab设置** → B: 接到ExportMenu
4. **通知/隐私设置** → C: 后端改造
5. **纯展示面板** → A: 加"即将上线"标签

---

## 实施步骤

### Phase 1: WorkspaceTabs 右键功能接通

**文件**: `youju-app/src/components/workspace/WorkspaceTabs.tsx`

#### 1.1 +号新建分析

```tsx
// 修改 handleNewTab 函数
const handleNewTab = useCallback(() => {
  // 调用真实的 handleNewAnalysis
  // 需要从 useWorkspaceHandlers 获取或直接调用 store
  const { setSources, setIsDemo, setCurrentScenario, setCurrentTask, resetAnalysis } = useSourceStore.getState()
  resetAnalysis()
  setSources([])
  setIsDemo(false)
  setCurrentScenario(null)
  setCurrentTask(null)
  useWorkspaceTabsStore.getState().openTab('custom', '未命名分析')
  taskApi.createTask({ title: '未命名分析', scenarioType: 'custom', sourceIds: [] })
    .then(task => {
      useSourceStore.getState().setCurrentTask({ id: task.id, title: task.title })
    })
    .catch(console.error)
}, [])
```

#### 1.2 导出报告

```tsx
// 修改 handleExportReport 函数
const handleExportReport = useCallback((tab: WorkspaceTab) => {
  if (tab.status !== 'completed') {
    showToast('请先完成分析后再导出', 'error')
    return
  }
  // 触发导出：通过 store 或 event 通知 WorkspaceTopBar 打开 ExportMenu
  // 方案：在 useSourceStore 添加 showExportMenu 状态，或用 window.dispatchEvent
  window.dispatchEvent(new CustomEvent('youju:open-export-menu'))
  setContextMenu(prev => ({ ...prev, open: false }))
}, [showToast])
```

**文件**: `youju-app/src/components/workspace/WorkspaceTopBar.tsx`

```tsx
// 监听导出事件
useEffect(() => {
  const handler = () => setIsExportOpen(true)
  window.addEventListener('youju:open-export-menu', handler)
  return () => window.removeEventListener('youju:open-export-menu', handler)
}, [])
```

#### 1.3 重新加载

```tsx
// 修改 handleReload 函数
const handleReload = useCallback((tab: WorkspaceTab) => {
  // 重新分析当前任务
  const { currentTaskId } = useSourceStore.getState()
  if (currentTaskId === tab.id) {
    // 触发重新分析
    window.dispatchEvent(new CustomEvent('youju:reanalyze'))
  }
  setContextMenu(prev => ({ ...prev, open: false }))
}, [])
```

---

### Phase 2: 删除 AnalysisTab 的"默认分析模型"

**文件**: `youju-app/src/components/workspace/preferenceTabs/AnalysisTab.tsx`

删除以下代码块（第39-47行）：

```tsx
// 删除这一整块
<SelectRow
  label="默认分析模型"
  description="选择默认使用的 AI 模型进行分析"
  value={analysisSettings.defaultModel}
  options={options}
  onChange={(v) => updateAnalysisSettings({ defaultModel: v })}
/>
```

**文件**: `youju-app/src/stores/useUIPreferenceStore.ts`

保留 `defaultModel` 字段定义（不影响其他），但不再有UI修改它。

---

### Phase 3: ExportTab 设置接到 ExportMenu

#### 3.1 ExportMenu 读取用户设置

**文件**: `youju-app/src/components/common/ExportMenu.tsx`

```tsx
// 在组件顶部读取 exportSettings
import { useUIPreferenceStore } from '@/stores/useUIPreferenceStore'

export function ExportMenu({ result, sources, title, ... }: ExportMenuProps) {
  const { exportSettings } = useUIPreferenceStore()
  
  // 默认打印风格用用户设置
  const effectivePrintStyle = printStyle || (exportSettings.reportStyle as PrintStyle) || 'standard'
  
  // 导出格式用用户设置
  const effectiveFormat = exportSettings.defaultFormat || 'pdf'
  
  // 水印设置
  const watermarkEnabled = exportSettings.watermarkEnabled
  const watermarkText = exportSettings.watermarkText
  
  // 内容包含设置
  const includeEvidence = exportSettings.includeEvidence
  const includeCharts = exportSettings.includeCharts
  
  // ... 在导出逻辑中使用这些值
}
```

#### 3.2 打印预览应用水印

**文件**: `youju-app/src/components/print/PrintReport.tsx` 或相关组件

```tsx
// 在打印内容顶部添加水印层（如果启用）
{watermarkEnabled && (
  <div className="fixed inset-0 pointer-events-none opacity-10 text-ink text-sm rotate-[-30deg] select-none z-50" style={{
    backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 100px, rgba(0,0,0,0.03) 100px, rgba(0,0,0,0.03) 200px)`
  }}>
    {/* 水印文字 */}
  </div>
)}
```

---

### Phase 4: 后端改造通知/隐私设置

#### 4.1 扩展 PreferenceService

**文件**: `youju-server/src/domain/services/preferenceService.ts`

```typescript
// 新增方法
async getUserNotificationSettings(userId: number | null, sessionId: string | null): Promise<NotificationSettings> {
  return this.getJsonPreference(userId, sessionId, 'notification_settings', DEFAULT_NOTIFICATION)
}

async setUserNotificationSettings(userId: number | null, sessionId: string | null, settings: Partial<NotificationSettings>): Promise<NotificationSettings> {
  const current = await this.getUserNotificationSettings(userId, sessionId)
  const updated = { ...current, ...settings }
  await this.setJsonPreference(userId, sessionId, 'notification_settings', updated)
  return updated
}

async getUserPrivacySettings(userId: number | null, sessionId: string | null): Promise<PrivacySettings> {
  return this.getJsonPreference(userId, sessionId, 'privacy_settings', DEFAULT_PRIVACY)
}

async setUserPrivacySettings(userId: number | null, sessionId: string | null, settings: Partial<PrivacySettings>): Promise<PrivacySettings> {
  const current = await this.getUserPrivacySettings(userId, sessionId)
  const updated = { ...current, ...settings }
  await this.setJsonPreference(userId, sessionId, 'privacy_settings', updated)
  return updated
}
```

#### 4.2 扩展 preferences 路由

**文件**: `youju-server/src/presentation/routes/preferences.ts`

```typescript
// 新增端点
router.get('/preferences/notifications', async (req, res) => {
  const { userId, sessionId } = await getUserIdAndSessionId(req)
  const settings = await getPreferenceService().getUserNotificationSettings(userId, sessionId)
  res.json({ code: 200, data: settings })
})

router.post('/preferences/notifications', async (req, res) => {
  const { userId, sessionId } = await getUserIdAndSessionId(req)
  const settings = await getPreferenceService().setUserNotificationSettings(userId, sessionId, req.body)
  res.json({ code: 200, data: settings })
})

router.get('/preferences/privacy', async (req, res) => {
  const { userId, sessionId } = await getUserIdAndSessionId(req)
  const settings = await getPreferenceService().getUserPrivacySettings(userId, sessionId)
  res.json({ code: 200, data: settings })
})

router.post('/preferences/privacy', async (req, res) => {
  const { userId, sessionId } = await getUserIdAndSessionId(req)
  const settings = await getPreferenceService().setUserPrivacySettings(userId, sessionId, req.body)
  res.json({ code: 200, data: settings })
})
```

#### 4.3 前端调用后端保存

**文件**: 新建 `youju-app/src/services/preferenceApi.ts`

```typescript
export const preferenceApi = {
  getNotificationSettings: () => apiClient.get('/api/preferences/notifications'),
  setNotificationSettings: (settings: Partial<NotificationSettings>) => 
    apiClient.post('/api/preferences/notifications', settings),
  getPrivacySettings: () => apiClient.get('/api/preferences/privacy'),
  setPrivacySettings: (settings: Partial<PrivacySettings>) => 
    apiClient.post('/api/preferences/privacy', settings),
}
```

**文件**: 修改 `NotificationsTab.tsx` 和 `PrivacyTab.tsx`

```tsx
// 在 onChange 时同步到后端
const handleNotificationChange = async (key: string, value: boolean) => {
  updateNotificationSettings({ [key]: value })
  try {
    await preferenceApi.setNotificationSettings({ [key]: value })
  } catch (e) {
    console.error('Failed to save notification settings:', e)
  }
}
```

---

### Phase 5: 纯展示面板加"即将上线"标签

#### 5.1 BillingContent

**文件**: `youju-app/src/components/workspace/BillingContent.tsx`

在头部标题下方添加：

```tsx
<div className="px-6 py-2 bg-accent-bg/30 border-b border-accent-faint/40">
  <p className="text-[11px] text-accent flex items-center gap-1.5">
    <Sparkles size={12} />
    即将上线 · 订阅功能正在开发中，当前为预览界面
  </p>
</div>
```

#### 5.2 ApiSettingsContent

**文件**: `youju-app/src/components/workspace/ApiSettingsContent.tsx`

在 `activeTab === 'api-keys'` 和 `'webhooks'` 区块顶部添加提示：

```tsx
<div className="px-3 py-2 bg-warning-bg/30 border-b border-warning/20">
  <p className="text-[10px] text-warning">
    ⚠️ 即将上线 · API Key 管理功能正在开发中，当前为预览界面
  </p>
</div>
```

#### 5.3 TeamPanelContent

**文件**: `youju-app/src/components/common/TeamPanelContent.tsx`

在标题下方添加：

```tsx
<div className="px-4 py-2 bg-accent-bg/30 border-b border-accent-faint/40">
  <p className="text-[11px] text-accent">
    即将上线 · 团队协作功能正在开发中，当前为预览界面
  </p>
</div>
```

---

## 验证步骤

### Phase 1 验证
1. 点击 WorkspaceTabs 的 `+` 号 → 应创建新 tab 和新任务
2. 右键已完成的 tab → 点击"导出报告" → 应打开 ExportMenu
3. 右键任意 tab → 点击"重新加载" → 应触发重新分析

### Phase 2 验证
1. 打开偏好设置 → 分析 Tab → 应看不到"默认分析模型"选项
2. "配置模型"里的设置应正常工作

### Phase 3 验证
1. 在 ExportTab 设置"报告风格"为"详细版"
2. 导出报告 → 应使用"详细版"风格
3. 启用水印 → 打印预览应显示水印

### Phase 4 验证
1. 修改通知设置 → 刷新页面 → 设置应保留
2. 检查后端数据库 → `user_preferences` 表应有 `notification_settings` 和 `privacy_settings` 记录

### Phase 5 验证
1. 打开计费面板 → 应看到"即将上线"提示
2. 打开 API 设置 → 应看到"即将上线"提示
3. 打开团队面板 → 应看到"即将上线"提示

---

## 假设与决策

1. **Phase 1** 使用 `window.dispatchEvent` 通信，因为 WorkspaceTabs 和 WorkspaceTopBar 是兄弟组件，没有直接的 props 传递路径。如需更优雅方案，可在 `useSourceStore` 中添加状态。

2. **Phase 3** 水印功能仅影响打印预览，不影响导出的 PDF/Word 内容（技术上复杂度较高）。

3. **Phase 4** 后端改造工作量最大，可拆分为独立 PR 先做 schema 和路由，再做前端集成。

4. **Phase 5** 提示文案使用中文，与界面一致。

---

## 文件变更清单

| 文件 | 操作 |
|------|------|
| `youju-app/src/components/workspace/WorkspaceTabs.tsx` | 修改 handleNewTab/handleExportReport/handleReload |
| `youju-app/src/components/workspace/WorkspaceTopBar.tsx` | 添加事件监听 |
| `youju-app/src/components/workspace/preferenceTabs/AnalysisTab.tsx` | 删除"默认分析模型" |
| `youju-app/src/components/common/ExportMenu.tsx` | 读取 exportSettings |
| `youju-app/src/components/print/PrintReport.tsx` | 应用水印 |
| `youju-server/src/domain/services/preferenceService.ts` | 新增通知/隐私设置方法 |
| `youju-server/src/presentation/routes/preferences.ts` | 新增端点 |
| `youju-server/src/presentation/validation/schemas.ts` | 新增验证 schema |
| `youju-app/src/services/preferenceApi.ts` | 新建文件 |
| `youju-app/src/components/workspace/preferenceTabs/NotificationsTab.tsx` | 调用后端 API |
| `youju-app/src/components/workspace/preferenceTabs/PrivacyTab.tsx` | 调用后端 API |
| `youju-app/src/components/workspace/BillingContent.tsx` | 添加提示 |
| `youju-app/src/components/workspace/ApiSettingsContent.tsx` | 添加提示 |
| `youju-app/src/components/common/TeamPanelContent.tsx` | 添加提示 |