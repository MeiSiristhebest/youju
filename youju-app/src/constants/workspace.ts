import {
  BookOpen,
  Briefcase,
  Gavel,
  GraduationCap,
  Home,
  type LucideIcon,
  Newspaper,
} from 'lucide-react'
import type { Scenario, SourceType } from '../types'

export interface ScenarioWithCategory {
  id: Scenario['id']
  name: string
  icon: string
  iconComponent: LucideIcon
  description: string
  sourceCount: number
  category: string
  featured: boolean
}

export const SCENARIOS: ScenarioWithCategory[] = [
  {
    id: 'legal_case',
    name: '案件事实梳理',
    icon: 'gavel',
    iconComponent: Gavel,
    description: '从卷宗材料中快速提炼关键事实、时间线与争议焦点',
    sourceCount: 5,
    category: '专业场景',
    featured: true,
  },
  {
    id: 'academic_research',
    name: '文献综述分析',
    icon: 'book-open',
    iconComponent: BookOpen,
    description: '对比不同研究的结论与方法，识别共识与分歧',
    sourceCount: 6,
    category: '专业场景',
    featured: true,
  },
  {
    id: 'due_diligence',
    name: '尽职调查辅助',
    icon: 'briefcase',
    iconComponent: Briefcase,
    description: '整合多方信源对目标进行背景核查，识别风险与不一致',
    sourceCount: 6,
    category: '专业场景',
    featured: true,
  },
  {
    id: 'fact_check',
    name: '事实核查报告',
    icon: 'newspaper',
    iconComponent: Newspaper,
    description: '交叉验证多条信源的真实性与一致性，输出可溯源结论',
    sourceCount: 5,
    category: '专业场景',
    featured: true,
  },
  {
    id: 'job_offer',
    name: '求职 Offer 确认',
    icon: 'briefcase',
    iconComponent: Briefcase,
    description: '核对 HR 口头承诺与正式 Offer 是否一致',
    sourceCount: 3,
    category: '个人事务',
    featured: false,
  },
  {
    id: 'rental',
    name: '租房签约审核',
    icon: 'home',
    iconComponent: Home,
    description: '核对中介承诺与合同条款是否一致',
    sourceCount: 2,
    category: '个人事务',
    featured: false,
  },
  {
    id: 'homework',
    name: '作业要求核查',
    icon: 'graduation-cap',
    iconComponent: GraduationCap,
    description: '对照作业要求检查提交内容的完整性',
    sourceCount: 2,
    category: '个人事务',
    featured: false,
  },
]

export const FEATURED_SCENARIOS = SCENARIOS.filter((s) => s.featured)

export const ANALYSIS_STEPS = [
  { key: 'scenario', name: '场景识别', desc: '理解材料内容，识别场景类型', icon: 'target' },
  { key: 'parsing', name: '解析材料', desc: '提取每份材料的关键信息', icon: 'file-text' },
  { key: 'dimensions', name: '维度发现', desc: '自动发现需要比对的重要维度', icon: 'layout-grid' },
  { key: 'extraction', name: '跨源提取', desc: '从各材料中提取对应维度的值', icon: 'search' },
  { key: 'detection', name: '差异检测', desc: '比对冲突、承诺、缺失信息', icon: 'alert-triangle' },
  { key: 'validation', name: '证据校验', desc: '验证每个结论的证据链', icon: 'check-circle' },
  { key: 'output', name: '生成报告', desc: '整理分析结果和检查清单', icon: 'file-check' },
]

export const TYPE_ICONS: Record<SourceType, string> = {
  chat: 'message-circle',
  doc: 'file-text',
  web: 'globe',
  screenshot: 'image',
  contract: 'scroll-text',
  other: 'file-question',
}

export const TYPE_LABELS: Record<SourceType, string> = {
  chat: '聊天记录',
  doc: '文档',
  web: '网页',
  screenshot: '截图',
  contract: '合同',
  other: '其他',
}
