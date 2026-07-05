# 工作台对标顶级 SaaS 升级规范（集百家之长）

## Why

落地页已升级到 Awwwards 级（GSAP 驱动、Bento Grid、自定义光标、SplitText 动态排版、松青配色），但用户从首页"开始使用"进入工作台后，视觉与交互**断崖式回退**：无入场动效、无命令面板、无骨架屏、`WorkspacePage.tsx` 1347 行 god component、store 持久化不一致、URL 路由缺失、移动端面板不可达。

仅对标 Notion / Figma / Vercel 三家不足够覆盖工作台的复杂场景。本规范**集百家之长**，对标 8 家顶级 SaaS 产品，每家只取其最精髓的 1-2 个维度，避免"四不像"：

| 对标产品 | 借鉴维度 | 对应"有据"工作台能力 |
|---|---|---|
| **Linear** | 极简紧凑 + 键盘优先 + 命令面板 sub-menu + 无缝过渡 | 整体工作台交互骨架 |
| **Notion** | 命令面板 + 块级一致性 + 优雅空状态 + 流畅页面过渡 | 命令面板 + 空状态 + 页面过渡 |
| **Figma** | 键盘驱动 + 性能感知 + 紧凑信息密度 + 快捷键提示气泡 | 键盘工作流 + 骨架屏 |
| **Vercel** | 极简视觉 + 可观测性 + 骨架屏 + 任务状态徽章 | 任务状态 + 错误可观测 |
| **Stripe** | 仪表盘卡片网格 + 趋势图 + 流式数据 + 错误状态精致 + inline editing | 分析仪表盘 + 内联编辑 |
| **Airtable** | 多视图（树/列表/看板/分组）+ 颜色编码 + 分组聚合 | ResultPanel 多视图切换 |
| **Raycast** | 命令面板扩展 + 快速切换器（Cmd+T 切任务） + 内联计算 | 命令面板 + 多任务切换 |
| **Cursor** | Cmd+K 内联 AI 编辑 + 多选批量操作 + Agent 模式 | 风险条目内联 AI 重写 + 批量操作 |

> 主动**不对标**：Superhuman（邮件场景差异大）、Arc（浏览器空间模型不匹配）、PostHog（分析场景不匹配）、Resend（开发者向 API 差异大）、Cal.com（日程场景不匹配）。这些产品的部分灵感已融入上述 8 家的对标维度中。

## What Changes

### 一、视觉一致性层（对标 Linear + Notion — 消除落地页 → 工作台风格断层）
- 引入 GSAP 入场动效到工作台（面板 stagger、列表项 reveal、模态框 spring）
- 引入页面切换过渡（home → workspace 的 fade/slide，非 mount/unmount 突变）
- 工作台顶部增加 `ScrollProgress` 复用
- 复用落地页的 `MagneticButton` 到关键 CTA（新建分析、立即分析）
- 字体一致性：工作台标题区使用 `font-display`，与落地页统一编辑级视觉锤
- **Linear 借鉴**：紧凑信息密度 + `subtle` 分割线（`border-rule/40`）+ 极少阴影 + 强对比文字层级
- **BREAKING**：移除已废弃的 `AnimateIn` 组件及其测试文件，统一用 GSAP

### 二、命令面板层（对标 Notion Cmd+K + Raycast 扩展 + Vercel Command Palette）
- 将 `GlobalSearch.tsx` 升级为**命令面板**：搜索 + 操作二合一
- 支持的操作（**Raycast 风格分组**）：
  - **跳转**：跳转场景 / 切换 tab / 跳转材料 / 跳转风险
  - **操作**：折叠面板 / 切换主题 / 新建分析 / 导出报告 / 复制分享链接
  - **最近**：最近 5 条命令
  - **AI**：AI 重写选中风险 / AI 总结当前分析
- 键盘导航：↑↓ 选择、Enter 执行、Esc 关闭、Ctrl+K 唤起、Ctrl+T 快速切换任务
- **Raycast 借鉴**：命令面板内联支持模糊匹配 + 拼音首字母（如输"fx"匹配"风险"）
- 最近命令记忆（持久化到 localStorage `youju_recent_commands`）
- 命令面板支持子命令（如"新建分析"展开为子菜单选场景）

