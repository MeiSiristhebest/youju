import type { SourceType } from './common'

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

export interface Source {
  id: string
  type: SourceType
  name: string
  content: string
  meta?: string
}
