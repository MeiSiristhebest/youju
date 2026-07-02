/**
 * 文件解析器公共类型定义
 *
 * 模块化文件解析架构：
 * - 每种文件类型对应独立的解析器模块
 * - 统一通过 detectFileType 路由
 * - 动态 import 避免启动时加载全部依赖
 *
 * 解析方案：
 * - PDF: unpdf（基于 Mozilla pdfjs，跨运行时，Serverless 兼容）
 * - Office: officeparser（统一支持 docx/pptx/xlsx/odt/odp/ods/pdf/rtf/csv/md/html）
 * - 纯文本/HTML: 前端解析 + cheerio
 */

export type FileType =
  | 'pdf'
  | 'docx'
  | 'doc'
  | 'pptx'
  | 'xlsx'
  | 'odt'
  | 'rtf'
  | 'txt'
  | 'md'
  | 'html'
  | 'json'
  | 'csv'
  | 'image'
  | 'unknown'

export interface ParseResult {
  text: string
  fileType: FileType
  meta: {
    fileName: string
    fileSize: number
    mimeType: string
    charCount: number
    lineCount?: number
    pageCount?: number
    parsingTime: number
    /** 实际使用的解析器名称，便于追踪与调试 */
    parser: string
  }
}

export interface FileInput {
  buffer: Buffer
  originalname: string
  mimetype: string
  size: number
}

export interface FileParserPort {
  /** 根据文件名与 mimeType 检测文件类型 */
  detect(file: FileInput): FileType
  /** 解析文件，返回文本与元信息 */
  parse(file: FileInput): Promise<ParseResult>
}

const EXTENSION_MAP: Record<string, FileType> = {
  '.pdf': 'pdf',
  '.docx': 'docx',
  '.doc': 'doc',
  '.pptx': 'pptx',
  '.ppt': 'pptx',
  '.xlsx': 'xlsx',
  '.xls': 'xlsx',
  '.odt': 'odt',
  '.odp': 'pptx',
  '.ods': 'xlsx',
  '.rtf': 'rtf',
  '.txt': 'txt',
  '.md': 'md',
  '.markdown': 'md',
  '.html': 'html',
  '.htm': 'html',
  '.xhtml': 'html',
  '.json': 'json',
  '.csv': 'csv',
  '.png': 'image',
  '.jpg': 'image',
  '.jpeg': 'image',
  '.gif': 'image',
  '.bmp': 'image',
  '.webp': 'image',
}

export function detectFileType(fileName: string, mimeType?: string): FileType {
  const name = fileName.toLowerCase()
  const lastDot = name.lastIndexOf('.')
  const ext = lastDot >= 0 ? name.slice(lastDot) : ''

  if (ext in EXTENSION_MAP) return EXTENSION_MAP[ext]

  if (mimeType) {
    if (mimeType === 'application/pdf') return 'pdf'
    if (mimeType.includes('word')) return ext === '.doc' ? 'doc' : 'docx'
    if (mimeType.includes('powerpoint')) return 'pptx'
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return 'xlsx'
    // 具体类型优先于通用的 text/ 匹配，避免 text/html、text/csv 被误判为 txt
    if (mimeType.includes('html')) return 'html'
    if (mimeType.includes('csv')) return 'csv'
    if (mimeType.includes('json')) return 'json'
    if (mimeType.includes('rtf')) return 'rtf'
    if (mimeType.startsWith('text/')) return 'txt'
    if (mimeType.startsWith('image/')) return 'image'
  }

  return 'unknown'
}

export function getFileTypeLabel(fileType: FileType): string {
  const labels: Record<FileType, string> = {
    pdf: 'PDF',
    docx: 'Word 文档',
    doc: 'Word 旧版',
    pptx: 'PPT 演示文稿',
    xlsx: 'Excel 表格',
    odt: 'OpenDocument 文档',
    rtf: 'RTF 富文本',
    txt: '纯文本',
    md: 'Markdown',
    html: 'HTML',
    json: 'JSON',
    csv: 'CSV',
    image: '图片',
    unknown: '未知格式',
  }
  return labels[fileType]
}
