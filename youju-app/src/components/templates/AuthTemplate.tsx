import type { ReactNode } from 'react'

export interface AuthTemplateProps {
  children: ReactNode
  title?: string
  subtitle?: string
  logo?: ReactNode
  footer?: ReactNode
  className?: string
}

export function AuthTemplate({
  children,
  title,
  subtitle,
  logo,
  footer,
  className = '',
}: AuthTemplateProps) {
  return (
    <div
      className={`min-h-screen bg-paper text-ink flex items-center justify-center p-4 ${className}`}
    >
      <div className="w-full max-w-md">
        {(logo || title || subtitle) && (
          <div className="text-center mb-8">
            {logo && <div className="mb-4 flex justify-center">{logo}</div>}
            {title && (
              <h1 className="text-2xl font-semibold font-display tracking-tight mb-2">{title}</h1>
            )}
            {subtitle && <p className="text-sm text-ink-muted">{subtitle}</p>}
          </div>
        )}

        <div className="bg-paper border border-rule rounded-2xl p-6 shadow-sm">{children}</div>

        {footer && <div className="mt-6 text-center text-sm text-ink-muted">{footer}</div>}
      </div>
    </div>
  )
}