### 三、键盘驱动工作流层（对标 Figma 键盘优先 + Linear 无缝过渡 + Superhuman 瞬时操作）
- 扩展 `useKeyboardShortcuts.ts`：
  - `1-7` 切换 ResultPanel 7 个 tab（全局注册）
  - `[` / `]` 折叠/展开左/右面板
  - `Ctrl+B` 切换 sidebar
  - `Ctrl+K` 命令面板 / `Ctrl+Shift+P` 命令面板（兼容两种习惯）
  - `Ctrl+T` 快速切换任务（Raycast 风格任务切换器）
  - `G` 然后 `S` 跳转材料 / `G` 然后 `R` 跳转风险（Notion 双键跳转）
  - `E` 导出 / `S` 保存 / `?` 快捷键帮助
- 快捷键提示气泡（hover 按钮时显示组合键，shadcn Tooltip）
- **Superhuman 借鉴**：危险操作（删除/取消分析）不要弹窗确认，改为"撤销 toast"（5 秒内可撤销）
- **Linear 借鉴**：所有快捷键可在 `KeyboardShortcutsModal` 中自定义（持久化到 localStorage）

### 四、性能感知层（对标 Vercel 骨架屏 + Figma 性能 + Resend 实时日志）
- 为 SourcePanel / RiskWorkflowPanel / ResultPanel / ContextPanel 添加**骨架屏**
- 分析过程流式可视化优化：7 步进度条 + 当前步骤描述 + 预估剩余时间 + 步骤耗时统计
- 骨架屏使用 `bg-paper-dark/50 animate-pulse` 配合 `rounded-md`，与实际内容形状匹配
- **Resend 借鉴**：API 调用日志面板（实时事件流 + 状态码 + 耗时 + 请求/响应预览）
- **BREAKING**：移除 `WorkspacePage.tsx` 中所有 `fetch` 直调，统一走 `useAnalysis` / `useSources` / `useTasks` hook

### 五、可观测性层（对标 Vercel 部署状态 + Stripe 仪表盘 + PostHog 洞察）
- 工作台右上角增加**任务状态徽章**：分析中 / 已完成 / 失败 / 已取消 / 已取消可重试
- 失败时点击徽章展开错误详情 + 重试按钮（不要静默 `console.error`）
- 历史记录面板增加**版本对比视图**（已有 `HistoryDiffPanel`，需在 UI 上突出入口）
- 分析日志可查看（对应 project_memory 中"analysis_logs 作为唯一事实来源"）
- **Stripe 借鉴**：分析仪表盘卡片网格（材料数 / 风险数 / 平均置信度 / 分析耗时 / 趋势小图）
- **PostHog 借鉴**：7 步推理的漏斗图 + 每步耗时 + 失败率（在"思考过程"tab 中）

### 六、多视图层（对标 Airtable 多视图 + Linear 紧凑）
- ResultPanel "风险排雷" tab 增加**视图切换器**（右上角）：
  - **树状视图**（默认，现有 RiskTree）：按维度分组的风险树
  - **列表视图**：扁平列表，紧凑排列，支持排序（置信度/类型/状态）
  - **看板视图**：按状态（待处理/处理中/已解决/已忽略）分列的看板
  - **分组视图**：按维度/类型/置信度区间分组的折叠列表
- **Airtable 借鉴**：颜色编码（critical=红 / warning=琥珀 / info=蓝），分组聚合统计
- 视图偏好持久化到 `useUIPreferenceStore`
- **Linear 借鉴**：视图切换无动画突变，但内容有微妙淡入

### 七、AI 内联编辑层（对标 Cursor Cmd+K + Agent 模式）
- 风险条目支持 **Cmd+K 内联 AI 重写**：
  - 选中风险条目，按 Cmd+K，输入"更精炼" / "更正式" / "加入证据引用"
  - AI 重写后显示 diff 对比，用户确认或撤销
