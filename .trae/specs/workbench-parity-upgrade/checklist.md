# Verification Checklist

> 对应 spec.md 中 ADDED / MODIFIED / REMOVED Requirements 的验收点。每完成一项打勾。

## 一、视觉一致性层（对标 Linear + Notion）

- [x] 工作台从首页进入后，无视觉断崖（sidebar/topbar/面板标题使用 font-display）
- [x] 工作台面板有 GSAP stagger 入场动效（sidebar → topbar → 三栏，总时长 ≤ 800ms）
- [x] home → workspace 页面切换有 fade/slide 过渡（300ms，非突变）
- [x] 关键 CTA（新建分析、立即分析）使用 MagneticButton
- [x] 工作台顶部有 ScrollProgress 进度条（复用落地页组件）
- [x] Linear 风格紧凑信息密度（border-rule/40 subtle 分割线，极少阴影）
- [x] `AnimateIn.tsx` 及测试文件已删除，grep 全局无残留引用

## 二、命令面板层（对标 Notion + Raycast + Vercel）

- [x] `Ctrl+K`（macOS: `Cmd+K`）可全局唤起命令面板
- [x] 命令面板分组显示（跳转 / 操作 / AI / 最近）
- [x] 命令面板支持模糊匹配 + 拼音首字母（"fx"匹配"风险"）
- [x] 命令面板支持子菜单（"新建分析" → 展开场景选项）
- [x] 命令面板记录最近 5 条命令（localStorage: `youju_recent_commands`）
- [x] 命令面板键盘导航：↑↓ 选择、Enter 执行、Esc 关闭、→ 展开子菜单
- [x] 命令面板有 `role="dialog"` + `aria-modal` 属性

## 三、键盘驱动工作流层（对标 Figma + Linear + Superhuman）

- [x] `1-7` 全局切换 ResultPanel 7 个 tab
- [x] `[` / `]` 折叠/展开左/右面板
- [x] `Ctrl+B` 切换 sidebar
- [x] `Ctrl+K` / `Ctrl+Shift+P` 唤起命令面板
- [x] `Ctrl+T` 唤起任务切换器
- [x] `G`+`S` / `G`+`R` 双键跳转材料/风险
- [x] `E` 导出 / `S` 保存 / `?` 帮助
- [x] 按钮 hover 显示快捷键提示气泡（shadcn Tooltip）
- [x] `KeyboardShortcutsModal` 文档已更新 + 快捷键可自定义持久化
- [x] 危险操作（删除/取消/关闭）无确认弹窗，改为 5 秒撤销 toast

## 四、性能感知层（对标 Vercel + Figma + Resend）

- [x] SourcePanel 加载时显示骨架屏（3-5 行材料占位，animate-pulse）
- [x] RiskWorkflowPanel 加载时显示骨架屏（3 行风险占位）
- [x] ResultPanel 加载时显示骨架屏（tab 占位 + 内容占位）
- [x] ContextPanel 加载时显示骨架屏（风险详情占位）
- [x] 数据加载完成后骨架屏淡出，真实内容淡入
- [x] `WorkspacePage.tsx` 无 `fetch` 直调，全部走 React Query hook
- [x] 错误有 toast 反馈，不再 `console.error` 静默
- [x] API 日志面板可查看（实时事件流 + 状态码 + 耗时 + 请求/响应详情）

## 五、可观测性层（对标 Vercel + Stripe + PostHog）

- [x] WorkspaceTopBar 右侧有任务状态徽章（分析中/已完成/失败/已取消）
- [x] 失败时徽章变红，点击展开错误详情面板
- [x] 错误详情面板包含错误信息 + 重试按钮
- [x] 错误同时写入分析日志（API 调用）
- [x] 历史记录面板有版本对比入口（突出显示）
- [x] 分析仪表盘卡片网格（材料数/风险数/平均置信度/分析耗时/趋势小图）
- [x] 7 步推理漏斗图（每步耗时 + 失败率，在"思考过程"tab）
- [x] API 日志按时间倒序，状态码颜色编码（2xx 绿/4xx 琥珀/5xx 红）

## 六、多视图层（对标 Airtable + Linear）

- [x] ResultPanel "风险排雷" tab 有视图切换器（树/列表/看板/分组）
- [x] 树状视图（默认，现有 RiskTree）正常工作
- [x] 列表视图：扁平列表 + 排序（置信度/类型/状态/维度）+ 颜色编码
- [x] 列表视图：Shift+点击范围多选 / Ctrl+点击单选
- [x] 看板视图：四列（待处理/处理中/已解决/已忽略）+ 拖拽改变状态
- [x] 分组视图：按维度/类型/置信度区间分组折叠
- [x] 视图偏好持久化到 `useUIPreferenceStore`
- [x] 视图切换无突变（Linear 风格微妙淡入）
- [x] 多选时批量操作工具栏出现（标记已解决 / 批量导出 / 批量重新分析）

## 七、AI 内联编辑层（对标 Cursor）

- [x] 选中风险条目 + Cmd+K 唤起 AI 内联编辑器
- [x] AI 重写后显示 diff 对比（删除红 / 新增绿）
- [x] Enter 确认更新 / Esc 撤销恢复
- [x] 编辑历史记录到分析日志
- [x] 批量操作支持"标记已解决 / 批量导出 / 批量重新分析"
- [x] 批量操作有 toast 反馈"已标记 N 项"

