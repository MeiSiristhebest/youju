import type { ButtonHTMLAttributes, ReactNode } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  iconLeft?: ReactNode
  iconRight?: ReactNode
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  iconLeft,
  iconRight,
  className = '',
  ...props
}: ButtonProps) {
  const baseStyles =
    'inline-flex items-center justify-center gap-2 font-medium transition-colors transition-transform duration-200 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-accent/50 disabled:opacity-50 disabled:cursor-not-allowed motion-reduce:transition-none'

  const variants = {
    primary: 'bg-ink text-paper hover:bg-ink-soft border border-ink',
    secondary: 'bg-paper-dark/60 text-ink border border-rule hover:bg-paper-dark',
    ghost:
      'bg-paper-dark/60 text-ink-muted hover:text-ink hover:bg-paper-dark border border-rule/60',
  }

  const sizes = {
    sm: 'h-8 px-3 text-xs',
    md: 'h-10 px-4 text-sm',
    lg: 'h-12 px-6 text-base',
  }

  return (
    <button className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`} {...props}>
      {iconLeft && <span className="shrink-0">{iconLeft}</span>}
      {children}
      {iconRight && <span className="shrink-0">{iconRight}</span>}
    </button>
  )
}
