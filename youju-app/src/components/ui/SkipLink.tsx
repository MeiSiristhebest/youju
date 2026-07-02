interface SkipLinkProps {
  targetId: string
  label?: string
}

export function SkipLink({ targetId, label = '跳转到主要内容' }: SkipLinkProps) {
  return (
    <a
      href={`#${targetId}`}
      className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[2000] focus:px-4 focus:py-2 focus:bg-ink focus:text-paper focus:rounded-lg focus:text-sm focus:font-medium focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2"
    >
      {label}
    </a>
  )
}
