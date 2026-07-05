import { describe, expect, it } from 'vitest'
import { chunkDocument, estimateTokenCount } from '../src/infrastructure/fileParser/chunker.js'

function generateChineseText(charCount: number): string {
  const sentence = '这是一段用于测试分块策略的中文文本，包含若干标点符号。'
  const builder: string[] = []
  let remaining = charCount
  while (remaining > 0) {
    if (remaining >= sentence.length) {
      builder.push(sentence)
      remaining -= sentence.length
    } else {
      builder.push(sentence.substring(0, remaining))
      remaining = 0
    }
  }
  return builder.join('')
}

describe('chunkDocument - 中文长文本分块', () => {
  it('8000 字文本应产生合理数量的 parent 块', () => {
    const text = generateChineseText(8000)
    const result = chunkDocument(text, {
      parentChunkSize: 1024,
      childChunkSize: 256,
      overlap: 0.15,
    })

    expect(result.parents.length).toBeGreaterThanOrEqual(2)
    expect(result.parents.length).toBeLessThanOrEqual(5)

    for (const parent of result.parents) {
      expect(parent.content.length).toBeLessThanOrEqual(1024 * 4 + 200)
    }
  })

  it('每个 parent 内 child 数量合理（约 4-5 个）', () => {
    const text = generateChineseText(8000)
    const result = chunkDocument(text)

    for (const parent of result.parents) {
      const childrenOfParent = result.children.filter((c) => c.parentChunkId === parent.id)
      expect(childrenOfParent.length).toBeGreaterThanOrEqual(1)
      expect(childrenOfParent.length).toBeLessThanOrEqual(8)
    }
  })

  it('每个 child 的 parentChunkId 指向已存在的 parent', () => {
    const text = generateChineseText(8000)
    const result = chunkDocument(text)

    const parentIds = new Set(result.parents.map((p) => p.id))
    for (const child of result.children) {
      expect(child.parentChunkId).not.toBeNull()
      expect(parentIds.has(child.parentChunkId as string)).toBe(true)
    }
  })

  it('offset 准确性：chunk.content === text.slice(charOffsetStart, charOffsetEnd)', () => {
    const text = generateChineseText(8000)
    const result = chunkDocument(text)

    for (const parent of result.parents) {
      const slice = text.substring(parent.charOffsetStart, parent.charOffsetEnd)
      expect(slice).toBe(parent.content)
    }

    for (const child of result.children) {
      const slice = text.substring(child.charOffsetStart, child.charOffsetEnd)
      expect(slice).toBe(child.content)
    }
  })

  it('tokenCount 与字符数一致（chars/4 向上取整）', () => {
    const text = generateChineseText(800)
    const result = chunkDocument(text)

    for (const parent of result.parents) {
      expect(parent.tokenCount).toBe(estimateTokenCount(parent.content))
      expect(parent.tokenCount).toBe(Math.ceil(parent.content.length / 4))
    }
  })
})

describe('chunkDocument - Markdown 标题提取', () => {
  it('能正确提取 heading_path', () => {
    const markdownText = `# 第一章 总则

这是第一章的内容，包含一些基本介绍。

## 1.1 适用范围

本节描述适用范围。

## 1.2 术语定义

本节定义术语。
`
    const result = chunkDocument(markdownText)

    const section1 = result.parents.find((p) => p.content.includes('这是第一章的内容'))
    expect(section1).toBeDefined()
    expect(section1?.headingPath).toBe('# 第一章 总则')

    const section1_1 = result.parents.find((p) => p.content.includes('本节描述适用范围'))
    expect(section1_1).toBeDefined()
    expect(section1_1?.headingPath).toBe('# 第一章 总则 > ## 1.1 适用范围')
  })

  it('非 Markdown 文档 heading_path 为空字符串', () => {
    const text = generateChineseText(2000)
    const result = chunkDocument(text)

    for (const parent of result.parents) {
      expect(parent.headingPath).toBe('')
    }
  })
})

describe('chunkDocument - 中文分隔符优先级', () => {
  it('在 。处优先切分', () => {
    const sentence = '这是第一句话。这是第二句话。这是第三句话。'
    const longText = sentence.repeat(100)
    const result = chunkDocument(longText, {
      parentChunkSize: 64,
      childChunkSize: 16,
      overlap: 0.1,
    })

    expect(result.parents.length).toBeGreaterThan(1)

    for (const parent of result.parents) {
      if (parent.content.length < longText.length) {
        const lastChar = parent.content.charAt(parent.content.length - 1)
        const acceptableEndings = ['。', '\n', ' ']
        expect(acceptableEndings).toContain(lastChar)
      }
    }
  })

  it('在 \\n\\n 处优先于 。切分', () => {
    const paragraph = '段落一的内容。段落一的内容。'
    const text = Array.from({ length: 10 }, () => paragraph).join('\n\n')
    const result = chunkDocument(text, {
      parentChunkSize: 32,
      childChunkSize: 8,
      overlap: 0,
    })

    expect(result.parents.length).toBeGreaterThan(1)

    const splitAtParagraph = result.parents.some((p) => {
      const lastChar = p.content.charAt(p.content.length - 1)
      return lastChar === '\n' || p.content.endsWith('\n\n')
    })
    expect(splitAtParagraph).toBe(true)
  })
})

describe('chunkDocument - 边界情况', () => {
  it('空文本返回空结果', () => {
    const result = chunkDocument('')
    expect(result.parents).toHaveLength(0)
    expect(result.children).toHaveLength(0)
  })

  it('短文本（小于 parentChunkSize）返回单个 parent', () => {
    const text = '短文本'
    const result = chunkDocument(text)
    expect(result.parents).toHaveLength(1)
    expect(result.parents[0].content).toBe('短文本')
    expect(result.parents[0].charOffsetStart).toBe(0)
    expect(result.parents[0].charOffsetEnd).toBe(3)
  })

  it('所有 parent 的 chunkIndex 单调递增', () => {
    const text = generateChineseText(8000)
    const result = chunkDocument(text)

    for (let i = 0; i < result.parents.length; i++) {
      expect(result.parents[i].chunkIndex).toBe(i)
    }
  })

  it('同一 parent 下的 child chunkIndex 从 0 递增', () => {
    const text = generateChineseText(8000)
    const result = chunkDocument(text)

    for (const parent of result.parents) {
      const childrenOfParent = result.children.filter((c) => c.parentChunkId === parent.id)
      for (let i = 0; i < childrenOfParent.length; i++) {
        expect(childrenOfParent[i].chunkIndex).toBe(i)
      }
    }
  })
})
