import express from 'express'
import chatCrudRouter from './chatCrud.js'
import chatStreamRouter from './chatStream.js'

const router = express.Router()

router.use(chatCrudRouter)
router.use(chatStreamRouter)

export default router