- 多选批量操作：
  - 列表视图支持多选（Shift+点击范围 / Ctrl+点击单选）
  - 批量操作：标记已解决 / 批量导出 / 批量重新分析
- **Cursor Agent 模式借鉴**：分析页提供"AI Agent"入口，用户输入"重新检查所有 confidence < 0.7 的风险"，Agent 自动筛选 + 重跑 + 输出报告

### 八、多任务空间层（对标 Arc 浏览器 + Raycast 快速切换）
- 工作台顶部增加**任务 tab 栏**（类似浏览器 tab）：
  - 每个"新建分析"创建一个 tab
  - tab 显示场景名 + 状态点（进行中=脉动 / 完成=实心 / 失败=红）
  - tab 可关闭（关闭时若分析进行中，提示"后台继续"或"取消"）
- **Raycast 借鉴**：`Ctrl+T` 唤起任务切换器（垂直列表 + 缩略预览 + 最近使用排序）
- 任务 tab 状态持久化到 `useTaskStore`，刷新后恢复
- 单击 tab 切换，双击 tab 重命名，右键 tab 操作菜单（复制/分享/导出/关闭）

### 九、空状态与引导层（对标 Notion 优雅空状态 + Stripe 微交互）
- 每个面板的空状态：
  - 插画或图标（lucide）
  - 一句说明
  - 一个 CTA 按钮
  - 一个"了解更多"链接
- 新手引导从 `setTimeout 800ms` 改为**用户首次进入工作台且无材料时**触发
- 引导步骤从 7 步精简到 4 步（场景选择 → 上传材料 → 查看风险 → 导出报告）
- **Stripe 借鉴**：空状态 CTA 按钮 hover 有微妙发光（accent 色 box-shadow）

### 十、协作与分享层（对标 Figma 实时协作 + Notion 分享 + Loom 异步评论）
- 现有 `ShareModal` 升级：分享链接 + 权限设置（查看/评论/编辑）+ 有效期
- 分享页面（SharePage）增加**评论锚点**能力（点击风险条目可评论）
- **Loom 借鉴**：评论支持时间锚点（评论绑定到风险条目的具体证据片段）
- **不做**实时多人光标（超出当前范围，标记为未来迭代）

### 十一、设计系统统一层（对标三家严格的设计系统 + Linear 极简）
- shadcn/ui 组件补齐：`Dropdown`、`Popover`、`Tabs`、`Command`、`Skeleton`、`Toast`、`Tooltip`
- 工作台按钮统一用 shadcn `Button`，移除原生 `<button>` + Tailwind 的散乱用法
- 工作台弹窗统一用 shadcn `Dialog`，移除自定义 modal 的散乱用法
- 状态色与功能色严格区分：松青（品牌）/ 暖陶（次强调）/ 琥珀金（正向）/ 红色（危险）/ 琥珀（警告）/ 蓝色（信息）
- **Linear 借鉴**：阴影系统极简（仅 modal/popover 用阴影，卡片用 border 分割），减少视觉噪音
- **BREAKING**：修复 `text-error` 未定义 bug（应改为 `text-danger`）

### 十二、架构层（消除 god component，符合 project_memory 模块化约束）
- `WorkspacePage.tsx` 拆分为：
  - `WorkspaceLayout.tsx`（布局壳 + tab 栏）
  - `useWorkspaceHandlers.ts`（事件处理 hook）
  - `WorkspaceModals.tsx`（模态框聚合）
  - `WorkspaceEmpty.tsx`（空状态）
  - `WorkspaceTabs.tsx`（任务 tab 栏）
- `useSourceStore` / `useTaskStore` 启用 `persist` 中间件（解决刷新即丢失）
- 清理下划线前缀未使用变量（`_loadScenario` 等 11 处）
- `notificationCount={3}` 硬编码改为从 `useNotificationStore` 读取

### 十三、可访问性层（对标三家的 WCAG 合规）
- 所有可交互元素补齐 `aria-label` / `aria-describedby`
- 键盘 Tab 顺序可视化（focus ring 在暗色模式下可见）
- 命令面板支持屏幕阅读器（`role="dialog"` + `aria-modal`）
- 暗色模式对比度全部 ≥ WCAG AA（4.5:1）

