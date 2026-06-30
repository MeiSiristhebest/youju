import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import multer from 'multer'
import { analyzeSources, generateDraft, mergeAnalyzeResults } from './services/ai/index.js'
import { extractFromUrl } from './services/extractor.js'
import { wechatLoginMock, getUserIdFromReq, getSessionIdFromReq, getUserIdAndSessionId } from './services/auth.js'
import {
  createSource,
  getSourcesByUser,
  deleteSource,
  getSourceById,
  createTask,
  getTasksByUser,
  getTaskById,
  deleteTask,
  getUserById,
  createShare,
  getShareByToken,
  getSharesByTask,
  deleteShare,
  updateTaskChecklistState,
  getTaskChecklistState,
  createAnalysisLog,
  getAnalysisStats,
  accumulateScenarioKnowledge,
  getScenarioKnowledge
} from './services/db.js'
import {
  getRiskWeights,
  recordChecklistAction,
  getDraftStyle,
  recordDraftCopy,
  recordDraftEdit,
  applyRiskWeights,
  recordRiskFeedback,
  getFeedbackStats
} from './services/memory/index.js'

const app = express()
const upload = multer({ storage: multer.memoryStorage() })

app.use(cors())
app.use(express.json())

interface Source {
  id: string
  type: 'chat' | 'doc' | 'web' | 'screenshot' | 'contract'
  name: string
  content: string
  meta?: string
}

interface Task {
  id: string
  title: string
  scenarioType: string
  sourceIds: string[]
  result: unknown
  createdAt: string
}

// 预置场景数据
interface ScenarioSource {
  type: string
  name: string
  content: string
  meta?: string
}

interface ScenarioPreset {
  id: string
  name: string
  icon: string
  description: string
  sources: ScenarioSource[]
}

const SCENARIO_PRESETS: ScenarioPreset[] = [
  {
    id: 'job',
    name: '求职 Offer 确认',
    icon: '💼',
    description: '核对 HR 口头承诺与正式 Offer 是否一致',
    sources: [
      {
        type: 'chat',
        name: 'HR 微信沟通记录',
        content: 'HR小李 10:30:\n您好，很高兴通知您通过了面试！\n\n您 10:32:\n谢谢！请问薪资结构是怎样的？\n\nHR小李 10:35:\n月薪25k，另外每年有2-3个月年终奖\n\n您 10:36:\n试用期是多久？\n\nHR小李 10:38:\n试用期2个月，期间薪资不打折\n\n您 10:40:\n请问每年有调薪机会吗？\n\nHR小李 10:42:\n每年两次调薪机会，表现好的话涨幅10-20%\n\n您 10:45:\n五险一金怎么交？\n\nHR小李 10:48:\n五险一金按实际工资全额缴纳，公积金12%',
        meta: '微信 · 15条消息'
      },
      {
        type: 'doc',
        name: 'Offer 邮件',
        content: '正式录用通知书\n\n尊敬的候选人：\n\n很高兴通知您已被录用，薪资待遇如下：\n- 年薪：30万元（固定）\n- 试用期：6个月\n- 五险一金：按北京市最低标准缴纳\n- 工作地点：北京市朝阳区\n\n请于2024年3月1日前回复确认。',
        meta: '邮件 · PDF附件'
      },
      {
        type: 'contract',
        name: '劳动合同草案',
        content: '劳动合同（草案）\n\n第一条 试用期\n试用期为6个月，试用期工资为正式工资的80%。\n\n第二条 薪资\n乙方年薪为人民币24万元。\n\n第三条 社保\n甲方按国家规定为乙方缴纳社会保险。',
        meta: 'PDF · 12页'
      }
    ]
  },
  {
    id: 'rent',
    name: '租房签约',
    icon: '🏠',
    description: '核对中介承诺与合同条款是否一致',
    sources: [
      {
        type: 'chat',
        name: '中介微信沟通',
        content: '中介王经理 14:20:\n这套房子月租4500，押一付三\n\n您 14:22:\n水电费怎么算？\n\n中介王经理 14:25:\n水费包在房租里，电费你自己交\n\n您 14:28:\n家电坏了谁负责修？\n\n中介王经理 14:30:\n家电我们负责维修，随时联系我们\n\n您 14:32:\n可以养宠物吗？\n\n中介王经理 14:35:\n可以养，没问题',
        meta: '微信 · 20条消息'
      },
      {
        type: 'contract',
        name: '租房合同',
        content: '房屋租赁合同\n\n第三条 租金\n月租金4500元，押金4500元。\n\n第四条 水电\n水费、电费由承租人承担。\n\n第五条 维修\n房屋内设施由承租人自行维护维修。\n\n第六条 禁止事项\n禁止在房屋内饲养宠物。',
        meta: 'PDF · 8页'
      }
    ]
  },
  {
    id: 'homework',
    name: '作业/申请提交',
    icon: '📚',
    description: '核对提交要求与材料是否一致',
    sources: [
      {
        type: 'web',
        name: '课程官网要求',
        content: '期末论文提交要求\n\n1. 格式：PDF格式\n2. 字数：不少于5000字\n3. 截止时间：2024年1月15日 23:59\n4. 提交方式：通过课程系统提交\n5. 延期政策：每延期1天扣10分，最多延期3天',
        meta: '网页 · 课程公告'
      },
      {
        type: 'chat',
        name: '助教群消息',
        content: '助教张老师 16:30:\n@所有人 论文截止时间延期到1月20日，不用扣分\n\n同学A 16:35:\n字数要求有变化吗？\n\n助教张老师 16:40:\n字数还是5000字以上\n\n同学B 16:45:\n可以提交Word格式吗？\n\n助教张老师 16:50:\n可以，Word格式也接受',
        meta: '微信群 · 12条消息'
      }
    ]
  }
]

