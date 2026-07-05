import { parseOffice } from './officeParser.js'
import { parsePdf } from './pdfParser.js'
import { parseTextFile } from './textParser.js'
import type { FileInput, FileType, ParseResult } from './types.js'
import { detectFileType } from './types.js'

export type { FileInput, FileType, ParseResult } from './types.js'
export { detectFileType, getFileTypeLabel } from './types.js'

/**
 * 统一文件解析调度器
 *
 * 职责：
 * 1. 根据文件类型路由到对应解析器
 * 2. PDF → unpdf（基于 PDF.js，Serverless 友好）
 * 3. Office 文档 → officeparser（统一支持 docx/pptx/xlsx/odt/rtf 等）
 * 4. 文本格式 → 本地解析（轻量，零额外依赖）
 * 5. 图片 → 占位提示（前端 tesseract.js 负责 OCR）
 * 6. URL 抓取 → urlFetcher（cheerio）
 *
 * 架构约束：5 层隔离中的 Infrastructure 层，被 Domain 层的 sourceService 调用。
 */
export async function parseFile(file: FileInput): Promise<ParseResult> {
  const fileType = detectFileType(file.originalname, file.mimetype)

  switch (fileType) {
    case 'pdf':
      return parsePdf(file)
    case 'docx':
    case 'doc':
    case 'pptx':
    case 'xlsx':
    case 'odt':
    case 'rtf':
      return parseOffice(file, fileType)
    case 'txt':
    case 'md':
    case 'html':
    case 'json':
    case 'csv':
      return parseTextFile(file, fileType)
    case 'image':
      return parseImagePlaceholder(file, fileType)
    default:
      // 未知格式尝试以纯文本读取
      return parseTextFile(file, 'txt')
  }
}

/**
 * 图片占位解析器
 *
 * 图片 OCR 在前端通过 tesseract.js 完成（有进度反馈）。
 * 后端暂不实现 OCR，返回提示信息引导用户使用前端 OCR 或上传文本。
 *
 * 升级路径：officeparser 内置 OCR（Tesseract worker），可统一到后端。
 */
function parseImagePlaceholder(file: FileInput, fileType: FileType): ParseResult {
  const text = `[图片文件：${file.originalname}]

请使用前端"截图识别"功能进行 OCR 文字识别，或将识别后的文本粘贴为文本材料。`
  return {
    text,
    fileType,
    meta: {
      fileName: file.originalname,
      fileSize: file.size,
      mimeType: file.mimetype,
      charCount: text.length,
      parsingTime: 0,
      parser: 'image-placeholder',
    },
  }
}

export { fetchUrl } from '../urlFetcher.js'
export type { FileType as DetectedFileType } from './types.js'
