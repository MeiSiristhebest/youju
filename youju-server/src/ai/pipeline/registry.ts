import type { PipelineStepDefinition } from './types.js'

export class StepRegistry {
  private steps: Map<string, PipelineStepDefinition> = new Map()
  private order: string[] = []

  register(step: PipelineStepDefinition): void {
    if (this.steps.has(step.id)) {
      throw new Error(`Step already registered: ${step.id}`)
    }
    this.steps.set(step.id, step)
    this.order.push(step.id)
  }

  unregister(stepId: string): void {
    if (!this.steps.has(stepId)) {
      throw new Error(`Step not found: ${stepId}`)
    }
    this.steps.delete(stepId)
    this.order = this.order.filter((id) => id !== stepId)
  }

  has(stepId: string): boolean {
    return this.steps.has(stepId)
  }

  get(stepId: string): PipelineStepDefinition | undefined {
    return this.steps.get(stepId)
  }

  getAll(): PipelineStepDefinition[] {
    return this.order.map((id) => this.steps.get(id)!)
  }

  getStepIds(): string[] {
    return [...this.order]
  }

  insertBefore(targetStepId: string, step: PipelineStepDefinition): void {
    if (!this.steps.has(targetStepId)) {
      throw new Error(`Target step not found: ${targetStepId}`)
    }
    if (this.steps.has(step.id)) {
      throw new Error(`Step already registered: ${step.id}`)
    }
    const targetIndex = this.order.indexOf(targetStepId)
    this.steps.set(step.id, step)
    this.order.splice(targetIndex, 0, step.id)
  }

  insertAfter(targetStepId: string, step: PipelineStepDefinition): void {
    if (!this.steps.has(targetStepId)) {
      throw new Error(`Target step not found: ${targetStepId}`)
    }
    if (this.steps.has(step.id)) {
      throw new Error(`Step already registered: ${step.id}`)
    }
    const targetIndex = this.order.indexOf(targetStepId)
    this.steps.set(step.id, step)
    this.order.splice(targetIndex + 1, 0, step.id)
  }

  replace(stepId: string, step: PipelineStepDefinition): void {
    if (!this.steps.has(stepId)) {
      throw new Error(`Step not found: ${stepId}`)
    }
    this.steps.set(stepId, step)
  }

  clear(): void {
    this.steps.clear()
    this.order = []
  }

  size(): number {
    return this.steps.size
  }
}

export const defaultStepRegistry = new StepRegistry()
