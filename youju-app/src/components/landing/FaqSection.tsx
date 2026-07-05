import { useGSAP } from '@gsap/react'
import { useRef } from 'react'
import { gsap } from '../../lib/gsap'
import { Accordion } from '../ui/Accordion'
import { SectionTitle } from '../ui/SectionTitle'

const faqs = [
  {
    id: 'faq-1',
    title: '有据的 AI 分析准确率如何？',
    content:
      '有据采用 7 步推理流水线，每条结论都需通过证据校验（自检循环）才能输出。结论附置信度评分（50%-99%），低于阈值的判断会标注"低置信"。但 AI 分析仅供参考，不构成法律或专业建议，重大决策请结合人工判断。',
  },
  {
    id: 'faq-2',
    title: '我的数据安全吗？会不会被用于训练？',
    content:
      '所有数据传输全程 TLS 加密，每个用户数据独立隔离，互不可见。我们不会收集、出售或用于训练你的任何数据。你可以随时删除分析记录，删除后数据不留痕。核心推理流程开源可审查。',
  },
  {
    id: 'faq-3',
    title: '支持哪些文件格式？',
    content:
      '当前支持 PDF、Word（.docx）、图片（PNG/JPG）、网页 URL（自动抓取）、纯文本粘贴、Excel（.xlsx）、PowerPoint（.pptx）、Markdown。文件大小限制 50MB。更多格式持续支持中。',
  },
  {
    id: 'faq-4',
    title: '分析一次需要多长时间？',
    content:
      '取决于材料数量和复杂度。单份材料通常 30-60 秒，多源交叉验证场景约 1-3 分钟。分析过程实时显示 7 步推理进度，可中途查看部分结果。专业版用户享受优先队列，等待时间更短。',
  },
  {
    id: 'faq-5',
    title: '可以导出分析报告吗？',
    content:
      '专业版及以上支持导出。报告格式包含 PDF（适合分享）和 Markdown（适合二次编辑）。报告内容含结论摘要、风险列表、证据链引用，每条结论可点击溯源到原文位置。',
  },
  {
    id: 'faq-6',
    title: '免费版有什么限制？',
    content:
      '免费版每月 3 次分析，仅支持基础格式（PDF / 纯文本），历史记录保留 7 天。适合偶尔使用或体验产品。专业版解锁无限分析、全格式、永久历史、导出报告等功能。',
  },
]

export function FaqSection() {
  const sectionRef = useRef<HTMLElement>(null)

  useGSAP(
    () => {
      const items = gsap.utils.toArray<HTMLElement>('[data-faq-item]')
      if (items.length === 0) return

      gsap.from(items, {
        y: 20,
        opacity: 0,
        stagger: 0.06,
        duration: 0.6,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: sectionRef.current,
          start: 'top 75%',
          once: true,
        },
      })
    },
    { scope: sectionRef },
  )

  return (
    <section ref={sectionRef} id="faq" className="relative py-24 lg:py-32 px-6 lg:px-12">
      <div className="mx-auto max-w-4xl">
        <SectionTitle
          variant="centered"
          eyebrow="FAQ"
          title="常见问题"
          description="还有其他问题？欢迎随时联系我们。"
        />

        <div data-faq-item className="mt-16">
          <Accordion
            items={faqs.map((faq, i) => ({
              ...faq,
              icon: (
                <span className="font-mono text-xs tracking-widest text-ink-faint">0{i + 1}</span>
              ),
            }))}
            defaultOpenId="faq-1"
          />
        </div>
      </div>
    </section>
  )
}
