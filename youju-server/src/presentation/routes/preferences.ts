import express from 'express'
import type { PreferenceService } from '../../domain/services/preferenceService.js'
import { getUserIdAndSessionId } from '../../infrastructure/auth.js'
import { getService, Tokens } from '../../infrastructure/di/serviceLocator.js'
import { validateBody } from '../middleware/zodValidator.js'
import {
  checklistPreferenceSchema,
  draftCopySchema,
  draftEditSchema,
  riskFeedbackSchema,
} from '../validation/schemas.js'

function getPreferenceService(): PreferenceService {
  return getService<PreferenceService>(Tokens.PreferenceService)
}

const router = express.Router()

router.get('/preferences', async (req, res) => {
  const { userId, sessionId } = await getUserIdAndSessionId(req)
  const riskWeights = await getPreferenceService().getUserRiskWeights(userId, sessionId)
  const draftStyle = await getPreferenceService().getUserDraftStyle(userId, sessionId)
  const feedbackStats = await getPreferenceService().getUserFeedbackStats(userId, sessionId)
  res.json({
    code: 200,
    data: {
      riskWeights,
      draftStyle,
      feedbackStats,
    },
  })
})

router.post(
  '/preferences/checklist-action',
  validateBody(checklistPreferenceSchema),
  async (req, res) => {
    const { userId, sessionId } = await getUserIdAndSessionId(req)
    const { riskType, dimension, checked } = req.body
    const prefs = await getPreferenceService().recordChecklistPreference(
      userId,
      sessionId,
      riskType,
      dimension,
      checked === true,
    )
    res.json({ code: 200, data: prefs })
  },
)

router.post('/preferences/draft-copy', validateBody(draftCopySchema), async (req, res) => {
  const { userId, sessionId } = await getUserIdAndSessionId(req)
  const { riskType } = req.body
  const prefs = await getPreferenceService().recordDraftCopyPreference(userId, sessionId, riskType)
  res.json({ code: 200, data: prefs })
})

router.post('/preferences/draft-edit', validateBody(draftEditSchema), async (req, res) => {
  const { userId, sessionId } = await getUserIdAndSessionId(req)
  const { editCount } = req.body
  const prefs = await getPreferenceService().recordDraftEditPreference(
    userId,
    sessionId,
    editCount || 1,
  )
  res.json({ code: 200, data: prefs })
})

router.post('/preferences/risk-feedback', validateBody(riskFeedbackSchema), async (req, res) => {
  const { userId, sessionId } = await getUserIdAndSessionId(req)
  const { riskId, riskType, isAccurate } = req.body
  const stats = await getPreferenceService().recordRiskFeedbackPreference(
    userId,
    sessionId,
    riskId,
    riskType,
    isAccurate === true,
  )
  res.json({ code: 200, data: stats })
})

export default router
