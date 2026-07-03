import express from 'express'
import analysisRouter from './routes/analysis.js'
import authRouter from './routes/auth.js'
import cronRouter from './routes/cron.js'
import docsRouter from './routes/docs.js'
import healthRouter from './routes/health.js'
import modelConfigRouter from './routes/modelConfig.js'
import preferencesRouter from './routes/preferences.js'
import scenariosRouter from './routes/scenarios.js'
import shareRouter from './routes/share.js'
import sourcesRouter from './routes/sources.js'
import tasksRouter from './routes/tasks.js'

const router = express.Router()

router.use(docsRouter)
router.use(scenariosRouter)
router.use(authRouter)
router.use(sourcesRouter)
router.use(analysisRouter)
router.use(tasksRouter)
router.use(preferencesRouter)
router.use(modelConfigRouter)
router.use(shareRouter)
router.use(healthRouter)
router.use(cronRouter)

export default router
