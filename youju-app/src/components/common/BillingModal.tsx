import {
  Building2,
  Check,
  ChevronRight,
  CreditCard,
  Crown,
  Settings,
  Sparkles,
  X,
  Zap,
} from 'lucide-react'
import { useState } from 'react'
import { cn } from '../../lib/utils'

interface PricingPlan {
  id: string
  name: string
  price: number
  priceUnit: string
  description: string
  features: string[]
  highlighted?: boolean
  cta: string
  icon: any
  color: string
}

const PLANS: PricingPlan[] = [
  {
    id: 'free',
    name: '免费版',
    price: 0,
    priceUnit: '/月',
    description: '适合个人体验和轻度使用',
    features: ['每月 10 次分析', '最多 5 份材料/次', '基础风险识别', '标准导出格式', '社区支持'],
    cta: '当前方案',
    icon: Sparkles,
    color: 'from-ink-faint to-ink-muted',
  },
  {
    id: 'pro',
    name: '专业版',
    price: 99,
    priceUnit: '/月',
    description: '适合专业人士和小型团队',
    features: [
      '每月 100 次分析',
      '最多 20 份材料/次',
      '高级风险分析与证据链',
      '所有导出格式（PDF/Word）',
      '优先技术支持',
      '自定义分析模板',
    ],
    highlighted: true,
    cta: '升级专业版',
    icon: Zap,
    color: 'from-accent to-accent-tertiary',
  },
  {
    id: 'team',
    name: '团队版',
    price: 299,
    priceUnit: '/月/人',
    description: '适合团队协作和企业用户',
    features: [
      '专业版全部功能',
      '无限分析次数',
      '无限材料上传',
      '团队协作与权限管理',
      'API 访问',
      '专属客户成功经理',
      'SSO 单点登录',
      '数据驻留选项',
    ],
    cta: '联系销售',
    icon: Building2,
    color: 'from-amber-500 to-orange-500',
  },
]

interface BillingModalProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
}

