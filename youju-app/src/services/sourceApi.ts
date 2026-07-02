import type { ParsedSource, ScenarioType, Source, SourceType } from '../types'
import { apiClient } from './apiClient'
import { handleApiError } from './errorHandler'

export interface InitScenarioResult {
  sources: Source[]
}

export interface ParseResult {
  success: boolean
  text?: string
  error?: string
  meta?: ParsedSource['meta']
  fileType?: string
  fileTypeLabel?: string
}

export const sourceApi = {
  async listSources(): Promise<Source[]> {
    try {
      return await apiClient.get<Source[]>('/api/sources')
    } catch (error) {
      throw handleApiError(error)
    }
  },

  async addTextSource(params: {
    type: SourceType
    name: string
    content: string
  }): Promise<Source> {
    try {
      return await apiClient.post<Source>('/api/sources/text', params)
    } catch (error) {
      throw handleApiError(error)
    }
  },

  async uploadFile(file: File, type: SourceType, name?: string): Promise<Source> {
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('type', type)
      if (name) {
        formData.append('name', name)
      }
      return await apiClient.post<Source>('/api/sources/upload', formData)
    } catch (error) {
      throw handleApiError(error)
    }
  },

  async addUrlSource(params: { url: string; type: SourceType; name?: string }): Promise<Source> {
    try {
      return await apiClient.post<Source>('/api/sources/url', params)
    } catch (error) {
      throw handleApiError(error)
    }
  },

  async deleteSource(id: string): Promise<void> {
    try {
      return await apiClient.delete<void>(`/api/sources/${id}`)
    } catch (error) {
      throw handleApiError(error)
    }
  },

  async initScenario(scenarioId: ScenarioType): Promise<InitScenarioResult> {
    try {
      return await apiClient.post<InitScenarioResult>(`/api/scenarios/${scenarioId}/init`)
    } catch (error) {
      throw handleApiError(error)
    }
  },

  async parseFile(file: File): Promise<ParseResult> {
    // 已废弃：改用 fileParser.parseFile（自动路由前端/后端解析）
    // 保留方法签名以兼容外部调用，内部委托给 fileParser
    const { fileParser } = await import('../algorithms/fileParser')
    try {
      const result = await fileParser.parseFile(file)
      return {
        success: true,
        text: result.text,
        meta: result.meta,
        fileType: result.fileType,
        fileTypeLabel: fileParser.getFileTypeLabel(result.fileType),
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '文件解析失败',
      }
    }
  },

  /**
   * 调用后端解析文件（PDF/DOCX 等需要专业库的格式）
   * 只解析不存储，用于前端预览。
   */
  async parseFileBackend(file: File): Promise<ParseResult> {
    try {
      const formData = new FormData()
      formData.append('file', file)
      const data = await apiClient.post<{
        text: string
        fileType: string
        fileTypeLabel: string
        meta: ParsedSource['meta'] & { lineCount?: number }
      }>('/api/sources/parse', formData)

      return {
        success: true,
        text: data.text,
        fileType: data.fileType,
        fileTypeLabel: data.fileTypeLabel,
        meta: {
          fileName: file.name,
          fileSize: file.size,
          fileTypeLabel: data.fileTypeLabel,
          charCount: data.meta.charCount,
          lineCount: data.meta.lineCount ?? data.text.split('\n').filter((l) => l.trim()).length,
          parsingTime: data.meta.parsingTime,
        },
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '后端解析失败',
      }
    }
  },

  async parseUrl(url: string): Promise<ParseResult> {
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      })

      if (!response.ok) {
        return {
          success: false,
          error: `HTTP 错误：${response.status}`,
        }
      }

      const html = await response.text()
      const { fileParser } = await import('../algorithms/fileParser')
      const text = fileParser.parseHtml(html)

      if (!text || text.trim().length === 0) {
        return {
          success: false,
          error: '未能从网页中提取到有效文本',
        }
      }

      const lines = text.split('\n').filter((l: string) => l.trim())

      return {
        success: true,
        text,
        meta: {
          fileName: url,
          fileSize: html.length,
          fileTypeLabel: '网页',
          charCount: text.length,
          lineCount: lines.length,
          parsingTime: 0,
        },
      }
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : '网页抓取失败，请检查网络连接或 URL 是否正确',
      }
    }
  },
}
