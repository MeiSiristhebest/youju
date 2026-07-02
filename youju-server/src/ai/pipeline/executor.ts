import { CURRENT_PROMPT_VERSION } from '../prompts/index.js'
import type {
  PipelineCallbacks,
  PipelineCheckpoint,
  PipelineState,
  PipelineStep,
  PipelineStepDefinition,
  StepInput,
  StepOutput,
} from './types.js'

export class PipelineExecutor {
  private state: PipelineState
  private stepDefinitions: PipelineStepDefinition[]
  private callbacks: PipelineCallbacks
  private initialInput: Omit<StepInput, 'previousOutputs'> | null = null
  private initialPreviousOutputs: Record<string, unknown> = {}
  private pauseRequested = false

  constructor(stepDefinitions: PipelineStepDefinition[], callbacks: PipelineCallbacks = {}) {
    this.stepDefinitions = stepDefinitions
    this.callbacks = callbacks
    this.state = this.createInitialState()
  }

  private createInitialState(): PipelineState {
    return {
      id: `pipeline_${Date.now()}`,
      status: 'idle',
      steps: this.stepDefinitions.map((def, _index) => ({
        id: def.id,
        name: def.name,
        promptVersion: CURRENT_PROMPT_VERSION,
        modelVersion: '',
        status: 'pending',
        retryCount: 0,
        maxRetries: def.maxRetries,
        input: null,
        output: null,
        startedAt: null,
        completedAt: null,
        error: null,
      })),
      currentStepIndex: 0,
      startedAt: null,
      completedAt: null,
      error: null,
    }
  }

  getState(): PipelineState {
    return JSON.parse(JSON.stringify(this.state))
  }

  getSteps(): PipelineStep[] {
    return JSON.parse(JSON.stringify(this.state.steps))
  }

  getStepOutputs(): Record<string, unknown> {
    const outputs: Record<string, unknown> = {}
    for (const step of this.state.steps) {
      if (step.output) {
        outputs[step.id] = step.output.data
      }
    }
    return outputs
  }

  getCompletedStepOutputs(): Record<string, unknown> {
    const outputs: Record<string, unknown> = {}
    for (const step of this.state.steps) {
      if (step.status === 'completed' && step.output) {
        outputs[step.id] = step.output.data
      }
    }
    return outputs
  }

  createCheckpoint(): PipelineCheckpoint {
    return {
      state: this.getState(),
      initialInput: this.initialInput ? JSON.parse(JSON.stringify(this.initialInput)) : null,
      initialPreviousOutputs: JSON.parse(JSON.stringify(this.initialPreviousOutputs)),
      createdAt: new Date().toISOString(),
    }
  }

  restoreFromCheckpoint(checkpoint: PipelineCheckpoint): void {
    if (this.state.status === 'running') {
      throw new Error('Cannot restore checkpoint while pipeline is running')
    }
    this.state = JSON.parse(JSON.stringify(checkpoint.state))
    this.initialInput = checkpoint.initialInput
      ? JSON.parse(JSON.stringify(checkpoint.initialInput))
      : null
    this.initialPreviousOutputs = JSON.parse(JSON.stringify(checkpoint.initialPreviousOutputs))
  }

  pause(): void {
    if (this.state.status === 'running') {
      this.pauseRequested = true
    }
  }

  resume(): Promise<PipelineState> {
    if (this.state.status !== 'paused') {
      throw new Error('Pipeline is not paused')
    }
    if (!this.initialInput) {
      throw new Error('Cannot resume: no initial input stored')
    }
    this.pauseRequested = false
    this.state.status = 'running'
    this.callbacks.onResume?.(this.getState())
    return this.continueFromStep(this.state.currentStepIndex)
  }

  async execute(
    initialInput: Omit<StepInput, 'previousOutputs'>,
    initialPreviousOutputs: Record<string, unknown> = {},
  ): Promise<PipelineState> {
    this.initialInput = initialInput
    this.initialPreviousOutputs = initialPreviousOutputs
    this.state.status = 'running'
    this.state.startedAt = new Date().toISOString()
    this.callbacks.onProgress?.(this.getState())

    try {
      await this.runSteps(0)
    } catch (error) {
      this.state.status = 'failed'
      this.state.completedAt = new Date().toISOString()
      this.state.error = (error as Error).message
      this.callbacks.onError?.(this.getState(), error as Error)
    }

    return this.getState()
  }

  private async runSteps(startIndex: number): Promise<void> {
    for (let i = startIndex; i < this.stepDefinitions.length; i++) {
      if (this.pauseRequested) {
        this.state.status = 'paused'
        this.pauseRequested = false
        this.callbacks.onPause?.(this.getState())
        return
      }

      this.state.currentStepIndex = i
      const stepDef = this.stepDefinitions[i]
      const stepState = this.state.steps[i]

      if (stepState.status === 'skipped' || stepState.status === 'completed') {
        continue
      }

      if (!this.initialInput) {
        throw new Error('No initial input stored')
      }

      const stepInput: StepInput = {
        sources: this.initialInput.sources,
        scenarioType: this.initialInput.scenarioType,
        scenarioKnowledge: this.initialInput.scenarioKnowledge,
        previousOutputs: { ...this.initialPreviousOutputs, ...this.getCompletedStepOutputs() },
      }

      stepState.input = stepInput
      stepState.status = 'running'
      stepState.startedAt = new Date().toISOString()
      this.state.status = 'step_active'

      this.callbacks.onStepStart?.(stepState)
      this.callbacks.onProgress?.(this.getState())

      try {
        const output = await this.executeStepWithRetry(stepDef, stepState, stepInput)
        stepState.output = output
        stepState.modelVersion = output.modelVersion || stepState.modelVersion
        stepState.promptVersion = output.promptVersion || stepState.promptVersion
        stepState.status = 'completed'
        stepState.completedAt = new Date().toISOString()
        stepState.error = null
        this.state.status = 'running'

        this.callbacks.onStepComplete?.(stepState)
        this.callbacks.onProgress?.(this.getState())
      } catch (error) {
        stepState.status = 'failed'
        stepState.completedAt = new Date().toISOString()
        stepState.error = (error as Error).message

        this.callbacks.onStepError?.(stepState, error as Error)

        this.state.status = 'failed'
        this.state.completedAt = new Date().toISOString()
        this.state.error = (error as Error).message

        this.callbacks.onError?.(this.getState(), error as Error)
        throw error
      }
    }

    this.state.status = 'completed'
    this.state.completedAt = new Date().toISOString()
    this.callbacks.onComplete?.(this.getState())
  }

