import type { LucideIcon } from 'lucide-react'
import { Building2, Sparkles, Zap } from 'lucide-react'

export interface PricingPlan {
  id: string
  name: string
  price: number
  priceUnit: string
  description: string
  features: { text: string; included: boolean }[]
  cta: string
  highlighted?: boolean
  icon?: LucideIcon
}

export const PRICING_PLANS: PricingPlan[] = [
  {
    id: 'free',
    name: '免费版',
    price: 0,
    priceUnit: '/月',
    description: '适合个人偶尔使用',
    features: [
      { text: '3 次/月分析', included: true },
      { text: '基础格式支持（PDF / 文本）', included: true },
      { text: '7 天历史保留', included: true },
      { text: '无限分析', included: false },
      { text: '导出报告', included: false },
      { text: '优先队列', included: false },
    ],
    cta: '免费开始',
    icon: Sparkles,
  },
  {
    id: 'pro',
    name: '专业版',
    price: 29,
    priceUnit: '/月',
    description: '适合频繁使用的专业人士',
    features: [
      { text: '无限分析', included: true },
      { text: '全格式支持', included: true },
      { text: '永久历史保留', included: true },
      { text: '导出报告（PDF / Markdown）', included: true },
      { text: '优先队列', included: true },
      { text: 'API 接入', included: false },
    ],
    cta: '7 天免费试用',
    highlighted: true,
    icon: Zap,
  },
  {
    id: 'team',
    name: '团队版',
    price: 99,
    priceUnit: '/人/月',
    description: '适合团队协作场景',
    features: [
      { text: '专业版全部功能', included: true },
      { text: '团队协作空间', included: true },
      { text: '共享场景模板', included: true },
      { text: 'API 接入', included: true },
      { text: 'SSO 单点登录', included: true },
      { text: '专属支持', included: true },
    ],
    cta: '联系销售',
    icon: Building2,
  },
]
