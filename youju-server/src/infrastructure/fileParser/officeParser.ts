import type { FileInput, FileType, ParseResult } from './types.js'

/**
 * Office 文档解析器
 *
 * 使用 officeparser（统一支持 docx/pptx/xlsx/odt/odp/ods/pdf/rtf/csv/md/html）：
 * - 纯 JS 实现，无原生依赖，Serverless 友好
 * - 输出 AST，可转换为 text/md/html/chunks 等多种格式
 * - 支持 OCR（可选，扫描件场景）
 *
 * 支持的文件类型：docx, doc, pptx, xlsx, odt, rtf, pdf, csv, md, html
 */
export async function parseOffice(file: FileInput, fileType: FileType): Promise<ParseResult> {
  const startTime = Date.now()

  try {
    const { OfficeParser } = await import('officeparser')

    // officeparser 支持 Buffer 输入，对于文本类格式需要 fileType 提示
    const options: Record<string, any> = {}

    // 文本类格式从 Buffer 读取时需要指定 fileType
    const textBasedFormats = new Set(['txt', 'md', 'html', 'csv', 'json', 'rtf'])
    if (textBasedFormats.has(fileType)) {
      options.fileType = fileType
    }

    const ast = await OfficeParser.parseOffice(file.buffer, options)

    // 转换为纯文本
    const { value: text } = await ast.to('text')

    const charCount = text.length
    const lineCount = text.split('\n').length

    // 尝试从 AST metadata 中提取页数/幻灯片数
    const metaAny = ast.metadata as Record<string, any> | undefined
    let pageCount: number | undefined
    if (metaAny) {
      if (typeof metaAny.pageCount === 'number') pageCount = metaAny.pageCount
      if (typeof metaAny.slideCount === 'number') pageCount = metaAny.slideCount
      if (typeof metaAny.sheetCount === 'number') pageCount = metaAny.sheetCount
      if (typeof metaAny.totalPages === 'number') pageCount = metaAny.totalPages
      if (typeof metaAny.pages === 'number') pageCount = metaAny.pages
    }

    return {
      text,
      fileType,
      meta: {
        fileName: file.originalname,
        fileSize: file.size,
        mimeType: file.mimetype,
        charCount,
        lineCount,
        pageCount,
        parsingTime: Date.now() - startTime,
        parser: 'officeparser',
      },
    }
  } catch (e) {
    console.warn(
      `[fileParser] officeparser 解析 ${fileType} 失败，尝试降级提取:`,
      (e as Error).message,
    )
    // 降级：尝试直接读取文本
    const text = file.buffer.toString('utf8').replace(/\0/g, '').trim() || `[${fileType} 解析失败]`
    return {
      text,
      fileType,
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
