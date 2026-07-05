# Tasks

> 对标优先级从上到下。P0 = 必须（架构债 + 核心体验），P1 = 重要（差异化能力），P2 = 锦上添花。每个任务可独立交付用户可见价值。

## P0 — 架构债清理（前置所有功能）

- [x] Task 1: 移除废弃的 AnimateIn 组件，统一用 GSAP
  - [x] SubTask 1.1: 删除 `src/components/ui/AnimateIn.tsx` 及测试文件
  - [x] SubTask 1.2: grep 全局确认无残留引用
  - [x] SubTask 1.3: 验证工作台无引用断点

- [x] Task 2: 拆分 WorkspacePage.tsx god component（1347 行 → 5 个子模块，单文件 ≤ 400 行）
  - [x] SubTask 2.1: 抽出 `WorkspaceLayout.tsx`（布局壳：sidebar + topbar + tab 栏 + 三栏 + modal 容器）
  - [x] SubTask 2.2: 抽出 `useWorkspaceHandlers.ts` hook（事件处理：loadScenario / deleteSource / handleRiskFeedback / loadSysStats / toggleCheck / showDraft 等）
  - [x] SubTask 2.3: 抽出 `WorkspaceModals.tsx`（聚合所有 modal 渲染）
  - [x] SubTask 2.4: 抽出 `WorkspaceEmpty.tsx`（统一空状态组件）
  - [x] SubTask 2.5: 抽出 `WorkspaceTabs.tsx`（任务 tab 栏，依赖 Task 14 的 store）
  - [x] SubTask 2.6: 清理 11 处下划线前缀未使用变量（`_loadScenario` 等）
  - [x] SubTask 2.7: `notificationCount={3}` 硬编码改为 `useNotificationStore` 读取（不存在则保留+TODO）

- [x] Task 3: 移除 fetch 直调，统一走 React Query hook
  - [x] SubTask 3.1: `WorkspacePage.tsx` 第 740-761、775-779、790-794 行 fetch 调用迁移到 `useAnalysis` / `useSources` / `useTasks`
  - [x] SubTask 3.2: 添加错误 toast 反馈（不要 `console.error` 静默）
  - [x] SubTask 3.3: 验证 React Query 缓存失效策略正确

- [x] Task 4: 启用 store persist 中间件（解决刷新即丢失）
  - [x] SubTask 4.1: `useSourceStore` 启用 persist + partialize（持久化 sources / selectedSourceId / scenario）
  - [x] SubTask 4.2: `useTaskStore` 启用 persist + partialize（持久化 tasks / currentTaskId / 最近使用排序）
  - [x] SubTask 4.3: `useAnalysisStore` 风险工作流状态（statuses/notes）从手动 localStorage 迁移到 persist
  - [x] SubTask 4.4: 验证多 tab 同步行为（zustand persist 的 storage event 同步）

## P0 — 核心交互体验

- [x] Task 5: 将 GlobalSearch 升级为命令面板（对标 Notion Cmd+K + Raycast 扩展）
  - [x] SubTask 5.1: 安装 shadcn `command` 组件（基于 cmdk）
  - [x] SubTask 5.2: 扩展命令注册（分组：跳转 / 操作 / AI / 最近）
  - [x] SubTask 5.3: 模糊匹配 + 拼音首字母匹配（如"fx"匹配"风险"）
  - [x] SubTask 5.4: 最近 5 条命令记忆（localStorage: `youju_recent_commands`）
  - [x] SubTask 5.5: `Ctrl+K` 全局唤起，子菜单支持（→ 展开）
  - [x] SubTask 5.6: 屏幕阅读器支持（`role="dialog"` + `aria-modal`）

- [x] Task 6: 扩展键盘快捷键（对标 Figma 键盘优先 + Linear 自定义）
  - [x] SubTask 6.1: `1-7` 全局切换 ResultPanel tab
  - [x] SubTask 6.2: `[` / `]` 折叠/展开左/右面板
  - [x] SubTask 6.3: `Ctrl+B` 切换 sidebar
  - [x] SubTask 6.4: `Ctrl+K` / `Ctrl+Shift+P` 唤起命令面板
  - [x] SubTask 6.5: `Ctrl+T` 唤起任务切换器（依赖 Task 15）
  - [x] SubTask 6.6: `G`+`S` / `G`+`R` 双键跳转（材料 / 风险）
  - [x] SubTask 6.7: `E` 导出 / `S` 保存
  - [x] SubTask 6.8: 快捷键提示气泡（hover 显示，shadcn Tooltip）
  - [x] SubTask 6.9: `KeyboardShortcutsModal` 文档更新 + 快捷键自定义持久化

