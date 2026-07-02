import express from 'express'
import * as sourceService from '../../domain/services/sourceService.js'
import { getUserIdAndSessionId } from '../../infrastructure/auth.js'
import { extractFromUrl, parseFile } from '../../infrastructure/fileParser/index.js'
import { detectFileType, getFileTypeLabel } from '../../infrastructure/fileParser/types.js'
import { urlFetchRateLimiter } from '../middleware/rateLimiter.js'
import { validateBody } from '../middleware/zodValidator.js'
import { sourceTextSchema, sourceUrlSchema } from '../validation/schemas.js'
import { upload } from './_upload.js'

const router = express.Router()

router.post('/sources/text', validateBody(sourceTextSchema), async (req, res) => {
  const { type, name, content } = req.body
  const { userId, sessionId } = await getUserIdAndSessionId(req)
  const source = await sourceService.createSource(userId, sessionId, type, name, content)
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
  const { type, name } = req.body

  try {
    const result = await parseFile({
      buffer: req.file.buffer,
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
    })

    const { userId, sessionId } = await getUserIdAndSessionId(req)
    const source = await sourceService.createSource(
      userId,
      sessionId,
      type || 'doc',
      name || req.file.originalname,
      result.text,
      `${req.file.size} bytes`,
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
    const { url, type = 'web', name } = req.body
    try {
      const content = await extractFromUrl(url)
      const { userId, sessionId } = await getUserIdAndSessionId(req)
      const source = await sourceService.createSource(
        userId,
        sessionId,
        type,
        name || url,
        content,
        url,
      )
      res.json({ code: 200, data: { sourceId: source.id, ...source } })
    } catch (_e) {
      res.status(500).json({ code: 500, msg: '抓取失败' })
    }
  },
)

router.get('/sources', async (req, res) => {
  const { userId, sessionId } = await getUserIdAndSessionId(req)
  const sources = await sourceService.listSources(userId, sessionId)
  res.json({ code: 200, data: sources })
})

router.delete('/sources/:id', async (req, res) => {
  const { userId, sessionId } = await getUserIdAndSessionId(req)
  const success = await sourceService.deleteSource(userId, sessionId, req.params.id)
  res.json({ code: 200, data: { success } })
})

export default router