// 获取预置场景列表
app.get('/api/scenarios', (req, res) => {
  const scenarios = SCENARIO_PRESETS.map(s => ({
    id: s.id,
    name: s.name,
    icon: s.icon,
    description: s.description,
    sourceCount: s.sources.length
  }))
  res.json({ code: 200, data: scenarios })
})

// 初始化预置场景（创建材料到当前用户，返回材料列表）
app.post('/api/scenarios/:id/init', (req, res) => {
  const { userId, sessionId } = getUserIdAndSessionId(req)
  const scenario = SCENARIO_PRESETS.find(s => s.id === req.params.id)
  
  if (!scenario) {
    return res.status(404).json({ code: 404, msg: '场景不存在' })
  }
  
  // 创建材料
  const createdSources = scenario.sources.map(src => {
    return createSource(userId, sessionId, src.type, src.name, src.content, src.meta)
  })
  
  res.json({
    code: 200,
    data: {
      scenario: {
        id: scenario.id,
        name: scenario.name,
        icon: scenario.icon,
        description: scenario.description
      },
      sources: createdSources
    }
  })
})

// 微信登录（模拟模式）
app.post('/api/auth/wechat', async (req, res) => {
  try {
    const { code } = req.body
    const result = await wechatLoginMock(code)
    res.json({ code: 200, data: result })
  } catch (e) {
    console.error('Wechat login error:', e)
    res.status(500).json({ code: 500, msg: '登录失败' })
  }
})

// 获取用户信息
app.get('/api/user/info', (req, res) => {
  const userId = getUserIdFromReq(req)
  if (!userId) {
    return res.status(401).json({ code: 401, msg: '未登录' })
  }
  const user = getUserById(userId)
  if (!user) {
    return res.status(401).json({ code: 401, msg: '用户不存在' })
  }
  res.json({
    code: 200,
    data: { id: user.id, nickname: user.nickname, avatar: user.avatar }
  })
})

// 上传文本材料
app.post('/api/sources/text', (req, res) => {
  const { type, name, content } = req.body
  if (!type || !name || !content) {
    return res.status(400).json({ code: 400, msg: '缺少必要参数' })
  }
  const { userId, sessionId } = getUserIdAndSessionId(req)
  const source = createSource(userId, sessionId, type, name, content)
  res.json({ code: 200, data: { sourceId: source.id, ...source } })
})

// 上传文件材料
app.post('/api/sources/upload', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ code: 400, msg: '未上传文件' })
  }
  const { type, name } = req.body
  let content = ''
  const originalName = req.file.originalname.toLowerCase()

  if (req.file.mimetype === 'application/pdf' || originalName.endsWith('.pdf')) {
    try {
      const pdf = await import('pdf-parse')
      const result = await pdf.default(req.file.buffer)
      content = result.text
    } catch {
      content = req.file.buffer.toString('utf-8')
    }
  } else if (req.file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || originalName.endsWith('.docx')) {
    try {
      const mammoth = await import('mammoth')
      const result = await mammoth.extractRawText({ buffer: req.file.buffer })
      content = result.value
    } catch (e) {
      console.error('DOCX parse error:', e)
      content = req.file.buffer.toString('utf-8')
    }
  } else {
    content = req.file.buffer.toString('utf-8')
  }

  const { userId, sessionId } = getUserIdAndSessionId(req)
  const source = createSource(
    userId,
    sessionId,
    type || 'doc',
    name || req.file.originalname,
    content,
    `${req.file.size} bytes`
  )
  res.json({ code: 200, data: { sourceId: source.id, ...source } })
})