- [x] Task 7: 为四大面板添加骨架屏（对标 Vercel + Figma）
  - [x] SubTask 7.1: 安装 shadcn `skeleton` 组件
  - [x] SubTask 7.2: SourcePanel 骨架（3-5 行材料占位）
  - [x] SubTask 7.3: RiskWorkflowPanel 骨架（3 行风险占位）
  - [x] SubTask 7.4: ResultPanel 骨架（tab 占位 + 内容占位）
  - [x] SubTask 7.5: ContextPanel 骨架（风险详情占位）
  - [x] SubTask 7.6: 骨架淡出 + 真实内容淡入过渡

- [x] Task 8: 统一空状态组件 WorkspaceEmpty（对标 Notion 优雅空状态 + Stripe 微交互）
  - [x] SubTask 8.1: SourcePanel 空状态（图标 + "上传你的第一份材料" + CTA + 了解更多）
  - [x] SubTask 8.2: RiskWorkflowPanel 空状态（"暂无待处理风险" + "运行分析"按钮）
  - [x] SubTask 8.3: ContextPanel 空状态（"选择左侧风险查看详情"）
  - [x] SubTask 8.4: ResultPanel 空状态（"创建你的第一次分析" + 场景选择入口）
  - [x] SubTask 8.5: CTA 按钮 hover 发光效果（accent 色 box-shadow）

- [x] Task 9: 任务状态徽章与错误可观测（对标 Vercel 部署状态）
  - [x] SubTask 9.1: WorkspaceTopBar 右侧增加任务状态徽章（分析中/已完成/失败/已取消）
  - [x] SubTask 9.2: 失败时点击徽章展开错误详情面板（错误信息 + 重试按钮）
  - [x] SubTask 9.3: 错误同时写入分析日志（API 调用）

- [x] Task 10: 危险操作撤销 toast（对标 Superhuman 瞬时操作）
  - [x] SubTask 10.1: 实现通用 `useUndoableAction` hook（执行 + 5 秒撤销窗口）
  - [x] SubTask 10.2: 删除材料操作改为撤销 toast
  - [x] SubTask 10.3: 取消分析操作改为撤销 toast
  - [x] SubTask 10.4: 关闭任务 tab 操作改为撤销 toast（待 Task 15 后接入）
  - [x] SubTask 10.5: 移除对应的 `window.confirm` / 自定义确认弹窗

## P1 — 工作台入场动效与视觉一致性

- [x] Task 11: 工作台 GSAP 入场动效（对标 Linear 无缝过渡）
  - [x] SubTask 11.1: `WorkspaceLayout.tsx` 用 `useGSAP` 编排 sidebar → topbar → 三栏 stagger 入场
  - [x] SubTask 11.2: 列表项 reveal 动效（SourcePanel / RiskWorkflowPanel）
  - [x] SubTask 11.3: 模态框 spring 弹出（替换现有 scale-95 过渡）
  - [x] SubTask 11.4: `prefers-reduced-motion` 全局跳过

- [x] Task 12: 页面切换过渡 + ScrollProgress（对标 Notion 流畅过渡）
  - [x] SubTask 12.1: App.tsx 包一层 `PageTransition` 组件（fade + slide，300ms）
  - [x] SubTask 12.2: 工作台顶部增加 `ScrollProgress` 复用落地页组件

- [x] Task 13: 关键 CTA 复用 MagneticButton + font-display 标题
  - [x] SubTask 13.1: 新建分析按钮 / 立即分析按钮用 MagneticButton
  - [x] SubTask 13.2: WorkspaceTopBar 场景名使用 `font-display`
  - [x] SubTask 13.3: 各面板标题使用 `font-display`
  - [x] SubTask 13.4: 空状态大标题使用 `font-display`

## P1 — 多任务空间（对标 Arc + Raycast）

- [x] Task 14: 新增 `useWorkspaceTabsStore`（任务 tab 管理）
  - [x] SubTask 14.1: store 字段：tabs[] / activeTabId / lastUsedOrder[]
  - [x] SubTask 14.2: actions：openTab / closeTab / setActiveTab / reorderTabs / renameTab
  - [x] SubTask 14.3: 启用 persist（刷新后恢复 tab 栏）
  - [x] SubTask 14.4: tab 关闭时若分析进行中，标记为"后台任务"

- [x] Task 15: 任务 tab 栏 UI（对标 Arc 浏览器 tab）
  - [x] SubTask 15.1: `WorkspaceTabs.tsx` 组件实现（顶部 tab 栏）
  - [x] SubTask 15.2: tab 显示场景名 + 状态点（脉动/实心/红）
  - [x] SubTask 15.3: 单击切换 / 双击重命名 / 右键菜单（复制/分享/导出/关闭）
  - [x] SubTask 15.4: tab 关闭按钮 + 拖拽重排

