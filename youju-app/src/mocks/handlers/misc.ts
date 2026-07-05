import { HttpResponse, http } from 'msw'
import { generateDraftContent, generateStreamChunks } from '@/algorithms/analysisSimulator'
import { analyzeIntent } from '@/services/intentAnalysis'
import { mockDB } from '../db'

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export const miscHandlers = [
  http.post('/api/intent/analyze', async ({ request }) => {
    const body = (await request.json()) as { description: string }
    await delay(400 + Math.random() * 200)
    const result = await analyzeIntent(body.description)
    return HttpResponse.json(result)
  }),

  http.post('/api/draft/generate', async ({ request }) => {
    const body = (await request.json()) as {
      riskId: string
      riskTitle: string
      riskDescription: string
      sourceNames: string[]
      style?: 'polite' | 'direct' | 'neutral'
      stream?: boolean
    }

    const seed = Date.now() + Math.floor(Math.random() * 1000000)
    const style =
      body.style || (['polite', 'neutral', 'direct'] as const)[Math.floor(Math.random() * 3)]

    const fullText = generateDraftContent({
      seed,
      riskTitle: body.riskTitle,
      riskDescription: body.riskDescription,
      sourceNames: body.sourceNames,
      style,
    })

    if (body.stream) {
      const chunks = generateStreamChunks(fullText, seed, 'normal')
      const encoder = new TextEncoder()

      const readable = new ReadableStream({
        async start(controller) {
          controller.enqueue(encoder.encode(`event: start\ndata: {"draftId":"draft_${seed}"}\n\n`))

          for (const chunk of chunks) {
            await new Promise((resolve) => setTimeout(resolve, chunk.delay))
            if (chunk.text) {
              controller.enqueue(
                encoder.encode(`event: delta\ndata: ${JSON.stringify({ text: chunk.text })}\n\n`),
              )
            }
          }

          controller.enqueue(
            encoder.encode(`event: complete\ndata: ${JSON.stringify({ text: fullText })}\n\n`),
          )
          controller.close()
        },
      })

      return new HttpResponse(readable, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
        },
      })
    }

    await delay(1200 + Math.random() * 600)
    return HttpResponse.json({ draft: fullText, style })
  }),

  http.post('/api/feedback/risk', async ({ request }) => {
    const body = (await request.json()) as {
      riskId: string
      feedback: 'accurate' | 'inaccurate'
      comment?: string
    }

    await delay(300 + Math.random() * 200)

    const prefs = mockDB.getPreferences()
    const feedbackHistory = prefs.riskFeedbackHistory || []
    feedbackHistory.push({
      ...body,
      timestamp: new Date().toISOString(),
    })

    mockDB.updatePreferences({
      riskFeedbackHistory: feedbackHistory,
      totalFeedbackCount: (prefs.totalFeedbackCount || 0) + 1,
    })

    return HttpResponse.json({ success: true })
  }),

  http.post('/api/preferences/risk-feedback', async ({ request }) => {
    const body = (await request.json()) as {
      riskId: string
      riskType: string
      isAccurate: boolean
    }

    await delay(200 + Math.random() * 100)

    const prefs = mockDB.getPreferences()
    const typeStats = prefs.riskTypeStats || {}
    if (!typeStats[body.riskType]) {
      typeStats[body.riskType] = { accurate: 0, inaccurate: 0 }
    }
    if (body.isAccurate) {
      typeStats[body.riskType].accurate++
    } else {
      typeStats[body.riskType].inaccurate++
    }

    mockDB.updatePreferences({ riskTypeStats: typeStats })
    return HttpResponse.json({ success: true })
  }),

  http.post('/api/preferences/checklist-action', async ({ request }) => {
    const body = (await request.json()) as {
      riskType: string
      dimension?: string
      checked: boolean
    }

    await delay(150 + Math.random() * 100)

    const prefs = mockDB.getPreferences()
    const checklistHistory = prefs.checklistHistory || []
    checklistHistory.push({
      ...body,
      timestamp: new Date().toISOString(),
    })

    mockDB.updatePreferences({
      checklistHistory,
      checklistTotalActions: (prefs.checklistTotalActions || 0) + 1,
    })

    return HttpResponse.json({ success: true })
  }),
]
