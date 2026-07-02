import express from 'express'
import * as userService from '../../domain/services/userService.js'
import { getUserIdFromReq, wechatLoginMock } from '../../infrastructure/auth.js'
import { authRateLimiter } from '../middleware/rateLimiter.js'
import { validateBody } from '../middleware/zodValidator.js'
import { authWechatSchema } from '../validation/schemas.js'

const router = express.Router()

router.post('/auth/wechat', authRateLimiter, validateBody(authWechatSchema), async (req, res) => {
  try {
    const { code } = req.body
    const result = await wechatLoginMock(code)
    res.json({ code: 200, data: result })
  } catch (e) {
    console.error('Wechat login error:', e)
    res.status(500).json({ code: 500, msg: '登录失败' })
  }
})

router.get('/user/info', async (req, res) => {
  const userId = await getUserIdFromReq(req)
  if (!userId) {
    return res.status(401).json({ code: 401, msg: '未登录' })
  }
  const user = await userService.getUser(userId)
  if (!user) {
    return res.status(401).json({ code: 401, msg: '用户不存在' })
  }
  res.json({
    code: 200,
    data: { id: user.id, nickname: user.nickname, avatar: user.avatar },
  })
})

export default router
