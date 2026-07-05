import { useGSAP } from '@gsap/react'
import { type ReactNode, useRef } from 'react'
import { gsap } from '../../lib/gsap'
import type { ButtonProps } from './button'
import { Button } from './button'

interface MagneticButtonProps extends Omit<ButtonProps, 'variant' | 'size'> {
  children: ReactNode
  variant?: 'primary' | 'secondary' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  strength?: number
  radius?: number
  iconLeft?: ReactNode
  iconRight?: ReactNode
}

const variantMap = {
  primary: 'default',
  secondary: 'secondary',
  ghost: 'ghost',
} as const

const sizeMap = {
  sm: 'sm',
  md: 'default',
  lg: 'lg',
} as const

export function MagneticButton({
  children,
  onClick,
  variant = 'primary',
  size = 'lg',
  className,
  strength = 0.4,
  radius = 120,
  iconLeft,
  iconRight,
  disabled,
  ...props
}: MagneticButtonProps) {
  const outerRef = useRef<HTMLDivElement>(null)
  const innerRef = useRef<HTMLDivElement>(null)

  useGSAP(
    () => {
      const outer = outerRef.current
      const inner = innerRef.current
      if (!outer || !inner) return

      if (window.matchMedia('(max-width: 1023px)').matches) return
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
      if (disabled) return

      const xTo = gsap.quickTo(inner, 'x', {
        duration: 0.6,
        ease: 'elastic.out(1, 0.4)',
      })
      const yTo = gsap.quickTo(inner, 'y', {
        duration: 0.6,
        ease: 'elastic.out(1, 0.4)',
      })

      const onMouseMove = (e: MouseEvent) => {
        const rect = outer.getBoundingClientRect()
        const centerX = rect.left + rect.width / 2
        const centerY = rect.top + rect.height / 2
        const dx = e.clientX - centerX
        const dy = e.clientY - centerY
        const distance = Math.sqrt(dx * dx + dy * dy)

        if (distance < radius) {
          xTo(dx * strength)
          yTo(dy * strength)
        } else {
          xTo(0)
          yTo(0)
        }
      }

      const onMouseLeave = () => {
        xTo(0)
        yTo(0)
      }

      outer.addEventListener('mousemove', onMouseMove)
      outer.addEventListener('mouseleave', onMouseLeave)

      return () => {
        outer.removeEventListener('mousemove', onMouseMove)
        outer.removeEventListener('mouseleave', onMouseLeave)
      }
    },
    { scope: outerRef, dependencies: [disabled] },
  )

  return (
    <div ref={outerRef} className="inline-block">
      <div ref={innerRef} className="inline-block">
        <Button
          variant={variantMap[variant]}
          size={sizeMap[size]}
          onClick={onClick}
          className={className}
          disabled={disabled}
          data-icon="inline-start"
          {...props}
        >
          {iconLeft}
          {children}
          {iconRight}
        </Button>
      </div>
    </div>
  )
}
