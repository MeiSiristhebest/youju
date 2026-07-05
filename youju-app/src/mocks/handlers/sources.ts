import { HttpResponse, http } from 'msw'
import type { Source, SourceType } from '@/types'
import { mockDB } from '../db'

function generateId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export const sourceHandlers = [
  http.get('/api/sources', async () => {
    await delay(100 + Math.random() * 100)
    const sources = mockDB.getSources()
    return HttpResponse.json(sources)
  }),

  http.post('/api/sources/text', async ({ request }) => {
    const body = (await request.json()) as {
      content: string
      type: SourceType
      name: string
      metadata?: Record<string, any>
    }

    await delay(300 + Math.random() * 200)

    const source: Source = {
      id: generateId('src'),
      type: body.type,
      name: body.name,
      content: body.content,
      metadata: body.metadata || {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      processingStatus: 'completed',
      charCount: body.content.length,
    }

    mockDB.addSource(source)
    return HttpResponse.json(source)
  }),

  http.post('/api/sources/upload', async ({ request }) => {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const type = formData.get('type') as SourceType

    if (!file) {
      return HttpResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const text = await file.text()

    await delay(500 + Math.random() * 500)

    const source: Source = {
      id: generateId('src'),
      type: type || 'doc',
      name: file.name,
      content: text,
      metadata: {
        size: file.size,
        type: file.type,
        lastModified: file.lastModified,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      processingStatus: 'completed',
      charCount: text.length,
    }

    mockDB.addSource(source)
    return HttpResponse.json(source)
  }),

  http.post('/api/sources/url', async ({ request }) => {
    const body = (await request.json()) as {
      url: string
      type: SourceType
    }

    await delay(800 + Math.random() * 400)

    const mockContent = `从 ${body.url} 抓取的内容...\n\n（模拟：URL 解析成功，已提取正文内容）`

    const source: Source = {
      id: generateId('src'),
      type: body.type,
      name: body.url,
      content: mockContent,
      metadata: { url: body.url },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      processingStatus: 'completed',
      charCount: mockContent.length,
    }

    mockDB.addSource(source)
    return HttpResponse.json(source)
  }),

  http.delete('/api/sources/:id', async ({ params }) => {
    const { id } = params
    const success = mockDB.removeSource(String(id))

    await delay(150 + Math.random() * 100)

    if (!success) {
      return HttpResponse.json({ error: 'Source not found' }, { status: 404 })
    }

    return HttpResponse.json({ success: true })
  }),

  http.post('/api/sources/parse', async ({ request }) => {
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return HttpResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    await delay(600 + Math.random() * 300)

    const text = await file.text()

    const result = {
      name: file.name,
      type: 'doc' as SourceType,
      content: text,
      charCount: text.length,
      pageCount: Math.ceil(text.length / 2000),
      language: 'zh-CN',
    }

    return HttpResponse.json(result)
  }),
]
