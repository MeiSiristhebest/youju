import type { FileInput, FileType, ParseResult } from './types.js'

/**
 * 文本类文件解析器（txt/md/html/json/csv）
 *
 * 纯文本格式无需第三方库，直接在 Node.js 中处理。
 * HTML 解析复用 cheerio（与 URL 抓取共用）。
 */

function cleanText(text: string): string {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/\t+/g, ' ')
    .replace(/ {2,}/g, ' ')
    .trim()
}

function parseMarkdown(content: string): string {
  const cleaned = cleanText(content)
  return cleaned
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/^[-*+]\s+/gm, '')
    .replace(/^\d+\.\s+/gm, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/^>\s+/gm, '')
    .replace(/---+/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

async function parseHtml(buffer: Buffer): Promise<string> {
  const cheerio = await import('cheerio')
  const $ = cheerio.load(buffer.toString('utf-8'))
  $('script, style, head, nav, footer, aside').remove()
  const text = $('main, article, .content, #content, body').text()
  return cleanText(text.replace(/\s+/g, ' '))
}

function parseJson(content: string): string {
  try {
    const parsed = JSON.parse(content)
    const parts: string[] = []

    const extract = (obj: unknown, prefix = '') => {
      if (typeof obj === 'string') {
        parts.push(prefix ? `${prefix}: ${obj}` : obj)
      } else if (typeof obj === 'number' || typeof obj === 'boolean') {
        if (prefix) parts.push(`${prefix}: ${String(obj)}`)
      } else if (Array.isArray(obj)) {
        obj.forEach((item, i) => extract(item, `${prefix}[${i}]`))
      } else if (typeof obj === 'object' && obj !== null) {
        for (const [k, v] of Object.entries(obj)) {
          extract(v, prefix ? `${prefix}.${k}` : k)
        }
      }
    }

    extract(parsed)
    return cleanText(parts.join('\n\n'))
  } catch {
    return cleanText(content)
  }
}

export async function parseTextFile(file: FileInput, fileType: FileType): Promise<ParseResult> {
  const startTime = Date.now()
  const raw = file.buffer.toString('utf-8')
  let text = ''
  let parser = 'plain-text'

  switch (fileType) {
    case 'md':
      text = parseMarkdown(raw)
      parser = 'markdown'
      break
    case 'html':
      text = await parseHtml(file.buffer)
      parser = 'cheerio'
      break
    case 'json':
      text = parseJson(raw)
      parser = 'json'
      break
    case 'csv':
      // CSV 直接清洗，保留行列结构
      text = cleanText(raw)
      parser = 'csv'
      break
    default:
      text = cleanText(raw)
      parser = 'plain-text'
  }

  return {
    text,
    fileType,
    meta: {
      fileName: file.originalname,
      fileSize: file.size,
      mimeType: file.mimetype,
      charCount: text.length,
      parsingTime: Date.now() - startTime,
      parser,
    },
  }
}