## Impact

- **Affected specs**: 工作台整体布局、状态管理、键盘交互、视觉系统、协作分享、多任务管理、AI 内联编辑
- **Affected code**:
  - `src/pages/WorkspacePage.tsx`（拆分为 5 个子模块）
  - `src/components/workspace/*.tsx`（动效、骨架屏、空状态、多视图、tab 栏）
  - `src/components/workspace/ResultPanel.tsx`（新增视图切换器 + 多视图实现）
  - `src/components/common/GlobalSearch.tsx`（升级为命令面板）
  - `src/components/common/TaskTabs.tsx`（新增任务 tab 栏）
  - `src/components/common/TaskSwitcher.tsx`（新增 Raycast 风格切换器）
  - `src/components/workspace/ApiLogPanel.tsx`（新增 API 日志面板）
  - `src/components/workspace/AnalysisDashboard.tsx`（新增 Stripe 风格仪表盘）
  - `src/components/workspace/AiInlineEditor.tsx`（新增 Cursor 风格内联编辑）
  - `src/hooks/useKeyboardShortcuts.ts`（扩展）
  - `src/stores/useSourceStore.ts` / `useTaskStore.ts`（启用 persist）
  - `src/stores/useWorkspaceTabsStore.ts`（新增任务 tab 管理）
  - `src/components/ui/`（补齐 shadcn 组件）
  - `src/index.css`（工作台 keyframes）

## ADDED Requirements

### Requirement: 命令面板（Command Palette）
系统 SHALL 提供全局命令面板，用户通过 `Ctrl+K`（macOS: `Cmd+K`）唤起，支持搜索 + 操作二合一，分组展示命令。

#### Scenario: 用户唤起命令面板
- **WHEN** 用户在工作台任意位置按下 `Ctrl+K`
- **THEN** 命令面板居中弹出，输入框自动聚焦
- **AND** 面板分组显示：最近 5 条 + 跳转 + 操作 + AI

#### Scenario: 用户搜索并执行命令（支持模糊匹配 + 拼音首字母）
- **WHEN** 用户输入"fx"或"风险"
- **THEN** 命令列表实时过滤，模糊匹配显示"跳转：风险排雷 tab"、"操作：折叠风险面板"
- **WHEN** 用户按 `Enter`
- **THEN** 执行选中的命令，面板关闭，命令记入最近使用

#### Scenario: 命令面板子菜单
- **WHEN** 用户选中"新建分析"并按 `→`
- **THEN** 展开子菜单显示所有场景选项
- **WHEN** 用户选中场景按 `Enter`
- **THEN** 创建该场景的新分析任务

### Requirement: 多任务 Tab 栏（Workspace Tabs）
系统 SHALL 在工作台顶部提供任务 tab 栏，每个分析任务为一个 tab，支持快速切换。

#### Scenario: 用户创建多个分析任务
- **WHEN** 用户在已有任务的情况下点击"新建分析"并选择场景
- **THEN** 顶部 tab 栏新增一个 tab，显示场景名 + 状态点（脉动表示进行中）
- **AND** 自动切换到新 tab

#### Scenario: 用户切换任务
- **WHEN** 用户点击另一个 tab
- **THEN** 工作区立即切换到该任务的状态（材料/风险/结果），无加载延迟（数据已在 store）
- **AND** 切换有 150ms 淡入过渡

#### Scenario: 用户关闭进行中的任务 tab
- **WHEN** 用户关闭状态为"分析中"的 tab
- **THEN** 弹出 toast 提示"分析将在后台继续，可从任务切换器恢复"
- **AND** 5 秒内可点击 toast 撤销关闭

### Requirement: 任务快速切换器（对标 Raycast）
系统 SHALL 提供 `Ctrl+T` 唤起的任务快速切换器，垂直列表展示所有任务。

