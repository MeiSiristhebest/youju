import { useGSAP } from '@gsap/react'
import { ChevronDown } from 'lucide-react'
import { type ReactNode, useRef, useState } from 'react'
import { gsap } from '../../lib/gsap'
import { cn } from '../../lib/utils'

interface AccordionItemData {
  id: string
  title: string
  content: ReactNode
  icon?: ReactNode
}

interface AccordionProps {
  items: AccordionItemData[]
  defaultOpenId?: string | null
  multiple?: boolean // 是否允许多开，默认 false（单开）
  className?: string
  renderItem?: (item: AccordionItemData, isOpen: boolean) => ReactNode
}

export function Accordion({
  items,
  defaultOpenId = null,
  multiple = false,
  className,
  renderItem,
}: AccordionProps) {
  const [openIds, setOpenIds] = useState<Set<string>>(
    () => new Set(defaultOpenId ? [defaultOpenId] : []),
  )
  const contentRefs = useRef<Map<string, HTMLDivElement>>(new Map())
  const iconRefs = useRef<Map<string, HTMLDivElement>>(new Map())

  const toggle = (id: string) => {
    setOpenIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        if (!multiple) next.clear()
        next.add(id)
      }
      return next
    })
  }

  useGSAP(
    () => {
      // 为每个 item 同步动画状态
      items.forEach((item) => {
        const content = contentRefs.current.get(item.id)
        const icon = iconRefs.current.get(item.id)
        if (!content) return

        const isOpen = openIds.has(item.id)
        if (isOpen) {
          gsap.to(content, {
            height: 'auto',
            opacity: 1,
            duration: 0.4,
            ease: 'power2.out',
            overwrite: true,
          })
          if (icon) {
            gsap.to(icon, { rotate: 180, duration: 0.3, ease: 'power2.out' })
          }
        } else {
          gsap.to(content, {
            height: 0,
            opacity: 0,
            duration: 0.3,
            ease: 'power2.in',
            overwrite: true,
          })
          if (icon) {
            gsap.to(icon, { rotate: 0, duration: 0.3, ease: 'power2.out' })
          }
        }
      })
    },
    { scope: contentRefs, dependencies: [openIds] },
  )

  return (
    <div className={cn('divide-y divide-rule/60', className)}>
      {items.map((item) => {
        const isOpen = openIds.has(item.id)
        return (
          <div key={item.id} className="py-1">
            <button
              type="button"
              onClick={() => toggle(item.id)}
              className="flex w-full items-center justify-between gap-4 py-4 text-left transition-colors hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 rounded-md"
              aria-expanded={isOpen}
            >
              <div className="flex items-center gap-3">
                {item.icon}
                <span className="font-display text-base lg:text-lg font-medium text-ink">
                  {item.title}
                </span>
              </div>
              <div
                ref={(el) => {
                  if (el) iconRefs.current.set(item.id, el)
                }}
                className="shrink-0 text-ink-muted"
              >
                <ChevronDown className="h-4 w-4" />
              </div>
            </button>
            <div
              ref={(el) => {
                if (el) contentRefs.current.set(item.id, el)
              }}
              className="overflow-hidden"
              style={{ height: 0, opacity: 0 }}
            >
              <div className="pb-5 pt-1 pr-8 text-sm text-ink-muted leading-relaxed">
                {renderItem ? renderItem(item, isOpen) : item.content}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