// 从 URL 抓取
app.post('/api/sources/url', async (req, res) => {
  const { url, type = 'web', name } = req.body
  if (!url) {
    return res.status(400).json({ code: 400, msg: '缺少 URL' })
  }
  try {
    const content = await extractFromUrl(url)
    const { userId, sessionId } = getUserIdAndSessionId(req)
    const source = createSource(userId, sessionId, type, name || url, content, url)
    res.json({ code: 200, data: { sourceId: source.id, ...source } })
  } catch (e) {
    res.status(500).json({ code: 500, msg: '抓取失败' })
  }
})

// 获取材料列表
app.get('/api/sources', (req, res) => {
  const { userId, sessionId } = getUserIdAndSessionId(req)
  const sources = getSourcesByUser(userId, sessionId)
  res.json({ code: 200, data: sources })
})

// 删除材料
app.delete('/api/sources/:id', (req, res) => {
  const { userId, sessionId } = getUserIdAndSessionId(req)
  const success = deleteSource(userId, sessionId, req.params.id)
  res.json({ code: 200, data: { success } })
})

// AI 分析
app.post('/api/analyze', async (req, res) => {
  const { userId, sessionId } = getUserIdAndSessionId(req)
  const allSources = getSourcesByUser(userId, sessionId)
  const sourceIds = req.body.sourceIds || allSources.map(s => s.id)
  const scenarioType = req.body.scenarioType || 'custom'
  const selectedSources = sourceIds
    .map((id: string) => allSources.find((s: any) => s.id === id))
    .filter(Boolean)

  if (selectedSources.length === 0) {
    return res.status(400).json({ code: 400, msg: '没有可分析的材料' })
  }

  const startTime = Date.now()
  let isMock = true
  let status: 'success' | 'failed' = 'success'
  let errorMsg: string | null = null

  try {
    const scenarioKnowledge = getScenarioKnowledge(scenarioType, 10)
    const result = await analyzeSources(selectedSources, scenarioType, scenarioKnowledge)

    isMock = !process.env.AI_API_KEY
    const durationMs = Date.now() - startTime

    const riskWeights = getRiskWeights(userId, sessionId)
    const sortedRisks = applyRiskWeights(result.risks, riskWeights)

    accumulateScenarioKnowledge(scenarioType, result.risks.map(r => ({
      type: r.type,
      dimension: r.dimension,
      confidence: r.confidence
    })))

    createAnalysisLog({
      taskId: null,
      userId,
      sessionId,
      scenarioType,
      sourceCount: selectedSources.length,
      riskCount: result.summary.total,
      durationMs,
      model: result.debugInfo?.model || null,
      isMock,
      status,
      errorMessage: null,
      reasoningTrace: result.reasoningTrace || null,
      rawOutput: result.debugInfo?.rawOutput || null,
      tokenPrompt: result.debugInfo?.tokenPrompt || 0,
      tokenCompletion: result.debugInfo?.tokenCompletion || 0,
    })

    res.json({
      code: 200,
      data: {
        ...result,
        risks: sortedRisks,
        meta: {
          durationMs,
          isMock,
          sourceCount: selectedSources.length,
        },
        preferences: {
          riskWeights
        }
      }
    })
  } catch (e) {
    status = 'failed'
    errorMsg = (e as Error).message
    console.error('Analyze error:', e)

    const durationMs = Date.now() - startTime
    createAnalysisLog({
      taskId: null,
      userId,
      sessionId,
      scenarioType,
      sourceCount: selectedSources.length,
      riskCount: 0,
      durationMs,
      model: process.env.AI_MODEL || null,
      isMock,
      status,
      errorMessage: errorMsg,
      reasoningTrace: null,
      tokenPrompt: 0,
      tokenCompletion: 0,
    })

    res.status(500).json({ code: 500, msg: '分析失败' })
  }
})