  private async continueFromStep(stepIndex: number): Promise<PipelineState> {
    await this.runSteps(stepIndex)
    return this.getState()
  }

  private async executeStepWithRetry(
    stepDef: PipelineStepDefinition,
    stepState: PipelineStep,
    input: StepInput,
  ): Promise<StepOutput> {
    let lastError: Error | null = null

    for (let attempt = 0; attempt <= stepDef.maxRetries; attempt++) {
      if (attempt > 0) {
        stepState.retryCount = attempt
        stepState.status = 'retrying'
        this.state.status = 'retrying'
        this.callbacks.onStepRetry?.(stepState)
        this.callbacks.onProgress?.(this.getState())
        await new Promise((resolve) => setTimeout(resolve, 1000 * attempt))
      }

      try {
        this.state.status = 'step_active'
        const output = await stepDef.execute(input, (update) => {
          Object.assign(stepState, update)
        })
        return output
      } catch (error) {
        lastError = error as Error
      }
    }

    throw (
      lastError || new Error(`Step ${stepDef.id} failed after ${stepDef.maxRetries + 1} attempts`)
    )
  }

  resumeFromStep(
    stepIndex: number,
    overridePreviousOutputs?: Record<string, unknown>,
  ): Promise<PipelineState> {
    if (this.state.status === 'running') {
      throw new Error('Cannot resume from step while pipeline is running')
    }
    if (stepIndex < 0 || stepIndex >= this.state.steps.length) {
      throw new Error(`Invalid step index: ${stepIndex}`)
    }
    if (!this.initialInput) {
      throw new Error('Cannot resume: no initial input stored')
    }

    // 如果提供了 overridePreviousOutputs，合并到 initialPreviousOutputs
    if (overridePreviousOutputs) {
      this.initialPreviousOutputs = { ...this.initialPreviousOutputs, ...overridePreviousOutputs }
    }

    for (let i = stepIndex; i < this.state.steps.length; i++) {
      this.state.steps[i].status = 'pending'
      this.state.steps[i].output = null
      this.state.steps[i].error = null
      this.state.steps[i].startedAt = null
      this.state.steps[i].completedAt = null
      this.state.steps[i].retryCount = 0
    }

    this.state.currentStepIndex = stepIndex
    this.state.status = 'running'
    this.state.error = null
    this.callbacks.onProgress?.(this.getState())

    return this.continueFromStep(stepIndex)
  }

  skipStep(stepIndex: number): void {
    if (this.state.status === 'running') {
      throw new Error('Cannot skip step while pipeline is running')
    }
    if (stepIndex < 0 || stepIndex >= this.state.steps.length) {
      throw new Error(`Invalid step index: ${stepIndex}`)
    }

    const step = this.state.steps[stepIndex]
    step.status = 'skipped'
    step.output = null
    step.error = null
    step.completedAt = new Date().toISOString()

    this.callbacks.onStepSkip?.(step)
    this.callbacks.onProgress?.(this.getState())
  }

  retryStep(stepIndex: number): Promise<PipelineState> {
    if (this.state.status === 'running') {
      throw new Error('Cannot retry step while pipeline is running')
    }
    if (stepIndex < 0 || stepIndex >= this.state.steps.length) {
      throw new Error(`Invalid step index: ${stepIndex}`)
    }

    const step = this.state.steps[stepIndex]
    if (step.status !== 'failed') {
      throw new Error(`Cannot retry step ${stepIndex}: status is ${step.status}`)
    }
    if (!this.initialInput) {
      throw new Error('Cannot retry: no initial input stored')
    }

    return this.resumeFromStep(stepIndex)
  }

  findDownstreamSteps(stepId: string): string[] {
    const downstream: string[] = []
    const stepDef = this.stepDefinitions.find((s) => s.id === stepId)
    if (!stepDef) return downstream

    const visited = new Set<string>()
    const queue = [stepId]

    while (queue.length > 0) {
      const current = queue.shift()!
      if (visited.has(current)) continue
      visited.add(current)

      for (const def of this.stepDefinitions) {
        if (def.dependsOn?.includes(current) && !visited.has(def.id)) {
          downstream.push(def.id)
          queue.push(def.id)
        }
      }
    }

    return downstream
  }

  invalidateDownstreamSteps(stepId: string): void {
    const downstream = this.findDownstreamSteps(stepId)
    for (const dsId of downstream) {
      const step = this.state.steps.find((s) => s.id === dsId)
      if (step && step.status !== 'pending') {
        step.status = 'pending'
        step.output = null
        step.error = null
        step.startedAt = null
        step.completedAt = null
        step.retryCount = 0
      }
    }
  }

  getStepIndex(stepId: string): number {
    return this.state.steps.findIndex((s) => s.id === stepId)
  }
}
