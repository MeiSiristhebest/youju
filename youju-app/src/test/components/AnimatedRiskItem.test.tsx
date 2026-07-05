import { act, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { AnimatedRiskItem } from '../../components/workspace/results/AnimatedRiskItem'
import type { Risk } from '../../types'

vi.mock('../../components/common/Toast', () => ({
  useToast: () => ({
    showToast: vi.fn(),
  }),
}))

const mockRisk: Risk = {
  id: 'risk-1',
  title: '支付条款冲突',
  description: '首付款比例和支付时间在合同与补充协议中不一致',
  level: 'critical',
  type: 'conflict',
  confidence: 90,
  dimension: '付款条款',
  sources: ['材料1.pdf', '材料2.pdf'],
  evidence: [
    {
      sourceId: '1',
      sourceName: '材料1.pdf',
      sourceType: 'doc',
      quote: '首期款为 30%',
    },
  ],
}

describe('AnimatedRiskItem', () => {
  it('应该正常渲染风险卡片标题和描述', async () => {
    render(
      <AnimatedRiskItem
        risk={mockRisk}
        index={0}
        isSelected={false}
        onSelect={vi.fn()}
        onEvidenceClick={vi.fn()}
      />,
    )
    expect(screen.getByText('支付条款冲突')).toBeInTheDocument()
    expect(screen.getByText('首付款比例和支付时间在合同与补充协议中不一致')).toBeInTheDocument()
  })

  it('应该渲染风险置信度与维度分类标签', () => {
    render(
      <AnimatedRiskItem
        risk={mockRisk}
        index={0}
        isSelected={false}
        onSelect={vi.fn()}
        onEvidenceClick={vi.fn()}
      />,
    )
    expect(screen.getByText('付款条款')).toBeInTheDocument()
    expect(screen.getByText('置信度 高 (90%)')).toBeInTheDocument()
  })

  it('点击卡片应该触发 onSelect 回调', async () => {
    const handleSelect = vi.fn()
    render(
      <AnimatedRiskItem
        risk={mockRisk}
        index={0}
        isSelected={false}
        onSelect={handleSelect}
        onEvidenceClick={vi.fn()}
      />,
    )
    const button = screen.getByRole('button', { name: /风险：支付条款冲突/ })
    await act(async () => {
      button.click()
    })
    expect(handleSelect).toHaveBeenCalledTimes(1)
  })
})
