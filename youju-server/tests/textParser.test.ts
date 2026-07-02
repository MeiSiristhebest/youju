import { describe, expect, it } from 'vitest'
import { parseTextFile } from '../src/infrastructure/fileParser/textParser.js'
import type { FileInput } from '../src/infrastructure/fileParser/types.js'

function makeFile(name: string, content: string, mime = 'text/plain'): FileInput {
  return {
    buffer: Buffer.from(content, 'utf-8'),
    originalname: name,
    mimetype: mime,
    size: Buffer.byteLength(content, 'utf-8'),
  }
}

describe('文本文件解析器', () => {
  it('解析纯文本：清洗多余空白和换行', async () => {
    const file = makeFile('test.txt', 'hello   world\n\n\n\n\nbye')
    const result = await parseTextFile(file, 'txt')
    expect(result.text).toBe('hello world\n\nbye')
    expect(result.meta.parser).toBe('plain-text')
    expect(result.meta.charCount).toBe(result.text.length)
  })

  it('解析纯文本：统一换行符（\\r\\n → \\n）', async () => {
    const file = makeFile('test.txt', 'line1\r\nline2\rline3')
    const result = await parseTextFile(file, 'txt')
    expect(result.text).toBe('line1\nline2\nline3')
  })

  it('解析纯文本：Tab 转空格', async () => {
    const file = makeFile('test.txt', 'col1\t\tcol2')
    const result = await parseTextFile(file, 'txt')
    expect(result.text).toBe('col1 col2')
  })

  it('解析 Markdown：移除标题标记', async () => {
    const file = makeFile('readme.md', '# Title\n## Subtitle\nContent')
    const result = await parseTextFile(file, 'md')
    expect(result.text).toBe('Title\nSubtitle\nContent')
    expect(result.meta.parser).toBe('markdown')
  })

  it('解析 Markdown：移除加粗和斜体', async () => {
    const file = makeFile('readme.md', '**bold** and *italic* and `code`')
    const result = await parseTextFile(file, 'md')
    expect(result.text).toBe('bold and italic and code')
  })

  it('解析 Markdown：移除列表标记', async () => {
    const file = makeFile('readme.md', '- item 1\n- item 2\n1. first\n2. second')
    const result = await parseTextFile(file, 'md')
    expect(result.text).toBe('item 1\nitem 2\nfirst\nsecond')
  })

  it('解析 Markdown：链接保留文本', async () => {
    const file = makeFile('readme.md', '[link text](https://example.com)')
    const result = await parseTextFile(file, 'md')
    expect(result.text).toBe('link text')
  })

  it('解析 HTML：提取正文，移除 script/style', async () => {
    const html =
      '<html><head><title>Page</title><style>body{}</style></head><body><script>alert(1)</script><h1>Hello</h1><p>World</p></body></html>'
    const file = makeFile('page.html', html, 'text/html')
    const result = await parseTextFile(file, 'html')
    expect(result.text).toContain('Hello')
    expect(result.text).toContain('World')
    expect(result.text).not.toContain('alert')
    expect(result.text).not.toContain('body{}')
    expect(result.meta.parser).toBe('cheerio')
  })

  it('解析 JSON：扁平对象提取键值', async () => {
    const file = makeFile('data.json', '{"name":"张三","age":25,"active":true}')
    const result = await parseTextFile(file, 'json')
    expect(result.text).toContain('name: 张三')
    expect(result.text).toContain('age: 25')
    expect(result.meta.parser).toBe('json')
  })

  it('解析 JSON：嵌套对象和数组', async () => {
    const file = makeFile('data.json', '{"users":[{"name":"A"},{"name":"B"}]}')
    const result = await parseTextFile(file, 'json')
    expect(result.text).toContain('users[0].name: A')
    expect(result.text).toContain('users[1].name: B')
  })

  it('解析 JSON：无效 JSON 回退为纯文本', async () => {
    const file = makeFile('data.json', '{invalid json content')
    const result = await parseTextFile(file, 'json')
    expect(result.text).toContain('invalid json content')
  })

  it('解析 CSV：保留行列结构', async () => {
    const csv = 'name,age\n张三,25\n李四,30'
    const file = makeFile('data.csv', csv, 'text/csv')
    const result = await parseTextFile(file, 'csv')
    expect(result.text).toContain('name,age')
    expect(result.text).toContain('张三,25')
    expect(result.meta.parser).toBe('csv')
  })

  it('解析结果包含完整元信息', async () => {
    const file = makeFile('test.txt', 'hello')
    const result = await parseTextFile(file, 'txt')
    expect(result.meta.fileName).toBe('test.txt')
    expect(result.meta.mimeType).toBe('text/plain')
    expect(result.meta.fileSize).toBe(5)
    expect(result.meta.parsingTime).toBeGreaterThanOrEqual(0)
  })
})
