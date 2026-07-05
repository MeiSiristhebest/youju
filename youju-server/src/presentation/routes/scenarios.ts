import express from 'express'
import { SCENARIO_PRESETS } from '../../domain/scenarioPresets.js'
import type { SourceService } from '../../domain/services/sourceService.js'
import { getUserIdAndSessionId } from '../../infrastructure/auth.js'
import { getService, Tokens } from '../../infrastructure/di/serviceLocator.js'

function getSourceService(): SourceService {
  return getService<SourceService>(Tokens.SourceService)
}

const router = express.Router()

router.get('/scenarios', (_req, res) => {
  const scenarios = SCENARIO_PRESETS.map((s) => ({
    id: s.id,
    name: s.name,
    icon: s.icon,
    description: s.description,
    sourceCount: s.sources.length,
  }))
  res.json({ code: 200, data: scenarios })
})

router.post('/scenarios/:id/init', async (req, res) => {
  const { userId, sessionId } = await getUserIdAndSessionId(req)
  const scenario = SCENARIO_PRESETS.find((s) => s.id === req.params.id)

  if (!scenario) {
    return res.status(404).json({ code: 404, msg: '场景不存在' })
  }

  const createdSources = []
  for (const src of scenario.sources) {
    const source = await getSourceService().createSource(
      userId,
      sessionId,
      src.type,
      src.name,
      src.content,
      src.meta,
    )
    createdSources.push(source)
  }

  res.json({
    code: 200,
    data: {
      scenario: {
        id: scenario.id,
        name: scenario.name,
        icon: scenario.icon,
        description: scenario.description,
      },
      sources: createdSources,
    },
  })
})

export default router