// 增量分析：基于已有结果 + 新材料，只分析新增部分然后合并
app.post('/api/analyze/incremental', async (req, res) => {
  const { userId, sessionId } = getUserIdAndSessionId(req)
  const { existingResult, newSourceIds, scenarioType } = req.body

  if (!existingResult || !newSourceIds || newSourceIds.length === 0) {
    return res.status(400).json({ code: 400, msg: '缺少已有结果或新材料ID' })
  }

  const allSources = getSourcesByUser(userId, sessionId)
  const newSources = newSourceIds
    .map((id: string) => allSources.find((s: any) => s.id === id))
    .filter(Boolean)

  if (newSources.length === 0) {
    return res.status(400).json({ code: 400, msg: '新材料不存在' })
  }

  const scenario = scenarioType || existingResult.scenario?.type || 'custom'
  const startTime = Date.now()
  let isMock = true

  try {
    const scenarioKnowledge = getScenarioKnowledge(scenario, 10)
    const incrementalResult = await analyzeSources(newSources, scenario, scenarioKnowledge)

    isMock = !process.env.AI_API_KEY
    const durationMs = Date.now() - startTime

    const allSourceList = allSources.filter((s: any) =>
      [...(existingResult.meta?.sourceIds || []), ...newSourceIds].includes(s.id)
    )

    const mergedResult = mergeAnalyzeResults(
      existingResult as any,
      incrementalResult,
      allSourceList
    )

    const riskWeights = getRiskWeights(userId, sessionId)
    const sortedRisks = applyRiskWeights(mergedResult.risks, riskWeights)

    accumulateScenarioKnowledge(scenario, incrementalResult.risks.map(r => ({
      type: r.type,
      dimension: r.dimension,
      confidence: r.confidence
    })))

    createAnalysisLog({
      taskId: null,
      userId,
      sessionId,
      scenarioType: scenario,
      sourceCount: allSourceList.length,
      riskCount: mergedResult.summary.total,
      durationMs,
      model: incrementalResult.debugInfo?.model || null,
      isMock,
      status: 'success',
      errorMessage: null,
      reasoningTrace: mergedResult.reasoningTrace || null,
      rawOutput: incrementalResult.debugInfo?.rawOutput || null,
      tokenPrompt: incrementalResult.debugInfo?.tokenPrompt || 0,
      tokenCompletion: incrementalResult.debugInfo?.tokenCompletion || 0,
    })

    res.json({
      code: 200,
      data: {
        ...mergedResult,
        risks: sortedRisks,
        meta: {
          durationMs,
          isMock,
          sourceCount: allSourceList.length,
          isIncremental: true,
          newRiskCount: incrementalResult.summary.total,
        },
        preferences: {
          riskWeights
        }
      }
    })
  } catch (e) {
    console.error('Incremental analyze error:', e)
    res.status(500).json({ code: 500, msg: '增量分析失败' })
  }
})

// 生成话术
app.post('/api/draft', async (req, res) => {
  const { risk, context } = req.body
  if (!risk) {
    return res.status(400).json({ code: 400, msg: '缺少风险点信息' })
  }
  try {
    const { userId, sessionId } = getUserIdAndSessionId(req)
    const draftStyle = getDraftStyle(userId, sessionId)
    const stylePref = {
      formality: draftStyle.formality,
      friendliness: draftStyle.friendliness,
      conciseness: draftStyle.conciseness,
      preferredTone: draftStyle.preferredTone
    }
    const draft = await generateDraft(risk, context || '', stylePref)
    res.json({ code: 200, data: { draft } })
  } catch (e) {
    console.error('Draft error:', e)
    res.status(500).json({ code: 500, msg: '生成失败' })
  }
})

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ code: 200, data: { status: 'ok', hasAiKey: !!process.env.AI_API_KEY } })
})

// 获取任务列表
app.get('/api/tasks', (req, res) => {
  const { userId, sessionId } = getUserIdAndSessionId(req)
  const tasks = getTasksByUser(userId, sessionId)
  const taskList = tasks
    .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .map((t: any) => ({
      id: t.id,
      title: t.title,
      scenarioType: t.scenarioType,
      sourceCount: t.sourceIds.length,
      createdAt: t.createdAt
    }))
  res.json({ code: 200, data: taskList })
})