## 八、多任务空间层（对标 Arc + Raycast）

- [x] 工作台顶部有任务 tab 栏
- [x] 新建分析创建新 tab + 自动切换
- [x] tab 显示场景名 + 状态点（脉动=进行中 / 实心=完成 / 红=失败）
- [x] 单击切换 / 双击重命名 / 右键菜单（复制/分享/导出/关闭）
- [x] tab 可拖拽重排
- [x] 关闭进行中 tab 弹出 toast"后台继续，5 秒可撤销"
- [x] `Ctrl+T` 唤起任务切换器（垂直列表 + 缩略预览 + 最近使用排序）
- [x] 任务切换器支持模糊搜索过滤
- [x] tab 栏状态刷新后恢复（persist）

## 九、空状态与引导层（对标 Notion + Stripe）

- [x] SourcePanel 空状态：图标 + "上传你的第一份材料" + CTA + 了解更多
- [x] RiskWorkflowPanel 空状态："暂无待处理风险" + "运行分析"按钮
- [x] ContextPanel 空状态："选择左侧风险查看详情"
- [x] ResultPanel 空状态："创建你的第一次分析" + 场景选择入口
- [x] 空状态 CTA 按钮 hover 有 accent 色发光（box-shadow）
- [x] ProductTour 触发条件为"首次进入 + 无材料"（非 setTimeout 800ms）
- [x] ProductTour 步骤为 4 步（场景选择 → 上传材料 → 查看风险 → 导出报告）
- [x] ProductTour 卡片使用 font-display + 玻璃拟态

## 十、协作与分享层（对标 Figma + Notion + Loom）

- [x] ShareModal 支持 permission 字段（查看/评论/编辑）
- [x] ShareModal 支持 expiresAt 字段（1天/7天/30天/永久）
- [x] SharePage 风险条目旁有评论图标
- [x] 点击评论图标展开评论侧栏
- [x] 评论绑定到风险条目的具体证据片段

## 十一、设计系统统一层（对标三家 + Linear 极简）

- [x] shadcn 组件已安装：`dropdown-menu` / `popover` / `tabs` / `skeleton` / `command` / `tooltip`
- [x] sidebar / topbar / 面板标题区按钮使用 shadcn `Button`
- [x] Login / Share / Draft 弹窗使用 shadcn `Dialog`
- [x] `text-error` 未定义 bug 已修复（改为 `text-danger`）
- [x] 状态色与功能色严格区分（松青品牌 / 暖陶次强调 / 琥珀金正向 / 红色危险 / 琥珀警告 / 蓝色信息）
- [x] Linear 风格阴影极简（卡片用 border 分割，仅 modal/popover 用阴影）

## 十二、架构层

- [x] `WorkspacePage.tsx` 已拆分为 `WorkspaceLayout` / `useWorkspaceHandlers` / `WorkspaceModals` / `WorkspaceEmpty` / `WorkspaceTabs`
- [x] 拆分后单文件 ≤ 400 行
- [x] 11 处下划线前缀未使用变量已清理
- [x] `notificationCount={3}` 硬编码已改为 store 读取
- [x] `useSourceStore` 启用 persist + partialize
- [x] `useTaskStore` 启用 persist + partialize
- [x] `useAnalysisStore` 风险工作流状态从手动 localStorage 迁移到 persist
- [x] `useWorkspaceTabsStore`（新增）启用 persist
- [x] 刷新页面后材料列表、任务历史、风险状态、任务 tab 栏恢复

## 十三、可访问性层

- [x] 所有交互元素有 `aria-label` / `aria-describedby`
- [x] focus ring 在暗色模式下可见
- [x] 命令面板支持屏幕阅读器（role/aria-modal）
- [x] 暗色模式对比度审计通过（≥ WCAG AA 4.5:1）

## 十四、移动端可达性

- [x] RiskWorkflowPanel 在 `md` 以下不再 `hidden md:block` 直接隐藏
- [x] WorkspaceTopBar 有"待处理"按钮（带计数徽章）
- [x] 移动端点击"待处理"唤出抽屉式 RiskWorkflowPanel
- [x] 抽屉外点击关闭 + Esc 关闭

## 十五、编译与回归

- [x] `pnpm exec tsc --noEmit` 零错误
- [x] `pnpm exec biome check` 无 lint 错误（仅 pre-existing 格式警告）
- [x] `pnpm test` 现有测试全部通过
- [ ] 工作台主流程手动回归：新建分析 → 上传材料 → 运行分析 → 查看风险 → 导出报告
- [ ] 多任务场景回归：新建多个分析 → tab 切换 → Ctrl+T 切换器 → 关闭 tab 撤销
- [ ] 多视图场景回归：树状 → 列表（多选批量）→ 看板（拖拽改状态）→ 分组
- [ ] AI 内联编辑回归：Cmd+K 唤起 → 重写 → diff 对比 → 确认/撤销
- [ ] 命令面板回归：Ctrl+K 唤起 → 模糊搜索 → 子菜单 → 最近命令
- [ ] 暗色模式全流程回归
- [ ] 移动端（375px 视口）全流程回归
- [ ] `prefers-reduced-motion` 用户跳过所有 GSAP 动画
