import express from 'express'
import analysisRouter from './analysis.js'
import authRouter from './auth.js'
import chatRouter from './chat.js'
import cronRouter from './cron.js'
import docsRouter from './docs.js'
import healthRouter from './health.js'
import modelConfigRouter from './modelConfig.js'
import preferencesRouter from './preferences.js'
import retrieveRouter from './retrieve.js'
import scenariosRouter from './scenarios.js'
import shareRouter from './share.js'
import sourcesRouter from './sources.js'
import tasksRouter from './tasks.js'

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
router.use(retrieveRouter)
router.use('/chat', chatRouter)
router.use(healthRouter)
router.use(cronRouter)

export default router