- [x] Task 16: 任务快速切换器（对标 Raycast Cmd+T）
  - [x] SubTask 16.1: `TaskSwitcher.tsx` 组件实现（垂直列表 + 缩略预览）
  - [x] SubTask 16.2: 每项显示场景名 + 创建时间 + 状态 + 材料数/风险数
  - [x] SubTask 16.3: 最近使用排序 + 模糊搜索过滤
  - [x] SubTask 16.4: `Ctrl+T` 唤起 + ↑↓ 导航 + Enter 切换

## P1 — 多视图与批量操作（对标 Airtable + Cursor）

- [x] Task 17: ResultPanel 风险多视图切换器
  - [x] SubTask 17.1: 视图切换器 UI（右上角，4 个图标：树/列表/看板/分组）
  - [x] SubTask 17.2: 视图偏好持久化到 `useUIPreferenceStore`
  - [x] SubTask 17.3: Linear 风格视图切换（无突变，微妙淡入）

- [x] Task 18: 列表视图实现（紧凑排序）
  - [x] SubTask 18.1: 扁平列表布局（图标 + 标题 + 类型 + 置信度 + 状态）
  - [x] SubTask 18.2: 排序：置信度 / 类型 / 状态 / 维度
  - [x] SubTask 18.3: 颜色编码（critical=红 / warning=琥珀 / info=蓝）
  - [x] SubTask 18.4: Shift+点击范围多选 / Ctrl+点击单选

- [x] Task 19: 看板视图实现（按状态分列拖拽）
  - [x] SubTask 19.1: 四列看板（待处理 / 处理中 / 已解决 / 已忽略）
  - [x] SubTask 19.2: 拖拽改变状态（HTML5 drag-and-drop）
  - [x] SubTask 19.3: 每列头部统计数 + 颜色编码
  - [x] SubTask 19.4: 卡片显示标题 + 类型 + 置信度

- [x] Task 20: 分组视图实现（按维度/类型折叠）
  - [x] SubTask 20.1: 按维度分组（折叠列表，每组可展开/收起）
  - [x] SubTask 20.2: 分组切换：维度 / 类型 / 置信度区间
  - [x] SubTask 20.3: 每组统计数 + 颜色编码

- [x] Task 21: 批量操作工具栏（对标 Cursor 多选）
  - [x] SubTask 21.1: 多选时顶部出现批量操作工具栏
  - [x] SubTask 21.2: 操作：标记已解决 / 批量导出 / 批量重新分析
  - [x] SubTask 21.3: toast 反馈"已标记 N 项"

- [x] Task 22: AI 内联编辑风险条目（对标 Cursor Cmd+K）
  - [x] SubTask 22.1: `AiInlineEditor.tsx` 组件实现
  - [x] SubTask 22.2: 选中风险 + Cmd+K 唤起内联编辑器
  - [x] SubTask 22.3: AI 重写后显示 diff 对比（删除红 / 新增绿）
  - [x] SubTask 22.4: Enter 确认 / Esc 撤销
  - [x] SubTask 22.5: 编辑历史记录到分析日志

## P1 — 可观测性增强（对标 Stripe + PostHog + Resend）

- [x] Task 23: 分析仪表盘卡片网格（对标 Stripe）
  - [x] SubTask 23.1: `AnalysisDashboard.tsx` 组件实现
  - [x] SubTask 23.2: 4-6 个卡片：材料数 / 风险数 / 平均置信度 / 分析耗时 / 趋势小图
  - [x] SubTask 23.3: 卡片图标 + 数值 + 标签 + 趋势指示（↑↓%）
  - [x] SubTask 23.4: 分析完成后展示 / 工作台首页展示

- [x] Task 24: 7 步推理漏斗图（对标 PostHog）
  - [x] SubTask 24.1: 在"思考过程"tab 增加漏斗图
  - [x] SubTask 24.2: 每步耗时 + 失败率可视化
  - [x] SubTask 24.3: 点击某步展开详细日志

- [x] Task 25: API 日志面板（对标 Resend）
  - [x] SubTask 25.1: `ApiLogPanel.tsx` 组件实现
  - [x] SubTask 25.2: sidebar"工具"组增加"API 日志"入口
  - [x] SubTask 25.3: 时间倒序显示最近 50 条（时间 + 方法 + 路径 + 状态码 + 耗时）
  - [x] SubTask 25.4: 点击展开请求/响应详情
  - [x] SubTask 25.5: 状态码颜色编码（2xx=绿 / 4xx=琥珀 / 5xx=红）

## P1 — 设计系统统一

