import type { ReactNode } from 'react'

export interface NavItem {
  id: string
  label: string
  icon?: ReactNode
}

export interface SettingsTemplateProps {
  navItems: NavItem[]
  activeNav: string
  onNavChange: (id: string) => void
  children: ReactNode
  title?: string
  subtitle?: string
  header?: ReactNode
  className?: string
}

export function SettingsTemplate({
  navItems,
  activeNav,
  onNavChange,
  children,
  title,
  subtitle,
  header,
  className = '',
}: SettingsTemplateProps) {
  return (
    <div className={`min-h-screen bg-paper text-ink ${className}`}>
      <div className="flex h-screen">
        <div className="hidden md:flex flex-shrink-0 w-64 border-r border-rule bg-paper flex-col">
          {(title || subtitle) && (
            <div className="px-6 py-5 border-b border-rule">
              {title && (
                <h1 className="text-base font-semibold font-display tracking-tight">{title}</h1>
              )}
              {subtitle && <p className="text-xs text-ink-muted mt-1">{subtitle}</p>}
            </div>
          )}
          <nav className="flex-1 overflow-y-auto py-3 px-3">
            <ul className="space-y-1">
              {navItems.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => onNavChange(item.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors cursor-pointer ${
                      activeNav === item.id
                        ? 'bg-accent-bg text-accent font-medium'
                        : 'text-ink-muted hover:bg-paper-dark hover:text-ink'
                    }`}
                  >
                    {item.icon && <span className="shrink-0">{item.icon}</span>}
                    <span className="flex-1 text-left">{item.label}</span>
                  </button>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {header && (
            <div className="shrink-0 border-b border-rule px-6 py-4 md:hidden">{header}</div>
          )}
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">{children}</div>
          </div>
        </div>
      </div>
    </div>
  )
}