#### Scenario: 用户唤起任务切换器
- **WHEN** 用户按下 `Ctrl+T`
- **THEN** 任务切换器居中弹出，垂直列表显示所有任务
- **AND** 每项显示场景名 + 创建时间 + 状态 + 缩略预览（材料数/风险数）
- **AND** 最近使用的任务排在最前

### Requirement: 风险多视图切换
系统 SHALL 在 ResultPanel "风险排雷" tab 提供四种视图切换：树状/列表/看板/分组。

#### Scenario: 用户切换到看板视图
- **WHEN** 用户在风险排雷 tab 点击视图切换器选择"看板"
- **THEN** 风险按状态（待处理/处理中/已解决/已忽略）分列展示
- **AND** 每列显示该状态的风险卡片，支持拖拽改变状态
- **AND** 视图偏好持久化到 `useUIPreferenceStore`

#### Scenario: 用户在列表视图多选批量操作
- **WHEN** 用户在列表视图 Shift+点击选择多个风险
- **THEN** 顶部出现批量操作工具栏（标记已解决 / 批量导出 / 批量重新分析）
- **WHEN** 用户点击"标记已解决"
- **THEN** 所选风险状态批量更新，显示 toast"已标记 N 项为已解决"

### Requirement: AI 内联编辑风险条目（对标 Cursor Cmd+K）
系统 SHALL 支持在风险条目上按 `Cmd+K` 唤起 AI 内联编辑器，重写风险描述。

#### Scenario: 用户内联重写风险描述
- **WHEN** 用户选中一个风险条目，按 `Cmd+K`
- **THEN** 内联编辑器弹出，输入框预设"重写指令"
- **WHEN** 用户输入"更精炼，保留证据引用"按 `Enter`
- **THEN** AI 重写风险描述，显示 diff 对比（删除红色 / 新增绿色）
- **WHEN** 用户按 `Enter` 确认
- **THEN** 风险描述更新，记录编辑历史
- **WHEN** 用户按 `Esc`
- **THEN** 撤销重写，恢复原描述

### Requirement: 分析仪表盘（对标 Stripe）
系统 SHALL 在工作台首页或分析完成后展示分析仪表盘卡片网格。

#### Scenario: 用户查看分析仪表盘
- **WHEN** 用户进入工作台或分析完成
- **THEN** 显示 4-6 个仪表盘卡片：材料数 / 风险数 / 平均置信度 / 分析耗时 / 7 步耗时分布 / 趋势小图
- **AND** 每个卡片有图标 + 数值 + 标签 + 趋势指示（↑↓ + 百分比）

### Requirement: API 日志面板（对标 Resend）
系统 SHALL 提供 API 调用日志面板，实时显示所有 API 请求。

#### Scenario: 用户查看 API 日志
- **WHEN** 用户在 sidebar"工具"组点击"API 日志"
- **THEN** 弹出 API 日志面板，按时间倒序显示最近 50 条 API 调用
- **AND** 每条显示：时间 + 方法 + 路径 + 状态码 + 耗时
- **AND** 点击任意条目展开请求/响应详情

### Requirement: 骨架屏（Skeleton Loading）
系统 SHALL 在数据加载时显示与实际内容形状匹配的骨架屏，而非空白或单一 spinner。

#### Scenario: 材料列表加载
- **WHEN** 用户进入工作台且材料列表正在加载
- **THEN** SourcePanel 显示 3-5 行骨架行（图标占位 + 标题占位 + meta 占位）
- **AND** 骨架行使用 `animate-pulse` 与 `bg-paper-dark/50`
- **WHEN** 数据加载完成
- **THEN** 骨架行淡出，真实内容淡入

### Requirement: 工作台入场动效
系统 SHALL 为工作台面板提供 GSAP 驱动的 stagger 入场动效。

#### Scenario: 用户首次进入工作台
- **WHEN** 用户从落地页点击"开始使用"进入工作台
- **THEN** sidebar → topbar → source panel → result panel → context panel 按顺序 stagger 入场
- **AND** 总入场时长 ≤ 800ms，不阻塞交互
- **AND** `prefers-reduced-motion` 用户跳过动画

### Requirement: 任务状态可观测
系统 SHALL 在工作台显眼位置显示当前分析任务的状态徽章，失败时提供错误详情与重试入口。