export function BillingModal({ isOpen, onOpenChange }: BillingModalProps) {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly')
  const [currentPlan, setCurrentPlan] = useState('free')

  if (!isOpen) return null

  const getPrice = (plan: PricingPlan) => {
    if (plan.price === 0) return '免费'
    if (billingCycle === 'yearly') {
      return `¥${Math.round((plan.price * 10 * 12) / 12)}`
    }
    return `¥${plan.price}`
  }

  const getUnit = (plan: PricingPlan) => {
    if (plan.price === 0) return ''
    return billingCycle === 'yearly' ? `${plan.priceUnit}·年付` : plan.priceUnit
  }

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
        onClick={() => onOpenChange(false)}
      />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="w-full max-w-3xl bg-paper border border-rule rounded-2xl shadow-2xl shadow-black/20 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          <div className="flex items-center justify-between px-6 py-4 border-b border-rule">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
                <Crown size={15} className="text-white" />
              </div>
              <div>
                <h2 className="text-sm font-medium text-ink">订阅与计费</h2>
                <p className="text-[10px] text-ink-faint">选择适合你的方案，随时升级或降级</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="p-1.5 rounded-md text-ink-faint hover:text-ink hover:bg-paper-dark transition-colors"
            >
              <X size={14} strokeWidth={1.5} />
            </button>
          </div>

          <div className="px-6 py-4 border-b border-rule/60 bg-paper-dark/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CreditCard size={13} strokeWidth={1.5} className="text-ink-muted" />
                <span className="text-xs text-ink-muted">当前方案：</span>
                <span className="text-xs font-medium text-ink">
                  {PLANS.find((p) => p.id === currentPlan)?.name}
                </span>
              </div>
              <div className="flex items-center gap-1 p-0.5 bg-paper-dark border border-rule rounded-lg">
                <button
                  type="button"
                  onClick={() => setBillingCycle('monthly')}
                  className={cn(
                    'px-3 py-1 rounded-md text-[11px] font-medium transition-all',
                    billingCycle === 'monthly'
                      ? 'bg-paper text-ink shadow-sm border border-rule/60'
                      : 'text-ink-faint hover:text-ink-muted',
                  )}
                >
                  月付
                </button>
                <button
                  type="button"
                  onClick={() => setBillingCycle('yearly')}
                  className={cn(
                    'px-3 py-1 rounded-md text-[11px] font-medium transition-all flex items-center gap-1',
                    billingCycle === 'yearly'
                      ? 'bg-paper text-ink shadow-sm border border-rule/60'
                      : 'text-ink-faint hover:text-ink-muted',
                  )}
                >
                  年付
                  <span className="text-[9px] font-medium text-success bg-success-bg px-1 py-0.5 rounded">
                    省 17%
                  </span>
                </button>
              </div>
            </div>
          </div>

          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {PLANS.map((plan) => {
                const Icon = plan.icon
                const isCurrentPlan = currentPlan === plan.id
                return (
                  <div
                    key={plan.id}
                    className={cn(
                      'relative rounded-xl border transition-all',
                      plan.highlighted
                        ? 'border-accent/50 bg-gradient-to-b from-accent-bg/30 to-transparent shadow-lg shadow-accent/10'
                        : 'border-rule bg-paper-dark/30 hover:border-rule/80',
                    )}
                  >
                    {plan.highlighted && (
                      <div className="absolute -top-2.5 left-1/2 -translate-x-1/2">
                        <span className="px-2.5 py-0.5 bg-gradient-to-r from-accent to-accent-tertiary text-paper text-[10px] font-medium rounded-full">
                          最受欢迎
                        </span>
                      </div>
                    )}
                    <div className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <div
                          className={cn(
                            'w-7 h-7 rounded-lg bg-gradient-to-br flex items-center justify-center',
                            plan.color,
                          )}
                        >
                          <Icon size={13} className="text-white" />
                        </div>
                        <span className="text-sm font-medium text-ink">{plan.name}</span>
                      </div>
                      <p className="text-[11px] text-ink-faint mb-3 h-8">{plan.description}</p>
                      <div className="mb-4">
                        <span className="text-2xl font-bold text-ink font-display tracking-tight">
                          {getPrice(plan)}
                        </span>
                        <span className="text-[11px] text-ink-faint">{getUnit(plan)}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setCurrentPlan(plan.id)}
                        disabled={isCurrentPlan || plan.id === 'team'}
                        className={cn(
                          'w-full py-2 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1.5',
                          isCurrentPlan
                            ? 'bg-paper-dark text-ink-faint border border-rule/60 cursor-default'
                            : plan.highlighted
                              ? 'bg-gradient-to-r from-accent to-accent-tertiary text-paper hover:opacity-90 shadow-lg shadow-accent/20'
                              : 'bg-ink text-paper hover:bg-accent',
                        )}
                      >
                        {isCurrentPlan ? (
                          <>
                            <Check size={12} strokeWidth={2} />
                            {plan.cta}
                          </>
                        ) : plan.id === 'team' ? (
                          <>
                            {plan.cta}
                            <ChevronRight size={12} strokeWidth={1.5} />
                          </>
                        ) : (
                          plan.cta
                        )}
                      </button>
                    </div>
                    <div className="px-4 pb-4 pt-2 border-t border-rule/40">
                      <p className="text-[10px] font-medium text-ink-faint uppercase tracking-[0.1em] mb-2">
                        包含功能
                      </p>
                      <ul className="space-y-1.5">
                        {plan.features.map((feature, i) => (
                          <li key={i} className="flex items-start gap-1.5">
                            <Check
                              size={11}
                              strokeWidth={2}
                              className="text-success shrink-0 mt-0.5"
                            />
                            <span className="text-[11px] text-ink-muted leading-relaxed">
                              {feature}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="px-6 py-4 border-t border-rule/60 bg-paper-dark/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 text-[11px] text-ink-faint">
                  <Settings size={11} strokeWidth={1.5} />
                  <span>支付方式：微信支付</span>
                </div>
                <span className="text-[10px] text-ink-faint">·</span>
                <div className="text-[11px] text-ink-faint">
                  下次续费：<span className="text-ink-muted">2025-01-15</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="px-4 py-1.5 bg-paper-dark text-ink rounded-md text-xs font-medium hover:bg-paper hover:border-rule border border-rule/60 transition-colors"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
