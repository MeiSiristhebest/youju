import { useGSAP } from '@gsap/react'
import { FileCode, FileText, Globe, Image, Link2, Presentation, Sheet, Type } from 'lucide-react'
import { useRef } from 'react'
import { gsap } from '../../lib/gsap'
import { SectionTitle } from '../ui/SectionTitle'

const formats = [
  { name: 'PDF 文档', extensions: '.pdf', icon: FileText },
  { name: 'Word 文档', extensions: '.docx', icon: FileText },
  { name: '图片截图', extensions: '.png .jpg', icon: Image },
  { name: '网页 URL', extensions: 'https://', icon: Link2 },
  { name: '纯文本', extensions: 'paste', icon: Type },
  { name: 'Excel 表格', extensions: '.xlsx', icon: Sheet },
  { name: '演示文稿', extensions: '.pptx', icon: Presentation },
  { name: 'Markdown', extensions: '.md', icon: FileCode },
  { name: '网页抓取', extensions: 'crawl', icon: Globe },
]

export function FormatsSection() {
  const sectionRef = useRef<HTMLElement>(null)

  useGSAP(
    () => {
      const cards = gsap.utils.toArray<HTMLElement>('[data-format-card]')
      if (cards.length === 0) return

      gsap.from(cards, {
        y: 30,
        opacity: 0,
        stagger: { each: 0.06, from: 'start' },
        duration: 0.7,
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
    <section
      ref={sectionRef}
      id="formats"
      className="relative py-24 lg:py-32 px-6 lg:px-12 bg-paper-dark/30"
    >
      <div className="mx-auto max-w-7xl">
        <SectionTitle
          variant="centered"
          eyebrow="INPUT FORMATS"
          title="支持多种材料格式"
          description="上传聊天记录截图、合同文档、邮件导出，或直接粘贴 URL 抓取网页。"
        />

        <div className="mt-16 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-3 lg:gap-4">
          {formats.map((fmt) => {
            const Icon = fmt.icon
            return (
              <div
                key={fmt.name}
                data-format-card
                className="group relative rounded-lg border border-rule/60 bg-paper/60 p-5 transition-all hover:border-accent/40 hover:bg-accent-bg/40 hover:-translate-y-0.5"
              >
                <div className="flex items-start gap-4">
                  <div className="shrink-0 w-10 h-10 rounded-md bg-paper-dark/60 flex items-center justify-center text-ink-muted group-hover:bg-accent group-hover:text-paper transition-colors">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-ink text-sm">{fmt.name}</div>
                    <div className="mt-1 text-[11px] font-mono text-ink-faint tracking-wide">
                      {fmt.extensions}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        <p className="mt-10 text-center text-xs text-ink-faint">
          更多格式持续支持中 · 也可通过 URL 抓取网页内容 · 文件大小限制 50MB
        </p>
      </div>
    </section>
  )
}
