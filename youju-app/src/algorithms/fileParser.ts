import { sourceApi } from '../services/sourceApi'

export type FileType = 'txt' | 'md' | 'html' | 'json' | 'pdf' | 'docx' | 'image' | 'unknown'

export interface ParsedSource {
  file: File
  text: string
  fileType: FileType
  meta: {
    fileName: string
    fileSize: number
    fileTypeLabel: string
    charCount: number
    lineCount: number
    parsingTime: number
  }
}

/** 需要后端专业库解析的文件类型 */
const BACKEND_TYPES: ReadonlySet<FileType> = new Set(['pdf', 'docx', 'image'])

const EXTENSION_MAP: Record<string, FileType> = {
  '.txt': 'txt',
  '.md': 'md',
  '.markdown': 'md',
  '.html': 'html',
  '.htm': 'html',
  '.xhtml': 'html',
  '.json': 'json',
  '.pdf': 'pdf',
  '.docx': 'docx',
  '.doc': 'docx',
  '.png': 'image',
  '.jpg': 'image',
  '.jpeg': 'image',
  '.gif': 'image',
  '.bmp': 'image',
  '.webp': 'image',
}

export class FileParser {
  detectFileType(file: File): FileType {
    const name = file.name.toLowerCase()
    const lastDot = name.lastIndexOf('.')
    const ext = lastDot >= 0 ? name.slice(lastDot) : ''

    if (ext in EXTENSION_MAP) return EXTENSION_MAP[ext]

    if (file.type.startsWith('text/')) return 'txt'
    if (file.type.startsWith('image/')) return 'image'
    if (file.type === 'application/pdf') return 'pdf'
    if (file.type.includes('word')) return 'docx'
    if (file.type.includes('json')) return 'json'
    if (file.type.includes('html')) return 'html'

    return 'unknown'
  }

  getFileTypeLabel(fileType: FileType): string {
    const labels: Record<FileType, string> = {
      txt: '纯文本',
      md: 'Markdown',
      html: 'HTML',
      json: 'JSON',
      pdf: 'PDF',
      docx: 'Word 文档',
      image: '图片',
      unknown: '未知格式',
    }
    return labels[fileType]
  }

  /** 是否需要后端解析 */
  needsBackend(fileType: FileType): boolean {
    return BACKEND_TYPES.has(fileType)
  }

  cleanText(text: string): string {
    return text
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .replace(/\t+/g, ' ')
      .replace(/ {2,}/g, ' ')
      .trim()
  }

  parseText(content: string): string {
    return this.cleanText(content)
  }

  parseMarkdown(content: string): string {
    const cleaned = this.cleanText(content)
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

  parseHtml(content: string): string {
    const tempDiv = document.createElement('div')
    tempDiv.innerHTML = content

    const scripts = tempDiv.querySelectorAll('script, style, head, nav, footer')
    scripts.forEach((el) => el.remove())

    const text = tempDiv.textContent || tempDiv.innerText || ''
    return this.cleanText(text)
  }

  parseJson(content: string): string {
    try {
      const parsed = JSON.parse(content)
      const textParts: string[] = []

      const extractText = (obj: unknown, prefix = '') => {
        if (typeof obj === 'string') {
          textParts.push(prefix ? `${prefix}: ${obj}` : obj)
        } else if (typeof obj === 'number' || typeof obj === 'boolean') {
          if (prefix) textParts.push(`${prefix}: ${String(obj)}`)
        } else if (Array.isArray(obj)) {
          obj.forEach((item, index) => extractText(item, `${prefix}[${index}]`))
        } else if (typeof obj === 'object' && obj !== null) {
          for (const [key, value] of Object.entries(obj)) {
            const newPrefix = prefix ? `${prefix}.${key}` : key
            extractText(value, newPrefix)
          }
        }
      }

      extractText(parsed)
      return this.cleanText(textParts.join('\n\n'))
    } catch {
      return this.cleanText(content)
    }
  }

  /**
   * 解析文件入口
   *
   * 路由策略：
   * - 文本类（txt/md/html/json）：纯前端解析，无需后端
   * - 二进制类（pdf/docx/image）：调用后端 /api/sources/parse 真实解析
   *
   * 已移除所有 mock 模拟实现，统一走真实解析。
   */
  async parseFile(file: File): Promise<ParsedSource> {
    const startTime = Date.now()
    const fileType = this.detectFileType(file)

    if (fileType === 'unknown') {
      throw new Error('不支持的文件格式')
    }

    // 二进制格式走后端真实解析
    if (this.needsBackend(fileType)) {
      const result = await sourceApi.parseFileBackend(file)
      if (!result.success || !result.text) {
        throw new Error(result.error || '后端解析失败')
      }

      return {
        file,
        text: result.text,
        fileType,
        meta: {
          fileName: file.name,
          fileSize: file.size,
          fileTypeLabel: result.fileTypeLabel || this.getFileTypeLabel(fileType),
          charCount: result.text.length,
          lineCount:
            result.meta?.lineCount ?? result.text.split('\n').filter((l) => l.trim()).length,
          parsingTime: Date.now() - startTime,
        },
      }
    }

    // 文本类纯前端解析
    const fileContent = await this.readFileAsText(file)
    let text = ''

    switch (fileType) {
      case 'txt':
        text = this.parseText(fileContent)
        break
      case 'md':
        text = this.parseMarkdown(fileContent)
        break
      case 'html':
        text = this.parseHtml(fileContent)
        break
      case 'json':
        text = this.parseJson(fileContent)
        break
      default:
        text = this.parseText(fileContent)
    }

    const parsingTime = Date.now() - startTime
    const lines = text.split('\n').filter((l) => l.trim())

    return {
      file,
      text,
      fileType,
      meta: {
        fileName: file.name,
        fileSize: file.size,
        fileTypeLabel: this.getFileTypeLabel(fileType),
        charCount: text.length,
        lineCount: lines.length,
        parsingTime,
      },
    }
  }

  private readFileAsText(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => resolve(e.target?.result as string)
      reader.onerror = reject
      reader.readAsText(file, 'utf-8')
    })
  }
}

export const fileParser = new FileParser()