// 创建任务（保存分析结果）
app.post('/api/tasks', async (req, res) => {
  const { title, scenarioType, sourceIds } = req.body
  if (!title) {
    return res.status(400).json({ code: 400, msg: '缺少任务标题' })
  }

  const { userId, sessionId } = getUserIdAndSessionId(req)
  const allSources = getSourcesByUser(userId, sessionId)
  const selectedSources = sourceIds
    .map((id: string) => allSources.find((s: Source) => s.id === id))
    .filter(Boolean)

  if (selectedSources.length === 0) {
    return res.status(400).json({ code: 400, msg: '没有可分析的材料' })
  }

  try {
    const result = await analyzeSources(selectedSources)
    const task = createTask(userId, sessionId, title, scenarioType || 'custom', sourceIds, result)
    res.json({ code: 200, data: { taskId: task.id, ...task } })
  } catch (e) {
    console.error('Create task error:', e)
    res.status(500).json({ code: 500, msg: '创建任务失败' })
  }
})

// 获取任务详情
app.get('/api/tasks/:id', (req, res) => {
  const { userId, sessionId } = getUserIdAndSessionId(req)
  const task = getTaskById(userId, sessionId, req.params.id)
  if (!task) {
    return res.status(404).json({ code: 404, msg: '任务不存在' })
  }
  res.json({ code: 200, data: task })
})

// 删除任务
app.delete('/api/tasks/:id', (req, res) => {
  const { userId, sessionId } = getUserIdAndSessionId(req)
  const success = deleteTask(userId, sessionId, req.params.id)
  res.json({ code: 200, data: { success } })
})

// 获取检查清单状态
app.get('/api/tasks/:id/checklist', (req, res) => {
  const { userId, sessionId } = getUserIdAndSessionId(req)
  const task = getTaskById(userId, sessionId, req.params.id)
  if (!task) {
    return res.status(404).json({ code: 404, msg: '任务不存在' })
  }
  const checkedItems = getTaskChecklistState(req.params.id)
  res.json({ code: 200, data: { checkedItems } })
})

// 更新检查清单状态
app.put('/api/tasks/:id/checklist', (req, res) => {
  const { userId, sessionId } = getUserIdAndSessionId(req)
  const task = getTaskById(userId, sessionId, req.params.id)
  if (!task) {
    return res.status(404).json({ code: 404, msg: '任务不存在' })
  }
  const { checkedItems } = req.body
  if (!Array.isArray(checkedItems)) {
    return res.status(400).json({ code: 400, msg: 'checkedItems 必须是数组' })
  }
  updateTaskChecklistState(req.params.id, checkedItems)
  res.json({ code: 200, data: { success: true } })
})

// ===== Memory / 偏好相关 API =====

// 获取用户偏好
app.get('/api/preferences', (req, res) => {
  const { userId, sessionId } = getUserIdAndSessionId(req)
  const riskWeights = getRiskWeights(userId, sessionId)
  const draftStyle = getDraftStyle(userId, sessionId)
  const feedbackStats = getFeedbackStats(userId, sessionId)
  res.json({
    code: 200,
    data: {
      riskWeights,
      draftStyle,
      feedbackStats
    }
  })
})

// 记录检查清单操作（用于学习风险权重偏好）
app.post('/api/preferences/checklist-action', (req, res) => {
  const { userId, sessionId } = getUserIdAndSessionId(req)
  const { riskType, dimension, checked } = req.body
  if (!riskType) {
    return res.status(400).json({ code: 400, msg: '缺少 riskType' })
  }
  const prefs = recordChecklistAction(userId, sessionId, riskType, dimension, checked === true)
  res.json({ code: 200, data: prefs })
})

// 记录话术复制操作
app.post('/api/preferences/draft-copy', (req, res) => {
  const { userId, sessionId } = getUserIdAndSessionId(req)
  const { riskType } = req.body
  const prefs = recordDraftCopy(userId, sessionId, riskType)
  res.json({ code: 200, data: prefs })
})

// 记录话术编辑操作
app.post('/api/preferences/draft-edit', (req, res) => {
  const { userId, sessionId } = getUserIdAndSessionId(req)
  const { editCount } = req.body
  const prefs = recordDraftEdit(userId, sessionId, editCount || 1)
  res.json({ code: 200, data: prefs })
})

// 记录风险反馈（准/不准）
app.post('/api/preferences/risk-feedback', (req, res) => {
  const { userId, sessionId } = getUserIdAndSessionId(req)
  const { riskId, riskType, isAccurate } = req.body
  if (!riskId || !riskType) {
    return res.status(400).json({ code: 400, msg: '缺少 riskId 或 riskType' })
  }
  const stats = recordRiskFeedback(userId, sessionId, riskId, riskType, isAccurate === true)
  res.json({ code: 200, data: stats })
})

