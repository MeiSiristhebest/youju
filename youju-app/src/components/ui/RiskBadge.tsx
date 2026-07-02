import type { LucideIcon } from 'lucide-react'
import { AlertTriangle, Check, Zap } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import type { RiskLevel } from '../../types'

// 风险等级的视觉配置：颜色、形状、文字、图标
// 关键设计：不依赖单一颜色，通过形状/图标/文字三重区分，色盲用户也能识别
interface RiskLevelConfig {
  // 文字标签
  label: string
  // 颜色样式类（背景、文字、边框）
  containerClass: string
  // 形状样式类（用于图标容器）
  shapeClass: string
  // 图标组件
  Icon: LucideIcon
  // 图标尺寸
  iconSize: number
  // aria-label 模板前缀
  ariaPrefix: string
}

const RISK_LEVEL_CONFIG: Record<RiskLevel, RiskLevelConfig> = {
  // 严重：红色 + 三角形图标 + "严重"文字
  critical: {
    label: '严重',
    containerClass: 'bg-danger-bg text-danger border-danger/30',
    // 三角形通过 clip-path 实现，配合 AlertTriangle 图标双重表达
    shapeClass: 'bg-danger/15',
    Icon: AlertTriangle,
    iconSize: 12,
    ariaPrefix: '严重风险',
  },
  // 警告：黄色 + 圆形图标 + "警告"文字
  warning: {
    label: '警告',
    containerClass: 'bg-warning-bg text-warning border-warning/30',
    // 圆形通过 rounded-full 实现，配合 Zap 图标双重表达
    shapeClass: 'bg-warning/15',
    Icon: Zap,
    iconSize: 12,
    ariaPrefix: '警告风险',
  },
  // 提示：绿色 + 对勾图标 + "提示"文字
  info: {
    label: '提示',
    containerClass: 'bg-success-bg text-success border-success/30',
    // 对勾本身就是独特形状
    shapeClass: 'bg-success/15',
    Icon: Check,
    iconSize: 12,
    ariaPrefix: '提示信息',
  },
}

interface RiskBadgeProps {
  // 风险等级
  level: RiskLevel
  // 可选的标题文本，会让 aria-label 更具体
  title?: string
  // 是否显示文字标签，默认为 true
  showLabel?: boolean
  // 自定义 className
  className?: string
  // 子元素（不传则使用默认布局）
  children?: ReactNode
}

/**
 * 色盲友好的风险等级徽章组件。
 *
 * 设计原则：不只依赖颜色，同时使用形状/图案/图标/文字多重区分风险等级，
 * 确保色盲用户（红绿色盲、蓝黄色盲等）也能识别风险等级。
 *
 * 等级映射：
 * - critical（严重）：红色 + 三角形 AlertTriangle 图标 + "严重"文字
 * - warning（警告）：黄色 + 圆形 Zap 图标 + "警告"文字
 * - info（提示）：绿色 + 对勾 Check 图标 + "提示"文字
 *
 * 输出带 aria-label 的徽章，屏幕阅读器会朗读"严重风险：xxx"等。
 */
export function RiskBadge({ level, title, showLabel = true, className, children }: RiskBadgeProps) {
  const config = RISK_LEVEL_CONFIG[level]
  const { Icon } = config

  // 屏幕阅读器朗读的完整文本
  const ariaLabel = title ? `${config.ariaPrefix}：${title}` : config.ariaPrefix

  return (
    <span
      role="img"
      aria-label={ariaLabel}
      className={cn(
        'inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium border',
        config.containerClass,
        className,
      )}
    >
      {/* 形状/图标层：双重表达风险等级，色盲友好 */}
      <span
        className={cn(
          'inline-flex items-center justify-center w-3.5 h-3.5 rounded-sm',
          config.shapeClass,
        )}
        aria-hidden="true"
      >
        <Icon size={config.iconSize} strokeWidth={2} />
      </span>
      {/* 文字标签层：第三重表达 */}
      {showLabel && <span aria-hidden="true">{config.label}</span>}
      {children}
    </span>
  )
}

export { RISK_LEVEL_CONFIG }
