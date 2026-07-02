import type { FileInput, ParseResult } from './types.js'

/**
 * PDF 解析器
 *
 * 使用 unpdf（基于 Mozilla PDF.js 的现代封装）：
 * - 跨运行时：Node.js / Browser / Serverless (Vercel/EdgeOne/Cloudflare)
 * - 纯 JS，无原生依赖，Serverless 友好
 * - 支持文本提取、链接提取、图片提取
 */
export async function parsePdf(file: FileInput): Promise<ParseResult> {
  const startTime = Date.now()

  try {
    const { extractText, getDocumentProxy } = await import('unpdf')
    const pdf = await getDocumentProxy(new Uint8Array(file.buffer))
    const { totalPages, text } = await extractText(pdf, { mergePages: true })

    const charCount = text.length
    const lineCount = text.split('\n').length

    return {
      text,
      fileType: 'pdf',
      meta: {
        fileName: file.originalname,
        fileSize: file.size,
        mimeType: file.mimetype,
        charCount,
        lineCount,
        pageCount: totalPages,
        parsingTime: Date.now() - startTime,
        parser: 'unpdf',
      },
    }
  } catch (e) {
    console.warn('[fileParser] unpdf 解析失败，尝试降级提取:', (e as Error).message)
    // 降级：直接读取 Buffer 中的可见文本
    const text = file.buffer.toString('utf8').replace(/\0/g, '').trim() || '[PDF 解析失败]'
    return {
      text,
      fileType: 'pdf',
      meta: {
        fileName: file.originalname,
        fileSize: file.size,
        mimeType: file.mimetype,
        charCount: text.length,
        lineCount: text.split('\n').length,
        parsingTime: Date.now() - startTime,
        parser: 'fallback-utf8',
      },
    }
  }
}