- [x] Task 26: 补齐 shadcn 组件 + 统一按钮/弹窗
  - [x] SubTask 26.1: 安装 `dropdown-menu` / `popover` / `tabs` / `skeleton` / `command` / `tooltip`
  - [x] SubTask 26.2: 工作台按钮逐步替换原生 `<button>` 为 shadcn `Button`（先替换 sidebar / topbar / 面板标题区）
  - [x] SubTask 26.3: 工作台弹窗逐步替换自定义 modal 为 shadcn `Dialog`（先替换 Login / Share / Draft）
  - [x] SubTask 26.4: 修复 `text-error` 未定义 bug（改为 `text-danger`）
  - [x] SubTask 26.5: Linear 风格阴影极简（卡片用 border 分割，仅 modal/popover 用阴影）

## P1 — 移动端可达性 + 新手引导

- [x] Task 27: RiskWorkflowPanel 移动端抽屉化
  - [x] SubTask 27.1: 移除 `hidden md:block` 直接隐藏
  - [x] SubTask 27.2: WorkspaceTopBar 增加"待处理"按钮（带计数徽章）
  - [x] SubTask 27.3: 移动端点击唤出抽屉式 RiskWorkflowPanel
  - [x] SubTask 27.4: 抽屉外点击关闭 + Esc 关闭

- [x] Task 28: 重构 ProductTour 触发与步骤
  - [x] SubTask 28.1: 触发条件从 `setTimeout 800ms` 改为"首次进入 + 无材料"（sources.length === 0 + localStorage 标记）
  - [x] SubTask 28.2: 步骤从 7 步精简到 4 步（场景选择 → 上传材料 → 查看风险 → 导出报告）
  - [x] SubTask 28.3: 引导卡片使用 `font-display` + 玻璃拟态

## P2 — 协作与分享

- [x] Task 29: ShareModal 升级（对标 Notion 分享 + Loom 评论锚点）
  - [x] SubTask 29.1: 增加 permission 字段（查看/评论/编辑）
  - [x] SubTask 29.2: 增加 expiresAt 字段（1天/7天/30天/永久）
  - [x] SubTask 29.3: 后端 API 配合（标记依赖，可暂用 mock）

- [x] Task 30: SharePage 评论锚点（对标 Loom 异步评论）
  - [x] SubTask 30.1: 风险条目旁增加评论图标
  - [x] SubTask 30.2: 点击展开评论侧栏
  - [x] SubTask 30.3: 评论绑定到风险条目的具体证据片段

## P2 — 可访问性

- [x] Task 31: WCAG 合规补齐
  - [x] SubTask 31.1: 所有交互元素补齐 `aria-label` / `aria-describedby`
  - [x] SubTask 31.2: focus ring 在暗色模式下可见
  - [x] SubTask 31.3: 暗色模式对比度审计（≥ 4.5:1）
  - [x] SubTask 31.4: 命令面板屏幕阅读器测试

# Task Dependencies

- **Task 2（拆分 WorkspacePage）是绝大多数功能任务的前置**——god component 不拆分无法插入新功能
- Task 5（命令面板）依赖 Task 26.1（安装 shadcn command）
- Task 7（骨架屏）依赖 Task 26.1（安装 shadcn skeleton）
- Task 11（GSAP 入场）依赖 Task 2（拆分后的 WorkspaceLayout）
- Task 14/15/16（多任务空间）相互依赖：store → tab 栏 → 切换器
- Task 17-21（多视图 + 批量）依赖 Task 2（拆分后才能改 ResultPanel）
- Task 22（AI 内联编辑）依赖 Task 2 + Task 5（命令面板基础设施）
- Task 25（API 日志）依赖 Task 3（fetch 迁移后才能统一捕获）
- Task 29（ShareModal 升级）依赖后端 API 配合，可暂用 mock
- Task 1 / 4 / 6 / 8 / 9 / 10 / 13 / 26 / 28 / 31 无强依赖，可并行

# 并行化建议

- **第一波（P0 架构债并行）**：Task 1 + Task 2 + Task 4 + Task 26.1（互不影响，是后续所有任务的基础）
- **第二波（P0 核心体验并行）**：Task 3 + Task 5 + Task 6 + Task 7 + Task 8 + Task 9 + Task 10（依赖第一波）
- **第三波（P1 视觉一致性并行）**：Task 11 + Task 12 + Task 13（依赖 Task 2）
- **第四波（P1 多任务空间并行）**：Task 14 + Task 15 + Task 16（链式依赖）
- **第五波（P1 多视图并行）**：Task 17 + Task 18 + Task 19 + Task 20 + Task 21 + Task 22（依赖 Task 2）
- **第六波（P1 可观测性并行）**：Task 23 + Task 24 + Task 25（依赖 Task 3）
- **第七波（P1/P2 收尾并行）**：Task 27 + Task 28 + Task 29 + Task 30 + Task 31
