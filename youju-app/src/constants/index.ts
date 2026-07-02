import type { Scenario, SourceType } from '../types'

export const SCENARIOS: Scenario[] = [
  {
    id: 'job',
    name: '求职 Offer 确认',
    icon: 'briefcase',
    description: '核对 HR 口头承诺与正式 Offer 是否一致',
    sourceCount: 3,
  },
  {
    id: 'rent',
    name: '租房签约',
    icon: 'home',
    description: '核对中介承诺与合同条款是否一致',
    sourceCount: 2,
  },
  {
    id: 'homework',
    name: '作业/申请提交',
    icon: 'book-open',
    description: '核对提交要求与材料是否一致',
    sourceCount: 2,
  },
]

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
}

export const TYPE_LABELS: Record<SourceType, string> = {
  chat: '聊天记录',
  doc: '文档',
  web: '网页',
  screenshot: '截图',
  contract: '合同',
}
