import express from 'express'
import type { SourceService } from '../../domain/services/sourceService.js'
import { getUserIdAndSessionId } from '../../infrastructure/auth.js'
import { getService, Tokens } from '../../infrastructure/di/serviceLocator.js'
import { fetchUrl, parseFile } from '../../infrastructure/fileParser/index.js'
import { detectFileType, getFileTypeLabel } from '../../infrastructure/fileParser/types.js'
import { analyzeRateLimiter, urlFetchRateLimiter } from '../middleware/rateLimiter.js'
import { validateBody } from '../middleware/zodValidator.js'
import { sourceTextSchema, sourceUrlSchema } from '../validation/schemas.js'
import { upload } from './_upload.js'

function getSourceService(): SourceService {
  return getService<SourceService>(Tokens.SourceService)
}

const router = express.Router()

router.post('/sources/text', validateBody(sourceTextSchema), async (req, res) => {
  const { type, name, content, task_id } = req.body
  const { userId, sessionId } = await getUserIdAndSessionId(req)
  const source = await getSourceService().createSource(
    userId,
    sessionId,
    type,
    name,
    content,
    undefined,
    task_id || null,
  )
  res.json({ code: 200, data: { sourceId: source.id, ...source } })
})

/**
 * 文件解析预览端点（只解析不存储）
 *
 * 前端上传文件时先调用此端点获取解析后的文本预览，
 * 用户确认后再调用 /sources/upload 存储为材料。
 */
router.post('/sources/parse', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ code: 400, msg: '未上传文件' })
  }

  const fileType = detectFileType(req.file.originalname, req.file.mimetype)
  if (fileType === 'unknown') {
    return res.status(400).json({ code: 400, msg: '不支持的文件格式' })
  }

  try {
    const result = await parseFile({
      buffer: req.file.buffer,
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
    })

    res.json({
      code: 200,
      data: {
        text: result.text,
        fileType: result.fileType,
        fileTypeLabel: getFileTypeLabel(result.fileType),
        meta: {
          ...result.meta,
          lineCount: result.text.split('\n').filter((l) => l.trim()).length,
        },
      },
    })
  } catch (error) {
    console.error('[sources/parse] 解析失败:', error)
    res.status(500).json({ code: 500, msg: '文件解析失败' })
  }
})

router.post('/sources/upload', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ code: 400, msg: '未上传文件' })
  }
  const { type, name, task_id } = req.body

  try {
    const result = await parseFile({
      buffer: req.file.buffer,
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
    })

    const { userId, sessionId } = await getUserIdAndSessionId(req)
    const source = await getSourceService().createSource(
      userId,
      sessionId,
      type || 'doc',
      name || req.file.originalname,
      result.text,
      `${req.file.size} bytes`,
      task_id || null,
    )
    res.json({ code: 200, data: { sourceId: source.id, ...source } })
  } catch (error) {
    console.error('[sources/upload] 解析失败:', error)
    res.status(500).json({ code: 500, msg: '文件解析失败' })
  }
})

router.post(
  '/sources/url',
  urlFetchRateLimiter,
  validateBody(sourceUrlSchema),
  async (req, res) => {
    const { url, type = 'web', name, task_id } = req.body
    try {
      const content = await fetchUrl(url)
      const { userId, sessionId } = await getUserIdAndSessionId(req)
      const source = await getSourceService().createSource(
        userId,
        sessionId,
        type,
        name || url,
        content,
        url,
        task_id || null,
      )
      res.json({ code: 200, data: { sourceId: source.id, ...source } })
    } catch (_e) {
      res.status(500).json({ code: 500, msg: '抓取失败' })
    }
  },
)

router.get('/sources', async (req, res) => {
  const { userId, sessionId } = await getUserIdAndSessionId(req)
  const taskId = req.query.task_id as string | undefined
  const all = req.query.all as string | undefined

  if (all === 'true') {
    // 历史材料：已登录用户返回自己的全部材料，匿名用户返回全部匿名材料
    const sources = await getSourceService().listAllSources(userId)
    res.json({ code: 200, data: sources })
    return
  }

  const sources = await getSourceService().listSources(userId, sessionId, taskId || null)
  res.json({ code: 200, data: sources })
})

router.delete('/sources/:id', async (req, res) => {
  const { userId, sessionId } = await getUserIdAndSessionId(req)
  const success = await getSourceService().deleteSource(userId, sessionId, req.params.id)
  res.json({ code: 200, data: { success } })
})

router.post('/sources/:id/reindex', analyzeRateLimiter, async (req, res) => {
  const { userId, sessionId } = await getUserIdAndSessionId(req)

  if (!sessionId) {
    return res.status(401).json({ code: 401, msg: '未授权：缺少 session' })
  }

  const sourceId = String(req.params.id)
  const source = await getSourceService().getSource(userId, sessionId, sourceId)
  if (!source) {
    return res.status(404).json({ code: 404, msg: '素材不存在' })
  }

  await getSourceService().reindexSource(source)

  res.json({ code: 200, data: { sourceId, status: 'reindexing' } })
})

export default router
