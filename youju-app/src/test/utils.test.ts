import { describe, expect, it } from 'vitest'
import { cn } from '../../src/lib/utils'

describe('cn 工具函数', () => {
  it('合并多个类名字符串', () => {
    expect(cn('px-2', 'py-1', 'text-sm')).toBe('px-2 py-1 text-sm')
  })

  it('处理条件类名（falsy 值被过滤）', () => {
    expect(cn('base', false, null, undefined, 'active')).toBe('base active')
  })

  it('处理对象语法', () => {
    expect(cn('base', { active: true, disabled: false })).toBe('base active')
  })

  it('处理数组语法', () => {
    expect(cn('base', ['px-2', 'py-1'])).toBe('base px-2 py-1')
  })

  it('tailwind-merge 解决冲突（后者优先）', () => {
    expect(cn('px-2', 'px-4')).toBe('px-4')
    expect(cn('text-sm', 'text-lg')).toBe('text-lg')
  })

  it('tailwind-merge 保留非冲突类', () => {
    expect(cn('px-2', 'text-sm', 'px-4')).toBe('text-sm px-4')
  })

  it('空输入返回空字符串', () => {
    expect(cn()).toBe('')
    expect(cn('')).toBe('')
    expect(cn(false, null, undefined)).toBe('')
  })
})
