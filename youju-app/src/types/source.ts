import type { SourceType } from './common'

export type FileType = 'txt' | 'md' | 'html' | 'json' | 'pdf' | 'docx' | 'image' | 'unknown'

export type SourceStatus = 'uploading' | 'parsing' | 'ready' | 'error'

export type ProcessingStatus = 'pending' | 'processing' | 'completed' | 'failed'

export interface ParsedSummary {
  docType: string
  parties: string[]
  keyDates: string[]
  summary: string
}

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

export interface Source {
  id: string
  type: SourceType
  name: string
  content: string
  meta?: string
  createdAt?: string
  charCount?: number
  taskId?: string
  /** 前端本地状态：上传进度 */
  status?: SourceStatus
  /** 前端本地状态：上传进度百分比 */
  progress?: number
  /** 前端本地状态：解析摘要 */
  parsedSummary?: ParsedSummary
  /** 前端本地状态：处理状态 */
  processingStatus?: ProcessingStatus
}
