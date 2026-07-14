/**
 * MarkdownContent - 轻量 Markdown 渲染组件
 *
 * 使用 react-markdown + remark-gfm 渲染 AI 回复内容。
 * - 支持标题、列表、表格、代码块、引用、粗体/斜体等
 * - 样式与设计系统保持一致（Tailwind utility classes）
 * - 流式渲染时也可使用（支持不完整 Markdown 的优雅降级）
 */
import { memo } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { cn } from '@/lib/utils'

interface MarkdownContentProps {
  content: string
  className?: string
}

/**
 * 自定义组件映射：控制每个 Markdown 元素的渲染样式
 * 参考 ChatGPT / Claude 的简洁排版风格
 */
const markdownComponents = {
  h1: ({ children }: any) => (
    <h1 className="mt-4 mb-2 text-lg font-semibold text-ink first:mt-0">{children}</h1>
  ),
  h2: ({ children }: any) => (
    <h2 className="mt-3.5 mb-2 text-base font-semibold text-ink first:mt-0">{children}</h2>
  ),
  h3: ({ children }: any) => (
    <h3 className="mt-3 mb-1.5 text-sm font-semibold text-ink first:mt-0">{children}</h3>
  ),
  h4: ({ children }: any) => (
    <h4 className="mt-2.5 mb-1 text-sm font-medium text-ink first:mt-0">{children}</h4>
  ),
  p: ({ children }: any) => (
    <p className="my-1.5 leading-relaxed first:mt-0 last:mb-0">{children}</p>
  ),
  ul: ({ children }: any) => (
    <ul className="my-1.5 ml-5 list-disc space-y-1 marker:text-ink-faint">{children}</ul>
  ),
  ol: ({ children }: any) => (
    <ol className="my-1.5 ml-5 list-decimal space-y-1 marker:text-ink-faint">{children}</ol>
  ),
  li: ({ children }: any) => <li className="leading-relaxed">{children}</li>,
  strong: ({ children }: any) => <strong className="font-semibold text-ink">{children}</strong>,
  em: ({ children }: any) => <em className="italic">{children}</em>,
  blockquote: ({ children }: any) => (
    <blockquote className="my-2 border-l-2 border-accent/40 pl-3 text-ink-muted italic">
      {children}
    </blockquote>
  ),
  code: ({ inline, className, children }: any) => {
    if (inline) {
      return (
        <code
          className={cn(
            'rounded bg-paper-dark px-1.5 py-0.5',
            'font-mono text-[0.85em] text-accent',
          )}
        >
          {children}
        </code>
      )
    }
    return <code className={cn('block font-mono text-sm', className)}>{children}</code>
  },
  pre: ({ children }: any) => (
    <pre className={cn('my-2 overflow-x-auto rounded-lg p-3', 'bg-ink/5 border border-rule/40')}>
      {children}
    </pre>
  ),
  a: ({ href, children }: any) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-accent underline underline-offset-2 hover:text-accent/80"
    >
      {children}
    </a>
  ),
  table: ({ children }: any) => (
    <div className="my-2 overflow-x-auto">
      <table className="w-full border-collapse text-sm">{children}</table>
    </div>
  ),
  th: ({ children }: any) => (
    <th className="border border-rule/50 bg-paper-dark px-3 py-1.5 text-left font-medium text-ink">
      {children}
    </th>
  ),
  td: ({ children }: any) => (
    <td className="border border-rule/50 px-3 py-1.5 text-ink">{children}</td>
  ),
  hr: () => <hr className="my-3 border-rule/40" />,
}

function MarkdownContentImpl({ content, className }: MarkdownContentProps) {
  return (
    <div className={cn('text-base text-ink break-words', className)}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
        {content}
      </ReactMarkdown>
    </div>
  )
}

export const MarkdownContent = memo(MarkdownContentImpl)
