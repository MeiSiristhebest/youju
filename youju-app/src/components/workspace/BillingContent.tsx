import {
  ArrowLeft,
  Check,
  ChevronRight,
  CreditCard,
  Crown,
  DollarSign,
  Gauge,
  Settings,
  TrendingUp,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { PRICING_PLANS } from '../../constants/pricing'
import { cn } from '../../lib/utils'
import { billingApi, type UsageStats } from '../../services/billingApi'

interface BillingContentProps {
  onClose?: () => void
}

export function BillingContent({ onClose }: BillingContentProps) {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly')
  const [currentPlan, setCurrentPlan] = useState('free')
  const [usage, setUsage] = useState<UsageStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchUsage = async () => {
      setLoading(true)
      try {
        const stats = await billingApi.getUsageStats()
        setUsage(stats)
      } catch (error) {
        console.error('Failed to fetch usage stats:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchUsage()
  }, [])

  const getPrice = (plan: (typeof PRICING_PLANS)[0]) => {
    if (plan.price === 0) return '免费'
    if (billingCycle === 'yearly') {
      return `¥${Math.round(plan.price * 10)}`
    }
    return `¥${plan.price}`
  }

  const getUnit = (plan: (typeof PRICING_PLANS)[0]) => {
    if (plan.price === 0) return ''
    return billingCycle === 'yearly' ? `/月·年付` : plan.priceUnit
  }

  const formatNumber = (n: number | undefined) => {
    if (n === undefined || n === null || isNaN(n)) return '0'
    if (n >= 1000000) return `${(n / 1000000).toFixed(2)}M`
    if (n >= 1000) return `${(n / 1000).toFixed(1)}K`
    return n.toString()
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between px-6 py-4 border-b border-rule shrink-0">
        <div className="flex items-center gap-3">
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium text-ink-muted hover:text-ink hover:bg-paper-dark/50 transition-colors shrink-0"
            >
              <ArrowLeft size={14} strokeWidth={2} />
              返回
            </button>
          )}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center">
              <Crown size={15} className="text-paper" />
            </div>
            <div>
              <h2 className="text-sm font-medium text-ink">订阅与计费</h2>
              <p className="text-[10px] text-ink-faint">选择适合你的方案，随时升级或降级</p>
            </div>
          </div>
        </div>
      </div>

      <div className="px-6 py-4 border-b border-rule/60 bg-paper-dark/30 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CreditCard size={13} strokeWidth={1.5} className="text-ink-muted" />
            <span className="text-xs text-ink-muted">当前方案：</span>
            <span className="text-xs font-medium text-ink">
              {PRICING_PLANS.find((p) => p.id === currentPlan)?.name}
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

      <div className="flex-1 overflow-y-auto p-6">
        {/* 使用统计卡片 */}
        <div className="mb-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-ink flex items-center gap-2">
              <Gauge size={16} strokeWidth={1.5} className="text-accent" />
              Token 使用统计
            </h3>
            {loading && (
              <div className="w-5 h-5 border-2 border-rule border-t-accent rounded-full animate-spin" />
            )}
          </div>

          {loading ? (
            <div className="bg-paper-dark/30 border border-rule/50 rounded-xl p-6">
              <div className="grid grid-cols-4 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="space-y-2">
                    <div className="h-4 bg-paper-dark/50 rounded w-full" />
                    <div className="h-6 bg-paper-dark/30 rounded w-20" />
                  </div>
                ))}
              </div>
            </div>
          ) : usage ? (
            <div className="bg-paper-dark/30 border border-rule/50 rounded-xl p-5">
              <div className="grid grid-cols-4 gap-4 mb-4">
                <div>
                  <div className="text-[11px] text-ink-faint mb-1">总 Token</div>
                  <div className="text-base font-semibold text-ink">
                    {formatNumber(usage.totalTokens)}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] text-ink-faint mb-1">Prompt</div>
                  <div className="text-base font-semibold text-accent">
                    {formatNumber(usage.promptTokens)}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] text-ink-faint mb-1">Completion</div>
                  <div className="text-base font-semibold text-accent-secondary">
                    {formatNumber(usage.completionTokens)}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] text-ink-faint mb-1">预估费用</div>
                  <div className="text-base font-semibold text-ink">
                    ${(usage.estimatedCost ?? 0).toFixed(4)}
                  </div>
                </div>
              </div>

              {/* Token 分布进度条 */}
              <div className="mb-4">
                <div className="h-2 bg-paper-dark rounded-full overflow-hidden flex">
                  <div
                    className="bg-accent/60 h-full transition-all duration-500"
                    style={{
                      width: `${usage.totalTokens > 0 ? (usage.promptTokens / usage.totalTokens) * 100 : 0}%`,
                    }}
                  />
                  <div
                    className="bg-accent-secondary/60 h-full transition-all duration-500"
                    style={{
                      width: `${usage.totalTokens > 0 ? (usage.completionTokens / usage.totalTokens) * 100 : 0}%`,
                    }}
                  />
                </div>
                <div className="flex justify-between mt-1.5">
                  <span className="text-[10px] text-ink-faint flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-accent/60" />
                    Prompt
                  </span>
                  <span className="text-[10px] text-ink-faint flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-accent-secondary/60" />
                    Completion
                  </span>
                </div>
              </div>

              {/* 模型使用排行 */}
              {usage.byModel && usage.byModel.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <TrendingUp size={12} strokeWidth={1.5} className="text-ink-faint" />
                    <span className="text-[10px] font-medium text-ink-faint uppercase tracking-[0.1em]">
                      按模型统计
                    </span>
                  </div>
                  <div className="space-y-2">
                    {usage.byModel.slice(0, 5).map((item) => (
                      <div key={item.model} className="flex items-center gap-3">
                        <span className="text-xs text-ink-muted w-24 truncate">
                          {item.model || '未知'}
                        </span>
                        <div className="flex-1 h-1.5 bg-paper-dark rounded-full overflow-hidden">
                          <div
                            className="h-full bg-accent/50 rounded-full transition-all duration-500"
                            style={{
                              width: `${(item.tokens / Math.max(...usage.byModel.map((m) => m.tokens))) * 100}%`,
                            }}
                          />
                        </div>
                        <span className="text-[11px] text-ink-faint w-16 text-right">
                          {formatNumber(item.tokens)}
                        </span>
                        <span className="text-[11px] text-accent w-16 text-right">
                          ${(item.estimatedCost ?? 0).toFixed(4)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-paper-dark/30 border border-rule/50 rounded-xl p-6 text-center">
              <p className="text-xs text-ink-faint">暂无使用数据</p>
            </div>
          )}
        </div>

        {/* 费用估算 */}
        {usage && (
          <div className="mb-6">
            <div className="bg-accent-bg/20 border border-accent-faint/40 rounded-xl p-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-ink flex items-center gap-2">
                    <DollarSign size={16} strokeWidth={1.5} className="text-accent" />
                    费用估算
                  </h3>
                  <p className="text-[11px] text-ink-faint mt-0.5">
                    基于当前使用量按专业版费率计算
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-xl font-bold text-ink">
                    ¥{((usage.estimatedCost ?? 0) * 7.2).toFixed(2)}
                  </div>
                  <div className="text-[10px] text-ink-faint">
                    约 ${(usage.estimatedCost ?? 0).toFixed(4)}
                  </div>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-accent-faint/30">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-ink-muted">本月分析次数</span>
                  <span className="text-ink font-medium">{usage.totalAnalyses ?? 0} 次</span>
                </div>
                <div className="flex items-center justify-between text-[11px] mt-1">
                  <span className="text-ink-muted">成功率</span>
                  <span className="text-ink font-medium">{usage.successRate ?? 0}%</span>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {PRICING_PLANS.map((plan) => {
            const Icon = plan.icon
            const isCurrentPlan = currentPlan === plan.id
            return (
              <div
                key={plan.id}
                className={cn(
                  'relative rounded-xl border transition-all',
                  plan.highlighted
                    ? 'border-accent/50 bg-paper-dark/50 shadow-lg shadow-accent/10'
                    : 'border-rule bg-paper-dark/20 hover:border-accent/30',
                )}
              >
                {plan.highlighted && (
                  <div className="absolute -top-2.5 left-1/2 -translate-x-1/2">
                    <span className="px-2.5 py-0.5 bg-accent text-paper text-[10px] font-medium rounded-full">
                      最受欢迎
                    </span>
                  </div>
                )}
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-7 h-7 rounded-lg bg-accent-bg flex items-center justify-center">
                      {Icon && <Icon size={13} className="text-accent" />}
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
                        ? 'bg-paper-dark text-ink-muted border border-rule/60 cursor-default'
                        : plan.highlighted
                          ? 'bg-accent text-paper hover:bg-accent-soft shadow-lg shadow-accent/20'
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
                        {feature.included ? (
                          <Check
                            size={11}
                            strokeWidth={2}
                            className="text-accent shrink-0 mt-0.5"
                          />
                        ) : (
                          <span className="w-[11px] h-[11px] rounded border border-rule/60 shrink-0 mt-0.5 flex items-center justify-center">
                            <span className="w-1 h-1 rounded-full bg-ink-faint/50" />
                          </span>
                        )}
                        <span
                          className={cn(
                            'text-[11px] leading-relaxed',
                            feature.included ? 'text-ink-muted' : 'text-ink-faint line-through',
                          )}
                        >
                          {feature.text}
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

      <div className="px-6 py-4 border-t border-rule/60 bg-paper-dark/30 shrink-0">
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
        </div>
      </div>
    </div>
  )
}
