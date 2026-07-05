import { defaultStepRegistry } from './registry.js'
import { stepCrossSourceExtraction } from './steps/step-cross-source-extraction.js'
import { stepDimensionDiscovery } from './steps/step-dimension-discovery.js'
import { stepDiscrepancyDetection } from './steps/step-discrepancy-detection.js'
import { stepFinalOutput } from './steps/step-final-output.js'
import { stepInputParsing } from './steps/step-input-parsing.js'
import { stepScenarioDiscovery } from './steps/step-scenario-discovery.js'
import { stepSelfCheck } from './steps/step-self-check.js'

export function registerDefaultSteps(): void {
  if (defaultStepRegistry.size() > 0) {
    return
  }

  defaultStepRegistry.register({
    id: 'step-scenario-discovery',
    name: '场景发现',
    maxRetries: 2,
    execute: stepScenarioDiscovery,
  })

  defaultStepRegistry.register({
    id: 'step-input-parsing',
    name: '输入解析',
    maxRetries: 0,
    execute: stepInputParsing,
  })

  defaultStepRegistry.register({
    id: 'step-dimension-discovery',
    name: '维度发现',
    maxRetries: 0,
    execute: stepDimensionDiscovery,
  })

  defaultStepRegistry.register({
    id: 'step-cross-source-extraction',
    name: '跨源提取',
    maxRetries: 0,
    execute: stepCrossSourceExtraction,
  })

  defaultStepRegistry.register({
    id: 'step-discrepancy-detection',
    name: '差异检测',
    maxRetries: 0,
    execute: stepDiscrepancyDetection,
  })

  defaultStepRegistry.register({
    id: 'step-self-check',
    name: '自检',
    maxRetries: 1,
    execute: stepSelfCheck,
  })

  defaultStepRegistry.register({
    id: 'step-final-output',
    name: '最终输出',
    maxRetries: 0,
    execute: stepFinalOutput,
  })
}
