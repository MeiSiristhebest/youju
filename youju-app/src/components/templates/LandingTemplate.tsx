import type { ReactNode } from 'react'

export interface LandingTemplateProps {
  navigation?: ReactNode
  hero?: ReactNode
  sections?: ReactNode[]
  footer?: ReactNode
  className?: string
  children?: ReactNode
}

export function LandingTemplate({
  navigation,
  hero,
  sections = [],
  footer,
  className = '',
  children,
}: LandingTemplateProps) {
  return (
    <div className={`relative min-h-dvh bg-paper text-ink overflow-x-hidden ${className}`}>
      {navigation && <header className="fixed top-0 left-0 right-0 z-50">{navigation}</header>}

      <main id="main-content">
        {hero && <section>{hero}</section>}
        {sections.map((section, index) => (
          <section key={index}>{section}</section>
        ))}
        {children}
      </main>

      {footer && <footer>{footer}</footer>}
    </div>
  )
}
