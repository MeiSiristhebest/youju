import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDimensionName(name: string | undefined): string {
  if (!name) return ''
  if (/[\u4e00-\u9fa5]/.test(name)) return name
  return name
    .replace(/_/g, ' ')
    .replace(/(?:^| )(\w)/g, (_, c) => c.toUpperCase())
    .trim()
}
