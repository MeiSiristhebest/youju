import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { analysisAdapter } from '../src/ai/adapters/analysisAdapter.js'
import { PipelineExecutor } from '../src/ai/pipeline/executor.js'
import type {
  PipelineState,
  PipelineStepDefinition,
  StepInput,
  StepOutput,
} from '../src/ai/pipeline/types.js'
import { CURRENT_PROMPT_VERSION } from '../src/ai/prompts/index.js'
import type { AnalyzeResult, Source } from '../src/domain/types.js'

function makeSource(
  id: string,
  name: string,
  content: string,
  type: Source['type'] = 'chat',
): Source {
  return { id, type, name, content }
}

function createMockStep(
  id: string,
  name: string,
  maxRetries: number = 0,
  data: any = { success: true },
  delay: number = 0,
): PipelineStepDefinition {
  return {
    id,
    name,
    maxRetries,
    execute: async (input: StepInput): Promise<StepOutput> => {
      if (delay > 0) {
        await new Promise((resolve) => setTimeout(resolve, delay))
      }
      return {
        data: { ...data, stepId: id, receivedSources: input.sources.length },
        modelVersion: 'mock-model-v1',
        promptVersion: CURRENT_PROMPT_VERSION,
        tokenPrompt: 100,
        tokenCompletion: 50,
        latencyMs: 10,
      }
    },
  }
}

function createFailingStep(
  id: string,
  name: string,
  maxRetries: number = 0,
  failCount: number = 1,
): PipelineStepDefinition {
  let attempts = 0
  return {
    id,
    name,
    maxRetries,
    execute: async (): Promise<StepOutput> => {
      attempts++
      if (attempts <= failCount) {
        throw new Error(`Step ${id} failed on attempt ${attempts}`)
      }
      return {
        data: { success: true, stepId: id, attempts },
        modelVersion: 'mock-model-v1',
        promptVersion: CURRENT_PROMPT_VERSION,
        tokenPrompt: 100,
        tokenCompletion: 50,
        latencyMs: 10,
      }
    },
  }
}