// 获取系统监控统计
app.get('/api/admin/stats', (req, res) => {
  const { userId, sessionId } = getUserIdAndSessionId(req)
  
  try {
    const stats = getAnalysisStats(userId, sessionId)
    res.json({
      code: 200,
      data: stats
    })
  } catch (e) {
    console.error('Stats error:', e)
    res.status(500).json({ code: 500, msg: '获取统计失败' })
  }
})

// 获取报告（PRD API 契约对齐）
app.get('/api/report/:taskId', (req, res) => {
  const { userId, sessionId } = getUserIdAndSessionId(req)
  const task = getTaskById(userId, sessionId, req.params.taskId)
  if (!task) {
    return res.status(404).json({ code: 404, msg: '任务不存在' })
  }
  const result = task.result as any
  res.json({
    code: 200,
    data: {
      summary: result?.summary || { critical: 0, warning: 0, info: 0, total: 0 },
      risks: result?.risks || [],
      checklist: result?.checklist || [],
      alignedVersion: result?.alignedVersion || ''
    }
  })
})

// 创建分享链接
app.post('/api/share/:taskId', (req, res) => {
  const { userId, sessionId } = getUserIdAndSessionId(req)
  const task = getTaskById(userId, sessionId, req.params.taskId)
  if (!task) {
    return res.status(404).json({ code: 404, msg: '任务不存在' })
  }
  
  // 默认7天过期
  const expiresInDays = req.body.expiresInDays || 7
  const share = createShare(req.params.taskId, expiresInDays)
  
  const shareUrl = `/share/${share.token}`
  res.json({
    code: 200,
    data: {
      token: share.token,
      url: shareUrl,
      expiresAt: share.expiresAt,
      viewCount: 0
    }
  })
})

// 获取分享详情（无需认证）
app.get('/api/share/:token', (req, res) => {
  const share = getShareByToken(req.params.token)
  if (!share) {
    return res.status(404).json({ code: 404, msg: '分享不存在或已过期' })
  }
  
  // 分享不依赖用户认证，直接通过taskId获取
  const task = getTaskById(null, null, share.taskId)
  if (!task) {
    return res.status(404).json({ code: 404, msg: '关联的任务不存在' })
  }
  
  const result = task.result as any
  res.json({
    code: 200,
    data: {
      title: task.title,
      scenarioType: task.scenarioType,
      createdAt: task.createdAt,
      viewCount: share.viewCount,
      expiresAt: share.expiresAt,
      result: {
        summary: result?.summary || { critical: 0, warning: 0, info: 0, total: 0 },
        risks: result?.risks || [],
        checklist: result?.checklist || [],
        alignedVersion: result?.alignedVersion || '',
        extractedEntities: result?.extractedEntities || {}
      }
    }
  })
})

// 获取任务的分享列表
app.get('/api/share/task/:taskId', (req, res) => {
  const { userId, sessionId } = getUserIdAndSessionId(req)
  const task = getTaskById(userId, sessionId, req.params.taskId)
  if (!task) {
    return res.status(404).json({ code: 404, msg: '任务不存在' })
  }
  
  const shares = getSharesByTask(req.params.taskId)
  res.json({
    code: 200,
    data: shares.map(s => ({
      token: s.token,
      url: `/share/${s.token}`,
      expiresAt: s.expiresAt,
      viewCount: s.viewCount,
      createdAt: s.createdAt
    }))
  })
})

// 删除分享链接
app.delete('/api/share/:taskId', (req, res) => {
  const { userId, sessionId } = getUserIdAndSessionId(req)
  const task = getTaskById(userId, sessionId, req.params.taskId)
  if (!task) {
    return res.status(404).json({ code: 404, msg: '任务不存在' })
  }
  
  const { token } = req.body
  const success = deleteShare(req.params.taskId, token)
  res.json({ code: 200, data: { success } })
})

const PORT = process.env.PORT || 3001
app.listen(PORT, () => {
  console.log(`有据 后端服务启动: http://localhost:${PORT}`)
  console.log(`AI API Key: ${process.env.AI_API_KEY ? '已配置' : '未配置 (将使用 Mock 模式)'}`)
  console.log(`数据库: SQLite (youju.db)`)
})