#### Scenario: 分析任务失败
- **WHEN** 分析任务失败
- **THEN** 顶部状态徽章变红，显示"失败"
- **WHEN** 用户点击徽章
- **THEN** 展开错误详情面板，包含错误信息 + "重试"按钮
- **AND** 错误同时记录到分析日志（不可静默）

### Requirement: 危险操作撤销（对标 Superhuman）
系统 SHALL 对危险操作（删除材料/取消分析/关闭任务）使用撤销 toast 而非确认弹窗。

#### Scenario: 用户删除材料
- **WHEN** 用户点击删除材料
- **THEN** 材料立即从列表移除，底部显示 toast"已删除 X，5 秒内可撤销"
- **WHEN** 用户在 5 秒内点击"撤销"
- **THEN** 材料恢复到原位置
- **WHEN** 5 秒过去未点击撤销
- **THEN** 真正执行删除（API 调用）

### Requirement: 移动端面板可达性
系统 SHALL 在移动端提供 RiskWorkflowPanel 的可达入口，而非直接隐藏。

#### Scenario: 移动端用户查看待处理清单
- **WHEN** 用户在 `md` 以下视口访问工作台
- **THEN** RiskWorkflowPanel 不再 `hidden md:block` 直接隐藏
- **AND** 改为通过 topbar 的"待处理"按钮唤出抽屉式面板

## MODIFIED Requirements

### Requirement: 键盘快捷键
现有键盘快捷键覆盖 Ctrl+Enter/K/S、Escape、? 。扩展为完整键盘驱动工作流：`1-7` 切 tab、`[`/`]` 折叠面板、`Ctrl+B` 切 sidebar、`Ctrl+T` 任务切换器、`G`+`S`/`G`+`R` 跳转、`Ctrl+K`/`Ctrl+Shift+P` 命令面板、`E` 导出、`Cmd+K`（macOS）/`Ctrl+K`（Windows）AI 内联编辑。所有快捷键可在 `KeyboardShortcutsModal` 中自定义并持久化。

### Requirement: 状态管理持久化
现有 `useUIPreferenceStore` 已 persist。修改为：`useSourceStore`、`useTaskStore`、`useAnalysisStore`（风险工作流状态部分）、`useWorkspaceTabsStore`（新增）全部启用 `persist` 中间件，刷新后恢复材料列表、任务历史、风险状态、任务 tab 栏。

### Requirement: WorkspacePage 模块化
现有 `WorkspacePage.tsx` 1347 行。修改为拆分为 `WorkspaceLayout` / `useWorkspaceHandlers` / `WorkspaceModals` / `WorkspaceEmpty` / `WorkspaceTabs` 五个子模块，单文件不超过 400 行。

### Requirement: ResultPanel 风险视图
现有 ResultPanel "风险排雷" tab 仅支持树状视图（RiskTree）。修改为支持四种视图切换：树状（默认）/ 列表（紧凑排序）/ 看板（按状态分列拖拽）/ 分组（按维度/类型折叠），视图偏好持久化。

## REMOVED Requirements

### Requirement: AnimateIn 组件
**Reason**: 已废弃，整个 `src/` 中无任何使用，被 GSAP 入场动效完全取代
**Migration**: 删除 `src/components/ui/AnimateIn.tsx` 及其测试文件，工作台改用 `useGSAP` + `ScrollTrigger.create({ once: true })`

### Requirement: fetch 直调 API
**Reason**: `WorkspacePage.tsx` 第 740-761、775-779、790-794 行直接 `fetch('/api/...')`，违反"所有 API 请求必须使用统一查询层"约束
**Migration**: 改为 `useAnalysis` / `useSources` / `useTasks` hook 中的 React Query mutation

### Requirement: 危险操作确认弹窗
**Reason**: 确认弹窗打断流式工作流，对标 Superhuman 改用撤销 toast
**Migration**: 删除/取消/关闭操作的 `window.confirm` 或自定义确认弹窗，改为即时执行 + 5 秒撤销 toast
