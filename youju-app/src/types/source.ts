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
  meta?: string | Record<string, any>
  metadata?: Record<string, any>
  status?: SourceStatus
  progress?: number
  parsedSummary?: ParsedSummary
  createdAt?: string | number
  updatedAt?: string | number
  processingStatus?: ProcessingStatus
  charCount?: number
}