describe('AI Pipeline 集成测试', () => {
  describe('PipelineExecutor 基础功能', () => {
    it('构造函数正确初始化状态', () => {
      const steps = [
        createMockStep('step-1', '步骤1'),
        createMockStep('step-2', '步骤2'),
        createMockStep('step-3', '步骤3'),
      ]
      const executor = new PipelineExecutor(steps)
      const state = executor.getState()

      expect(state.status).toBe('idle')
      expect(state.steps).toHaveLength(3)
      expect(state.currentStepIndex).toBe(0)
      expect(state.startedAt).toBeNull()
      expect(state.completedAt).toBeNull()
      expect(state.error).toBeNull()
      expect(state.id).toMatch(/^pipeline_/)

      for (const step of state.steps) {
        expect(step.status).toBe('pending')
        expect(step.retryCount).toBe(0)
        expect(step.input).toBeNull()
        expect(step.output).toBeNull()
        expect(step.startedAt).toBeNull()
        expect(step.completedAt).toBeNull()
        expect(step.error).toBeNull()
        expect(step.promptVersion).toBe(CURRENT_PROMPT_VERSION)
      }

      expect(state.steps[0].id).toBe('step-1')
      expect(state.steps[0].name).toBe('步骤1')
      expect(state.steps[0].maxRetries).toBe(0)
    })

    it('execute() 执行完整流程，最终状态为 completed', async () => {
      const steps = [
        createMockStep('step-1', '步骤1'),
        createMockStep('step-2', '步骤2'),
        createMockStep('step-3', '步骤3'),
      ]
      const executor = new PipelineExecutor(steps)
      const sources = [makeSource('1', '测试', '内容')]

      const finalState = await executor.execute({ sources })

      expect(finalState.status).toBe('completed')
      expect(finalState.startedAt).toBeDefined()
      expect(finalState.completedAt).toBeDefined()
      expect(finalState.error).toBeNull()

      for (const step of finalState.steps) {
        expect(step.status).toBe('completed')
        expect(step.output).not.toBeNull()
        expect(step.startedAt).toBeDefined()
        expect(step.completedAt).toBeDefined()
      }
    })

    it('所有步骤状态从 pending → running → completed', async () => {
      const stepStatusHistory: string[][] = []
      const pipelineStatusHistory: string[] = []
      const steps = [createMockStep('step-1', '步骤1'), createMockStep('step-2', '步骤2')]

      const recordStatus = (state: PipelineState) => {
        stepStatusHistory.push(state.steps.map((s) => s.status))
        pipelineStatusHistory.push(state.status)
      }

      const executor = new PipelineExecutor(steps, {
        onProgress: recordStatus,
        onComplete: recordStatus,
      })

      const sources = [makeSource('1', '测试', '内容')]
      await executor.execute({ sources })

      const allStepStatuses = stepStatusHistory.flat()
      expect(allStepStatuses).toContain('pending')
      expect(allStepStatuses).toContain('running')
      expect(allStepStatuses).toContain('completed')
      expect(pipelineStatusHistory).toContain('step_active')
      expect(pipelineStatusHistory).toContain('running')
      expect(pipelineStatusHistory).toContain('completed')
    })

    it('回调函数正确触发：onStepStart、onStepComplete、onProgress、onComplete', async () => {
      const onStepStart = vi.fn()
      const onStepComplete = vi.fn()
      const onProgress = vi.fn()
      const onComplete = vi.fn()

      const steps = [createMockStep('step-1', '步骤1'), createMockStep('step-2', '步骤2')]
      const executor = new PipelineExecutor(steps, {
        onStepStart,
        onStepComplete,
        onProgress,
        onComplete,
      })

      const sources = [makeSource('1', '测试', '内容')]
      await executor.execute({ sources })

      expect(onStepStart).toHaveBeenCalledTimes(2)
      expect(onStepStart.mock.calls[0][0].id).toBe('step-1')
      expect(onStepStart.mock.calls[1][0].id).toBe('step-2')

      expect(onStepComplete).toHaveBeenCalledTimes(2)
      expect(onStepComplete.mock.calls[0][0].id).toBe('step-1')
      expect(onStepComplete.mock.calls[1][0].id).toBe('step-2')

      expect(onProgress).toHaveBeenCalled()
      expect(onComplete).toHaveBeenCalledTimes(1)
      expect(onComplete.mock.calls[0][0].status).toBe('completed')
    })

    it('步骤按正确顺序执行', async () => {
      const executionOrder: string[] = []
      const steps = [
        {
          id: 'step-scenario-discovery',
          name: '场景发现',
          maxRetries: 0,
          execute: async (): Promise<StepOutput> => {
            executionOrder.push('step-scenario-discovery')
            return {
              data: {},
              modelVersion: 'm',
              promptVersion: 'v1',
              tokenPrompt: 0,
              tokenCompletion: 0,
              latencyMs: 0,
            }
          },
        },
        {
          id: 'step-input-parsing',
          name: '输入解析',
          maxRetries: 0,
          execute: async (): Promise<StepOutput> => {
            executionOrder.push('step-input-parsing')
            return {
              data: {},
              modelVersion: 'm',
              promptVersion: 'v1',
              tokenPrompt: 0,
              tokenCompletion: 0,
              latencyMs: 0,
            }
          },
        },
        {
          id: 'step-dimension-discovery',
          name: '维度发现',
          maxRetries: 0,
          execute: async (): Promise<StepOutput> => {
            executionOrder.push('step-dimension-discovery')
            return {
              data: {},
              modelVersion: 'm',
              promptVersion: 'v1',
              tokenPrompt: 0,
              tokenCompletion: 0,
              latencyMs: 0,
            }
          },
        },
        {
          id: 'step-cross-source-extraction',
          name: '跨源提取',
          maxRetries: 0,
          execute: async (): Promise<StepOutput> => {
            executionOrder.push('step-cross-source-extraction')
            return {
              data: {},
              modelVersion: 'm',
              promptVersion: 'v1',
              tokenPrompt: 0,
              tokenCompletion: 0,
              latencyMs: 0,
            }
          },
        },
        {
          id: 'step-discrepancy-detection',
          name: '差异检测',
          maxRetries: 0,
          execute: async (): Promise<StepOutput> => {
            executionOrder.push('step-discrepancy-detection')
            return {
              data: {},
              modelVersion: 'm',
              promptVersion: 'v1',
              tokenPrompt: 0,
              tokenCompletion: 0,
              latencyMs: 0,
            }
          },
        },
        {
          id: 'step-self-check',
          name: '自检',
          maxRetries: 0,
          execute: async (): Promise<StepOutput> => {
            executionOrder.push('step-self-check')
            return {
              data: {},
              modelVersion: 'm',
              promptVersion: 'v1',
              tokenPrompt: 0,
              tokenCompletion: 0,
              latencyMs: 0,
            }
          },
        },
        {
          id: 'step-final-output',
          name: '最终输出',
          maxRetries: 0,
          execute: async (): Promise<StepOutput> => {
            executionOrder.push('step-final-output')
            return {
              data: {},
              modelVersion: 'm',
              promptVersion: 'v1',
              tokenPrompt: 0,
              tokenCompletion: 0,
              latencyMs: 0,
            }
          },
        },
      ]

      const executor = new PipelineExecutor(steps)
      const sources = [makeSource('1', '测试', '内容')]
      await executor.execute({ sources })

      expect(executionOrder).toEqual([
        'step-scenario-discovery',
        'step-input-parsing',
        'step-dimension-discovery',
        'step-cross-source-extraction',
        'step-discrepancy-detection',
        'step-self-check',
        'step-final-output',
      ])
    })
  })

  describe('步骤输出与数据流', () => {
    it('每步的 output 包含 data、modelVersion、promptVersion 等字段', async () => {
      const steps = [createMockStep('step-1', '步骤1')]
      const executor = new PipelineExecutor(steps)
      const sources = [makeSource('1', '测试', '内容')]

      const finalState = await executor.execute({ sources })
      const step = finalState.steps[0]

      expect(step.output).toBeDefined()
      expect(step.output!.data).toBeDefined()
      expect(step.output!.modelVersion).toBeDefined()
      expect(step.output!.promptVersion).toBe(CURRENT_PROMPT_VERSION)
      expect(typeof step.output!.tokenPrompt).toBe('number')
      expect(typeof step.output!.tokenCompletion).toBe('number')
      expect(typeof step.output!.latencyMs).toBe('number')
    })

    it('previousOutputs 正确传递：后一步能拿到前几步的输出', async () => {
      let step2Input: StepInput | null = null
      let step3Input: StepInput | null = null

      const steps = [
        createMockStep('step-1', '步骤1', 0, { value: 'from-step-1' }),
        {
          id: 'step-2',
          name: '步骤2',
          maxRetries: 0,
          execute: async (input: StepInput): Promise<StepOutput> => {
            step2Input = input
            return {
              data: { value: 'from-step-2' },
              modelVersion: 'm',
              promptVersion: CURRENT_PROMPT_VERSION,
              tokenPrompt: 0,
              tokenCompletion: 0,
              latencyMs: 0,
            }
          },
        },
        {
          id: 'step-3',
          name: '步骤3',
          maxRetries: 0,
          execute: async (input: StepInput): Promise<StepOutput> => {
            step3Input = input
            return {
              data: { value: 'from-step-3' },
              modelVersion: 'm',
              promptVersion: CURRENT_PROMPT_VERSION,
              tokenPrompt: 0,
              tokenCompletion: 0,
              latencyMs: 0,
            }
          },
        },
      ]

      const executor = new PipelineExecutor(steps)
      const sources = [makeSource('1', '测试', '内容')]
      await executor.execute({ sources })

      expect(step2Input).not.toBeNull()
      expect(step2Input!.previousOutputs['step-1'].value).toBe('from-step-1')

      expect(step3Input).not.toBeNull()
      expect(step3Input!.previousOutputs['step-1'].value).toBe('from-step-1')
      expect(step3Input!.previousOutputs['step-2'].value).toBe('from-step-2')
    })

    it('getStepOutputs() 返回正确数据', async () => {
      const steps = [
        createMockStep('step-1', '步骤1', 0, { a: 1 }),
        createMockStep('step-2', '步骤2', 0, { b: 2 }),
      ]
      const executor = new PipelineExecutor(steps)
      const sources = [makeSource('1', '测试', '内容')]

      await executor.execute({ sources })
      const outputs = executor.getStepOutputs()

      expect(outputs['step-1'].a).toBe(1)
      expect(outputs['step-2'].b).toBe(2)
    })

    it('getCompletedStepOutputs() 只返回已完成步骤的输出', async () => {
      const steps = [
        createMockStep('step-1', '步骤1', 0, { a: 1 }),
        createFailingStep('step-2', '步骤2', 0, 1),
      ]
      const executor = new PipelineExecutor(steps)
      const sources = [makeSource('1', '测试', '内容')]

      try {
        await executor.execute({ sources })
      } catch {
        // 预期失败
      }

      const outputs = executor.getCompletedStepOutputs()
      expect(outputs['step-1']).toBeDefined()
      expect(outputs['step-2']).toBeUndefined()
    })

    it('getState() 返回深拷贝（修改不影响内部状态）', () => {
      const steps = [createMockStep('step-1', '步骤1')]
      const executor = new PipelineExecutor(steps)

      const state1 = executor.getState()
      state1.steps[0].status = 'completed'
      state1.steps[0].output = {
        data: 'fake',
        modelVersion: '',
        promptVersion: '',
        tokenPrompt: 0,
        tokenCompletion: 0,
        latencyMs: 0,
      }

      const state2 = executor.getState()
      expect(state2.steps[0].status).toBe('pending')
      expect(state2.steps[0].output).toBeNull()
    })
  })

  describe('错误与重试', () => {
    it('某一步失败时，pipeline 状态变为 failed', async () => {
      const steps = [
        createMockStep('step-1', '步骤1'),
        createFailingStep('step-2', '步骤2', 0, 1),
        createMockStep('step-3', '步骤3'),
      ]
      const executor = new PipelineExecutor(steps)
      const sources = [makeSource('1', '测试', '内容')]

      let finalState: PipelineState | null = null
      try {
        finalState = await executor.execute({ sources })
      } catch {
        finalState = executor.getState()
      }

      expect(finalState!.status).toBe('failed')
      expect(finalState!.error).toBeDefined()
      expect(finalState!.steps[0].status).toBe('completed')
      expect(finalState!.steps[1].status).toBe('failed')
      expect(finalState!.steps[1].error).toBeDefined()
      expect(finalState!.steps[2].status).toBe('pending')
    })

    it('onError 回调正确触发', async () => {
      const onError = vi.fn()
      const onStepError = vi.fn()

      const steps = [createMockStep('step-1', '步骤1'), createFailingStep('step-2', '步骤2', 0, 1)]
      const executor = new PipelineExecutor(steps, { onError, onStepError })
      const sources = [makeSource('1', '测试', '内容')]

      try {
        await executor.execute({ sources })
      } catch {
        // 预期失败
      }

      expect(onError).toHaveBeenCalled()
      const lastOnErrorCall = onError.mock.calls[onError.mock.calls.length - 1]
      expect(lastOnErrorCall[0].status).toBe('failed')
      expect(lastOnErrorCall[1]).toBeInstanceOf(Error)

      expect(onStepError).toHaveBeenCalledTimes(1)
      expect(onStepError.mock.calls[0][0].id).toBe('step-2')
      expect(onStepError.mock.calls[0][1]).toBeInstanceOf(Error)
    })

    it('maxRetries > 0 的步骤失败时会自动重试', async () => {
      vi.useFakeTimers()
      const onStepRetry = vi.fn()

      const steps = [createFailingStep('step-1', '步骤1', 2, 2)]
      const executor = new PipelineExecutor(steps, { onStepRetry })
      const sources = [makeSource('1', '测试', '内容')]

      const promise = executor.execute({ sources })

      await vi.advanceTimersByTimeAsync(1000)
      await vi.advanceTimersByTimeAsync(2000)

      const finalState = await promise
      vi.useRealTimers()

      expect(finalState.status).toBe('completed')
      expect(finalState.steps[0].retryCount).toBe(2)
      expect(onStepRetry).toHaveBeenCalledTimes(2)
    })

    it('retryCount 正确递增', async () => {
      vi.useFakeTimers()
      const retryCounts: number[] = []

      const steps = [
        {
          id: 'step-1',
          name: '步骤1',
          maxRetries: 3,
          execute: async (): Promise<StepOutput> => {
            throw new Error('fail')
          },
        },
      ]
      const executor = new PipelineExecutor(steps, {
        onStepRetry: (step) => {
          retryCounts.push(step.retryCount)
        },
      })

      const sources = [makeSource('1', '测试', '内容')]
      const promise = executor.execute({ sources })

      for (let i = 0; i < 6; i++) {
        await vi.advanceTimersByTimeAsync(1000)
      }

      try {
        await promise
      } catch {
        // 预期失败
      }
      vi.useRealTimers()

      expect(retryCounts).toEqual([1, 2, 3])
      const state = executor.getState()
      expect(state.steps[0].retryCount).toBe(3)
    })

    it('重试成功后继续后续步骤', async () => {
      vi.useFakeTimers()
      const executionOrder: string[] = []

      const steps = [
        {
          id: 'step-1',
          name: '步骤1',
          maxRetries: 2,
          execute: async (): Promise<StepOutput> => {
            executionOrder.push('step-1')
            if (executionOrder.filter((x) => x === 'step-1').length <= 1) {
              throw new Error('fail')
            }
            return {
              data: { v: 1 },
              modelVersion: 'm',
              promptVersion: 'v1',
              tokenPrompt: 0,
              tokenCompletion: 0,
              latencyMs: 0,
            }
          },
        },
        {
          id: 'step-2',
          name: '步骤2',
          maxRetries: 0,
          execute: async (): Promise<StepOutput> => {
            executionOrder.push('step-2')
            return {
              data: { v: 2 },
              modelVersion: 'm',
              promptVersion: 'v1',
              tokenPrompt: 0,
              tokenCompletion: 0,
              latencyMs: 0,
            }
          },
        },
      ]

      const executor = new PipelineExecutor(steps)
      const sources = [makeSource('1', '测试', '内容')]
      const promise = executor.execute({ sources })

      await vi.advanceTimersByTimeAsync(1000)

      const finalState = await promise
      vi.useRealTimers()

      expect(finalState.status).toBe('completed')
      expect(executionOrder).toContain('step-2')
      expect(finalState.steps[1].status).toBe('completed')
    })
  })

  describe('暂停/恢复', () => {
    it('pause() 后状态变为 paused', async () => {
      const steps = [
        createMockStep('step-1', '步骤1'),
        createMockStep('step-2', '步骤2'),
        createMockStep('step-3', '步骤3'),
      ]

      const executor = new PipelineExecutor(steps, {
        onStepComplete: (step) => {
          if (step.id === 'step-1') {
            executor.pause()
          }
        },
      })

      const sources = [makeSource('1', '测试', '内容')]
      const state = await executor.execute({ sources })

      expect(state.status).toBe('paused')
      expect(state.steps[0].status).toBe('completed')
      expect(state.steps[1].status).toBe('pending')
    })

    it('resume() 后继续执行，最终 completed', async () => {
      let step1Done = false
      const steps = [
        {
          id: 'step-1',
          name: '步骤1',
          maxRetries: 0,
          execute: async (): Promise<StepOutput> => {
            step1Done = true
            return {
              data: { v: 1 },
              modelVersion: 'm',
              promptVersion: 'v1',
              tokenPrompt: 0,
              tokenCompletion: 0,
              latencyMs: 0,
            }
          },
        },
        createMockStep('step-2', '步骤2'),
        createMockStep('step-3', '步骤3'),
      ]

      const executor = new PipelineExecutor(steps, {
        onStepComplete: (step) => {
          if (step.id === 'step-1') {
            executor.pause()
          }
        },
      })

      const sources = [makeSource('1', '测试', '内容')]
      const pausedState = await executor.execute({ sources })

      expect(pausedState.status).toBe('paused')
      expect(step1Done).toBe(true)
      expect(pausedState.steps[0].status).toBe('completed')

      const finalState = await executor.resume()
      expect(finalState.status).toBe('completed')
      expect(finalState.steps[2].status).toBe('completed')
    })

    it('暂停点正确（在当前步骤完成后暂停）', async () => {
      const steps = [
        createMockStep('step-1', '步骤1'),
        createMockStep('step-2', '步骤2'),
        createMockStep('step-3', '步骤3'),
        createMockStep('step-4', '步骤4'),
      ]

      const executor = new PipelineExecutor(steps, {
        onStepComplete: (step) => {
          if (step.id === 'step-2') {
            executor.pause()
          }
        },
      })

      const sources = [makeSource('1', '测试', '内容')]
      const state = await executor.execute({ sources })

      expect(state.status).toBe('paused')
      expect(state.steps[0].status).toBe('completed')
      expect(state.steps[1].status).toBe('completed')
      expect(state.steps[2].status).toBe('pending')
      expect(state.steps[3].status).toBe('pending')
    })
  })

  describe('Checkpoint', () => {
    it('createCheckpoint() 返回正确的 checkpoint 结构', async () => {
      const steps = [createMockStep('step-1', '步骤1'), createMockStep('step-2', '步骤2')]
      const executor = new PipelineExecutor(steps)
      const sources = [makeSource('1', '测试', '内容')]

      await executor.execute({ sources })
      const checkpoint = executor.createCheckpoint()

      expect(checkpoint.state).toBeDefined()
      expect(checkpoint.initialInput).toBeDefined()
      expect(checkpoint.initialPreviousOutputs).toBeDefined()
      expect(checkpoint.createdAt).toBeDefined()
      expect(checkpoint.initialInput!.sources).toHaveLength(1)
      expect(checkpoint.state.steps).toHaveLength(2)
    })

    it('restoreFromCheckpoint() 能正确恢复状态', async () => {
      const steps = [createMockStep('step-1', '步骤1'), createMockStep('step-2', '步骤2')]
      const executor1 = new PipelineExecutor(steps)
      const sources = [makeSource('1', '测试', '内容')]

      await executor1.execute({ sources })
      const checkpoint = executor1.createCheckpoint()

      const executor2 = new PipelineExecutor(steps)
      executor2.restoreFromCheckpoint(checkpoint)

      const restoredState = executor2.getState()
      expect(restoredState.status).toBe('completed')
      expect(restoredState.steps[0].status).toBe('completed')
      expect(restoredState.steps[1].status).toBe('completed')
    })

    it('从 checkpoint 恢复后可以继续执行（resumeFromStep）', async () => {
      const steps = [
        createMockStep('step-1', '步骤1'),
        createMockStep('step-2', '步骤2'),
        createMockStep('step-3', '步骤3'),
      ]

      const executor1 = new PipelineExecutor(steps, {
        onStepComplete: (step) => {
          if (step.id === 'step-1') {
            executor1.pause()
          }
        },
      })

      const sources = [makeSource('1', '测试', '内容')]
      await executor1.execute({ sources })
      const checkpoint = executor1.createCheckpoint()

      const executor2 = new PipelineExecutor(steps)
      executor2.restoreFromCheckpoint(checkpoint)

      const finalState = await executor2.resumeFromStep(1)
      expect(finalState.status).toBe('completed')
      expect(finalState.steps[2].status).toBe('completed')
    })
  })

  describe('单步操作', () => {
    it('skipStep() 跳过指定步骤，状态变为 skipped', () => {
      const steps = [createMockStep('step-1', '步骤1'), createMockStep('step-2', '步骤2')]
      const executor = new PipelineExecutor(steps)

      executor.skipStep(0)
      const state = executor.getState()

      expect(state.steps[0].status).toBe('skipped')
      expect(state.steps[0].completedAt).toBeDefined()
    })

    it('skipStep 后后续步骤继续执行', async () => {
      const executionOrder: string[] = []
      const steps = [
        {
          id: 'step-1',
          name: '步骤1',
          maxRetries: 0,
          execute: async (): Promise<StepOutput> => {
            executionOrder.push('step-1')
            return {
              data: {},
              modelVersion: 'm',
              promptVersion: 'v1',
              tokenPrompt: 0,
              tokenCompletion: 0,
              latencyMs: 0,
            }
          },
        },
        {
          id: 'step-2',
          name: '步骤2',
          maxRetries: 0,
          execute: async (): Promise<StepOutput> => {
            executionOrder.push('step-2')
            return {
              data: {},
              modelVersion: 'm',
              promptVersion: 'v1',
              tokenPrompt: 0,
              tokenCompletion: 0,
              latencyMs: 0,
            }
          },
        },
        {
          id: 'step-3',
          name: '步骤3',
          maxRetries: 0,
          execute: async (): Promise<StepOutput> => {
            executionOrder.push('step-3')
            return {
              data: {},
              modelVersion: 'm',
              promptVersion: 'v1',
              tokenPrompt: 0,
              tokenCompletion: 0,
              latencyMs: 0,
            }
          },
        },
      ]

      const executor = new PipelineExecutor(steps)
      executor.skipStep(1)

      const sources = [makeSource('1', '测试', '内容')]
      const finalState = await executor.execute({ sources })

      expect(executionOrder).toEqual(['step-1', 'step-3'])
      expect(finalState.steps[0].status).toBe('completed')
      expect(finalState.steps[1].status).toBe('skipped')
      expect(finalState.steps[2].status).toBe('completed')
    })

    it('retryStep() 重试失败的步骤', async () => {
      vi.useFakeTimers()
      let failCount = 0

      const steps = [
        createMockStep('step-1', '步骤1'),
        {
          id: 'step-2',
          name: '步骤2',
          maxRetries: 0,
          execute: async (): Promise<StepOutput> => {
            failCount++
            if (failCount <= 1) {
              throw new Error('fail')
            }
            return {
              data: { v: 2 },
              modelVersion: 'm',
              promptVersion: 'v1',
              tokenPrompt: 0,
              tokenCompletion: 0,
              latencyMs: 0,
            }
          },
        },
        createMockStep('step-3', '步骤3'),
      ]

      const executor = new PipelineExecutor(steps)
      const sources = [makeSource('1', '测试', '内容')]

      try {
        await executor.execute({ sources })
      } catch {
        // 预期失败
      }

      const stateAfterFail = executor.getState()
      expect(stateAfterFail.steps[1].status).toBe('failed')

      const promise = executor.retryStep(1)
      await vi.advanceTimersByTimeAsync(1000)
      const finalState = await promise
      vi.useRealTimers()

      expect(finalState.status).toBe('completed')
      expect(finalState.steps[1].status).toBe('completed')
      expect(finalState.steps[2].status).toBe('completed')
    })

    it('findDownstreamSteps() 正确工作', () => {
      const steps: PipelineStepDefinition[] = [
        {
          id: 'step-a',
          name: 'A',
          maxRetries: 0,
          execute: async () => ({
            data: {},
            modelVersion: '',
            promptVersion: '',
            tokenPrompt: 0,
            tokenCompletion: 0,
            latencyMs: 0,
          }),
        },
        {
          id: 'step-b',
          name: 'B',
          maxRetries: 0,
          dependsOn: ['step-a'],
          execute: async () => ({
            data: {},
            modelVersion: '',
            promptVersion: '',
            tokenPrompt: 0,
            tokenCompletion: 0,
            latencyMs: 0,
          }),
        },
        {
          id: 'step-c',
          name: 'C',
          maxRetries: 0,
          dependsOn: ['step-b'],
          execute: async () => ({
            data: {},
            modelVersion: '',
            promptVersion: '',
            tokenPrompt: 0,
            tokenCompletion: 0,
            latencyMs: 0,
          }),
        },
        {
          id: 'step-d',
          name: 'D',
          maxRetries: 0,
          dependsOn: ['step-a'],
          execute: async () => ({
            data: {},
            modelVersion: '',
            promptVersion: '',
            tokenPrompt: 0,
            tokenCompletion: 0,
            latencyMs: 0,
          }),
        },
      ]

      const executor = new PipelineExecutor(steps)

      const downstreamA = executor.findDownstreamSteps('step-a')
      expect(downstreamA).toContain('step-b')
      expect(downstreamA).toContain('step-c')
      expect(downstreamA).toContain('step-d')

      const downstreamB = executor.findDownstreamSteps('step-b')
      expect(downstreamB).toContain('step-c')
      expect(downstreamB).not.toContain('step-a')
      expect(downstreamB).not.toContain('step-d')

      const downstreamC = executor.findDownstreamSteps('step-c')
      expect(downstreamC).toEqual([])
    })

    it('invalidateDownstreamSteps() 正确工作', async () => {
      const steps: PipelineStepDefinition[] = [
        {
          id: 'step-a',
          name: 'A',
          maxRetries: 0,
          execute: async () => ({
            data: { v: 'a' },
            modelVersion: '',
            promptVersion: '',
            tokenPrompt: 0,
            tokenCompletion: 0,
            latencyMs: 0,
          }),
        },
        {
          id: 'step-b',
          name: 'B',
          maxRetries: 0,
          dependsOn: ['step-a'],
          execute: async () => ({
            data: { v: 'b' },
            modelVersion: '',
            promptVersion: '',
            tokenPrompt: 0,
            tokenCompletion: 0,
            latencyMs: 0,
          }),
        },
        {
          id: 'step-c',
          name: 'C',
          maxRetries: 0,
          dependsOn: ['step-b'],
          execute: async () => ({
            data: { v: 'c' },
            modelVersion: '',
            promptVersion: '',
            tokenPrompt: 0,
            tokenCompletion: 0,
            latencyMs: 0,
          }),
        },
      ]

      const executor = new PipelineExecutor(steps)
      const sources = [makeSource('1', '测试', '内容')]
      await executor.execute({ sources })

      let state = executor.getState()
      expect(state.steps[2].status).toBe('completed')

      executor.invalidateDownstreamSteps('step-a')

      state = executor.getState()
      expect(state.steps[0].status).toBe('completed')
      expect(state.steps[1].status).toBe('pending')
      expect(state.steps[2].status).toBe('pending')
      expect(state.steps[1].output).toBeNull()
      expect(state.steps[2].output).toBeNull()
    })
  })

  describe('AnalysisAdapter 集成测试（mock 模式）', () => {
    beforeEach(() => {
      vi.stubEnv('AI_API_KEY', '')
    })

    afterEach(() => {
      vi.unstubAllEnvs()
    })

    it('analysisAdapter.analyze() 完整执行 7 步流程', async () => {
      const sources = [
        makeSource('1', '聊天记录', '薪资 15k，年终奖 2 个月', 'chat'),
        makeSource('2', '合同', '本合同约定月薪为 12k', 'contract'),
      ]

      const result = await analysisAdapter.analyze(sources)

      expect(result).toBeDefined()
      expect(result.steps).toHaveLength(7)
      expect(result.isMock).toBe(true)
    })

    it('返回结果包含 result、steps、totalTokens、totalLatencyMs、isMock', async () => {
      const sources = [makeSource('1', '测试', '内容')]

      const result = await analysisAdapter.analyze(sources)

      expect(result.result).toBeDefined()
      expect(result.steps).toBeDefined()
      expect(typeof result.totalTokens).toBe('number')
      expect(typeof result.totalLatencyMs).toBe('number')
      expect(typeof result.isMock).toBe('boolean')
    })

    it('result 符合 AnalyzeResult 类型结构', async () => {
      const sources = [
        makeSource('1', '聊天', '薪资 15k，有年终奖', 'chat'),
        makeSource('2', '合同', '月薪 12k', 'contract'),
      ]

      const result = await analysisAdapter.analyze(sources)
      const analyzeResult = result.result as AnalyzeResult

      expect(analyzeResult.summary).toBeDefined()
      expect(typeof analyzeResult.summary.critical).toBe('number')
      expect(typeof analyzeResult.summary.warning).toBe('number')
      expect(typeof analyzeResult.summary.info).toBe('number')
      expect(typeof analyzeResult.summary.total).toBe('number')
      expect(Array.isArray(analyzeResult.risks)).toBe(true)
      expect(Array.isArray(analyzeResult.checklist)).toBe(true)
      expect(typeof analyzeResult.alignedVersion).toBe('string')
      expect(analyzeResult.extractedEntities).toBeDefined()
      expect(Array.isArray(analyzeResult.extractedEntities.dates)).toBe(true)
      expect(Array.isArray(analyzeResult.extractedEntities.amounts)).toBe(true)
      expect(Array.isArray(analyzeResult.extractedEntities.terms)).toBe(true)
      expect(Array.isArray(analyzeResult.extractedEntities.promises)).toBe(true)
    })

    it('onStepStart / onStepComplete 回调按顺序触发', async () => {
      const stepStartOrder: string[] = []
      const stepCompleteOrder: string[] = []

      const sources = [makeSource('1', '测试', '内容')]

      await analysisAdapter.analyze(sources, {
        onStepStart: (step) => {
          stepStartOrder.push(step.id)
        },
        onStepComplete: (step) => {
          stepCompleteOrder.push(step.id)
        },
      })

      expect(stepStartOrder).toEqual([
        'step-scenario-discovery',
        'step-input-parsing',
        'step-dimension-discovery',
        'step-cross-source-extraction',
        'step-discrepancy-detection',
        'step-self-check',
        'step-final-output',
      ])

      expect(stepCompleteOrder).toEqual([
        'step-scenario-discovery',
        'step-input-parsing',
        'step-dimension-discovery',
        'step-cross-source-extraction',
        'step-discrepancy-detection',
        'step-self-check',
        'step-final-output',
      ])
    })

    it('resumeFromCheckpoint 能从中间步骤恢复执行', async () => {
      const sources = [makeSource('1', '测试', '内容')]

      // 1. 完整运行一次，获取基线
      const fullResult = await analysisAdapter.analyze(sources)
      expect(fullResult.isMock).toBe(true)

      // 2. 提取真实 step 输出 + mainCallResult
      const stepOutputs: Record<string, unknown> = {}
      for (let i = 0; i <= 2; i++) {
        const step = fullResult.steps[i]
        stepOutputs[step.id] = step.output?.data || null
      }
      const scenarioStep = fullResult.steps.find((s) => s.id === 'step-scenario-discovery')
      const mainCallResult = (scenarioStep?.output?.data as { mainCallResult?: unknown })
        ?.mainCallResult

      // 3. 调用 resumeFromCheckpoint，传递 mainCallResult
      const resumeResult = await analysisAdapter.resumeFromCheckpoint(sources, {
        stepOutputs,
        lastCompletedStepId: 'step-dimension-discovery',
        lastCompletedStepIndex: 2,
        mainCallResult: mainCallResult as never,
      })

      // 4. 断言结构等价性
      // 注意：mock 模式下 mockAnalyze 每次重新生成数据，无法断言内容完全相等，
      // 改为断言结构等价（risks 数组存在、steps 数量正确、isMock 一致）
      expect(resumeResult).toBeDefined()
      expect(resumeResult.result).toBeDefined()
      expect(resumeResult.steps).toHaveLength(7)
      expect(resumeResult.isMock).toBe(true)
      expect(resumeResult.result.risks).toBeDefined()
      expect(Array.isArray(resumeResult.result.risks)).toBe(true)
    })
  })
})
